import { conversation, conversationMember, message, user } from "@yres/db";
import { and, desc, eq, gt, ilike, inArray, ne } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import {
  createConversationSchema,
  updateConversationSchema,
  updateMessageSchema,
} from "../schemas/chat";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.use("*", authMiddleware);

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

// GET /api/chat/conversations - list mine, with last message + unread count.
chatRoutes.get("/conversations", async (c) => {
  const db = c.get("db");
  const authUser = c.get("user");

  const memberships = await db.query.conversationMember.findMany({
    where: eq(conversationMember.userId, authUser.id),
    with: {
      conversation: { with: { members: { with: { user: true } } } },
    },
  });

  const conversations = await Promise.all(
    memberships.map(async (membership) => {
      const conv = membership.conversation;

      const [lastMessage] = await db
        .select()
        .from(message)
        .where(eq(message.conversationId, conv.id))
        .orderBy(desc(message.createdAt))
        .limit(1);

      const unread = await db
        .select({ id: message.id })
        .from(message)
        .where(
          and(
            eq(message.conversationId, conv.id),
            ne(message.senderId, authUser.id),
            membership.lastReadAt ? gt(message.createdAt, membership.lastReadAt) : undefined,
          ),
        );

      const members = conv.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        username: m.user.username,
        image: m.user.image,
        role: m.role,
      }));
      const otherMember = members.find((m) => m.id !== authUser.id);
      const displayName = conv.type === "group" ? (conv.name ?? "Group") : (otherMember?.name ?? "Conversation");

      return {
        id: conv.id,
        type: conv.type,
        name: displayName,
        members,
        myRole: membership.role,
        lastMessage: lastMessage
          ? {
              id: lastMessage.id,
              body: lastMessage.deletedAt ? null : lastMessage.body,
              deletedAt: lastMessage.deletedAt,
              senderId: lastMessage.senderId,
              createdAt: lastMessage.createdAt,
            }
          : null,
        unreadCount: unread.length,
      };
    }),
  );

  conversations.sort((a, b) => {
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return c.json({ conversations });
});

// POST /api/chat/conversations - direct (by username) or group (name + usernames).
chatRoutes.post("/conversations", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createConversationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const authUser = c.get("user");

  if (parsed.data.type === "direct") {
    const [target] = await db
      .select()
      .from(user)
      .where(eq(user.username, parsed.data.username))
      .limit(1);
    if (!target) {
      return c.json({ error: "No user found with that username." }, 404);
    }
    if (target.id === authUser.id) {
      return c.json({ error: "You can't start a conversation with yourself." }, 400);
    }

    const myDirectConvIdRows = await db
      .select({ id: conversationMember.conversationId })
      .from(conversationMember)
      .innerJoin(conversation, eq(conversation.id, conversationMember.conversationId))
      .where(and(eq(conversationMember.userId, authUser.id), eq(conversation.type, "direct")));
    const myDirectConvIds = myDirectConvIdRows.map((r) => r.id);

    const existing =
      myDirectConvIds.length > 0
        ? await db
            .select({ conversationId: conversationMember.conversationId })
            .from(conversationMember)
            .where(
              and(
                eq(conversationMember.userId, target.id),
                inArray(conversationMember.conversationId, myDirectConvIds),
              ),
            )
        : [];

    if (existing[0]) {
      return c.json({ conversationId: existing[0].conversationId });
    }

    const [conv] = await db
      .insert(conversation)
      .values({ type: "direct", createdBy: authUser.id })
      .returning();
    if (!conv) {
      return c.json({ error: "Failed to create conversation" }, 500);
    }
    await db.insert(conversationMember).values([
      { conversationId: conv.id, userId: authUser.id, role: "member" },
      { conversationId: conv.id, userId: target.id, role: "member" },
    ]);

    return c.json({ conversationId: conv.id }, 201);
  }

  const usernames = [...new Set(parsed.data.usernames)];
  const members = await db.select().from(user).where(inArray(user.username, usernames));
  const foundUsernames = new Set(members.map((m) => m.username));
  const missing = usernames.filter((u) => !foundUsernames.has(u));
  if (missing.length > 0) {
    return c.json({ error: `No user found for username(s): ${missing.join(", ")}` }, 404);
  }

  const [conv] = await db
    .insert(conversation)
    .values({ type: "group", name: parsed.data.name, createdBy: authUser.id })
    .returning();
  if (!conv) {
    return c.json({ error: "Failed to create conversation" }, 500);
  }

  const memberRows = [
    { conversationId: conv.id, userId: authUser.id, role: "owner" as const },
    ...members
      .filter((m) => m.id !== authUser.id)
      .map((m) => ({ conversationId: conv.id, userId: m.id, role: "member" as const })),
  ];
  await db.insert(conversationMember).values(memberRows);

  return c.json({ conversationId: conv.id }, 201);
});

// GET /api/chat/conversations/:id/messages - paginated history, newest first.
chatRoutes.get("/conversations/:id/messages", async (c) => {
  const conversationId = c.req.param("id");
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const authUser = c.get("user");

  const [membership] = await db
    .select()
    .from(conversationMember)
    .where(
      and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, authUser.id)),
    )
    .limit(1);
  if (!membership) {
    return c.json({ error: "Not found" }, 404);
  }

  const rows = await db
    .select()
    .from(message)
    .where(eq(message.conversationId, conversationId))
    .orderBy(desc(message.createdAt))
    .limit(limit)
    .offset(offset);

  return c.json({ messages: rows, page: parsedQuery.data.page, pageSize: parsedQuery.data.pageSize });
});

// PATCH /api/chat/conversations/:id/read - mark this conversation read.
chatRoutes.patch("/conversations/:id/read", async (c) => {
  const conversationId = c.req.param("id");
  const db = c.get("db");
  const authUser = c.get("user");

  const [updated] = await db
    .update(conversationMember)
    .set({ lastReadAt: new Date() })
    .where(
      and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, authUser.id)),
    )
    .returning();
  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ ok: true });
});

// PATCH /api/chat/conversations/:id - rename/add/remove members (group owner only).
chatRoutes.patch("/conversations/:id", async (c) => {
  const conversationId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateConversationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const authUser = c.get("user");

  const [membership] = await db
    .select()
    .from(conversationMember)
    .where(
      and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, authUser.id)),
    )
    .limit(1);
  if (!membership) {
    return c.json({ error: "Not found" }, 404);
  }
  if (membership.role !== "owner") {
    return c.json({ error: "Only the group owner can do that." }, 403);
  }

  if (parsed.data.name) {
    await db.update(conversation).set({ name: parsed.data.name }).where(eq(conversation.id, conversationId));
  }

  if (parsed.data.addUsernames && parsed.data.addUsernames.length > 0) {
    const candidates = await db
      .select()
      .from(user)
      .where(inArray(user.username, parsed.data.addUsernames));
    const currentMembers = await db
      .select({ userId: conversationMember.userId })
      .from(conversationMember)
      .where(eq(conversationMember.conversationId, conversationId));
    const currentIds = new Set(currentMembers.map((m) => m.userId));
    const rowsToAdd = candidates
      .filter((candidate) => !currentIds.has(candidate.id))
      .map((candidate) => ({ conversationId, userId: candidate.id, role: "member" as const }));
    if (rowsToAdd.length > 0) {
      await db.insert(conversationMember).values(rowsToAdd);
    }
  }

  if (parsed.data.removeUserIds && parsed.data.removeUserIds.length > 0) {
    await db
      .delete(conversationMember)
      .where(
        and(
          eq(conversationMember.conversationId, conversationId),
          inArray(conversationMember.userId, parsed.data.removeUserIds),
        ),
      );
  }

  return c.json({ ok: true });
});

// PATCH /api/chat/messages/:id - edit your own message.
chatRoutes.patch("/messages/:id", async (c) => {
  const messageId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const authUser = c.get("user");

  const [updated] = await db
    .update(message)
    .set({ body: parsed.data.body, editedAt: new Date() })
    .where(and(eq(message.id, messageId), eq(message.senderId, authUser.id)))
    .returning();
  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ message: updated });
});

// DELETE /api/chat/messages/:id - soft delete your own message (row is kept, deletedAt set).
chatRoutes.delete("/messages/:id", async (c) => {
  const messageId = c.req.param("id");
  const db = c.get("db");
  const authUser = c.get("user");

  const [updated] = await db
    .update(message)
    .set({ deletedAt: new Date() })
    .where(and(eq(message.id, messageId), eq(message.senderId, authUser.id)))
    .returning();
  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});

// GET /api/chat/users/search?q=... - find people to start a chat with.
chatRoutes.get("/users/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) {
    return c.json({ users: [] });
  }

  const db = c.get("db");
  const authUser = c.get("user");

  const rows = await db
    .select({ id: user.id, name: user.name, username: user.username, image: user.image })
    .from(user)
    .where(and(ilike(user.username, `%${q}%`), ne(user.id, authUser.id)))
    .limit(10);

  return c.json({ users: rows });
});

// POST /api/chat/conversations/:id/attachments - upload a file for a not-yet-sent
// message (the client sends the resulting URL over the WebSocket with the
// message body, see ConversationRoom).
chatRoutes.post("/conversations/:id/attachments", async (c) => {
  const conversationId = c.req.param("id");
  const db = c.get("db");
  const authUser = c.get("user");

  const [membership] = await db
    .select()
    .from(conversationMember)
    .where(
      and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, authUser.id)),
    )
    .limit(1);
  if (!membership) {
    return c.json({ error: "Not found" }, 404);
  }

  const body = await c.req.parseBody();
  const file = body.file;
  if (!(file instanceof File)) {
    return c.json({ error: "Expected a 'file' field." }, 400);
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return c.json({ error: "File is too large (max 10 MB)." }, 400);
  }

  const key = `chat/${conversationId}/${crypto.randomUUID()}-${file.name}`;
  await c.env.CHAT_ATTACHMENTS_BUCKET.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type || "application/octet-stream" },
  });

  return c.json(
    {
      attachmentUrl: `/api/chat/attachments/${key}`,
      attachmentName: file.name,
      attachmentMimeType: file.type || "application/octet-stream",
      attachmentSizeBytes: file.size,
    },
    201,
  );
});

// GET /api/chat/attachments/* - proxies the R2 object back, gated on
// conversation membership (see the module doc comment in wrangler.toml —
// this bucket is never served publicly). Uses a wildcard route rather than
// a `:key` param since the key itself contains slashes.
chatRoutes.get("/attachments/*", async (c) => {
  const key = c.req.path.split("/attachments/")[1];
  if (!key) {
    return c.json({ error: "Not found" }, 404);
  }

  const conversationId = key.split("/")[1];
  if (!conversationId) {
    return c.json({ error: "Not found" }, 404);
  }

  const db = c.get("db");
  const authUser = c.get("user");

  const [membership] = await db
    .select()
    .from(conversationMember)
    .where(
      and(eq(conversationMember.conversationId, conversationId), eq(conversationMember.userId, authUser.id)),
    )
    .limit(1);
  if (!membership) {
    return c.json({ error: "Not found" }, 404);
  }

  const object = await c.env.CHAT_ATTACHMENTS_BUCKET.get(key);
  if (!object) {
    return c.json({ error: "Not found" }, 404);
  }

  return new Response(object.body, {
    headers: { "Content-Type": object.httpMetadata?.contentType ?? "application/octet-stream" },
  });
});
