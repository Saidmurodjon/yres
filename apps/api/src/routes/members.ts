import { buildingMember, user } from "@yres/db";
import { and, eq } from "drizzle-orm";
import { Hono } from "hono";
import { auditEventStatement } from "../lib/audit-event";
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
    .where(
      and(eq(buildingMember.buildingId, buildingId), eq(buildingMember.userId, invitedUser.id)),
    )
    .limit(1);
  if (existingMember) {
    return c.json({ error: "That user already has access to this building." }, 400);
  }

  const memberId = crypto.randomUUID();
  const [, [member]] = (await db.batch([
    auditEventStatement(db, c, {
      buildingId,
      entity: "members",
      entityId: memberId,
      action: "create",
      summary: { targetUserId: invitedUser.id, role },
    }),
    db
      .insert(buildingMember)
      .values({ id: memberId, buildingId, userId: invitedUser.id, role, invitedByUserId: currentUser.id })
      .returning(),
  ])) as unknown as [unknown, (typeof buildingMember.$inferSelect)[]];

  // Fire-and-forget, intentionally *after* the batch above (realtime.md): a push failure must
  // never undo or block the actual membership grant.
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

  // `targetUserId` for the audit summary has to be known before the batch (it's the first
  // statement), so it's fetched up front rather than off the update's own `.returning()`.
  const existing = await db.query.buildingMember.findFirst({
    where: and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)),
    columns: { userId: true },
  });
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const [, [updated]] = (await db.batch([
    auditEventStatement(db, c, {
      buildingId,
      entity: "members",
      entityId: memberId,
      action: "update",
      summary: { targetUserId: existing.userId, role: parsed.data.role },
    }),
    db
      .update(buildingMember)
      .set({ role: parsed.data.role })
      .where(and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)))
      .returning(),
  ])) as unknown as [unknown, (typeof buildingMember.$inferSelect)[]];

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

  const existing = await db.query.buildingMember.findFirst({
    where: and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)),
    columns: { userId: true, role: true },
  });
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const deleted = await db.batch([
    auditEventStatement(db, c, {
      buildingId,
      entity: "members",
      entityId: memberId,
      action: "delete",
      summary: { targetUserId: existing.userId, role: existing.role },
    }),
    db
      .delete(buildingMember)
      .where(and(eq(buildingMember.id, memberId), eq(buildingMember.buildingId, buildingId)))
      .returning(),
  ]).then(([, rows]) => rows);

  if (deleted.length === 0) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.body(null, 204);
});
