import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { distributionSystemTypeEnum, energyCarrierEnum, scenarioEnum } from "./enums";

export const dhwSource = pgTable("dhw_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  sourceName: text("source_name").notNull(),
  energyCarrier: energyCarrierEnum("energy_carrier").notNull(),
  specificConsumptionLPersonDay: numeric("specific_consumption_l_person_day", {
    mode: "number",
  }).notNull(),
  personsServed: integer("persons_served").notNull(),
});

export const distributionSystem = pgTable("distribution_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  systemType: distributionSystemTypeEnum("system_type").notNull(),
  scenario: scenarioEnum("scenario").notNull(),
  pipeDiameterClass: text("pipe_diameter_class").notNull(),
  lengthM: numeric("length_m", { mode: "number" }).notNull(),
  insulatedFraction: numeric("insulated_fraction", { mode: "number" }).notNull().default(0),
  meanFluidTempC: numeric("mean_fluid_temp_c", { mode: "number" }).notNull(),
});

export const dhwSourceRelations = relations(dhwSource, ({ one }) => ({
  building: one(building, { fields: [dhwSource.buildingId], references: [building.id] }),
}));

export const distributionSystemRelations = relations(distributionSystem, ({ one }) => ({
  building: one(building, {
    fields: [distributionSystem.buildingId],
    references: [building.id],
  }),
}));
