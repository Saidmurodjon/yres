import {
  conversation,
  conversationMember,
  insertChunked,
  message,
  notification,
  user,
} from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConversationRoom } from "../../src/durable-objects/conversation-room";
import { closeTestDb, resetTestDb, testD1, testDb } from "../helpers/test-db";

/**
 * The Durable Object runtime is not available under Vitest, but webSocketMessage() only needs a context
 * (id.name, getWebSockets) and the D1 binding, so it is driven directly with fakes for the sockets.
 */
function makeRoom(
  conversationId: string,
  senderId: string,
  extra: { db?: D1Database; pushes?: string[] } = {},
) {
  const sent: string[] = [];
  const socket = {
    deserializeAttachment: () => senderId,
    send: (data: string) => {
      sent.push(data);
    },
  };
  const ctx = { id: { name: conversationId }, getWebSockets: () => [socket] };
  const env = {
    DB: extra.db ?? testD1,
    USER_CHANNEL: {
      idFromName: (name: string) => name,
      get: (name: string) => ({
        pushNotification: async () => {
          extra.pushes?.push(name);
        },
      }),
    },
  };
  const room = Object.assign(Object.create(ConversationRoom.prototype), { ctx, env });
  return { room: room as ConversationRoom, socket: socket as unknown as WebSocket, sent };
}

describe("ConversationRoom frame validation (V-2)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function seed() {
    const userId = crypto.randomUUID();
    const conversationId = crypto.randomUUID();
    await testDb.insert(user).values({
      id: userId,
      name: "Sender",
      email: `${userId}@example.com`,
      username: `${userId}@example.com`,
    });
    await testDb
      .insert(conversation)
      .values({ id: conversationId, type: "group", name: "G", createdBy: userId });
    await testDb.insert(conversationMember).values({ conversationId, userId, role: "owner" });
    return { userId, conversationId, ...makeRoom(conversationId, userId) };
  }

  const stored = (conversationId: string) =>
    testDb.select().from(message).where(eq(message.conversationId, conversationId));

  it("stores and broadcasts a valid message with this conversation's attachment", async () => {
    const { room, socket, sent, conversationId } = await seed();
    await room.webSocketMessage(
      socket,
      JSON.stringify({
        type: "message",
        body: "salom",
        attachmentUrl: `/api/chat/attachments/chat/${conversationId}/abc-photo.png`,
        attachmentName: "photo.png",
        attachmentMimeType: "image/png",
        attachmentSizeBytes: 10,
      }),
    );
    const rows = await stored(conversationId);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.attachmentMimeType).toBe("image/png");
    expect(sent).toHaveLength(1);
  });

  it("drops a frame whose attachment URL would leave the site, without storing or broadcasting", async () => {
    const { room, socket, sent, conversationId } = await seed();
    for (const attachmentUrl of [
      "@evil.com/x",
      `/api/chat/attachments/chat/${crypto.randomUUID()}/x.png`,
    ]) {
      await room.webSocketMessage(
        socket,
        JSON.stringify({ type: "message", body: "hi", attachmentUrl }),
      );
    }
    expect(await stored(conversationId)).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("drops an over-long body, an unknown type, bad JSON and an oversized frame", async () => {
    const { room, socket, sent, conversationId } = await seed();
    for (const frame of [
      JSON.stringify({ type: "message", body: "x".repeat(4001) }),
      JSON.stringify({ type: "shout" }),
      "{not json",
      JSON.stringify({ type: "message", body: "x".repeat(70_000) }),
    ]) {
      await room.webSocketMessage(socket, frame);
    }
    expect(await stored(conversationId)).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it("does not let an edit or delete reach a message of another conversation, even the sender's own", async () => {
    const a = await seed();
    const b = await seed();
    const [own] = await testDb
      .insert(message)
      .values({ conversationId: b.conversationId, senderId: a.userId, body: "secret in B" })
      .returning();
    if (!own) throw new Error("seed failed");

    await a.room.webSocketMessage(
      a.socket,
      JSON.stringify({ type: "edit", messageId: own.id, body: "leak" }),
    );
    await a.room.webSocketMessage(a.socket, JSON.stringify({ type: "delete", messageId: own.id }));

    const [after] = await testDb.select().from(message).where(eq(message.id, own.id));
    expect(after?.body).toBe("secret in B");
    expect(after?.deletedAt).toBeNull();
    expect(a.sent).toHaveLength(0);
  });

  it("still lets a sender edit and delete their own message in this conversation", async () => {
    const a = await seed();
    const [own] = await testDb
      .insert(message)
      .values({ conversationId: a.conversationId, senderId: a.userId, body: "old" })
      .returning();
    if (!own) throw new Error("seed failed");
    await a.room.webSocketMessage(
      a.socket,
      JSON.stringify({ type: "edit", messageId: own.id, body: "new" }),
    );
    await a.room.webSocketMessage(a.socket, JSON.stringify({ type: "delete", messageId: own.id }));
    const [after] = await testDb.select().from(message).where(eq(message.id, own.id));
    expect(after?.body).toBe("new");
    expect(after?.deletedAt).not.toBeNull();
    expect(a.sent).toHaveLength(2);
  });

  it("rejects a reply that quotes a message of another conversation, accepts one in the same", async () => {
    const a = await seed();
    const b = await seed();
    const [foreign] = await testDb
      .insert(message)
      .values({ conversationId: b.conversationId, senderId: b.userId, body: "private to B" })
      .returning();
    const [local] = await testDb
      .insert(message)
      .values({ conversationId: a.conversationId, senderId: a.userId, body: "mine" })
      .returning();
    if (!foreign || !local) throw new Error("seed failed");

    await a.room.webSocketMessage(
      a.socket,
      JSON.stringify({ type: "message", body: "re", replyToId: foreign.id }),
    );
    expect(await stored(a.conversationId)).toHaveLength(1); // only the seeded local message
    expect(a.sent).toHaveLength(0);

    await a.room.webSocketMessage(
      a.socket,
      JSON.stringify({ type: "message", body: "re", replyToId: local.id }),
    );
    expect(await stored(a.conversationId)).toHaveLength(2);
  });

  it("stores one message and 49 notifications for an offline 50-member group inside the query budget", async () => {
    const owner = crypto.randomUUID();
    const conversationId = crypto.randomUUID();
    const memberIds = Array.from({ length: 49 }, () => crypto.randomUUID());
    const everyone = [owner, ...memberIds];
    await testDb.batch(
      insertChunked(
        testDb,
        user,
        everyone.map((id) => ({
          id,
          name: `U-${id.slice(0, 4)}`,
          email: `${id}@example.com`,
          username: `${id}@example.com`,
        })),
      ) as never,
    );
    await testDb
      .insert(conversation)
      .values({ id: conversationId, type: "group", name: "G", createdBy: owner });
    await testDb.batch(
      insertChunked(
        testDb,
        conversationMember,
        everyone.map((userId) => ({ conversationId, userId })),
      ) as never,
    );

    let queries = 0;
    const countingD1 = new Proxy(testD1, {
      get(target, prop) {
        const value = Reflect.get(target, prop, target);
        if (prop === "prepare") {
          return (...args: unknown[]) => {
            queries += 1;
            return (value as (...a: unknown[]) => unknown).apply(target, args);
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    const pushes: string[] = [];
    const { room, socket } = makeRoom(conversationId, owner, { db: countingD1, pushes });
    await room.webSocketMessage(
      socket,
      JSON.stringify({ type: "message", body: "hello everyone" }),
    );

    expect(await stored(conversationId)).toHaveLength(1);
    expect(await testDb.select().from(notification)).toHaveLength(49);
    expect(queries).toBeLessThanOrEqual(10);
    expect(pushes.length).toBeLessThanOrEqual(30);
    expect(queries + pushes.length).toBeLessThan(50);
  });
});
