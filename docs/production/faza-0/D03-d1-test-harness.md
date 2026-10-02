# D03 — Test harness: Postgres o'rniga lokal D1 (integratsiya + E2E + CI)

**Manba:** ADR-016 · 06 §1.5. **Commit:** bitta. **Bog'liqlik:** D02.
**Bu T01 ning eski mazmunini almashtiradi** — T01 endi faqat qolgan CI gigiyenasi (T01 fayliga qarang).

## Hozirgi holat (kodda tasdiqlangan)

- `apps/api/tests/setup.ts`: `vi.mock("@yres/db")` → `createDb: () => testDb`.
- `apps/api/tests/helpers/test-db.ts`: `drizzle-orm/node-postgres` + `pg.Pool`, `TEST_DATABASE_URL`, `.batch()` — ketma-ket
  shim (**atomik emas**), `resetTestDb()` — qo'lda ro'yxat bo'yicha `TRUNCATE ... CASCADE`.
- `apps/api/tests/e2e/server.ts` (Playwright `webServer`, `bun run` bilan): `c.set("db", testDb)`, `seedReferenceDataWithDb`.
- `apps/api/tests/helpers/test-env.ts`: `testEnv: Env` (`DATABASE_URL` maydoni bilan).
- `.github/workflows/ci.yml`: `postgres:16` service, `psql` migratsiya qadami.
- Natija: integratsiya testlari lokal sandbox'da **hech qachon ishlamagan** (`testing-and-verification.md`).

## Maqsad

Integratsiya va E2E testlari **lokal mashinada ham, CI'da ham** bir xil — Miniflare'ning haqiqiy lokal D1'ida, prodakshn
drayveri (`drizzle-orm/d1`) va **haqiqiy atomik `batch()`** bilan ishlaydi. Postgres butunlay olib tashlanadi.

## Bajarish

1. **D1 nusxasini olish:** `wrangler` (`^4.84`) dagi `getPlatformProxy()`:
   ```ts
   import { getPlatformProxy } from "wrangler";
   const proxy = await getPlatformProxy<Env>({ configPath: "wrangler.toml", persist: false });
   const d1 = proxy.env.DB;
   ```
   `persist: false` — har test jarayoni uchun toza, xotiradagi baza. Bu yondashuv ishlamasa (Vitest/Bun bilan mos kelmasa),
   to'g'ridan-to'g'ri `new Miniflare({ d1Databases: ["DB"], modules: true, script: "" })` ni sinab ko'ring. Ikkalasi ham
   ishlamasa — to'xtang (README §5); `@cloudflare/vitest-pool-workers` ga o'tish — katta qaror, o'zingiz qilmang.
2. **Migratsiyalarni qo'llash** (`tests/helpers/test-db.ts`): `packages/db/drizzle/*.sql` ni nom tartibida o'qib,
   `--> statement-breakpoint` bo'yicha bo'lib, `d1.batch(statements.map((s) => d1.prepare(s)))`. Shu bilan baseline va
   ma'lumotnoma seed migratsiyasi (D01b) ham tushadi.
3. **`testDb`** = `createDb(d1)` — **haqiqiy** `@yres/db` `createDb`. `setup.ts` dagi `vi.mock` endi `createDb` ni almashtirmaydi;
   o'rniga test `env` ichida `DB: d1` beriladi va `dbMiddleware` o'z ishini qiladi. Agar ba'zi testlar `app.request(path, init, testEnv)`
   bilan ishlasa — `testEnv.DB = d1` (async init kerak bo'lgani uchun `test-env.ts` ni `getTestEnv()` funksiyasiga aylantiring
   yoki setup'da to'ldiring). Shim `.batch()` **olib tashlanadi** — endi atomiklik ham testlanadi.
4. **`resetTestDb()`:** sxemadagi barcha jadvallar ro'yxati `select name from sqlite_master where type='table' and name not like
   'sqlite_%' and name not like '_cf_%' and name <> 'd1_migrations'` dan; bitta batch: birinchi bayonot `PRAGMA defer_foreign_keys = on`,
   keyin har jadvalga `DELETE FROM "<t>"`. **Ma'lumotnoma jadvallari ham tozalanadimi?** Hozirgi testlar ma'lumotnomani o'zi
   seed qiladi (`seedReferenceDataWithDb`) — eng kam o'zgarish: hozirgidek hammasini tozalash va testlardagi seed chaqiruvlari
   qolishi. Muqobil (tezroq): ma'lumotnoma jadvallarini tozalamaslik va testlardagi seed chaqiruvlarini olib tashlash —
   bu testlar mazmunini o'zgartiradi, qilmang.
5. **Neon himoyasi** (eski T01 bandi) — endi kerak emas: test harness umuman tarmoqqa chiqmaydi. `TEST_DATABASE_URL`
   va `pg`/`drizzle-orm/node-postgres` bog'liqliklari olib tashlanadi.
6. **E2E server** (`tests/e2e/server.ts`): o'sha `getPlatformProxy` + migratsiya yordamchisi bilan `testDb`; `bun run` ostida
   miniflare ishlamasa, Playwright `webServer.command` ni `node --import tsx` yoki `bunx tsx` ga almashtiring (repo'da qaysi
   mavjud bo'lsa) — o'zgarishni izohda asoslang.
7. **`vitest.config.ts`:** `fileParallelism: false` izohini yangilang (Postgres emas, umumiy D1 nusxasi). Miniflare jarayonini
   `afterAll` da `proxy.dispose()` bilan yoping (`closeTestDb`).
8. **CI (`ci.yml`):** `services.postgres`, `TEST_DATABASE_URL`, psql qadami **olib tashlanadi**. Qo'shimcha qadam kerak emas —
   testlar migratsiyalarni o'zi qo'llaydi.
9. **Hujjatlar:** `testing-and-verification.md` — "lokal Postgres yo'q, integratsiya testlari ECONNREFUSED bilan yiqiladi"
   bo'limini yangilang: endi `bun run test` lokal ham to'liq ishlaydi. `faza-0/README.md` §3 jadvalidagi tegishli qatorni yangilang.

## Qabul mezonlari

- [ ] `bun run --cwd apps/api test` — **lokal**, servis + integratsiya testlari to'liq yashil. Bu Faza 0 ning eng katta
      yutug'i: birinchi marta integratsiya testlari shu mashinada ishlaydi. Yiqilganlarni yashirmang — har birini
      tuzating (D01/D02 dagi tip farqi bo'lsa) yoki PROGRESS.md ga sababi bilan yozing.
- [ ] Atomiklik testi (yangi, `tests/integration/batch-atomicity.test.ts`): ataylab FK'ni buzadigan ikkinchi bayonotli
      batch → birinchi bayonot ham qo'llanmagan.
- [ ] `bunx playwright test` (`apps/web`) — lokal yashil yoki ishga tushmasa sababi PROGRESS.md da.
- [ ] `grep -rn "pg\b\|node-postgres\|TEST_DATABASE_URL\|postgres:16" apps .github` — natija yo'q.
