import {
  envelopeElementCategoryEnum,
  openingCategoryEnum,
  orientationEnum,
  scenarioEnum,
} from "@yres/db";
import { z } from "zod";

const constructionLayerInputSchema = z.object({
  layerOrder: z.number().int().nonnegative(),
  materialId: z.string().uuid(),
  thicknessM: z.number().positive(),
});

const constructionTypeInputSchema = z.object({
  // Client-assigned code, unique within this payload. Used to cross-reference
  // envelope elements to their construction type without needing real DB ids
  // up front (this is a full bulk-replace, so ids don't exist yet).
  code: z.string().min(1),
  elementCategory: z.enum(envelopeElementCategoryEnum.enumValues),
  description: z.string().nullable().optional(),
  layers: z.array(constructionLayerInputSchema).default([]),
});

const openingTypeInputSchema = z.object({
  code: z.string().min(1),
  category: z.enum(openingCategoryEnum.enumValues),
  uValueWm2k: z.number().positive(),
  widthM: z.number().positive().nullable().optional(),
  heightM: z.number().positive().nullable().optional(),
  // Solar-gain properties — only meaningful for category: "window", used by
  // the audit engine's EN ISO 13790 solar gain calculation.
  gValue: z.number().min(0).max(1).nullable().optional(),
  frameFactor: z.number().min(0).max(1).nullable().optional(),
  shadingFactor: z.number().min(0).max(1).optional(),
  description: z.string().nullable().optional(),
});

const envelopeOpeningInputSchema = z.object({
  openingTypeCode: z.string().min(1),
  count: z.number().int().positive().default(1),
});

const envelopeElementInputSchema = z.object({
  blockName: z.string().min(1),
  orientation: z.enum(orientationEnum.enumValues),
  sideCode: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  constructionTypeCode: z.string().min(1),
  lengthM: z.number().positive(),
  heightEnvContactM: z.number().nonnegative().optional(),
  heightGroundContactM: z.number().nonnegative().optional(),
  openings: z.array(envelopeOpeningInputSchema).default([]),
});

export const replaceEnvelopeSchema = z.object({
  scenario: z.enum(scenarioEnum.enumValues).default("before"),
  constructionTypes: z.array(constructionTypeInputSchema).default([]),
  openingTypes: z.array(openingTypeInputSchema).default([]),
  envelopeElements: z.array(envelopeElementInputSchema).default([]),
});

export type ReplaceEnvelopeInput = z.infer<typeof replaceEnvelopeSchema>;
