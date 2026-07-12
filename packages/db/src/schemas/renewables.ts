import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { orientationEnum, renewableSystemTypeEnum } from "./enums";

export const renewableSystem = pgTable("renewable_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  systemType: renewableSystemTypeEnum("system_type").notNull(),
  capacityKw: numeric("capacity_kw", { mode: "number" }),
  collectorCount: integer("collector_count"),
  availableAreaM2: numeric("available_area_m2", { mode: "number" }).notNull(),
  unitCostUsd: numeric("unit_cost_usd", { mode: "number" }).notNull(),
});

export const renewableProductionMonthly = pgTable("renewable_production_monthly", {
  id: uuid("id").primaryKey().defaultRandom(),
  renewableSystemId: uuid("renewable_system_id")
    .notNull()
    .references(() => renewableSystem.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  productionKwh: numeric("production_kwh", { mode: "number" }).notNull(),
});

export const shadingElement = pgTable("shading_element", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  orientation: orientationEnum("orientation").notNull(),
  shadingFactor: numeric("shading_factor", { mode: "number" }).notNull(),
  unitCostUsd: numeric("unit_cost_usd", { mode: "number" }).notNull(),
});

export const renewableSystemRelations = relations(renewableSystem, ({ one, many }) => ({
  building: one(building, { fields: [renewableSystem.buildingId], references: [building.id] }),
  monthlyProduction: many(renewableProductionMonthly),
}));

export const renewableProductionMonthlyRelations = relations(
  renewableProductionMonthly,
  ({ one }) => ({
    renewableSystem: one(renewableSystem, {
      fields: [renewableProductionMonthly.renewableSystemId],
      references: [renewableSystem.id],
    }),
  }),
);

export const shadingElementRelations = relations(shadingElement, ({ one }) => ({
  building: one(building, { fields: [shadingElement.buildingId], references: [building.id] }),
}));
