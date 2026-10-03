import { describe, expect, it } from "vitest";
import { defaultFinancialParameters } from "../../src/lib/financial-defaults";
import {
  buildCashflow,
  calculateDiscountedPaybackYears,
  calculateFinancialIndicators,
  calculateIrr,
  calculateNpv,
  calculateSimplePaybackYears,
  deriveFinancialAssumptions,
} from "../../src/services/financial.service";

describe("FinancialService", () => {
  it("year 0 is investment-only; year 1+ carries escalating gross savings", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 1000,
      maintenanceRate: 0.01,
      savingsUsdByCarrier: { electricity: 200 },
      escalationByCarrier: { electricity: 0.028 },
      maintenanceEscalation: 0,
      periodYears: 3,
      discountRate: 0.04,
    });

    expect(cashflow).toHaveLength(4);
    expect(cashflow[0]).toMatchObject({ year: 0, capex: 1000, grossSavings: 0 });
    expect(cashflow[1]?.grossSavings).toBeCloseTo(200, 6);
    // compound escalation: base * (1 + rate)^(yearIndex-1)
    expect(cashflow[2]?.grossSavings).toBeCloseTo(200 * 1.028, 6);
    expect(cashflow[3]?.grossSavings).toBeCloseTo(200 * 1.028 ** 2, 6);
    expect(cashflow[1]?.maintenanceCost).toBeCloseTo(10, 6);
  });

  it("computes a 10% IRR for a simple one-year -100/+110 cash flow", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 100,
      maintenanceRate: 0,
      savingsUsdByCarrier: { electricity: 110 },
      escalationByCarrier: { electricity: 0 },
      maintenanceEscalation: 0,
      periodYears: 1,
      discountRate: 0,
    });

    expect(calculateIrr(cashflow)).toBeCloseTo(0.1, 6);
  });

  it("NPV at 0% discount rate equals the undiscounted sum of net cash flows", () => {
    const cashflow = buildCashflow({
      investmentCostUsd: 100,
      maintenanceRate: 0,
      savingsUsdByCarrier: { electricity: 40 },
      escalationByCarrier: { electricity: 0 },
      maintenanceEscalation: 0,
      periodYears: 3,
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
      maintenanceRate: 0,
      savingsUsdByCarrier: { electricity: 40 },
      escalationByCarrier: { electricity: 0 },
      maintenanceEscalation: 0,
      periodYears: 5,
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
      maintenanceRate: 0,
      savingsUsdByCarrier: { electricity: 10 },
      escalationByCarrier: { electricity: 0 },
      maintenanceEscalation: 0,
      periodYears: 5,
      discountRate: 0.04,
    });

    expect(calculateDiscountedPaybackYears(cashflow)).toBeNull();
  });

  it("calculateFinancialIndicators bundles cashflow + npv/irr/payback consistently", () => {
    const { cashflow, indicators } = calculateFinancialIndicators({
      investmentCostUsd: 5000,
      maintenanceRate: 0.02,
      savingsUsdByCarrier: { electricity: 800 },
      escalationByCarrier: { electricity: 0.028 },
      maintenanceEscalation: 0,
      periodYears: 20,
      discountRate: 0.0608,
    });

    expect(indicators.analysisHorizonYears).toBe(20);
    expect(indicators.discountRate).toBe(0.0608);
    expect(indicators.npv).toBeCloseTo(calculateNpv(cashflow), 6);
    expect(indicators.simplePaybackYears).toBeCloseTo(5000 / 800, 6);
  });

  describe("v7.20 model (Financial indicators blocks 1 and 15)", () => {
    const a = deriveFinancialAssumptions({
      ...defaultFinancialParameters(new Date("2026-06-01")),
      baseYear: 2027,
    });

    it("derives the nominal rates and USD/kWh tariffs of Financial parameters / Measures_summary", () => {
      expect(a.nominalDiscountRate).toBeCloseTo(0.0608, 10);
      expect(a.nominalEscalation.gas).toBeCloseTo(0.04856, 10);
      expect(a.nominalEscalation.electricity).toBeCloseTo(0.0404, 10);
      expect(a.usdPerKwh.gas).toBeCloseTo(0.01734, 5);
      expect(a.usdPerKwh.electricity).toBeCloseTo(0.090603, 6);
      expect(a.usdPerKwh.district_heat).toBeCloseTo(0.075577, 6);
      expect(a.usdPerKwh.coal).toBeNull();
    });

    it("measure 15 (PV): NPV 158 731.35, IRR 29.977 %, year 2 savings x1.0404", () => {
      const { cashflow, indicators } = calculateFinancialIndicators({
        investmentCostUsd: 50_331.61,
        maintenanceRate: 0.01,
        savingsUsdByCarrier: { electricity: 13_676.93 },
        escalationByCarrier: a.nominalEscalation,
        maintenanceEscalation: a.maintenanceEscalation,
        periodYears: a.periodYears,
        discountRate: a.nominalDiscountRate,
        irrInitialGuess: a.irrInitialGuess,
      });
      expect(cashflow[1]?.maintenanceCost).toBeCloseTo(503.32, 2);
      expect(cashflow[2]?.grossSavings).toBeCloseTo(14_229.5, 1);
      expect(indicators.npv).toBeCloseTo(158_731.35, 0);
      expect(indicators.irr).toBeCloseTo(0.29977, 4);
      // The workbook reports 5.18 (MATCH off by one, K21); the engine's 4.18 is the correct value.
      expect(indicators.discountedPaybackYears).toBeCloseTo(4.18, 2);
    });

    it("measure 1 (walls, gas): NPV -192 678.70, no IRR", () => {
      const { indicators } = calculateFinancialIndicators({
        investmentCostUsd: 229_201.98,
        maintenanceRate: 0,
        savingsUsdByCarrier: { gas: 2158.1585916809872 },
        escalationByCarrier: a.nominalEscalation,
        maintenanceEscalation: a.maintenanceEscalation,
        periodYears: a.periodYears,
        discountRate: a.nominalDiscountRate,
        irrInitialGuess: a.irrInitialGuess,
      });
      expect(indicators.npv).toBeCloseTo(-192_678.7, 0);
      expect(indicators.irr).toBeNull();
    });

    it("IRR is null when the undiscounted net flows do not repay the investment; CAPEX 0 has no IRR", () => {
      const base = {
        maintenanceRate: 0,
        escalationByCarrier: {},
        maintenanceEscalation: 0,
        periodYears: 5,
        discountRate: 0.05,
      };
      expect(
        calculateFinancialIndicators({
          ...base,
          investmentCostUsd: 1000,
          savingsUsdByCarrier: { gas: 10 },
        }).indicators.irr,
      ).toBeNull();
      expect(
        calculateFinancialIndicators({
          ...base,
          investmentCostUsd: 0,
          savingsUsdByCarrier: { gas: 10 },
        }).indicators.irr,
      ).toBeNull();
    });
  });
});
