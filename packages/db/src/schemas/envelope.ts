import { relations } from "drizzle-orm";
import { type AnySQLiteColumn, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import {
  envelopeElementCategoryEnum,
  openingCategoryEnum,
  orientationEnum,
  scenarioEnum,
} from "./enums";
import { material } from "./materials";

export const constructionType = sqliteTable("construction_type", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. "W1", "R1", "F1", "Socle 2"
  elementCategory: text("element_category", {
    enum: envelopeElementCategoryEnum.enumValues,
  }).notNull(),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull().default("before"),
  retrofitOfId: text("retrofit_of_id").references((): AnySQLiteColumn => constructionType.id),
  description: text("description"),
});

export const constructionLayer = sqliteTable("construction_layer", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  constructionTypeId: text("construction_type_id")
    .notNull()
    .references(() => constructionType.id, { onDelete: "cascade" }),
  layerOrder: integer("layer_order").notNull(),
  materialId: text("material_id")
    .notNull()
    .references(() => material.id),
  thicknessM: real("thickness_m").notNull(),
});

export const openingType = sqliteTable("opening_type", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  code: text("code").notNull(), // e.g. "Win1", "D1"
  category: text("category", { enum: openingCategoryEnum.enumValues }).notNull(),
  scenario: text("scenario", { enum: scenarioEnum.enumValues }).notNull().default("before"),
  retrofitOfId: text("retrofit_of_id").references((): AnySQLiteColumn => openingType.id),
  uValueWm2k: real("u_value_w_m2k").notNull(),
  widthM: real("width_m"),
  heightM: real("height_m"),
  /** Solar energy transmittance — only meaningful for `category: "window"`. */
  gValue: real("g_value"),
  /** Frame factor `Fw` — glazed fraction of the opening. */
  frameFactor: real("frame_factor"),
  /** Combined horizon × overhang × fin external shading reduction factor. */
  shadingFactor: real("shading_factor").notNull().default(1),
  description: text("description"),
});

export const envelopeElement = sqliteTable("envelope_element", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  buildingId: text("building_id")
    .notNull()
    .references(() => building.id, { onDelete: "cascade" }),
  blockName: text("block_name").notNull(),
  orientation: text("orientation", { enum: orientationEnum.enumValues }).notNull(),
  sideCode: text("side_code"),
  description: text("description"),
  constructionTypeId: text("construction_type_id")
    .notNull()
    .references(() => constructionType.id),
  lengthM: real("length_m").notNull(),
  heightEnvContactM: real("height_env_contact_m").default(0),
  heightGroundContactM: real("height_ground_contact_m").default(0),
});

export const envelopeOpening = sqliteTable("envelope_opening", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  envelopeElementId: text("envelope_element_id")
    .notNull()
    .references(() => envelopeElement.id, { onDelete: "cascade" }),
  openingTypeId: text("opening_type_id")
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
