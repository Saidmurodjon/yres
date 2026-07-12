import type { CoolingResult } from "./cooling";
import type { DhwDemandResult, DistributionLossResult } from "./dhw";
import type { EquipmentResult } from "./equipment";
import type { EnvelopeAreaBreakdown } from "./envelope";
import type { EndUseEnergyTotals, GenerationSourceResult } from "./generation";
import type {
  EnvelopeHeatLossResult,
  HeatingEnergyBalanceResult,
  VentilationLossResult,
} from "./heatbalance";
import type { LightingResult } from "./lighting";
import type { EnergyMeasureResult } from "./measures";
import type { RenewableProductionResult } from "./renewable";

export interface AuditSummary {
  currentEnergyUseKwhPerM2Year: number;
  potentialEnergyUseKwhPerM2Year: number;
  potentialSavingsKwhPerM2Year: number;
  co2ReductionTonnesPerYear: number;
  totalInvestmentUsd: number;
  totalAnnualSavingsUsd: number;
  simplePaybackYears: number | null;
}

export interface AuditResult {
  buildingId: string;
  generatedAt: string;
  summary: AuditSummary;
  envelopeAreas: EnvelopeAreaBreakdown;
  envelopeHeatLoss: EnvelopeHeatLossResult[];
  ventilationLoss: VentilationLossResult[];
  heatingEnergyBalance: HeatingEnergyBalanceResult[];
  dhwDemand: DhwDemandResult[];
  distributionLoss: DistributionLossResult[];
  cooling: CoolingResult[];
  generation: GenerationSourceResult[];
  lighting: LightingResult[];
  equipment: EquipmentResult[];
  /** Not scenario-tagged — see `renewable.service.ts`'s doc comment for why. */
  renewableProduction: RenewableProductionResult[];
  finalEnergyByEndUse: EndUseEnergyTotals[];
  measures: EnergyMeasureResult[];
}
