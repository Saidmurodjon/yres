import { describe, expect, it } from "vitest";
import {
  calculateGainUtilizationFactor,
  calculateHeatingEnergyBalance,
} from "../../src/services/gain.service";

describe("GainService", () => {
  describe("calculateGainUtilizationFactor", () => {
    it("returns the a/(a+1) limit when gain/loss ratio is exactly 1 (0/0 case)", () => {
      expect(calculateGainUtilizationFactor(1, 4.2)).toBeCloseTo(4.2 / 5.2, 10);
    });

    it("returns ~1 when there are no gains relative to losses", () => {
      expect(calculateGainUtilizationFactor(0, 4.2)).toBeCloseTo(1, 10);
    });

    it("returns a value between 0 and 1 for a typical ratio", () => {
      const factor = calculateGainUtilizationFactor(0.7, 4.2);
      expect(factor).toBeGreaterThan(0);
      expect(factor).toBeLessThan(1);
    });

    it("uses a higher thermal inertia parameter after renovation without breaking bounds", () => {
      const before = calculateGainUtilizationFactor(0.8, 4.2);
      const after = calculateGainUtilizationFactor(0.8, 5);
      expect(before).toBeGreaterThanOrEqual(0);
      expect(before).toBeLessThanOrEqual(1);
      expect(after).toBeGreaterThanOrEqual(0);
      expect(after).toBeLessThanOrEqual(1);
    });
  });

  describe("calculateHeatingEnergyBalance", () => {
    it("nets gains against losses via the utilization factor, floored at zero", () => {
      const result = calculateHeatingEnergyBalance({
        scenario: "before",
        apertures: [
          {
            orientationGroup: "south",
            windowAreaM2: 10,
            gValue: 0.75,
            frameFactor: 0.6,
            shadingFactor: 1,
          },
        ],
        monthlyClimate: [{ month: 1, avgOutdoorTempC: 0, heatingDays: 31 }],
        monthlySolarRadiation: [
          {
            month: 1,
            radiationKwhM2ByOrientation: {
              south: 50,
              north: 10,
              east_west: 20,
              se_sw: 30,
              ne_nw: 15,
              horizontal: 40,
            },
          },
        ],
        heatedFloorAreaM2: 500,
        internalGainSpecificWPerM2: 6,
        monthlyLossesKwh: new Map([[1, 2000]]),
        thermalInertiaParamA: 4.2,
      });

      const month = result.monthly[0];
      expect(month).toBeDefined();
      // internal gains = 6 * 31 * 24 * 500 / 1000 = 2232
      expect(month?.internalGainsKwh).toBeCloseTo(2232, 6);
      // solar aperture = 0.75*0.6*(1-0.3)*10 = 3.15; gain = 3.15*50 = 157.5
      expect(month?.solarGainsKwh).toBeCloseTo(157.5, 6);
      expect(month?.netEnergyNeedKwh).toBeGreaterThanOrEqual(0);
      expect(result.annualNetEnergyNeedKwh).toBeGreaterThanOrEqual(0);
    });

    it("never returns a negative net energy need even when gains exceed losses", () => {
      const result = calculateHeatingEnergyBalance({
        scenario: "after",
        apertures: [],
        monthlyClimate: [{ month: 3, avgOutdoorTempC: 10, heatingDays: 31 }],
        monthlySolarRadiation: [],
        heatedFloorAreaM2: 10000,
        internalGainSpecificWPerM2: 6,
        monthlyLossesKwh: new Map([[3, 100]]),
        thermalInertiaParamA: 5,
      });

      expect(result.monthly[0]?.netEnergyNeedKwh).toBeCloseTo(0, 6);
    });
  });
});
