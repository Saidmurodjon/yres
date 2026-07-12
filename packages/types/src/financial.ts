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
  energySavings: number;
  maintenanceCost: number;
  netCashflow: number;
  cumulativeCashflow: number;
}
