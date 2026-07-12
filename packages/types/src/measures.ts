export type MeasureCategory =
  | "envelope_wall_insulation"
  | "envelope_roof_insulation"
  | "envelope_floor_insulation"
  | "window_replacement"
  | "heating_system"
  | "dhw_system"
  | "lighting"
  | "ventilation_heat_recovery"
  | "pv"
  | "solar_dhw"
  | "other";

export interface EnergyMeasureResult {
  measureId: string;
  category: MeasureCategory;
  annualEnergySavingsKwh: number;
  annualCostSavings: number;
  capexEstimate: number;
  co2ReductionTonnesPerYear: number;
}
