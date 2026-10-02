import type { BatchItem } from "drizzle-orm/batch";
import type { Database } from "./index";
import {
  CLIMATE_MONTHLY_NORMALS,
  CLIMATE_REGION,
  ENERGY_TARIFFS,
  LAMP_TYPES,
  MATERIALS,
  PIPE_LOSS_REFERENCES,
  REFERENCE_EFFECTIVE_DATE,
  SURFACE_RESISTANCES,
} from "./reference-data";
import {
  climateMonthlyNormal,
  climateRegion,
  energyTariff,
  lampType,
  material,
  pipeLossReference,
  surfaceResistance,
} from "./schemas";

/**
 * Inserts the reference data from `reference-data.ts` through Drizzle — for
 * tests and any DB that did not get `0001_reference_data.sql`. Real
 * environments get the same rows from that versioned migration
 * (`wrangler d1 migrations apply`), so this is not a deploy step.
 *
 * Skips if a climate region already exists, and the insert is one atomic
 * `db.batch()` — all or nothing.
 */
export async function seedReferenceDataWithDb(db: Database) {
  const [existingRegion] = await db.select({ id: climateRegion.id }).from(climateRegion).limit(1);
  if (existingRegion) {
    console.log("Reference data already seeded (found an existing climate region) — skipping.");
    return;
  }

  const regionId = crypto.randomUUID();

  const statements: BatchItem<"sqlite">[] = [
    db
      .insert(material)
      .values(MATERIALS.map((r) => ({ ...r })))
      .onConflictDoNothing({ target: material.name }),
    db
      .insert(surfaceResistance)
      .values(SURFACE_RESISTANCES.map((r) => ({ ...r })))
      .onConflictDoNothing({ target: surfaceResistance.elementCategory }),
    db.insert(pipeLossReference).values(PIPE_LOSS_REFERENCES.map((r) => ({ ...r }))),
    db
      .insert(lampType)
      .values(LAMP_TYPES.map((r) => ({ ...r })))
      .onConflictDoNothing({ target: lampType.name }),
    db
      .insert(energyTariff)
      .values(ENERGY_TARIFFS.map((r) => ({ ...r, effectiveDate: REFERENCE_EFFECTIVE_DATE }))),
    db.insert(climateRegion).values({ id: regionId, ...CLIMATE_REGION }),
    db
      .insert(climateMonthlyNormal)
      .values(CLIMATE_MONTHLY_NORMALS.map((r) => ({ ...r, climateRegionId: regionId }))),
  ];

  await db.batch(statements as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
}
