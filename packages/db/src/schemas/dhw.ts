import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { distributionSystemTypeEnum, energyCarrierEnum, scenarioEnum } from "./enums";

export const dhwSource = sqliteTable("dhw_source", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  sourceName: text("source_name").notNull(),
  energyCarrier: text("energy_carrier", { enum: energyCarrierEnum.enumValues }).notNull(),
  specificConsumptionLPersonDay: real("specific_consumption_l_person_day").notNull(),
  personsServed: integer("persons_served").notNull(),
});

export const distributionSystem = sqliteTable("distribution_system", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  systemType: text("system_type", { enum: distributionSystemTypeEnum.enumValues }).notNull(),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  pipeDiameterClass: text("pipe_diameter_class").notNull(),
  lengthM: real("length_m").notNull(),
  insulatedFraction: real("insulated_fraction").notNull().default(0),
  meanFluidTempC: real("mean_fluid_temp_c").notNull(),
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
