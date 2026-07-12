import type { Scenario } from "./envelope";

export interface DhwDemandResult {
  scenario: Scenario;
  electricalKwh: number;
  otherKwh: number;
  totalKwh: number;
}

export type DistributionSystemKind = "heating" | "dhw";

export interface DistributionLossResult {
  scenario: Scenario;
  systemType: DistributionSystemKind;
  annualLossKwh: number;
}
