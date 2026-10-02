import { describe, expect, it } from "vitest";
import { makeIncomingWsMessageSchema } from "../../src/schemas/chat";

const CONVERSATION = "123e4567-e89b-42d3-a456-426614174000";
const OTHER_CONVERSATION = "223e4567-e89b-42d3-a456-426614174999";
const MESSAGE_ID = "323e4567-e89b-42d3-a456-426614174111";
const schema = makeIncomingWsMessageSchema(CONVERSATION);
const url = (conversation = CONVERSATION, name = "abc-photo.png") =>
  `/api/chat/attachments/chat/${conversation}/${name}`;

describe("incoming WebSocket frames (V-2)", () => {
  it("accepts the frames the web client sends", () => {
    expect(schema.safeParse({ type: "message", body: "salom" }).success).toBe(true);
    expect(
      schema.safeParse({
        type: "message",
        body: "",
        replyToId: null,
        attachmentUrl: url(),
        attachmentName: "photo.png",
        attachmentMimeType: "image/png",
        attachmentSizeBytes: 1234,
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ type: "message", body: "re", replyToId: MESSAGE_ID }).success).toBe(
      true,
    );
    expect(schema.safeParse({ type: "typing" }).success).toBe(true);
    expect(schema.safeParse({ type: "read" }).success).toBe(true);
    expect(schema.safeParse({ type: "edit", messageId: MESSAGE_ID, body: "x" }).success).toBe(true);
    expect(schema.safeParse({ type: "delete", messageId: MESSAGE_ID }).success).toBe(true);
  });

  it("rejects an attachment URL that is not this conversation's upload (userinfo trick, other chat, traversal)", () => {
    for (const attachmentUrl of [
      "@evil.com/x",
      "https://evil.example/x.png",
      url(OTHER_CONVERSATION),
      `/api/chat/attachments/chat/${CONVERSATION}/../../other/x.png`,
      `${url()}?x=1`,
      `${url()}#frag`,
      `/api/chat/attachments/chat/${CONVERSATION}/`,
    ]) {
      expect(schema.safeParse({ type: "message", attachmentUrl }).success).toBe(false);
    }
  });

  it("rejects a body over 4000 characters, for new messages and edits", () => {
    expect(schema.safeParse({ type: "message", body: "x".repeat(4001) }).success).toBe(false);
    expect(schema.safeParse({ type: "message", body: "x".repeat(4000) }).success).toBe(true);
    expect(
      schema.safeParse({ type: "edit", messageId: MESSAGE_ID, body: "x".repeat(4001) }).success,
    ).toBe(false);
  });

  it("rejects malformed ids, unknown types and bad attachment metadata", () => {
    expect(schema.safeParse({ type: "delete", messageId: "not-a-uuid" }).success).toBe(false);
    expect(schema.safeParse({ type: "message", replyToId: "nope" }).success).toBe(false);
    expect(schema.safeParse({ type: "ping" }).success).toBe(false);
    expect(schema.safeParse({ type: "message", attachmentMimeType: "text/html" }).success).toBe(
      false,
    );
    expect(schema.safeParse({ type: "message", attachmentMimeType: "image/svg+xml" }).success).toBe(
      false,
    );
    expect(
      schema.safeParse({ type: "message", attachmentSizeBytes: 10 * 1024 * 1024 + 1 }).success,
    ).toBe(false);
    expect(schema.safeParse({ type: "message", attachmentSizeBytes: -1 }).success).toBe(false);
    expect(schema.safeParse({ type: "message", attachmentName: "x".repeat(201) }).success).toBe(
      false,
    );
    expect(schema.safeParse("not an object").success).toBe(false);
  });
});
