import { DurableObject } from "cloudflare:workers";
import { conversationMember, createDb, message as messageTable, notification, user } from "@yres/db";
import { and, eq } from "drizzle-orm";
import type { Env } from "../index";

interface IncomingWsMessage {
  type: "message" | "typing" | "read" | "edit" | "delete";
  body?: string;
  replyToId?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMimeType?: string | null;
  attachmentSizeBytes?: number | null;
  /** Required for "edit"/"delete". */
  messageId?: string;
}

/**
 * One instance per chat conversation, routed via
 * `env.CONVERSATION_ROOM.idFromName(conversationId)` — the Worker route
 * (routes/chat.ts's `/conversations/:id/ws`) does the membership check and
 * appends `?userId=` before forwarding the upgrade request here, since the
 * DO itself has no session/cookie context. `userId` is then attached to
 * the hibernatable socket via `serializeAttachment` (survives hibernation,
 * unlike a plain in-memory Map).
 *
 * Postgres stays the single source of truth: every mutation goes through
 * `@yres/db` (the Neon HTTP driver works fine from inside a DO — it's just
 * another Workers execution context) before being broadcast. Members who
 * aren't currently connected get a real `notification` row + a live push
 * to their own `UserNotificationChannel`, the same as any other
 * notification source (see lib/notify.ts).
 */
export class ConversationRoom extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade request", { status: 426 });
    }

    const userId = new URL(request.url).searchParams.get("userId");
    if (!userId) {
      return new Response("Missing userId", { status: 400 });
    }

    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    pair[1].serializeAttachment(userId);

    return new Response(null, { status: 101, webSocket: pair[0] });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer): Promise<void> {
    if (typeof raw !== "string") return;
    const userId = ws.deserializeAttachment() as string | null;
    const conversationId = this.ctx.id.name;
    if (!userId || !conversationId) return;

    let incoming: IncomingWsMessage;
    try {
      incoming = JSON.parse(raw);
    } catch {
      return;
    }

    const db = createDb(this.env.DATABASE_URL);

    switch (incoming.type) {
      case "message": {
        if (!incoming.body?.trim() && !incoming.attachmentUrl) return;
        const [row] = await db
          .insert(messageTable)
          .values({
            conversationId,
            senderId: userId,
            body: incoming.body ?? "",
            replyToId: incoming.replyToId ?? null,
            attachmentUrl: incoming.attachmentUrl ?? null,
            attachmentName: incoming.attachmentName ?? null,
            attachmentMimeType: incoming.attachmentMimeType ?? null,
            attachmentSizeBytes: incoming.attachmentSizeBytes ?? null,
          })
          .returning();
        if (!row) return;
        this.broadcast({ type: "message", message: row });
        await this.notifyOfflineMembers(db, conversationId, userId, row.body);
        break;
      }

      case "edit": {
        if (!incoming.messageId || !incoming.body?.trim()) return;
        const [row] = await db
          .update(messageTable)
          .set({ body: incoming.body, editedAt: new Date() })
          .where(and(eq(messageTable.id, incoming.messageId), eq(messageTable.senderId, userId)))
          .returning();
        if (row) this.broadcast({ type: "message_edited", message: row });
        break;
      }

      case "delete": {
        if (!incoming.messageId) return;
        const [row] = await db
          .update(messageTable)
          .set({ deletedAt: new Date() })
          .where(and(eq(messageTable.id, incoming.messageId), eq(messageTable.senderId, userId)))
          .returning();
        if (row) this.broadcast({ type: "message_deleted", messageId: row.id });
        break;
      }

      case "typing": {
        this.broadcast({ type: "typing", userId }, ws);
        break;
      }

      case "read": {
        await db
          .update(conversationMember)
          .set({ lastReadAt: new Date() })
          .where(
            and(
              eq(conversationMember.conversationId, conversationId),
              eq(conversationMember.userId, userId),
            ),
          );
        this.broadcast({ type: "read", userId, at: new Date().toISOString() }, ws);
        break;
      }

      default:
        break;
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    // 1004/1005/1006/1015 are reserved "status-only" codes the WebSocket API
    // forbids passing back into close() — echoing them through throws an
    // uncaught TypeError on every abnormal disconnect (page reload, tab
    // close, StrictMode's double-mount). Just close our end in that case.
    if (code === 1004 || code === 1005 || code === 1006 || code === 1015) {
      ws.close();
    } else {
      ws.close(code, reason);
    }
  }

  private broadcast(payload: unknown, exclude?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== exclude) socket.send(data);
    }
  }

  /**
   * Members currently connected to *this* room already saw the message via
   * `broadcast()` above — this only notifies the rest, same durable
   * `notification` row + live bell push as every other notification source
   * (lib/notify.ts), just issued directly from the DO instead of a route
   * handler since only the DO knows who's actually connected right now.
   */
  private async notifyOfflineMembers(
    db: ReturnType<typeof createDb>,
    conversationId: string,
    senderId: string,
    messageBody: string,
  ): Promise<void> {
    const connectedUserIds = new Set(
      this.ctx
        .getWebSockets()
        .map((socket) => socket.deserializeAttachment() as string | null)
        .filter((id): id is string => Boolean(id)),
    );

    const members = await db
      .select({ userId: conversationMember.userId })
      .from(conversationMember)
      .where(eq(conversationMember.conversationId, conversationId));
    const [sender] = await db.select({ name: user.name }).from(user).where(eq(user.id, senderId)).limit(1);

    for (const member of members) {
      if (member.userId === senderId || connectedUserIds.has(member.userId)) continue;

      const [notificationRow] = await db
        .insert(notification)
        .values({
          userId: member.userId,
          type: "chat_message",
          title: `New message from ${sender?.name ?? "someone"}`,
          body: messageBody.slice(0, 200),
          linkUrl: `/chat/${conversationId}`,
        })
        .returning();

      try {
        const channelId = this.env.USER_CHANNEL.idFromName(member.userId);
        await this.env.USER_CHANNEL.get(channelId).pushNotification(notificationRow);
      } catch (err) {
        console.error("[chat] failed to push offline-member notification", err);
      }
    }
  }
}
