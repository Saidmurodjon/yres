import { building } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { createBuildingSchema, updateBuildingSchema } from "../schemas/building";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const buildingRoutes = new Hono<AppEnv>();

buildingRoutes.use("*", authMiddleware);

// GET / - list current user's buildings, paginated
buildingRoutes.get("/", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const user = c.get("user");

  const buildings = await db
    .select()
    .from(building)
    .where(eq(building.userId, user.id))
    .limit(limit)
    .offset(offset);

  return c.json({
    buildings,
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

// GET /:id - get one building, scoped to current user
buildingRoutes.get("/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const found = await findOwnedBuilding(db, id, user.id);
  if (!found) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ building: found });
});

// PUT /:id - update a building
buildingRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = updateBuildingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const existing = await findOwnedBuilding(db, id, user.id);
  if (!existing) {
    return c.json({ error: "Not found" }, 404);
  }

  const [updated] = await db
    .update(building)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(building.id, id))
    .returning();

  return c.json({ building: updated });
});

// DELETE /:id - delete a building
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
