# Deployment Guide

YRES deploys as two independent pieces:

- **`apps/api`** — a Hono app on **Cloudflare Workers**, backed by **Neon** (serverless Postgres).
- **`apps/web`** — a static React SPA on **Cloudflare Pages**, calling the API over HTTPS.

This guide covers first-time setup. It assumes you own (or will create) the Cloudflare and Neon
accounts — nothing here can be completed without those credentials, which this repository's
development environment does not have access to.

## 1. Provision Neon (database)

1. Create a project at [neon.tech](https://neon.tech). Note the pooled connection string it gives
   you (`postgresql://user:pass@ep-xxxx.aws.neon.tech/neondb?sslmode=require`) — this is your
   `DATABASE_URL`.
2. Apply the schema and seed reference data (do this once per environment — dev, staging, prod
   each need their own):
   ```bash
   export DATABASE_URL="postgresql://...your Neon connection string..."
   bun run db:migrate   # applies packages/db/drizzle/*.sql
   bun run db:seed       # populates materials, climate normals, tariffs, etc. (safe to re-run)
   ```
   Without the seed step, the app still runs, but envelope U-value calculations have no materials
   to pick from and there's no climate region to attach a building to — see
   `packages/db/src/seed.ts` for exactly what it populates and where each value came from.

## 2. Provision Cloudflare

1. Create a Cloudflare account and note your **Account ID** (dashboard right sidebar) —
   this is `CLOUDFLARE_ACCOUNT_ID`.
2. Create an API token (**My Profile → API Tokens → Create Token**) with permissions for
   **Workers Scripts: Edit**, **Cloudflare Pages: Edit**, and **Workers R2 Storage: Edit** —
   this is `CLOUDFLARE_API_TOKEN`.
3. Create an R2 bucket for generated reports:
   ```bash
   bunx wrangler r2 bucket create yres-reports-dev
   bunx wrangler r2 bucket create yres-reports        # production
   ```
   (Report generation/upload isn't implemented yet — this binding is provisioned for when it is.)
4. Create the Pages project once, so subsequent `wrangler pages deploy` calls have somewhere to
   push to:
   ```bash
   bunx wrangler pages project create yres-web
   ```

## 3. Google OAuth (optional, for "Sign in with Google")

Skip this if you only need email/password auth (already fully functional). To enable Google:

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth
   2.0 Client ID (Web application).
2. Authorized redirect URI: `<your API URL>/api/auth/callback/google`.
3. Note the client ID/secret — these become `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

## 4. Configure secrets

**Cloudflare Worker secrets** (not stored in `wrangler.toml` — set directly):
```bash
cd apps/api
bunx wrangler secret put DATABASE_URL --env production
bunx wrangler secret put BETTER_AUTH_SECRET --env production   # any long random string
bunx wrangler secret put GOOGLE_CLIENT_ID --env production      # optional
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env production  # optional
```

**GitHub Actions repo secrets** (Settings → Secrets and variables → Actions), used by
`.github/workflows/deploy.yml`:

| Secret | Value |
|---|---|
| `DATABASE_URL` | Same Neon connection string as above (used to run migrations from CI) |
| `CLOUDFLARE_API_TOKEN` | From step 2.2 |
| `CLOUDFLARE_ACCOUNT_ID` | From step 2.1 |
| `VITE_API_URL` | Your deployed Worker URL, e.g. `https://yres-api-production.<subdomain>.workers.dev` |

**GitHub Environment protection** (recommended): create a `production` environment
(Settings → Environments) and add required reviewers, so `deploy.yml` pauses for a human
approval before it touches production — the workflow already targets `environment: production`,
this just needs the environment itself configured with your desired protection rules.

## 5. Update placeholder config before going live

- `apps/api/wrangler.toml`'s `[env.production]` block has placeholder `name` and `WEB_URL` values
  — replace `WEB_URL` with your actual Pages deployment URL once you have it (needed for the
  CORS allow-list).
- `apps/web/package.json`'s `deploy` script assumes a Pages project named `yres-web` — update if
  you named yours differently in step 2.4.

## 6. Deploy

**Automatically**: merge to `main`. `.github/workflows/ci.yml` runs lint/type-check/test/build on
every push and PR; `.github/workflows/deploy.yml` runs after CI succeeds on `main` (or via manual
`workflow_dispatch` from the Actions tab), applying migrations, seeding, and deploying both apps
— gated on the secrets and environment protection above actually being configured.

**Manually**, from a machine with the Cloudflare CLI authenticated (`bunx wrangler login`):
```bash
bun run db:migrate    # DATABASE_URL env var must be set
bun run db:seed
bun run deploy:api     # wrangler deploy --env production
bun run deploy:web     # vite build (needs VITE_API_URL) + wrangler pages deploy
```

## Local development

No Cloudflare/Neon account needed — see the root `README.md`. `bun run dev` starts the Vite dev
server (5173) and `wrangler dev` (3000) side by side via Turborepo; point `DATABASE_URL` at any
Postgres instance reachable over the network (a local Postgres works for schema/migration testing,
but the app's Neon HTTP driver needs a real Neon endpoint — see the comment in
`packages/db/src/seed.ts`'s `seedReferenceDataWithDb` for why).
