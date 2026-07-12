import type { HeatLossGroup, Scenario } from "./envelope";

export interface EnvelopeHeatLossMonth {
  month: number;
  category: HeatLossGroup["category"];
  operationHoursLossKwh: number;
  nonOperationHoursLossKwh: number;
  totalKwh: number;
}

export interface EnvelopeHeatLossResult {
  scenario: Scenario;
  monthly: EnvelopeHeatLossMonth[];
  annualByCategory: Record<string, number>;
  annualTotalKwh: number;
}

export interface VentilationLossMonth {
  month: number;
  naturalLossKwh: number;
  mechanicalLossKwh: number;
  totalKwh: number;
}

export interface VentilationLossResult {
  scenario: Scenario;
  monthly: VentilationLossMonth[];
  naturalAnnualKwh: number;
  mechanicalAnnualKwh: number;
  mechanicalElectricalKwh: number;
  totalKwh: number;
}

export interface HeatingBalanceMonth {
  month: number;
  heatingDays: number;
  outdoorTempC: number;
  internalGainsKwh: number;
  solarGainsKwh: number;
  totalGainsKwh: number;
  totalLossesKwh: number;
  gainToLossRatio: number;
  utilizationFactor: number;
  netEnergyNeedKwh: number;
}

export interface HeatingEnergyBalanceResult {
  scenario: Scenario;
  monthly: HeatingBalanceMonth[];
  annualNetEnergyNeedKwh: number;
}
