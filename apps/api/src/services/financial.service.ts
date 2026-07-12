import type { CashflowYear, FinancialIndicators } from "@yres/types";

export const DEFAULT_DISCOUNT_RATE = 0.04;
export const DEFAULT_LIFETIME_YEARS = 20;

/**
 * Annual fuel-price escalation rate by energy carrier, per the `Financial
 * indicators` sheet's own footnotes (footnote #4: 2.8% gas / 2%
 * electricity). The workbook's walls/heating-adjacent block actually uses
 * an anomalous 8% that matches none of its own footnotes (see
 * docs/data-dictionary.md, Ambiguities #7) — treated as a copy-paste error
 * and NOT replicated here; these documented rates are used for every
 * carrier instead. Revisit with the domain expert if 8% was intentional.
 */
export const ENERGY_ESCALATION_RATES: Record<string, number> = {
  gas: 0.028,
  electricity: 0.02,
  district_heat: 0.028,
  coal: 0.028,
};

export interface CashflowInput {
  investmentCostUsd: number;
  /** Annual maintenance cost as a fraction of *this measure's own* investment — the workbook's later blocks bug-reference the first block's investment cell (docs/data-dictionary.md, Ambiguities #8); not replicated here. */
  maintenanceCostPercent: number;
  /** Annual savings in the first year they occur (year index 1). */
  firstYearAnnualSavingsUsd: number;
  annualEscalationRate: number;
  lifetimeYears: number;
  discountRate: number;
}

/**
 * Year 0 = investment year (capex only). Years 1..lifetime = operating
 * years with linearly escalating gross savings (`Financial indicators`
 * sheet: `savings(year) = base * (1 + rate*(year-1))` — additive, not
 * compound, per the workbook's own formula pattern).
 */
export function buildCashflow(input: CashflowInput): CashflowYear[] {
  const years: CashflowYear[] = [];
  let cumulativeDiscountedCashflow = 0;

  for (let yearIndex = 0; yearIndex <= input.lifetimeYears; yearIndex++) {
    const capex = yearIndex === 0 ? input.investmentCostUsd : 0;
    const grossSavings =
      yearIndex === 0
        ? 0
        : input.firstYearAnnualSavingsUsd * (1 + input.annualEscalationRate * (yearIndex - 1));
    const maintenanceCost =
      yearIndex === 0 ? 0 : input.investmentCostUsd * input.maintenanceCostPercent;
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
export function calculateIrr(cashflow: CashflowYear[], initialGuess = 0.1): number | null {
  const flows = cashflow.map((y) => y.netCashflow);
  if (flows.every((flow) => flow === 0)) return null;

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

  return {
    cashflow,
    indicators: {
      npv: calculateNpv(cashflow),
      irr: calculateIrr(cashflow),
      simplePaybackYears: calculateSimplePaybackYears(
        input.investmentCostUsd,
        input.firstYearAnnualSavingsUsd,
      ),
      discountedPaybackYears: calculateDiscountedPaybackYears(cashflow),
      discountRate: input.discountRate,
      analysisHorizonYears: input.lifetimeYears,
    },
  };
}

export function calculateCo2ReductionTonnesPerYear(
  annualSavingsKwh: number,
  emissionFactorKgCo2PerKwh: number,
): number {
  return (annualSavingsKwh * emissionFactorKgCo2PerKwh) / 1000;
}
