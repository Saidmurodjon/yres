import { describe, expect, it } from "vitest";
import { calculateDhwDemand, calculateDhwSourceAnnualKwh } from "../../src/services/dhw.service";

describe("DhwService", () => {
  it("matches the DHW generation sheet's K = D*E*((F*G)+(H*I))*J/1000 formula", () => {
    // 15 L/person/day, 13 persons, 163-day heating season (docs/data-dictionary.md defaults).
    const kwh = calculateDhwSourceAnnualKwh(
      { specificConsumptionLPersonDay: 15, personsServed: 13 },
      163,
    );
    // ΔTwinter=55, ΔTsummer=45, daysOutside=202
    // 15*13*((55*163)+(45*202))*1.163/1000 = 4094.603175
    expect(kwh).toBeCloseTo(4094.6, 1);
  });

  it("splits demand by energy carrier into electrical vs. other", () => {
    const result = calculateDhwDemand(
      "before",
      [
        { specificConsumptionLPersonDay: 15, personsServed: 13, energyCarrier: "electricity" },
        { specificConsumptionLPersonDay: 10, personsServed: 5, energyCarrier: "gas" },
      ],
      163,
    );

    const electricalOnly = calculateDhwSourceAnnualKwh(
      { specificConsumptionLPersonDay: 15, personsServed: 13 },
      163,
    );
    const otherOnly = calculateDhwSourceAnnualKwh(
      { specificConsumptionLPersonDay: 10, personsServed: 5 },
      163,
    );

    expect(result.electricalKwh).toBeCloseTo(electricalOnly, 6);
    expect(result.otherKwh).toBeCloseTo(otherOnly, 6);
    expect(result.totalKwh).toBeCloseTo(electricalOnly + otherOnly, 6);
    expect(result.scenario).toBe("before");
  });

  it("with working days follows v7.20: 163 heating days / 250 working days → 112 winter + 138 summer", () => {
    // DHW generation!K5: 3 l × 360 × (55·112 + 45·138) × 1.163 / 1000 = 15 537.2148
    const kwh = calculateDhwSourceAnnualKwh(
      { specificConsumptionLPersonDay: 3, personsServed: 360 },
      163,
      250,
    );
    expect(kwh).toBeCloseTo(15_537.2148, 3);
    // DHW generation!K6 + K5 = K16 = 22 212.46264
    const staff = calculateDhwSourceAnnualKwh(
      { specificConsumptionLPersonDay: 8, personsServed: 58 },
      163,
      250,
    );
    expect(kwh + staff).toBeCloseTo(22_212.46264, 4);
  });

  it("null working days keeps the calendar split", () => {
    const source = { specificConsumptionLPersonDay: 3, personsServed: 360 };
    expect(calculateDhwSourceAnnualKwh(source, 163, null)).toBe(
      calculateDhwSourceAnnualKwh(source, 163),
    );
  });
});
