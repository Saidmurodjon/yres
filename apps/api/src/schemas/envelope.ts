import {
  envelopeElementCategoryEnum,
  openingCategoryEnum,
  orientationEnum,
  scenarioEnum,
} from "@yres/db";
import { z } from "zod";

const constructionLayerInputSchema = z.object({
  layerOrder: z.number().finite().int().nonnegative(),
  materialId: z.string().uuid(),
  thicknessM: z.number().finite().positive(),
});

const constructionTypeInputSchema = z
  .object({
    // Client-assigned code, unique within this payload. Used to cross-reference
    // envelope elements to their construction type without needing real DB ids
    // up front (this is a full bulk-replace, so ids don't exist yet).
    code: z.string().min(1).max(100),
    elementCategory: z.enum(envelopeElementCategoryEnum.enumValues),
    description: z.string().max(10_000).nullable().optional(),
    layers: z.array(constructionLayerInputSchema).max(8).default([]),
    // Only meaningful when this payload's `scenario` is "after" — the `code`
    // of the existing "before"-scenario construction type this one retrofits
    // (`envelope.service.ts`'s `resolveHeatLossGroups()` swaps an element's
    // before-type for whichever type has `retrofitOfId` pointing back at it).
    // Resolved to a real `construction_type.id` in the route since the
    // before-scenario type was created by an earlier PUT and isn't part of
    // this payload.
    retrofitOfCode: z.string().min(1).max(100).nullable().optional(),
    // F08. Temperature reduction factor n — required for floor_over_unheated (v7.20: 0.4), optional for
    // socle_unheated, null = 1.
    temperatureReductionFactor: z.number().finite().gt(0).max(1).nullable().optional(),
    // F08. Zone-method sample block (`U-values!S110:S111`) — required for floor_ground.
    groundLengthM: z.number().finite().gt(0).max(1000).nullable().optional(),
    groundWidthM: z.number().finite().gt(0).max(1000).nullable().optional(),
  })
  .superRefine((ct, ctx) => {
    const need = (field: "temperatureReductionFactor" | "groundLengthM" | "groundWidthM") => {
      if (ct[field] == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: "Required for this element category",
        });
      }
    };
    if (ct.elementCategory === "floor_over_unheated") need("temperatureReductionFactor");
    if (ct.elementCategory === "floor_ground") {
      need("groundLengthM");
      need("groundWidthM");
    }
  });

const openingTypeInputSchema = z.object({
  code: z.string().min(1).max(100),
  category: z.enum(openingCategoryEnum.enumValues),
  uValueWm2k: z.number().finite().positive(),
  widthM: z.number().finite().positive().nullable().optional(),
  heightM: z.number().finite().positive().nullable().optional(),
  // Solar-gain properties — only meaningful for category: "window", used by
  // the audit engine's EN ISO 13790 solar gain calculation.
  gValue: z.number().finite().min(0).max(1).nullable().optional(),
  frameFactor: z.number().finite().min(0).max(1).nullable().optional(),
  shadingFactor: z.number().finite().min(0).max(1).optional(),
  description: z.string().max(10_000).nullable().optional(),
  // Same rule as constructionTypes: only for scenario "after" — the `code` of the "before" opening
  // type this one replaces (an opening type nothing replaces keeps its own U-value).
  retrofitOfCode: z.string().min(1).max(100).nullable().optional(),
});

const envelopeOpeningInputSchema = z.object({
  openingTypeCode: z.string().min(1).max(100),
  count: z.number().finite().int().positive().default(1),
});

const envelopeElementInputSchema = z.object({
  blockName: z.string().min(1).max(300),
  orientation: z.enum(orientationEnum.enumValues),
  sideCode: z.string().max(100).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  constructionTypeCode: z.string().min(1).max(100),
  lengthM: z.number().finite().positive(),
  heightEnvContactM: z.number().finite().nonnegative().optional(),
  heightGroundContactM: z.number().finite().nonnegative().optional(),
  openings: z.array(envelopeOpeningInputSchema).max(20).default([]),
});

const buildingBlockInputSchema = z.object({
  name: z.string().min(1).max(300),
  footprintLengthM: z.number().finite().positive(),
  footprintWidthM: z.number().finite().positive(),
  numberOfFloors: z.number().finite().int().positive(),
  floorToFloorHeightM: z.number().finite().positive(),
  perimeterM: z.number().finite().positive(),
  perimeterLossCoefficient: z.number().finite().min(0).max(1).optional(),
});

// Array bounds are sized so one PUT stays inside the D1 query budget (database.md: ≤ 40 per
// request on Workers Free). Worst case, statements in the single db.batch():
//   deletes                                   4  (elements, opening types, construction types, blocks)
//   buildingBlocks      22 rows ÷ 11/stmt     2  (9 columns → floor(100/9) = 11)
//   constructionTypes   15 rows ÷ 10/stmt     2  (10 columns)
//   constructionLayers 120 rows ÷ 20/stmt     6  (5 columns; 15 types × 8 layers)
//   openingTypes        14 rows ÷  7/stmt     2  (13 columns)
//   envelopeElements   100 rows ÷ 10/stmt    10  (10 columns)
//   envelopeOpenings   150 rows ÷ 25/stmt     6  (4 columns; total across elements, see superRefine)
//                                            -- 32
// + session lookup (≤ 2) + findAccessibleBuilding (1, single LEFT JOIN query — A02) = 35, and an
// "after" PUT adds 2 retrofit lookups = 37. A "before" PUT instead adds: 1 read of the
// after→before links + PRAGMA defer_foreign_keys + ≤ 2 re-link CASE UPDATEs (one per table) =
// 35 + 4 = 39 ≤ 40 (A09a's `audit_event` row adds the last 1).
export const MAX_ENVELOPE_OPENINGS_TOTAL = 150;

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
