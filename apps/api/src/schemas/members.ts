import { buildingMemberRoleEnum } from "@yres/db";
import { z } from "zod";

export const inviteMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(buildingMemberRoleEnum.enumValues),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: z.enum(buildingMemberRoleEnum.enumValues),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
