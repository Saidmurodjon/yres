import { notification } from "@yres/db";
import type { Database } from "@yres/db";
import type { Env } from "../index";

export interface NotifyInput {
  userId: string;
  /** e.g. "building_shared" | "chat_message" — a stable key the frontend switches on to render an icon/link. */
  type: string;
  title: string;
  body?: string;
  linkUrl?: string;
}

/**
 * Inserts a `notification` row (always — this is the durable record the
 * bell's list/unread-count reads) and, if the recipient currently has a
 * `UserNotificationChannel` WebSocket open, pushes it live via a Durable
 * Object RPC call so the bell updates without a page refresh. The push is
 * fire-and-forget: no open socket (or any DO error) must never fail the
 * caller's actual action (e.g. inviting a building member) — logged and
 * swallowed instead.
 */
export async function notifyUser(env: Env, db: Database, input: NotifyInput): Promise<void> {
  const [row] = await db
    .insert(notification)
    .values({
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      linkUrl: input.linkUrl,
    })
    .returning();

  try {
    const id = env.USER_CHANNEL.idFromName(input.userId);
    await env.USER_CHANNEL.get(id).pushNotification(row);
  } catch (err) {
    console.error("[notify] failed to push live notification", err);
  }
}
