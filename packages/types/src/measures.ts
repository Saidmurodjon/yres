import type { CashflowYear, EnergyCarrier, FinancialIndicators } from "./financial";

export type MeasureCategory =
  | "envelope_wall_insulation"
  | "envelope_roof_insulation"
  | "envelope_floor_insulation"
  | "window_replacement"
  | "heating_system"
  | "gas_boiler_replacement"
  | "mechanical_ventilation_heat_recovery"
  | "lighting"
  | "equipment_replacement"
  | "pv"
  | "solar_dhw"
  | "ems"
  | "other";

/**
 * `Non-EE measures` sheet: ancillary renovation costs (cable replacement,
 * re-plastering, pipe demolition) that add to total project investment but
 * never generate energy savings, so they carry no CO2/NPV/IRR/payback
 * figures the way `EnergyMeasureResult` does.
 */
export interface NonEeMeasureResult {
  id: string;
  description: string;
  unit: string | null;
  quantity: number;
  unitCostUsd: number;
  totalCostUsd: number;
  /** v7.20 `Non-EE measures` "Q" column: only proposed rows enter the package totals. */
  proposedForImplementation: boolean;
}

/**
 * One carrier's share of a measure's saving (v7.20 `Measures_summary` T/U columns). A part may be
 * negative: a heat pump saves gas but spends electricity, ventilation saves heat but runs a fan.
 */
export interface MeasureCarrierSaving {
  carrier: EnergyCarrier;
  standardizedKwh: number;
  standardizedUsd: number;
  actualKwh: number;
  actualUsd: number;
}

export interface EnergyMeasureResult {
  measureId: string;
  name: string;
  category: MeasureCategory;
  investmentCostUsd: number;
  /** Useful (pre-generation) energy the measure changes, kWh/y — K3: shown beside the final-energy figures. */
  usefulSavingsKwh: number;
  /** Per-carrier split of the final-energy saving; the totals below are the sums of its parts. */
  savingsByCarrier: MeasureCarrierSaving[];
  /** Final-energy savings computed from standardized (normative) inputs (Σ `savingsByCarrier`). */
  standardizedAnnualSavingsKwh: number;
  standardizedAnnualSavingsUsd: number;
  /** Savings reconciled against actual metered bills (Breakdown Baseline & Balance). */
  actualAnnualSavingsKwh: number;
  actualAnnualSavingsUsd: number;
  simplePaybackYears: number | null;
  lifetimeYears: number;
  co2ReductionTonnesPerYear: number;
  proposedForImplementation: boolean;
  standardized: FinancialIndicators;
  actual: FinancialIndicators;
  /** Year-by-year cashflow backing `standardized`'s NPV/IRR — year 0 is the investment year. */
  standardizedCashflow: CashflowYear[];
  /** Year-by-year cashflow backing `actual`'s NPV/IRR. */
  actualCashflow: CashflowYear[];
}
