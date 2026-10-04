// A10a acceptance tests (docs/production/faza-2/A10-expected-revision.md): bulk-replace routes
// guard with `expectedRevision` and turn a stale write into a 409 instead of silently
// overwriting someone else's save. Covers: envelope, one systems.* route (plus proof that a
// DIFFERENT systems.* entity is unaffected), consumption, measures/select, and
// financial-parameters.
import { auditEvent } from "@yres/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

const BUILDING_INPUT = {
  name: "Test Building",
  location: "Tashkent",
  heatingSeasonDurationDays: 163,
  indoorTempNonOperationC: 14,
  indoorTempOperationC: 22,
  outdoorAvgHeatingSeasonTempC: 3.9,
  outdoorDesignTempC: -14,
  nonOperationHoursPerDay: 14,
  operationHoursPerDay: 10,
};

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function createBuilding(cookie: string) {
  const region = await seedClimateRegion();
  const response = await authRequest(
    "/api/buildings",
    json("POST", { ...BUILDING_INPUT, climateRegionId: region.id }),
    cookie,
  );
  const { building } = (await response.json()) as { building: { id: string } };
  return building.id;
}

async function countEvents(buildingId: string, entity: string) {
  const rows = await testDb
    .select()
    .from(auditEvent)
    .where(and(eq(auditEvent.buildingId, buildingId), eq(auditEvent.entity, entity)));
  return rows.length;
}

describe("A10a — expectedRevision 409 guard", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("envelope: stale expectedRevision -> 409, data/audit untouched; matching -> 200 + revision bump; omitted -> old behavior", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const get0 = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
    expect((await get0.json()).revision).toBe(0);

    const firstPayload = {
      scenario: "before",
      expectedRevision: 0,
      constructionTypes: [{ code: "W1", elementCategory: "external_wall", layers: [] }],
      openingTypes: [],
      envelopeElements: [],
    };
    const putA = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", firstPayload),
      cookie,
    );
    expect(putA.status).toBe(200);
    const bodyA = (await putA.json()) as { revision: number; constructionTypeIds: string[] };
    expect(bodyA.revision).toBe(1);

    // B read the same revision (0) as A, but saves after A already bumped it to 1 -> 409.
    const stalePayload = {
      scenario: "before",
      expectedRevision: 0,
      constructionTypes: [{ code: "W2", elementCategory: "external_wall", layers: [] }],
      openingTypes: [],
      envelopeElements: [],
    };
    const putB = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", stalePayload),
      cookie,
    );
    expect(putB.status).toBe(409);
    const bodyB = (await putB.json()) as { code: string; currentRevision: number };
    expect(bodyB.code).toBe("revision_conflict");
    expect(bodyB.currentRevision).toBe(1);

    // B's data never landed, and no audit_event row was left behind for the rolled-back batch.
    const afterConflict = await authRequest(`/api/buildings/${buildingId}/envelope`, {}, cookie);
    const afterBody = (await afterConflict.json()) as {
      revision: number;
      constructionTypes: { code: string }[];
    };
    expect(afterBody.revision).toBe(1);
    expect(afterBody.constructionTypes.map((t) => t.code)).toEqual(["W1"]);
    expect(await countEvents(buildingId, "envelope")).toBe(1);

    // Omitted expectedRevision -> pre-A10 behavior: write succeeds regardless of current revision.
    const putC = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", {
        scenario: "before",
        constructionTypes: [{ code: "W3", elementCategory: "external_wall", layers: [] }],
        openingTypes: [],
        envelopeElements: [],
      }),
      cookie,
    );
    expect(putC.status).toBe(200);
    const bodyC = (await putC.json()) as { revision?: number };
    expect(bodyC.revision).toBeUndefined();
  });

  it("systems: stale expectedRevision on ventilation -> 409; saving dhw (a different entity) with its own stale-looking revision 0 still succeeds", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const putVentA = await authRequest(
      `/api/buildings/${buildingId}/systems/ventilation`,
      json("PUT", {
        scenario: "before",
        expectedRevision: 0,
        systems: [{ systemType: "natural", airChangeRatePerHour: 0.5 }],
      }),
      cookie,
    );
    expect(putVentA.status).toBe(200);
    expect((await putVentA.json()).revision).toBe(1);

    const putVentStale = await authRequest(
      `/api/buildings/${buildingId}/systems/ventilation`,
      json("PUT", {
        scenario: "before",
        expectedRevision: 0,
        systems: [{ systemType: "mechanical", fanElectricalPowerKw: 1 }],
      }),
      cookie,
    );
    expect(putVentStale.status).toBe(409);
    expect((await putVentStale.json()).code).toBe("revision_conflict");
    expect(await countEvents(buildingId, "systems.ventilation")).toBe(1);

    // "systems.dhw" has never been touched, so its true current revision is 0 - sending
    // expectedRevision: 0 here matches and must succeed; ventilation's conflict must not have
    // spilled over onto a sibling entity.
    const putDhw = await authRequest(
      `/api/buildings/${buildingId}/systems/dhw`,
      json("PUT", {
        scenario: "before",
        expectedRevision: 0,
        sources: [
          {
            sourceName: "Boiler",
            energyCarrier: "gas",
            specificConsumptionLPersonDay: 30,
            personsServed: 50,
          },
        ],
      }),
      cookie,
    );
    expect(putDhw.status).toBe(200);
    expect((await putDhw.json()).revision).toBe(1);

    const get = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await get.json()) as {
      revisions: { ventilation: number; dhw: number };
      ventilationSystems: { systemType: string }[];
    };
    expect(body.revisions.ventilation).toBe(1);
    expect(body.revisions.dhw).toBe(1);
    // The rolled-back ventilation attempt never wrote its "mechanical" row.
    expect(body.ventilationSystems.map((s) => s.systemType)).toEqual(["natural"]);
  });

  it("consumption: stale expectedRevision on PUT -> 409, bills unchanged", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const putA = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      json("PUT", {
        energyCarrier: "gas",
        year: 2025,
        expectedRevision: 0,
        bills: [{ month: 1, consumptionNative: 100 }],
      }),
      cookie,
    );
    expect(putA.status).toBe(200);
    expect((await putA.json()).revision).toBe(1);

    const putStale = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      json("PUT", {
        energyCarrier: "gas",
        year: 2025,
        expectedRevision: 0,
        bills: [{ month: 2, consumptionNative: 999 }],
      }),
      cookie,
    );
    expect(putStale.status).toBe(409);
    expect(await countEvents(buildingId, "consumption")).toBe(1);

    const get = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      { method: "GET" },
      cookie,
    );
    const body = (await get.json()) as { bills: { month: number }[]; revision: number };
    expect(body.revision).toBe(1);
    expect(body.bills.map((b) => b.month)).toEqual([1]);
  });

  it("measures/select: stale expectedRevision -> 409, selection unchanged", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createRes = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      json("POST", { name: "Insulate roof", category: "other", investmentCostUsd: 1000 }),
      cookie,
    );
    expect(createRes.status).toBe(201);
    const { measure } = (await createRes.json()) as { measure: { id: string } };

    const getAfterCreate = await authRequest(`/api/buildings/${buildingId}/measures`, {}, cookie);
    const revisionAfterCreate = (await getAfterCreate.json()).revision as number;

    const selectA = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      json("POST", { measureIds: [measure.id], expectedRevision: revisionAfterCreate }),
      cookie,
    );
    expect(selectA.status).toBe(200);
    const bodyA = (await selectA.json()) as { revision: number };
    expect(bodyA.revision).toBe(revisionAfterCreate + 1);

    const selectStale = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      json("POST", { measureIds: [], expectedRevision: revisionAfterCreate }),
      cookie,
    );
    expect(selectStale.status).toBe(409);
    expect((await selectStale.json()).code).toBe("revision_conflict");

    const getFinal = await authRequest(`/api/buildings/${buildingId}/measures`, {}, cookie);
    const bodyFinal = (await getFinal.json()) as {
      measures: { id: string; proposedForImplementation: boolean }[];
    };
    // The stale "deselect everything" attempt must not have landed.
    expect(bodyFinal.measures.find((m) => m.id === measure.id)?.proposedForImplementation).toBe(
      true,
    );
  });

  it("financial-parameters: stale expectedRevision -> 409, parameters unchanged", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const getDefault = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      {},
      cookie,
    );
    const defaultBody = (await getDefault.json()) as {
      parameters: Record<string, unknown>;
      revision: number;
    };
    expect(defaultBody.revision).toBe(0);

    const putA = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      json("PUT", { ...defaultBody.parameters, expectedRevision: 0, periodYears: 25 }),
      cookie,
    );
    expect(putA.status).toBe(200);
    const bodyA = (await putA.json()) as { revision: number; parameters: { periodYears: number } };
    expect(bodyA.revision).toBe(1);
    expect(bodyA.parameters.periodYears).toBe(25);
    // `expectedRevision` must never leak into the stored row's own fields.
    expect((bodyA.parameters as Record<string, unknown>).expectedRevision).toBeUndefined();

    const putStale = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      json("PUT", { ...defaultBody.parameters, expectedRevision: 0, periodYears: 40 }),
      cookie,
    );
    expect(putStale.status).toBe(409);
    expect(await countEvents(buildingId, "financial")).toBe(1);

    const getFinal = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      {},
      cookie,
    );
    const finalBody = (await getFinal.json()) as { parameters: { periodYears: number } };
    expect(finalBody.parameters.periodYears).toBe(25);
  });
});
