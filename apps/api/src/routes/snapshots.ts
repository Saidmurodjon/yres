import { auditSnapshot, auditSnapshotReport, reportLangEnum } from "@yres/db";
import type { AuditResult } from "@yres/types";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { auditEventStatement } from "../lib/audit-event";
import { canApprove, canWrite, findAccessibleBuilding } from "../lib/building-access";
import { type AppEnv, authMiddleware } from "../middleware/auth";
import { ENGINE_VERSION, METHODOLOGY_VERSION } from "../services/engine-version";
import { generateAuditReportPdf } from "../services/report.service";
import {
  buildSnapshotPayload,
  isIllegalTransitionError,
  isUniqueConstraintError,
  readSnapshotBytes,
  readSnapshotJson,
  serialize,
  sha256Hex,
  type SnapshotContext,
  snapshotR2Keys,
} from "../services/snapshot.service";

export const snapshotRoutes = new Hono<AppEnv>();

snapshotRoutes.use("*", authMiddleware);

const snapshotIdParamSchema = z.string().uuid();
const reportLangParamSchema = z.enum(reportLangEnum.enumValues);
const issueReportBodySchema = z.object({ lang: z.enum(reportLangEnum.enumValues) });

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

/**
 * POST /:id/audit/snapshots/:sid/submit - moves a `draft` snapshot to `submitted` (A05b). Legal
 * transitions are enforced by the `audit_snapshot_status_flow` trigger (A04), not re-checked
 * here: an already-`submitted`/`approved`/`superseded` row makes the trigger abort the whole
 * batch, which this route turns into `409 { error, code: "illegal_transition" }` — the trigger's
 * own message never reaches the client (security.md, no internal error text to the caller).
 *
 * D1 budget (database.md, ≤ 40/request): session lookup (≤ 2) + findAccessibleBuilding (1) +
 * snapshot existence check (1) + this db.batch's 2 statements (audit_event insert, status update)
 * = 6 D1 subrequests.
 */
snapshotRoutes.post("/:id/audit/snapshots/:sid/submit", async (c) => {
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
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const [snapshot] = await db
    .select({ id: auditSnapshot.id })
    .from(auditSnapshot)
    .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId)))
    .limit(1);
  if (!snapshot) {
    return c.json({ error: "Not found" }, 404);
  }

  try {
    await db.batch([
      auditEventStatement(db, c, {
        buildingId,
        entity: "snapshot",
        entityId: snapshotId,
        action: "submit",
      }),
      db
        .update(auditSnapshot)
        .set({ status: "submitted", submittedByUserId: user.id, submittedAt: new Date() })
        .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId))),
    ]);
  } catch (err) {
    if (isIllegalTransitionError(err)) {
      return c.json({ error: "Illegal snapshot status transition", code: "illegal_transition" }, 409);
    }
    console.error("[snapshot] submit failed", snapshotId, err instanceof Error ? err.message : err);
    return c.json({ error: "Internal error" }, 500);
  }

  return c.json({ ok: true });
});

/**
 * POST /:id/audit/snapshots/:sid/approve - moves a `submitted` snapshot to `approved`, demoting
 * whatever snapshot was previously `approved` for this building to `superseded` first (A05b,
 * ADR-004). Who may approve: `canApprove()` (`lib/building-access.ts`) — K24 (2026-10-04): the
 * building owner, self-approval allowed and journaled like any other approval, "four-eyes" is
 * Faza 5.
 *
 * Order inside the batch matters: the old-approved->superseded update runs **before** the
 * sid->approved update, so the partial unique index (`audit_snapshot_building_approved_unique`,
 * at most one `approved` row per building) never sees two approved rows at once within the same
 * statement sequence. If `sid`'s own current status isn't `submitted` (already approved, still
 * draft, or superseded — including the case where a second, concurrent approve request runs
 * after a first one already committed), `audit_snapshot_status_flow` aborts that statement and
 * the whole batch rolls back — this is also what closes the concurrent-approval race (A04 doc
 * comment): only one of two parallel approvals on the same snapshot can win.
 *
 * D1 budget (database.md, ≤ 40/request): session lookup (≤ 2) + findAccessibleBuilding (1) +
 * snapshot existence check (1) + this db.batch's 3 statements (audit_event insert, demote old
 * approved, promote sid) = 7 D1 subrequests.
 */
snapshotRoutes.post("/:id/audit/snapshots/:sid/approve", async (c) => {
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
  if (!canApprove(access.role)) {
    return c.json({ error: "Only the building owner can approve a snapshot." }, 403);
  }

  const [snapshot] = await db
    .select({ id: auditSnapshot.id })
    .from(auditSnapshot)
    .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId)))
    .limit(1);
  if (!snapshot) {
    return c.json({ error: "Not found" }, 404);
  }

  try {
    await db.batch([
      auditEventStatement(db, c, {
        buildingId,
        entity: "snapshot",
        entityId: snapshotId,
        action: "approve",
      }),
      db
        .update(auditSnapshot)
        .set({ status: "superseded", supersededAt: new Date(), supersededById: snapshotId })
        .where(and(eq(auditSnapshot.buildingId, buildingId), eq(auditSnapshot.status, "approved"))),
      db
        .update(auditSnapshot)
        .set({ status: "approved", approvedByUserId: user.id, approvedAt: new Date() })
        .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId))),
    ]);
  } catch (err) {
    if (isIllegalTransitionError(err)) {
      return c.json({ error: "Illegal snapshot status transition", code: "illegal_transition" }, 409);
    }
    console.error(
      "[snapshot] approve failed",
      snapshotId,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Internal error" }, 500);
  }

  return c.json({ ok: true });
});

/**
 * POST /:id/audit/snapshots/:sid/reports - renders and permanently stores one immutable PDF for a
 * `submitted`/`approved` snapshot × language (A06, ADR-004). Unlike the live `GET /audit/report`
 * (routes/audit.ts — always a watermarked DRAFT, recomputed fresh and never stored), this calls
 * `generateAuditReportPdf()` **once** from the snapshot's frozen `result.json`/`context.json`
 * (never recomputed from current inputs — calculation-engine.md "Qilmang") and stores the bytes
 * forever under a key that includes this call's own `reportId`, not just `(sid, lang)` — two
 * concurrent requests for the same `(sid, lang)` therefore never overwrite each other's R2 object;
 * only one of their `audit_snapshot_report` inserts can win the `(snapshotId, lang)` unique index,
 * and the loser's PDF object is simply orphaned-but-harmless (not cleaned up, A06 spec).
 *
 * A repeat call for an already-issued `(sid, lang)` is not a re-render: it 200s the existing row
 * (no new PDF, no new R2 object) — "mavjud PDF'ni yangilash yo'q" is a deliberate non-feature
 * (A06 spec "Qilmang": issue a new snapshot instead).
 *
 * D1 budget (database.md, ≤ 40/request): session lookup (≤ 2) + findAccessibleBuilding (1) +
 * snapshot status lookup (1) + existing-report lookup (1) + this db.batch's 2 statements
 * (audit_event insert, audit_snapshot_report insert) = 7 D1 subrequests; + 2 R2 `get`s (result,
 * context) + 1 R2 `put` (the rendered PDF) + 1 Yandex Static Maps fetch (only if configured).
 */
snapshotRoutes.post("/:id/audit/snapshots/:sid/reports", async (c) => {
  const buildingId = c.req.param("id");
  const parsedSid = snapshotIdParamSchema.safeParse(c.req.param("sid"));
  if (!parsedSid.success) {
    return c.json({ error: "Invalid snapshot id" }, 400);
  }
  const snapshotId = parsedSid.data;

  const body = await c.req.json().catch(() => null);
  const parsedBody = issueReportBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return c.json({ error: "Invalid body", details: parsedBody.error.flatten() }, 400);
  }
  const { lang } = parsedBody.data;

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }
  if (!canWrite(access.role)) {
    return c.json({ error: "You only have view access to this building." }, 403);
  }

  const [snapshot] = await db
    .select()
    .from(auditSnapshot)
    .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId)))
    .limit(1);
  if (!snapshot) {
    return c.json({ error: "Not found" }, 404);
  }
  if (snapshot.status !== "submitted" && snapshot.status !== "approved") {
    return c.json(
      {
        error: "A report can only be issued for a submitted or approved snapshot.",
        code: "illegal_transition",
      },
      409,
    );
  }

  const [existing] = await db
    .select()
    .from(auditSnapshotReport)
    .where(
      and(eq(auditSnapshotReport.snapshotId, snapshotId), eq(auditSnapshotReport.lang, lang)),
    )
    .limit(1);
  if (existing) {
    return c.json({ report: existing }, 200);
  }

  let result: AuditResult;
  let context: SnapshotContext;
  try {
    [result, context] = await Promise.all([
      readSnapshotJson<AuditResult>(
        c.env.REPORTS_BUCKET,
        snapshot.resultR2Key,
        snapshot.resultSha256,
      ),
      readSnapshotJson<SnapshotContext>(
        c.env.REPORTS_BUCKET,
        snapshot.contextR2Key,
        snapshot.contextSha256,
      ),
    ]);
  } catch (err) {
    console.error(
      "[snapshot] report integrity mismatch",
      snapshotId,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Internal error" }, 500);
  }

  // Public, unauthenticated verify route (A07) — distinct from the live report's
  // `/verify/{auditRunId}` since this points at an immutable snapshot, not a live audit_run.
  const verifyUrl = `${c.env.WEB_URL}/verify/s/${snapshotId}`;
  const pdfBytes = await generateAuditReportPdf(
    context.building,
    result,
    context.extras,
    lang,
    c.env.YANDEX_STATIC_MAPS_API_KEY,
    verifyUrl,
    {
      snapshot: {
        id: snapshotId,
        engineVersion: snapshot.engineVersion,
        methodologyVersion: snapshot.methodologyVersion,
      },
    },
  );
  const sha256 = await sha256Hex(pdfBytes);
  const reportId = crypto.randomUUID();
  // `reportId` rides along in the key (not just `{lang}.pdf`, A06 spec's deliberate deviation
  // from the `audit_snapshot_report` doc comment) so two parallel requests racing for the same
  // `(sid, lang)` never overwrite each other's bytes before the unique index picks a winner.
  const r2Key = `reports/${buildingId}/${snapshotId}/${lang}-${reportId}.pdf`;
  await c.env.REPORTS_BUCKET.put(r2Key, pdfBytes, {
    httpMetadata: { contentType: "application/pdf" },
  });

  try {
    const [, insertedRows] = await db.batch([
      auditEventStatement(db, c, {
        buildingId,
        entity: "snapshot",
        entityId: snapshotId,
        action: "issue_report",
        summary: { lang, sha256 },
      }),
      db
        .insert(auditSnapshotReport)
        .values({
          id: reportId,
          snapshotId,
          lang,
          r2Key,
          sha256,
          sizeBytes: pdfBytes.length,
          createdByUserId: user.id,
        })
        .returning(),
    ]);
    const [report] = insertedRows;
    return c.json({ report }, 201);
  } catch (err) {
    if (isUniqueConstraintError(err)) {
      // Lost the (sid, lang) race — the PDF object this request just wrote above is now a
      // harmless orphan; the row that won the insert is the one we hand back (A06 spec).
      const [winner] = await db
        .select()
        .from(auditSnapshotReport)
        .where(
          and(eq(auditSnapshotReport.snapshotId, snapshotId), eq(auditSnapshotReport.lang, lang)),
        )
        .limit(1);
      if (winner) {
        return c.json({ report: winner }, 200);
      }
    }
    console.error(
      "[snapshot] issue report failed",
      snapshotId,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Internal error" }, 500);
  }
});

/**
 * GET /:id/audit/snapshots/:sid/reports/:lang - downloads one already-issued, immutable PDF
 * (A06). Any accessible role may read (viewer included — this never mutates anything,
 * A-2/security.md). `:sid` is matched together with `:id`, and the report row is matched
 * together with `:sid` (not just its own `id`), so a report from a different building or a
 * different snapshot can never be reached through this URL (IDOR, security.md).
 *
 * D1 budget (database.md, ≤ 40/request): session lookup (≤ 2) + findAccessibleBuilding (1) +
 * snapshot existence check (1) + report row lookup (1) = 5 D1 subrequests; + 1 R2 `get`. Writes
 * nothing.
 */
snapshotRoutes.get("/:id/audit/snapshots/:sid/reports/:lang", async (c) => {
  const buildingId = c.req.param("id");
  const parsedSid = snapshotIdParamSchema.safeParse(c.req.param("sid"));
  const parsedLang = reportLangParamSchema.safeParse(c.req.param("lang"));
  if (!parsedSid.success || !parsedLang.success) {
    return c.json({ error: "Invalid snapshot id or language" }, 400);
  }
  const snapshotId = parsedSid.data;
  const lang = parsedLang.data;

  const db = c.get("db");
  const user = c.get("user");

  const access = await findAccessibleBuilding(db, buildingId, user.id);
  if (!access) {
    return c.json({ error: "Not found" }, 404);
  }

  const [snapshot] = await db
    .select({ id: auditSnapshot.id })
    .from(auditSnapshot)
    .where(and(eq(auditSnapshot.id, snapshotId), eq(auditSnapshot.buildingId, buildingId)))
    .limit(1);
  if (!snapshot) {
    return c.json({ error: "Not found" }, 404);
  }

  const [report] = await db
    .select()
    .from(auditSnapshotReport)
    .where(
      and(eq(auditSnapshotReport.snapshotId, snapshotId), eq(auditSnapshotReport.lang, lang)),
    )
    .limit(1);
  if (!report) {
    return c.json({ error: "Not found" }, 404);
  }

  let bytes: Uint8Array;
  try {
    bytes = await readSnapshotBytes(c.env.REPORTS_BUCKET, report.r2Key, report.sha256);
  } catch (err) {
    console.error(
      "[snapshot] report integrity mismatch",
      report.id,
      err instanceof Error ? err.message : err,
    );
    return c.json({ error: "Internal error" }, 500);
  }

  const slug = access.building.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const fileName = `${slug}-${snapshotId.slice(0, 8)}-${lang}.pdf`;
  return new Response(bytes, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
});
