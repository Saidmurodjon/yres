import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export const equipmentItem = pgTable("equipment_item", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  unitPowerKw: numeric("unit_power_kw", { mode: "number" }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  heatingSeasonHours: numeric("heating_season_hours", { mode: "number" }).notNull().default(0),
  coolingSeasonHours: numeric("cooling_season_hours", { mode: "number" }).notNull().default(0),
  heatingUtilizationFactor: numeric("heating_utilization_factor", { mode: "number" })
    .notNull()
    .default(1),
  coolingUtilizationFactor: numeric("cooling_utilization_factor", { mode: "number" })
    .notNull()
    .default(1),
});

export const equipmentItemRelations = relations(equipmentItem, ({ one }) => ({
  building: one(building, { fields: [equipmentItem.buildingId], references: [building.id] }),
}));
