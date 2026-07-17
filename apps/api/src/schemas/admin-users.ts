import { userRoleEnum } from "@yres/db";
import { z } from "zod";

export const updateUserRoleSchema = z.object({
  role: z.enum(userRoleEnum.enumValues),
});

export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
