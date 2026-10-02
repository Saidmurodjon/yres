import { z } from "zod";
import { ALLOWED_ATTACHMENT_MIME_TYPES } from "../lib/attachments";

export const createConversationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("direct"), username: z.string().min(1).max(320) }),
  z.object({
    type: z.literal("group"),
    name: z.string().min(1).max(300),
    usernames: z.array(z.string().min(1).max(320)).min(1).max(50),
  }),
]);
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  name: z.string().min(1).max(300).optional(),
  addUsernames: z.array(z.string().min(1).max(320)).max(50).optional(),
  removeUserIds: z.array(z.string().max(100)).max(50).optional(),
});
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

export const updateMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;

const MAX_WS_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Frames a client may send over the conversation WebSocket (V-2). Built per conversation because the only
 * attachment URL a frame may carry is one this conversation's upload route produced
 * (`/api/chat/attachments/chat/<conversationId>/<uuid>-<name>`): the web client prefixes the value with the
 * API URL, so an arbitrary string such as "@evil.com/x" would turn into a link to another site.
 */
export function makeIncomingWsMessageSchema(conversationId: string) {
  const attachmentUrl = z
    .string()
    .max(600)
    .regex(new RegExp(`^/api/chat/attachments/chat/${escapeRegExp(conversationId)}/[^/?#]+$`));
  const body = z.string().max(4000);
  const messageId = z.string().uuid();

  return z.discriminatedUnion("type", [
    z.object({
      type: z.literal("message"),
      body: body.optional(),
      replyToId: messageId.nullable().optional(),
      attachmentUrl: attachmentUrl.nullable().optional(),
      attachmentName: z.string().max(200).nullable().optional(),
      attachmentMimeType: z.enum(ALLOWED_ATTACHMENT_MIME_TYPES).nullable().optional(),
      attachmentSizeBytes: z
        .number()
        .int()
        .min(0)
        .max(MAX_WS_ATTACHMENT_BYTES)
        .nullable()
        .optional(),
    }),
    z.object({ type: z.literal("typing") }),
    z.object({ type: z.literal("read") }),
    z.object({ type: z.literal("edit"), messageId, body: body.min(1) }),
    z.object({ type: z.literal("delete"), messageId }),
  ]);
}

export type IncomingWsMessage = z.infer<ReturnType<typeof makeIncomingWsMessageSchema>>;
