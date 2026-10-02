import { relations } from "drizzle-orm";
import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { user } from "./auth";
import { climateRegion } from "./climate";
import { buildingStatusEnum, buildingTypeEnum } from "./enums";

export const building = sqliteTable(
  "building",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    location: text("location").notNull(),
    /**
     * `name + " " + location`, lowercased with `toLocaleLowerCase()` — written by the app on every
     * insert/update. SQLite's `LIKE`/`lower()` only case-fold ASCII, so "Тошкент" would never match
     * "тошкент" without it (database.md). Search filters on this column, not on `name`/`location`.
     */
    searchText: text("search_text").notNull().default(""),
    climateRegionId: text("climate_region_id")
      .notNull()
      .references(() => climateRegion.id),
    buildingType: text("building_type", { enum: buildingTypeEnum.enumValues })
      .notNull()
      .default("other"),
    yearBuilt: integer("year_built"),
    status: text("status", { enum: buildingStatusEnum.enumValues })
      .notNull()
      .default("not_started"),
    /** `YYYY-MM-DD`. */
    deadline: text("deadline"),
    /** Optional — additive to `location`'s free-text region string, doesn't replace it (dashboard.md). Used for the PDF report's coordinates line + static map (docs/report-redesign-proposal.md §7). */
    latitude: real("latitude"),
    longitude: real("longitude"),

    // Building_data sheet
    netCooledFloorAreaM2: real("net_cooled_floor_area_m2").default(0),
    heatingSeasonDurationDays: integer("heating_season_duration_days").notNull(),
    indoorTempNonOperationC: real("indoor_temp_non_operation_c").notNull(),
    indoorTempOperationC: real("indoor_temp_operation_c").notNull(),
    outdoorAvgHeatingSeasonTempC: real("outdoor_avg_heating_season_temp_c").notNull(),
    outdoorDesignTempC: real("outdoor_design_temp_c").notNull(),
    nonOperationHoursPerDay: real("non_operation_hours_per_day").notNull(),
    operationHoursPerDay: real("operation_hours_per_day").notNull(),
    occupantCount: integer("occupant_count").notNull().default(0),
    coolingEnthalpyInsideKjKg: real("cooling_enthalpy_inside_kj_kg"),
    coolingEnthalpyOutsideKjKg: real("cooling_enthalpy_outside_kj_kg"),
    coolingEnthalpyHottestDayKjKg: real("cooling_enthalpy_hottest_day_kj_kg"),

    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [index("building_user_id_idx").on(table.userId)],
);

export const buildingBlock = sqliteTable("building_block", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  footprintLengthM: real("footprint_length_m").notNull(),
  footprintWidthM: real("footprint_width_m").notNull(),
  numberOfFloors: integer("number_of_floors").notNull(),
  floorToFloorHeightM: real("floor_to_floor_height_m").notNull(),
  perimeterM: real("perimeter_m").notNull(),
  perimeterLossCoefficient: real("perimeter_loss_coefficient").notNull().default(0.4),
});

export const buildingRelations = relations(building, ({ one, many }) => ({
  owner: one(user, { fields: [building.userId], references: [user.id] }),
  climateRegion: one(climateRegion, {
    fields: [building.climateRegionId],
    references: [climateRegion.id],
  }),
  blocks: many(buildingBlock),
}));

export const buildingBlockRelations = relations(buildingBlock, ({ one }) => ({
  building: one(building, { fields: [buildingBlock.buildingId], references: [building.id] }),
}));
