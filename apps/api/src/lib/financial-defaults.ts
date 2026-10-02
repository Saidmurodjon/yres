/** v7.20 `Financial parameters!D5:D23` — used when a building has no saved row (K2: nominal 6.08 %, K4: PV export off). */
export interface FinancialParametersValues {
  baseYear: number;
  periodYears: number;
  inflationRate: number;
  realDiscountRate: number;
  realEscalationGas: number;
  realEscalationElectricity: number;
  realEscalationHeat: number;
  exchangeRateUzsPerUsd: number;
  gasTariffUzsPerM3: number;
  gasNcvKwhPerM3: number;
  electricityTariffUzsPerKwh: number;
  heatTariffUzsPerGcal: number;
  coalPriceUzsPerT: number | null;
  coalNcvKwhPerKg: number | null;
  pvExportEnabled: boolean;
  pvExportTariffUzsPerKwh: number;
  irrInitialGuess: number;
  tariffSource: string | null;
  tariffEffectiveDate: string | null;
}

export function defaultFinancialParameters(now = new Date()): FinancialParametersValues {
  return {
    baseYear: now.getUTCFullYear() + 1,
    periodYears: 20,
    inflationRate: 0.02,
    realDiscountRate: 0.04,
    realEscalationGas: 0.028,
    realEscalationElectricity: 0.02,
    realEscalationHeat: 0.02,
    exchangeRateUzsPerUsd: 12140.91,
    gasTariffUzsPerM3: 2000,
    gasNcvKwhPerM3: 9.5,
    electricityTariffUzsPerKwh: 1100,
    heatTariffUzsPerGcal: 1067132.64,
    // No source for the coal NCV: a coal measure gets a warning, not a silent 0.
    coalPriceUzsPerT: 1200000,
    coalNcvKwhPerKg: null,
    pvExportEnabled: false,
    pvExportTariffUzsPerKwh: 1100,
    irrInitialGuess: 0.05,
    tariffSource: null,
    tariffEffectiveDate: null,
  };
}
