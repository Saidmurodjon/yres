import { describe, expect, it } from "vitest";
import type { AuditInputs } from "../../src/services/audit-inputs";
import { computeAudit } from "../../src/services/audit.engine";

const HEATING_MONTHS = [1, 2, 3, 4, 10, 11, 12];

function buildInputs(): AuditInputs {
  return {
    building: {
      id: "b1",
      name: "Test building",
      location: "Toshkent",
      searchText: "test building",
      climateRegionId: "cr1",
      buildingType: "other",
      yearBuilt: 1980,
      status: "in_progress",
      deadline: null,
      latitude: null,
      longitude: null,
      netCooledFloorAreaM2: 0,
      heatingSeasonDurationDays: 180,
      indoorTempNonOperationC: 16,
      indoorTempOperationC: 20,
      outdoorAvgHeatingSeasonTempC: 4,
      outdoorDesignTempC: -10,
      nonOperationHoursPerDay: 14,
      operationHoursPerDay: 10,
      occupantCount: 50,
      coolingEnthalpyInsideKjKg: null,
      coolingEnthalpyOutsideKjKg: null,
      coolingEnthalpyHottestDayKjKg: null,
    } as AuditInputs["building"],
    climateRegion: {
      monthlyNormals: Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        const heating = HEATING_MONTHS.includes(month);
        return {
          id: `m${month}`,
          climateRegionId: "cr1",
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
        id: "blk1",
        buildingId: "b1",
        name: "A",
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
        buildingId: "b1",
        blockName: "A",
        orientation: "south",
        sideCode: null,
        description: null,
        constructionTypeId: "ct1",
        lengthM: 30,
        heightEnvContactM: 9.6,
        heightGroundContactM: 0,
        openings: [
          {
            id: "op1",
            envelopeElementId: "el1",
            openingTypeId: "ot1",
            count: 6,
            openingType: {
              id: "ot1",
              buildingId: "b1",
              code: "Win1",
              category: "window",
              scenario: "before",
              retrofitOfId: null,
              uValueWm2k: 2.8,
              widthM: 1.5,
              heightM: 1.5,
              gValue: 0.6,
              frameFactor: 0.7,
              shadingFactor: 1,
              description: null,
            },
          },
        ],
      },
    ],
    constructionTypes: [
      {
        id: "ct1",
        buildingId: "b1",
        code: "W1",
        elementCategory: "external_wall",
        scenario: "before",
        retrofitOfId: null,
        description: null,
        layers: [
          {
            id: "l1",
            constructionTypeId: "ct1",
            layerOrder: 1,
            materialId: "mat1",
            thicknessM: 0.5,
            material: { id: "mat1", name: "Brick", thermalConductivityWPerMk: 0.7 },
          },
        ],
      },
    ],
    openingTypes: [
      {
        id: "ot1",
        buildingId: "b1",
        code: "Win1",
        category: "window",
        scenario: "before",
        retrofitOfId: null,
        uValueWm2k: 2.8,
        widthM: 1.5,
        heightM: 1.5,
        gValue: 0.6,
        frameFactor: 0.7,
        shadingFactor: 1,
        description: null,
      },
    ],
    surfaceResistances: [
      {
        id: "sr1",
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
        buildingId: "b1",
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
        buildingId: "b1",
        name: "Wall insulation",
        category: "wall_insulation",
        investmentCostUsd: 10000,
        lifetimeYears: 20,
        maintenanceCostPercent: 0,
        proposedForImplementation: true,
        sourceSheetRef: null,
      },
    ],
    nonEeMeasures: [],
    tariffs: [],
  } as unknown as AuditInputs;
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
  });
});
