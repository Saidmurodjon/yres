import { relations } from "drizzle-orm";
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { orientationEnum, scenarioEnum } from "./enums";

export const coolingWindow = sqliteTable("cooling_window", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  orientation: text("orientation", { enum: orientationEnum.enumValues }).notNull(),
  areaM2: real("area_m2").notNull(),
  gValue: real("g_value").notNull(),
  shadingFactor: real("shading_factor").notNull().default(1),
});

export const coolingSystem = sqliteTable("cooling_system", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  description: text("description"),
  seer: real("seer").notNull(),
});

export const coolingWindowRelations = relations(coolingWindow, ({ one }) => ({
  building: one(building, { fields: [coolingWindow.buildingId], references: [building.id] }),
}));

export const coolingSystemRelations = relations(coolingSystem, ({ one }) => ({
  building: one(building, { fields: [coolingSystem.buildingId], references: [building.id] }),
}));
