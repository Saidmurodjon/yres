import type { AuditSummary } from "./audit";

/** Mirrors `packages/db/src/schemas/enums.ts`'s `snapshotStatusEnum` (ADR-004). */
export type AuditSnapshotStatus = "draft" | "submitted" | "approved" | "superseded";

/** Mirrors `packages/db/src/schemas/enums.ts`'s `reportLangEnum`. */
export type AuditSnapshotReportLang = "en" | "ru" | "uz";

/**
 * Shape for the snapshot list endpoint (A05a) that the web "Rasmiy versiyalar" panel (A08)
 * renders directly — the full frozen `inputs`/`result` JSON stays in R2 and is only fetched by
 * the verify flow (A07), not listed here.
 */
export interface AuditSnapshotListItem {
  id: string;
  status: AuditSnapshotStatus;
  engineVersion: string;
  generatedAt: string;
  createdAt: string;
  summary: AuditSummary;
  reports: { lang: AuditSnapshotReportLang; sha256: string; createdAt: string }[];
}
