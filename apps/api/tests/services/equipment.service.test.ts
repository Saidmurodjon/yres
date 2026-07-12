import { describe, expect, it } from "vitest";
import { calculateEquipmentResult } from "../../src/services/equipment.service";

describe("EquipmentService", () => {
  it("matches the Equipment sheet's K = F*G*I + F*H*J formula for a single item", () => {
    // 0.2 kW unit power, 10 units -> F=2 kW total.
    // Heating season: 1630 h at 0.8 utilization. Cooling season: 500 h at 0.6 utilization.
    const result = calculateEquipmentResult("before", [
      {
        unitPowerKw: 0.2,
        quantity: 10,
        heatingSeasonHours: 1630,
        coolingSeasonHours: 500,
        heatingUtilizationFactor: 0.8,
        coolingUtilizationFactor: 0.6,
      },
    ]);

    // F=2; heating: 2*1630*0.8=2608; cooling: 2*500*0.6=600; total=3208
    expect(result.annualConsumptionKwh).toBeCloseTo(3208, 6);
    // M = F*H*J = 600 (cooling-season-only, fed into Cooling as internal gain)
    expect(result.coolingSeasonConsumptionKwh).toBeCloseTo(600, 6);
    expect(result.scenario).toBe("before");
  });

  it("sums across multiple items", () => {
    const result = calculateEquipmentResult("after", [
      {
        unitPowerKw: 1,
        quantity: 1,
        heatingSeasonHours: 100,
        coolingSeasonHours: 50,
        heatingUtilizationFactor: 1,
        coolingUtilizationFactor: 1,
      },
      {
        unitPowerKw: 2,
        quantity: 1,
        heatingSeasonHours: 100,
        coolingSeasonHours: 50,
        heatingUtilizationFactor: 1,
        coolingUtilizationFactor: 1,
      },
    ]);

    // Item 1: 100+50=150. Item 2: 2*(100+50)=300. Total=450.
    expect(result.annualConsumptionKwh).toBeCloseTo(450, 6);
    // Item 1 cooling: 50. Item 2 cooling: 100. Total=150.
    expect(result.coolingSeasonConsumptionKwh).toBeCloseTo(150, 6);
  });

  it("returns 0 for a scenario with no equipment items", () => {
    const result = calculateEquipmentResult("before", []);
    expect(result.annualConsumptionKwh).toBe(0);
    expect(result.coolingSeasonConsumptionKwh).toBe(0);
  });
});
