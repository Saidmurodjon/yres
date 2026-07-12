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
