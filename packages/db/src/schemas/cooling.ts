import { relations } from "drizzle-orm";
import { numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { orientationEnum, scenarioEnum } from "./enums";

export const coolingWindow = pgTable("cooling_window", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  orientation: orientationEnum("orientation").notNull(),
  areaM2: numeric("area_m2", { mode: "number" }).notNull(),
  gValue: numeric("g_value", { mode: "number" }).notNull(),
  shadingFactor: numeric("shading_factor", { mode: "number" }).notNull().default(1),
});

export const coolingSystem = pgTable("cooling_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  description: text("description"),
  seer: numeric("seer", { mode: "number" }).notNull(),
});

export const coolingWindowRelations = relations(coolingWindow, ({ one }) => ({
  building: one(building, { fields: [coolingWindow.buildingId], references: [building.id] }),
}));

export const coolingSystemRelations = relations(coolingSystem, ({ one }) => ({
  building: one(building, { fields: [coolingSystem.buildingId], references: [building.id] }),
}));
