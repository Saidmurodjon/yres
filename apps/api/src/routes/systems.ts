import {
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  generationSource,
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
  replaceGenerationSchema,
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
  ] = await Promise.all([
    db.select().from(ventilationSystem).where(eq(ventilationSystem.buildingId, buildingId)),
    db.select().from(dhwSource).where(eq(dhwSource.buildingId, buildingId)),
    db.select().from(distributionSystem).where(eq(distributionSystem.buildingId, buildingId)),
    db.select().from(generationSource).where(eq(generationSource.buildingId, buildingId)),
    db.select().from(coolingWindow).where(eq(coolingWindow.buildingId, buildingId)),
    db.select().from(coolingSystem).where(eq(coolingSystem.buildingId, buildingId)),
  ]);

  return c.json({
    ventilationSystems,
    dhwSources,
    distributionSystems,
    generationSources,
    coolingWindows,
    coolingSystems,
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
