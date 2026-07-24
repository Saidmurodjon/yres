import { userRoleEnum } from "@yres/db";
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoleEnum.enumValues),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

// Same validation as users.ts's updateUserSchema (self-service profile
// edit), minus `image` — admin editing someone else's profile doesn't need
// to touch their avatar.
export const updateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  username: z
    .string()
    .min(3)
    .max(32)
    .regex(/^[a-zA-Z0-9_.]+$/, "Username can only contain letters, numbers, '_' and '.'")
    .optional(),
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
