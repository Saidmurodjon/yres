import { relations } from "drizzle-orm";
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export interface LightingTechnologyMix {
  incandescentFraction: number;
  fluorescentElectromagneticFraction: number;
  fluorescentElectronicFraction: number;
  ledFraction: number;
}

export const lightingZone = sqliteTable("lighting_zone", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  name: text("name").notNull(),
  areaM2: real("area_m2").notNull(),
  technologyMix: text("technology_mix", { mode: "json" }).$type<LightingTechnologyMix>().notNull(),
  utilizationFactor: real("utilization_factor").notNull(),
});

export const lightingZoneRelations = relations(lightingZone, ({ one }) => ({
  building: one(building, { fields: [lightingZone.buildingId], references: [building.id] }),
}));
