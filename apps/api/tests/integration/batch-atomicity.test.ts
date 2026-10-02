import { building, user } from "@yres/db";
import { eq } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { seedClimateRegion } from "../helpers/seed-helpers";
import { closeTestDb, resetTestDb, testDb } from "../helpers/test-db";

describe("db.batch() on D1", () => {
  beforeEach(async () => {
    await resetTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  it("rolls back the first statement when a later one violates a foreign key", async () => {
    const region = await seedClimateRegion();
    const userId = crypto.randomUUID();
    await testDb.insert(user).values({
      id: userId,
      name: "Owner",
      email: `${userId}@example.com`,
      username: `${userId}@example.com`,
    });
    const base = {
      userId,
      location: "Tashkent",
      climateRegionId: region.id,
      heatingSeasonDurationDays: 163,
      indoorTempNonOperationC: 14,
      indoorTempOperationC: 22,
      outdoorAvgHeatingSeasonTempC: 3.9,
      outdoorDesignTempC: -14,
      nonOperationHoursPerDay: 14,
      operationHoursPerDay: 10,
    };

    await expect(
      testDb.batch([
        testDb.insert(building).values({ ...base, name: "valid" }),
        // climate_region_id points at nothing → FK violation at the end of the batch.
        testDb
          .insert(building)
          .values({ ...base, name: "broken", climateRegionId: "missing" }),
      ]),
    ).rejects.toThrow();

    const survivors = await testDb.select().from(building).where(eq(building.userId, userId));
    expect(survivors).toEqual([]);
  });
});
