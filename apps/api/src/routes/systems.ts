import {
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  equipmentItem,
  generationSource,
  insertChunked,
  lightingZone,
  renewableProductionMonthly,
  renewableSystem,
  ventilationSystem,
} from "@yres/db";
import { and, eq } from "drizzle-orm";
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

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
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
    revisions,
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
    // A10: one query covers all 9 systems.* entities so the form can send each back as
    // `expectedRevision` on its own PUT.
    getRevisions(db, buildingId, [
      "systems.ventilation",
      "systems.dhw",
      "systems.distribution",
      "systems.generation",
      "systems.cooling_windows",
      "systems.cooling_systems",
      "systems.lighting",
      "systems.equipment",
      "systems.renewables",
    ]),
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
    revisions: {
      ventilation: revisions["systems.ventilation"],
      dhw: revisions["systems.dhw"],
      distribution: revisions["systems.distribution"],
      generation: revisions["systems.generation"],
      coolingWindows: revisions["systems.cooling_windows"],
      coolingSystems: revisions["systems.cooling_systems"],
      lighting: revisions["systems.lighting"],
      equipment: revisions["systems.equipment"],
      renewables: revisions["systems.renewables"],
    },
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, systems, expectedRevision } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.ventilation",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(ventilationSystem)
      .where(
        and(eq(ventilationSystem.buildingId, buildingId), eq(ventilationSystem.scenario, scenario)),
      ),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, ventilationSystem, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.ventilation");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.ventilation"]))["systems.ventilation"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, sources, expectedRevision } = parsed.data;
  const rows = sources.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.dhw",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(dhwSource)
      .where(and(eq(dhwSource.buildingId, buildingId), eq(dhwSource.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, dhwSource, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.dhw");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.dhw"]))["systems.dhw"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, systems, expectedRevision } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.distribution",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(distributionSystem)
      .where(
        and(
          eq(distributionSystem.buildingId, buildingId),
          eq(distributionSystem.scenario, scenario),
        ),
      ),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, distributionSystem, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.distribution");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.distribution"]))["systems.distribution"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, sources, expectedRevision } = parsed.data;
  const rows = sources.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.generation",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(generationSource)
      .where(
        and(eq(generationSource.buildingId, buildingId), eq(generationSource.scenario, scenario)),
      ),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, generationSource, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.generation");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.generation"]))["systems.generation"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, windows, expectedRevision } = parsed.data;
  const rows = windows.map((w) => ({ ...w, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.cooling_windows",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(coolingWindow)
      .where(and(eq(coolingWindow.buildingId, buildingId), eq(coolingWindow.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, coolingWindow, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.cooling_windows");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.cooling_windows"]))["systems.cooling_windows"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, systems, expectedRevision } = parsed.data;
  const rows = systems.map((s) => ({ ...s, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.cooling_systems",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(coolingSystem)
      .where(and(eq(coolingSystem.buildingId, buildingId), eq(coolingSystem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, coolingSystem, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.cooling_systems");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.cooling_systems"]))["systems.cooling_systems"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, zones, expectedRevision } = parsed.data;
  const rows = zones.map((z) => ({ ...z, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.lighting",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(lightingZone)
      .where(and(eq(lightingZone.buildingId, buildingId), eq(lightingZone.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, lightingZone, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.lighting");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.lighting"]))["systems.lighting"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { scenario, items, expectedRevision } = parsed.data;
  const rows = items.map((i) => ({ ...i, buildingId, scenario }));

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.equipment",
      action: "replace",
      expectedRevision,
      summary: { count: rows.length },
    }),
    db
      .delete(equipmentItem)
      .where(and(eq(equipmentItem.buildingId, buildingId), eq(equipmentItem.scenario, scenario))),
  ];
  if (rows.length > 0) {
    statements.push(...insertChunked(db, equipmentItem, rows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.equipment");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.equipment"]))["systems.equipment"];
  return c.json({ scenario, count: rows.length, revision });
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
  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const { systems, expectedRevision } = parsed.data;

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

  const statements: BatchItem<"sqlite">[] = [
    auditEventStatement(db, c, {
      buildingId,
      entity: "systems.renewables",
      action: "replace",
      expectedRevision,
      summary: { count: systemRows.length },
    }),
    db.delete(renewableSystem).where(eq(renewableSystem.buildingId, buildingId)),
  ];
  if (systemRows.length > 0) {
    statements.push(...insertChunked(db, renewableSystem, systemRows));
  }
  if (monthlyRows.length > 0) {
    statements.push(...insertChunked(db, renewableProductionMonthly, monthlyRows));
  }
  try {
    await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  } catch (err) {
    if (isRevisionConflict(err)) {
      return revisionConflictResponse(c, db, buildingId, "systems.renewables");
    }
    throw err;
  }

  const revision =
    expectedRevision !== undefined
      ? expectedRevision + 1
      : (await getRevisions(db, buildingId, ["systems.renewables"]))["systems.renewables"];
  return c.json({ count: systemRows.length, revision });
});
