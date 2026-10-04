import { auditEvent, building } from "@yres/db";
import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { auditEventStatement, getRevisions, isRevisionConflict } from "../../src/lib/audit-event";
import type { AppEnv } from "../../src/middleware/auth";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
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

/** Minimal stand-in for Hono's `Context` — only the two members `auditEventStatement()` reads. */
function fakeContext(userId: string): Context<AppEnv> {
  return {
    get: (key: string) => (key === "user" ? { id: userId } : undefined),
    req: { header: () => undefined },
  } as unknown as Context<AppEnv>;
}

describe("audit_event", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("records an audit_event (actor, entity, action, revision 1) when a building is created", async () => {
    const { cookie, userId } = await signUpTestUser();
    const climateRegionId = (await seedClimateRegion()).id;

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
    const { building: created } = (await createResponse.json()) as { building: { id: string } };

    const events = await testDb
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.buildingId, created.id));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      buildingId: created.id,
      actorUserId: userId,
      entity: "building",
      action: "create",
      entityRevision: 1,
    });
  });

  it("bumps the revision to 2 when the building is then updated", async () => {
    const { cookie } = await signUpTestUser();
    const climateRegionId = (await seedClimateRegion()).id;

    const createResponse = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId }),
      },
      cookie,
    );
    const { building: created } = (await createResponse.json()) as { building: { id: string } };

    const updateResponse = await authRequest(
      `/api/buildings/${created.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Renamed" }),
      },
      cookie,
    );
    expect(updateResponse.status).toBe(200);

    const events = await testDb
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.buildingId, created.id))
      .orderBy(auditEvent.entityRevision);
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["update", 2],
    ]);
    expect(events[1]?.summary).toEqual({ fields: ["name"] });
  });

  it("rolls back the whole batch (no building, no audit_event) when the mutation fails", async () => {
    const { cookie, userId } = await signUpTestUser();
    // No climate region seeded — climateRegionId points at nothing, so the insert's FK fails.
    const response = await authRequest(
      "/api/buildings",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...VALID_BUILDING_INPUT, climateRegionId: crypto.randomUUID() }),
      },
      cookie,
    );
    expect(response.status).toBe(500);

    const buildings = await testDb.select().from(building).where(eq(building.userId, userId));
    expect(buildings).toEqual([]);
    const events = await testDb.select().from(auditEvent);
    expect(events).toEqual([]);
  });

  it("rejects a stale expectedRevision and leaves data unchanged (batch rollback)", async () => {
    const region = await seedClimateRegion();
    const { userId } = await signUpTestUser();
    const [created] = await testDb
      .insert(building)
      .values({ ...VALID_BUILDING_INPUT, userId, climateRegionId: region.id })
      .returning();
    if (!created) throw new Error("setup failed");

    const ctx = fakeContext(userId);
    const err = await testDb
      .batch([
        auditEventStatement(testDb, ctx, {
          buildingId: created.id,
          entity: "building",
          action: "update",
          expectedRevision: 5, // no audit_event exists yet, so the real current revision is 0
        }),
        testDb.update(building).set({ name: "Should not persist" }).where(eq(building.id, created.id)),
      ])
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(Error);
    expect(isRevisionConflict(err)).toBe(true);

    const [reread] = await testDb.select().from(building).where(eq(building.id, created.id));
    expect(reread?.name).toBe(VALID_BUILDING_INPUT.name);
    const events = await testDb
      .select()
      .from(auditEvent)
      .where(eq(auditEvent.buildingId, created.id));
    expect(events).toEqual([]);
  });

  it("is append-only: UPDATE on audit_event is rejected by the trigger", async () => {
    const region = await seedClimateRegion();
    const { userId } = await signUpTestUser();
    const [created] = await testDb
      .insert(building)
      .values({ ...VALID_BUILDING_INPUT, userId, climateRegionId: region.id })
      .returning();
    if (!created) throw new Error("setup failed");

    const ctx = fakeContext(userId);
    await testDb.batch([
      auditEventStatement(testDb, ctx, {
        buildingId: created.id,
        entity: "building",
        action: "create",
      }),
    ]);
    const [row] = await testDb.select().from(auditEvent).where(eq(auditEvent.buildingId, created.id));
    if (!row) throw new Error("setup failed");

    await expect(
      testDb.update(auditEvent).set({ action: "delete" }).where(eq(auditEvent.id, row.id)),
    ).rejects.toThrow();
  });

  it("truncates an oversized summary instead of storing it raw", async () => {
    const region = await seedClimateRegion();
    const { userId } = await signUpTestUser();
    const [created] = await testDb
      .insert(building)
      .values({ ...VALID_BUILDING_INPUT, userId, climateRegionId: region.id })
      .returning();
    if (!created) throw new Error("setup failed");

    const ctx = fakeContext(userId);
    const hugeSummary = { fields: Array.from({ length: 2000 }, (_, i) => `field_${i}`) };
    await testDb.batch([
      auditEventStatement(testDb, ctx, {
        buildingId: created.id,
        entity: "building",
        action: "update",
        summary: hugeSummary,
      }),
    ]);

    const [row] = await testDb.select().from(auditEvent).where(eq(auditEvent.buildingId, created.id));
    expect(row?.summary).toEqual({ truncated: true });
  });

  it("getRevisions reports 0 for entities with no events yet, and the real max otherwise", async () => {
    const region = await seedClimateRegion();
    const { userId } = await signUpTestUser();
    const [created] = await testDb
      .insert(building)
      .values({ ...VALID_BUILDING_INPUT, userId, climateRegionId: region.id })
      .returning();
    if (!created) throw new Error("setup failed");

    const ctx = fakeContext(userId);
    await testDb.batch([
      auditEventStatement(testDb, ctx, { buildingId: created.id, entity: "building", action: "create" }),
    ]);
    await testDb.batch([
      auditEventStatement(testDb, ctx, { buildingId: created.id, entity: "building", action: "update" }),
    ]);

    const revisions = await getRevisions(testDb, created.id, ["building", "envelope"] as const);
    expect(revisions).toEqual({ building: 2, envelope: 0 });
  });
});
