import { relations } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  index,
  integer,
  sqliteTable,
  text,
  unique,
} from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { conversationMemberRoleEnum, conversationTypeEnum } from "./enums";

export const conversation = sqliteTable("conversation", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type", { enum: conversationTypeEnum.enumValues }).notNull(),
  /** Null for "direct" conversations — only groups are named. */
  name: text("name"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const conversationMember = sqliteTable(
  "conversation_member",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: conversationMemberRoleEnum.enumValues }).notNull().default("member"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    /** Drives both the unread-count badge and the ✓✓ read receipt (a message is "read" by a member once their lastReadAt >= the message's createdAt). */
    lastReadAt: integer("last_read_at", { mode: "timestamp_ms" }),
  },
  (table) => [unique().on(table.conversationId, table.userId)],
);

export const message = sqliteTable(
  "message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    conversationId: text("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id),
    body: text("body").notNull(),
    /** Quoted reply — self-referencing, nullable. */
    replyToId: text("reply_to_id").references((): AnySQLiteColumn => message.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    editedAt: integer("edited_at", { mode: "timestamp_ms" }),
    /** Soft delete — row is kept (for other members' history) but the client renders a tombstone. */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentMimeType: text("attachment_mime_type"),
    attachmentSizeBytes: integer("attachment_size_bytes"),
  },
  (table) => [
    index("message_conversation_created_at_idx").on(table.conversationId, table.createdAt),
  ],
);

export const conversationRelations = relations(conversation, ({ many }) => ({
  members: many(conversationMember),
  messages: many(message),
}));

export const conversationMemberRelations = relations(conversationMember, ({ one }) => ({
  conversation: one(conversation, {
    fields: [conversationMember.conversationId],
    references: [conversation.id],
  }),
  user: one(user, { fields: [conversationMember.userId], references: [user.id] }),
}));

export const messageRelations = relations(message, ({ one }) => ({
  conversation: one(conversation, {
    fields: [message.conversationId],
    references: [conversation.id],
  }),
  sender: one(user, { fields: [message.senderId], references: [user.id] }),
  replyTo: one(message, {
    fields: [message.replyToId],
    references: [message.id],
    relationName: "messageReplyTo",
  }),
}));
