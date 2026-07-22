import { building, buildingMember } from "@yres/db";
import { count, eq, inArray, or } from "drizzle-orm";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding, findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { createBuildingSchema, updateBuildingSchema } from "../schemas/building";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const buildingRoutes = new Hono<AppEnv>();

buildingRoutes.use("*", authMiddleware);

// GET / - list buildings the current user owns or has been shared, paginated
buildingRoutes.get("/", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const user = c.get("user");

  const memberBuildingIds = db
    .select({ id: buildingMember.buildingId })
    .from(buildingMember)
    .where(eq(buildingMember.userId, user.id));

  const [buildings, memberships] = await Promise.all([
    db
      .select()
      .from(building)
      .where(or(eq(building.userId, user.id), inArray(building.id, memberBuildingIds)))
      .limit(limit)
      .offset(offset),
    db
      .select({ buildingId: buildingMember.buildingId, role: buildingMember.role })
      .from(buildingMember)
      .where(eq(buildingMember.userId, user.id)),
  ]);

  const buildingIds = buildings.map((b) => b.id);
  const collaboratorCounts =
    buildingIds.length > 0
      ? await db
          .select({ buildingId: buildingMember.buildingId, count: count() })
          .from(buildingMember)
          .where(inArray(buildingMember.buildingId, buildingIds))
          .groupBy(buildingMember.buildingId)
      : [];
  const collaboratorCountByBuildingId = new Map(
    collaboratorCounts.map((c) => [c.buildingId, c.count]),
  );

  const roleByBuildingId = new Map(memberships.map((m) => [m.buildingId, m.role]));
  const buildingsWithRole = buildings.map((b) => ({
    ...b,
    role: b.userId === user.id ? ("owner" as const) : (roleByBuildingId.get(b.id) ?? "viewer"),
    // The owner is never a `buildingMember` row (see that table's comment), so +1 accounts for them.
    collaboratorCount: (collaboratorCountByBuildingId.get(b.id) ?? 0) + 1,
  }));

  return c.json({
    buildings: buildingsWithRole,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
  });
});

// POST / - create a building
buildingRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = createBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const [created] = await db
    .insert(building)
    .values({ ...parsed.data, userId: user.id })
    .returning();

  return c.json({ building: created }, 201);
});

// GET /:id - get one building, scoped to anyone with access (owner or shared member)
buildingRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, id, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ building: access.building, role: access.role });
});

// PUT /:id - update a building (owner or editor; viewers are read-only)
buildingRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, id, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const [updated] = await db
    .update(building)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(building.id, id))
    .returning();

  return c.json({ building: updated });
});

// DELETE /:id - delete a building (owner only — shared editors can't delete it out from under the owner)
buildingRoutes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const existing = await findOwnedBuilding(db, id, user.id);
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  await db.delete(building).where(eq(building.id, id));

  return c.body(null, 204);
});
