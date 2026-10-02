import { DurableObject } from "cloudflare:workers";
import {
  conversationMember,
  createDb,
  insertChunked,
  message as messageTable,
  notification,
  user,
} from "@yres/db";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Env } from "../index";
import { type IncomingWsMessage, makeIncomingWsMessageSchema } from "../schemas/chat";

/** A legitimate frame is a few KB at most (4000-character body); anything bigger is not parsed at all. */
const MAX_FRAME_CHARS = 64 * 1024;

/** Live bell pushes per message; see the query-budget note on storeAndAnnounceMessage(). */
const MAX_LIVE_PUSHES = 30;

/**
 * One instance per chat conversation, routed via
 * `env.CONVERSATION_ROOM.idFromName(conversationId)` — the Worker route
 * (routes/chat.ts's `/conversations/:id/ws`) does the membership check and
 * appends `?userId=` before forwarding the upgrade request here, since the
 * DO itself has no session/cookie context. `userId` is then attached to
 * the hibernatable socket via `serializeAttachment` (survives hibernation,
 * unlike a plain in-memory Map).
 *
 * D1 stays the single source of truth: every mutation goes through
 * `@yres/db` (a DO receives the same `env.DB` binding as the Worker) before being broadcast. Members who
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

    if (raw.length > MAX_FRAME_CHARS) {
      console.warn("[chat] oversized frame dropped userId=", userId);
      return;
    }

    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return;
    }
    // JSON.parse output is untrusted input (V-2): validate the shape, and tie any attachment URL to
    // this conversation. Invalid frames are dropped silently for the sender, logged without their content.
    const parsed = makeIncomingWsMessageSchema(conversationId).safeParse(json);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      console.warn(
        "[chat] invalid frame dropped userId=",
        userId,
        issue?.code,
        issue?.path.join("."),
      );
      return;
    }
    const incoming: IncomingWsMessage = parsed.data;

    const db = createDb(this.env.DB);

    console.log("[chat] frame received", incoming.type, "from", userId);
    try {
      await this.handleIncoming(db, ws, userId, conversationId, incoming);
    } catch (err) {
      // The Hibernatable WebSocket API has no default error surface for a
      // rejected promise here — without this, a failed insert/update (bad
      // FK, DB hiccup, etc.) fails completely silently: no broadcast, no
      // log line, nothing the client or the server operator can see.
      console.error("[chat] webSocketMessage failed", incoming.type, err);
    }
  }

  private async handleIncoming(
    db: ReturnType<typeof createDb>,
    ws: WebSocket,
    userId: string,
    conversationId: string,
    incoming: IncomingWsMessage,
  ): Promise<void> {
    switch (incoming.type) {
      case "message": {
        if (!incoming.body?.trim() && !incoming.attachmentUrl) return;
        if (incoming.replyToId) {
          // A reply may only quote a message of THIS conversation (scope by the parent, security.md).
          const [parent] = await db
            .select({ id: messageTable.id })
            .from(messageTable)
            .where(
              and(
                eq(messageTable.id, incoming.replyToId),
                eq(messageTable.conversationId, conversationId),
              ),
            )
            .limit(1);
          if (!parent) {
            console.warn(
              "[chat] reply to a message outside the conversation dropped userId=",
              userId,
            );
            return;
          }
        }
        await this.storeAndAnnounceMessage(db, conversationId, userId, {
          body: incoming.body ?? "",
          replyToId: incoming.replyToId ?? null,
          attachmentUrl: incoming.attachmentUrl ?? null,
          attachmentName: incoming.attachmentName ?? null,
          attachmentMimeType: incoming.attachmentMimeType ?? null,
          attachmentSizeBytes: incoming.attachmentSizeBytes ?? null,
        });
        break;
      }

      case "edit": {
        if (!incoming.messageId || !incoming.body?.trim()) return;
        const [row] = await db
          .update(messageTable)
          .set({ body: incoming.body, editedAt: new Date() })
          .where(
            and(
              eq(messageTable.id, incoming.messageId),
              eq(messageTable.conversationId, conversationId),
              eq(messageTable.senderId, userId),
            ),
          )
          .returning();
        if (row) this.broadcast({ type: "message_edited", message: row });
        break;
      }

      case "delete": {
        if (!incoming.messageId) return;
        const [row] = await db
          .update(messageTable)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(messageTable.id, incoming.messageId),
              eq(messageTable.conversationId, conversationId),
              eq(messageTable.senderId, userId),
            ),
          )
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

  async webSocketError(_ws: WebSocket, error: unknown): Promise<void> {
    console.error("[chat] websocket error", error);
  }

  private broadcast(payload: unknown, exclude?: WebSocket): void {
    const data = JSON.stringify(payload);
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== exclude) socket.send(data);
    }
  }

  /**
   * Inserts the message and a `notification` row for every member who is not connected right now, in ONE
   * atomic db.batch(), then broadcasts it and pushes live bell updates.
   *
   * Query budget (Workers Free: 50 subrequests per invocation, and D1 queries count — database.md):
   * 1 members select + 1 sender-name select + (1 reply check) + batch of 1 + ceil(offline / 12) statements
   * (notification has 8 columns → 12 rows per statement). With the 50-member group cap that is at most
   * 3 + 1 + 5 = 9 D1 queries. The live pushes (Durable Object calls) are best counted as subrequests too, so
   * they are capped at MAX_LIVE_PUSHES: 9 + 30 stays under 50. Members beyond the cap still get their
   * notification row (the bell shows it on the next fetch); they only miss the instant push.
   */
  private async storeAndAnnounceMessage(
    db: ReturnType<typeof createDb>,
    conversationId: string,
    senderId: string,
    fields: Omit<typeof messageTable.$inferInsert, "conversationId" | "senderId">,
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
    const [sender] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, senderId))
      .limit(1);

    const now = new Date();
    const notifications: (typeof notification.$inferInsert & { id: string; createdAt: Date })[] =
      members
        .filter((member) => member.userId !== senderId && !connectedUserIds.has(member.userId))
        .map((member) => ({
          id: crypto.randomUUID(),
          userId: member.userId,
          type: "chat_message",
          title: `New message from ${sender?.name ?? "someone"}`,
          body: (fields.body ?? "").slice(0, 200),
          linkUrl: `/chat/${conversationId}`,
          isRead: false,
          createdAt: now,
        }));

    const statements: BatchItem<"sqlite">[] = [
      db
        .insert(messageTable)
        .values({ ...fields, conversationId, senderId })
        .returning(),
      ...(notifications.length > 0 ? insertChunked(db, notification, notifications) : []),
    ];
    const [insertedRows] = (await db.batch(
      statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
    )) as unknown as [(typeof messageTable.$inferSelect)[]];
    const row = insertedRows[0];
    if (!row) return;

    this.broadcast({ type: "message", message: row });

    // Live pushes are fire-and-forget (realtime.md): the rows above are the source of truth.
    for (const notificationRow of notifications.slice(0, MAX_LIVE_PUSHES)) {
      try {
        const channelId = this.env.USER_CHANNEL.idFromName(notificationRow.userId);
        await this.env.USER_CHANNEL.get(channelId).pushNotification(notificationRow);
      } catch (err) {
        console.error("[chat] failed to push offline-member notification", err);
      }
    }
    if (notifications.length > MAX_LIVE_PUSHES) {
      console.warn(
        "[chat] live pushes capped:",
        notifications.length - MAX_LIVE_PUSHES,
        "members get the notification row only",
      );
    }
  }
}
