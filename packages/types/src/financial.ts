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

export interface EnergyTariff {
  energyCarrier: "gas" | "electricity" | "district_heat" | "coal";
  unitCostUsdPerKwh: number;
  emissionFactorKgCo2PerKwh: number;
  primaryEnergyFactor: number;
}
