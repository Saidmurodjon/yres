import { describe, expect, it } from "vitest";
import { defaultFinancialParameters } from "../../src/lib/financial-defaults";
import type { AuditInputs } from "../../src/services/audit-inputs";
import { computeAudit } from "../../src/services/audit.engine";

const HEATING_MONTHS = [1, 2, 3, 4, 10, 11, 12];

function buildInputs(): AuditInputs {
  return {
    building: {
      id: "b1",
      heatingSeasonDurationDays: 180,
      indoorTempNonOperationC: 16,
      indoorTempOperationC: 20,
      nonOperationHoursPerDay: 14,
      operationHoursPerDay: 10,
      occupantCount: 50,
      workingDaysPerYear: 250,
      coolingEnthalpyInsideKjKg: null,
      coolingEnthalpyOutsideKjKg: null,
    },
    climateRegion: {
      monthlyNormals: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const heating = HEATING_MONTHS.includes(month);
        return {
          month,
          avgOutdoorTempC: heating ? 2 : 24,
          heatingDaysInMonth: heating ? 25 : null,
          solarRadiationSouthKwhM2: 60,
          solarRadiationNorthKwhM2: 20,
          solarRadiationEastWestKwhM2: 40,
          solarRadiationSeSwKwhM2: 50,
          solarRadiationNeNwKwhM2: 30,
          solarRadiationHorizontalKwhM2: 70,
          isHeatingSeasonMonth: heating,
        };
      }),
    },
    blocks: [
      {
        footprintLengthM: 30,
        footprintWidthM: 15,
        numberOfFloors: 3,
        floorToFloorHeightM: 3.2,
        perimeterM: 90,
        perimeterLossCoefficient: 0.4,
      },
    ],
    envelopeElements: [
      {
        id: "el1",
        orientation: "south",
        constructionTypeId: "ct1",
        lengthM: 30,
        heightEnvContactM: 9.6,
        heightGroundContactM: 0,
        openings: [
          {
            openingTypeId: "ot1",
            count: 6,
            openingType: { category: "window", widthM: 1.5, heightM: 1.5 },
          },
        ],
      },
    ],
    constructionTypes: [
      {
        id: "ct1",
        code: "W1",
        elementCategory: "external_wall",
        scenario: "before",
        retrofitOfId: null,
        layers: [{ thicknessM: 0.5, material: { thermalConductivityWPerMk: 0.7 } }],
      },
      {
        id: "ct2",
        code: "W1",
        elementCategory: "external_wall",
        scenario: "after",
        retrofitOfId: "ct1",
        layers: [
          { thicknessM: 0.5, material: { thermalConductivityWPerMk: 0.7 } },
          { thicknessM: 0.1, material: { thermalConductivityWPerMk: 0.04 } },
        ],
      },
    ],
    openingTypes: [
      {
        id: "ot1",
        code: "Win1",
        category: "window",
        scenario: "before",
        uValueWm2k: 2.8,
        gValue: 0.6,
        frameFactor: 0.7,
        shadingFactor: 1,
      },
    ],
    surfaceResistances: [
      {
        elementCategory: "external_wall",
        interiorResistanceM2kPerW: 0.13,
        exteriorResistanceM2kPerW: 0.04,
      },
    ],
    ventilationSystems: [],
    coolingWindows: [],
    coolingSystems: [],
    dhwSources: [],
    distributionSystems: [],
    pipeLossReferences: [],
    generationSources: [
      {
        id: "g1",
        endUse: "heating",
        scenario: "before",
        sourceType: "gas_boiler",
        efficiencyOrSeer: 0.8,
        shareOfDemand: 1,
        distributionEfficiency: null,
      },
    ],
    lightingZones: [],
    lampTypes: [],
    equipmentItems: [],
    renewableSystems: [],
    utilityBills: [],
    energyMeasures: [
      {
        id: "me1",
        name: "Wall insulation",
        category: "envelope_wall_insulation",
        investmentCostUsd: 10000,
        lifetimeYears: 20,
        maintenanceCostPercent: 0,
        proposedForImplementation: true,
        targets: [{ kind: "construction_type", code: "W1" }],
      },
    ],
    nonEeMeasures: [],
    tariffs: [{ energyCarrier: "gas", unitCostUsd: 0.04, emissionFactorKgCo2PerKwh: 0.2 }],
    financialParameters: defaultFinancialParameters(),
  };
}

describe("computeAudit", () => {
  it("runs from plain inputs without a database and echoes generatedAt", () => {
    const result = computeAudit(buildInputs(), { generatedAt: "2026-01-01T00:00:00.000Z" });

    expect(result.buildingId).toBe("b1");
    expect(result.generatedAt).toBe("2026-01-01T00:00:00.000Z");
    expect(Number.isFinite(result.summary.totalInvestmentUsd)).toBe(true);
    expect(result.envelopeHeatLoss.length).toBeGreaterThan(0);
    for (const row of result.envelopeHeatLoss) {
      expect(Number.isFinite(row.annualTotalKwh)).toBe(true);
    }
    expect(result.measures).toHaveLength(1);
    expect(result.measures[0]?.standardizedAnnualSavingsKwh).toBeGreaterThan(0);
  });

  it("warns when workingDaysPerYear is missing and stays silent when it is set", () => {
    const inputs = buildInputs();
    expect(computeAudit(inputs, { generatedAt: "2026-01-01T00:00:00.000Z" }).warnings).toEqual([]);
    inputs.building.workingDaysPerYear = null;
    const warnings = computeAudit(inputs, { generatedAt: "2026-01-01T00:00:00.000Z" }).warnings;
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("workingDaysPerYear");
  });

  it("applies a source's distribution efficiency only to an end-use without pipe segments", () => {
    const inputs = buildInputs();
    const first = inputs.generationSources[0];
    if (!first) throw new Error("fixture has no generation source");
    first.distributionEfficiency = 0.8;
    const result = computeAudit(inputs, { generatedAt: "2026-01-01T00:00:00.000Z" });
    const source = result.generation.find((g) => g.sourceId === "g1");
    expect(source?.distributionLossKwh).toBeCloseTo((source?.usefulEnergyNeedKwh ?? 0) * 0.2, 6);
    expect(source?.finalEnergyConsumptionKwh).toBeCloseTo(
      ((source?.usefulEnergyNeedKwh ?? 0) * 1.2) / 0.8,
      6,
    );
  });

  it("warns for envelope measures without targets (double-counting risk) and for unknown target codes", () => {
    const at = { generatedAt: "2026-01-01T00:00:00.000Z" };
    const inputs = buildInputs();
    const base = inputs.energyMeasures[0];
    if (!base) throw new Error("fixture has no measure");

    // a measure with a resolvable target: silent
    expect(computeAudit(inputs, at).warnings).toEqual([]);

    // two legacy measures in one category: each is flagged, and the text names the other one
    inputs.energyMeasures = [
      { ...base, id: "m1", name: "A", targets: [] },
      { ...base, id: "m2", name: "B", targets: [] },
    ];
    const legacy = computeAudit(inputs, at).warnings;
    expect(legacy).toHaveLength(2);
    expect(legacy.every((w) => w.includes("double counting"))).toBe(true);

    // a single untargeted measure is flagged without the double-counting remark
    inputs.energyMeasures = [{ ...base, targets: [] }];
    const single = computeAudit(inputs, at).warnings;
    expect(single).toHaveLength(1);
    expect(single[0]).not.toContain("double counting");

    // a code that is not in the "before" envelope
    inputs.energyMeasures = [{ ...base, targets: [{ kind: "construction_type", code: "W9" }] }];
    const missing = computeAudit(inputs, at).warnings;
    expect(missing).toHaveLength(1);
    expect(missing[0]).toContain("W9");
  });

  it("counts only proposed non-EE rows in the package investment", () => {
    const at = { generatedAt: "2026-01-01T00:00:00.000Z" };
    const inputs = buildInputs();
    const row = { id: "n", description: "x", unit: null, quantity: 2, unitCostUsd: 100 };
    inputs.nonEeMeasures = [
      { ...row, id: "n1", proposedForImplementation: true },
      { ...row, id: "n2", proposedForImplementation: false },
    ];
    const result = computeAudit(inputs, at);
    expect(result.nonEeMeasures).toHaveLength(2);
    expect(result.summary.totalNonEeMeasureCostUsd).toBe(200);
  });

  it("reports all vs proposed totals (non-EE by its own flag) and a per-carrier measure balance", () => {
    const at = { generatedAt: "2026-01-01T00:00:00.000Z" };
    const inputs = buildInputs();
    const row = { id: "n", description: "x", unit: null, quantity: 2, unitCostUsd: 100 };
    inputs.nonEeMeasures = [
      { ...row, id: "n1", proposedForImplementation: true },
      { ...row, id: "n2", proposedForImplementation: false },
    ];
    const { summary, measureBalance } = computeAudit(inputs, at);
    expect(summary.all.nonEeCostUsd).toBe(400);
    expect(summary.proposed.nonEeCostUsd).toBe(200);
    expect(summary.all.investmentUsd - summary.proposed.investmentUsd).toBeCloseTo(200, 6);
    expect(summary.totalInvestmentUsd).toBe(summary.proposed.investmentUsd);
    expect(measureBalance.map((b) => b.carrier)).toEqual([
      "gas",
      "electricity",
      "district_heat",
      "coal",
    ]);
    for (const b of measureBalance) {
      expect(["ok", "check"]).toContain(b.status);
      expect(Number.isFinite(b.diffPct)).toBe(true);
    }
  });
});
