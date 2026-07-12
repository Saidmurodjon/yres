import { climateRegion, material } from "@yres/db";
import { testDb } from "./test-db";

/** Inserts a minimal climate region directly (no API route creates these — admin/seed-only data). */
export async function seedClimateRegion(name = "Test Region") {
  const [region] = await testDb
    .insert(climateRegion)
    .values({ name, designOutdoorTempC: -14 })
    .returning();
  if (!region) throw new Error("failed to seed climate region");
  return region;
}

/** Inserts a construction material directly (global reference data, admin/seed-only). */
export async function seedMaterial(name: string, thermalConductivityWPerMk: number) {
  const [row] = await testDb.insert(material).values({ name, thermalConductivityWPerMk }).returning();
  if (!row) throw new Error("failed to seed material");
  return row;
}
