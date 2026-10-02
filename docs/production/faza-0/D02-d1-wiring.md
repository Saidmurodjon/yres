# D02 — `apps/api` ni D1 binding'iga ulash

**Manba:** ADR-016. **Commit:** bitta (D01a/D01b bilan birga push qilinadi — D01 dagi izohga qarang).
**Bog'liqlik:** D01.

## Ulanish nuqtalari (kodda tasdiqlangan — bundan boshqa joy yo'q)

| Joy | Hozir | Bo'ladi |
|---|---|---|
| `apps/api/src/index.ts:27` `Env` | `DATABASE_URL: string` | `DB: D1Database` (`DATABASE_URL` olib tashlanadi) |
| `apps/api/src/middleware/db.ts:22` | `createDb(c.env.DATABASE_URL)` | `createDb(c.env.DB)`; doc-izohdagi Neon/Postgres matnini yangilang |
| `durable-objects/conversation-room.ts:65` | `createDb(this.env.DATABASE_URL)` | `createDb(this.env.DB)` — DO ham xuddi shu binding'ni oladi |
| `durable-objects/user-notification-channel.ts:33` | izohda `DATABASE_URL` | izohni yangilang |
| `auth/index.ts` | `drizzleAdapter(db, { provider: "pg" })` | `provider: "sqlite"` |
| `routes/buildings.ts:37-38` | `ilike(building.name/location, %q%)` | `like(building.searchText, \`%${normalize(q)}%\`)` — `normalize = s.trim().toLocaleLowerCase()`; `%`/`_` escape (`security.md`) |
| `routes/buildings.ts` POST/PATCH | — | `searchText` ni har yozuvda hisoblab qo'yish (`name + " " + (location ?? "")`, lower) |
| `routes/chat.ts:429` | `ilike(user.username, %q%)` | `like(...)` — username ASCII (email), SQLite `LIKE` ASCII uchun allaqachon katta-kichik harfga sezgirsiz; izoh bilan |

`grep -rn "DATABASE_URL\|neon\|ilike\|pg-core\|neon-http" apps packages` — D02 oxirida faqat hujjat/izohlarda qolishi mumkin.

## Bajarish

1. **`wrangler.toml`:**
   ```toml
   [[d1_databases]]
   binding = "DB"
   database_name = "yres-dev"
   database_id = "local-dev"            # lokal Miniflare uchun istalgan qiymat
   migrations_dir = "../../packages/db/drizzle"

   [[env.production.d1_databases]]
   binding = "DB"
   database_name = "yres-production"
   database_id = "<D04 da loyiha egasi beradi>"
   migrations_dir = "../../packages/db/drizzle"
   ```
   Production `database_id` hozircha placeholder — D04 gacha production'ga deploy qilinmaydi. Sirlar izohidan `DATABASE_URL` ni olib tashlang.
2. **Skriptlar** (ildiz `package.json` va `apps/api/package.json`):
   - `db:migrate:local` → `wrangler d1 migrations apply DB --local` (`apps/api` dan; binding nomi yoki `database_name` — wrangler
     versiyasidagi sintaksisni tekshiring)
   - `db:migrate:prod` → `... --remote --env production`
   - eski `db:migrate`, `db:seed`, `db:studio` olib tashlanadi. Wrangler chaqiruvi `stack.md` dagi kabi `npx wrangler`
     (repo'da `bun x wrangler` muammo bergan).
   - `dev` skripti: `wrangler dev` dan oldin lokal migratsiyalar qo'llanishi kerak — `"predev"` yoki README'da aniq qadam.
3. **Ommaviy insert'larni bo'laklash (100 parametr limiti):** yangi `packages/db/src/batch.ts`:
   ```ts
   /** D1 allows at most 100 bound parameters per statement (docs: D1 limits). */
   export const D1_MAX_PARAMS = 100;
   export function chunkRowsForInsert<T extends Record<string, unknown>>(rows: T[], columnsPerRow: number): T[][]
   ```
   `columnsPerRow` — jadval ustunlari soni (shu jumladan default'li `id`/`createdAt`, chunki drizzle ularni ham bog'laydi);
   xavfsiz hisob uchun jadvaldan olish: `Object.keys(getTableColumns(table)).length`. Yordamchi
   `insertChunked(db, table, rows): BatchItem[]` — har bo'lak uchun alohida `db.insert(table).values(chunk)`; natija
   mavjud `statements` massiviga `...spread` qilinadi, **bitta** `db.batch()` saqlanadi (atomiklik).
   Qo'llash joylari — `grep -rn "\.insert(" apps/api/src` dagi har `values(rows)` (massiv) chaqiruvi: `envelope.ts`,
   `systems.ts` (9 route), `consumption.ts`, `measures.ts`, `members.ts`, `chat.ts` va boshqalar. Bitta qatorli insert'lar o'zgarmaydi.
   Unit test (`tests/services/batch.test.ts`): 0 qator → `[]`; 10 ustun × 25 qator → 3 bo'lak (10+10+5); bo'lak hech qachon > 100 parametr.
   **So'rov byudjeti (Free reja, `database.md`):** har ko'p qatorli PUT route'i uchun zod chegaralaridagi eng yomon holatda
   bayonotlar soni ≤ 40 bo'lishini hisoblang va route izohiga yozing. T04c dagi chegaralar Paid uchun mo'ljallangan edi —
   sig'masa, chegarani kamaytiring (masalan `envelopeElements` 500 → real ehtiyojga) va PROGRESS.md da sanab o'ting.
   Integratsiya testi (D03 dan keyin): eng yomon holatdagi envelope PUT lokal D1'da o'tadi.
4. **Batch tipi:** `BatchItem<"pg">` → `BatchItem<"sqlite">` (`envelope.ts`, `consumption.ts`, `systems.ts`, `seed.ts` va boshqalar — grep).
5. **Sana/boolean qaytish shakli:** `timestamp_ms` → drizzle `Date` qaytaradi (avval ham `Date` edi), JSON javoblarda
   ISO satr bo'lib ketadi — o'zgarish yo'q bo'lishi kerak. `date` → endi `text`: API javobida avval ham satr edi — tekshiring
   (`deadline`, `effectiveDate`) va farq bo'lsa frontend turini (`apps/web/src/lib/api-types.ts`) moslang.
6. **`returning()`** — SQLite/D1 qo'llab-quvvatlaydi, o'zgarish shart emas. `onConflictDoNothing({ target })` — mavjud.
7. **`count()`/`sum()` natijalari** — SQLite'da `sum` `number` yoki `null`; Postgres'da `numeric` satr qaytarardi.
   `routes/buildings.ts` (`collaboratorCount`, `sum`) va boshqa agregatlarda `Number(...)` o'ramlari to'g'ri ishlashini tekshiring.

## Qabul mezonlari

- [ ] `bun run type-check` (ildizdan, barcha workspace), `bunx biome lint` tegilgan fayllarga — yashil.
- [ ] `bun run --cwd apps/api test` — servis unit testlari yashil (integratsiya testlari D03 gacha sinishi mumkin —
      sababini PROGRESS.md da yozing).
- [ ] Lokal smoke: `db:migrate:local` → `bun run --cwd apps/api dev` → `curl localhost:3000/health`;
      `curl localhost:3000/api/reference/materials` (yoki mavjud ma'lumotnoma endpoint'i) seed qilingan ma'lumotni qaytaradi.
- [ ] Lokal to'liq oqim (preview yoki curl): ro'yxatdan o'tish → bino yaratish → qobiq PUT (ko'p qatorli — bo'laklash ishlaydi)
      → audit run 201.
- [ ] D01+D02 commit'lari endi push qilinadi.
