# Stack & monorepo conventions

- **Package manager is `bun`, always.** Never `npm install`/`npx` unless a tool genuinely has no
  bun-compatible path (rare — `npx wrangler` is used because `bun x wrangler` has had issues in
  this repo's history; check existing scripts before assuming). Run workspace scripts as
  `bun run <script>` from repo root, or `bun run --cwd apps/api <script>` to target one workspace.
- **Turborepo + bun workspaces**: `apps/*` and `packages/*`. Root `package.json` scripts
  (`dev`, `build`, `lint`, `type-check`, `test`) fan out via `turbo run <script>` — prefer these
  over `cd`-ing into a package, except when iterating on one package's typecheck/build loop where
  the scoped command is faster.
- **TypeScript strict mode with `noUncheckedIndexedAccess: true`** (see `tsconfig.base.json`).
  Array/record indexing (`arr[i]`, `record[key]`) types as possibly-`undefined` — don't add `!`
  to silence it; either restructure the loop (`.map((item, i) => ...)` over the array itself
  instead of indexing by a separate index variable) or add a real fallback.
- **Biome, not ESLint/Prettier.** Double-quote strings, semicolons always, 2-space indent,
  100-char line width (`biome.json`). Run `bunx biome lint <files>` on anything you touch;
  `bun run format` (`biome format --write .`) fixes formatting repo-wide if needed.
- **Repository layout**:
  ```
  apps/web/     React 19 + Vite + TanStack Router/Query, Tailwind v4
  apps/api/     Hono on Cloudflare Workers — src/services/ is the calculation engine
  packages/ui/  Shared shadcn/Radix-style components (see frontend.md for a Tailwind gotcha)
  packages/db/  Drizzle schemas, migrations, reference-data seed (see database.md)
  packages/types/  Shared TypeScript types for calculation result shapes
  docs/         data-dictionary.md, er-diagram.md, deployment.md
  ```
- Don't invent new top-level packages or restructure `apps/`/`packages/` without being asked —
  the split is deliberate (web/api/ui/types/db each have a single clear responsibility).
