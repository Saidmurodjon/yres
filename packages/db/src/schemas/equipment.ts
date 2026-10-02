import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export const equipmentItem = sqliteTable("equipment_item", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  name: text("name").notNull(),
  category: text("category"),
  unitPowerKw: real("unit_power_kw").notNull(),
  quantity: integer("quantity").notNull().default(1),
  heatingSeasonHours: real("heating_season_hours").notNull().default(0),
  coolingSeasonHours: real("cooling_season_hours").notNull().default(0),
  heatingUtilizationFactor: real("heating_utilization_factor").notNull().default(1),
  coolingUtilizationFactor: real("cooling_utilization_factor").notNull().default(1),
});

export const equipmentItemRelations = relations(equipmentItem, ({ one }) => ({
  building: one(building, { fields: [equipmentItem.buildingId], references: [building.id] }),
}));
