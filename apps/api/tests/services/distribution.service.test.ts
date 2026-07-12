import { describe, expect, it } from "vitest";
import { calculateDistributionLoss } from "../../src/services/distribution.service";

const REFERENCE = [
  { diameterClass: "15-25", insulated: false, meanFluidTempC: null, maxHeatFluxWPerM: 47 },
  { diameterClass: "15-25", insulated: true, meanFluidTempC: 60, maxHeatFluxWPerM: 11 },
  { diameterClass: "15-25", insulated: true, meanFluidTempC: 80, maxHeatFluxWPerM: 15 },
];

describe("DistributionService", () => {
  it("computes pipe loss as (insulated*insulatedFlux + nonInsulated*nonInsulatedFlux) * hours / 1000", () => {
    const result = calculateDistributionLoss(
      "before",
      "heating",
      [{ pipeDiameterClass: "15-25", lengthM: 100, insulatedFraction: 0, meanFluidTempC: 60 }],
      REFERENCE,
      1630,
    );

    // fully non-insulated: 100 * 47 * 1630 / 1000
    expect(result.annualLossKwh).toBeCloseTo((100 * 47 * 1630) / 1000, 6);
  });

  it("picks the insulated flux row closest to the segment's mean fluid temp", () => {
    const result = calculateDistributionLoss(
      "after",
      "heating",
      [{ pipeDiameterClass: "15-25", lengthM: 100, insulatedFraction: 1, meanFluidTempC: 60 }],
      REFERENCE,
      1630,
    );

    expect(result.annualLossKwh).toBeCloseTo((100 * 11 * 1630) / 1000, 6);
  });

  it("returns 0 loss for an unknown diameter class rather than throwing", () => {
    const result = calculateDistributionLoss(
      "before",
      "dhw",
      [{ pipeDiameterClass: "unknown", lengthM: 50, insulatedFraction: 0.5, meanFluidTempC: 60 }],
      REFERENCE,
      1630,
    );
    expect(result.annualLossKwh).toBe(0);
  });
});
