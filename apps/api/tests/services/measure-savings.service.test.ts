import type { EnvelopeHeatLossResult } from "@yres/types";
import { describe, expect, it } from "vitest";
import {
  type GenerationRow,
  type SavingsContext,
  calculateGainsUtilizationCorrection,
  deriveBaselineHeating,
  resolveMeasureSavings,
} from "../../src/services/measure-savings.service";

const envelope = (
  scenario: "before" | "after",
  byType: Record<string, number>,
): EnvelopeHeatLossResult => {
  const byCategory: Record<string, number> = {};
  for (const [key, kwh] of Object.entries(byType)) {
    const category = key.split(":")[0] ?? key;
    byCategory[category] = (byCategory[category] ?? 0) + kwh;
  }
  return {
    scenario,
    monthly: [],
    annualByCategory: byCategory,
    annualByTypeCode: byType,
    annualTotalKwh: Object.values(byType).reduce((s, v) => s + v, 0),
  };
};

const source = (
  scenario: "before" | "after",
  carrier: GenerationRow["carrier"],
  useful: number,
  efficiency: number,
): GenerationRow => ({
  sourceId: `${scenario}-${carrier}`,
  endUse: "heating",
  scenario,
  usefulEnergyNeedKwh: useful,
  shareOfDemand: 1,
  distributionLossKwh: 0,
  efficiencyOrSeer: efficiency,
  finalEnergyConsumptionKwh: useful / efficiency,
  specificFinalEnergyKwhPerM2: 0,
  carrier,
});

function context(overrides: Partial<SavingsContext> = {}): SavingsContext {
  const generation = [source("before", "gas", 58_000, 0.58)];
  return {
    envelopeHeatLoss: [
      envelope("before", { "external_wall:Wall 1": 50_000, "external_wall:Wall 2": 30_000 }),
      envelope("after", { "external_wall:Wall 1": 10_000, "external_wall:Wall 2": 20_000 }),
    ],
    ventilationLoss: [],
    distributionLoss: [],
    generation,
    lighting: [],
    equipment: [],
    renewableProduction: [],
    heatingEnergyBalance: [],
    dhwDemand: [],
    cooling: [],
    baselineHeating: deriveBaselineHeating(generation),
    gainsUtilizationCorrection: 1,
    emsSavingsRate: 0.03,
    ...overrides,
  };
}

describe("resolveMeasureSavings — envelope attribution by target code", () => {
  it("gives each wall measure only its own type's loss change (no double counting)", () => {
    const ctx = context();
    const m1 = resolveMeasureSavings(
      "envelope_wall_insulation",
      [{ kind: "construction_type", code: "Wall 1" }],
      ctx,
    );
    const m2 = resolveMeasureSavings(
      "envelope_wall_insulation",
      [{ kind: "construction_type", code: "Wall 2" }],
      ctx,
    );
    expect(m1.usefulKwh).toBe(40_000);
    expect(m2.usefulKwh).toBe(10_000);
    // The category delta is 50 000: the two measures add up to it, not to 2 × 50 000.
    expect(m1.usefulKwh + m2.usefulKwh).toBe(50_000);
    // Useful heat is turned into fuel at the baseline η (0.58) on the baseline carrier.
    expect(m1.parts).toEqual([{ carrier: "gas", kwh: 40_000 / 0.58 }]);
  });

  it("an untargeted legacy measure still takes the whole category delta", () => {
    const m = resolveMeasureSavings("envelope_wall_insulation", [], context());
    expect(m.usefulKwh).toBe(50_000);
  });

  it("applies the gains-utilisation correction D71 to envelope measures only", () => {
    const ctx = context({ gainsUtilizationCorrection: 0.9 });
    const wall = resolveMeasureSavings(
      "envelope_wall_insulation",
      [{ kind: "construction_type", code: "Wall 1" }],
      ctx,
    );
    expect(wall.parts[0]?.kwh).toBeCloseTo((40_000 / 0.58) * 0.9, 6);
  });
});

describe("resolveMeasureSavings — mixed-carrier measures", () => {
  it("a heat pump saves gas and spends electricity (negative electric part)", () => {
    const ctx = context({
      generation: [
        source("before", "gas", 58_000, 0.58),
        source("after", "electricity", 58_000, 3),
      ],
    });
    const m = resolveMeasureSavings("gas_boiler_replacement", [], ctx);
    const gas = m.parts.find((p) => p.carrier === "gas");
    const electricity = m.parts.find((p) => p.carrier === "electricity");
    expect(gas?.kwh).toBeCloseTo(58_000 / 0.58, 6);
    expect(electricity?.kwh).toBeCloseTo(-58_000 / 3, 6);
  });

  it("ventilation heat recovery saves heat but the fan adds electricity", () => {
    const ctx = context({
      ventilationLoss: [
        {
          scenario: "before",
          monthly: [],
          naturalAnnualKwh: 0,
          mechanicalAnnualKwh: 20_000,
          mechanicalElectricalKwh: 0,
          totalKwh: 20_000,
        },
        {
          scenario: "after",
          monthly: [],
          naturalAnnualKwh: 0,
          mechanicalAnnualKwh: 5_000,
          mechanicalElectricalKwh: 7_570,
          totalKwh: 12_570,
        },
      ],
    });
    const m = resolveMeasureSavings("mechanical_ventilation_heat_recovery", [], ctx);
    expect(m.parts.find((p) => p.carrier === "gas")?.kwh).toBeCloseTo(15_000 / 0.58, 6);
    expect(m.parts.find((p) => p.carrier === "electricity")?.kwh).toBe(-7_570);
  });
});

describe("calculateGainsUtilizationCorrection", () => {
  it("is 1 when no loss reduction exists", () => {
    expect(calculateGainsUtilizationCorrection([], [envelope("before", {})], [])).toBe(1);
  });

  it("is 1 when the utilised gains do not change", () => {
    const balance = (scenario: "before" | "after") => ({
      scenario,
      annualNetEnergyNeedKwh: 0,
      monthly: [
        {
          month: 1,
          heatingDays: 31,
          outdoorTempC: 0,
          internalGainsKwh: 0,
          solarGainsKwh: 0,
          totalGainsKwh: 1_000,
          totalLossesKwh: 5_000,
          gainToLossRatio: 0.2,
          utilizationFactor: 0.9,
          netEnergyNeedKwh: 0,
        },
      ],
    });
    const factor = calculateGainsUtilizationCorrection(
      [balance("before"), balance("after")],
      [envelope("before", { "roof:R1": 10_000 }), envelope("after", { "roof:R1": 2_000 })],
      [],
    );
    expect(factor).toBe(1);
  });
});
