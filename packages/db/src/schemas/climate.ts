import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const climateRegion = sqliteTable("climate_region", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  designOutdoorTempC: real("design_outdoor_temp_c").notNull(),
  avgAnnualTempC: real("avg_annual_temp_c"),
  minAbsoluteTempC: real("min_absolute_temp_c"),
  maxAbsoluteTempC: real("max_absolute_temp_c"),
});

export const climateMonthlyNormal = sqliteTable("climate_monthly_normal", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  climateRegionId: text("climate_region_id")
    .notNull()
    .references(() => climateRegion.id, { onDelete: "cascade" }),
  month: integer("month").notNull(),
  avgOutdoorTempC: real("avg_outdoor_temp_c").notNull(),
  /**
   * Days *within the heating season* that fall in this calendar month —
   * distinct from the month's total calendar days, since boundary months
   * (typically the first/last month of the season) only partially overlap
   * it. Null for non-heating-season months. Falls back to full calendar
   * days in `HeatLossService`/`GainService` callers when unset.
   */
  heatingDaysInMonth: integer("heating_days_in_month"),
  solarRadiationSouthKwhM2: real("solar_radiation_south_kwh_m2"),
  solarRadiationNorthKwhM2: real("solar_radiation_north_kwh_m2"),
  solarRadiationEastWestKwhM2: real("solar_radiation_east_west_kwh_m2"),
  solarRadiationSeSwKwhM2: real("solar_radiation_se_sw_kwh_m2"),
  solarRadiationNeNwKwhM2: real("solar_radiation_ne_nw_kwh_m2"),
  solarRadiationHorizontalKwhM2: real("solar_radiation_horizontal_kwh_m2"),
  isHeatingSeasonMonth: integer("is_heating_season_month", { mode: "boolean" })
    .notNull()
    .default(false),
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
