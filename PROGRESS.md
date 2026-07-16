# Progress

A phase-by-phase log of what's been built, what's currently live, and what's known to be missing.
`README.md` has the architecture/repo-layout reference; `.claude/rules/` has the operational
gotchas. This file is the "what happened and in what order" record.

## Status: live in production

- Web: https://yres.saidmurod.com (Cloudflare Pages)
- API: https://yres-api.saidmurod.com (Cloudflare Worker + Neon Postgres)

Core platform is built and deployed: data model, EN ISO 13790-based calculation engine, REST API,
and a full frontend (dashboard, building management, audit wizard, results, financial analysis,
PDF report export). Auth (email/password + Google OAuth), rate limiting, and error tracking are in
place.

## Build phases (chronological)

1. **Foundation** — Turborepo/bun monorepo scaffold; Excel workbook analysis into
   `docs/data-dictionary.md` and `docs/er-diagram.md`; Drizzle schemas.
2. **Calculation engine** — `AuditEngine` and the per-concern services under
   `apps/api/src/services/` (envelope heat loss, ventilation, DHW, distribution, generation,
   financial indicators).
3. **REST API + UI foundation** — routes/validation for buildings, envelope, measures,
   consumption, audit; `@yres/ui` component kit; auth; API client; router shell.
4. **App pages** — Dashboard, Buildings list/detail, envelope/consumption editing, Audit Results
   and Financial Analysis pages.
5. **Deployment infrastructure** — migrations, seed script, CI, Cloudflare provisioning
   (see `docs/deployment.md`).
6. **Test coverage** — integration + unit test suites (see `testing-and-verification.md` for how
   they're actually run — the integration suite needs a real local Postgres this sandbox doesn't
   have).
7. **Systems tab** — CRUD API + UI for ventilation, DHW, distribution, generation, cooling.
8. **PDF report export** — `apps/api/src/services/report.service.ts`, downloadable from Results.
9. **Lighting/equipment/renewables** — modeled in `AuditEngine`, folded into the Systems tab.
10. **Energy measures CRUD** — "Add a measure" form; fixed a pagination cap bug that had been
    silently 400ing the Measures and Consumption tabs on every load.
11. **Building sharing** — invite editors/viewers by role (owner/editor/viewer).
12. **Production hardening** — transactional email (Resend), Sentry error tracking, rate limiting
    on auth endpoints.

## Post-launch fixes (this pass)

Found and fixed after the app was live, roughly in the order discovered:

- **Google sign-in bugs**: missing `errorCallbackURL` (failures dead-ended on the API's bare error
  page), a button that got permanently stuck on failure with no retry, and
  `account_not_linked` silently bouncing users who'd signed up with email/password but never
  clicked the verification link (see `auth.md`).
- **Design/layout pass**: the Tailwind `@source` bug (every icon button in the app was rendering
  `display: block` in production — see `frontend.md`), data tables wrapping cell text instead of
  scrolling, tab bars clipping off-screen on mobile, and the sidebar having no mobile fallback at
  all.
- **Materials catalog**: only ~9 of the source workbook's ~38 reference materials had been
  transcribed into the seed data; backfilled the rest.
- **Consumption entry UX**: replaced the one-bill-at-a-time form with a monthly grid (one
  carrier/year at a time, matching the source workbook's table layout) — required adding a unique
  constraint on `(building_id, energy_carrier, year, month)` and a bulk-replace `PUT` route.
- **Stale-chunk-after-deploy**: a tab left open across a deploy would throw a raw, unrecoverable
  error on the next route navigation; the root route now auto-recovers once and falls back to a
  friendly error screen otherwise (see `frontend.md`).
- **Bill-calibrated savings + energy balance breakdown**: `EnergyMeasureResult.actual` had been a
  stub that just copied `standardized` — no code anywhere read the `utility_bill` table. Now
  computes a real per-carrier calibration ratio from metered bills. Also added
  `energyBalanceBreakdown` to `AuditResult` — a per-component (walls/roof/floor/windows/
  ventilation/generation/lighting/equipment/cooling/PV) before/after table matching the source
  workbook's "Breakdown Baseline & Balance" sheet (see `calculation-engine.md`).

## Known gaps

- **No multi-tenant/organization model.** Buildings belong to a single user, not an organization
  with distinct owner/ESCO/auditor/bank roles across a team. Building-level sharing (owner/editor/
  viewer, phase 11) exists; org-level structure (a company account inviting its own auditors,
  shared branding on reports, org-wide defaults) does not.
- **Shading elements** have no CRUD/UI or calculation wiring yet.
- **Energy balance breakdown** (see above) reconstructs the workbook's per-component rows from
  figures the engine already computes elsewhere; it hasn't been reconciled cell-for-cell against
  the workbook's exact signed-sum totals (gains/EMS/solar-DHW rows in particular) — treat it as
  informative, not as a guaranteed-to-reconcile-to-the-penny replica.
- **GitHub Actions deploy pipeline** (`.github/workflows/deploy.yml`) exists but hasn't been the
  actual deploy path used — deploys so far have all been manual (`deployment.md`). Its secrets/
  environment-protection setup has not been verified end-to-end.
- No standardized construction-type "template" library yet (common local wall/roof assemblies an
  auditor could start from instead of building every layer from scratch) — flagged as a possible
  follow-up, not started.
