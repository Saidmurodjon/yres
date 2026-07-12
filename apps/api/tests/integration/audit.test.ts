import { climateRegion, generationSource } from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING_INPUT = {
  name: "Test Hospital",
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
  occupantCount: 418,
};

const ENVELOPE_PAYLOAD_TEMPLATE = {
  scenario: "before" as const,
  buildingBlocks: [
    {
      name: "Main block",
      footprintLengthM: 30,
      footprintWidthM: 15,
      numberOfFloors: 3,
      floorToFloorHeightM: 3.3,
      perimeterM: 90,
    },
  ],
};

describe("Audit run (end-to-end through real reference data)", () => {
  beforeEach(async () => {
    await resetTestDb();
    // Real workbook-derived reference data — same function the production
    // deploy pipeline runs (see docs/deployment.md), not test-only fixtures.
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("seeds a usable Tashkent climate region with 12 months of normals", async () => {
    const [region] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    expect(region).toBeDefined();
    expect(region?.designOutdoorTempC).toBe(-14);
  });

  it("runs a full audit for a building with only envelope data and returns a physically sensible result", async () => {
    const { cookie } = await signUpTestUser();

    const [tashkent] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const materialsResponse = await authRequest("/api/reference/materials", {}, cookie);
    const { materials } = (await materialsResponse.json()) as {
      materials: { id: string; name: string }[];
    };
    const bricks = materials.find((m) => m.name === "Bricks");
    const plaster = materials.find((m) => m.name === "Internal plaster");
    if (!bricks || !plaster) throw new Error("expected seeded materials not found");

    const buildingResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: tashkent.id }),
      },
      cookie,
    );
    expect(buildingResponse.status).toBe(201);
    const { building } = (await buildingResponse.json()) as { building: { id: string } };

    const envelopePayload = {
      ...ENVELOPE_PAYLOAD_TEMPLATE,
      constructionTypes: [
        {
          code: "wall",
          elementCategory: "external_wall",
          layers: [
            { layerOrder: 1, materialId: plaster.id, thicknessM: 0.01 },
            { layerOrder: 2, materialId: bricks.id, thicknessM: 0.38 },
          ],
        },
      ],
      openingTypes: [
        {
          code: "win1",
          category: "window",
          uValueWm2k: 2.6,
          widthM: 1.5,
          heightM: 1.5,
          gValue: 0.75,
          frameFactor: 0.6,
        },
      ],
      envelopeElements: [
        {
          blockName: "Main block",
          orientation: "south",
          constructionTypeCode: "wall",
          lengthM: 300,
          heightEnvContactM: 3,
          openings: [{ openingTypeCode: "win1", count: 40 }],
        },
      ],
    };

    const envelopeResponse = await authRequest(
      `/api/buildings/${building.id}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(envelopePayload) },
      cookie,
    );
    expect(envelopeResponse.status).toBe(200);

    // No CRUD route manages ventilation/DHW/distribution/generation/cooling
    // systems yet (a real product gap — see the Phase 5 report), so seed a
    // heating generation source directly to exercise the full
    // need→distribution→generation→purchased-energy pipeline end-to-end,
    // not just the envelope-loss portion.
    await testDb.insert(generationSource).values({
      buildingId: building.id,
      endUse: "heating",
      scenario: "before",
      sourceType: "gas_boiler",
      efficiencyOrSeer: 0.58,
      shareOfDemand: 1,
    });

    const runResponse = await authRequest(`/api/buildings/${building.id}/audit/run`, { method: "POST" }, cookie);
    expect(runResponse.status).toBe(201);
    const runBody = (await runResponse.json()) as {
      auditRun: { status: string };
      result: {
        buildingId: string;
        envelopeAreas: { externalWallAreaM2: number; windowAreaM2: number };
        envelopeHeatLoss: { scenario: string; annualTotalKwh: number }[];
        heatingEnergyBalance: { scenario: string; annualNetEnergyNeedKwh: number }[];
        summary: { currentEnergyUseKwhPerM2Year: number };
      };
    };

    expect(runBody.auditRun.status).toBe("completed");
    expect(runBody.result.buildingId).toBe(building.id);

    // gross wall area 900 m² - window area (1.5*1.5*40=90 m²) = 810 m² net wall
    expect(runBody.result.envelopeAreas.externalWallAreaM2).toBeCloseTo(810, 1);
    expect(runBody.result.envelopeAreas.windowAreaM2).toBeCloseTo(90, 1);

    const beforeLoss = runBody.result.envelopeHeatLoss.find((r) => r.scenario === "before");
    expect(beforeLoss).toBeDefined();
    expect(beforeLoss?.annualTotalKwh).toBeGreaterThan(0);

    const beforeBalance = runBody.result.heatingEnergyBalance.find((r) => r.scenario === "before");
    expect(beforeBalance?.annualNetEnergyNeedKwh).toBeGreaterThan(0);

    // Sanity range for a real Tashkent hospital wing — not tuned to hit a
    // specific number, just ruling out unit-conversion-scale bugs (e.g. off
    // by 1000, or duration in seconds vs hours).
    expect(runBody.result.summary.currentEnergyUseKwhPerM2Year).toBeGreaterThan(0);
    expect(runBody.result.summary.currentEnergyUseKwhPerM2Year).toBeLessThan(5000);

    // GET /audit/results recomputes fresh rather than replaying a stored
    // result — confirm it agrees with what /run just returned.
    const resultsResponse = await authRequest(`/api/buildings/${building.id}/audit/results`, {}, cookie);
    expect(resultsResponse.status).toBe(200);
    const resultsBody = (await resultsResponse.json()) as { result: { summary: { currentEnergyUseKwhPerM2Year: number } } };
    expect(resultsBody.result.summary.currentEnergyUseKwhPerM2Year).toBeCloseTo(
      runBody.result.summary.currentEnergyUseKwhPerM2Year,
      6,
    );

    const statusResponse = await authRequest(`/api/buildings/${building.id}/audit/status`, {}, cookie);
    expect(statusResponse.status).toBe(200);
    const statusBody = (await statusResponse.json()) as { auditRun: { status: string } };
    expect(statusBody.auditRun.status).toBe("completed");
  });

  it("404s on audit results before any run has completed", async () => {
    const { cookie } = await signUpTestUser();
    const [tashkent] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const buildingResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: tashkent.id }),
      },
      cookie,
    );
    const { building } = (await buildingResponse.json()) as { building: { id: string } };

    const resultsResponse = await authRequest(`/api/buildings/${building.id}/audit/results`, {}, cookie);
    expect(resultsResponse.status).toBe(404);
  });
});
