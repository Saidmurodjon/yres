# YRES — Yagona Raqamli Energiya Samaradorligi Tizimi

Unified digital energy efficiency system: a SaaS platform that turns building energy audits
(currently done in a large Excel calculation workbook) into a modern, bank-ready web application.

## Status

Core platform is built: data model, calculation engine (EN ISO 13790-based), REST API, and a
full frontend (dashboard, building management, audit wizard, results, financial analysis). See
`docs/data-dictionary.md` and `docs/er-diagram.md` for the source-of-truth analysis of the
original Excel calculation engine (`3-DMTT v5.xlsx`) this platform reimplements, and
`docs/deployment.md` for taking it live.

Lighting, equipment, PV, solar-DHW, and EMS are now modeled in `AuditEngine` (see
`apps/api/src/services/{lighting,equipment,renewable}.service.ts`) and have CRUD + UI in the
"Systems" tab, alongside ventilation/DHW/distribution/generation/cooling. PDF report export
(`apps/api/src/services/report.service.ts`) is downloadable from the Results page.

Energy measures now have full CRUD (`POST`/`DELETE /:id/measures`) and an "Add a measure" form
on the Measures tab — previously there was no way to create one at all, so the tab's proposal/
selection workflow was unreachable for any real building. (Along the way, fixed a pagination cap
bug that had been silently 400ing both the Measures and Consumption tabs on every load — see
`schemas/pagination.ts`.)

Known gaps: no multi-tenant/role model yet (buildings belong to a single user, not an
organization with owner/ESCO/auditor/bank roles); shading elements have no CRUD/UI or
calculation wiring.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, TanStack Router + Query, Tailwind CSS v4 + shadcn/ui (Radix) |
| Backend | Hono (TypeScript), deployed as a Cloudflare Worker |
| Database | Neon (PostgreSQL) + Drizzle ORM |
| Auth | Better Auth (email/password + Google OAuth) |
| Monorepo | Turborepo + Bun workspaces |
| CI/CD | GitHub Actions (`.github/workflows/`) |

## Repository layout

```
apps/
  web/        React + Vite frontend (TanStack Router)
  api/        Hono backend (Cloudflare Worker) + calculation engine (src/services/)
packages/
  ui/         Shared shadcn/ui-style components (Radix primitives + Tailwind v4)
  db/         Drizzle ORM schemas, migrations, reference-data seed script
  types/      Shared TypeScript types (calculation result shapes)
docs/
  data-dictionary.md   Worksheet-by-worksheet analysis of the source Excel workbook
  er-diagram.md        Entity-relationship design derived from the data dictionary
  deployment.md        Neon/Cloudflare setup, secrets, first deploy
```

## Local development

```bash
bun install
cp .env.example .env               # root env template
cp apps/web/.env.example apps/web/.env

# DATABASE_URL must point at a real Neon endpoint — see docs/deployment.md
# and packages/db/src/seed.ts's header comment for why a plain local
# Postgres won't work with the app's Neon HTTP driver.
bun run db:migrate                  # apply the committed migration in packages/db/drizzle/
bun run db:seed                      # populate materials, climate normals, tariffs, etc.

bun run dev                           # starts apps/web (5173) and apps/api (3000) via turbo
```

Schema changes go through Drizzle: edit `packages/db/src/schemas/`, then
`bun run db:generate` to produce a new migration file, and commit both the schema change and the
generated migration together.

## Useful commands

```bash
bun run build         # build all apps/packages
bun run lint           # biome lint
bun run type-check     # tsc --noEmit across workspaces
bun run test            # vitest (apps/api's 42 calculation-engine unit tests)
bun run format          # biome format --write .
bun run db:studio       # Drizzle Studio (visual DB browser)
```

## Deploying

See `docs/deployment.md` — provisioning Neon and Cloudflare, required secrets, and the
GitHub Actions CI/deploy pipeline.
