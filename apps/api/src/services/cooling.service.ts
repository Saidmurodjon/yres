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

/** `Cooling` sheet's `H37 = F37/G37`: cooling load ÷ SEER = electrical energy for cooling. */
export function calculateCoolingResult(
  scenario: Scenario,
  solarGainsKwh: number,
  internalGainsKwh: number,
  seer: number,
): CoolingResult {
  const totalCoolingLoadKwh = solarGainsKwh + internalGainsKwh;
  const electricalEnergyForCoolingKwh = seer > 0 ? totalCoolingLoadKwh / seer : 0;

  return {
    scenario,
    solarGainsKwh,
    internalGainsKwh,
    totalCoolingLoadKwh,
    seer,
    electricalEnergyForCoolingKwh,
  };
}
