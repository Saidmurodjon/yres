import { energyMeasure, energyMeasureTarget } from "@yres/db";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
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
};

async function createBuilding(cookie: string) {
  const region = await seedClimateRegion();
  const response = await authRequest(
    "/api/buildings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: region.id }),
    },
    cookie,
  );
  const { building } = (await response.json()) as { building: { id: string } };
  return building.id;
}

describe("Measures API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  it("toggles proposedForImplementation for exactly the selected measures", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const [wall, roof, windows] = await testDb
      .insert(energyMeasure)
      .values([
        {
          buildingId,
          name: "Wall insulation",
          category: "envelope_wall_insulation",
          investmentCostUsd: 10000,
        },
        {
          buildingId,
          name: "Roof insulation",
          category: "envelope_roof_insulation",
          investmentCostUsd: 5000,
        },
        {
          buildingId,
          name: "Window replacement",
          category: "window_replacement",
          investmentCostUsd: 20000,
        },
      ])
      .returning();
    if (!wall || !roof || !windows) throw new Error("failed to seed measures");

    const selectResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measureIds: [wall.id, roof.id] }),
      },
      cookie,
    );
    expect(selectResponse.status).toBe(200);

    const listResponse = await authRequest(`/api/buildings/${buildingId}/measures`, {}, cookie);
    const { measures } = (await listResponse.json()) as {
      measures: { id: string; proposedForImplementation: boolean }[];
    };
    const byId = new Map(measures.map((m) => [m.id, m.proposedForImplementation]));
    expect(byId.get(wall.id)).toBe(true);
    expect(byId.get(roof.id)).toBe(true);
    expect(byId.get(windows.id)).toBe(false);

    // Re-selecting a different subset flips the previous selection off too.
    const reselectResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ measureIds: [windows.id] }),
      },
      cookie,
    );
    expect(reselectResponse.status).toBe(200);

    const secondListResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {},
      cookie,
    );
    const secondBody = (await secondListResponse.json()) as {
      measures: { id: string; proposedForImplementation: boolean }[];
    };
    const secondById = new Map(secondBody.measures.map((m) => [m.id, m.proposedForImplementation]));
    expect(secondById.get(wall.id)).toBe(false);
    expect(secondById.get(roof.id)).toBe(false);
    expect(secondById.get(windows.id)).toBe(true);
  });

  it("creates a measure via POST and lists it back", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "LED retrofit",
          category: "lighting",
          investmentCostUsd: 4000,
          lifetimeYears: 15,
          maintenanceCostPercent: 0.01,
        }),
      },
      cookie,
    );
    expect(createResponse.status).toBe(201);
    const { measure } = (await createResponse.json()) as { measure: { id: string; name: string } };
    expect(measure.name).toBe("LED retrofit");

    const listResponse = await authRequest(`/api/buildings/${buildingId}/measures`, {}, cookie);
    const { measures } = (await listResponse.json()) as { measures: { id: string }[] };
    expect(measures.map((m) => m.id)).toContain(measure.id);
  });

  it("rejects a measure with an unknown category (400)", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Bogus",
          category: "not-a-real-category",
          investmentCostUsd: 100,
        }),
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });

  it("deletes a measure", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Roof insulation",
          category: "envelope_roof_insulation",
          investmentCostUsd: 3000,
        }),
      },
      cookie,
    );
    const { measure } = (await createResponse.json()) as { measure: { id: string } };

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const listResponse = await authRequest(`/api/buildings/${buildingId}/measures`, {}, cookie);
    const { measures } = (await listResponse.json()) as { measures: { id: string }[] };
    expect(measures.map((m) => m.id)).not.toContain(measure.id);
  });

  it("stores targets with POST, replaces them as a set with PUT, and cascades on delete", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const json = { "Content-Type": "application/json" };
    const base = { name: "Wall", category: "envelope_wall_insulation", investmentCostUsd: 1000 };

    const created = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: json,
        body: JSON.stringify({
          ...base,
          targets: [
            { kind: "construction_type", code: "W1" },
            { kind: "construction_type", code: "Socle 1." },
          ],
        }),
      },
      cookie,
    );
    expect(created.status).toBe(201);
    const { measure } = (await created.json()) as {
      measure: { id: string; targets: { kind: string; code: string }[] };
    };
    expect(measure.targets.map((t) => t.code).sort()).toEqual(["Socle 1.", "W1"]);

    const updated = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      {
        method: "PUT",
        headers: json,
        body: JSON.stringify({
          ...base,
          name: "Wall 2",
          targets: [{ kind: "opening_type", code: "Win3" }],
        }),
      },
      cookie,
    );
    expect(updated.status).toBe(200);
    const body = (await updated.json()) as {
      measure: { name: string; targets: { kind: string; code: string }[] };
    };
    expect(body.measure.name).toBe("Wall 2");
    expect(body.measure.targets).toEqual([{ kind: "opening_type", code: "Win3" }]);

    // targets are capped (V-3)
    const tooMany = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: json,
        body: JSON.stringify({
          ...base,
          targets: Array.from({ length: 41 }, (_, i) => ({
            kind: "construction_type",
            code: `W${i}`,
          })),
        }),
      },
      cookie,
    );
    expect(tooMany.status).toBe(400);

    await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(await testDb.select().from(energyMeasureTarget)).toHaveLength(0);
  });

  it("404s a PUT for a measure of another building", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const otherBuildingId = await createBuilding(cookie);
    const created = await authRequest(
      `/api/buildings/${otherBuildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Wall",
          category: "envelope_wall_insulation",
          investmentCostUsd: 1,
        }),
      },
      cookie,
    );
    const { measure } = (await created.json()) as { measure: { id: string } };
    const response = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "x",
          category: "envelope_wall_insulation",
          investmentCostUsd: 1,
        }),
      },
      cookie,
    );
    expect(response.status).toBe(404);
  });

  it("404s deleting a measure that doesn't belong to the building", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const otherBuildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${otherBuildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Wall insulation",
          category: "envelope_wall_insulation",
          investmentCostUsd: 3000,
        }),
      },
      cookie,
    );
    const { measure } = (await createResponse.json()) as { measure: { id: string } };

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(404);
  });
});

describe("Consumption API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("bulk-inserts utility bills and lists them back", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bills: [
            { energyCarrier: "gas", year: 2024, month: 1, consumptionNative: 1200 },
            { energyCarrier: "gas", year: 2024, month: 2, consumptionNative: 1000 },
            { energyCarrier: "electricity", year: 2024, month: 1, consumptionNative: 3400 },
          ],
        }),
      },
      cookie,
    );
    expect(createResponse.status).toBe(201);
    const { bills } = (await createResponse.json()) as { bills: unknown[] };
    expect(bills).toHaveLength(3);

    const listResponse = await authRequest(`/api/buildings/${buildingId}/consumption`, {}, cookie);
    const listBody = (await listResponse.json()) as { bills: { energyCarrier: string }[] };
    expect(listBody.bills).toHaveLength(3);
    expect(listBody.bills.filter((b) => b.energyCarrier === "gas")).toHaveLength(2);
  });

  it("rejects a bill with an invalid month (400)", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bills: [{ energyCarrier: "gas", year: 2024, month: 13, consumptionNative: 100 }],
        }),
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });
});
