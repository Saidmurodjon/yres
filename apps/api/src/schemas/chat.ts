import { z } from "zod";

export const createConversationSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("direct"), username: z.string().min(1) }),
  z.object({
    type: z.literal("group"),
    name: z.string().min(1),
    usernames: z.array(z.string().min(1)).min(1),
  }),
]);
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

export const updateConversationSchema = z.object({
  name: z.string().min(1).optional(),
  addUsernames: z.array(z.string().min(1)).optional(),
  removeUserIds: z.array(z.string()).optional(),
});
export type UpdateConversationInput = z.infer<typeof updateConversationSchema>;

export const updateMessageSchema = z.object({
  body: z.string().min(1).max(4000),
});
export type UpdateMessageInput = z.infer<typeof updateMessageSchema>;
