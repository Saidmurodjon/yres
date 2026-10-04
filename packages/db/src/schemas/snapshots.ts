import { relations, sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { building } from "./buildings";
import { reportLangEnum, snapshotStatusEnum } from "./enums";

/**
 * An immutable, legally-defensible audit result (ADR-004, data-integrity.md "Faza 2"). Unlike
 * `audit_run` (a live calculation's pending/running/completed/failed lifecycle, recomputed from
 * current inputs on every request — `calculation-engine.md`), a snapshot freezes one point in
 * time: the engine version that produced it, and the exact inputs/result/context that went in.
 *
 * **`inputs`/`result`/`context` JSON live in R2, not D1** (README §0.1): the golden fixture's
 * `result` alone serializes to ~214 KB, `inputs` to ~41 KB — both over D1's 100 KB per-statement
 * limit (`database.md`). Only the R2 key + SHA-256 (so a verifier can prove the blob hasn't
 * changed without re-downloading it) and the small `summary` (~1.3 KB `AuditSummary`, cheap
 * enough to list snapshots without a round-trip to R2) are stored here. R2 keys, fixed:
 * `snapshots/{buildingId}/{snapshotId}/inputs.json|result.json|context.json` in `REPORTS_BUCKET`
 * (no new bucket — a prefix is enough).
 *
 * **Immutability is enforced in SQLite, not just application code** — the `audit_snapshot_frozen`
 * trigger (migration SQL) blocks `UPDATE` of every column below except `status` and the
 * approval-workflow columns (`submitted*`/`approved*`/`superseded*`), and
 * `audit_snapshot_status_flow` blocks any status transition other than
 * draft→{submitted,superseded}, submitted→{approved,superseded}, approved→superseded. A05b's
 * concurrent-approval race is therefore closed atomically by the same trigger, not by
 * application-level locking.
 *
 * **`buildingId` has no `onDelete`** (defaults to SQLite's `NO ACTION`, i.e. restrict): a
 * snapshot must never be destroyed or orphaned by a building delete. This is exactly why A03
 * (building soft-delete) had to land before this table — a hard `DELETE FROM building` would
 * otherwise be the only way to remove a building, and that must fail once it has a snapshot.
 */
export const auditSnapshot = sqliteTable(
  "audit_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id),
    status: text("status", { enum: snapshotStatusEnum.enumValues }).notNull().default("draft"),
    engineVersion: text("engine_version").notNull(),
    methodologyVersion: text("methodology_version").notNull(),
    /** Git commit SHA the snapshot was built from, if known (CI/deploy metadata) — null locally. */
    buildSha: text("build_sha"),
    /** ISO timestamp, same format/value as the frozen `AuditResult.generatedAt`. */
    generatedAt: text("generated_at").notNull(),
    inputsR2Key: text("inputs_r2_key").notNull(),
    inputsSha256: text("inputs_sha256").notNull(),
    resultR2Key: text("result_r2_key").notNull(),
    resultSha256: text("result_sha256").notNull(),
    /** Global tariff/climate/financial-defaults context in effect at generation time (frozen alongside inputs/result). */
    contextR2Key: text("context_r2_key").notNull(),
    contextSha256: text("context_sha256").notNull(),
    /** Small `AuditSummary` JSON — the only result data duplicated outside R2, for cheap listing. */
    summary: text("summary", { mode: "json" }).notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    submittedByUserId: text("submitted_by_user_id").references(() => user.id),
    submittedAt: integer("submitted_at", { mode: "timestamp_ms" }),
    approvedByUserId: text("approved_by_user_id").references(() => user.id),
    approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
    supersededAt: integer("superseded_at", { mode: "timestamp_ms" }),
    /** Points at the replacement snapshot's `id` — plain text, no FK (self-reference, A04 spec). */
    supersededById: text("superseded_by_id"),
  },
  (table) => [
    index("audit_snapshot_building_created_at_idx").on(table.buildingId, table.createdAt),
    // Partial unique index: at most one *currently approved* snapshot per building — a new
    // approval must first move the old one to `superseded` (enforced together with the status
    // trigger above). Plain `uniqueIndex().on()` can't express the `WHERE`, so `.where()` is used
    // directly (database.md: drizzle-kit's `generate` picks this up as-is for SQLite).
    uniqueIndex("audit_snapshot_building_approved_unique")
      .on(table.buildingId)
      .where(sql`${table.status} = 'approved'`),
  ],
);

export const auditSnapshotRelations = relations(auditSnapshot, ({ one, many }) => ({
  building: one(building, { fields: [auditSnapshot.buildingId], references: [building.id] }),
  createdBy: one(user, { fields: [auditSnapshot.createdByUserId], references: [user.id] }),
  reports: many(auditSnapshotReport),
}));

/**
 * One rendered, immutable PDF per snapshot × language (ADR-004). Like `audit_snapshot` itself,
 * frozen by a DB trigger (`audit_snapshot_report_frozen`) after insert — a re-issue is a new row,
 * never an overwrite. R2 key, fixed: `reports/{buildingId}/{snapshotId}/{lang}.pdf` in
 * `REPORTS_BUCKET`. The old mutable `reports/{buildingId}/latest.pdf` (live/draft PDF,
 * `routes/audit.ts`) is untouched by this table and keeps being overwritten — A06 stops writing
 * it for snapshot-backed reports but that's this table's consumer, not this migration's concern.
 */
export const auditSnapshotReport = sqliteTable(
  "audit_snapshot_report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    snapshotId: text("snapshot_id")
      .notNull()
      .references(() => auditSnapshot.id),
    lang: text("lang", { enum: reportLangEnum.enumValues }).notNull(),
    r2Key: text("r2_key").notNull(),
    sha256: text("sha256").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [uniqueIndex("audit_snapshot_report_snapshot_lang_unique").on(table.snapshotId, table.lang)],
);

export const auditSnapshotReportRelations = relations(auditSnapshotReport, ({ one }) => ({
  snapshot: one(auditSnapshot, {
    fields: [auditSnapshotReport.snapshotId],
    references: [auditSnapshot.id],
  }),
  createdBy: one(user, { fields: [auditSnapshotReport.createdByUserId], references: [user.id] }),
}));
