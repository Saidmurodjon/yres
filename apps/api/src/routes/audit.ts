import { auditRun } from "@yres/db";
import { and, desc, eq } from "drizzle-orm";
import { Hono } from "hono";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { runFullAudit } from "../services/audit.engine";
import {
  getConsumptionHistory,
  getLatestEnergyTariffs,
  getUValueBreakdown,
} from "../services/report-data.service";
import { generateAuditReportPdf } from "../services/report.service";

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.use("*", authMiddleware);

// POST /:id/audit/run - create an audit_run row and run the calculation
// engine synchronously. Nothing about the *result* is persisted (per the
// "recalculate on demand, don't store calculated values" rule) — only the
// run's lifecycle (status/timestamps) is, so the UI has something to poll
// and history to show. The result itself is returned inline here and
// recomputed fresh on each GET /results call.
auditRoutes.post("/:id/audit/run", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const [run] = await db
    .insert(auditRun)
    .values({
      buildingId,
      triggeredByUserId: user.id,
      status: "running",
      startedAt: new Date(),
    })
    .returning();

  if (!run) {
    return c.json({ error: "Failed to create audit run" }, 500);
  }

  try {
    const result = await runFullAudit(db, buildingId);
    await db
      .update(auditRun)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(auditRun.id, run.id));

    return c.json({ auditRun: { ...run, status: "completed" as const }, result }, 201);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    await db
      .update(auditRun)
      .set({ status: "failed", errorMessage })
      .where(eq(auditRun.id, run.id));

    return c.json(
      { auditRun: { ...run, status: "failed" as const, errorMessage }, error: errorMessage },
      500,
    );
  }
});

// GET /:id/audit/status - latest audit_run for the building
auditRoutes.get("/:id/audit/status", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
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
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const [latestCompleted] = await db
    .select()
    .from(auditRun)
    .where(and(eq(auditRun.buildingId, buildingId), eq(auditRun.status, "completed")))
    .orderBy(desc(auditRun.createdAt))
    .limit(1);

  if (!latestCompleted) {
    return c.json({ error: "No completed audit run for this building yet" }, 404);
  }

  // Results are never persisted (see POST /run) — recompute fresh from the
  // building's current inputs so this always reflects the latest data.
  const result = await runFullAudit(db, buildingId);

  return c.json({ auditRun: latestCompleted, result });
});

// GET /:id/audit/report - a downloadable PDF summarizing the latest audit
// result. Recomputed fresh on every request (same "recalculate on demand"
// rule as /results) rather than served from a stored copy — a cached copy
// is still written to R2 under a stable per-building key so there's a
// persistent artifact (e.g. for future emailing/sharing features), but the
// response itself never depends on that cache being warm or fresh.
auditRoutes.get("/:id/audit/report", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const [latestCompleted] = await db
    .select()
    .from(auditRun)
    .where(and(eq(auditRun.buildingId, buildingId), eq(auditRun.status, "completed")))
    .orderBy(desc(auditRun.createdAt))
    .limit(1);

  if (!latestCompleted) {
    return c.json({ error: "No completed audit run for this building yet" }, 404);
  }

  const [result, uValues, consumptionHistory, tariffs] = await Promise.all([
    runFullAudit(db, buildingId),
    getUValueBreakdown(db, buildingId),
    getConsumptionHistory(db, buildingId),
    getLatestEnergyTariffs(db),
  ]);
  const pdfBytes = await generateAuditReportPdf(access.building, result, {
    uValues,
    consumptionHistory,
    tariffs,
  });

  const r2Key = `reports/${buildingId}/latest.pdf`;
  await c.env.REPORTS_BUCKET.put(r2Key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" },
  });
  await db.update(auditRun).set({ reportR2Key: r2Key }).where(eq(auditRun.id, latestCompleted.id));

  const fileName = `${access.building.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-audit-report.pdf`;
  return new Response(pdfBytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
});
