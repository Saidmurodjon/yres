import type { Scenario } from "./envelope";

export interface CoolingResult {
  scenario: Scenario;
  solarGainsKwh: number;
  internalGainsKwh: number;
  totalCoolingLoadKwh: number;
  seer: number;
  electricalEnergyForCoolingKwh: number;
}
