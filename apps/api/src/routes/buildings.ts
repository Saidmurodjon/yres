import { type Database, building, buildingMember } from "@yres/db";
import type { BuildingStatus, BuildingType } from "@yres/types";
import { and, count, desc, eq, ilike, inArray, or, sum } from "drizzle-orm";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding, findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import {
  buildingListQuerySchema,
  buildingStatsQuerySchema,
  createBuildingSchema,
  updateBuildingSchema,
} from "../schemas/building";
import { toLimitOffset } from "../schemas/pagination";

export const buildingRoutes = new Hono<AppEnv>();

buildingRoutes.use("*", authMiddleware);

/** "Owner, or shared as a `building_member`" — the access scope every list/aggregate endpoint below filters to. */
function accessibleBuildingsCondition(db: Database, userId: string) {
  const memberBuildingIds = db
    .select({ id: buildingMember.buildingId })
    .from(buildingMember)
    .where(eq(buildingMember.userId, userId));
  return or(eq(building.userId, userId), inArray(building.id, memberBuildingIds));
}

/** Shared by GET / and GET /stats — `search`/`type`/`status` mean the same thing in both. */
function buildingFilterConditions(filters: {
  search?: string;
  type?: BuildingType;
  status?: BuildingStatus;
}) {
  return [
    filters.search
      ? or(
          ilike(building.name, `%${filters.search}%`),
          ilike(building.location, `%${filters.search}%`),
        )
      : undefined,
    filters.type ? eq(building.buildingType, filters.type) : undefined,
    filters.status ? eq(building.status, filters.status) : undefined,
  ];
}

// GET / - list buildings the current user owns or has been shared, paginated + filtered
buildingRoutes.get("/", async (c) => {
  const parsedQuery = buildingListQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { search, type, status, region } = parsedQuery.data;
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const user = c.get("user");

  const whereCondition = and(
    accessibleBuildingsCondition(db, user.id),
    ...buildingFilterConditions({ search, type, status }),
    region ? eq(building.location, region) : undefined,
  );

  const [buildings, memberships, totalRows] = await Promise.all([
    db.select().from(building).where(whereCondition).limit(limit).offset(offset),
    db
      .select({ buildingId: buildingMember.buildingId, role: buildingMember.role })
      .from(buildingMember)
      .where(eq(buildingMember.userId, user.id)),
    db.select({ total: count() }).from(building).where(whereCondition),
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
    total: totalRows[0]?.total ?? 0,
  });
});

// GET /locations - every distinct `location` string across buildings the
// user can access, unpaginated — backs the region filter dropdown, which
// needs to offer every known value, not just the values on the current page.
buildingRoutes.get("/locations", async (c) => {
  const db = c.get("db");
  const user = c.get("user");

  const rows = await db
    .selectDistinct({ location: building.location })
    .from(building)
    .where(accessibleBuildingsCondition(db, user.id))
    .orderBy(building.location);

  return c.json({ locations: rows.map((r) => r.location) });
});

// GET /stats - aggregate counts/floor-area/region-breakdown across the
// accessible+filtered set (same search/type/status filters as the list,
// minus `region` and pagination — this aggregates the whole filtered set,
// not one page of it). Feeds the dashboard's metric cards and region chart
// in one request instead of computing them client-side from every row.
buildingRoutes.get("/stats", async (c) => {
  const parsedQuery = buildingStatsQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const whereCondition = and(
    accessibleBuildingsCondition(db, user.id),
    ...buildingFilterConditions(parsedQuery.data),
  );

  const [totals, byRegion] = await Promise.all([
    db
      .select({ totalCount: count(), totalFloorAreaM2: sum(building.netCooledFloorAreaM2) })
      .from(building)
      .where(whereCondition),
    db
      .select({ location: building.location, count: count() })
      .from(building)
      .where(whereCondition)
      .groupBy(building.location)
      .orderBy(desc(count())),
  ]);

  return c.json({
    totalCount: totals[0]?.totalCount ?? 0,
    totalFloorAreaM2: Number(totals[0]?.totalFloorAreaM2 ?? 0),
    byRegion,
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
