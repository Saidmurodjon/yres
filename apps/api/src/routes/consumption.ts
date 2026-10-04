import { chunkRowsForInsert, type energyCarrierEnum, insertChunked, utilityBill } from "@yres/db";
import { and, eq, getTableColumns, inArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import {
  auditEventStatement,
  getRevisions,
  isRevisionConflict,
  revisionConflictResponse,
} from "../lib/audit-event";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import {
  bulkReplaceUtilityBillsSchema,
  createUtilityBillsSchema,
  replaceUtilityBillsSchema,
} from "../schemas/consumption";
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
  T extends {
    consumptionNative: number;
    expenseLocal?: number | null;
    tariffLocal?: number | null;
  },
>(bill: T, energyCarrier: EnergyCarrier) {
  const expenseLocal =
    bill.expenseLocal ??
    (bill.tariffLocal != null ? bill.consumptionNative * bill.tariffLocal : null);
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

  const [bills, revisions] = await Promise.all([
    db
      .select()
      .from(utilityBill)
      .where(eq(utilityBill.buildingId, buildingId))
      .limit(limit)
      .offset(offset),
    // A10: so the form can send it back as `expectedRevision` on PUT /consumption(/bulk).
    getRevisions(db, buildingId, ["consumption"]),
  ]);

  return c.json({
    bills,
    page: parsedQuery.data.page,
    pageSize: parsedQuery.data.pageSize,
    revision: revisions.consumption,
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

  // `audit_event` row first in the batch (A02 §3/A09a), then one INSERT ... RETURNING per
  // ≤100-parameter chunk, all in one atomic batch.
  const chunks = chunkRowsForInsert(rows, Object.keys(getTableColumns(utilityBill)).length);
  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "consumption",
      action: "create",
      summary: {
        years: [...new Set(rows.map((r) => r.year))],
        carriers: [...new Set(rows.map((r) => r.energyCarrier))],
        count: rows.length,
      },
    }),
    ...chunks.map((chunk) => db.insert(utilityBill).values(chunk).returning()),
  ];
  const [, ...chunkResults] = (await db.batch(
    statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]],
  )) as unknown as [unknown, ...(typeof utilityBill.$inferSelect)[][]];

  return c.json({ bills: chunkResults.flat() }, 201);
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

  const { energyCarrier, year, bills, expectedRevision } = parsed.data;
  const rows = bills.map((bill) => ({
    ...withDerivedFields(bill, energyCarrier),
    buildingId,
    energyCarrier,
    year,
  }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "consumption",
      action: "replace",
      expectedRevision,
      summary: { years: [year], carriers: [energyCarrier], count: rows.length },
    }),
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
    statements.push(...insertChunked(db, utilityBill, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "consumption");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["consumption"])).consumption;
  return c.json({ energyCarrier, year, count: rows.length, revision });
});

// PUT /:id/consumption/bulk - replace WHOLE YEARS (all carriers) in one atomic batch. The consumption tab
// saves every edited year at once, so a failure halfway must not leave an import half saved (the
// single-group PUT above stays for backward compatibility).
//
// Contract: for each year in the request, ALL existing bills of that year are deleted - including those of
// carriers the request does not list - and replaced by the listed rows. A carrier sent with `bills: []`
// therefore clears that carrier (emptied grid rows reach the server), and the client must send every
// carrier of an edited year. One delete per request (year IN (...), ≤ 5 values) instead of one per
// carrier-year keeps the batch inside the Workers Free query budget (see schemas/consumption.ts).
consumptionRoutes.put("/:id/consumption/bulk", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = bulkReplaceUtilityBillsSchema.safeParse(body);
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

  const { years, expectedRevision } = parsed.data;
  const rows = years.flatMap((entry) =>
    entry.carriers.flatMap((group) =>
      group.bills.map((bill) => ({
        ...withDerivedFields(bill, group.energyCarrier),
        buildingId,
        energyCarrier: group.energyCarrier,
        year: entry.year,
      })),
    ),
  );

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "consumption",
      action: "replace",
      expectedRevision,
      summary: {
        years: years.map((entry) => entry.year),
        carriers: [...new Set(years.flatMap((entry) => entry.carriers.map((g) => g.energyCarrier)))],
        count: rows.length,
      },
    }),
    db.delete(utilityBill).where(
      and(
        eq(utilityBill.buildingId, buildingId),
        inArray(
          utilityBill.year,
          years.map((entry) => entry.year),
        ),
      ),
    ),
  ];
  if (rows.length > 0) statements.push(...insertChunked(db, utilityBill, rows));
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "consumption");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["consumption"])).consumption;
  return c.json({
    groups: years.flatMap((entry) =>
      entry.carriers.map((group) => ({
        energyCarrier: group.energyCarrier,
        year: entry.year,
        count: group.bills.length,
      })),
    ),
    revision,
  });
});
