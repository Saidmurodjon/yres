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
  /** Mechanical-only: hours the AHU actually runs during the cooling season
   * (`Heat gains Mec Vent` sheet's `Equipment!H*J` operation-hours ×
   * utilization-factor product, collapsed into one input) — drives the
   * fresh-air enthalpy cooling load, see `ventilation.service.ts`'s
   * `calculateMechanicalVentilationCoolingGainKwh`. */
  coolingSeasonHours: numeric("cooling_season_hours", { mode: "number" }),
});

export const ventilationSystemRelations = relations(ventilationSystem, ({ one }) => ({
  building: one(building, {
    fields: [ventilationSystem.buildingId],
    references: [building.id],
  }),
}));
