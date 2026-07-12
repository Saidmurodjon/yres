import { climateRegion, createDb } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import type { AppEnv } from "../middleware/auth";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const climateRoutes = new Hono<AppEnv>();

// GET /regions - list all climate regions
climateRoutes.get("/regions", async (c) => {
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = createDb(c.env.DATABASE_URL);
  const regions = await db.select().from(climateRegion).limit(limit).offset(offset);

  return c.json({
    regions,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
  });
});

// GET /regions/:id - one region with its 12 monthly normals joined
climateRoutes.get("/regions/:id", async (c) => {
  const id = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);

  const region = await db.query.climateRegion.findFirst({
    where: eq(climateRegion.id, id),
    with: { monthlyNormals: true },
  });

  if (!region) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({ region });
});
