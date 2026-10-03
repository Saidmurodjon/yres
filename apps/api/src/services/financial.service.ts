import type {
  CashflowYear,
  EnergyCarrier,
  FinancialAssumptions,
  FinancialIndicators,
} from "@yres/types";
import type { FinancialParametersValues } from "../lib/financial-defaults";

const KWH_PER_GCAL = 1163;

/**
 * v7.20 `Financial parameters` sheet: nominal rates are Fisher-derived from the real inputs
 * (`D9 = (1+D8)(1+D7)-1`, `D13 = (1+D10)(1+D7)-1`, `D14`), and USD/kWh tariffs follow
 * `Measures_summary!D45:F45`. A carrier whose tariff cannot be computed (coal without NCV) gets
 * `null` — never a silent 0.
 */
export function deriveFinancialAssumptions(p: FinancialParametersValues): FinancialAssumptions {
  const nominal = (real: number) => (1 + real) * (1 + p.inflationRate) - 1;
  const rate = p.exchangeRateUzsPerUsd;
  return {
    baseYear: p.baseYear,
    periodYears: p.periodYears,
    inflationRate: p.inflationRate,
    realDiscountRate: p.realDiscountRate,
    nominalDiscountRate: nominal(p.realDiscountRate),
    nominalEscalation: {
      gas: nominal(p.realEscalationGas),
      electricity: nominal(p.realEscalationElectricity),
      district_heat: nominal(p.realEscalationHeat),
      coal: nominal(p.realEscalationHeat),
    },
    maintenanceEscalation: p.inflationRate,
    exchangeRateUzsPerUsd: rate,
    usdPerKwh: {
      gas: p.gasTariffUzsPerM3 / (p.gasNcvKwhPerM3 * rate),
      electricity: p.electricityTariffUzsPerKwh / rate,
      district_heat: p.heatTariffUzsPerGcal / KWH_PER_GCAL / rate,
      coal:
        p.coalPriceUzsPerT != null && p.coalNcvKwhPerKg != null
          ? p.coalPriceUzsPerT / (p.coalNcvKwhPerKg * 1000) / rate
          : null,
    },
    irrInitialGuess: p.irrInitialGuess,
    pvExportEnabled: p.pvExportEnabled,
    pvExportUsdPerKwh: p.pvExportTariffUzsPerKwh / rate,
  };
}

export interface CashflowInput {
  investmentCostUsd: number;
  /** `Measures_summary!R`: annual maintenance as a share of *this measure's* investment. */
  maintenanceRate: number;
  /** First-year gross savings per carrier; each part escalates at its own rate. */
  savingsUsdByCarrier: Partial<Record<EnergyCarrier, number>>;
  /** Nominal escalation per carrier (a carrier missing here does not escalate). */
  escalationByCarrier: Partial<Record<EnergyCarrier, number>>;
  maintenanceEscalation: number;
  /** v7.20 `D6`: the horizon is the calculation period, not the measure's lifetime. */
  periodYears: number;
  /** Nominal discount rate. */
  discountRate: number;
  irrInitialGuess?: number;
}

/**
 * v7.20 model: year 0 = capex; year t = 1..N: gross savings `Σ s_c·(1+g_c)^(t-1)`, maintenance
 * `R·I·(1+m)^(t-1)`, net = gross − maintenance, discounted at the nominal rate.
 */
export function buildCashflow(input: CashflowInput): CashflowYear[] {
  const years: CashflowYear[] = [];
  let cumulativeDiscountedCashflow = 0;

  for (let yearIndex = 0; yearIndex <= input.periodYears; yearIndex++) {
    const capex = yearIndex === 0 ? input.investmentCostUsd : 0;
    let grossSavings = 0;
    if (yearIndex > 0) {
      for (const [carrier, firstYear] of Object.entries(input.savingsUsdByCarrier)) {
        const growth = input.escalationByCarrier[carrier as EnergyCarrier] ?? 0;
        grossSavings += (firstYear ?? 0) * (1 + growth) ** (yearIndex - 1);
      }
    }
    const maintenanceCost =
      yearIndex === 0
        ? 0
        : input.investmentCostUsd *
          input.maintenanceRate *
          (1 + input.maintenanceEscalation) ** (yearIndex - 1);
    const netCashflow = grossSavings - maintenanceCost - capex;
    const discountedNetCashflow = netCashflow / (1 + input.discountRate) ** yearIndex;
    cumulativeDiscountedCashflow += discountedNetCashflow;

    years.push({
      year: yearIndex,
      capex,
      grossSavings,
      maintenanceCost,
      netCashflow,
      discountedNetCashflow,
      cumulativeDiscountedCashflow,
    });
  }

  return years;
}

export function calculateNpv(cashflow: CashflowYear[]): number {
  return cashflow.reduce((sum, y) => sum + y.discountedNetCashflow, 0);
}

/** Newton-Raphson solve for the discount rate that zeroes NPV; null if it doesn't converge. */
export function calculateIrr(cashflow: CashflowYear[], initialGuess = 0.05): number | null {
  const flows = cashflow.map((y) => y.netCashflow);
  // v7.20: no IRR when the undiscounted net flows do not even repay the investment ("n/a (<0)").
  if (flows.every((flow) => flow === 0) || flows.reduce((a, b) => a + b, 0) <= 0) return null;

  let rate = initialGuess;
  for (let iteration = 0; iteration < 100; iteration++) {
    let npv = 0;
    let derivative = 0;
    for (let t = 0; t < flows.length; t++) {
      const flow = flows[t] ?? 0;
      npv += flow / (1 + rate) ** t;
      derivative += (-t * flow) / (1 + rate) ** (t + 1);
    }
    if (Math.abs(npv) < 1e-6) return rate;
    if (derivative === 0) return null;

    const nextRate = rate - npv / derivative;
    if (!Number.isFinite(nextRate) || nextRate <= -1) return null;
    rate = nextRate;
  }

  return null;
}

export function calculateSimplePaybackYears(
  investmentCostUsd: number,
  firstYearAnnualSavingsUsd: number,
): number | null {
  if (firstYearAnnualSavingsUsd <= 0) return null;
  return investmentCostUsd / firstYearAnnualSavingsUsd;
}

/** Linear interpolation within the year the cumulative discounted cash flow first turns non-negative. */
export function calculateDiscountedPaybackYears(cashflow: CashflowYear[]): number | null {
  for (let i = 1; i < cashflow.length; i++) {
    const prev = cashflow[i - 1];
    const curr = cashflow[i];
    if (!prev || !curr) continue;
    if (prev.cumulativeDiscountedCashflow < 0 && curr.cumulativeDiscountedCashflow >= 0) {
      if (curr.discountedNetCashflow === 0) return curr.year;
      const fractionOfYear =
        Math.abs(prev.cumulativeDiscountedCashflow) / curr.discountedNetCashflow;
      return prev.year + fractionOfYear;
    }
  }
  return null;
}

export function calculateFinancialIndicators(input: CashflowInput): {
  cashflow: CashflowYear[];
  indicators: FinancialIndicators;
} {
  const cashflow = buildCashflow(input);
  const firstYearSavingsUsd = Object.values(input.savingsUsdByCarrier).reduce<number>(
    (sum, v) => sum + (v ?? 0),
    0,
  );

  return {
    cashflow,
    indicators: {
      npv: calculateNpv(cashflow),
      irr: input.investmentCostUsd > 0 ? calculateIrr(cashflow, input.irrInitialGuess) : null,
      simplePaybackYears: calculateSimplePaybackYears(input.investmentCostUsd, firstYearSavingsUsd),
      discountedPaybackYears: calculateDiscountedPaybackYears(cashflow),
      discountRate: input.discountRate,
      analysisHorizonYears: input.periodYears,
    },
  };
}

export function calculateCo2ReductionTonnesPerYear(
  annualSavingsKwh: number,
  emissionFactorKgCo2PerKwh: number,
): number {
  return (annualSavingsKwh * emissionFactorKgCo2PerKwh) / 1000;
}
