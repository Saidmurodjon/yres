import { user } from "@yres/db";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/require-role";
import {
  updateUserProfileSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from "../schemas/admin-users";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const adminUsersRoutes = new Hono<AppEnv>();

adminUsersRoutes.use("*", authMiddleware);
adminUsersRoutes.use("*", requireRole("admin"));

// GET /api/admin/users - list every user, paginated.
adminUsersRoutes.get("/users", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const users = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      emailVerified: user.emailVerified,
      isActive: user.isActive,
      createdAt: user.createdAt,
    })
    .from(user)
    .limit(limit)
    .offset(offset);

  return c.json({ users, page: parsedQuery.data.page, pageSize: parsedQuery.data.pageSize });
});

// PATCH /api/admin/users/:id - edit name/username (role has its own route below).
adminUsersRoutes.patch("/users/:id", async (c) => {
  const targetUserId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserProfileSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");

  if (parsed.data.username) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.username, parsed.data.username), ne(user.id, targetUserId)));
    if (existing) {
      return c.json({ error: "This username is already taken." }, 409);
    }
  }

  const [updated] = await db
    .update(user)
    .set(parsed.data)
    .where(eq(user.id, targetUserId))
    .returning({ id: user.id, name: user.name, username: user.username });

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ user: updated });
});

// PATCH /api/admin/users/:id/status - activate/deactivate. Deactivating
// blocks every authMiddleware-gated request immediately (see middleware/
// auth.ts), without deleting anything.
adminUsersRoutes.patch("/users/:id/status", async (c) => {
  const targetUserId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const authUser = c.get("user");
  if (targetUserId === authUser.id && !parsed.data.isActive) {
    // Deactivating yourself would lock you out with no other admin action
    // possible from your session — same reasoning as the self-demotion
    // guard on the role route above.
    return c.json({ error: "You cannot deactivate your own account." }, 400);
  }

  const db = c.get("db");
  const [updated] = await db
    .update(user)
    .set({ isActive: parsed.data.isActive })
    .where(eq(user.id, targetUserId))
    .returning({ id: user.id, isActive: user.isActive });

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ user: updated });
});

// PATCH /api/admin/users/:id/role
adminUsersRoutes.patch("/users/:id/role", async (c) => {
  const targetUserId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const authUser = c.get("user");
  if (targetUserId === authUser.id && parsed.data.role !== "admin") {
    // An admin demoting themself would need someone else to promote them
    // back — simplest safe rule is to just disallow self-demotion entirely.
    return c.json({ error: "You cannot change your own role." }, 400);
  }

  const db = c.get("db");
  const [updated] = await db
    .update(user)
    .set({ role: parsed.data.role })
    .where(eq(user.id, targetUserId))
    .returning({ id: user.id, role: user.role });

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ user: updated });
});
