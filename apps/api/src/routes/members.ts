import { buildingMember, user } from "@yres/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { findAccessibleBuilding, findOwnedBuilding } from "../lib/building-access";
import { notifyUser } from "../lib/notify";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { inviteMemberSchema, updateMemberRoleSchema } from "../schemas/members";

export const membersRoutes = new Hono<AppEnv>();

membersRoutes.use("*", authMiddleware);

// GET /:id/members - list everyone with access to this building (any role,
// including the caller themselves if they're a member — the owner is never
// in this list, since they're tracked via building.userId, not a row here).
membersRoutes.get("/:id/members", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const currentUser = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, currentUser.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const members = await db
    .select({
      id: buildingMember.id,
      role: buildingMember.role,
      createdAt: buildingMember.createdAt,
      userId: user.id,
      name: user.name,
      email: user.email,
    })
    .from(buildingMember)
    .innerJoin(user, eq(buildingMember.userId, user.id))
    .where(eq(buildingMember.buildingId, buildingId));

  return c.json({ members });
});

// POST /:id/members - invite an existing registered user by email (owner
// only). There's no email-sending infrastructure in this app, so this only
// works for users who already have an account — inviting an unregistered
// email fails with a clear error rather than silently doing nothing or
// fabricating a pending-invite system that doesn't actually deliver email.
membersRoutes.post("/:id/members", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const currentUser = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, currentUser.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { email, role } = parsed.data;

  const [invitedUser] = await db.select().from(user).where(eq(user.email, email)).limit(1);
  if (!invitedUser) {
    return c.json(
      { error: "No YRES account found with that email. They need to create an account first." },
      404,
    );
  }
  if (invitedUser.id === owned.userId) {
    return c.json({ error: "This building's owner already has full access." }, 400);
  }

  const [existingMember] = await db
    .select()
    .from(buildingMember)
    .where(and(eq(buildingMember.buildingId, buildingId), eq(buildingMember.userId, invitedUser.id)))
    .limit(1);
  if (existingMember) {
    return c.json({ error: "That user already has access to this building." }, 400);
  }

  const [member] = await db
    .insert(buildingMember)
    .values({ buildingId, userId: invitedUser.id, role, invitedByUserId: currentUser.id })
    .returning();

  await notifyUser(c.env, db, {
    userId: invitedUser.id,
    type: "building_shared",
    title: `${currentUser.name} shared "${owned.name}" with you`,
    linkUrl: `/buildings/${buildingId}`,
  });

  return c.json(
    {
      member: {
        id: member?.id,
        role,
        createdAt: member?.createdAt,
        userId: invitedUser.id,
        name: invitedUser.name,
        email: invitedUser.email,
      },
    },
    201,
  );
});

// PATCH /:id/members/:memberId - change a member's role (owner only)
membersRoutes.patch("/:id/members/:memberId", async (c) => {
  const buildingId = c.req.param("id");
  const memberId = c.req.param("memberId");
  const body = await c.req.json().catch(() => null);
  const parsed = updateMemberRoleSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const currentUser = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, currentUser.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [updated] = await db
    .update(buildingMember)
    .set({ role: parsed.data.role })
    .where(and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)))
    .returning();

  if (!updated) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ member: updated });
});

// DELETE /:id/members/:memberId - remove a member's access (owner only)
membersRoutes.delete("/:id/members/:memberId", async (c) => {
  const buildingId = c.req.param("id");
  const memberId = c.req.param("memberId");
  const db = c.get("db");
  const currentUser = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, currentUser.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const deleted = await db
    .delete(buildingMember)
    .where(and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});
