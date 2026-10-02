import { utilityBill } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING = {
  name: "Bulk",
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
const months = (n: number, value = 100) =>
  Array.from({ length: n }, (_, i) => ({ month: i + 1, consumptionNative: value + i }));
const bulk = (id: string, years: unknown, cookie: string) =>
  authRequest(`/api/buildings/${id}/consumption/bulk`, json("PUT", { years }), cookie);

describe("PUT /consumption/bulk", () => {
  beforeEach(async () => {
    await resetTestDb();
  });
  afterAll(async () => {
    await closeTestDb();
  });

  async function setup() {
    const owner = await signUpTestUser();
    const region = await seedClimateRegion();
    const res = await authRequest(
      "/api/buildings",
      json("POST", { ...BUILDING, climateRegionId: region.id }),
      owner.cookie,
    );
    const { building } = (await res.json()) as { building: { id: string } };
    const rows = (id: string) =>
      testDb.select().from(utilityBill).where(eq(utilityBill.buildingId, id));
    return { owner, id: building.id, rows };
  }

  it("saves 2 years x 2 carriers at once", async () => {
    const { owner, id, rows } = await setup();
    const res = await bulk(
      id,
      [
        {
          year: 2023,
          carriers: [
            { energyCarrier: "gas", bills: months(12) },
            { energyCarrier: "electricity", bills: months(6) },
          ],
        },
        {
          year: 2024,
          carriers: [
            { energyCarrier: "gas", bills: months(3) },
            { energyCarrier: "electricity", bills: [] },
          ],
        },
      ],
      owner.cookie,
    );
    expect(res.status).toBe(200);
    expect(await rows(id)).toHaveLength(12 + 6 + 3);
  });

  it("an empty carrier group, and a carrier left out of a sent year, clear their old rows", async () => {
    const { owner, id, rows } = await setup();
    await bulk(
      id,
      [
        {
          year: 2024,
          carriers: [
            { energyCarrier: "gas", bills: months(12) },
            { energyCarrier: "coal", bills: months(4) },
          ],
        },
      ],
      owner.cookie,
    );
    await bulk(
      id,
      [{ year: 2022, carriers: [{ energyCarrier: "gas", bills: months(2) }] }],
      owner.cookie,
    );
    // gas emptied explicitly; coal not listed at all -> both gone for 2024; 2022 untouched by that.
    await bulk(id, [{ year: 2024, carriers: [{ energyCarrier: "gas", bills: [] }] }], owner.cookie);
    const left = await rows(id);
    expect(left.filter((r) => r.year === 2024)).toHaveLength(0);
    expect(left.filter((r) => r.year === 2022)).toHaveLength(2);
  });

  it("rejects a duplicate year or carrier with 400 and writes nothing", async () => {
    const { owner, id, rows } = await setup();
    const dupYear = await bulk(
      id,
      [
        { year: 2024, carriers: [] },
        { year: 2024, carriers: [] },
      ],
      owner.cookie,
    );
    const dupCarrier = await bulk(
      id,
      [
        {
          year: 2024,
          carriers: [
            { energyCarrier: "gas", bills: months(1) },
            { energyCarrier: "gas", bills: months(1) },
          ],
        },
      ],
      owner.cookie,
    );
    expect([dupYear.status, dupCarrier.status]).toEqual([400, 400]);
    expect(await rows(id)).toHaveLength(0);
  });

  it("takes the worst case: 5 years x 4 carriers x 12 months", async () => {
    const { owner, id, rows } = await setup();
    const years = [2020, 2021, 2022, 2023, 2024].map((year) => ({
      year,
      carriers: (["gas", "electricity", "district_heat", "coal"] as const).map((energyCarrier) => ({
        energyCarrier,
        bills: months(12),
      })),
    }));
    const res = await bulk(id, years, owner.cookie);
    expect(res.status).toBe(200);
    expect(await rows(id)).toHaveLength(240);
  });

  it("403 for a viewer, 404 for a stranger", async () => {
    const { owner, id } = await setup();
    const viewer = await signUpTestUser();
    const stranger = await signUpTestUser();
    await authRequest(
      `/api/buildings/${id}/members`,
      json("POST", { email: viewer.email, role: "viewer" }),
      owner.cookie,
    );
    const payload = [{ year: 2024, carriers: [{ energyCarrier: "gas", bills: months(1) }] }];
    expect((await bulk(id, payload, viewer.cookie)).status).toBe(403);
    expect((await bulk(id, payload, stranger.cookie)).status).toBe(404);
  });
});
