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

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

interface Snapshot {
  id: string;
  status: string;
}

async function setupBuilding() {
  const owner = await signUpTestUser();
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
  const { building: createdBuilding } = (await created.json()) as { building: { id: string } };
  return { owner, buildingId: createdBuilding.id as string };
}

async function createSnapshot(buildingId: string, cookie: string) {
  const response = await authRequest(
    `/api/buildings/${buildingId}/audit/snapshots`,
    { method: "POST" },
    cookie,
  );
  const { snapshot } = (await response.json()) as { snapshot: Snapshot };
  return snapshot;
}

async function submitSnapshot(buildingId: string, snapshotId: string, cookie: string) {
  const response = await authRequest(
    `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/submit`,
    { method: "POST" },
    cookie,
  );
  expect(response.status).toBe(200);
}

async function approveSnapshot(buildingId: string, snapshotId: string, cookie: string) {
  const response = await authRequest(
    `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/approve`,
    { method: "POST" },
    cookie,
  );
  expect(response.status).toBe(200);
}

describe("Verify (A07)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("GET /api/verify/s/:id — draft snapshot is not-found (not yet real)", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const res = await authRequest(`/api/verify/s/${snapshot.id}`, {}, "");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ valid: false });
  });

  it("GET /api/verify/s/:id — submitted snapshot is valid, whitelist-only response", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await submitSnapshot(buildingId, snapshot.id, owner.cookie);

    const res = await authRequest(`/api/verify/s/${snapshot.id}`, {}, "");
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = (await res.json()) as Record<string, unknown>;

    expect(body.valid).toBe(true);
    expect(body.status).toBe("submitted");
    expect(body.buildingName).toBe("Test Hospital");
    expect(typeof body.engineVersion).toBe("string");
    expect(typeof body.methodologyVersion).toBe("string");
    expect(typeof body.inputsSha256).toBe("string");
    expect(body.reports).toEqual([]);
    expect(body.approvedAt).toBeNull();
    expect(body.supersededAt).toBeNull();

    // Oq ro'yxat — joylashuv, moliya, foydalanuvchi ma'lumoti sizib chiqmasligi kerak.
    expect(Object.keys(body).sort()).toEqual(
      [
        "valid",
        "buildingName",
        "status",
        "generatedAt",
        "submittedAt",
        "approvedAt",
        "supersededAt",
        "engineVersion",
        "methodologyVersion",
        "inputsSha256",
        "reports",
      ].sort(),
    );
  });

  it("GET /api/verify/s/:id — approved snapshot with an issued report lists it", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await submitSnapshot(buildingId, snapshot.id, owner.cookie);
    await approveSnapshot(buildingId, snapshot.id, owner.cookie);

    const issueResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    expect(issueResponse.status).toBe(201);
    const { report } = (await issueResponse.json()) as {
      report: { sha256: string; sizeBytes: number };
    };

    const res = await authRequest(`/api/verify/s/${snapshot.id}`, {}, "");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      approvedAt: string;
      reports: { lang: string; sha256: string; sizeBytes: number }[];
    };
    expect(body.status).toBe("approved");
    expect(body.approvedAt).not.toBeNull();
    expect(body.reports).toHaveLength(1);
    expect(body.reports[0]).toMatchObject({
      lang: "en",
      sha256: report.sha256,
      sizeBytes: report.sizeBytes,
    });
  });

  it("GET /api/verify/s/:id — superseded snapshot is still verifiable (not treated as not-found)", async () => {
    const { owner, buildingId } = await setupBuilding();
    const first = await createSnapshot(buildingId, owner.cookie);
    await submitSnapshot(buildingId, first.id, owner.cookie);
    await approveSnapshot(buildingId, first.id, owner.cookie);

    const second = await createSnapshot(buildingId, owner.cookie);
    await submitSnapshot(buildingId, second.id, owner.cookie);
    await approveSnapshot(buildingId, second.id, owner.cookie);

    const res = await authRequest(`/api/verify/s/${first.id}`, {}, "");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string; supersededAt: string | null };
    expect(body.status).toBe("superseded");
    expect(body.supersededAt).not.toBeNull();
  });

  it("GET /api/verify/s/:id — missing snapshot and malformed (non-UUID) id both 404", async () => {
    const missing = await authRequest(`/api/verify/s/${crypto.randomUUID()}`, {}, "");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ valid: false });

    const malformed = await authRequest("/api/verify/s/not-a-uuid", {}, "");
    expect(malformed.status).toBe(404);
    expect(await malformed.json()).toEqual({ valid: false });
  });

  it("GET /api/verify/s/:id — still works after the building is soft-deleted (A03 §7)", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await submitSnapshot(buildingId, snapshot.id, owner.cookie);

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}`,
      { method: "DELETE" },
      owner.cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const res = await authRequest(`/api/verify/s/${snapshot.id}`, {}, "");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { valid: boolean; buildingName: string };
    expect(body.valid).toBe(true);
    expect(body.buildingName).toBe("Test Hospital");
  });

  it("GET /api/verify/:auditRunId — legacy route keeps working and now flags itself", async () => {
    const { owner, buildingId } = await setupBuilding();

    const runResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/run`,
      { method: "POST" },
      owner.cookie,
    );
    expect(runResponse.status).toBe(201);
    const { auditRun: run } = (await runResponse.json()) as { auditRun: { id: string } };

    const ok = await authRequest(`/api/verify/${run.id}`, {}, "");
    expect(ok.status).toBe(200);
    const okBody = (await ok.json()) as { valid: boolean; legacy: boolean };
    expect(okBody.valid).toBe(true);
    expect(okBody.legacy).toBe(true);

    const missing = await authRequest(`/api/verify/${crypto.randomUUID()}`, {}, "");
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ valid: false });

    const malformed = await authRequest("/api/verify/not-a-uuid", {}, "");
    expect(malformed.status).toBe(404);
    expect(await malformed.json()).toEqual({ valid: false });
  });
});
