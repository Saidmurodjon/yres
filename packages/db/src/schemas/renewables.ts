import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { orientationEnum, renewableSystemTypeEnum } from "./enums";

export const renewableSystem = sqliteTable("renewable_system", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  systemType: text("system_type", { enum: renewableSystemTypeEnum.enumValues }).notNull(),
  capacityKw: real("capacity_kw"),
  collectorCount: integer("collector_count"),
  availableAreaM2: real("available_area_m2").notNull(),
  unitCostUsd: real("unit_cost_usd").notNull(),
});

export const renewableProductionMonthly = sqliteTable("renewable_production_monthly", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  renewableSystemId: text("renewable_system_id")
    .notNull()
    .references(() => renewableSystem.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  productionKwh: real("production_kwh").notNull(),
});

export const shadingElement = sqliteTable("shading_element", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  orientation: text("orientation", { enum: orientationEnum.enumValues }).notNull(),
  shadingFactor: real("shading_factor").notNull(),
  unitCostUsd: real("unit_cost_usd").notNull(),
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
