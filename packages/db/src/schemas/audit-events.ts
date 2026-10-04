import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { auditActionEnum, auditEntityEnum } from "./enums";

/**
 * Append-only audit log: "who changed what, when" for every building mutation (data-integrity.md,
 * docs/production/02-arxitektura-va-texnologiyalar.md D-3/D-6). One row per mutation, inserted as
 * the *first* statement of the same `db.batch()` that makes the actual change (A02 §3) — if the
 * batch rolls back, the event never happened either.
 *
 * `entityRevision` doubles as the optimistic-concurrency counter for `entity` within
 * `buildingId`: `auditEventStatement()` computes it as `max(entityRevision) + 1` via a SQL
 * subquery, and an `expectedRevision` mismatch makes that subquery evaluate to `NULL`, which the
 * NOT NULL column then rejects — turning a stale write into a whole-batch rollback without a
 * separate SELECT or UPDATE statement (A02/A10 budget note).
 *
 * **No foreign keys, on purpose**: `buildingId` and `actorUserId` are plain `text`, not
 * `references()`. The journal must survive — and must never block — the building or the user
 * being deleted; a FK here would either cascade-delete history we want to keep, or (restrict)
 * prevent the delete entirely. Referential cleanup of this table is intentionally not automatic.
 *
 * **No DELETE trigger.** Only `UPDATE` is blocked (see the `audit_event_append_only` trigger in
 * the migration SQL) — `resetTestDb()` (tests/helpers/test-db.ts) empties every table with a
 * plain `DELETE`, and production code has no delete path onto this table at all (A12 will audit
 * that this stays true).
 */
export const auditEvent = sqliteTable(
  "audit_event",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id").notNull(),
    actorUserId: text("actor_user_id").notNull(),
    entity: text("entity", { enum: auditEntityEnum.enumValues }).notNull(),
    entityId: text("entity_id"),
    action: text("action", { enum: auditActionEnum.enumValues }).notNull(),
    entityRevision: integer("entity_revision").notNull(),
    /** Small JSON object (counts, ids/codes, changed field names) — never PII/raw payload (security.md). */
    summary: text("summary", { mode: "json" }),
    /** `cf-ray` header, for correlating with Cloudflare request logs; null outside a real request (tests). */
    requestId: text("request_id"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    uniqueIndex("audit_event_building_entity_revision_unique").on(
      table.buildingId,
      table.entity,
      table.entityRevision,
    ),
    index("audit_event_building_created_at_idx").on(table.buildingId, table.createdAt),
  ],
);
