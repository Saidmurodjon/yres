import { relations } from "drizzle-orm";
import { numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { endUseEnum, generationSourceTypeEnum, scenarioEnum } from "./enums";

export const generationSource = pgTable("generation_source", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  endUse: endUseEnum("end_use").notNull(),
  scenario: scenarioEnum("scenario").notNull(),
  sourceType: generationSourceTypeEnum("source_type").notNull(),
  efficiencyOrSeer: numeric("efficiency_or_seer", { mode: "number" }).notNull(),
  shareOfDemand: numeric("share_of_demand", { mode: "number" }).notNull().default(1),
});

export const generationSourceRelations = relations(generationSource, ({ one }) => ({
  building: one(building, { fields: [generationSource.buildingId], references: [building.id] }),
}));
