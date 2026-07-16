# CLAUDE.md

Instructions for Claude Code working in this repository. Read this first; it points to the
detailed rules and current status rather than repeating them.

## What this is

YRES (Yagona Raqamli Energiya Samaradorligi Tizimi) — a SaaS platform that turns a building
energy audit, currently done in a large Excel calculation workbook (`3-DMTT v5.xlsx`), into a
bank-ready web application. See `README.md` for the architecture table and repo layout, and
`PROGRESS.md` for what's built and what's next.

## Before making changes, read the relevant files in `.claude/rules/`

Each covers one area with specific, hard-won gotchas — most were caused by a real production bug
once and are not obvious from reading the code cold:

| File | Covers |
|---|---|
| `stack.md` | Package manager (bun), monorepo layout, TypeScript/Biome conventions |
| `database.md` | Neon's HTTP driver has no transactions, `db.batch()` pattern, migration CLI gotcha, seed-data fidelity |
| `auth.md` | Better Auth cross-subdomain cookies, `errorCallbackURL`, account-linking config |
| `frontend.md` | **The Tailwind `@source` gotcha for `packages/ui`** (read this one even if you're only touching `apps/web`), stale-chunk-after-deploy handling, table/tabs overflow, mobile nav |
| `calculation-engine.md` | `audit.engine.ts`'s standardized-vs-actual calibration, carrier mapping, energy-balance sections |
| `testing-and-verification.md` | Unit vs. integration tests, verifying UI without a local database |
| `deployment.md` | Manual deploy commands, production endpoints, secrets |
| `git-and-commits.md` | Commit granularity and message style this repo's history follows |

## Language

The project owner communicates in Uzbek (sometimes mixed with English technical terms). Respond
in the language they use.

## The single most important gotcha to internalize

Any Tailwind utility class used **only** inside a `packages/ui` component — never duplicated
verbatim in `apps/web`'s own source — silently vanishes from the built CSS unless
`packages/ui/src/styles/globals.css`'s `@source` directive covers it. This already broke every
icon button in the app in production once (`inline-flex`/`whitespace-nowrap` on the shared
`Button`). See `frontend.md` for the full explanation and how to verify a fix actually landed in
the built CSS, not just in a component's `className` string.

## Verifying a change before calling it done

`bun run type-check` and `bun run build` (which for `apps/web` also runs a real Vite build — some
bugs, like the one above, only show up in built output) and `bunx biome lint` on anything touched.
For UI changes, see `testing-and-verification.md` for how to drive the app in a browser preview
without a local database. Don't claim a fix works from reading the diff alone when it's
verifiable.
