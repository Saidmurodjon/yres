import { relations } from "drizzle-orm";
import { integer, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { building } from "./buildings";

/**
 * Auditor freeform notes attached to a specific report chart/section, one
 * per (building, sectionKey) — see `docs/report-redesign-proposal.md` §5b.
 * Tied to the building, not `auditRun`: audit results are never persisted
 * ("recalculate on demand", see calculation-engine.md), so an annotation
 * anchored to a specific run would vanish the next time the audit re-runs.
 * `sectionKey` is a plain stable string, not an enum/FK — same convention as
 * `EnergyBalanceRow.category` (calculation-engine.md), since new report
 * sections may need new keys without a schema migration.
 */
export const reportAnnotation = sqliteTable(
  "report_annotation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    sectionKey: text("section_key").notNull(),
    note: text("note").notNull(),
    createdByUserId: text("created_by_user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    unique("report_annotation_building_id_section_key_unique").on(
      table.buildingId,
      table.sectionKey,
    ),
  ],
);

export const reportAnnotationRelations = relations(reportAnnotation, ({ one }) => ({
  building: one(building, { fields: [reportAnnotation.buildingId], references: [building.id] }),
  createdBy: one(user, { fields: [reportAnnotation.createdByUserId], references: [user.id] }),
}));
