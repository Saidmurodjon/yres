import { describe, expect, it } from "vitest";
import {
  calculateFinalEnergyConsumptionKwh,
  calculateUnpipedDistributionLossKwh,
} from "../../src/services/generation.service";

describe("GenerationService", () => {
  it("gas boiler: (Q+Qd)/η reproduces v7.20 Overall gener. & distrib. eff.!H7", () => {
    // D7 = 251 383.25, F7 = 36 772.8, G7 = 0.58 → H7 = 496 820.78
    expect(calculateFinalEnergyConsumptionKwh(251_383.25, 36_772.8, 0.58)).toBeCloseTo(
      496_820.78,
      1,
    );
  });

  it("heat pump: COP 3.1109 gives positive final energy (v7.20 N7 = 11 708.07)", () => {
    const result = calculateFinalEnergyConsumptionKwh(36_420.0, 0, 3.1109);
    expect(result).toBeGreaterThan(0);
    expect(calculateFinalEnergyConsumptionKwh(11_708.07 * 3.1109, 0, 3.1109)).toBeCloseTo(
      11_708.07,
      2,
    );
  });

  it("final energy is never negative for any efficiency/COP > 0", () => {
    for (const eta of [0.3, 0.58, 1, 2, 3.1109, 5, 12]) {
      expect(calculateFinalEnergyConsumptionKwh(1000, 100, eta)).toBeGreaterThan(0);
    }
  });

  it("rejects η <= 0 or non-finite", () => {
    expect(() => calculateFinalEnergyConsumptionKwh(1000, 100, 0)).toThrow(RangeError);
    expect(() => calculateFinalEnergyConsumptionKwh(1000, 100, -1)).toThrow(RangeError);
    expect(() => calculateFinalEnergyConsumptionKwh(1000, 100, Number.NaN)).toThrow(RangeError);
  });

  it("unpiped distribution loss = need × (1 − η); null means none", () => {
    // v7.20 F11 = D11·(1 − 0.98·0.85)
    expect(calculateUnpipedDistributionLossKwh(1000, 0.98 * 0.85)).toBeCloseTo(167, 6);
    expect(calculateUnpipedDistributionLossKwh(1000, null)).toBe(0);
    expect(calculateUnpipedDistributionLossKwh(1000, 1)).toBe(0);
  });
});
