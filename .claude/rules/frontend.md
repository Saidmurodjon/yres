# Frontend (React / TanStack Router / Tailwind v4 / `@yres/ui`)

## The `packages/ui` Tailwind content-scanning gotcha

**This is the single most important frontend rule in this repo.** Tailwind v4's automatic content
scan treats `packages/ui` as vendor code once `apps/web` resolves it through
`node_modules/@yres/ui` (the bun workspace symlink) — so any utility class used *only* inside a
shared component in `packages/ui`, and never duplicated verbatim in `apps/web`'s own source, is
silently dropped from the built CSS. This isn't a dev-only cache artifact — it reproduces in a
fresh production build too.

It already broke `inline-flex`/`whitespace-nowrap` on the shared `Button` once, which made every
icon button in the app render `display: block` (icon stacked above the label) in production for
an unknown length of time before it was caught. The fix is the `@source` directive in
`packages/ui/src/styles/globals.css`:
```css
@import "tailwindcss";
@source "../**/*.{ts,tsx}";
```
If you add a new component to `packages/ui` that introduces classes not otherwise used anywhere
in `apps/web`, **verify they actually appear in a real build's output CSS** —
`grep -o '\.your-class{[^}]*}' apps/web/dist/assets/*.css` after a `bun run build` — don't trust
that "it's in the className string" means it made it into the stylesheet. A dev-server visual
check isn't sufficient proof either; check the built CSS.

## TanStack Router — stale chunks after a deploy

Every route is a separate content-hashed JS chunk. A browser tab left open across a deploy holds
route-manifest references to the *previous* deployment's hashes, which the new deployment doesn't
serve — the next lazy-loaded route throws `Failed to fetch dynamically imported module` straight
into the router's default (raw, technical) error screen. `apps/web/src/routes/__root.tsx`'s
`errorComponent` already handles this: it detects that specific error and reloads the tab once
(guarded by a `sessionStorage` flag so a *persistent* failure doesn't reload forever), falling
back to a plain "Something went wrong" + Reload button for anything else. Don't remove or bypass
this — it's the difference between "the app just quietly recovers" and "every deploy shows a raw
stack trace to whoever has a tab open."

## Data tables and tab bars — narrow-viewport overflow

- `packages/ui/src/components/table.tsx`'s `TableCell`/`TableHead` carry `whitespace-nowrap`.
  Without it, a table narrower than its natural content width wraps cell text across 2–3 lines
  instead of using the horizontal scroll the `Table` wrapper's `overflow-auto` already provides.
  Keep this on any new table-rendering component; don't remove it to "fix" wrapping — the fix is
  scrolling, not shrinking columns.
- `packages/ui/src/components/tabs.tsx`'s `TabsList` carries `max-w-full overflow-x-auto` for the
  same reason — the building-detail page has 6 tabs, and without this the trailing ones (Measures,
  Sharing) ran off the right edge on phone-width viewports with no way to reach them.

## Mobile navigation

`apps/web/src/components/app-shell.tsx`'s sidebar is `hidden ... sm:flex` — completely absent
below the `sm` breakpoint. There's a separate compact icon-only `<header>` for that range (logo,
nav icons, sign-out). If you add a new top-level nav destination, add it to both — the shared
`NAV_ITEMS` array feeds the desktop sidebar, but the mobile header renders its own markup from the
same array. Don't reintroduce a `hidden ... sm:flex` pattern anywhere else in the shell without
also providing a below-`sm` fallback; it's exactly how the sidebar bug happened the first time.

## General

- Prefer the existing `@yres/ui` primitives (`Button`, `Card`, `Table`, `Tabs`, `Select`, `Dialog`,
  etc. — see `packages/ui/src/components/`) over ad hoc markup. There is no `Sheet`/`Drawer`
  component yet; don't assume one exists.
- Route files under `apps/web/src/routes/` are TanStack Router file-based routes — the file path
  determines the URL. `_authenticated.tsx`'s `beforeLoad` is what gates every route under
  `_authenticated/` on a valid session; don't duplicate that check inside individual route
  components.
- `formatNumber`/`formatCurrency`/`formatDate`/labels helpers live in `apps/web/src/lib/labels.ts`
  — add new enum-to-label maps there rather than inlining a switch/ternary in a component.
