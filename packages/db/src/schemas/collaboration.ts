import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { building } from "./buildings";
import { buildingMemberRoleEnum } from "./enums";

export const buildingMember = pgTable(
  "building_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: buildingMemberRoleEnum("role").notNull(),
    invitedByUserId: text("invited_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique().on(table.buildingId, table.userId)],
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
