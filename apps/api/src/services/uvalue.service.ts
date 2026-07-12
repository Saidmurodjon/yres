import type { UValueResult } from "@yres/types";

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
