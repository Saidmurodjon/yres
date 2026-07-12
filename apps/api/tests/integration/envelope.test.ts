import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb } from "../helpers/test-db";
import { seedClimateRegion, seedMaterial } from "../helpers/seed-helpers";

const VALID_BUILDING_INPUT = {
  name: "Test Hospital",
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};

async function createBuilding(cookie: string) {
  const region = await seedClimateRegion();
  const response = await authRequest(
    "/api/buildings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId: region.id }),
    },
    cookie,
  );
  const { building } = (await response.json()) as { building: { id: string } };
  return building.id;
}

describe("Envelope API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns empty arrays for a building with no envelope data yet", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { envelopeElements: unknown[]; constructionTypes: unknown[] };
    expect(body.envelopeElements).toEqual([]);
    expect(body.constructionTypes).toEqual([]);
  });

  it("bulk-replaces blocks, construction types, opening types, and elements atomically", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const brick = await seedMaterial("Bricks", 0.7);

    const payload = {
      scenario: "before",
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
      constructionTypes: [
        {
          code: "wall",
          elementCategory: "external_wall",
          layers: [{ layerOrder: 1, materialId: brick.id, thicknessM: 0.38 }],
        },
      ],
      openingTypes: [
        { code: "win1", category: "window", uValueWm2k: 2.6, widthM: 1.5, heightM: 1.5 },
      ],
      envelopeElements: [
        {
          blockName: "Main block",
          orientation: "south",
          constructionTypeCode: "wall",
          lengthM: 100,
          heightEnvContactM: 3,
          openings: [{ openingTypeCode: "win1", count: 10 }],
        },
      ],
    };

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      cookie,
    );
    expect(putResponse.status).toBe(200);
    const putBody = (await putResponse.json()) as {
      buildingBlockIds: string[];
      constructionTypeIds: string[];
      envelopeElementIds: string[];
    };
    expect(putBody.buildingBlockIds).toHaveLength(1);
    expect(putBody.constructionTypeIds).toHaveLength(1);
    expect(putBody.envelopeElementIds).toHaveLength(1);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
    const body = (await getResponse.json()) as {
      blocks: { footprintLengthM: number }[];
      envelopeElements: { openings: { count: number }[] }[];
    };
    expect(body.blocks).toHaveLength(1);
    expect(body.blocks[0]?.footprintLengthM).toBe(30);
    expect(body.envelopeElements).toHaveLength(1);
    expect(body.envelopeElements[0]?.openings[0]?.count).toBe(10);
  });

  it("rejects an envelope element referencing an unknown construction type code", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const payload = {
      scenario: "before",
      constructionTypes: [],
      openingTypes: [],
      envelopeElements: [
        {
          blockName: "Main block",
          orientation: "south",
          constructionTypeCode: "does-not-exist",
          lengthM: 100,
        },
      ],
    };

    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
      cookie,
    );
    expect(response.status).toBe(400);
  });
});
