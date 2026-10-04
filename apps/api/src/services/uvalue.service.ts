import type {
  EnvelopeElementCategory,
  GroundFloorUValue,
  GroundFloorZone,
  UValueResult,
} from "@yres/types";

export interface UValueLayerInput {
  thicknessM: number;
  thermalConductivityWPerMk: number;
}

export interface SurfaceResistanceInput {
  interiorResistanceM2kPerW: number;
  exteriorResistanceM2kPerW: number;
}

/** R = thickness / conductivity, per SM SR EN ISO 6946. */
export function calculateLayerResistance(layer: UValueLayerInput): number {
  if (layer.thermalConductivityWPerMk <= 0) return 0;
  return layer.thicknessM / layer.thermalConductivityWPerMk;
}

/**
 * U = 1 / (Rint + Rext + ΣR_layers), matching the `U-values` sheet's
 * `H17 = 1/(H16+H15+H14)` formula.
 */
export function calculateUValue(
  constructionTypeId: string,
  layers: UValueLayerInput[],
  surfaceResistance: SurfaceResistanceInput,
): UValueResult {
  const layerResistance = layers.reduce((sum, layer) => sum + calculateLayerResistance(layer), 0);
  const totalThermalResistanceM2KPerW =
    layerResistance +
    surfaceResistance.interiorResistanceM2kPerW +
    surfaceResistance.exteriorResistanceM2kPerW;

  const uValueWPerM2K = totalThermalResistanceM2KPerW > 0 ? 1 / totalThermalResistanceM2KPerW : 0;

  return { constructionTypeId, totalThermalResistanceM2KPerW, uValueWPerM2K };
}

/** R of a non-insulated floor on ground per 2 m zone I–IV, m²K/W (ShNQ 2.01.04; v7.20 `U-values!R114:R117`). */
const GROUND_ZONE_R_NON_INSULATED = [2.1, 4.3, 8.6, 14.2] as const;
/** Only layers with 0 < λ < 1.2 W/mK count as insulating (v7.20 `U-values!T118` SUMIFS). */
const GROUND_INSULATING_LAMBDA_LIMIT = 1.2;

/**
 * Floor on ground by the 2 m zone method (ShNQ 2.01.04 / SNiP II-3-79), v7.20 `U-values!Q108:U121`:
 * `R_i = R_ni,i + ΣR_insulating`, `U_eq = Σ(A_i / R_i) / (L·W)`. Rsi/Rse are NOT added.
 *
 * Zone areas of one L×W block: with `a(k) = max(0, L−k)·max(0, W−k)`,
 * I = L·W − a(4) + 16 (the 4 corner squares of 2×2 m are in both adjacent strips),
 * II = a(4) − a(8), III = a(8) − a(12), IV = a(12). The +16 only exists when both sides are ≥ 4 m
 * (otherwise the strips have no corners to overlap); the divisor is the real L·W.
 */
export function calculateGroundFloorUValue(input: {
  lengthM: number;
  widthM: number;
  layers: UValueLayerInput[];
}): GroundFloorUValue {
  const { lengthM: l, widthM: w } = input;
  const inner = (k: number) => Math.max(0, l - k) * Math.max(0, w - k);
  const corners = l >= 4 && w >= 4 ? 16 : 0;
  const areas = [
    l * w - inner(4) + corners,
    inner(4) - inner(8),
    inner(8) - inner(12),
    inner(12),
  ];
  const insulationResistanceM2KPerW = input.layers
    .filter(
      (layer) =>
        layer.thermalConductivityWPerMk > 0 &&
        layer.thermalConductivityWPerMk < GROUND_INSULATING_LAMBDA_LIMIT,
    )
    .reduce((sum, layer) => sum + calculateLayerResistance(layer), 0);

  const zones: GroundFloorZone[] = areas.map((areaM2, i) => {
    const rNonInsulatedM2KPerW = GROUND_ZONE_R_NON_INSULATED[i] ?? 0;
    return {
      zone: (i + 1) as GroundFloorZone["zone"],
      areaM2,
      rNonInsulatedM2KPerW,
      rM2KPerW: rNonInsulatedM2KPerW + insulationResistanceM2KPerW,
    };
  });
  const realFloorAreaM2 = l * w;
  const conductance = zones.reduce((sum, z) => sum + (z.rM2KPerW > 0 ? z.areaM2 / z.rM2KPerW : 0), 0);
  return {
    lengthM: l,
    widthM: w,
    zones,
    insulationResistanceM2KPerW,
    realFloorAreaM2,
    uEqWPerM2K: realFloorAreaM2 > 0 ? conductance / realFloorAreaM2 : 0,
  };
}

export interface ConstructionTypeUInput {
  elementCategory: EnvelopeElementCategory;
  layers: UValueLayerInput[];
  resistance: SurfaceResistanceInput;
  /** n — applied to `floor_over_unheated` / `socle_unheated` (null = 1). */
  temperatureReductionFactor: number | null;
  groundLengthM: number | null;
  groundWidthM: number | null;
}

/**
 * U of one construction type by its category: `floor_ground` — zone method (sample block L×W);
 * `floor_over_unheated`/`socle_unheated` — `U·n`; everything else (incl. the legacy `floor`) — plain `1/ΣR`.
 * A `floor_ground` without block size falls back to the plain sum (the engine warns).
 */
export function calculateConstructionTypeU(
  constructionTypeId: string,
  input: ConstructionTypeUInput,
): UValueResult & { ground?: GroundFloorUValue } {
  if (input.elementCategory === "floor_ground" && input.groundLengthM && input.groundWidthM) {
    const ground = calculateGroundFloorUValue({
      lengthM: input.groundLengthM,
      widthM: input.groundWidthM,
      layers: input.layers,
    });
    return {
      constructionTypeId,
      totalThermalResistanceM2KPerW: ground.uEqWPerM2K > 0 ? 1 / ground.uEqWPerM2K : 0,
      uValueWPerM2K: ground.uEqWPerM2K,
      ground,
    };
  }
  const plain = calculateUValue(constructionTypeId, input.layers, input.resistance);
  const usesN =
    input.elementCategory === "floor_over_unheated" || input.elementCategory === "socle_unheated";
  if (!usesN || input.temperatureReductionFactor == null) return plain;
  return { ...plain, uValueWPerM2K: plain.uValueWPerM2K * input.temperatureReductionFactor };
}
