import { auditEvent, auditSnapshotReport, climateMonthlyNormal, climateRegion, energyTariff } from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb, testReportsBucket } from "../helpers/test-db";

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

interface SnapshotReportRow {
  id: string;
  snapshotId: string;
  lang: string;
  r2Key: string;
  sha256: string;
  sizeBytes: number;
}

async function setupBuilding() {
  const owner = await signUpTestUser();
  const viewer = await signUpTestUser();
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
  await authRequest(
    `/api/buildings/${createdBuilding.id}/members`,
    json("POST", { email: viewer.email, role: "viewer" }),
    owner.cookie,
  );

  return { owner, viewer, buildingId: createdBuilding.id as string, tashkentId: tashkent.id };
}

async function createSubmittedSnapshot(buildingId: string, ownerCookie: string) {
  const createResponse = await authRequest(
    `/api/buildings/${buildingId}/audit/snapshots`,
    { method: "POST" },
    ownerCookie,
  );
  const { snapshot } = (await createResponse.json()) as { snapshot: Snapshot };
  const submitResponse = await authRequest(
    `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
    { method: "POST" },
    ownerCookie,
  );
  expect(submitResponse.status).toBe(200);
  return snapshot.id;
}

describe("Snapshot reports (A06)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("issues an immutable PDF whose stored sha256 matches the downloaded bytes, twice, byte-identically, even after inputs/tariffs change", async () => {
    const { owner, buildingId, tashkentId } = await setupBuilding();
    const snapshotId = await createSubmittedSnapshot(buildingId, owner.cookie);

    const issueResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    expect(issueResponse.status).toBe(201);
    const { report } = (await issueResponse.json()) as { report: SnapshotReportRow };
    expect(report.lang).toBe("en");

    const download1 = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/en`,
      {},
      owner.cookie,
    );
    expect(download1.status).toBe(200);
    expect(download1.headers.get("content-type")).toBe("application/pdf");
    const bytes1 = new Uint8Array(await download1.arrayBuffer());
    expect(bytes1.length).toBe(report.sizeBytes);

    const digest = await crypto.subtle.digest("SHA-256", bytes1);
    const sha256Hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    expect(sha256Hex).toBe(report.sha256);

    // Mutate everything a snapshot is supposed to freeze against.
    await authRequest(
      `/api/buildings/${buildingId}`,
      json("PUT", { occupantCount: 999 }),
      owner.cookie,
    );
    await testDb.insert(energyTariff).values({
      energyCarrier: "electricity",
      unitCostLocal: 999,
      unitCostUsd: 999,
      emissionFactorKgCo2PerKwh: 0.5,
      primaryEnergyFactor: 2.5,
      exchangeRateLocalPerUsd: 12700,
      effectiveDate: "2099-01-01",
    });
    const [someNormal] = await testDb
      .select()
      .from(climateMonthlyNormal)
      .where(eq(climateMonthlyNormal.climateRegionId, tashkentId))
      .limit(1);
    if (!someNormal) throw new Error("expected seeded monthly normal");
    await testDb
      .update(climateMonthlyNormal)
      .set({ avgOutdoorTempC: someNormal.avgOutdoorTempC + 50 })
      .where(eq(climateMonthlyNormal.id, someNormal.id));

    const download2 = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/en`,
      {},
      owner.cookie,
    );
    const bytes2 = new Uint8Array(await download2.arrayBuffer());
    expect(bytes2).toEqual(bytes1);

    // Second POST for the same (sid, lang) doesn't re-render: same row, no second R2 object.
    const reissueResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    expect(reissueResponse.status).toBe(200);
    const { report: reissuedReport } = (await reissueResponse.json()) as {
      report: SnapshotReportRow;
    };
    expect(reissuedReport.id).toBe(report.id);
    expect(reissuedReport.r2Key).toBe(report.r2Key);

    const rows = await testDb
      .select()
      .from(auditSnapshotReport)
      .where(eq(auditSnapshotReport.snapshotId, snapshotId));
    expect(rows).toHaveLength(1);

    const events = await testDb
      .select()
      .from(auditEvent)
      .where(and(eq(auditEvent.buildingId, buildingId), eq(auditEvent.action, "issue_report")));
    expect(events).toHaveLength(1);
  });

  it("409s issuing a report for a still-draft snapshot", async () => {
    const { owner, buildingId } = await setupBuilding();
    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot } = (await createResponse.json()) as { snapshot: Snapshot };
    expect(snapshot.status).toBe("draft");

    const issueResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    expect(issueResponse.status).toBe(409);
  });

  it("403s a viewer issuing a report but lets the viewer download an already-issued one; 404s a stranger", async () => {
    const { owner, viewer, buildingId } = await setupBuilding();
    const snapshotId = await createSubmittedSnapshot(buildingId, owner.cookie);

    const viewerIssue = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
      json("POST", { lang: "en" }),
      viewer.cookie,
    );
    expect(viewerIssue.status).toBe(403);

    const ownerIssue = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    expect(ownerIssue.status).toBe(201);

    const viewerDownload = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/en`,
      {},
      viewer.cookie,
    );
    expect(viewerDownload.status).toBe(200);
    expect(viewerDownload.headers.get("content-disposition")).toContain("attachment");

    const stranger = await signUpTestUser();
    const strangerDownload = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/en`,
      {},
      stranger.cookie,
    );
    expect(strangerDownload.status).toBe(404);

    const missingLang = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/ru`,
      {},
      owner.cookie,
    );
    expect(missingLang.status).toBe(404);

    const malformedLang = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/xx`,
      {},
      owner.cookie,
    );
    expect(malformedLang.status).toBe(400);
  });

  it("500s a download whose R2 object no longer matches its stored sha256", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshotId = await createSubmittedSnapshot(buildingId, owner.cookie);

    const issueResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports`,
      json("POST", { lang: "en" }),
      owner.cookie,
    );
    const { report } = (await issueResponse.json()) as { report: SnapshotReportRow };

    await testReportsBucket.put(report.r2Key, new TextEncoder().encode("corrupted"));

    const corrupted = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshotId}/reports/en`,
      {},
      owner.cookie,
    );
    expect(corrupted.status).toBe(500);
    const body = (await corrupted.json()) as { error: string };
    expect(body.error).not.toMatch(/sha|hash|r2|hex/i);
  });
});
