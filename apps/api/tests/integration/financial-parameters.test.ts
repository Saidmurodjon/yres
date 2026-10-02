import { buildingFinancialParameters } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { defaultFinancialParameters } from "../../src/lib/financial-defaults";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING = {
  name: "Fin",
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("/financial-parameters", () => {
  beforeEach(async () => {
    await resetTestDb();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  async function setup() {
    const owner = await signUpTestUser();
    const viewer = await signUpTestUser();
    const stranger = await signUpTestUser();
    const region = await seedClimateRegion();
    const res = await authRequest(
      "/api/buildings",
      json("POST", { ...BUILDING, climateRegionId: region.id }),
      owner.cookie,
    );
    const { building } = (await res.json()) as { building: { id: string } };
    await authRequest(
      `/api/buildings/${building.id}/members`,
      json("POST", { email: viewer.email, role: "viewer" }),
      owner.cookie,
    );
    return { owner, viewer, stranger, path: `/api/buildings/${building.id}/financial-parameters` };
  }

  it("GET returns the v7.20 defaults with isDefault and writes nothing", async () => {
    const { owner, path } = await setup();
    const res = await authRequest(path, { method: "GET" }, owner.cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { parameters: Record<string, unknown>; isDefault: boolean };
    expect(body.isDefault).toBe(true);
    expect(body.parameters.periodYears).toBe(20);
    expect(body.parameters.pvExportEnabled).toBe(false);
    expect(await testDb.select().from(buildingFinancialParameters)).toHaveLength(0);
  });

  it("PUT upserts and GET returns the saved values", async () => {
    const { owner, path } = await setup();
    const values = { ...defaultFinancialParameters(), periodYears: 25, pvExportEnabled: true };
    expect((await authRequest(path, json("PUT", values), owner.cookie)).status).toBe(200);
    expect(
      (await authRequest(path, json("PUT", { ...values, periodYears: 30 }), owner.cookie)).status,
    ).toBe(200);
    const res = await authRequest(path, { method: "GET" }, owner.cookie);
    const body = (await res.json()) as { parameters: typeof values; isDefault: boolean };
    expect(body.isDefault).toBe(false);
    expect(body.parameters.periodYears).toBe(30);
    expect(body.parameters.pvExportEnabled).toBe(true);
    expect(await testDb.select().from(buildingFinancialParameters)).toHaveLength(1);
  });

  it("rejects out-of-range values with 400", async () => {
    const { owner, path } = await setup();
    const bad = { ...defaultFinancialParameters(), exchangeRateUzsPerUsd: 0 };
    expect((await authRequest(path, json("PUT", bad), owner.cookie)).status).toBe(400);
    const bad2 = { ...defaultFinancialParameters(), periodYears: 51 };
    expect((await authRequest(path, json("PUT", bad2), owner.cookie)).status).toBe(400);
  });

  it("404s a stranger (GET and PUT); a viewer reads but cannot write (403)", async () => {
    const { viewer, stranger, path } = await setup();
    expect((await authRequest(path, { method: "GET" }, stranger.cookie)).status).toBe(404);
    expect(
      (await authRequest(path, json("PUT", defaultFinancialParameters()), stranger.cookie)).status,
    ).toBe(404);
    expect((await authRequest(path, { method: "GET" }, viewer.cookie)).status).toBe(200);
    const put = await authRequest(path, json("PUT", defaultFinancialParameters()), viewer.cookie);
    expect(put.status).toBe(403);
    expect(await testDb.select().from(buildingFinancialParameters)).toHaveLength(0);
  });
});
