import type { CoolingResult } from "./cooling";
import type { DhwDemandResult, DistributionLossResult } from "./dhw";
import type { EnvelopeAreaBreakdown, GroundFloorZonesResult } from "./envelope";
import type { EquipmentResult } from "./equipment";
import type { FinancialAssumptions } from "./financial";
import type { EndUseEnergyTotals, GenerationSourceResult } from "./generation";
import type {
  EnvelopeHeatLossResult,
  HeatingEnergyBalanceResult,
  VentilationLossResult,
} from "./heatbalance";
import type { LightingResult } from "./lighting";
import type { EnergyMeasureResult, NonEeMeasureResult } from "./measures";
import type { RenewableBalance, RenewableProductionResult } from "./renewable";

/** One `Measures_summary` totals row: row 38 (`all` — every measure) or row 39 (`proposed` — only those marked for implementation). */
export interface MeasurePackageTotals {
  /** EE measures' investment plus the non-EE costs that fall in the same set (`all` → every row, `proposed` → proposed rows). */
  investmentUsd: number;
  nonEeCostUsd: number;
  standardizedSavingsKwh: number;
  standardizedSavingsUsd: number;
  actualSavingsKwh: number;
  actualSavingsUsd: number;
  /** `capex / savings`; null when there are no savings. */
  simplePaybackStandardizedYears: number | null;
  simplePaybackActualYears: number | null;
  co2ReductionTonnesPerYear: number;
  /** Σ measure NPV − non-EE cost (non-EE costs are year-0 outflows with no savings). */
  npvStandardizedUsd: number;
  npvActualUsd: number;
  /** IRR of the summed package cashflow (non-EE cost added to year 0); null if it never repays. */
  irrStandardized: number | null;
  irrActual: number | null;
}

/** v7.20 `Measures_summary!D67:F68`: do the measures' per-carrier savings add up to the scenario's before − after final energy? */
export interface MeasureBalanceRow {
  carrier: "gas" | "electricity" | "district_heat" | "coal";
  sumOfMeasuresKwh: number;
  scenarioDeltaKwh: number;
  /** `(sum − delta) / delta · 100`; 0 when both are 0. */
  diffPct: number;
  status: "ok" | "check";
}

export interface AuditSummary {
  currentEnergyUseKwhPerM2Year: number;
  /** With PV, **not clipped at 0**: negative means the building exports more than it uses (`H76`). */
  potentialEnergyUseKwhPerM2Year: number;
  /** The same "after" total without PV (`H75`). */
  potentialEnergyUseWithoutPvKwhPerM2Year: number;
  potentialSavingsKwhPerM2Year: number;
  co2ReductionTonnesPerYear: number;
  /** Proposed EE measures' investment plus every non-EE measure's cost (`Measures_summary!D31` includes both — see `docs/calculation-engine-audit.md`). */
  totalInvestmentUsd: number;
  /** Broken out of `totalInvestmentUsd` for transparency — non-EE costs generate no savings, so they aren't optional in the way "proposed for implementation" EE measures are. */
  totalNonEeMeasureCostUsd: number;
  totalAnnualSavingsUsd: number;
  simplePaybackYears: number | null;
  /** v7.20 `Measures_summary!38`: every measure. */
  all: MeasurePackageTotals;
  /** v7.20 `Measures_summary!39`: proposed measures only; the legacy fields above equal this. */
  proposed: MeasurePackageTotals;
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
export type EnergyBalanceSection =
  | "envelope_ventilation_loss"
  | "final_energy"
  | "renewable_offset";

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
  /** Non-fatal input gaps that bias the result (e.g. missing working days → lighting hours understated). */
  warnings: string[];
  /** F08: ground-zone breakdown of every `floor_ground` construction type, before and after (Annex 2). */
  groundFloorZones: GroundFloorZonesResult[];
  financialAssumptions: FinancialAssumptions;
  /** v7.20 `Measures_summary!D71`: share of envelope/ventilation savings that survives the lost useful gains (1 = none lost). */
  gainsUtilizationCorrection: number;
  summary: AuditSummary;
  /** Balance check of the measures against the before/after scenario, per carrier (all measures, not only proposed). */
  measureBalance: MeasureBalanceRow[];
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
  renewableBalance: RenewableBalance;
  finalEnergyByEndUse: EndUseEnergyTotals[];
  energyBalanceBreakdown: EnergyBalanceRow[];
  specificConsumptionSummary: SpecificConsumptionRow[];
  measures: EnergyMeasureResult[];
  nonEeMeasures: NonEeMeasureResult[];
}
