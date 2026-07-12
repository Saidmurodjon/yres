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

async function putJson(path: string, body: unknown, cookie: string) {
  return authRequest(
    path,
    { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    cookie,
  );
}

describe("Systems API (ventilation, DHW, distribution, generation, cooling)", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("returns empty lists for a building with no systems configured yet", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown[]>;
    expect(body.ventilationSystems).toEqual([]);
    expect(body.dhwSources).toEqual([]);
    expect(body.distributionSystems).toEqual([]);
    expect(body.generationSources).toEqual([]);
    expect(body.coolingWindows).toEqual([]);
    expect(body.coolingSystems).toEqual([]);
  });

  it("bulk-replaces ventilation systems per scenario without touching the other scenario", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const beforePayload = {
      scenario: "before",
      systems: [{ systemType: "natural", airChangeRatePerHour: 0.5 }],
    };
    const afterPayload = {
      scenario: "after",
      systems: [
        {
          systemType: "mechanical",
          freshAirPerPersonM3h: 30,
          heatRecoveryEfficiency: 0.75,
          fanElectricalPowerKw: 2.2,
        },
      ],
    };

    const beforeResponse = await putJson(
      `/api/buildings/${buildingId}/systems/ventilation`,
      beforePayload,
      cookie,
    );
    expect(beforeResponse.status).toBe(200);
    const afterResponse = await putJson(
      `/api/buildings/${buildingId}/systems/ventilation`,
      afterPayload,
      cookie,
    );
    expect(afterResponse.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      ventilationSystems: { scenario: string; systemType: string }[];
    };
    expect(body.ventilationSystems).toHaveLength(2);
    expect(body.ventilationSystems.find((v) => v.scenario === "before")?.systemType).toBe("natural");
    expect(body.ventilationSystems.find((v) => v.scenario === "after")?.systemType).toBe("mechanical");

    // Replacing "before" again must not disturb the "after" row.
    const replaceBeforeResponse = await putJson(
      `/api/buildings/${buildingId}/systems/ventilation`,
      { scenario: "before", systems: [] },
      cookie,
    );
    expect(replaceBeforeResponse.status).toBe(200);
    const getAfterReplace = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const bodyAfterReplace = (await getAfterReplace.json()) as {
      ventilationSystems: { scenario: string }[];
    };
    expect(bodyAfterReplace.ventilationSystems).toHaveLength(1);
    expect(bodyAfterReplace.ventilationSystems[0]?.scenario).toBe("after");
  });

  it("bulk-replaces DHW sources for a scenario", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/dhw`,
      {
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
      cookie,
    );
    expect(response.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as { dhwSources: { sourceName: string }[] };
    expect(body.dhwSources).toHaveLength(1);
    expect(body.dhwSources[0]?.sourceName).toBe("Gas water heater");
  });

  it("bulk-replaces distribution systems covering both heating and dhw system types", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/distribution`,
      {
        scenario: "before",
        systems: [
          {
            systemType: "heating",
            pipeDiameterClass: "32-50",
            lengthM: 120,
            insulatedFraction: 0,
            meanFluidTempC: 70,
          },
          {
            systemType: "dhw",
            pipeDiameterClass: "15-25",
            lengthM: 60,
            insulatedFraction: 1,
            meanFluidTempC: 55,
          },
        ],
      },
      cookie,
    );
    expect(response.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as { distributionSystems: { systemType: string }[] };
    expect(body.distributionSystems).toHaveLength(2);
  });

  it("bulk-replaces generation sources — the route that unblocks purchased-energy KPIs", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/generation`,
      {
        scenario: "before",
        sources: [{ endUse: "heating", sourceType: "gas_boiler", efficiencyOrSeer: 0.58 }],
      },
      cookie,
    );
    expect(response.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      generationSources: { sourceType: string; shareOfDemand: number }[];
    };
    expect(body.generationSources).toHaveLength(1);
    expect(body.generationSources[0]?.sourceType).toBe("gas_boiler");
    expect(body.generationSources[0]?.shareOfDemand).toBe(1);
  });

  it("bulk-replaces cooling windows and cooling systems for a scenario", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const windowsResponse = await putJson(
      `/api/buildings/${buildingId}/systems/cooling-windows`,
      {
        scenario: "before",
        windows: [{ orientation: "south", areaM2: 90, gValue: 0.75, shadingFactor: 1 }],
      },
      cookie,
    );
    expect(windowsResponse.status).toBe(200);

    const systemsResponse = await putJson(
      `/api/buildings/${buildingId}/systems/cooling-systems`,
      { scenario: "before", systems: [{ description: "Split AC", seer: 3.2 }] },
      cookie,
    );
    expect(systemsResponse.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      coolingWindows: { orientation: string }[];
      coolingSystems: { seer: number }[];
    };
    expect(body.coolingWindows).toHaveLength(1);
    expect(body.coolingSystems[0]?.seer).toBe(3.2);
  });

  it("404s for a building owned by a different user", async () => {
    const { cookie: ownerCookie } = await signUpTestUser();
    const buildingId = await createBuilding(ownerCookie);
    const { cookie: otherCookie } = await signUpTestUser();

    const response = await authRequest(`/api/buildings/${buildingId}/systems`, {}, otherCookie);
    expect(response.status).toBe(404);
  });

  it("rejects an invalid ventilation payload", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/ventilation`,
      { scenario: "before", systems: [{ systemType: "not-a-real-type" }] },
      cookie,
    );
    expect(response.status).toBe(400);
  });

  it("bulk-replaces lighting zones for a scenario", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/lighting`,
      {
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
      cookie,
    );
    expect(response.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      lightingZones: { name: string; scenario: string }[];
    };
    expect(body.lightingZones).toHaveLength(1);
    expect(body.lightingZones[0]?.name).toBe("Wards");
    expect(body.lightingZones[0]?.scenario).toBe("after");
  });

  it("bulk-replaces equipment items for a scenario", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/equipment`,
      {
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
      cookie,
    );
    expect(response.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      equipmentItems: { name: string; quantity: number }[];
    };
    expect(body.equipmentItems).toHaveLength(1);
    expect(body.equipmentItems[0]?.name).toBe("Old refrigerator");
    expect(body.equipmentItems[0]?.quantity).toBe(4);
  });

  it("bulk-replaces renewable systems with their monthly production, cascading old ones away", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const firstResponse = await putJson(
      `/api/buildings/${buildingId}/systems/renewables`,
      {
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
      cookie,
    );
    expect(firstResponse.status).toBe(200);

    const getResponse = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const body = (await getResponse.json()) as {
      renewableSystems: { systemType: string; monthlyProduction: { month: number }[] }[];
    };
    expect(body.renewableSystems).toHaveLength(1);
    expect(body.renewableSystems[0]?.systemType).toBe("pv");
    expect(body.renewableSystems[0]?.monthlyProduction).toHaveLength(12);

    // Replacing again must not leave the old system's monthly rows behind
    // (relies on the FK cascade, not an explicit child delete).
    const secondResponse = await putJson(
      `/api/buildings/${buildingId}/systems/renewables`,
      { systems: [] },
      cookie,
    );
    expect(secondResponse.status).toBe(200);
    const getAfterClear = await authRequest(`/api/buildings/${buildingId}/systems`, {}, cookie);
    const bodyAfterClear = (await getAfterClear.json()) as { renewableSystems: unknown[] };
    expect(bodyAfterClear.renewableSystems).toHaveLength(0);
  });

  it("rejects a renewable system with fewer than 12 months of production", async () => {
    const { cookie } = await signUpTestUser();
    const buildingId = await createBuilding(cookie);

    const response = await putJson(
      `/api/buildings/${buildingId}/systems/renewables`,
      {
        systems: [
          {
            systemType: "solar_dhw",
            availableAreaM2: 20,
            unitCostUsd: 32448,
            monthlyProductionKwh: [100, 200, 300],
          },
        ],
      },
      cookie,
    );
    expect(response.status).toBe(400);
  });
});
