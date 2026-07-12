import { describe, expect, it } from "vitest";
import { calculateLightingResult } from "../../src/services/lighting.service";

describe("LightingService", () => {
  it("matches the Lighting sheet's L = (D*I*J*K)/1000 formula for a single zone", () => {
    // 500 m² lit area, 100% LED (7.4 W/m²), 163-day heating season at 10 h/day
    // (operationHoursDuringHeatingSeason = 1630 h/y), utilization 0.55 (after).
    const result = calculateLightingResult(
      "after",
      [
        {
          areaM2: 500,
          technologyMix: {
            incandescentFraction: 0,
            fluorescentElectromagneticFraction: 0,
            fluorescentElectronicFraction: 0,
            ledFraction: 1,
          },
          utilizationFactor: 0.55,
        },
      ],
      { incandescent: 25, fluorescentElectromagnetic: 17.8, fluorescentElectronic: 14.81, led: 7.4 },
      1630,
    );

    // (500 * 7.4 * 1630 * 0.55) / 1000 = 3317.05
    expect(result.annualConsumptionKwh).toBeCloseTo(3317.05, 1);
    expect(result.scenario).toBe("after");
  });

  it("weights power density by technology-mix fractions and sums across zones", () => {
    const lampPowerDensity = {
      incandescent: 25,
      fluorescentElectromagnetic: 17.8,
      fluorescentElectronic: 14.81,
      led: 7.4,
    };
    const result = calculateLightingResult(
      "before",
      [
        {
          areaM2: 200,
          technologyMix: {
            incandescentFraction: 0.5,
            fluorescentElectromagneticFraction: 0.5,
            fluorescentElectronicFraction: 0,
            ledFraction: 0,
          },
          utilizationFactor: 0.3,
        },
        {
          areaM2: 100,
          technologyMix: {
            incandescentFraction: 0,
            fluorescentElectromagneticFraction: 0,
            fluorescentElectronicFraction: 0,
            ledFraction: 1,
          },
          utilizationFactor: 0.3,
        },
      ],
      lampPowerDensity,
      1630,
    );

    // Zone 1: weighted density = 0.5*25 + 0.5*17.8 = 21.4 W/m²
    //   (200 * 21.4 * 1630 * 0.3) / 1000 = 2092.92
    // Zone 2: (100 * 7.4 * 1630 * 0.3) / 1000 = 361.86
    expect(result.annualConsumptionKwh).toBeCloseTo(2092.92 + 361.86, 1);
  });

  it("returns 0 for a scenario with no lighting zones", () => {
    const result = calculateLightingResult(
      "before",
      [],
      { incandescent: 25, fluorescentElectromagnetic: 17.8, fluorescentElectronic: 14.81, led: 7.4 },
      1630,
    );
    expect(result.annualConsumptionKwh).toBe(0);
  });
});
