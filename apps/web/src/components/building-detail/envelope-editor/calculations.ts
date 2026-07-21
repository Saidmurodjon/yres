import type { Material, SurfaceResistance } from "../../../lib/api-types";
import type { ConstructionTypeRow, EnvelopeElementRow, OpeningTypeRow } from "./state";

/** Fallback matching `audit.engine.ts`'s default when a category isn't in the reference table. */
const DEFAULT_SURFACE_RESISTANCE = { interiorResistanceM2kPerW: 0.13, exteriorResistanceM2kPerW: 0.04 };

/**
 * Live client-side preview of a construction type's U-value, using the exact
 * same formula as `apps/api/src/services/uvalue.service.ts`'s
 * `calculateUValue` (`U = 1/(Rint+Rext+ΣR_layers)`, `R_layer = thickness/conductivity`).
 * Returns `null` while any layer is incomplete (no material or no positive
 * thickness) rather than computing a partial/misleading number.
 */
export function computeUValuePreview(
  type: ConstructionTypeRow,
  materials: Material[],
  surfaceResistances: SurfaceResistance[],
): number | null {
  if (type.layers.length === 0) return null;

  let layerResistance = 0;
  for (const layer of type.layers) {
    const material = materials.find((m) => m.id === layer.materialId);
    const thickness = Number(layer.thicknessM);
    if (!material || !Number.isFinite(thickness) || thickness <= 0) return null;
    if (material.thermalConductivityWPerMk <= 0) return null;
    layerResistance += thickness / material.thermalConductivityWPerMk;
  }

  const resistance =
    surfaceResistances.find((r) => r.elementCategory === type.elementCategory) ??
    DEFAULT_SURFACE_RESISTANCE;
  const totalResistance =
    layerResistance + resistance.interiorResistanceM2kPerW + resistance.exteriorResistanceM2kPerW;

  return totalResistance > 0 ? 1 / totalResistance : null;
}

/** Same formula as `envelope.service.ts`'s `openingAreaM2` (width × height × count). */
export function openingAreaM2(
  openingTypeCode: string,
  count: string,
  openingTypesByCode: Map<string, OpeningTypeRow>,
): number {
  const type = openingTypesByCode.get(openingTypeCode);
  if (!type) return 0;
  const width = Number(type.widthM) || 0;
  const height = Number(type.heightM) || 0;
  const n = Number(count) || 0;
  return width * height * n;
}

/** Same formula as `envelope.service.ts`'s `netElementAreaM2` (gross − Σ opening area, floored at 0). */
export function elementNetAreaM2(
  el: EnvelopeElementRow,
  openingTypesByCode: Map<string, OpeningTypeRow>,
): number {
  const length = Number(el.lengthM) || 0;
  const heightEnv = Number(el.heightEnvContactM) || 0;
  const heightGround = Number(el.heightGroundContactM) || 0;
  const gross = length * (heightEnv + heightGround);
  const openings = el.openings.reduce(
    (sum, o) => sum + openingAreaM2(o.openingTypeCode, o.count, openingTypesByCode),
    0,
  );
  return Math.max(0, gross - openings);
}

export interface ElementAreaTotals {
  byCategory: Record<string, number>;
  windowAreaM2: number;
  doorAreaM2: number;
}

/**
 * Running totals across all envelope elements, in the same buckets as
 * `envelope.service.ts`'s `calculateEnvelopeAreas` (opaque area by
 * `elementCategory`, plus window/door area from openings) — computed
 * client-side so a user re-typing figures from a source spreadsheet sees an
 * immediate cross-check total instead of only finding a mismatch after save.
 */
export function computeElementAreaTotals(
  rows: EnvelopeElementRow[],
  constructionTypesByCode: Map<string, ConstructionTypeRow>,
  openingTypesByCode: Map<string, OpeningTypeRow>,
): ElementAreaTotals {
  const byCategory: Record<string, number> = {};
  let windowAreaM2 = 0;
  let doorAreaM2 = 0;

  for (const el of rows) {
    const constructionType = constructionTypesByCode.get(el.constructionTypeCode);
    const net = elementNetAreaM2(el, openingTypesByCode);
    if (constructionType) {
      byCategory[constructionType.elementCategory] =
        (byCategory[constructionType.elementCategory] ?? 0) + net;
    }
    for (const o of el.openings) {
      const openingType = openingTypesByCode.get(o.openingTypeCode);
      const area = openingAreaM2(o.openingTypeCode, o.count, openingTypesByCode);
      if (openingType?.category === "window") windowAreaM2 += area;
      else if (openingType?.category === "door") doorAreaM2 += area;
    }
  }

  return { byCategory, windowAreaM2, doorAreaM2 };
}
