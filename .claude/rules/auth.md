# Auth (Better Auth)

`apps/api/src/auth/index.ts` configures Better Auth (email/password + Google OAuth). Three
non-obvious things that have each caused a real production bug once — don't regress them:

- **`crossSubDomainCookies` is required when the web app and API are on sibling subdomains** of
  the same registrable domain (e.g. `yres.saidmurod.com` / `yres-api.saidmurod.com`). It's
  conditionally enabled only when `WEB_URL` ends in `saidmurod.com` — `*.pages.dev`/
  `*.workers.dev` are *different* public suffixes with no shared registrable domain, so cookies
  can never be shared between those regardless of attributes, and forcing the cross-subdomain
  cookie domain there would just break auth. Don't hardcode the domain string elsewhere; derive
  it the same way this code does.
- **Every `signIn.social(...)` call on the frontend must pass `errorCallbackURL`.** Without it,
  any OAuth failure (state mismatch, account-linking error, etc.) redirects the user to Better
  Auth's own bare error page on the *API's* origin — a dead end with no way back into the app.
  Point it at a route on the web app that can show a real error and a way to retry
  (`apps/web/src/routes/login.tsx` is the reference implementation).
- **`account.accountLinking.requireLocalEmailVerified` is set to `false` deliberately.** Better
  Auth's default requires an *existing* local (email/password) account's `emailVerified` to
  already be `true` before it will link a new Google identity onto it — since Google verifies the
  email itself, that extra local-verification requirement just silently bounces real users back
  to `/login` with an opaque `account_not_linked` error in the server logs and nothing visible to
  the user. Don't re-enable this without also building a real "resend verification" flow for the
  case it's meant to guard.
- When an OAuth bug is reported and the failure mode is vague ("it just goes back to the login
  page"), the fastest real diagnosis is `wrangler tail --env production` while the user reproduces
  it live — Better Auth logs a specific error code (`account_not_linked`, `state_mismatch`, etc.)
  that curl-based reproduction of the flow usually can't surface on its own.
