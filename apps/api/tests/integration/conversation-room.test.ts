import { conversation, conversationMember, message, user } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ConversationRoom } from "../../src/durable-objects/conversation-room";
import { closeTestDb, resetTestDb, testD1, testDb } from "../helpers/test-db";

/**
 * The Durable Object runtime is not available under Vitest, but webSocketMessage() only needs a context
 * (id.name, getWebSockets) and the D1 binding, so it is driven directly with fakes for the sockets.
 */
function makeRoom(conversationId: string, senderId: string) {
  const sent: string[] = [];
  const socket = {
    deserializeAttachment: () => senderId,
    send: (data: string) => {
      sent.push(data);
    },
  };
  const ctx = { id: { name: conversationId }, getWebSockets: () => [socket] };
  const env = { DB: testD1, USER_CHANNEL: {} };
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
});
