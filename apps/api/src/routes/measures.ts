import { energyMeasure } from "@yres/db";
import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { selectMeasuresSchema } from "../schemas/measures";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const measuresRoutes = new Hono<AppEnv>();

measuresRoutes.use("*", authMiddleware);

// GET /:id/measures - list a building's energy_measure rows, paginated
measuresRoutes.get("/:id/measures", async (c) => {
  const buildingId = c.req.param("id");
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const measures = await db
    .select()
    .from(energyMeasure)
    .where(eq(energyMeasure.buildingId, buildingId))
    .limit(limit)
    .offset(offset);

  return c.json({
    measures,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
  });
});

// POST /:id/measures/select - set proposedForImplementation = true for the
// given measure ids, and false for the building's other measures. Two UPDATE
// statements executed atomically via db.batch() (see envelope.ts for why not
// db.transaction()).
measuresRoutes.post("/:id/measures/select", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = selectMeasuresSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { measureIds } = parsed.data;

  if (measureIds.length === 0) {
    await db
      .update(energyMeasure)
      .set({ proposedForImplementation: false })
      .where(eq(energyMeasure.buildingId, buildingId));

    return c.json({ selected: [] });
  }

  const statements: BatchItem<"pg">[] = [
    db
      .update(energyMeasure)
      .set({ proposedForImplementation: true })
      .where(and(eq(energyMeasure.buildingId, buildingId), inArray(energyMeasure.id, measureIds))),
    db
      .update(energyMeasure)
      .set({ proposedForImplementation: false })
      .where(
        and(eq(energyMeasure.buildingId, buildingId), notInArray(energyMeasure.id, measureIds)),
      ),
  ];

  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ selected: measureIds });
});
