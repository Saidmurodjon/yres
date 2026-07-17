import { describe, expect, it } from "vitest";
import {
  calculateMechanicalAirFlowM3h,
  calculateMechanicalVentilationCoolingGainKwh,
  calculateNaturalAirFlowM3h,
  calculateVentilationLoss,
} from "../../src/services/ventilation.service";

describe("VentilationService", () => {
  it("computes natural air flow as volume × ACH", () => {
    expect(calculateNaturalAirFlowM3h(7546.245, 0.4)).toBeCloseTo(7546.245 * 0.4, 6);
  });

  it("computes mechanical air flow as fresh-air-per-person × occupants", () => {
    expect(calculateMechanicalAirFlowM3h(20, 418)).toBeCloseTo(8360, 6);
  });

  it("heat recovery reduces mechanical loss but not natural loss", () => {
    const buildingParams = {
      indoorTempOperationC: 22,
      indoorTempNonOperationC: 14,
      operationHoursPerDay: 10,
      nonOperationHoursPerDay: 14,
    };
    const monthlyClimate = [{ month: 1, avgOutdoorTempC: 0, heatingDays: 31 }];

    const noRecovery = calculateVentilationLoss(
      "before",
      1000,
      1000,
      0,
      monthlyClimate,
      buildingParams,
    );
    const withRecovery = calculateVentilationLoss(
      "after",
      1000,
      1000,
      0.85,
      monthlyClimate,
      buildingParams,
    );

    expect(withRecovery.naturalAnnualKwh).toBeCloseTo(noRecovery.naturalAnnualKwh, 6);
    expect(withRecovery.mechanicalAnnualKwh).toBeCloseTo(noRecovery.mechanicalAnnualKwh * 0.15, 6);
  });

  describe("calculateMechanicalVentilationCoolingGainKwh", () => {
    // Building_data's own sample enthalpies: inside 48.4, outside 59.5 kJ/kg (Δ = 11.1).
    it("matches the `Heat gains Mec Vent` sheet's enthalpy-difference formula", () => {
      const gain = calculateMechanicalVentilationCoolingGainKwh(1000, 48.4, 59.5, 500, 0);
      expect(gain).toBeCloseTo((1000 * 1.2 * 0.277778 * 11.1 * 500) / 1000, 3);
    });

    it("heat recovery reduces the cooling-season gain the same way it reduces heating loss", () => {
      const noRecovery = calculateMechanicalVentilationCoolingGainKwh(1000, 48.4, 59.5, 500, 0);
      const withRecovery = calculateMechanicalVentilationCoolingGainKwh(1000, 48.4, 59.5, 500, 0.85);
      expect(withRecovery).toBeCloseTo(noRecovery * 0.15, 6);
    });

    it("never returns a negative gain if outside enthalpy is somehow below inside", () => {
      const gain = calculateMechanicalVentilationCoolingGainKwh(1000, 59.5, 48.4, 500, 0);
      expect(gain).toBe(0);
    });
  });
});
