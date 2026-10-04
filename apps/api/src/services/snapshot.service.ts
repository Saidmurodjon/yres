import type { Database, building } from "@yres/db";
import type { AuditResult } from "@yres/types";
import { type AuditInputs, loadAuditInputs } from "./audit-inputs";
import { computeAudit } from "./audit.engine";
import {
  getConsumptionHistory,
  getLatestEnergyTariffs,
  getReportAnnotations,
  getUValueBreakdown,
} from "./report-data.service";
import type { ReportExtras } from "./report.service";

type Building = typeof building.$inferSelect;

/**
 * The exact building columns `report.service.ts` reads (A05a spec: `grep -o "building\.[a-zA-Z]*"
 * services/report.service.ts`) — frozen into the snapshot's `context.json` alongside `extras` so
 * a later PDF render (A06) from this snapshot never has to touch the live `building` row. Deliberately
 * excludes `userId`/`searchText`/timestamps: not read by the report, and `userId` especially
 * shouldn't ride along inside a supposedly-immutable artifact (ownership can change via sharing).
 */
function pickReportBuildingFields(b: Building) {
  return {
    name: b.name,
    location: b.location,
    buildingType: b.buildingType,
    yearBuilt: b.yearBuilt,
    latitude: b.latitude,
    longitude: b.longitude,
    netCooledFloorAreaM2: b.netCooledFloorAreaM2,
    heatingSeasonDurationDays: b.heatingSeasonDurationDays,
    indoorTempOperationC: b.indoorTempOperationC,
    indoorTempNonOperationC: b.indoorTempNonOperationC,
    outdoorAvgHeatingSeasonTempC: b.outdoorAvgHeatingSeasonTempC,
    outdoorDesignTempC: b.outdoorDesignTempC,
    occupantCount: b.occupantCount,
    coolingEnthalpyInsideKjKg: b.coolingEnthalpyInsideKjKg,
    coolingEnthalpyOutsideKjKg: b.coolingEnthalpyOutsideKjKg,
    coolingEnthalpyHottestDayKjKg: b.coolingEnthalpyHottestDayKjKg,
  };
}

export type ReportBuildingFields = ReturnType<typeof pickReportBuildingFields>;

export interface SnapshotContext {
  building: ReportBuildingFields;
  extras: ReportExtras;
}

export interface SnapshotPayload {
  inputs: AuditInputs;
  result: AuditResult;
  context: SnapshotContext;
}

/**
 * Assembles everything a snapshot freezes: the raw `AuditInputs`, the `AuditResult` computed from
 * them (same `computeAudit()` `runFullAudit()` uses — never re-implemented here, README §0/
 * calculation-engine.md "Qilmang"), and the extra context the PDF report also reads live
 * (`routes/audit.ts`'s `/audit/report` — `getUValueBreakdown`/`getConsumptionHistory`/
 * `getLatestEnergyTariffs`/`getReportAnnotations`). `getLatestEnergyTariffs` is global (not
 * building-scoped) — freezing it here is exactly why a tariff change after this call must not
 * change what this snapshot says (A05a acceptance criteria).
 *
 * D1 queries: `loadAuditInputs` (21) + `getUValueBreakdown` (2) + `getConsumptionHistory` (1) +
 * `getLatestEnergyTariffs` (1) + `getReportAnnotations` (1) = 26, all run in parallel.
 */
export async function buildSnapshotPayload(
  db: Database,
  building: Building,
  generatedAt: string,
): Promise<SnapshotPayload> {
  const [inputs, uValues, consumptionHistory, tariffs, annotations] = await Promise.all([
    loadAuditInputs(db, building.id),
    getUValueBreakdown(db, building.id),
    getConsumptionHistory(db, building.id),
    getLatestEnergyTariffs(db),
    getReportAnnotations(db, building.id),
  ]);

  const result = computeAudit(inputs, { generatedAt });

  return {
    inputs,
    result,
    context: {
      building: pickReportBuildingFields(building),
      extras: { uValues, consumptionHistory, tariffs, annotations },
    },
  };
}

/** Canonical byte encoding for anything frozen into a snapshot — hashed and stored exactly as-is. */
export function serialize(value: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(value));
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Fixed R2 key layout for a snapshot's three frozen JSON blobs (`audit_snapshot` doc comment, ADR-004). */
export function snapshotR2Keys(
  buildingId: string,
  snapshotId: string,
): { inputs: string; result: string; context: string } {
  const prefix = `snapshots/${buildingId}/${snapshotId}`;
  return {
    inputs: `${prefix}/inputs.json`,
    result: `${prefix}/result.json`,
    context: `${prefix}/context.json`,
  };
}

/**
 * Reads one of a snapshot's frozen JSON blobs back from R2 and re-verifies its SHA-256 against
 * the hash recorded in `audit_snapshot` — proves the bytes a caller gets are exactly the bytes
 * that were hashed at creation time, not a silently-corrupted or tampered R2 object. Throws a
 * plain `Error` on any mismatch (missing object or hash mismatch); routes catch this, log
 * `[snapshot] integrity mismatch <snapshotId>` (no payload/PII) and return a generic `500` —
 * never the raw error message to the client (security.md).
 */
export async function readSnapshotJson<T>(
  bucket: R2Bucket,
  key: string,
  expectedSha256: string,
): Promise<T> {
  const object = await bucket.get(key);
  if (!object) {
    throw new Error(`snapshot object missing: ${key}`);
  }
  const bytes = new Uint8Array(await object.arrayBuffer());
  const actualSha256 = await sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    throw new Error(`snapshot integrity mismatch: ${key}`);
  }
  return JSON.parse(new TextDecoder().decode(bytes)) as T;
}
