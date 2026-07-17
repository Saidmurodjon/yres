# Stack va monorepo konventsiyalari

- **Paket menejeri har doim `bun`.** Vositaning haqiqatan ham bun-mos yo'li bo'lmasa (kamdan-kam —
  `npx wrangler` ishlatiladi, chunki `bun x wrangler` bu repo tarixida muammolar bergan; taxmin
  qilishdan oldin mavjud skriptlarni tekshiring), hech qachon `npm install`/`npx` ishlatmang.
  Workspace skriptlarini repo ildizidan `bun run <script>` sifatida, yoki bitta workspace'ni
  nishonlash uchun `bun run --cwd apps/api <script>` sifatida ishga tushiring.
- **Turborepo + bun workspaces**: `apps/*` va `packages/*`. Root `package.json` skriptlari
  (`dev`, `build`, `lint`, `type-check`, `test`) `turbo run <script>` orqali tarqaladi — bularni
  paketga `cd` qilishdan afzal ko'ring, faqat bitta paketning typecheck/build siklida takrorlanib
  ishlaganda scope qilingan buyruq tezroq bo'lgan holatlar bundan mustasno.
- **`noUncheckedIndexedAccess: true` bilan TypeScript strict rejimi** (`tsconfig.base.json`ga
  qarang). Massiv/record indekslashi (`arr[i]`, `record[key]`) mumkin-bo'lgan-`undefined` deb
  tiplanadi — buni jimjitlash uchun `!` qo'shmang; siklni qayta tuzing (alohida indeks o'zgaruvchisi
  bilan indekslash o'rniga massivning o'ziga `.map((item, i) => ...)`) yoki haqiqiy fallback
  qo'shing.
- **ESLint/Prettier emas, Biome.** Ikki tirnoqli satrlar, har doim nuqta-vergul, 2-bo'shliqli
  indent, 100-belgili qator kengligi (`biome.json`). Tegilgan har qanday narsaga
  `bunx biome lint <fayllar>` ishga tushiring; kerak bo'lsa `bun run format`
  (`biome format --write .`) butun repo bo'ylab formatlashni tuzatadi.
- **Repozitoriya tuzilishi**:
  ```
  apps/web/     React 19 + Vite + TanStack Router/Query, Tailwind v4
  apps/api/     Cloudflare Workers'da Hono — src/services/ hisob-kitob dvigateli
  packages/ui/  Umumiy shadcn/Radix-uslubidagi komponentlar (Tailwind nozik jihati uchun frontend.md'ga qarang)
  packages/db/  Drizzle sxemalari, migratsiyalar, ma'lumotnoma-ma'lumot seed'i (database.md'ga qarang)
  packages/types/  Hisob-kitob natija shakllari uchun umumiy TypeScript turlari
  docs/         data-dictionary.md, er-diagram.md, deployment.md
  ```
- So'ralmasdan yangi yuqori darajali paketlar o'ylab topmang yoki `apps/`/`packages/`ni qayta
  tuzmang — bu bo'linish ataylab qilingan (web/api/ui/types/db har birining bitta aniq
  vazifasi bor).
