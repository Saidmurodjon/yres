import { relations } from "drizzle-orm";
import { boolean, integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const climateRegion = pgTable("climate_region", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  designOutdoorTempC: numeric("design_outdoor_temp_c", { mode: "number" }).notNull(),
  avgAnnualTempC: numeric("avg_annual_temp_c", { mode: "number" }),
  minAbsoluteTempC: numeric("min_absolute_temp_c", { mode: "number" }),
  maxAbsoluteTempC: numeric("max_absolute_temp_c", { mode: "number" }),
});

export const climateMonthlyNormal = pgTable("climate_monthly_normal", {
  id: uuid("id").primaryKey().defaultRandom(),
  climateRegionId: uuid("climate_region_id")
    .notNull()
    .references(() => climateRegion.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  avgOutdoorTempC: numeric("avg_outdoor_temp_c", { mode: "number" }).notNull(),
  /**
   * Days *within the heating season* that fall in this calendar month —
   * distinct from the month's total calendar days, since boundary months
   * (typically the first/last month of the season) only partially overlap
   * it. Null for non-heating-season months. Falls back to full calendar
   * days in `HeatLossService`/`GainService` callers when unset.
   */
  heatingDaysInMonth: integer("heating_days_in_month"),
  solarRadiationSouthKwhM2: numeric("solar_radiation_south_kwh_m2", { mode: "number" }),
  solarRadiationNorthKwhM2: numeric("solar_radiation_north_kwh_m2", { mode: "number" }),
  solarRadiationEastWestKwhM2: numeric("solar_radiation_east_west_kwh_m2", { mode: "number" }),
  solarRadiationSeSwKwhM2: numeric("solar_radiation_se_sw_kwh_m2", { mode: "number" }),
  solarRadiationNeNwKwhM2: numeric("solar_radiation_ne_nw_kwh_m2", { mode: "number" }),
  solarRadiationHorizontalKwhM2: numeric("solar_radiation_horizontal_kwh_m2", {
    mode: "number",
  }),
  isHeatingSeasonMonth: boolean("is_heating_season_month").notNull().default(false),
});

export const climateRegionRelations = relations(climateRegion, ({ many }) => ({
  monthlyNormals: many(climateMonthlyNormal),
}));

export const climateMonthlyNormalRelations = relations(climateMonthlyNormal, ({ one }) => ({
  region: one(climateRegion, {
    fields: [climateMonthlyNormal.climateRegionId],
    references: [climateRegion.id],
  }),
}));
