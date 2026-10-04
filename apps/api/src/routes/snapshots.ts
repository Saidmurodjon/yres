import { auditSnapshot, auditSnapshotReport } from "@yres/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { auditEventStatement } from "../lib/audit-event";
import { canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { ENGINE_VERSION, METHODOLOGY_VERSION } from "../services/engine-version";
import {
  buildSnapshotPayload,
  readSnapshotJson,
  serialize,
  sha256Hex,
  snapshotR2Keys,
} from "../services/snapshot.service";

export const snapshotRoutes = new Hono<AppEnv>();

snapshotRoutes.use("*", authMiddleware);

const snapshotIdParamSchema = z.string().uuid();

/**
 * POST /:id/audit/snapshots - freeze the building's current inputs/result/context into an
 * immutable `audit_snapshot` row (A05a, ADR-004). `computeAudit`/`AuditResult` themselves are
 * never touched here — this only calls them once and persists what came out
 * (calculation-engine.md "Qilmang").
 *
 * Order matters (A05-snapshot-api.md spec): the three R2 `put`s happen **before** the D1 batch.
 * If the batch then fails, the R2 objects are orphaned but harmless (nothing in D1 references
 * them yet) — accepted tradeoff, not "fixed" with a cleanup step.
 *
 * D1 budget (database.md, ≤ 40/request): session lookup (≤ 2) + findAccessibleBuilding (1) +
 * buildSnapshotPayload's loadAuditInputs (21) + context queries (5: getUValueBreakdown 2,
 * getConsumptionHistory 1, getLatestEnergyTariffs 1, getReportAnnotations 1) + this db.batch's 3
 * statements (audit_event insert, supersede old draft/submitted, snapshot insert) = 32 D1
 * subrequests; + 3 R2 `put`s = 35 total (< 50, Workers Free).
 */
snapshotRoutes.post("/:id/audit/snapshots", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const generatedAt = new Date().toISOString();
  const snapshotId = crypto.randomUUID();
  const { inputs, result, context } = await buildSnapshotPayload(db, access.building, generatedAt);

  const inputsBytes = serialize(inputs);
  const resultBytes = serialize(result);
  const contextBytes = serialize(context);
  const [inputsSha256, resultSha256, contextSha256] = await Promise.all([
    sha256Hex(inputsBytes),
    sha256Hex(resultBytes),
    sha256Hex(contextBytes),
  ]);

  const keys = snapshotR2Keys(buildingId, snapshotId);
  await Promise.all([
    c.env.REPORTS_BUCKET.put(keys.inputs, inputsBytes, {
      httpMetadata: { contentType: "application/json" },
    }),
    c.env.REPORTS_BUCKET.put(keys.result, resultBytes, {
      httpMetadata: { contentType: "application/json" },
    }),
    c.env.REPORTS_BUCKET.put(keys.context, contextBytes, {
      httpMetadata: { contentType: "application/json" },
    }),
  ]);

  const [, , insertedRows] = await db.batch([
    auditEventStatement(db, c, {
      buildingId,
      entity: "snapshot",
      entityId: snapshotId,
      action: "create",
    }),
    // A new snapshot supersedes whatever draft/submitted snapshot was open for this building —
    // `approved` is left untouched (A05a acceptance criteria; A05b handles approval itself).
    db
      .update(auditSnapshot)
      .set({ status: "superseded", supersededAt: new Date(), supersededById: snapshotId })
      .where(
        and(
          eq(auditSnapshot.buildingId, buildingId),
          inArray(auditSnapshot.status, ["draft", "submitted"]),
        ),
      ),
    db
      .insert(auditSnapshot)
      .values({
        id: snapshotId,
        buildingId,
        status: "draft",
        engineVersion: ENGINE_VERSION,
        methodologyVersion: METHODOLOGY_VERSION,
        generatedAt,
        inputsR2Key: keys.inputs,
        inputsSha256,
        resultR2Key: keys.result,
        resultSha256,
        contextR2Key: keys.context,
        contextSha256,
        summary: result.summary,
        createdByUserId: user.id,
      })
      .returning(),
  ]);
  const [snapshot] = insertedRows;

  return c.json({ snapshot }, 201);
});

/**
 * GET /:id/audit/snapshots - list snapshots for this building, newest first (viewer may read —
 * this never mutates anything, A-2/security.md). Never touches R2: everything returned here
 * (`summary`, status, hashes) lives in D1 already, exactly so listing is cheap.
 *
 * Two D1 queries total: the snapshot page itself, then `audit_snapshot_report` rows for those
 * same snapshot ids via a subquery (`inArray` with a subquery, not a JS array built from the
 * first query's results — database.md's `inArray` note).
 */
snapshotRoutes.get("/:id/audit/snapshots", async (c) => {
  const buildingId = c.req.param("id");
  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const snapshotsQuery = db
    .select()
    .from(auditSnapshot)
    .where(eq(auditSnapshot.buildingId, buildingId))
    .orderBy(desc(auditSnapshot.createdAt))
    .limit(50);

  const [snapshots, reports] = await Promise.all([
    snapshotsQuery,
    db
      .select()
      .from(auditSnapshotReport)
      .where(
        inArray(
          auditSnapshotReport.snapshotId,
          db
            .select({ id: auditSnapshot.id })
            .from(auditSnapshot)
            .where(eq(auditSnapshot.buildingId, buildingId))
            .orderBy(desc(auditSnapshot.createdAt))
            .limit(50),
        ),
      ),
  ]);

  const reportsBySnapshotId = new Map<string, (typeof reports)[number][]>();
  for (const report of reports) {
    const existing = reportsBySnapshotId.get(report.snapshotId);
    if (existing) {
      existing.push(report);
    } else {
      reportsBySnapshotId.set(report.snapshotId, [report]);
    }
  }

  return c.json({
    snapshots: snapshots.map((snapshot) => ({
      ...snapshot,
      reports: reportsBySnapshotId.get(snapshot.id) ?? [],
    })),
  });
});

/**
 * GET /:id/audit/snapshots/:sid - one snapshot's frozen `result.json`, re-verified against its
 * stored SHA-256 (never recomputed from current inputs — that's the entire point of a snapshot,
 * calculation-engine.md "Qilmang"). `:sid` is matched together with `:id` (`and(eq(id, sid),
 * eq(buildingId, id))`) so a snapshot id from a different building 404s instead of leaking
 * cross-building data (security.md IDOR rule).
 */
snapshotRoutes.get("/:id/audit/snapshots/:sid", async (c) => {
  const buildingId = c.req.param("id");
  const parsedSid = snapshotIdParamSchema.safeParse(c.req.param("sid"));
  if (!parsedSid.success) {
    return c.json({ error: "Invalid snapshot id" }, 400);
  }
  const snapshotId = parsedSid.data;

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const [snapshot] = await db
    .select()
    .from(auditSnapshot)
    .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId)))
    .limit(1);
  if (!snapshot) {
    return c.json({ error: "Not found" }, 404);
  }

  let result: unknown;
  try {
    result = await readSnapshotJson(
      c.env.REPORTS_BUCKET,
      snapshot.resultR2Key,
      snapshot.resultSha256,
    );
  } catch (err) {
    console.error(
      "[snapshot] integrity mismatch",
      snapshotId,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Internal error" }, 500);
  }

  return c.json({ snapshot, result });
});
