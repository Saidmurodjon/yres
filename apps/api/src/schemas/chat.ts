import { z } from "zod";

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
