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
    const result = calculateCoolingResult("before", 3000, 1000, 0, 3.2);
    expect(result.totalCoolingLoadKwh).toBeCloseTo(4000, 6);
    expect(result.electricalEnergyForCoolingKwh).toBeCloseTo(4000 / 3.2, 6);
  });

  it("a higher SEER after renovation reduces electrical energy for the same load", () => {
    const before = calculateCoolingResult("before", 3000, 1000, 0, 3.2);
    const after = calculateCoolingResult("after", 3000, 1000, 0, 8.5);
    expect(after.electricalEnergyForCoolingKwh).toBeLessThan(before.electricalEnergyForCoolingKwh);
  });

  it("adds mechanical ventilation's enthalpy gain into the total cooling load", () => {
    const withoutMechVent = calculateCoolingResult("before", 3000, 1000, 0, 3.2);
    const withMechVent = calculateCoolingResult("before", 3000, 1000, 500, 3.2);
    expect(withMechVent.totalCoolingLoadKwh).toBeCloseTo(
      withoutMechVent.totalCoolingLoadKwh + 500,
      6,
    );
    expect(withMechVent.electricalEnergyForCoolingKwh).toBeGreaterThan(
      withoutMechVent.electricalEnergyForCoolingKwh,
    );
  });

  it("adds the distribution loss to the electrical demand: (load + load·(1−η)) ÷ SEER", () => {
    // v7.20 Overall gener. & distrib. eff.!F15/H15: D15 = 63 437.52 kWh, η_dist 0.96, SEER 3.2
    const result = calculateCoolingResult("before", 63_437.52, 0, 0, 3.2, 0.96);
    expect(result.distributionLossKwh).toBeCloseTo(63_437.52 * 0.04, 6);
    expect(result.electricalEnergyForCoolingKwh).toBeCloseTo((63_437.52 * 1.04) / 3.2, 6);
  });

  it("η_dist = 1 (the default) means no distribution loss", () => {
    const result = calculateCoolingResult("before", 3000, 1000, 0, 3.2);
    expect(result.distributionLossKwh).toBe(0);
  });
});
