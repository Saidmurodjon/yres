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
});

export const energyMeasureRelations = relations(energyMeasure, ({ one }) => ({
  building: one(building, { fields: [energyMeasure.buildingId], references: [building.id] }),
}));

export const nonEeMeasureRelations = relations(nonEeMeasure, ({ one }) => ({
  building: one(building, { fields: [nonEeMeasure.buildingId], references: [building.id] }),
}));
