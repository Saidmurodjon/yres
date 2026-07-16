# Deployment

Full first-time setup (provisioning Neon/Cloudflare, secrets, GitHub Actions) is in
`docs/deployment.md` — this file only covers the manual deploy path actually used day to day and
facts worth not re-discovering.

## Production endpoints

- Web: `https://yres.saidmurod.com` (Cloudflare Pages project `yres-web`)
- API: `https://yres-api.saidmurod.com` (Cloudflare Worker `yres-api-production`, custom domain —
  see `apps/api/wrangler.toml`'s `[env.production]`)

Both are on sibling subdomains of `saidmurod.com`, not `*.pages.dev`/`*.workers.dev` — this is
load-bearing for auth cookies (see auth.md). If either custom domain routing ever needs
reconfiguring, preserve that relationship.

## Manual deploy

```bash
# API
cd apps/api
npx wrangler deploy --env production

# Web — VITE_API_URL must be set at *build* time (Vite inlines env vars), not just at deploy time
cd apps/web
VITE_API_URL=https://yres-api.saidmurod.com bun run build
npx wrangler pages deploy dist --project-name=yres-web --branch=main --commit-dirty=true
```

`--commit-dirty=true` is needed because the working tree routinely has uncommitted changes at
deploy time in this workflow (deploy first, commit after verifying) — omit it and Wrangler prompts
interactively, which hangs a non-interactive session.

A GitHub Actions pipeline also exists (`.github/workflows/deploy.yml`, gated on CI +
environment-protection secrets per `docs/deployment.md`) but has not been the actual deploy path
used so far — don't assume pushing to the branch deploys anything until that pipeline's secrets
are confirmed configured.

## After deploying the web app, verify the deployed asset hashes actually changed

`wrangler pages deploy` content-hashes every file; a build that didn't pick up the intended source
change will silently deploy stale-looking assets with new-looking hashes. Spot check with
`curl -s https://yres.saidmurod.com/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'` and confirm the
built bundle actually contains what changed, e.g.
`grep -o '\.inline-flex{[^}]*}' apps/web/dist/assets/*.css` for a CSS-class fix.

## Secrets

Set via `wrangler secret put <NAME> --env production` from `apps/api/`, never committed. Current
set: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`,
`RESEND_API_KEY`. `SENTRY_DSN` is optional (error reporting no-ops when blank — see the
`withSentry` wrapper in `apps/api/src/index.ts`). Wrangler secrets are write-only — there is no
way to read a secret's value back via the CLI; if you need the actual `DATABASE_URL` for a
one-off script (a migration, a data backfill), ask the user for it directly rather than trying to
extract it from the deployed Worker.
