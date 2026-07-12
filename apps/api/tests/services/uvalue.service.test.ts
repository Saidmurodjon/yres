import { describe, expect, it } from "vitest";
import { calculateLayerResistance, calculateUValue } from "../../src/services/uvalue.service";

describe("UValueService", () => {
  it("computes layer resistance as thickness / conductivity", () => {
    expect(
      calculateLayerResistance({ thicknessM: 0.2, thermalConductivityWPerMk: 0.5 }),
    ).toBeCloseTo(0.4, 10);
  });

  it("treats non-positive conductivity as zero resistance rather than dividing by zero", () => {
    expect(calculateLayerResistance({ thicknessM: 0.2, thermalConductivityWPerMk: 0 })).toBe(0);
  });

  it("computes U = 1 / (Rint + Rext + ΣR_layers), matching the U-values sheet formula", () => {
    const result = calculateUValue(
      "ct-1",
      [
        { thicknessM: 0.02, thermalConductivityWPerMk: 1.0 },
        { thicknessM: 0.2, thermalConductivityWPerMk: 0.5 },
      ],
      { interiorResistanceM2kPerW: 0.13, exteriorResistanceM2kPerW: 0.04 },
    );

    // R = 0.02 + 0.4 + 0.13 + 0.04 = 0.59
    expect(result.totalThermalResistanceM2KPerW).toBeCloseTo(0.59, 10);
    expect(result.uValueWPerM2K).toBeCloseTo(1 / 0.59, 10);
    expect(result.constructionTypeId).toBe("ct-1");
  });

  it("returns 0 for an empty layer stack with no surface resistance (edge case)", () => {
    const result = calculateUValue("ct-2", [], {
      interiorResistanceM2kPerW: 0,
      exteriorResistanceM2kPerW: 0,
    });
    expect(result.uValueWPerM2K).toBe(0);
  });
});
