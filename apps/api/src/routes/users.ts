import { user } from "@yres/db";
import { and, eq, ne } from "drizzle-orm";
import { Hono } from "hono";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { updateUserSchema } from "../schemas/users";

export const usersRoutes = new Hono<AppEnv>();

usersRoutes.use("*", authMiddleware);

// GET /api/users/me
usersRoutes.get("/me", async (c) => {
  const db = c.get("db");
  const authUser = c.get("user");

  const [row] = await db.select().from(user).where(eq(user.id, authUser.id));
  if (!row) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ user: row });
});

// PATCH /api/users/me - name/username/image. Password changes go through
// Better Auth's own authClient.changePassword, not this route.
usersRoutes.patch("/me", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const authUser = c.get("user");

  if (parsed.data.username) {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(eq(user.username, parsed.data.username), ne(user.id, authUser.id)));
    if (existing) {
      return c.json({ error: "This username is already taken." }, 409);
    }
  }

  const [updated] = await db
    .update(user)
    .set(parsed.data)
    .where(eq(user.id, authUser.id))
    .returning();

  return c.json({ user: updated });
});
