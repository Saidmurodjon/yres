import { climateRegion } from "@yres/db";
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

describe("Audit report (PDF)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("404s before any completed audit run exists", async () => {
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

    const response = await authRequest(`/api/buildings/${building.id}/audit/report`, {}, cookie);
    expect(response.status).toBe(404);
  });

  it("returns a downloadable PDF for a building with a completed audit run", async () => {
    const { cookie } = await signUpTestUser();
    const [tashkent] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const materialsResponse = await authRequest("/api/reference/materials", {}, cookie);
    const { materials } = (await materialsResponse.json()) as { materials: { id: string; name: string }[] };
    const bricks = materials.find((m) => m.name === "Bricks");
    if (!bricks) throw new Error("expected seeded material not found");

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

    await authRequest(
      `/api/buildings/${building.id}/envelope`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
              layers: [{ layerOrder: 1, materialId: bricks.id, thicknessM: 0.38 }],
            },
          ],
          openingTypes: [],
          envelopeElements: [
            {
              blockName: "Main block",
              orientation: "south",
              constructionTypeCode: "wall",
              lengthM: 300,
              heightEnvContactM: 3,
              openings: [],
            },
          ],
        }),
      },
      cookie,
    );

    const runResponse = await authRequest(`/api/buildings/${building.id}/audit/run`, { method: "POST" }, cookie);
    expect(runResponse.status).toBe(201);

    const reportResponse = await authRequest(`/api/buildings/${building.id}/audit/report`, {}, cookie);
    expect(reportResponse.status).toBe(200);
    expect(reportResponse.headers.get("content-type")).toBe("application/pdf");
    expect(reportResponse.headers.get("content-disposition")).toContain("attachment");

    const bytes = new Uint8Array(await reportResponse.arrayBuffer());
    expect(bytes.length).toBeGreaterThan(500);
    // PDF files always start with this magic header.
    const header = new TextDecoder().decode(bytes.slice(0, 5));
    expect(header).toBe("%PDF-");
  });

  it("404s for a building owned by a different user", async () => {
    const { cookie: ownerCookie } = await signUpTestUser();
    const [tashkent] = await testDb.select().from(climateRegion).where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const buildingResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: tashkent.id }),
      },
      ownerCookie,
    );
    const { building } = (await buildingResponse.json()) as { building: { id: string } };

    const { cookie: otherCookie } = await signUpTestUser();
    const response = await authRequest(`/api/buildings/${building.id}/audit/report`, {}, otherCookie);
    expect(response.status).toBe(404);
  });
});
