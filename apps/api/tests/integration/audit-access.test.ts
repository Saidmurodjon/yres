import { auditRun, climateRegion } from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING_INPUT = {
  name: "Shared Hospital",
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

describe("Audit routes: viewers cannot write (A-2)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  async function setup() {
    const owner = await signUpTestUser();
    const viewer = await signUpTestUser();
    const editor = await signUpTestUser();
    const [tashkent] = await testDb
      .select()
      .from(climateRegion)
      .where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");

    const created = await authRequest(
      "/api/buildings",
      json("POST", { ...BUILDING_INPUT, climateRegionId: tashkent.id }),
      owner.cookie,
    );
    const { building } = (await created.json()) as { building: { id: string } };
    for (const [member, role] of [
      [viewer, "viewer"],
      [editor, "editor"],
    ] as const) {
      await authRequest(
        `/api/buildings/${building.id}/members`,
        json("POST", { email: member.email, role }),
        owner.cookie,
      );
    }
    return { owner, viewer, editor, buildingId: building.id };
  }

  const runs = (buildingId: string) =>
    testDb.select().from(auditRun).where(eq(auditRun.buildingId, buildingId));

  it("403s a viewer starting an audit run and writes no audit_run row; an editor gets 201", async () => {
    const { viewer, editor, buildingId } = await setup();

    const denied = await authRequest(
      `/api/buildings/${buildingId}/audit/run`,
      { method: "POST" },
      viewer.cookie,
    );
    expect(denied.status).toBe(403);
    expect(await runs(buildingId)).toHaveLength(0);

    const allowed = await authRequest(
      `/api/buildings/${buildingId}/audit/run`,
      { method: "POST" },
      editor.cookie,
    );
    expect(allowed.status).toBe(201);
    expect(await runs(buildingId)).toHaveLength(1);
  });

  it("lets a viewer download the report without writing the cached copy; a writer's download does", async () => {
    const { owner, viewer, buildingId } = await setup();
    await authRequest(`/api/buildings/${buildingId}/audit/run`, { method: "POST" }, owner.cookie);

    const viewerPdf = await authRequest(
      `/api/buildings/${buildingId}/audit/report`,
      {},
      viewer.cookie,
    );
    expect(viewerPdf.status).toBe(200);
    expect(viewerPdf.headers.get("Content-Type")).toBe("application/pdf");
    expect((await runs(buildingId))[0]?.reportR2Key).toBeNull();

    const ownerPdf = await authRequest(
      `/api/buildings/${buildingId}/audit/report`,
      {},
      owner.cookie,
    );
    expect(ownerPdf.status).toBe(200);
    expect((await runs(buildingId))[0]?.reportR2Key).toBe(`reports/${buildingId}/latest.pdf`);
  });
});
