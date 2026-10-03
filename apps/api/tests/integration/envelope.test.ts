import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion, seedMaterial } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb } from "../helpers/test-db";

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
    const body = (await response.json()) as {
      envelopeElements: unknown[];
      constructionTypes: unknown[];
    };
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
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
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
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });

  it("accepts the largest payload the schema allows (chunked inserts stay under D1's 100-parameter limit)", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const brick = await seedMaterial("Bricks", 0.7);

    // Limits from schemas/envelope.ts: 15 types × 8 layers, 14 opening types, 100 elements, 160 openings in total.
    const constructionTypes = Array.from({ length: 15 }, (_, i) => ({
      code: `W${i}`,
      elementCategory: "external_wall" as const,
      layers: Array.from({ length: 8 }, (_, layerOrder) => ({
        layerOrder,
        materialId: brick.id,
        thicknessM: 0.1,
      })),
    }));
    const openingTypes = Array.from({ length: 14 }, (_, i) => ({
      code: `Win${i}`,
      category: "window" as const,
      uValueWm2k: 1.4,
    }));
    const envelopeElements = Array.from({ length: 100 }, (_, i) => ({
      blockName: "A",
      orientation: "north" as const,
      constructionTypeCode: `W${i % 15}`,
      lengthM: 10,
      openings:
        i < 80
          ? [
              { openingTypeCode: `Win${i % 14}`, count: 1 },
              { openingTypeCode: "Win0", count: 2 },
            ]
          : [],
    }));
    const buildingBlocks = Array.from({ length: 22 }, (_, i) => ({
      name: `Block ${i}`,
      footprintLengthM: 10,
      footprintWidthM: 10,
      numberOfFloors: 3,
      floorToFloorHeightM: 3,
      perimeterM: 40,
    }));

    const put = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "before",
          buildingBlocks,
          constructionTypes,
          openingTypes,
          envelopeElements,
        }),
      },
      cookie,
    );
    expect(put.status).toBe(200);

    const get = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
    const body = (await get.json()) as {
      envelopeElements: { openings: unknown[] }[];
      constructionTypes: { layers: unknown[] }[];
      blocks: unknown[];
    };
    expect(body.envelopeElements).toHaveLength(100);
    expect(body.constructionTypes).toHaveLength(15);
    expect(body.constructionTypes.every((t) => t.layers.length === 8)).toBe(true);
    expect(body.blocks).toHaveLength(22);
    expect(body.envelopeElements.reduce((sum, el) => sum + el.openings.length, 0)).toBe(160);
  });

  it("rejects more openings in total than the query budget allows", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario: "before",
          constructionTypes: [{ code: "W", elementCategory: "external_wall" }],
          openingTypes: [{ code: "Win", category: "window", uValueWm2k: 1.4 }],
          envelopeElements: Array.from({ length: 9 }, () => ({
            blockName: "A",
            orientation: "north",
            constructionTypeCode: "W",
            lengthM: 10,
            openings: Array.from({ length: 20 }, () => ({ openingTypeCode: "Win", count: 1 })),
          })),
        }),
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });
  describe("after scenario (F07)", () => {
    const put = (buildingId: string, cookie: string, body: unknown) =>
      authRequest(
        `/api/buildings/${buildingId}/envelope`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
        cookie,
      );
    const beforeBody = {
      scenario: "before",
      constructionTypes: [{ code: "W1", elementCategory: "external_wall" }],
      openingTypes: [
        { code: "Win1", category: "window", uValueWm2k: 2.6, widthM: 1, heightM: 1 },
        { code: "Win2", category: "window", uValueWm2k: 3.5, widthM: 1, heightM: 1 },
      ],
      envelopeElements: [
        {
          blockName: "A",
          orientation: "north",
          constructionTypeCode: "W1",
          lengthM: 10,
          openings: [
            { openingTypeCode: "Win1", count: 1 },
            { openingTypeCode: "Win2", count: 1 },
          ],
        },
      ],
    };

    async function getEnvelope(buildingId: string, cookie: string) {
      const res = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
      return (await res.json()) as {
        envelopeElements: unknown[];
        openingTypes: { id: string; code: string; scenario: string; retrofitOfId: string | null }[];
      };
    }

    it("saves after types with retrofitOfCode without touching the before elements", async () => {
      const { cookie } = await signUpTestUser();
      const buildingId = await createBuilding(cookie);
      expect((await put(buildingId, cookie, beforeBody)).status).toBe(200);

      const res = await put(buildingId, cookie, {
        scenario: "after",
        openingTypes: [{ code: "V4", category: "window", uValueWm2k: 1.4, retrofitOfCode: "Win2" }],
      });
      expect(res.status).toBe(200);

      const env = await getEnvelope(buildingId, cookie);
      expect(env.envelopeElements).toHaveLength(1);
      const win2 = env.openingTypes.find((o) => o.code === "Win2" && o.scenario === "before");
      const v4 = env.openingTypes.find((o) => o.code === "V4");
      expect(v4?.retrofitOfId).toBe(win2?.id);
    });

    it("rejects an unknown opening retrofitOfCode", async () => {
      const { cookie } = await signUpTestUser();
      const buildingId = await createBuilding(cookie);
      await put(buildingId, cookie, beforeBody);
      const res = await put(buildingId, cookie, {
        scenario: "after",
        openingTypes: [{ code: "V4", category: "window", uValueWm2k: 1.4, retrofitOfCode: "Nope" }],
      });
      expect(res.status).toBe(400);
    });

    it("re-saving the before envelope after saving an after one does not fail on the FK", async () => {
      const { cookie } = await signUpTestUser();
      const buildingId = await createBuilding(cookie);
      await put(buildingId, cookie, beforeBody);
      await put(buildingId, cookie, {
        scenario: "after",
        openingTypes: [{ code: "V4", category: "window", uValueWm2k: 1.4, retrofitOfCode: "Win2" }],
      });
      expect((await put(buildingId, cookie, beforeBody)).status).toBe(200);
      const env = await getEnvelope(buildingId, cookie);
      expect(env.openingTypes.find((o) => o.code === "V4")?.retrofitOfId).toBeNull();
    });
  });
});
