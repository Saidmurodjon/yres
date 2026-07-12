import { describe, expect, it } from "vitest";
import { calculateFinalEnergyConsumptionKwh } from "../../src/services/generation.service";

describe("GenerationService", () => {
  it("replicates the workbook's (Need+Loss)*(2-Eff) formula, verified against a real cached value", () => {
    // docs/data-dictionary.md, "Overall gener. & distrib. eff." section:
    // gas boiler before renovation — D7=401,153, F7=36,773, G7=0.58 → H7=621,855.
    const result = calculateFinalEnergyConsumptionKwh(401_153, 36_773, 0.58);
    expect(result).toBeCloseTo(621_854.92, 1);
    expect(result).toBeCloseTo((401_153 + 36_773) * (2 - 0.58), 6);
  });

  it("at 100% efficiency, final consumption equals need + distribution loss", () => {
    expect(calculateFinalEnergyConsumptionKwh(1000, 100, 1)).toBeCloseTo(1100, 6);
  });

  it("at 0% efficiency, final consumption doubles need + distribution loss", () => {
    expect(calculateFinalEnergyConsumptionKwh(1000, 100, 0)).toBeCloseTo(2200, 6);
  });
});
