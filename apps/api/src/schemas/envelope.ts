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
  layers: z.array(constructionLayerInputSchema).max(8).default([]),
  // Only meaningful when this payload's `scenario` is "after" — the `code`
  // of the existing "before"-scenario construction type this one retrofits
  // (`envelope.service.ts`'s `resolveHeatLossGroups()` swaps an element's
  // before-type for whichever type has `retrofitOfId` pointing back at it).
  // Resolved to a real `construction_type.id` in the route since the
  // before-scenario type was created by an earlier PUT and isn't part of
  // this payload.
  retrofitOfCode: z.string().min(1).nullable().optional(),
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
  openings: z.array(envelopeOpeningInputSchema).max(20).default([]),
});

const buildingBlockInputSchema = z.object({
  name: z.string().min(1),
  footprintLengthM: z.number().positive(),
  footprintWidthM: z.number().positive(),
  numberOfFloors: z.number().int().positive(),
  floorToFloorHeightM: z.number().positive(),
  perimeterM: z.number().positive(),
  perimeterLossCoefficient: z.number().min(0).max(1).optional(),
});

// Array bounds are sized so one PUT stays inside the D1 query budget (database.md: ≤ 40 per
// request on Workers Free). Worst case, statements in the single db.batch():
//   deletes                                   4  (elements, opening types, construction types, blocks)
//   buildingBlocks      22 rows ÷ 11/stmt     2  (9 columns → floor(100/9) = 11)
//   constructionTypes   15 rows ÷ 14/stmt     2  (7 columns)
//   constructionLayers 120 rows ÷ 20/stmt     6  (5 columns; 15 types × 8 layers)
//   openingTypes        14 rows ÷  7/stmt     2  (13 columns)
//   envelopeElements   100 rows ÷ 10/stmt    10  (10 columns)
//   envelopeOpenings   160 rows ÷ 25/stmt     7  (4 columns; total across elements, see superRefine)
//                                            -- 33
// + session lookup (≤ 2) + findAccessibleBuilding (≤ 2) + the retrofit lookup (1) = 38 ≤ 40.
export const MAX_ENVELOPE_OPENINGS_TOTAL = 160;

export const replaceEnvelopeSchema = z
  .object({
    scenario: z.enum(scenarioEnum.enumValues).default("before"),
    // Footprint blocks aren't scenario-specific (retrofit changes U-values, not
    // geometry) — omit this field to leave existing blocks untouched, or pass
    // an array (including []) to replace all of the building's blocks.
    buildingBlocks: z.array(buildingBlockInputSchema).max(22).optional(),
    constructionTypes: z.array(constructionTypeInputSchema).max(15).default([]),
    openingTypes: z.array(openingTypeInputSchema).max(14).default([]),
    envelopeElements: z.array(envelopeElementInputSchema).max(100).default([]),
  })
  .superRefine((value, ctx) => {
    const total = value.envelopeElements.reduce((sum, el) => sum + el.openings.length, 0);
    if (total > MAX_ENVELOPE_OPENINGS_TOTAL) {
      ctx.addIssue({
        code: z.ZodIssueCode.too_big,
        type: "array",
        maximum: MAX_ENVELOPE_OPENINGS_TOTAL,
        inclusive: true,
        path: ["envelopeElements"],
        message: `At most ${MAX_ENVELOPE_OPENINGS_TOTAL} openings in total across all elements`,
      });
    }
  });

export type ReplaceEnvelopeInput = z.infer<typeof replaceEnvelopeSchema>;
