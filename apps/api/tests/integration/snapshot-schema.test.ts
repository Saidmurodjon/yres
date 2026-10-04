import { auditSnapshot, auditSnapshotReport, building } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

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

async function seedBuilding() {
  const region = await seedClimateRegion();
  const { userId } = await signUpTestUser();
  const [created] = await testDb
    .insert(building)
    .values({ ...VALID_BUILDING_INPUT, userId, climateRegionId: region.id })
    .returning();
  if (!created) throw new Error("setup failed");
  return { buildingId: created.id, userId };
}

function snapshotInput(buildingId: string, userId: string, i = 0) {
  return {
    buildingId,
    engineVersion: "0.9.0",
    methodologyVersion: "3-DMTT v7.20",
    generatedAt: new Date().toISOString(),
    inputsR2Key: `snapshots/${buildingId}/s${i}/inputs.json`,
    inputsSha256: "a".repeat(64),
    resultR2Key: `snapshots/${buildingId}/s${i}/result.json`,
    resultSha256: "b".repeat(64),
    contextR2Key: `snapshots/${buildingId}/s${i}/context.json`,
    contextSha256: "c".repeat(64),
    summary: { currentEnergyUseKwhPerM2Year: 123.4 },
    createdByUserId: userId,
  };
}

async function insertSnapshot(buildingId: string, userId: string, i = 0) {
  const [row] = await testDb
    .insert(auditSnapshot)
    .values(snapshotInput(buildingId, userId, i))
    .returning();
  if (!row) throw new Error("setup failed");
  return row;
}

describe("audit_snapshot schema (A04)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("rejects an UPDATE of a frozen column", async () => {
    const { buildingId, userId } = await seedBuilding();
    const row = await insertSnapshot(buildingId, userId);

    await expect(
      testDb
        .update(auditSnapshot)
        .set({ engineVersion: "9.9.9" })
        .where(eq(auditSnapshot.id, row.id)),
    ).rejects.toThrow();

    const [reread] = await testDb.select().from(auditSnapshot).where(eq(auditSnapshot.id, row.id));
    expect(reread?.engineVersion).toBe("0.9.0");
  });

  it("rejects illegal status transitions (draft->approved, approved->draft, superseded->approved)", async () => {
    const { buildingId, userId } = await seedBuilding();
    const row = await insertSnapshot(buildingId, userId);

    // draft -> approved (skips submitted)
    await expect(
      testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, row.id)),
    ).rejects.toThrow();

    // Move to approved legitimately, then try approved -> draft.
    await testDb.update(auditSnapshot).set({ status: "submitted" }).where(eq(auditSnapshot.id, row.id));
    await testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, row.id));
    await expect(
      testDb.update(auditSnapshot).set({ status: "draft" }).where(eq(auditSnapshot.id, row.id)),
    ).rejects.toThrow();

    // superseded -> approved (backwards from a terminal state)
    await testDb.update(auditSnapshot).set({ status: "superseded" }).where(eq(auditSnapshot.id, row.id));
    await expect(
      testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, row.id)),
    ).rejects.toThrow();

    const [reread] = await testDb.select().from(auditSnapshot).where(eq(auditSnapshot.id, row.id));
    expect(reread?.status).toBe("superseded");
  });

  it("allows the full draft -> submitted -> approved -> superseded flow", async () => {
    const { buildingId, userId } = await seedBuilding();
    const row = await insertSnapshot(buildingId, userId);

    await testDb.update(auditSnapshot).set({ status: "submitted" }).where(eq(auditSnapshot.id, row.id));
    await testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, row.id));
    await testDb.update(auditSnapshot).set({ status: "superseded" }).where(eq(auditSnapshot.id, row.id));

    const [reread] = await testDb.select().from(auditSnapshot).where(eq(auditSnapshot.id, row.id));
    expect(reread?.status).toBe("superseded");
  });

  it("rejects a second `approved` snapshot for the same building", async () => {
    const { buildingId, userId } = await seedBuilding();
    const first = await insertSnapshot(buildingId, userId, 1);
    const second = await insertSnapshot(buildingId, userId, 2);

    await testDb.update(auditSnapshot).set({ status: "submitted" }).where(eq(auditSnapshot.id, first.id));
    await testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, first.id));

    await testDb.update(auditSnapshot).set({ status: "submitted" }).where(eq(auditSnapshot.id, second.id));
    await expect(
      testDb.update(auditSnapshot).set({ status: "approved" }).where(eq(auditSnapshot.id, second.id)),
    ).rejects.toThrow();
  });

  it("rejects an UPDATE on audit_snapshot_report", async () => {
    const { buildingId, userId } = await seedBuilding();
    const snapshot = await insertSnapshot(buildingId, userId);
    const [report] = await testDb
      .insert(auditSnapshotReport)
      .values({
        snapshotId: snapshot.id,
        lang: "en",
        r2Key: `reports/${buildingId}/${snapshot.id}/en.pdf`,
        sha256: "d".repeat(64),
        sizeBytes: 12345,
        createdByUserId: userId,
      })
      .returning();
    if (!report) throw new Error("setup failed");

    await expect(
      testDb
        .update(auditSnapshotReport)
        .set({ sha256: "e".repeat(64) })
        .where(eq(auditSnapshotReport.id, report.id)),
    ).rejects.toThrow();
  });

  it("blocks hard-deleting a building that has a snapshot (FK restrict)", async () => {
    const { buildingId, userId } = await seedBuilding();
    await insertSnapshot(buildingId, userId);

    await expect(testDb.delete(building).where(eq(building.id, buildingId))).rejects.toThrow();
  });
});
