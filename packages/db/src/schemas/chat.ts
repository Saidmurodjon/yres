import { relations } from "drizzle-orm";
import {
  type AnyPgColumn,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const conversationTypeEnum = pgEnum("conversation_type", ["direct", "group"]);
/** "owner" can rename/add/remove members in a group; meaningless for "direct" conversations. */
export const conversationMemberRoleEnum = pgEnum("conversation_member_role", ["owner", "member"]);

export const conversation = pgTable("conversation", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: conversationTypeEnum("type").notNull(),
  /** Null for "direct" conversations — only groups are named. */
  name: text("name"),
  createdBy: text("created_by")
    .notNull()
    .references(() => user.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const conversationMember = pgTable(
  "conversation_member",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: conversationMemberRoleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    /** Drives both the unread-count badge and the ✓✓ read receipt (a message is "read" by a member once their lastReadAt >= the message's createdAt). */
    lastReadAt: timestamp("last_read_at"),
  },
  (table) => [unique().on(table.conversationId, table.userId)],
);

export const message = pgTable(
  "message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversation.id, { onDelete: "cascade" }),
    senderId: text("sender_id")
      .notNull()
      .references(() => user.id),
    body: text("body").notNull(),
    /** Quoted reply — self-referencing, nullable. */
    replyToId: uuid("reply_to_id").references((): AnyPgColumn => message.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    editedAt: timestamp("edited_at"),
    /** Soft delete — row is kept (for other members' history) but the client renders a tombstone. */
    deletedAt: timestamp("deleted_at"),
    attachmentUrl: text("attachment_url"),
    attachmentName: text("attachment_name"),
    attachmentMimeType: text("attachment_mime_type"),
    attachmentSizeBytes: integer("attachment_size_bytes"),
  },
  (table) => [index("message_conversation_created_at_idx").on(table.conversationId, table.createdAt)],
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
