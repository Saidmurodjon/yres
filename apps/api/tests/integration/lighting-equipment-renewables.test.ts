import { climateRegion, energyMeasure } from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING_INPUT = {
  name: "Test Building",
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};

async function putJson(path: string, body: unknown, cookie: string) {
  return authRequest(
    path,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    cookie,
  );
}

describe("Lighting/equipment/renewables end-to-end wiring into AuditEngine", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("folds lighting + equipment consumption into the summary KPIs and offsets 'after' with PV production", async () => {
    const { cookie } = await signUpTestUser();
    const [tashkent] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const buildingResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: tashkent.id, netCooledFloorAreaM2: 500 }),
      },
      cookie,
    );
    const { building } = (await buildingResponse.json()) as { building: { id: string } };

    // heatedFloorAreaM2 (the KPI's denominator) comes from buildingBlock
    // rows, not Building_data's own netCooledFloorAreaM2 input — set one up
    // via the envelope route so the KPI has a nonzero denominator, without
    // any construction types/elements (heating/dhw/cooling final energy
    // stay exactly 0, isolating what this test is actually checking).
    const envelopeResponse = await putJson(
      `/api/buildings/${building.id}/envelope`,
      {
        scenario: "before",
        buildingBlocks: [
          {
            name: "Main block",
            footprintLengthM: 25,
            footprintWidthM: 20,
            numberOfFloors: 1,
            floorToFloorHeightM: 3,
            perimeterM: 90,
          },
        ],
        constructionTypes: [],
        openingTypes: [],
        envelopeElements: [],
      },
      cookie,
    );
    expect(envelopeResponse.status).toBe(200);

    const lightingBefore = await putJson(
      `/api/buildings/${building.id}/systems/lighting`,
      {
        scenario: "before",
        zones: [
          {
            name: "Wards",
            areaM2: 500,
            technologyMix: {
              incandescentFraction: 1,
              fluorescentElectromagneticFraction: 0,
              fluorescentElectronicFraction: 0,
              ledFraction: 0,
            },
            utilizationFactor: 0.3,
          },
        ],
      },
      cookie,
    );
    expect(lightingBefore.status).toBe(200);

    const equipmentBefore = await putJson(
      `/api/buildings/${building.id}/systems/equipment`,
      {
        scenario: "before",
        items: [
          {
            name: "Old fridge",
            unitPowerKw: 0.2,
            quantity: 5,
            heatingSeasonHours: 1630,
            coolingSeasonHours: 0,
            heatingUtilizationFactor: 1,
            coolingUtilizationFactor: 1,
          },
        ],
      },
      cookie,
    );
    expect(equipmentBefore.status).toBe(200);

    // "after": LED lighting (much lower power density) + a PV system large
    // enough to fully offset the after-scenario's electricity.
    const lightingAfter = await putJson(
      `/api/buildings/${building.id}/systems/lighting`,
      {
        scenario: "after",
        zones: [
          {
            name: "Wards",
            areaM2: 500,
            technologyMix: {
              incandescentFraction: 0,
              fluorescentElectromagneticFraction: 0,
              fluorescentElectronicFraction: 0,
              ledFraction: 1,
            },
            utilizationFactor: 0.55,
          },
        ],
      },
      cookie,
    );
    expect(lightingAfter.status).toBe(200);

    const renewablesResponse = await putJson(
      `/api/buildings/${building.id}/systems/renewables`,
      {
        systems: [
          {
            systemType: "pv",
            capacityKw: 10,
            availableAreaM2: 100,
            unitCostUsd: 7268,
            monthlyProductionKwh: Array(12).fill(100000 / 12),
          },
        ],
      },
      cookie,
    );
    expect(renewablesResponse.status).toBe(200);

    // A "lighting" measure so we can also check standardizedAnnualSavingsKwh
    // resolves to the real before/after delta (no CRUD route creates
    // energy_measure rows yet — see routes/measures.ts — so insert directly,
    // same pattern used elsewhere in this test suite for admin/seed-only data).
    await testDb.insert(energyMeasure).values({
      buildingId: building.id,
      name: "LED retrofit",
      category: "lighting",
      investmentCostUsd: 1000,
      lifetimeYears: 10,
      maintenanceCostPercent: 0,
      proposedForImplementation: true,
    });

    const runResponse = await authRequest(`/api/buildings/${building.id}/audit/run`, { method: "POST" }, cookie);
    expect(runResponse.status).toBe(201);
    const { result } = (await runResponse.json()) as {
      result: {
        lighting: { scenario: string; annualConsumptionKwh: number }[];
        equipment: { scenario: string; annualConsumptionKwh: number }[];
        renewableProduction: { systemType: string; annualProductionKwh: number }[];
        summary: { currentEnergyUseKwhPerM2Year: number; potentialEnergyUseKwhPerM2Year: number };
        measures: { category: string; standardizedAnnualSavingsKwh: number }[];
      };
    };

    const lightingBeforeKwh = result.lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0;
    const lightingAfterKwh = result.lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? 0;
    const equipmentBeforeKwh = result.equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0;
    const equipmentAfterKwh = result.equipment.find((e) => e.scenario === "after")?.annualConsumptionKwh ?? 0;
    const pvProduction = result.renewableProduction.find((r) => r.systemType === "pv")?.annualProductionKwh ?? 0;

    // 500 m² * 25 W/m² (incandescent) * 1630 h * 0.3 / 1000 = 6112.5 kWh
    expect(lightingBeforeKwh).toBeCloseTo(6112.5, 1);
    // 500 * 7.4 * 1630 * 0.55 / 1000 = 3317.05 kWh
    expect(lightingAfterKwh).toBeCloseTo(3317.05, 1);
    // 5 * 0.2 kW * 1630 h * 1 = 1630 kWh; no cooling-season hours -> "after" is 0 (no equipment configured for after)
    expect(equipmentBeforeKwh).toBeCloseTo(1630, 1);
    expect(equipmentAfterKwh).toBe(0);
    expect(pvProduction).toBeCloseTo(100000, 0);

    // Building has no construction types/elements/generation, so heating/
    // dhw/cooling final energy are 0 — "before" total is exactly lighting +
    // equipment. heatedFloorAreaM2 comes from the building block set up
    // above: 25*20*1 floor - 90*0.4(default perimeterLossCoefficient)*1 = 464 m².
    expect(result.summary.currentEnergyUseKwhPerM2Year).toBeCloseTo(
      (lightingBeforeKwh + equipmentBeforeKwh) / 464,
      3,
    );
    // "after" = lighting (equipment after is 0) minus the PV offset, clamped at 0.
    expect(result.summary.potentialEnergyUseKwhPerM2Year).toBe(0);

    const lightingMeasure = result.measures.find((m) => m.category === "lighting");
    expect(lightingMeasure?.standardizedAnnualSavingsKwh).toBeCloseTo(lightingBeforeKwh - lightingAfterKwh, 1);
  });
});
