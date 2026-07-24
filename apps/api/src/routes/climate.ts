import { climateRegion } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { withEdgeCache } from "../lib/http-cache";
import type { AppEnv } from "../middleware/auth";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const climateRoutes = new Hono<AppEnv>();

// GET /regions - list all climate regions. Seeded reference data (not
// user-editable), so it's cached at the edge like apps/api/src/routes/
// reference.ts's tables — the cache key includes the query string, so each
// distinct page/pageSize combination caches separately.
climateRoutes.get("/regions", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  return withEdgeCache(c, 3600, async () => {
    const db = c.get("db");
    const regions = await db.select().from(climateRegion).limit(limit).offset(offset);

    return {
      regions,
      page: parsedQuery.data.page,
      pageSize: parsedQuery.data.pageSize,
    };
  });
});

// GET /regions/:id - one region with its 12 monthly normals joined
climateRoutes.get("/regions/:id", async (c) => {
  const id = c.req.param("id");
  const db = c.get("db");

  const region = await db.query.climateRegion.findFirst({
    where: eq(climateRegion.id, id),
    with: { monthlyNormals: true },
  });

  if (!region) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ region });
});
