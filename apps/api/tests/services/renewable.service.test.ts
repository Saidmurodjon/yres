import { describe, expect, it } from "vitest";
import {
  calculateRenewableBalance,
  calculateRenewableProduction,
} from "../../src/services/renewable.service";

describe("RenewableService", () => {
  it("sums monthly production per system type, matching PV!C25/Solar DHW!I13's annual totals", () => {
    const result = calculateRenewableProduction([
      {
        systemType: "pv",
        monthlyProductionKwh: [910, 1100, 1300, 1450, 1600, 1623, 1600, 1500, 1300, 1100, 950, 910],
      },
      { systemType: "solar_dhw", monthlyProductionKwh: Array(12).fill(660.65) },
    ]);

    const pv = result.find((r) => r.systemType === "pv");
    const solarDhw = result.find((r) => r.systemType === "solar_dhw");
    expect(pv?.annualProductionKwh).toBeCloseTo(15343, 0);
    expect(solarDhw?.annualProductionKwh).toBeCloseTo(7927.8, 1);
  });

  it("sums multiple systems of the same type together", () => {
    const result = calculateRenewableProduction([
      { systemType: "pv", monthlyProductionKwh: [100, 200] },
      { systemType: "pv", monthlyProductionKwh: [50, 50] },
    ]);
    expect(result.find((r) => r.systemType === "pv")?.annualProductionKwh).toBe(400);
  });

  it("always returns both system types, 0 kWh if the building has none", () => {
    const result = calculateRenewableProduction([]);
    expect(result).toHaveLength(2);
    expect(result.every((r) => r.annualProductionKwh === 0)).toBe(true);
  });
});

describe("calculateRenewableBalance (PV!C34:C36)", () => {
  it("exports the surplus when the production exceeds the demand", () => {
    const b = calculateRenewableBalance(150_954.94, 77_855.28);
    expect(b.selfConsumedKwh).toBeCloseTo(77_855.28, 2);
    expect(b.exportedKwh).toBeCloseTo(73_099.66, 2);
    expect(b.coverageRatio).toBeCloseTo(1.939, 3);
  });

  it("exports nothing when the production is below the demand", () => {
    const b = calculateRenewableBalance(10_000, 40_000);
    expect(b.selfConsumedKwh).toBe(10_000);
    expect(b.exportedKwh).toBe(0);
  });

  it("has no coverage ratio without a demand, and never self-consumes a negative amount", () => {
    const b = calculateRenewableBalance(5_000, 0);
    expect(b.selfConsumedKwh).toBe(0);
    expect(b.exportedKwh).toBe(5_000);
    expect(b.coverageRatio).toBeNull();
  });
});
