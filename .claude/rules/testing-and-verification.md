# Testing & verification

## Test suite split

`apps/api` uses Vitest (`bun run test`, from repo root or `apps/api`).

- **`apps/api/tests/services/*.test.ts`** — pure unit tests of individual calculation functions
  (heat loss, ventilation, financial, generation, etc.). No database needed. These should always
  pass; a failure here is a real regression.
- **`apps/api/tests/integration/*.test.ts`** — full HTTP-route tests against a real Postgres via
  `tests/helpers/test-db.ts`'s `resetTestDb()`, which `TRUNCATE`s every table between tests. They
  need a local Postgres listening on `127.0.0.1:5432`. **This sandbox has no local Postgres**, so
  every integration test fails with `ECONNREFUSED` here — that is expected and not a signal of a
  real regression. Don't "fix" this by pointing `DATABASE_URL` at the real Neon database; that
  would `TRUNCATE` production data (see database.md).
- When you change calculation logic in `apps/api/src/services/`, run `bun run test` anyway — the
  service-level unit tests still catch real breakage even though the integration suite can't run
  here. If you need end-to-end confidence a unit test can't give you (e.g. a change that only
  shows up through the full HTTP route + DB), the honest thing is to say so explicitly rather than
  claim full coverage.

## Before calling any change done

1. `bun run type-check` in the affected workspace(s) (or from root for a cross-cutting change).
2. `bun run build` for `apps/web` — it runs `vite build && tsc --noEmit`, and a real Vite build
   catches things a bare `tsc` pass won't (see the Tailwind `@source` gotcha in frontend.md, which
   only shows up in built CSS output).
3. `bunx biome lint <files you touched>`.
4. For backend calculation changes: `bun run test` (service unit tests).

## Verifying UI changes without a local database

There is normally no database available in this sandbox, which blocks the authenticated app
(dashboard, buildings, results, etc.) from rendering real data through the normal dev server. The
established workaround:

1. `.claude/launch.json` defines two dev-server configs: `web` (`vite` dev server, port 5173) and
   `web-preview` (`vite preview` against the production `dist/` build, port 4173 — use this one
   specifically to test production-build-only behavior like the stale-chunk error boundary).
2. Start one with the Preview MCP tool's `preview_start`, not raw `Bash` — the tool description
   says this explicitly, and it's what gives you `preview_screenshot`/`preview_eval`/etc.
3. Point the app at a throwaway local mock API instead of the real one: write a small
   `Bun.serve()` script (a scratch file *outside* the repo, e.g. `~/mock-api-server.mjs` — don't
   commit it) that answers `/api/auth/get-session`, `/api/buildings/...`, and whatever else the
   page under test needs, with CORS headers allowing `http://localhost:5173` and
   `Access-Control-Allow-Credentials: true`. Set `apps/web/.env.local` (gitignored) to
   `VITE_API_URL=http://localhost:4001` (or whatever port), restart the dev server so Vite picks
   up the new env var, and delete both the mock server and `.env.local` when done.
4. Mock data must match the real shape closely enough not to trigger false findings — e.g. an
   invalid enum value in mock data (a `buildingType` not in the real union) can make a real UI bug
   look like it's there when it's actually just bad fixture data. Double check the mock against
   `apps/web/src/lib/api-types.ts` / `packages/types` before trusting what renders.
5. `preview_screenshot` occasionally hangs/times out after a page navigation for reasons unrelated
   to the app itself. If it times out twice in a row, stop and restart the preview server
   (`preview_stop` then `preview_start`) rather than continuing to retry the same call.
6. Clean up: kill the mock server process, delete the scratch mock-server file and
   `apps/web/.env.local` once verification is done — don't leave them for the next session to trip
   over.
