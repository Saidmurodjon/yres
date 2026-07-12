import { relations } from "drizzle-orm";
import { numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export const ventilationSystem = pgTable("ventilation_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  systemType: text("system_type").notNull(), // 'natural' | 'mechanical'
  airChangeRatePerHour: numeric("air_change_rate_per_hour", { mode: "number" }),
  freshAirPerPersonM3h: numeric("fresh_air_per_person_m3h", { mode: "number" }),
  heatRecoveryEfficiency: numeric("heat_recovery_efficiency", { mode: "number" }),
  fanElectricalPowerKw: numeric("fan_electrical_power_kw", { mode: "number" }),
});

export const ventilationSystemRelations = relations(ventilationSystem, ({ one }) => ({
  building: one(building, {
    fields: [ventilationSystem.buildingId],
    references: [building.id],
  }),
}));
