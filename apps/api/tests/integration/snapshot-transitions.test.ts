import { auditEvent, auditSnapshot, climateRegion } from "@yres/db";
import { seedReferenceDataWithDb } from "@yres/db/seed";
import { and, eq } from "drizzle-orm";
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
  const editor = await signUpTestUser();
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
  const buildingId = createdBuilding.id as string;

  await authRequest(
    `/api/buildings/${buildingId}/members`,
    json("POST", { email: editor.email, role: "editor" }),
    owner.cookie,
  );
  await authRequest(
    `/api/buildings/${buildingId}/members`,
    json("POST", { email: viewer.email, role: "viewer" }),
    owner.cookie,
  );

  return { owner, editor, viewer, buildingId };
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

describe("Snapshot status transitions (A05b)", () => {
  beforeEach(async () => {
    await resetTestDb();
    await seedReferenceDataWithDb(testDb);
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("draft -> submitted -> approved happy path, journaled with the owner as actor", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const submitResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );
    expect(submitResponse.status).toBe(200);

    const [afterSubmit] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    expect(afterSubmit?.status).toBe("submitted");
    expect(afterSubmit?.submittedByUserId).toBe(owner.userId);

    const approveResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );
    expect(approveResponse.status).toBe(200);

    const [afterApprove] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    expect(afterApprove?.status).toBe("approved");
    expect(afterApprove?.approvedByUserId).toBe(owner.userId);

    const events = await testDb
      .select()
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.buildingId, buildingId),
          eq(auditEvent.entity, "snapshot"),
          eq(auditEvent.entityId, snapshot.id),
        ),
      );
    expect(events.map((e) => e.action).sort()).toEqual(["approve", "create", "submit"]);
    for (const e of events) {
      expect(e.actorUserId).toBe(owner.userId);
    }
  });

  it("approving a second snapshot supersedes the previously-approved one", async () => {
    const { owner, buildingId } = await setupBuilding();
    const first = await createSnapshot(buildingId, owner.cookie);
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${first.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${first.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );

    const second = await createSnapshot(buildingId, owner.cookie);
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${second.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );
    const approveSecond = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${second.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );
    expect(approveSecond.status).toBe(200);

    const rows = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.buildingId, buildingId));
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(first.id)?.status).toBe("superseded");
    expect(byId.get(first.id)?.supersededById).toBe(second.id);
    expect(byId.get(second.id)?.status).toBe("approved");
  });

  it("re-approving an already-approved snapshot -> 409 illegal_transition, state unchanged", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );

    const secondApprove = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );
    expect(secondApprove.status).toBe(409);
    const body = (await secondApprove.json()) as { code: string };
    expect(body.code).toBe("illegal_transition");

    const [row] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    expect(row?.status).toBe("approved");

    // The failed approve must not have journaled an `approve` audit_event (whole batch rolled
    // back) or supersede anything else.
    const events = await testDb
      .select()
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.buildingId, buildingId),
          eq(auditEvent.entity, "snapshot"),
          eq(auditEvent.entityId, snapshot.id),
        ),
      );
    expect(events.filter((e) => e.action === "approve")).toHaveLength(1);
  });

  it("submitting an already-submitted snapshot -> 409 illegal_transition", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );

    const secondSubmit = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );
    expect(secondSubmit.status).toBe(409);
    const body = (await secondSubmit.json()) as { code: string };
    expect(body.code).toBe("illegal_transition");
  });

  it("approving a draft (skipping submit) -> 409 illegal_transition", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const approve = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      owner.cookie,
    );
    expect(approve.status).toBe(409);
    const body = (await approve.json()) as { code: string };
    expect(body.code).toBe("illegal_transition");
  });

  it("concurrent approve on the same submitted snapshot: exactly one 409, snapshot approved once", async () => {
    const { owner, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);
    await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      owner.cookie,
    );

    const [a, b] = await Promise.all([
      authRequest(
        `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
        { method: "POST" },
        owner.cookie,
      ),
      authRequest(
        `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
        { method: "POST" },
        owner.cookie,
      ),
    ]);
    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);

    const [row] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    expect(row?.status).toBe("approved");

    const approveEvents = await testDb
      .select()
      .from(auditEvent)
      .where(
        and(
          eq(auditEvent.buildingId, buildingId),
          eq(auditEvent.entity, "snapshot"),
          eq(auditEvent.entityId, snapshot.id),
          eq(auditEvent.action, "approve"),
        ),
      );
    expect(approveEvents).toHaveLength(1);
  });

  it("editor may submit but not approve (403); viewer may neither (403)", async () => {
    const { owner, editor, viewer, buildingId } = await setupBuilding();
    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const viewerSubmit = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      viewer.cookie,
    );
    expect(viewerSubmit.status).toBe(403);

    const editorSubmit = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      editor.cookie,
    );
    expect(editorSubmit.status).toBe(200);

    const editorApprove = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      editor.cookie,
    );
    expect(editorApprove.status).toBe(403);

    const viewerApprove = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      viewer.cookie,
    );
    expect(viewerApprove.status).toBe(403);

    const [row] = await testDb
      .select()
      .from(auditSnapshot)
      .where(eq(auditSnapshot.id, snapshot.id));
    expect(row?.status).toBe("submitted");
  });

  it("a stranger to the building gets 404, not 403, on both submit and approve", async () => {
    const { owner, buildingId } = await setupBuilding();
    const stranger = await signUpTestUser();
    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const strangerSubmit = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      stranger.cookie,
    );
    expect(strangerSubmit.status).toBe(404);

    const strangerApprove = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/${snapshot.id}/approve`,
      { method: "POST" },
      stranger.cookie,
    );
    expect(strangerApprove.status).toBe(404);
  });

  it("malformed :sid -> 400; a snapshot id from another building -> 404", async () => {
    const { owner, buildingId } = await setupBuilding();
    const otherOwner = await signUpTestUser();
    const [tashkent] = await testDb
      .select()
      .from(climateRegion)
      .where(eq(climateRegion.name, "Tashkent"));
    if (!tashkent) throw new Error("Tashkent region not seeded");
    const otherBuildingResponse = await authRequest(
      "/api/buildings",
      json("POST", { ...BUILDING_INPUT, climateRegionId: tashkent.id }),
      otherOwner.cookie,
    );
    const { building: otherBuilding } = (await otherBuildingResponse.json()) as {
      building: { id: string };
    };

    const snapshot = await createSnapshot(buildingId, owner.cookie);

    const malformed = await authRequest(
      `/api/buildings/${buildingId}/audit/snapshots/not-a-uuid/submit`,
      { method: "POST" },
      owner.cookie,
    );
    expect(malformed.status).toBe(400);

    const crossBuilding = await authRequest(
      `/api/buildings/${otherBuilding.id}/audit/snapshots/${snapshot.id}/submit`,
      { method: "POST" },
      otherOwner.cookie,
    );
    expect(crossBuilding.status).toBe(404);
  });
});
