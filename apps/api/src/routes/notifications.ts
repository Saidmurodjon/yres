import { notification } from "@yres/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const notificationsRoutes = new Hono<AppEnv>();

notificationsRoutes.use("*", authMiddleware);

// GET /api/notifications - paginated list + unread count
notificationsRoutes.get("/", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const authUser = c.get("user");

  const [rows, unread] = await Promise.all([
    db
      .select()
      .from(notification)
      .where(eq(notification.userId, authUser.id))
      .orderBy(desc(notification.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ id: notification.id })
      .from(notification)
      .where(and(eq(notification.userId, authUser.id), eq(notification.isRead, false))),
  ]);

  return c.json({
    notifications: rows,
    unreadCount: unread.length,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
  });
});

// PATCH /api/notifications/read-all
notificationsRoutes.patch("/read-all", async (c) => {
  const db = c.get("db");
  const authUser = c.get("user");

  await db
    .update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.userId, authUser.id), eq(notification.isRead, false)));

  return c.json({ ok: true });
});

// GET /api/notifications/ws - upgrades to a WebSocket and forwards the raw
// request to the caller's own UserNotificationChannel Durable Object
// instance (idFromName keeps every request for this user routed to the
// same instance globally).
notificationsRoutes.get("/ws", async (c) => {
  const authUser = c.get("user");
  const id = c.env.USER_CHANNEL.idFromName(authUser.id);
  const stub = c.env.USER_CHANNEL.get(id);
  return stub.fetch(c.req.raw);
});

// PATCH /api/notifications/:id/read
notificationsRoutes.patch("/:id/read", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const authUser = c.get("user");

  const [updated] = await db
    .update(notification)
    .set({ isRead: true })
    .where(and(eq(notification.id, id), eq(notification.userId, authUser.id)))
    .returning();

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ notification: updated });
});
