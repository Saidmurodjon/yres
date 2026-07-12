import { relations } from "drizzle-orm";
import { type AnyPgColumn, integer, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import {
  envelopeElementCategoryEnum,
  openingCategoryEnum,
  orientationEnum,
  scenarioEnum,
} from "./enums";
import { material } from "./materials";

export const constructionType = pgTable("construction_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. "W1", "R1", "F1", "Socle 2"
  elementCategory: envelopeElementCategoryEnum("element_category").notNull(),
  scenario: scenarioEnum("scenario").notNull().default("before"),
  retrofitOfId: uuid("retrofit_of_id").references((): AnyPgColumn => constructionType.id),
  description: text("description"),
});

export const constructionLayer = pgTable("construction_layer", {
  id: uuid("id").primaryKey().defaultRandom(),
  constructionTypeId: uuid("construction_type_id")
    .notNull()
    .references(() => constructionType.id, { onDelete: "cascade" }),
  layerOrder: integer("layer_order").notNull(),
  materialId: uuid("material_id")
    .notNull()
    .references(() => material.id),
  thicknessM: numeric("thickness_m", { mode: "number" }).notNull(),
});

export const openingType = pgTable("opening_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. "Win1", "D1"
  category: openingCategoryEnum("category").notNull(),
  scenario: scenarioEnum("scenario").notNull().default("before"),
  retrofitOfId: uuid("retrofit_of_id").references((): AnyPgColumn => openingType.id),
  uValueWm2k: numeric("u_value_w_m2k", { mode: "number" }).notNull(),
  widthM: numeric("width_m", { mode: "number" }),
  heightM: numeric("height_m", { mode: "number" }),
  description: text("description"),
});

export const envelopeElement = pgTable("envelope_element", {
  id: uuid("id").primaryKey().defaultRandom(),
  buildingId: uuid("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  blockName: text("block_name").notNull(),
  orientation: orientationEnum("orientation").notNull(),
  sideCode: text("side_code"),
  description: text("description"),
  constructionTypeId: uuid("construction_type_id")
    .notNull()
    .references(() => constructionType.id),
  lengthM: numeric("length_m", { mode: "number" }).notNull(),
  heightEnvContactM: numeric("height_env_contact_m", { mode: "number" }).default(0),
  heightGroundContactM: numeric("height_ground_contact_m", { mode: "number" }).default(0),
});

export const envelopeOpening = pgTable("envelope_opening", {
  id: uuid("id").primaryKey().defaultRandom(),
  envelopeElementId: uuid("envelope_element_id")
    .notNull()
    .references(() => envelopeElement.id, { onDelete: "cascade" }),
  openingTypeId: uuid("opening_type_id")
    .notNull()
    .references(() => openingType.id),
  count: integer("count").notNull().default(1),
});

export const constructionTypeRelations = relations(constructionType, ({ one, many }) => ({
  building: one(building, { fields: [constructionType.buildingId], references: [building.id] }),
  retrofitOf: one(constructionType, {
    fields: [constructionType.retrofitOfId],
    references: [constructionType.id],
  }),
  layers: many(constructionLayer),
  envelopeElements: many(envelopeElement),
}));

export const constructionLayerRelations = relations(constructionLayer, ({ one }) => ({
  constructionType: one(constructionType, {
    fields: [constructionLayer.constructionTypeId],
    references: [constructionType.id],
  }),
  material: one(material, {
    fields: [constructionLayer.materialId],
    references: [material.id],
  }),
}));

export const openingTypeRelations = relations(openingType, ({ one, many }) => ({
  building: one(building, { fields: [openingType.buildingId], references: [building.id] }),
  retrofitOf: one(openingType, {
    fields: [openingType.retrofitOfId],
    references: [openingType.id],
  }),
  openings: many(envelopeOpening),
}));

export const envelopeElementRelations = relations(envelopeElement, ({ one, many }) => ({
  building: one(building, { fields: [envelopeElement.buildingId], references: [building.id] }),
  constructionType: one(constructionType, {
    fields: [envelopeElement.constructionTypeId],
    references: [constructionType.id],
  }),
  openings: many(envelopeOpening),
}));

export const envelopeOpeningRelations = relations(envelopeOpening, ({ one }) => ({
  envelopeElement: one(envelopeElement, {
    fields: [envelopeOpening.envelopeElementId],
    references: [envelopeElement.id],
  }),
  openingType: one(openingType, {
    fields: [envelopeOpening.openingTypeId],
    references: [openingType.id],
  }),
}));
