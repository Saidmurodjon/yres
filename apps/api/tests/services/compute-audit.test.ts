import { describe, expect, it } from "vitest";
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
        elementCategory: "external_wall",
        scenario: "before",
        retrofitOfId: null,
        layers: [{ thicknessM: 0.5, material: { thermalConductivityWPerMk: 0.7 } }],
      },
      {
        id: "ct2",
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
      },
    ],
    nonEeMeasures: [],
    tariffs: [{ energyCarrier: "gas", unitCostUsd: 0.04, emissionFactorKgCo2PerKwh: 0.2 }],
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
});
