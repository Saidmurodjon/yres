import { auditRun, createDb } from "@yres/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { findOwnedBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.use("*", authMiddleware);

// POST /:id/audit/run - create an audit_run row and (once the calculation
// engine is wired up) run it synchronously.
//
// TODO(calc-engine): apps/api/src/services/audit.engine.ts does not exist
// yet (the energy-calculation engine is being built in parallel). Once it
// exports something like `runFullAudit(db, buildingId)`, this handler should:
//   1. insert the audit_run row with status "pending"
//   2. call runFullAudit(db, buildingId) inside a try/catch
//   3. on success: update the row to status "completed", set completedAt,
//      and persist the result (e.g. reportR2Key or a results table)
//   4. on failure: update the row to status "failed" with errorMessage
// For now we only create the row and leave it "pending" so the rest of the
// API surface (status/results polling) is already wired.
auditRoutes.post("/:id/audit/run", async (c) => {
  const buildingId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [run] = await db
    .insert(auditRun)
    .values({
      buildingId,
      triggeredByUserId: user.id,
      status: "pending",
      startedAt: new Date(),
    })
    .returning();

  return c.json(
    {
      auditRun: run,
      message: "Audit engine is not wired up yet; run created with status 'pending'.",
    },
    202,
  );
});

// GET /:id/audit/status - latest audit_run for the building
auditRoutes.get("/:id/audit/status", async (c) => {
  const buildingId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [latest] = await db
    .select()
    .from(auditRun)
    .where(eq(auditRun.buildingId, buildingId))
    .orderBy(desc(auditRun.createdAt))
    .limit(1);

  if (!latest) {
    return c.json({ error: "No audit runs for this building" }, 404);
  }

  return c.json({ auditRun: latest });
});

// GET /:id/audit/results - the latest completed audit_run
auditRoutes.get("/:id/audit/results", async (c) => {
  const buildingId = c.req.param("id");
  const db = createDb(c.env.DATABASE_URL);
  const user = c.get("user");

  const owned = await findOwnedBuilding(db, buildingId, user.id);
  if (!owned) {
    return c.json({ error: "Not found" }, 404);
  }

  const [latestCompleted] = await db
    .select()
    .from(auditRun)
    .where(and(eq(auditRun.buildingId, buildingId), eq(auditRun.status, "completed")))
    .orderBy(desc(auditRun.createdAt))
    .limit(1);

  if (!latestCompleted) {
    // TODO(calc-engine): once runFullAudit() exists and results are
    // persisted, replace this stub with the real result shape.
    return c.json(
      {
        error: "No completed audit run for this building yet",
        stub: true,
      },
      501,
    );
  }

  return c.json({ auditRun: latestCompleted });
});
