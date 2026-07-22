import { relations } from "drizzle-orm";
import { date, integer, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { climateRegion } from "./climate";
import { buildingStatusEnum, buildingTypeEnum } from "./enums";

export const building = pgTable("building", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  location: text("location").notNull(),
  climateRegionId: uuid("climate_region_id")
    .notNull()
    .references(() => climateRegion.id),
  buildingType: buildingTypeEnum("building_type").notNull().default("other"),
  yearBuilt: integer("year_built"),
  status: buildingStatusEnum("status").notNull().default("not_started"),
  deadline: date("deadline"),

  // Building_data sheet
  netCooledFloorAreaM2: numeric("net_cooled_floor_area_m2", { mode: "number" }).default(0),
  heatingSeasonDurationDays: integer("heating_season_duration_days").notNull(),
  indoorTempNonOperationC: numeric("indoor_temp_non_operation_c", { mode: "number" }).notNull(),
  indoorTempOperationC: numeric("indoor_temp_operation_c", { mode: "number" }).notNull(),
  outdoorAvgHeatingSeasonTempC: numeric("outdoor_avg_heating_season_temp_c", {
    mode: "number",
  }).notNull(),
  outdoorDesignTempC: numeric("outdoor_design_temp_c", { mode: "number" }).notNull(),
  nonOperationHoursPerDay: numeric("non_operation_hours_per_day", { mode: "number" }).notNull(),
  operationHoursPerDay: numeric("operation_hours_per_day", { mode: "number" }).notNull(),
  occupantCount: integer("occupant_count").notNull().default(0),
  coolingEnthalpyInsideKjKg: numeric("cooling_enthalpy_inside_kj_kg", { mode: "number" }),
  coolingEnthalpyOutsideKjKg: numeric("cooling_enthalpy_outside_kj_kg", { mode: "number" }),
  coolingEnthalpyHottestDayKjKg: numeric("cooling_enthalpy_hottest_day_kj_kg", {
    mode: "number",
  }),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const buildingBlock = pgTable("building_block", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  footprintLengthM: numeric("footprint_length_m", { mode: "number" }).notNull(),
  footprintWidthM: numeric("footprint_width_m", { mode: "number" }).notNull(),
  numberOfFloors: integer("number_of_floors").notNull(),
  floorToFloorHeightM: numeric("floor_to_floor_height_m", { mode: "number" }).notNull(),
  perimeterM: numeric("perimeter_m", { mode: "number" }).notNull(),
  perimeterLossCoefficient: numeric("perimeter_loss_coefficient", { mode: "number" })
    .notNull()
    .default(0.4),
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
