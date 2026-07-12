import { describe, expect, it } from "vitest";
import { calculateEnvelopeHeatLoss } from "../../src/services/heatloss.service";

describe("HeatLossService", () => {
  it("applies Q = U·A·Δt·t separately for operation and non-operation hours", () => {
    const result = calculateEnvelopeHeatLoss(
      "before",
      [{ category: "external_wall", areaM2: 100, uValueWPerM2K: 1.5 }],
      [{ month: 1, avgOutdoorTempC: 0, heatingDays: 31 }],
      {
        indoorTempOperationC: 22,
        indoorTempNonOperationC: 14,
        operationHoursPerDay: 10,
        nonOperationHoursPerDay: 14,
      },
    );

    // operation: 100 * 1.5 * 22 * (31*10) / 1000 = 1023
    // non-operation: 100 * 1.5 * 14 * (31*14) / 1000 = 911.4
    const month = result.monthly[0];
    expect(month).toBeDefined();
    expect(month?.operationHoursLossKwh).toBeCloseTo(1023, 6);
    expect(month?.nonOperationHoursLossKwh).toBeCloseTo(911.4, 6);
    expect(month?.totalKwh).toBeCloseTo(1934.4, 6);
    expect(result.annualByCategory.external_wall).toBeCloseTo(1934.4, 6);
    expect(result.annualTotalKwh).toBeCloseTo(1934.4, 6);
  });

  it("clamps negative Δt (outdoor warmer than the indoor set-point) to zero loss", () => {
    const result = calculateEnvelopeHeatLoss(
      "after",
      [{ category: "roof", areaM2: 50, uValueWPerM2K: 0.3 }],
      [{ month: 6, avgOutdoorTempC: 30, heatingDays: 30 }],
      {
        indoorTempOperationC: 22,
        indoorTempNonOperationC: 14,
        operationHoursPerDay: 10,
        nonOperationHoursPerDay: 14,
      },
    );

    expect(result.annualTotalKwh).toBe(0);
  });

  it("sums multiple groups and months into the annual total", () => {
    const result = calculateEnvelopeHeatLoss(
      "before",
      [
        { category: "external_wall", areaM2: 100, uValueWPerM2K: 1.5 },
        { category: "window", areaM2: 20, uValueWPerM2K: 2.8 },
      ],
      [
        { month: 1, avgOutdoorTempC: 0, heatingDays: 31 },
        { month: 2, avgOutdoorTempC: 2, heatingDays: 28 },
      ],
      {
        indoorTempOperationC: 22,
        indoorTempNonOperationC: 14,
        operationHoursPerDay: 10,
        nonOperationHoursPerDay: 14,
      },
    );

    expect(result.monthly).toHaveLength(4);
    expect(result.annualTotalKwh).toBeCloseTo(
      result.annualByCategory.external_wall + result.annualByCategory.window,
      6,
    );
  });
});
