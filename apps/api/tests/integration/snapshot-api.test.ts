import {
  auditEvent,
  auditSnapshot,
  climateMonthlyNormal,
  climateRegion,
  energyTariff,
} from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "../../src/services/engine-version";
import { computeAudit } from "../../src/services/audit.engine";
import { readSnapshotJson } from "../../src/services/snapshot.service";
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
  resultR2Key: string;
  resultSha256: string;
  inputsR2Key: string;
  inputsSha256: string;
  generatedAt: string;
  engineVersion: string;
  supersededById: string | null;
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

  return { owner, viewer, buildingId: createdBuilding.id, tashkentId: tashkent.id };
}

describe("Snapshot API (A05a)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("freezes a point in time: later building/tariff/climate changes don't affect the snapshot, but /audit/results does", async () => {
    const { owner, buildingId, tashkentId } = await setupBuilding();

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    expect(createResponse.status).toBe(201);
    const { snapshot } = (await createResponse.json()) as { snapshot: Snapshot };
    expect(snapshot.status).toBe("draft");
    expect(snapshot.engineVersion).toBe(ENGINE_VERSION);

    const getBefore = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}`,
      {},
      owner.cookie,
    );
    const { result: resultAtSnapshot } = (await getBefore.json()) as { result: unknown };

    // Mutate everything the spec calls out: building input, global tariff, climate normal.
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

    const getAfter = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}`,
      {},
      owner.cookie,
    );
    const { result: resultStillFrozen } = (await getAfter.json()) as { result: unknown };
    expect(resultStillFrozen).toEqual(resultAtSnapshot);

    const liveResults = await authRequest(
      `/api/buildings/${buildingId}/audit/results`,
      {},
      owner.cookie,
    );
    const { result: liveResult } = (await liveResults.json()) as { result: unknown };
    expect(liveResult).not.toEqual(resultAtSnapshot);
  });

  it("is reproducible: computeAudit(stored inputs) deep-equals the stored result", async () => {
    const { owner, buildingId } = await setupBuilding();

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot } = (await createResponse.json()) as { snapshot: Snapshot };

    const [row] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    if (!row) throw new Error("snapshot row missing");

    const inputs = await readSnapshotJson(testReportsBucket, row.inputsR2Key, row.inputsSha256);
    const storedResult = await readSnapshotJson(
      testReportsBucket,
      row.resultR2Key,
      row.resultSha256,
    );
    const recomputed = computeAudit(inputs as Parameters<typeof computeAudit>[0], {
      generatedAt: row.generatedAt,
    });

    expect(recomputed).toEqual(storedResult);
  });

  it("corrupted R2 object -> 500; cross-building :sid -> 404; viewer POST -> 403; malformed :sid -> 400", async () => {
    const { owner, viewer, buildingId, tashkentId } = await setupBuilding();
    const otherOwner = await signUpTestUser();

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot } = (await createResponse.json()) as { snapshot: Snapshot };

    const viewerCreate = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      viewer.cookie,
    );
    expect(viewerCreate.status).toBe(403);

    const otherBuildingResponse = await authRequest(
      "/api/buildings",
      json("POST", { ...BUILDING_INPUT, climateRegionId: tashkentId }),
      otherOwner.cookie,
    );
    const { building: otherBuilding } = (await otherBuildingResponse.json()) as {
      building: { id: string };
    };
    const crossLookup = await authRequest(
      `/api/buildings/${otherBuilding.id}/audit/snapshots/${snapshot.id}`,
      {},
      otherOwner.cookie,
    );
    expect(crossLookup.status).toBe(404);

    const malformed = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/not-a-uuid`,
      {},
      owner.cookie,
    );
    expect(malformed.status).toBe(400);

    const [row] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    if (!row) throw new Error("snapshot row missing");
    await testReportsBucket.put(row.resultR2Key, new TextEncoder().encode("corrupted"));

    const corrupted = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}`,
      {},
      owner.cookie,
    );
    expect(corrupted.status).toBe(500);
    const corruptedBody = (await corrupted.json()) as { error: string; result?: unknown };
    expect(corruptedBody.result).toBeUndefined();
    expect(corruptedBody.error).not.toMatch(/sha|hash|r2|hex/i);
  });

  it("a new snapshot supersedes open draft/submitted snapshots but leaves approved alone; create is journaled", async () => {
    const { owner, buildingId } = await setupBuilding();

    const firstResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot: first } = (await firstResponse.json()) as { snapshot: Snapshot };

    // Promote the first snapshot all the way to approved (legal draft->submitted->approved,
    // done directly since A05b's submit/approve routes aren't built yet).
    await testDb
      .update(auditSnapshot)
      .set({ status: "submitted", submittedByUserId: owner.userId, submittedAt: new Date() })
      .where(eq(auditSnapshot.id, first.id));
    await testDb
      .update(auditSnapshot)
      .set({ status: "approved", approvedByUserId: owner.userId, approvedAt: new Date() })
      .where(eq(auditSnapshot.id, first.id));

    const secondResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot: second } = (await secondResponse.json()) as { snapshot: Snapshot };

    const thirdResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      { method: "POST" },
      owner.cookie,
    );
    const { snapshot: third } = (await thirdResponse.json()) as { snapshot: Snapshot };

    const rows = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.buildingId, buildingId));
    const byId = new Map(rows.map((r) => [r.id, r]));

    expect(byId.get(first.id)?.status).toBe("approved");
    expect(byId.get(second.id)?.status).toBe("superseded");
    expect(byId.get(second.id)?.supersededById).toBe(third.id);
    expect(byId.get(third.id)?.status).toBe("draft");

    const events = await testDb
      .select()
      .from(auditEvent)
      .where(and(eq(auditEvent.buildingId, buildingId), eq(auditEvent.entity, "snapshot")));
    const createEvents = events.filter((e) => e.action === "create");
    expect(createEvents.map((e) => e.entityId).sort()).toEqual(
      [first.id, second.id, third.id].sort(),
    );
    for (const e of createEvents) {
      expect(e.actorUserId).toBe(owner.userId);
    }

    const listResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots`,
      {},
      owner.cookie,
    );
    const { snapshots } = (await listResponse.json()) as {
      snapshots: { id: string; reports: unknown[] }[];
    };
    expect(snapshots).toHaveLength(3);
    for (const s of snapshots) {
      expect(s.reports).toEqual([]);
    }
  });
});
