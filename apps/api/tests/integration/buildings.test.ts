import { auditEvent, auditRun, utilityBill } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/index";
import { seedClimateRegion as seedClimateRegionRow } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";
import { testEnv } from "../helpers/test-env";

async function seedClimateRegion() {
  const region = await seedClimateRegionRow();
  return region.id;
}

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

describe("Buildings API", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const response = await app.request("/api/buildings", {}, testEnv);
    expect(response.status).toBe(401);
  });

  it("creates a building and scopes it to the authenticated user", async () => {
    const { cookie, userId } = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      cookie,
    );

    expect(createResponse.status).toBe(201);
    const { building } = (await createResponse.json()) as {
      building: { id: string; userId: string; name: string };
    };
    expect(building.name).toBe("Test Hospital");
    expect(building.userId).toBe(userId);

    const getResponse = await authRequest(`/api/buildings/${building.id}`, {}, cookie);
    expect(getResponse.status).toBe(200);
  });

  it("rejects building creation with invalid input (400)", async () => {
    const { cookie } = await signUpTestUser();

    const response = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "" }), // missing every required field
      },
      cookie,
    );

    expect(response.status).toBe(400);
  });

  it("does not let one user read another user's building (404, not leaked)", async () => {
    const owner = await signUpTestUser();
    const intruder = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      owner.cookie,
    );
    const { building } = (await createResponse.json()) as { building: { id: string } };

    const intruderResponse = await authRequest(
      `/api/buildings/${building.id}`,
      {},
      intruder.cookie,
    );
    expect(intruderResponse.status).toBe(404);
  });

  it("updates and deletes a building", async () => {
    const { cookie } = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      cookie,
    );
    const { building } = (await createResponse.json()) as { building: { id: string } };

    const updateResponse = await authRequest(
      `/api/buildings/${building.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed Hospital" }),
      },
      cookie,
    );
    expect(updateResponse.status).toBe(200);
    const { building: updated } = (await updateResponse.json()) as { building: { name: string } };
    expect(updated.name).toBe("Renamed Hospital");

    const deleteResponse = await authRequest(
      `/api/buildings/${building.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const getAfterDelete = await authRequest(`/api/buildings/${building.id}`, {}, cookie);
    expect(getAfterDelete.status).toBe(404);
  });

  it("paginates the buildings list", async () => {
    const { cookie } = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    for (let i = 0; i < 3; i++) {
      await authRequest(
        "/api/buildings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...VALID_BUILDING_INPUT, name: `Building ${i}`, climateRegionId }),
        },
        cookie,
      );
    }

    const response = await authRequest("/api/buildings?page=1&pageSize=2", {}, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      buildings: unknown[];
      page: number;
      pageSize: number;
    };
    expect(body.buildings).toHaveLength(2);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(2);
  });

  it("soft-deletes a building: child rows and the delete audit_event survive, hidden from list/stats/locations", async () => {
    const { cookie, userId } = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      cookie,
    );
    const { building } = (await createResponse.json()) as { building: { id: string } };

    await testDb.insert(utilityBill).values({
      buildingId: building.id,
      energyCarrier: "electricity",
      year: 2025,
      month: 1,
      consumptionNative: 100,
    });
    await testDb.insert(auditRun).values({ buildingId: building.id, triggeredByUserId: userId });

    const deleteResponse = await authRequest(
      `/api/buildings/${building.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(204);

    // Hidden from direct access and every list/aggregate endpoint.
    expect((await authRequest(`/api/buildings/${building.id}`, {}, cookie)).status).toBe(404);
    const list = (await (await authRequest("/api/buildings", {}, cookie)).json()) as {
      buildings: { id: string }[];
    };
    expect(list.buildings.find((b) => b.id === building.id)).toBeUndefined();
    const stats = (await (await authRequest("/api/buildings/stats", {}, cookie)).json()) as {
      totalCount: number;
    };
    expect(stats.totalCount).toBe(0);
    const locations = (await (await authRequest("/api/buildings/locations", {}, cookie)).json()) as {
      locations: string[];
    };
    expect(locations.locations).not.toContain(VALID_BUILDING_INPUT.location);

    // A second delete is also 404 (not deleted twice).
    expect(
      (await authRequest(`/api/buildings/${building.id}`, { method: "DELETE" }, cookie)).status,
    ).toBe(404);

    // Child rows and the audit trail are untouched.
    const bills = await testDb
      .select()
      .from(utilityBill)
      .where(eq(utilityBill.buildingId, building.id));
    expect(bills).toHaveLength(1);
    const runs = await testDb.select().from(auditRun).where(eq(auditRun.buildingId, building.id));
    expect(runs).toHaveLength(1);
    const deleteEvents = await testDb
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.buildingId, building.id));
    expect(deleteEvents.some((e) => e.action === "delete")).toBe(true);
  });

  it("does not let a non-owner delete a building (404, not leaked)", async () => {
    const owner = await signUpTestUser();
    const intruder = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      owner.cookie,
    );
    const { building } = (await createResponse.json()) as { building: { id: string } };

    const intruderDelete = await authRequest(
      `/api/buildings/${building.id}`,
      { method: "DELETE" },
      intruder.cookie,
    );
    expect(intruderDelete.status).toBe(404);

    expect((await authRequest(`/api/buildings/${building.id}`, {}, owner.cookie)).status).toBe(
      200,
    );
  });

  it("restores a soft-deleted building (owner only); 409 if not deleted, 404 for an intruder", async () => {
    const owner = await signUpTestUser();
    const intruder = await signUpTestUser();
    const climateRegionId = await seedClimateRegion();

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      owner.cookie,
    );
    const { building } = (await createResponse.json()) as { building: { id: string } };

    // Not deleted yet — restoring is a 409.
    expect(
      (await authRequest(`/api/buildings/${building.id}/restore`, { method: "POST" }, owner.cookie))
        .status,
    ).toBe(409);

    await authRequest(`/api/buildings/${building.id}`, { method: "DELETE" }, owner.cookie);

    // An intruder can't restore someone else's (still-hidden) building.
    expect(
      (
        await authRequest(
          `/api/buildings/${building.id}/restore`,
          { method: "POST" },
          intruder.cookie,
        )
      ).status,
    ).toBe(404);

    const restoreResponse = await authRequest(
      `/api/buildings/${building.id}/restore`,
      { method: "POST" },
      owner.cookie,
    );
    expect(restoreResponse.status).toBe(200);
    const { building: restored } = (await restoreResponse.json()) as {
      building: { id: string; deletedAt: unknown };
    };
    expect(restored.deletedAt).toBeNull();

    expect((await authRequest(`/api/buildings/${building.id}`, {}, owner.cookie)).status).toBe(
      200,
    );

    const restoreEvents = await testDb
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.buildingId, building.id));
    expect(restoreEvents.some((e) => e.action === "restore")).toBe(true);
  });
});
