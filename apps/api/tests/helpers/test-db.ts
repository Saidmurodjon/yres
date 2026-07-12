import type { Database } from "@yres/db";
import * as schema from "@yres/db/schemas";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://yres:yres_dev_password@localhost:5432/yres_test";

/**
 * A local Postgres-backed Drizzle client standing in for `@yres/db`'s
 * `createDb`, which only speaks Neon's HTTP/websocket protocol and can't
 * reach a plain local Postgres instance (see packages/db/src/seed.ts's
 * `seedReferenceDataWithDb` doc comment for the same constraint). Route code
 * never imports this directly — `vitest.setup.ts` mocks `@yres/db`'s
 * `createDb` export to return this instead, so every route under test runs
 * completely unmodified.
 *
 * `.batch()` doesn't exist on the node-postgres driver (neon-http's atomic
 * multi-statement batch is Neon-specific); it's shimmed here as a plain
 * sequential await. That's a real behavior difference (no atomicity), but
 * the statements passed to it are already built against this exact `db`
 * instance, so each executes correctly on its own — atomicity just isn't
 * exercised by these tests, which only matters for concurrent-write safety,
 * not single-threaded test correctness.
 */
const pool = new Pool({ connectionString: TEST_DATABASE_URL });
const baseDb = drizzle(pool, { schema });

export const testDb = Object.assign(baseDb, {
  batch: async (queries: readonly PromiseLike<unknown>[]) => {
    const results: unknown[] = [];
    for (const query of queries) {
      results.push(await query);
    }
    return results;
  },
}) as unknown as Database;

const TABLES_IN_FK_ORDER = [
  "renewable_production_monthly",
  "envelope_opening",
  "envelope_element",
  "opening_type",
  "construction_layer",
  "construction_type",
  "building_block",
  "ventilation_system",
  "dhw_source",
  "distribution_system",
  "equipment_item",
  "lighting_zone",
  "cooling_window",
  "cooling_system",
  "generation_source",
  "renewable_system",
  "shading_element",
  "energy_measure",
  "non_ee_measure",
  "utility_bill",
  "audit_run",
  "building",
  "climate_monthly_normal",
  "climate_region",
  "material",
  "surface_resistance",
  "pipe_loss_reference",
  "lamp_type",
  "energy_tariff",
  "session",
  "account",
  "verification",
  "user",
];

/** Truncates every application table between tests, keeping the schema itself. */
export async function resetTestDb() {
  for (const table of TABLES_IN_FK_ORDER) {
    await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);
  }
}

export async function closeTestDb() {
  await pool.end();
}

export { sql };
