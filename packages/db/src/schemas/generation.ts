import { relations } from "drizzle-orm";
import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { endUseEnum, generationSourceTypeEnum, scenarioEnum } from "./enums";

export const generationSource = sqliteTable("generation_source", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  endUse: text("end_use", { enum: endUseEnum.enumValues }).notNull(),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull(),
  sourceType: text("source_type", { enum: generationSourceTypeEnum.enumValues }).notNull(),
  efficiencyOrSeer: real("efficiency_or_seer").notNull(),
  shareOfDemand: real("share_of_demand").notNull().default(1),
});

export const generationSourceRelations = relations(generationSource, ({ one }) => ({
  building: one(building, { fields: [generationSource.buildingId], references: [building.id] }),
}));
