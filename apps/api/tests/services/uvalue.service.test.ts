import { describe, expect, it } from "vitest";
import {
  calculateConstructionTypeU,
  calculateGroundFloorUValue,
  calculateLayerResistance,
  calculateUValue,
} from "../../src/services/uvalue.service";

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

describe("calculateGroundFloorUValue (zone method, v7.20 U-values!Q108:U121)", () => {
  const before = [
    { thicknessM: 0.05, thermalConductivityWPerMk: 0.76 }, // insulating (λ < 1.2): R = 0.0658
    { thicknessM: 0.2, thermalConductivityWPerMk: 1.74 }, // not insulating: ignored
  ];
  const after = [
    { thicknessM: 0.1, thermalConductivityWPerMk: 0.036 },
    { thicknessM: 0.06, thermalConductivityWPerMk: 0.76 },
  ];

  it("reproduces the 3-DMTT block 50.3 x 12.8: zones and U_eq before/after", () => {
    const b = calculateGroundFloorUValue({ lengthM: 50.3, widthM: 12.8, layers: before });
    expect(b.zones.map((z) => z.areaM2)).toEqual([
      expect.closeTo(252.4, 6),
      expect.closeTo(204.4, 6),
      expect.closeTo(172.4, 6),
      expect.closeTo(30.64, 6),
    ]);
    expect(b.realFloorAreaM2).toBeCloseTo(643.84, 6);
    expect(b.insulationResistanceM2KPerW).toBeCloseTo(0.0658, 4);
    expect(b.uEqWPerM2K).toBeCloseTo(0.28796, 4);
    const a = calculateGroundFloorUValue({ lengthM: 50.3, widthM: 12.8, layers: after });
    expect(a.uEqWPerM2K).toBeCloseTo(0.14961, 4);
  });

  it("a block narrower than 4 m has only zone I (no corner overlap)", () => {
    const g = calculateGroundFloorUValue({ lengthM: 3, widthM: 10, layers: [] });
    expect(g.zones.map((z) => z.areaM2)).toEqual([30, 0, 0, 0]);
    expect(g.uEqWPerM2K).toBeCloseTo(1 / 2.1, 6);
  });

  it("a block of 4..8 m has zones I and II only", () => {
    const g = calculateGroundFloorUValue({ lengthM: 6, widthM: 5, layers: [] });
    expect(g.zones.map((z) => z.areaM2)).toEqual([30 - 2 * 1 + 16, 2, 0, 0]);
  });
});

describe("calculateConstructionTypeU", () => {
  const resistance = { interiorResistanceM2kPerW: 0.115, exteriorResistanceM2kPerW: 0.167 };
  const f3 = [
    { thicknessM: 0.05, thermalConductivityWPerMk: 0.76 },
    { thicknessM: 0.22, thermalConductivityWPerMk: 1.295 },
  ];
  const base = { layers: f3, resistance, groundLengthM: null, groundWidthM: null };

  it("floor_over_unheated: U·n (3-DMTT F3 before 1.9317 · 0.4 = 0.77269)", () => {
    const r = calculateConstructionTypeU("f3", {
      ...base,
      elementCategory: "floor_over_unheated",
      temperatureReductionFactor: 0.4,
    });
    expect(r.uValueWPerM2K).toBeCloseTo(0.77269, 4);
  });

  it("a legacy floor and a type without n keep the plain 1/ΣR", () => {
    const plain = 1 / (0.05 / 0.76 + 0.22 / 1.295 + 0.115 + 0.167);
    for (const [elementCategory, n] of [
      ["floor", 0.4],
      ["floor_over_unheated", null],
    ] as const) {
      const r = calculateConstructionTypeU("x", {
        ...base,
        elementCategory,
        temperatureReductionFactor: n,
      });
      expect(r.uValueWPerM2K).toBeCloseTo(plain, 9);
    }
  });

  it("socle_unheated also takes n", () => {
    const r = calculateConstructionTypeU("s", {
      ...base,
      elementCategory: "socle_unheated",
      temperatureReductionFactor: 0.5,
    });
    expect(r.uValueWPerM2K).toBeCloseTo(0.5 / (0.05 / 0.76 + 0.22 / 1.295 + 0.282), 9);
  });
});
