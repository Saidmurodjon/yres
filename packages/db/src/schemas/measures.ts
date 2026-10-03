import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { measureCategoryEnum } from "./enums";

export const energyMeasure = sqliteTable("energy_measure", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: text("category", { enum: measureCategoryEnum.enumValues }).notNull(),
  investmentCostUsd: real("investment_cost_usd").notNull(),
  lifetimeYears: integer("lifetime_years").notNull().default(20),
  maintenanceCostPercent: real("maintenance_cost_percent").notNull().default(0),
  proposedForImplementation: integer("proposed_for_implementation", { mode: "boolean" })
    .notNull()
    .default(false),
  sourceSheetRef: text("source_sheet_ref"),
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Which construction/opening types of the "before" state a measure replaces (F06). Keyed by the type's
 * `code` (e.g. "W1", "Win3"), not its id: `PUT /envelope` recreates the types with fresh UUIDs, the code
 * is stable. A code that no longer resolves becomes an `AuditResult.warnings` entry, never a silent 0.
 */
export const energyMeasureTarget = sqliteTable("energy_measure_target", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  measureId: text("measure_id")
    .notNull()
    .references(() => energyMeasure.id, { onDelete: "cascade" }),
  kind: text("kind", { enum: ["construction_type", "opening_type"] }).notNull(),
  code: text("code").notNull(),
});

export const nonEeMeasure = sqliteTable("non_ee_measure", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  unit: text("unit"),
  quantity: real("quantity").notNull().default(1),
  unitCostUsd: real("unit_cost_usd").notNull(),
  // v7.20 `Non-EE measures` has a "Q" (proposed) column too; `Measures_summary!D39` sums only the "Yes" rows.
  // Default true keeps the earlier "always counts" behaviour for existing rows.
  proposedForImplementation: integer("proposed_for_implementation", { mode: "boolean" })
    .notNull()
    .default(true),
});

export const energyMeasureRelations = relations(energyMeasure, ({ one, many }) => ({
  building: one(building, { fields: [energyMeasure.buildingId], references: [building.id] }),
  targets: many(energyMeasureTarget),
}));

export const energyMeasureTargetRelations = relations(energyMeasureTarget, ({ one }) => ({
  measure: one(energyMeasure, {
    fields: [energyMeasureTarget.measureId],
    references: [energyMeasure.id],
  }),
}));

export const nonEeMeasureRelations = relations(nonEeMeasure, ({ one }) => ({
  building: one(building, { fields: [nonEeMeasure.buildingId], references: [building.id] }),
}));
