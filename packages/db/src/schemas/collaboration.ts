import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { building } from "./buildings";
import { buildingMemberRoleEnum } from "./enums";

export const buildingMember = sqliteTable(
  "building_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: buildingMemberRoleEnum.enumValues }).notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    unique().on(table.buildingId, table.userId),
    index("building_member_user_id_idx").on(table.userId),
  ],
);

export const buildingMemberRelations = relations(buildingMember, ({ one }) => ({
  building: one(building, { fields: [buildingMember.buildingId], references: [building.id] }),
  // Two relations to `user` (member + inviter) need distinct relationNames
  // so Drizzle's relational query builder can tell which FK each is.
  user: one(user, {
    fields: [buildingMember.userId],
    references: [user.id],
    relationName: "buildingMemberUser",
  }),
  invitedBy: one(user, {
    fields: [buildingMember.invitedByUserId],
    references: [user.id],
    relationName: "buildingMemberInvitedBy",
  }),
}));
