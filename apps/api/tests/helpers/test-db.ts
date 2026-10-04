import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { type Database, createDb } from "@yres/db";
import { sql } from "drizzle-orm";
import { getPlatformProxy } from "wrangler";

const MIGRATIONS_DIR = fileURLToPath(new URL("../../../../packages/db/drizzle", import.meta.url));

/**
 * The real thing, locally: Miniflare's D1 (the same engine `wrangler dev` uses), reached through
 * `getPlatformProxy` from `wrangler.toml`'s `DB` binding. `persist: false` keeps it in memory, so
 * every test process starts from an empty database and nothing touches the network or disk.
 * Routes run through the production `createDb` (drizzle-orm/d1) and the real atomic `db.batch()`.
 *
 * `REPORTS_BUCKET` rides along on the same proxy (A05a: snapshot tests need a real `get`/`put` R2
 * round-trip, not just the `put`-only fake in test-env.ts) — Miniflare provisions it from the same
 * `wrangler.toml` binding, in memory, same as `DB`.
 *
 * Top-level await: a test file imports `testDb`/`testD1` synchronously, so the database must exist
 * by the time the module finishes loading.
 */
const proxy = await getPlatformProxy<{ DB: D1Database; REPORTS_BUCKET: R2Bucket }>({
  configPath: fileURLToPath(new URL("../../wrangler.toml", import.meta.url)),
  persist: false,
});

// Routes use the Workers Cache API (`caches.default`, src/lib/http-cache.ts); Node has no such global.
// A no-op cache on purpose: a real one would keep serving a reference-data response cached before
// `resetTestDb()` wiped and re-seeded the tables.
(globalThis as { caches?: unknown }).caches = {
  default: { match: async () => undefined, put: async () => undefined },
};

/** `c.executionCtx` (used by `waitUntil` in routes) throws under a bare `app.request()` without one. */
export const testExecutionCtx: ExecutionContext = proxy.ctx;

export const testD1: D1Database = proxy.env.DB;
export const testDb: Database = createDb(testD1);
export const testReportsBucket: R2Bucket = proxy.env.REPORTS_BUCKET;

/** Applies `packages/db/drizzle/*.sql` in name order, exactly as `wrangler d1 migrations apply` would. */
async function applyMigrations() {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const file of files) {
    const statements = readFileSync(`${MIGRATIONS_DIR}/${file}`, "utf8")
      .split("--> statement-breakpoint")
      // A chunk that is only `--` comment lines (the reference migration's header) is not a statement.
      .map((chunk) => chunk.trim())
      .filter((chunk) => chunk.split("\n").some((line) => line.trim() && !line.startsWith("--")));
    await testD1.batch(statements.map((statement) => testD1.prepare(statement)));
  }
}

await applyMigrations();

/**
 * Empties every application table between tests, keeping the schema. The table list comes from
 * sqlite_master, so a new table is covered without editing this file. Reference data is wiped too —
 * tests that need it call `seedReferenceDataWithDb(testDb)` themselves (once, so it never doubles
 * up with the rows `0001_reference_data.sql` put there). One batch, with FK checks deferred to its end.
 */
export async function resetTestDb() {
  const { results } = await testD1
    .prepare(
      "select name from sqlite_master where type = 'table' and name not like 'sqlite_%' and name not like '_cf_%' and name <> 'd1_migrations'",
    )
    .all<{ name: string }>();
  await testD1.batch([
    testD1.prepare("PRAGMA defer_foreign_keys = on"),
    ...results.map(({ name }) => testD1.prepare(`DELETE FROM "${name}"`)),
  ]);
}

export async function closeTestDb() {
  await proxy.dispose();
}

export { sql };
