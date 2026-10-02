# Deployment Guide

YRES deploys as two independent pieces:

- **`apps/api`** — a Hono app on **Cloudflare Workers**, backed by **Cloudflare D1** (SQLite).
- **`apps/web`** — a static React SPA on **Cloudflare Pages**, calling the API over HTTPS.

This guide covers first-time setup. It assumes you own (or will create) the Cloudflare
account — nothing here can be completed without those credentials, which this repository's
development environment does not have access to.

## 1. Provision D1 (database)

1. Create the database (once per environment):
   ```bash
   cd apps/api
   npx wrangler d1 create yres-production
   ```
   Put the printed `database_id` into `apps/api/wrangler.toml` under `[[env.production.d1_databases]]`.
2. Apply the schema and reference data (materials, climate normals, tariffs, ... — a versioned
   migration, `packages/db/drizzle/0001_reference_data.sql`):
   ```bash
   bun run db:migrate:prod   # wrangler d1 migrations apply DB --remote --env production
   ```
   Later schema or reference-data changes are new migration files, applied the same way **before** deploying
   the Worker code that needs them (additive changes only — see `.claude/rules/data-integrity.md`).
   There is no connection string and no database secret: the Worker reaches D1 through the `DB` binding.

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

## 3b. Resend (transactional email — password reset, email verification)

Without this, the app still runs, but `sendResetPassword`/`sendVerificationEmail` silently log
instead of sending (see `apps/api/src/lib/email.ts`) — users who forget a password have no
recovery path.

1. Create an account at [resend.com](https://resend.com) and verify a sending domain (or use their
   shared `onboarding@resend.dev` sandbox sender for early testing — real inboxes only, no custom
   domain needed).
2. Create an API key (**API Keys → Create API Key**) — this is `RESEND_API_KEY`.
3. Set `EMAIL_FROM` in `wrangler.toml`'s `[env.production.vars]` to an address on your verified
   domain, e.g. `YRES <noreply@yourdomain.com>` (not a secret — it's already in the file as a
   placeholder you should replace).

## 3c. Sentry (error tracking, optional but recommended)

Without a DSN, error reporting is disabled entirely (see the `withSentry` wrapper in
`apps/api/src/index.ts`) — API exceptions are only visible in Worker logs, not aggregated or
alerted on.

1. Create a project at [sentry.io](https://sentry.io) (platform: Cloudflare Workers).
2. Copy its DSN — this is `SENTRY_DSN`.

## 3d. Yandex Static Maps (PDF report's building-location map, optional)

Without this, the PDF report still shows the building's coordinates as text — just no map image
(see `fetchYandexStaticMapPng()` in `apps/api/src/services/report.service.ts`, which fails open on
any error).

1. Register/sign in at [developer.tech.yandex.ru](https://developer.tech.yandex.ru) and create a
   key for the **Static API** (part of the JavaScript API & Static API key group).
2. Copy the key — this is `YANDEX_STATIC_MAPS_API_KEY`.

## 4. Configure secrets

**Cloudflare Worker secrets** (not stored in `wrangler.toml` — set directly):
```bash
cd apps/api
bunx wrangler secret put BETTER_AUTH_SECRET --env production   # any long random string
bunx wrangler secret put GOOGLE_CLIENT_ID --env production      # optional
bunx wrangler secret put GOOGLE_CLIENT_SECRET --env production  # optional
bunx wrangler secret put RESEND_API_KEY --env production        # optional, see 3b
bunx wrangler secret put SENTRY_DSN --env production            # optional, see 3c
bunx wrangler secret put YANDEX_STATIC_MAPS_API_KEY --env production  # optional, see 3d
```

**Rate limiting** (brute-force/credential-stuffing protection on sign-in, sign-up, and
password-reset requests): `wrangler.toml` already provisions a native Cloudflare Rate Limiting
binding (`RATE_LIMITER`) for both dev and `[env.production]` — no extra account setup needed, it
activates automatically once deployed. If you remove that binding, the app still runs — it falls
back to an in-memory limiter (see `apps/api/src/middleware/rate-limit.ts`), which works but isn't
shared across Worker isolates.

**GitHub Actions repo secrets** (Settings → Secrets and variables → Actions), used by
`.github/workflows/deploy.yml`:

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | From step 2.2 (also used by CI to apply D1 migrations) |
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
`workflow_dispatch` from the Actions tab), applying D1 migrations and deploying both apps
— gated on the secrets and environment protection above actually being configured.

**Manually**, from a machine with the Cloudflare CLI authenticated (`bunx wrangler login`):
```bash
bun run db:migrate:prod   # additive D1 migrations first
bun run deploy:api     # wrangler deploy --env production
bun run deploy:web     # vite build (needs VITE_API_URL) + wrangler pages deploy
```

## Local development

No Cloudflare account needed — see the root `README.md`. `bun run dev` starts the Vite dev
server (5173) and `wrangler dev` (3000) side by side via Turborepo; `wrangler dev` uses a local D1
(Miniflare), created from the migrations by `bun run db:migrate:local` (the API's `predev` step runs it).

## Backup va tiklash

Runbook: `docs/runbooks/backup-va-tiklash.md` (D1 Time Travel, tiklash mashqi). ADR: `docs/adr/ADR-011-backup-dr.md`, `ADR-015-workers-paid.md`.
