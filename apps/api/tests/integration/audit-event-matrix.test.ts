// A09a acceptance tests (docs/production/faza-2/A09-audit-event-yoyish.md): every bulk-replace
// mutation route under envelope/systems/consumption writes exactly one `audit_event` row in the
// same `db.batch()` as the actual mutation — right entity/action/actor/revision on success, no
// row at all on a 400/403/404 or a batch rollback (atomicity).
import { auditEvent } from "@yres/db";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { defaultFinancialParameters } from "../../src/lib/financial-defaults";
import { seedClimateRegion, seedMaterial } from "../helpers/seed-helpers";
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

async function createBuilding(cookie: string) {
  const region = await seedClimateRegion();
  const response = await authRequest(
    "/api/buildings",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...BUILDING_INPUT, climateRegionId: region.id }),
    },
    cookie,
  );
  const { building } = (await response.json()) as { building: { id: string } };
  return building.id;
}

function json(method: string, body: unknown): RequestInit {
  return { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
}

async function eventsFor(buildingId: string, entity: string) {
  return testDb
    .select()
    .from(auditEvent)
    .where(and(eq(auditEvent.buildingId, buildingId), eq(auditEvent.entity, entity)))
    .orderBy(auditEvent.entityRevision);
}

/** Asserts exactly one audit_event row for `entity`, with the given action/actor/revision. */
async function expectOneEvent(
  buildingId: string,
  entity: string,
  action: string,
  actorUserId: string,
  entityRevision = 1,
) {
  const events = await eventsFor(buildingId, entity);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ action, actorUserId, entityRevision });
}

describe("audit_event matrix — A09a (envelope, systems, consumption)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });
  // No `afterAll(closeTestDb)` here on purpose — this file has a second `describe` below (A09b)
  // sharing the same Miniflare/D1 instance; closing it here would tear it down for that block too
  // (vitest runs describe blocks' hooks in file order, not interleaved).

  it("PUT /envelope writes one 'envelope'/replace event", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", { scenario: "before", constructionTypes: [], openingTypes: [], envelopeElements: [] }),
      cookie,
    );
    expect(response.status).toBe(200);
    await expectOneEvent(buildingId, "envelope", "replace", userId);
  });

  const systemsRoutes: { path: string; entity: string; body: unknown }[] = [
    {
      path: "ventilation",
      entity: "systems.ventilation",
      body: { scenario: "before", systems: [{ systemType: "natural", airChangeRatePerHour: 0.5 }] },
    },
    {
      path: "dhw",
      entity: "systems.dhw",
      body: {
        scenario: "before",
        sources: [
          {
            sourceName: "Gas water heater",
            energyCarrier: "gas",
            specificConsumptionLPersonDay: 30,
            personsServed: 400,
          },
        ],
      },
    },
    {
      path: "distribution",
      entity: "systems.distribution",
      body: {
        scenario: "before",
        systems: [
          {
            systemType: "heating",
            pipeDiameterClass: "32-50",
            lengthM: 120,
            insulatedFraction: 0,
            meanFluidTempC: 70,
          },
        ],
      },
    },
    {
      path: "generation",
      entity: "systems.generation",
      body: {
        scenario: "before",
        sources: [{ endUse: "heating", sourceType: "gas_boiler", efficiencyOrSeer: 0.58 }],
      },
    },
    {
      path: "cooling-windows",
      entity: "systems.cooling_windows",
      body: {
        scenario: "before",
        windows: [{ orientation: "south", areaM2: 90, gValue: 0.75, shadingFactor: 1 }],
      },
    },
    {
      path: "cooling-systems",
      entity: "systems.cooling_systems",
      body: { scenario: "before", systems: [{ description: "Split AC", seer: 3.2 }] },
    },
    {
      path: "lighting",
      entity: "systems.lighting",
      body: {
        scenario: "after",
        zones: [
          {
            name: "Wards",
            areaM2: 500,
            technologyMix: {
              incandescentFraction: 0,
              fluorescentElectromagneticFraction: 0,
              fluorescentElectronicFraction: 0,
              ledFraction: 1,
            },
            utilizationFactor: 0.55,
          },
        ],
      },
    },
    {
      path: "equipment",
      entity: "systems.equipment",
      body: {
        scenario: "before",
        items: [
          {
            name: "Old refrigerator",
            unitPowerKw: 0.3,
            quantity: 4,
            heatingSeasonHours: 1630,
            coolingSeasonHours: 500,
            heatingUtilizationFactor: 1,
            coolingUtilizationFactor: 1,
          },
        ],
      },
    },
    {
      path: "renewables",
      entity: "systems.renewables",
      body: {
        systems: [
          {
            systemType: "pv",
            capacityKw: 10,
            availableAreaM2: 100,
            unitCostUsd: 7268,
            monthlyProductionKwh: [910, 1100, 1300, 1450, 1600, 1623, 1600, 1500, 1300, 1100, 950, 910],
          },
        ],
      },
    },
  ];

  for (const { path, entity, body } of systemsRoutes) {
    it(`PUT /systems/${path} writes one '${entity}'/replace event`, async () => {
      const { cookie, userId } = await signUpTestUser();
      const buildingId = await createBuilding(cookie);

      const response = await authRequest(
        `/api/buildings/${buildingId}/systems/${path}`,
        json("PUT", body),
        cookie,
      );
      expect(response.status).toBe(200);
      await expectOneEvent(buildingId, entity, "replace", userId);
    });
  }

  it("POST /consumption writes one 'consumption'/create event; a later PUT bumps the revision", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      json("POST", {
        bills: [{ energyCarrier: "gas", year: 2024, month: 1, consumptionNative: 1200 }],
      }),
      cookie,
    );
    expect(createResponse.status).toBe(201);
    await expectOneEvent(buildingId, "consumption", "create", userId, 1);

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      json("PUT", {
        energyCarrier: "gas",
        year: 2024,
        bills: [{ month: 1, consumptionNative: 1300 }],
      }),
      cookie,
    );
    expect(putResponse.status).toBe(200);
    const events = await eventsFor(buildingId, "consumption");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["replace", 2],
    ]);
  });

  it("PUT /consumption/bulk writes one 'consumption'/replace event", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/consumption/bulk`,
      json("PUT", {
        years: [
          { year: 2024, carriers: [{ energyCarrier: "gas", bills: [{ month: 1, consumptionNative: 100 }] }] },
        ],
      }),
      cookie,
    );
    expect(response.status).toBe(200);
    await expectOneEvent(buildingId, "consumption", "replace", userId);
  });

  it("a 400 (invalid payload) writes no audit_event", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/systems/ventilation`,
      json("PUT", { scenario: "before", systems: [{ systemType: "not-a-real-type" }] }),
      cookie,
    );
    expect(response.status).toBe(400);
    expect(await eventsFor(buildingId, "systems.ventilation")).toEqual([]);
  });

  it("a 404 (stranger) writes no audit_event", async () => {
    const { cookie: ownerCookie } = await signUpTestUser();
    const buildingId = await createBuilding(ownerCookie);
    const { cookie: strangerCookie } = await signUpTestUser();

    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", { scenario: "before", constructionTypes: [], openingTypes: [], envelopeElements: [] }),
      strangerCookie,
    );
    expect(response.status).toBe(404);
    expect(await eventsFor(buildingId, "envelope")).toEqual([]);
  });

  it("a 403 (viewer) writes no audit_event", async () => {
    const owner = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);
    const viewer = await signUpTestUser();
    const inviteResponse = await authRequest(
      `/api/buildings/${buildingId}/members`,
      json("POST", { email: viewer.email, role: "viewer" }),
      owner.cookie,
    );
    expect(inviteResponse.status).toBe(201);

    const response = await authRequest(
      `/api/buildings/${buildingId}/consumption`,
      json("POST", { bills: [{ energyCarrier: "gas", year: 2024, month: 1, consumptionNative: 100 }] }),
      viewer.cookie,
    );
    expect(response.status).toBe(403);
    expect(await eventsFor(buildingId, "consumption")).toEqual([]);
  });

  it("a batch rollback (bad materialId FK) writes no audit_event either", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    // A syntactically valid but nonexistent materialId passes zod (.uuid()) but violates the
    // construction_layer -> material foreign key once the batch actually runs.
    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", {
        scenario: "before",
        constructionTypes: [
          {
            code: "wall",
            elementCategory: "external_wall",
            layers: [{ layerOrder: 1, materialId: crypto.randomUUID(), thicknessM: 0.1 }],
          },
        ],
        openingTypes: [],
        envelopeElements: [],
      }),
      cookie,
    );
    expect(response.status).toBe(500);
    expect(await eventsFor(buildingId, "envelope")).toEqual([]);
  });

  it("seedMaterial stays available for a real (non-FK-violating) construction layer", async () => {
    // Guards against the above test's bad-materialId case being bad for the wrong reason (e.g. a
    // schema issue unrelated to the FK) — the same shape with a real material must succeed.
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);
    const brick = await seedMaterial("Bricks", 0.7);

    const response = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      json("PUT", {
        scenario: "before",
        constructionTypes: [
          {
            code: "wall",
            elementCategory: "external_wall",
            layers: [{ layerOrder: 1, materialId: brick.id, thicknessM: 0.38 }],
          },
        ],
        openingTypes: [],
        envelopeElements: [],
      }),
      cookie,
    );
    expect(response.status).toBe(200);
    await expectOneEvent(buildingId, "envelope", "replace", userId);
  });
});

// A09b acceptance tests: the remaining single-row mutation routes (measures, non-ee-measures,
// financial parameters, members, annotations, audit/run) each write exactly one `audit_event` in
// the same `db.batch()` as the mutation.
describe("audit_event matrix — A09b (measures, financial, members, annotations, audit_run)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("measures: POST/PUT/DELETE write create/update/delete events; DELETE's summary has no PII", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      json("POST", {
        name: "Wall insulation",
        category: "envelope_wall_insulation",
        investmentCostUsd: 10000,
      }),
      cookie,
    );
    expect(createResponse.status).toBe(201);
    await expectOneEvent(buildingId, "measures", "create", userId, 1);
    const { measure } = (await createResponse.json()) as { measure: { id: string } };

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      json("PUT", {
        name: "Wall insulation (revised)",
        category: "envelope_wall_insulation",
        investmentCostUsd: 12000,
      }),
      cookie,
    );
    expect(putResponse.status).toBe(200);

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/${measure.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const events = await eventsFor(buildingId, "measures");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["update", 2],
      ["delete", 3],
    ]);
    const summary = events[2]?.summary as Record<string, unknown>;
    expect(summary).toMatchObject({ name: "Wall insulation (revised)", category: "envelope_wall_insulation" });
    expect(JSON.stringify(summary)).not.toContain("@");
  });

  it("measures/select writes one 'measures'/update event", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      json("POST", { name: "Roof insulation", category: "envelope_roof_insulation", investmentCostUsd: 5000 }),
      cookie,
    );
    const { measure } = (await createResponse.json()) as { measure: { id: string } };

    const selectResponse = await authRequest(
      `/api/buildings/${buildingId}/measures/select`,
      json("POST", { measureIds: [measure.id] }),
      cookie,
    );
    expect(selectResponse.status).toBe(200);

    const events = await eventsFor(buildingId, "measures");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["update", 2],
    ]);
  });

  it("non-ee-measures: POST/PUT/DELETE write create/update/delete events", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const createResponse = await authRequest(
      `/api/buildings/${buildingId}/non-ee-measures`,
      json("POST", { description: "Cable replacement", unitCostUsd: 500 }),
      cookie,
    );
    expect(createResponse.status).toBe(201);
    const { nonEeMeasure } = (await createResponse.json()) as { nonEeMeasure: { id: string } };

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/non-ee-measures/${nonEeMeasure.id}`,
      json("PUT", { description: "Cable replacement (full run)", unitCostUsd: 700 }),
      cookie,
    );
    expect(putResponse.status).toBe(200);

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/non-ee-measures/${nonEeMeasure.id}`,
      { method: "DELETE" },
      cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const events = await eventsFor(buildingId, "non_ee_measures");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["update", 2],
      ["delete", 3],
    ]);
    expect(events[0]).toMatchObject({ actorUserId: userId });
  });

  it("a 404 (nonexistent measure) writes no audit_event", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/measures/${crypto.randomUUID()}`,
      json("PUT", { name: "X", category: "envelope_wall_insulation", investmentCostUsd: 1 }),
      cookie,
    );
    expect(response.status).toBe(404);
    expect(await eventsFor(buildingId, "measures")).toEqual([]);
  });

  it("PUT /financial-parameters writes one 'financial'/update event", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      json("PUT", defaultFinancialParameters()),
      cookie,
    );
    expect(response.status).toBe(200);
    await expectOneEvent(buildingId, "financial", "update", userId);
  });

  it("a 403 (viewer) on financial-parameters writes no audit_event", async () => {
    const owner = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);
    const viewer = await signUpTestUser();
    await authRequest(
      `/api/buildings/${buildingId}/members`,
      json("POST", { email: viewer.email, role: "viewer" }),
      owner.cookie,
    );

    const response = await authRequest(
      `/api/buildings/${buildingId}/financial-parameters`,
      json("PUT", defaultFinancialParameters()),
      viewer.cookie,
    );
    expect(response.status).toBe(403);
    expect(await eventsFor(buildingId, "financial")).toEqual([]);
  });

  it("members: POST/PATCH/DELETE write create/update/delete events with no email/name in summary", async () => {
    const owner = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);
    const invitee = await signUpTestUser();

    const inviteResponse = await authRequest(
      `/api/buildings/${buildingId}/members`,
      json("POST", { email: invitee.email, role: "viewer" }),
      owner.cookie,
    );
    expect(inviteResponse.status).toBe(201);
    const { member } = (await inviteResponse.json()) as { member: { id: string } };

    const patchResponse = await authRequest(
      `/api/buildings/${buildingId}/members/${member.id}`,
      json("PATCH", { role: "editor" }),
      owner.cookie,
    );
    expect(patchResponse.status).toBe(200);

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/members/${member.id}`,
      { method: "DELETE" },
      owner.cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const events = await eventsFor(buildingId, "members");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["create", 1],
      ["update", 2],
      ["delete", 3],
    ]);
    for (const event of events) {
      const summary = JSON.stringify(event.summary);
      expect(summary).not.toContain(invitee.email);
      expect(summary).toContain(invitee.userId);
    }
  });

  it("annotations: a note PUT writes an 'update' event, clearing it writes a 'delete' event", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/annotations/consumption_gas`,
      json("PUT", { note: "Looks good overall." }),
      cookie,
    );
    expect(putResponse.status).toBe(200);

    const clearResponse = await authRequest(
      `/api/buildings/${buildingId}/audit/annotations/consumption_gas`,
      json("PUT", { note: "" }),
      cookie,
    );
    expect(clearResponse.status).toBe(200);

    const events = await eventsFor(buildingId, "annotations");
    expect(events.map((e) => [e.action, e.entityRevision])).toEqual([
      ["update", 1],
      ["delete", 2],
    ]);
    expect(events[0]).toMatchObject({ actorUserId: userId, entityId: "consumption_gas" });
  });

  it("POST /audit/run writes one 'audit_run'/run event even though the run itself has no engine data", async () => {
    const { cookie, userId } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(`/api/buildings/${buildingId}/audit/run`, { method: "POST" }, cookie);
    // Either outcome is fine for this assertion — the audit_event is written in the same batch as
    // the initial `auditRun` insert, before the engine even runs (A09-audit-event-yoyish.md §5).
    expect([201, 500]).toContain(response.status);
    await expectOneEvent(buildingId, "audit_run", "run", userId);

    if (response.status === 500) {
      const body = (await response.json()) as { error: string; code: string };
      expect(body.code).toBe("audit_failed");
      expect(body.error).not.toMatch(/\bat\b.*\.ts:\d+/); // not a raw stack trace
    }
  });

  it("a 403 (viewer) on audit/run writes no audit_event", async () => {
    const owner = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);
    const viewer = await signUpTestUser();
    await authRequest(
      `/api/buildings/${buildingId}/members`,
      json("POST", { email: viewer.email, role: "viewer" }),
      owner.cookie,
    );

    const response = await authRequest(`/api/buildings/${buildingId}/audit/run`, { method: "POST" }, viewer.cookie);
    expect(response.status).toBe(403);
    expect(await eventsFor(buildingId, "audit_run")).toEqual([]);
  });
});
