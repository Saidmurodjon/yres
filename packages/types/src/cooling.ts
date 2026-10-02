import type { Scenario } from "./envelope";

export interface CoolingResult {
  scenario: Scenario;
  solarGainsKwh: number;
  internalGainsKwh: number;
  /** Mechanical ventilation's fresh-air enthalpy load — see `ventilation.service.ts`'s `calculateMechanicalVentilationCoolingGainKwh`; 0 when the building has no mechanical ventilation. */
  mechanicalVentilationGainKwh: number;
  /** Loss in the distribution network: load × (1 − η_distribution) (`Overall gener. & distrib. eff.!F15`). */
  distributionLossKwh: number;
  totalCoolingLoadKwh: number;
  seer: number;
  electricalEnergyForCoolingKwh: number;
}
