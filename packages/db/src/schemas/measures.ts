import { relations } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { measureCategoryEnum } from "./enums";

export const energyMeasure = pgTable("energy_measure", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  category: measureCategoryEnum("category").notNull(),
  investmentCostUsd: numeric("investment_cost_usd", { mode: "number" }).notNull(),
  lifetimeYears: integer("lifetime_years").notNull().default(20),
  maintenanceCostPercent: numeric("maintenance_cost_percent", { mode: "number" })
    .notNull()
    .default(0),
  proposedForImplementation: boolean("proposed_for_implementation").notNull().default(false),
  sourceSheetRef: text("source_sheet_ref"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const nonEeMeasure = pgTable("non_ee_measure", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  unit: text("unit"),
  quantity: numeric("quantity", { mode: "number" }).notNull().default(1),
  unitCostUsd: numeric("unit_cost_usd", { mode: "number" }).notNull(),
});

export const energyMeasureRelations = relations(energyMeasure, ({ one }) => ({
  building: one(building, { fields: [energyMeasure.buildingId], references: [building.id] }),
}));

export const nonEeMeasureRelations = relations(nonEeMeasure, ({ one }) => ({
  building: one(building, { fields: [nonEeMeasure.buildingId], references: [building.id] }),
}));
