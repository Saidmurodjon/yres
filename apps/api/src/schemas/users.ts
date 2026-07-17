import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, '_' and '.'")
    .optional(),
  image: z.string().url().nullable().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
