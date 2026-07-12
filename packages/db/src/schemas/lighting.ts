import { relations } from "drizzle-orm";
import { jsonb, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { scenarioEnum } from "./enums";

export interface LightingTechnologyMix {
  incandescentFraction: number;
  fluorescentElectromagneticFraction: number;
  fluorescentElectronicFraction: number;
  ledFraction: number;
}

export const lightingZone = pgTable("lighting_zone", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  scenario: scenarioEnum("scenario").notNull(),
  name: text("name").notNull(),
  areaM2: numeric("area_m2", { mode: "number" }).notNull(),
  technologyMix: jsonb("technology_mix").$type<LightingTechnologyMix>().notNull(),
  utilizationFactor: numeric("utilization_factor", { mode: "number" }).notNull(),
});

export const lightingZoneRelations = relations(lightingZone, ({ one }) => ({
  building: one(building, { fields: [lightingZone.buildingId], references: [building.id] }),
}));
