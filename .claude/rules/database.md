# Database (Neon + Drizzle)

- **The app uses Neon's HTTP driver** (`@neondatabase/serverless` via `drizzle-orm/neon-http`,
  see `packages/db/src/index.ts`), **not a TCP connection pool.** This has one big consequence:
  **there are no interactive transactions.** Any multi-statement write that must be atomic uses
  `db.batch([...])` instead (see `apps/api/src/routes/envelope.ts`'s doc comment, and the
  `systems.ts`/`consumption.ts` PUT routes). When adding a new "replace this scenario's rows"
  endpoint, follow the existing pattern: one `delete().where(...)` statement + one conditional
  `insert().values(rows)` statement, passed together to `db.batch()`.
- **A local Postgres will not stand in for Neon.** `packages/db/src/seed.ts`'s header comment and
  `README.md` explain why — the app's driver needs a real Neon HTTP endpoint. Local dev and this
  sandbox have no database unless a real `DATABASE_URL` is provided for the session.
- **Schema changes**: edit `packages/db/src/schemas/`, then `bun run db:generate`
  (`drizzle-kit generate`) to produce a migration under `packages/db/drizzle/`. Commit the schema
  change and the generated `.sql` together. `drizzle-kit generate` only needs *a* `DATABASE_URL`
  env var to be *set* (any value) — it doesn't connect to run `generate`, only to introspect for
  `migrate`/`push`.
- **`drizzle-kit migrate` has hung/failed silently against this project's Neon instance from this
  sandbox**, with no usable error output even in verbose/CI mode, for reasons never root-caused
  (a direct `pg` `Client` connection to the same database works fine). If it hangs or exits 1 with
  no message:
  1. Apply the migration's `.sql` directly with a throwaway script using the `pg` package's
     `Client` (not the workspace's Neon-http `createDb` — that can't run arbitrary DDL against a
     TCP connection the same way). Use the connection string's non-"-pooler" host for this.
  2. Record it in Drizzle's own tracking table so future `drizzle-kit migrate` runs don't try to
     re-apply it: `insert into drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`,
     where `hash` is `sha256sum` of the migration file and `created_at` is the millisecond
     timestamp from that migration's entry in `packages/db/drizzle/meta/_journal.json`.
  3. Delete the throwaway script afterward — it will have had the connection string inlined or in
     its environment.
- **Before adding a new unique constraint to an existing table, check for pre-existing violations
  first** (`select ... group by ... having count(*) > 1`). This bit us once: a real duplicate pair
  existed in production from earlier manual testing and blocked the constraint until resolved.
  Don't guess at a resolution — inspect the conflicting rows and pick deliberately (e.g. keep the
  more complete row), and say plainly what was removed and why.
- **Reference/seed data must be transcribed, not invented.** `packages/db/src/seed.ts`'s header
  comment states this explicitly: every value is sourced from the original Excel workbook
  (`3-DMTT v5.xlsx`, see `docs/data-dictionary.md`). If a sheet only partially made it into the
  seed, say so in a comment rather than filling gaps with plausible-looking numbers. When merging
  near-duplicate rows (e.g. the same material named in two languages with the same coefficient),
  document the merge decision in a comment — don't silently drop data.
- `bun run db:seed` (`seedReferenceDataWithDb`) **exits early if reference data already looks
  seeded** (checks for an existing climate region). Re-running it against an already-seeded
  database is a no-op — it will *not* pick up newly added rows in `seed.ts`. To backfill new seed
  rows into an already-seeded environment, insert just those new rows directly
  (`.onConflictDoNothing({ target: table.uniqueColumn })` makes this safe to re-run).
- **Never run the integration test suite's `resetTestDb`/`TRUNCATE TABLE ... CASCADE` against a
  real (production or shared) database.** It wipes every table it touches. See testing.md for how
  the integration tests are actually meant to run.
