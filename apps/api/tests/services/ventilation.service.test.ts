import { describe, expect, it } from "vitest";
import {
  calculateMechanicalAirFlowM3h,
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
});
