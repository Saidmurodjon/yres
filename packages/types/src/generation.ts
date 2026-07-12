import type { Scenario } from "./envelope";

export type EndUse = "heating" | "dhw" | "cooling";

export interface GenerationSourceResult {
  sourceId: string;
  endUse: EndUse;
  scenario: Scenario;
  usefulEnergyNeedKwh: number;
  shareOfDemand: number;
  distributionLossKwh: number;
  efficiencyOrSeer: number;
  /** Final (delivered/purchased) energy consumption, kWh/y. */
  finalEnergyConsumptionKwh: number;
  specificFinalEnergyKwhPerM2: number;
}

export interface EndUseEnergyTotals {
  endUse: EndUse;
  scenario: Scenario;
  finalEnergyConsumptionKwh: number;
}
