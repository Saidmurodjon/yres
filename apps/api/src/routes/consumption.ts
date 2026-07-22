import { type energyCarrierEnum, utilityBill } from "@yres/db";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { createUtilityBillsSchema, replaceUtilityBillsSchema } from "../schemas/consumption";
import { paginationQuerySchema, toLimitOffset } from "../schemas/pagination";
import { computeConsumptionKwh } from "../services/consumption.service";

type EnergyCarrier = (typeof energyCarrierEnum.enumValues)[number];

/**
 * Fills in the two derived fields every bill needs: consumptionKwh (always
 * computed — see consumption.service.ts) and expenseLocal (defaults to
 * consumptionNative * tariffLocal when the caller didn't supply one
 * directly, e.g. a real invoice with extra fees).
 */
function withDerivedFields<
  T extends { consumptionNative: number; expenseLocal?: number | null; tariffLocal?: number | null },
>(bill: T, energyCarrier: EnergyCarrier) {
  const expenseLocal =
    bill.expenseLocal ?? (bill.tariffLocal != null ? bill.consumptionNative * bill.tariffLocal : null);
  return {
    ...bill,
    consumptionKwh: computeConsumptionKwh(energyCarrier, bill.consumptionNative),
    expenseLocal,
  };
}

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

  const rows = parsed.data.bills.map((bill) => ({
    ...withDerivedFields(bill, bill.energyCarrier),
    buildingId,
  }));

  const inserted = await db.insert(utilityBill).values(rows).returning();

  return c.json({ bills: inserted }, 201);
});

// PUT /:id/consumption - bulk-replace one carrier's bills for one year (the
// consumption tab's grid: a row per month, saved together). Mirrors the
// envelope/systems PUT routes' delete-then-insert-in-a-batch pattern instead
// of an upsert, so re-saving with fewer months than before actually clears
// the removed ones rather than leaving stale rows behind.
consumptionRoutes.put("/:id/consumption", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceUtilityBillsSchema.safeParse(body);
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

  const { energyCarrier, year, bills } = parsed.data;
  const rows = bills.map((bill) => ({
    ...withDerivedFields(bill, energyCarrier),
    buildingId,
    energyCarrier,
    year,
  }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(utilityBill)
      .where(
        and(
          eq(utilityBill.buildingId, buildingId),
          eq(utilityBill.energyCarrier, energyCarrier),
          eq(utilityBill.year, year),
        ),
      ),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(utilityBill).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ energyCarrier, year, count: rows.length });
});
