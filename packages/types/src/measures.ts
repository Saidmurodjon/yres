import type { FinancialIndicators } from "./financial";

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
}

export interface EnergyMeasureResult {
  measureId: string;
  name: string;
  category: MeasureCategory;
  investmentCostUsd: number;
  /** Savings computed from standardized (normative) inputs. */
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
}
