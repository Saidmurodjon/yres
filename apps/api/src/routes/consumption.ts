import { utilityBill } from "@yres/db";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { createUtilityBillsSchema } from "../schemas/consumption";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";

export const consumptionRoutes = new Hono<AppEnv>();

consumptionRoutes.use("*", authMiddleware);

// GET /:id/consumption - list a building's utility_bill rows, paginated
consumptionRoutes.get("/:id/consumption", async (c) => {
  const buildingId = c.req.param("id");
  const parsedQuery = paginationQuerySchema.safeParse(c.req.query());
  if (!parsedQuery.success) {
    return c.json({ error: "Invalid query", details: parsedQuery.error.flatten() }, 400);
  }
  const { limit, offset } = toLimitOffset(parsedQuery.data);

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const bills = await db
    .select()
    .from(utilityBill)
    .where(eq(utilityBill.buildingId, buildingId))
    .limit(limit)
    .offset(offset);

  return c.json({
    bills,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
  });
});

// POST /:id/consumption - bulk-insert utility bill rows for a building
consumptionRoutes.post("/:id/consumption", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = createUtilityBillsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const rows = parsed.data.bills.map((bill) => ({ ...bill, buildingId }));

  const inserted = await db.insert(utilityBill).values(rows).returning();

  return c.json({ bills: inserted }, 201);
});
