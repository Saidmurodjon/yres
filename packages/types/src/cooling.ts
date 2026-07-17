import type { Scenario } from "./envelope";

export interface CoolingResult {
  scenario: Scenario;
  solarGainsKwh: number;
  internalGainsKwh: number;
  /** Mechanical ventilation's fresh-air enthalpy load — see `ventilation.service.ts`'s `calculateMechanicalVentilationCoolingGainKwh`; 0 when the building has no mechanical ventilation. */
  mechanicalVentilationGainKwh: number;
  totalCoolingLoadKwh: number;
  seer: number;
  electricalEnergyForCoolingKwh: number;
}
