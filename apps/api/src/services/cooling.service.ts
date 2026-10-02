import type { CoolingResult, Scenario } from "@yres/types";

export interface CoolingWindowInput {
  orientation: string;
  areaM2: number;
  gValue: number;
  shadingFactor: number;
}

/**
 * `Cooling` sheet's `O = (sum of cooling-season-month radiation) * G * H *
 * I` per orientation. Callers pre-sum the cooling-season months' radiation
 * per orientation (partial-month weighting, if any, applied there).
 */
export function calculateCoolingSolarGainsKwh(
  windows: CoolingWindowInput[],
  coolingSeasonRadiationKwhM2ByOrientation: Map<string, number>,
): number {
  let total = 0;
  for (const window of windows) {
    const radiationKwhM2 = coolingSeasonRadiationKwhM2ByOrientation.get(window.orientation) ?? 0;
    total += window.areaM2 * window.gValue * window.shadingFactor * radiationKwhM2;
  }
  return total;
}

/**
 * `Overall gener. & distrib. eff.!F15 = D15·(1 − η_dist)`, `H15 = (D15+F15)/G15`: the cooling load plus the
 * distribution loss, ÷ SEER = electrical energy for cooling (`Cooling` sheet's `F37/G37` without the loss). `mechanicalVentilationGainKwh` (`Heat gains Mec Vent` sheet)
 * adds a third gain term for buildings with mechanical ventilation — pass 0
 * for buildings without it.
 */
export function calculateCoolingResult(
  scenario: Scenario,
  solarGainsKwh: number,
  internalGainsKwh: number,
  mechanicalVentilationGainKwh: number,
  seer: number,
  distributionEfficiency = 1,
): CoolingResult {
  const totalCoolingLoadKwh = solarGainsKwh + internalGainsKwh + mechanicalVentilationGainKwh;
  const distributionLossKwh = totalCoolingLoadKwh * (1 - distributionEfficiency);
  const electricalEnergyForCoolingKwh =
    seer > 0 ? (totalCoolingLoadKwh + distributionLossKwh) / seer : 0;

  return {
    scenario,
    solarGainsKwh,
    internalGainsKwh,
    mechanicalVentilationGainKwh,
    distributionLossKwh,
    totalCoolingLoadKwh,
    seer,
    electricalEnergyForCoolingKwh,
  };
}
