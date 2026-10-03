export interface FinancialIndicators {
  npv: number;
  irr: number | null;
  simplePaybackYears: number | null;
  discountedPaybackYears: number | null;
  discountRate: number;
  analysisHorizonYears: number;
}

export interface CashflowYear {
  year: number;
  capex: number;
  grossSavings: number;
  maintenanceCost: number;
  netCashflow: number;
  discountedNetCashflow: number;
  cumulativeDiscountedCashflow: number;
}

export type EnergyCarrier = "gas" | "electricity" | "district_heat" | "coal";

export interface EnergyTariff {
  energyCarrier: EnergyCarrier;
  unitCostUsdPerKwh: number;
  emissionFactorKgCo2PerKwh: number;
  primaryEnergyFactor: number;
}

/** The financial inputs the result was computed with (v7.20 `Financial parameters`), nominal values derived. For the report's "Assumptions" section. */
export interface FinancialAssumptions {
  baseYear: number;
  periodYears: number;
  inflationRate: number;
  realDiscountRate: number;
  nominalDiscountRate: number;
  nominalEscalation: Record<EnergyCarrier, number>;
  maintenanceEscalation: number;
  exchangeRateUzsPerUsd: number;
  /** `null` = no tariff could be derived (coal without NCV); savings of that carrier are not valued. */
  usdPerKwh: Record<EnergyCarrier, number | null>;
  irrInitialGuess: number;
  pvExportEnabled: boolean;
  pvExportUsdPerKwh: number;
}
