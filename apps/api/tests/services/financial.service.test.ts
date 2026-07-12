import { describe, expect, it } from "vitest";
import {
  buildCashflow,
  calculateDiscountedPaybackYears,
  calculateFinancialIndicators,
  calculateIrr,
  calculateNpv,
  calculateSimplePaybackYears,
} from "../../src/services/financial.service";

describe("FinancialService", () => {
  it("year 0 is investment-only; year 1+ carries escalating gross savings", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 1000,
      maintenanceCostPercent: 0.01,
      firstYearAnnualSavingsUsd: 200,
      annualEscalationRate: 0.028,
      lifetimeYears: 3,
      discountRate: 0.04,
    });

    expect(cashflow).toHaveLength(4);
    expect(cashflow[0]).toMatchObject({ year: 0, capex: 1000, grossSavings: 0 });
    expect(cashflow[1]?.grossSavings).toBeCloseTo(200, 6);
    // linear escalation: base * (1 + rate*(yearIndex-1))
    expect(cashflow[2]?.grossSavings).toBeCloseTo(200 * (1 + 0.028), 6);
    expect(cashflow[3]?.grossSavings).toBeCloseTo(200 * (1 + 0.028 * 2), 6);
    expect(cashflow[1]?.maintenanceCost).toBeCloseTo(10, 6);
  });

  it("computes a 10% IRR for a simple one-year -100/+110 cash flow", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 100,
      maintenanceCostPercent: 0,
      firstYearAnnualSavingsUsd: 110,
      annualEscalationRate: 0,
      lifetimeYears: 1,
      discountRate: 0,
    });

    expect(calculateIrr(cashflow)).toBeCloseTo(0.1, 6);
  });

  it("NPV at 0% discount rate equals the undiscounted sum of net cash flows", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 100,
      maintenanceCostPercent: 0,
      firstYearAnnualSavingsUsd: 40,
      annualEscalationRate: 0,
      lifetimeYears: 3,
      discountRate: 0,
    });

    const undiscountedSum = cashflow.reduce((sum, y) => sum + y.netCashflow, 0);
    expect(calculateNpv(cashflow)).toBeCloseTo(undiscountedSum, 6);
  });

  it("simple payback is investment / first-year savings, null when savings are zero", () => {
    expect(calculateSimplePaybackYears(1000, 200)).toBeCloseTo(5, 6);
    expect(calculateSimplePaybackYears(1000, 0)).toBeNull();
  });

  it("discounted payback interpolates within the year cumulative cash flow turns positive", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 100,
      maintenanceCostPercent: 0,
      firstYearAnnualSavingsUsd: 40,
      annualEscalationRate: 0,
      lifetimeYears: 5,
      discountRate: 0,
    });

    const payback = calculateDiscountedPaybackYears(cashflow);
    expect(payback).not.toBeNull();
    expect(payback).toBeGreaterThan(2);
    expect(payback).toBeLessThan(3);
  });

  it("returns null discounted payback when the measure never pays back within the horizon", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 10000,
      maintenanceCostPercent: 0,
      firstYearAnnualSavingsUsd: 10,
      annualEscalationRate: 0,
      lifetimeYears: 5,
      discountRate: 0.04,
    });

    expect(calculateDiscountedPaybackYears(cashflow)).toBeNull();
  });

  it("calculateFinancialIndicators bundles cashflow + npv/irr/payback consistently", () => {
    const { cashflow, indicators } = calculateFinancialIndicators({
      investmentCostUsd: 5000,
      maintenanceCostPercent: 0.02,
      firstYearAnnualSavingsUsd: 800,
      annualEscalationRate: 0.028,
      lifetimeYears: 20,
      discountRate: 0.04,
    });

    expect(indicators.analysisHorizonYears).toBe(20);
    expect(indicators.discountRate).toBe(0.04);
    expect(indicators.npv).toBeCloseTo(calculateNpv(cashflow), 6);
    expect(indicators.simplePaybackYears).toBeCloseTo(5000 / 800, 6);
  });
});
