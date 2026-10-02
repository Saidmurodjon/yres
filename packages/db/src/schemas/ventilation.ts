import { relations } from "drizzle-orm";
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export const ventilationSystem = sqliteTable("ventilation_system", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  systemType: text("system_type").notNull(), // 'natural' | 'mechanical'
  airChangeRatePerHour: real("air_change_rate_per_hour"),
  freshAirPerPersonM3h: real("fresh_air_per_person_m3h"),
  heatRecoveryEfficiency: real("heat_recovery_efficiency"),
  fanElectricalPowerKw: real("fan_electrical_power_kw"),
  /** Mechanical-only: hours the AHU actually runs during the cooling season
   * (`Heat gains Mec Vent` sheet's `Equipment!H*J` operation-hours ×
   * utilization-factor product, collapsed into one input) — drives the
   * fresh-air enthalpy cooling load, see `ventilation.service.ts`'s
   * `calculateMechanicalVentilationCoolingGainKwh`. */
  coolingSeasonHours: real("cooling_season_hours"),
});

export const ventilationSystemRelations = relations(ventilationSystem, ({ one }) => ({
  building: one(building, {
    fields: [ventilationSystem.buildingId],
    references: [building.id],
  }),
}));
