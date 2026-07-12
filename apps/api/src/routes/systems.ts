import {
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  equipmentItem,
  generationSource,
  lightingZone,
  renewableProductionMonthly,
  renewableSystem,
  ventilationSystem,
} from "@yres/db";
import { and, eq } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { Hono } from "hono";
import { findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import {
  replaceCoolingSystemsSchema,
  replaceCoolingWindowsSchema,
  replaceDhwSchema,
  replaceDistributionSchema,
  replaceEquipmentSchema,
  replaceGenerationSchema,
  replaceLightingSchema,
  replaceRenewablesSchema,
  replaceVentilationSchema,
} from "../schemas/systems";

export const systemsRoutes = new Hono<AppEnv>();

systemsRoutes.use("*", authMiddleware);

// GET /:id/systems - everything AuditEngine reads beyond envelope: ventilation,
// DHW, distribution, generation, and cooling, for both scenarios. Building
// this out (plus the PUT routes below) closes the gap where a building could
// never actually get purchased-energy numbers above zero, since there was no
// way to enter a generation source through the app.
systemsRoutes.get("/:id/systems", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [
    ventilationSystems,
    dhwSources,
    distributionSystems,
    generationSources,
    coolingWindows,
    coolingSystems,
    lightingZones,
    equipmentItems,
    renewableSystems,
  ] = await Promise.all([
    db.select().from(ventilationSystem).where(eq(ventilationSystem.buildingId, buildingId)),
    db.select().from(dhwSource).where(eq(dhwSource.buildingId, buildingId)),
    db.select().from(distributionSystem).where(eq(distributionSystem.buildingId, buildingId)),
    db.select().from(generationSource).where(eq(generationSource.buildingId, buildingId)),
    db.select().from(coolingWindow).where(eq(coolingWindow.buildingId, buildingId)),
    db.select().from(coolingSystem).where(eq(coolingSystem.buildingId, buildingId)),
    db.select().from(lightingZone).where(eq(lightingZone.buildingId, buildingId)),
    db.select().from(equipmentItem).where(eq(equipmentItem.buildingId, buildingId)),
    db.query.renewableSystem.findMany({
      where: eq(renewableSystem.buildingId, buildingId),
      with: { monthlyProduction: true },
    }),
  ]);

  return c.json({
    ventilationSystems,
    dhwSources,
    distributionSystems,
    generationSources,
    coolingWindows,
    coolingSystems,
    lightingZones,
    equipmentItems,
    renewableSystems,
  });
});

// PUT /:id/systems/ventilation - bulk-replace a scenario's ventilation
// systems (at most one "natural" and one "mechanical" row are meaningful to
// AuditEngine, but this doesn't enforce that — extra rows of the same type
// are simply ignored by `.find()` there).
systemsRoutes.put("/:id/systems/ventilation", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceVentilationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, systems } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(ventilationSystem)
      .where(and(eq(ventilationSystem.buildingId, buildingId), eq(ventilationSystem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(ventilationSystem).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/dhw - bulk-replace a scenario's DHW sources
systemsRoutes.put("/:id/systems/dhw", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceDhwSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, sources } = parsed.data;
  const rows = sources.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db.delete(dhwSource).where(and(eq(dhwSource.buildingId, buildingId), eq(dhwSource.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(dhwSource).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/distribution - bulk-replace a scenario's distribution
// (pipe) systems, covering both "heating" and "dhw" systemType rows at once
systemsRoutes.put("/:id/systems/distribution", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceDistributionSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, systems } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(distributionSystem)
      .where(and(eq(distributionSystem.buildingId, buildingId), eq(distributionSystem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(distributionSystem).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/generation - bulk-replace a scenario's generation sources.
// This is the route that was entirely missing before: without it there was
// no way for a real user to ever get a nonzero "purchased energy" KPI.
systemsRoutes.put("/:id/systems/generation", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceGenerationSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, sources } = parsed.data;
  const rows = sources.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(generationSource)
      .where(and(eq(generationSource.buildingId, buildingId), eq(generationSource.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(generationSource).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/cooling-windows - bulk-replace a scenario's cooling-load windows
systemsRoutes.put("/:id/systems/cooling-windows", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceCoolingWindowsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, windows } = parsed.data;
  const rows = windows.map((w) => ({ ...w, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(coolingWindow)
      .where(and(eq(coolingWindow.buildingId, buildingId), eq(coolingWindow.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(coolingWindow).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/cooling-systems - bulk-replace a scenario's cooling
// (AC/chiller) systems. AuditEngine only reads the first row per scenario.
systemsRoutes.put("/:id/systems/cooling-systems", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceCoolingSystemsSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, systems } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(coolingSystem)
      .where(and(eq(coolingSystem.buildingId, buildingId), eq(coolingSystem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(coolingSystem).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/lighting - bulk-replace a scenario's lighting zones
systemsRoutes.put("/:id/systems/lighting", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceLightingSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, zones } = parsed.data;
  const rows = zones.map((z) => ({ ...z, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(lightingZone)
      .where(and(eq(lightingZone.buildingId, buildingId), eq(lightingZone.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(lightingZone).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/equipment - bulk-replace a scenario's equipment inventory
systemsRoutes.put("/:id/systems/equipment", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceEquipmentSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { scenario, items } = parsed.data;
  const rows = items.map((i) => ({ ...i, buildingId, scenario }));

  const statements: BatchItem<"pg">[] = [
    db
      .delete(equipmentItem)
      .where(and(eq(equipmentItem.buildingId, buildingId), eq(equipmentItem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(db.insert(equipmentItem).values(rows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ scenario, count: rows.length });
});

// PUT /:id/systems/renewables - bulk-replace the building's entire set of
// renewable (PV / Solar DHW) systems, each with its 12 months of production.
// Not scenario-scoped (see schemas/systems.ts's doc comment on
// replaceRenewablesSchema). Deleting a renewable_system row cascades to its
// renewable_production_monthly rows (see packages/db/src/schemas/renewables.ts),
// so only the parent needs an explicit delete here. Child ids are generated
// client-side up front, same reasoning as envelope.ts's batch — statements
// in a batch can't read each other's results.
systemsRoutes.put("/:id/systems/renewables", async (c) => {
  const buildingId = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parsed = replaceRenewablesSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid body", details: parsed.error.flatten() }, 400);
  }

  const db = c.get("db");
  const user = c.get("user");
  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const { systems } = parsed.data;

  const systemRows: (typeof renewableSystem.$inferInsert)[] = [];
  const monthlyRows: (typeof renewableProductionMonthly.$inferInsert)[] = [];
  for (const system of systems) {
    const systemId = crypto.randomUUID();
    systemRows.push({
      id: systemId,
      buildingId,
      systemType: system.systemType,
      capacityKw: system.capacityKw ?? null,
      collectorCount: system.collectorCount ?? null,
      availableAreaM2: system.availableAreaM2,
      unitCostUsd: system.unitCostUsd,
    });
    system.monthlyProductionKwh.forEach((productionKwh, i) => {
      monthlyRows.push({
        id: crypto.randomUUID(),
        renewableSystemId: systemId,
        month: i + 1,
        productionKwh,
      });
    });
  }

  const statements: BatchItem<"pg">[] = [
    db.delete(renewableSystem).where(eq(renewableSystem.buildingId, buildingId)),
  ];
  if (systemRows.length > 0) {
    statements.push(db.insert(renewableSystem).values(systemRows));
  }
  if (monthlyRows.length > 0) {
    statements.push(db.insert(renewableProductionMonthly).values(monthlyRows));
  }
  await db.batch(statements as [BatchItem<"pg">, ...BatchItem<"pg">[]]);

  return c.json({ count: systemRows.length });
});
