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
import type { EnergyMeasureResult, NonEeMeasureResult } from "./measures";
import type { RenewableProductionResult } from "./renewable";

export interface AuditSummary {
  currentEnergyUseKwhPerM2Year: number;
  potentialEnergyUseKwhPerM2Year: number;
  potentialSavingsKwhPerM2Year: number;
  co2ReductionTonnesPerYear: number;
  /** Proposed EE measures' investment plus every non-EE measure's cost (`Measures_summary!D31` includes both — see `docs/calculation-engine-audit.md`). */
  totalInvestmentUsd: number;
  /** Broken out of `totalInvestmentUsd` for transparency — non-EE costs generate no savings, so they aren't optional in the way "proposed for implementation" EE measures are. */
  totalNonEeMeasureCostUsd: number;
  totalAnnualSavingsUsd: number;
  simplePaybackYears: number | null;
}

/**
 * `section` distinguishes two different stages of the same energy flow so a
 * reader doesn't sum across them expecting one grand total: "losses" are the
 * gross, pre-generation thermal demand (what the building's fabric and
 * ventilation lose before any equipment gets involved — the "Breakdown
 * Baseline & Balance" sheet's Walls/Roof/Floor/Windows/Ventilation rows),
 * while "final_energy" is what's actually purchased per carrier after
 * generation/distribution efficiency (comparable to a utility bill).
 * "renewable_offset" nets out of the final_energy total for "after" only —
 * see `renewable.service.ts` for why it has no "before" state.
 */
export type EnergyBalanceSection = "envelope_ventilation_loss" | "final_energy" | "renewable_offset";

export interface EnergyBalanceRow {
  /** Stable key — an `EnvelopeElementCategory`, `"window"`/`"door"`, or one of the fixed final-energy/offset categories below. */
  category: string;
  section: EnergyBalanceSection;
  beforeKwh: number;
  afterKwh: number;
}

export type SpecificConsumptionEndUse = "heating" | "dhw" | "electricity";

/**
 * The classic 3-column energy-audit comparison (source Excel's "Breakdown
 * Baseline & Balance" sheet, rows 28-31): actual (bill-calibrated) vs.
 * standardized-before vs. standardized-after, in kWh/m²/year, split by
 * heating/DHW/electricity. `actualKwhPerM2Year` has no meaningful
 * "after" counterpart — same reasoning as `EnergyMeasureResult.actual`
 * (calculation-engine.md): there is no post-retrofit metered data, only a
 * theoretical "before" figure calibrated by each end-use's own carrier
 * ratio.
 */
export interface SpecificConsumptionRow {
  endUse: SpecificConsumptionEndUse;
  actualKwhPerM2Year: number;
  standardizedBeforeKwhPerM2Year: number;
  standardizedAfterKwhPerM2Year: number;
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
  energyBalanceBreakdown: EnergyBalanceRow[];
  specificConsumptionSummary: SpecificConsumptionRow[];
  measures: EnergyMeasureResult[];
  nonEeMeasures: NonEeMeasureResult[];
}
