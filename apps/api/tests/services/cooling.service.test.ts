import { describe, expect, it } from "vitest";
import {
  calculateCoolingResult,
  calculateCoolingSolarGainsKwh,
} from "../../src/services/cooling.service";

describe("CoolingService", () => {
  it("sums window solar gains as area × g-value × shading × radiation", () => {
    const gains = calculateCoolingSolarGainsKwh(
      [
        { orientation: "south", areaM2: 10, gValue: 0.75, shadingFactor: 0.8 },
        { orientation: "east", areaM2: 5, gValue: 0.75, shadingFactor: 0.8 },
      ],
      new Map([
        ["south", 400],
        ["east", 200],
      ]),
    );

    expect(gains).toBeCloseTo(10 * 0.75 * 0.8 * 400 + 5 * 0.75 * 0.8 * 200, 6);
  });

  it("divides cooling load by SEER to get electrical energy for cooling", () => {
    const result = calculateCoolingResult("before", 3000, 1000, 3.2);
    expect(result.totalCoolingLoadKwh).toBeCloseTo(4000, 6);
    expect(result.electricalEnergyForCoolingKwh).toBeCloseTo(4000 / 3.2, 6);
  });

  it("a higher SEER after renovation reduces electrical energy for the same load", () => {
    const before = calculateCoolingResult("before", 3000, 1000, 3.2);
    const after = calculateCoolingResult("after", 3000, 1000, 8.5);
    expect(after.electricalEnergyForCoolingKwh).toBeLessThan(before.electricalEnergyForCoolingKwh);
  });
});
