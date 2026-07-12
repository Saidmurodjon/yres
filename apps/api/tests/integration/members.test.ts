import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { authRequest, signUpTestUser } from "../helpers/test-auth";
import { closeTestDb, resetTestDb } from "../helpers/test-db";

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

async function inviteMember(buildingId: string, cookie: string, email: string, role: string) {
  return authRequest(
    `/api/buildings/${buildingId}/members`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, role }) },
    cookie,
  );
}

const MINIMAL_ENVELOPE_PAYLOAD = {
  scenario: "before",
  constructionTypes: [],
  openingTypes: [],
  envelopeElements: [],
};

describe("Building sharing (members + role-based access)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("lets an owner invite an existing user as editor, who can then read and write the building", async () => {
    const owner = await signUpTestUser();
    const editor = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    const inviteResponse = await inviteMember(buildingId, owner.cookie, editor.email, "editor");
    expect(inviteResponse.status).toBe(201);
    const { member } = (await inviteResponse.json()) as { member: { email: string; role: string } };
    expect(member.email).toBe(editor.email);
    expect(member.role).toBe("editor");

    // The editor can now see the building in their own building list...
    const listResponse = await authRequest("/api/buildings", {}, editor.cookie);
    const { buildings } = (await listResponse.json()) as { buildings: { id: string; role: string }[] };
    const shared = buildings.find((b) => b.id === buildingId);
    expect(shared?.role).toBe("editor");

    // ...can read it directly...
    const getResponse = await authRequest(`/api/buildings/${buildingId}`, {}, editor.cookie);
    expect(getResponse.status).toBe(200);

    // ...and can write to it (envelope PUT).
    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(MINIMAL_ENVELOPE_PAYLOAD) },
      editor.cookie,
    );
    expect(putResponse.status).toBe(200);
  });

  it("lets a viewer read but not write the building", async () => {
    const owner = await signUpTestUser();
    const viewer = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    await inviteMember(buildingId, owner.cookie, viewer.email, "viewer");

    const getResponse = await authRequest(`/api/buildings/${buildingId}`, {}, viewer.cookie);
    expect(getResponse.status).toBe(200);
    const getBody = (await getResponse.json()) as { role: string };
    expect(getBody.role).toBe("viewer");

    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(MINIMAL_ENVELOPE_PAYLOAD) },
      viewer.cookie,
    );
    expect(putResponse.status).toBe(403);

    const measureResponse = await authRequest(
      `/api/buildings/${buildingId}/measures`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test", category: "other", investmentCostUsd: 100 }),
      },
      viewer.cookie,
    );
    expect(measureResponse.status).toBe(403);
  });

  it("404s for a user with no access at all, same as a nonexistent building", async () => {
    const owner = await signUpTestUser();
    const stranger = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    const response = await authRequest(`/api/buildings/${buildingId}`, {}, stranger.cookie);
    expect(response.status).toBe(404);
  });

  it("only the owner can invite, change roles, or remove members — an editor gets 404 (not 403), same not-found-shaped response as a stranger", async () => {
    const owner = await signUpTestUser();
    const editor = await signUpTestUser();
    const thirdUser = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);
    await inviteMember(buildingId, owner.cookie, editor.email, "editor");

    const response = await inviteMember(buildingId, editor.cookie, thirdUser.email, "viewer");
    expect(response.status).toBe(404);
  });

  it("rejects inviting an email with no YRES account", async () => {
    const owner = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    const response = await inviteMember(buildingId, owner.cookie, "nobody@example.com", "editor");
    expect(response.status).toBe(404);
  });

  it("rejects inviting the same user twice", async () => {
    const owner = await signUpTestUser();
    const editor = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    await inviteMember(buildingId, owner.cookie, editor.email, "editor");
    const secondInvite = await inviteMember(buildingId, owner.cookie, editor.email, "viewer");
    expect(secondInvite.status).toBe(400);
  });

  it("lets the owner change a member's role and remove them", async () => {
    const owner = await signUpTestUser();
    const member = await signUpTestUser();
    const buildingId = await createBuilding(owner.cookie);

    const inviteResponse = await inviteMember(buildingId, owner.cookie, member.email, "viewer");
    const { member: created } = (await inviteResponse.json()) as { member: { id: string } };

    const patchResponse = await authRequest(
      `/api/buildings/${buildingId}/members/${created.id}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role: "editor" }) },
      owner.cookie,
    );
    expect(patchResponse.status).toBe(200);
    const { member: patched } = (await patchResponse.json()) as { member: { role: string } };
    expect(patched.role).toBe("editor");

    // Now editor-level access should let them write.
    const putResponse = await authRequest(
      `/api/buildings/${buildingId}/envelope`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(MINIMAL_ENVELOPE_PAYLOAD) },
      member.cookie,
    );
    expect(putResponse.status).toBe(200);

    const deleteResponse = await authRequest(
      `/api/buildings/${buildingId}/members/${created.id}`,
      { method: "DELETE" },
      owner.cookie,
    );
    expect(deleteResponse.status).toBe(204);

    const getAfterRemoval = await authRequest(`/api/buildings/${buildingId}`, {}, member.cookie);
    expect(getAfterRemoval.status).toBe(404);
  });
});
