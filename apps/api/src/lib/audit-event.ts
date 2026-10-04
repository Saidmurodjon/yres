import { type auditActionEnum, type auditEntityEnum, auditEvent } from "@yres/db";
import type { Database } from "@yres/db";
import { and, eq, inArray, sql } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { Context } from "hono";
import type { AppEnv } from "../middleware/auth";

export type AuditEntity = (typeof auditEntityEnum.enumValues)[number];
export type AuditAction = (typeof auditActionEnum.enumValues)[number];

/**
 * `audit_event.summary` hard cap (A02 spec, security.md: no PII/raw payload ever, and never an
 * unbounded blob either — this is a per-mutation journal row, not a backup of the request body).
 */
const SUMMARY_MAX_BYTES = 8 * 1024;

export interface AuditEventInput {
  buildingId: string;
  entity: AuditEntity;
  entityId?: string | null;
  action: AuditAction;
  /** Small object: counts, ids/codes, changed field *names* — never email/name/token/raw payload. */
  summary?: Record<string, unknown>;
  /**
   * Optimistic-concurrency check (A10): the revision the caller last saw for `entity` on this
   * building. Omit for a plain append (no conflict check) — most callers before A10 lands.
   */
  expectedRevision?: number;
}

function clampSummary(summary: Record<string, unknown> | undefined): Record<string, unknown> | null {
  if (summary === undefined) return null;
  const json = JSON.stringify(summary);
  if (new TextEncoder().encode(json).length <= SUMMARY_MAX_BYTES) {
    return summary;
  }
  return { truncated: true };
}

/**
 * Builds the `audit_event` insert as a `BatchItem` — the caller puts it **first** in its
 * `db.batch([...])` alongside the actual mutation (A02 §3/§1). `entityRevision` is computed by a
 * SQL subquery (`max(entityRevision) + 1` for this `buildingId`+`entity`), so no separate SELECT
 * is spent on it. When `expectedRevision` is given and the current max doesn't match, that
 * subquery evaluates to `NULL`; the NOT NULL column then rejects the insert and the whole batch
 * rolls back (D1 batch = one SQL transaction, database.md) — `isRevisionConflict()` recognizes
 * that failure.
 */
export function auditEventStatement(
  db: Database,
  c: Context<AppEnv>,
  input: AuditEventInput,
): BatchItem<"sqlite"> {
  const currentMax = sql`(select coalesce(max(${auditEvent.entityRevision}), 0) from ${auditEvent} where ${auditEvent.buildingId} = ${input.buildingId} and ${auditEvent.entity} = ${input.entity})`;

  const entityRevision =
    input.expectedRevision === undefined
      ? sql`${currentMax} + 1`
      : sql`(select case when ${currentMax} = ${input.expectedRevision} then ${currentMax} + 1 else null end)`;

  return db.insert(auditEvent).values({
    buildingId: input.buildingId,
    actorUserId: c.get("user").id,
    entity: input.entity,
    entityId: input.entityId ?? null,
    action: input.action,
    entityRevision,
    summary: clampSummary(input.summary),
    requestId: c.req.header("cf-ray") ?? null,
  }) as BatchItem<"sqlite">;
}

/**
 * Recognizes the batch-rollback failure `auditEventStatement()`'s `expectedRevision` check
 * produces: a NOT NULL constraint violation naming `audit_event.entity_revision`, surfaced either
 * directly on `err` or on `err.cause` (D1's error wrapping — verified empirically against local
 * Miniflare D1, see A02 PROGRESS entry). Walks a few `.cause` levels so it isn't tied to exactly
 * which layer wraps the underlying D1 error.
 */
export function isRevisionConflict(err: unknown): boolean {
  let current: unknown = err;
  for (let depth = 0; depth < 5 && current != null; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (message.includes("audit_event.entity_revision")) {
      return true;
    }
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

/**
 * The latest `entityRevision` recorded for each of `entities` on `buildingId`, in one query —
 * an entity with no `audit_event` rows yet comes back as `0` (never missing from the result).
 */
export async function getRevisions<const T extends readonly AuditEntity[]>(
  db: Database,
  buildingId: string,
  entities: T,
): Promise<Record<T[number], number>> {
  const rows = await db
    .select({
      entity: auditEvent.entity,
      maxRevision: sql<number>`max(${auditEvent.entityRevision})`,
    })
    .from(auditEvent)
    .where(and(eq(auditEvent.buildingId, buildingId), inArray(auditEvent.entity, entities)))
    .groupBy(auditEvent.entity);

  const maxByEntity = new Map(rows.map((row) => [row.entity, row.maxRevision]));
  return Object.fromEntries(
    entities.map((entity) => [entity, maxByEntity.get(entity) ?? 0]),
  ) as Record<T[number], number>;
}
