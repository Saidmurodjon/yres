# YRES — Yagona Raqamli Energiya Samaradorligi Tizimi

Unified digital energy efficiency system: a SaaS platform that turns building energy audits
(currently done in a large Excel calculation workbook) into a modern, bank-ready web application.

## Status

This repository is under active development. Current phase: **Phase 1 — Excel analysis & data
modeling**. See `docs/data-dictionary.md` and `docs/er-diagram.md` for the source-of-truth
analysis of the original Excel calculation engine (`3-DMTT v5.xlsx`), which this platform
reimplements as TypeScript services backed by PostgreSQL.

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript, TanStack Router + Query, Tailwind CSS v4 + shadcn/ui |
| Backend | Hono (TypeScript), deployed as a Cloudflare Worker |
| Database | Neon (PostgreSQL) + Drizzle ORM |
| Auth | Better Auth + Google OAuth |
| Monorepo | Turborepo + Bun workspaces |

## Repository layout

```
apps/
  web/        React + Vite frontend (TanStack Router)
  api/        Hono backend (Cloudflare Worker)
packages/
  ui/         Shared shadcn/ui-style components
  db/         Drizzle ORM schemas + migrations
  types/      Shared TypeScript types
docs/
  data-dictionary.md   Worksheet-by-worksheet analysis of the source Excel workbook
  er-diagram.md        Entity-relationship design derived from the data dictionary
```

## Local development

```bash
bun install
cp .env.example .env
bun run db:generate   # generate Drizzle migrations from packages/db/src/schemas
bun run db:migrate     # apply migrations to DATABASE_URL
bun run dev             # starts apps/web (5173) and apps/api (3000) via turbo
```

## Useful commands

```bash
bun run build         # build all apps/packages
bun run lint           # biome lint
bun run type-check     # tsc --noEmit across workspaces
bun run test            # vitest
bun run format          # biome format --write .
```
