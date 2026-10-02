import { relations } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

/**
 * In-app notification feed (bell). See docs/social-features.md — pushed
 * live via the `UserNotificationChannel` Durable Object when the recipient
 * has a socket open, always persisted here regardless.
 */
export const notification = sqliteTable(
  "notification",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** e.g. "chat_message" | "building_shared" — see notify.ts for the full set. */
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    linkUrl: text("link_url"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("notification_user_created_at_idx").on(table.userId, table.createdAt)],
);

export const notificationRelations = relations(notification, ({ one }) => ({
  user: one(user, { fields: [notification.userId], references: [user.id] }),
}));
