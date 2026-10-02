# D01 — `packages/db` ni SQLite/D1 ga o'tkazish (sxema + baseline migratsiya + seed migratsiyasi)

**Manba:** ADR-016 (K20). **Commit:** 2 ta (D01a sxema+baseline, D01b ma'lumotnoma seed migratsiyasi).
**Bog'liqlik:** yo'q — Faza 0 ning birinchi topshirig'i. D01 tugaguncha `apps/api` hali Neon'da ishlaydi va
type-check sinadi — shuning uchun **D01 va D02 bitta push oralig'ida** bajariladi: D01a commit'i lokal qoladi,
D02 tugab hammasi yashil bo'lganda push qilinadi (README §2 dagi "har commit'dan keyin push" qoidasidan shu
ikki topshiriq uchun ataylab istisno — sinib turgan holatni GitHub'ga chiqarmaslik uchun).

## D01a — sxema va baseline

**Fayllar:** `packages/db/src/schemas/*.ts` (21 fayl), `packages/db/src/index.ts`, `packages/db/drizzle.config.ts`,
`packages/db/package.json`, `packages/db/drizzle/**` (eski 10 ta PG migratsiyasi va `meta/` **o'chiriladi**,
yangi baseline hosil qilinadi — tarix git'da qoladi; production'da saqlanadigan ma'lumot yo'q, ADR-016).

### Tip xaritasi (hamma joyda bir xil — o'zingizcha variant tanlamang)

| Postgres (`pg-core`) | SQLite (`sqlite-core`) | Izoh |
|---|---|---|
| `pgTable` | `sqliteTable` | |
| `uuid("id").primaryKey().defaultRandom()` | `text("id").primaryKey().$defaultFn(() => crypto.randomUUID())` | 35 joy. Ilova darajasida — Workers va Bun'da `crypto.randomUUID` global |
| `uuid("x_id").references(...)` | `text("x_id").references(...)` | `onDelete` qiymatlari aynan saqlanadi |
| `numeric("x", { mode: "number" })` | `real("x")` | 85 joy. JS'da avval ham `number` edi — aniqlik o'zgarmaydi |
| `integer` | `integer` | |
| `text` | `text` | |
| `boolean` | `integer("x", { mode: "boolean" })` | `.default(false)` saqlanadi |
| `timestamp("x").defaultNow()` | `integer("x", { mode: "timestamp_ms" }).$defaultFn(() => new Date())` | 19 joy. `.notNull()` saqlanadi |
| `$onUpdate(...)` (bo'lsa) | xuddi shu, `timestamp_ms` bilan | |
| `date("deadline")`, `date("effective_date")` | `text("…")` (`YYYY-MM-DD`) | API/zod allaqachon satr bilan ishlaydi — tekshiring |
| `jsonb("technology_mix").$type<T>()` | `text("technology_mix", { mode: "json" }).$type<T>()` | `lighting.ts` |
| `pgEnum("name", [...])` + ustun | `text("col", { enum: [...] })` | 17 enum. `enums.ts` dagi **massivlarni** `as const` eksport qiling; `xEnum.enumValues` ishlatilgan joylar (masalan `apps/api/src/schemas/consumption.ts`) buzilmasligi uchun bir xil nomli `{ enumValues }` obyekt eksport qilishni ko'rib chiqing — iste'molchilar soni kam bo'lsa, ularni to'g'ridan-to'g'ri massivga o'tkazing (D02 da) |
| `index`, `uniqueIndex`, `.unique()`, kompozit PK | `sqlite-core` ekvivalentlari | nomlar saqlanadi |

Better Auth jadvallari (`auth.ts`: `user`, `session`, `account`, `verification`): Better Auth SQLite sxemasiga mos
— `emailVerified` boolean rejimi, `expiresAt`/`createdAt`/`updatedAt` `timestamp_ms`. Better Auth CLI kerak emas,
qo'lda o'tkazing; maydon nomlari o'zgarmasin.

### Qidiruv uchun normallashtirilgan ustun

SQLite `LIKE`/`lower()` faqat ASCII'ni katta-kichik harfga sezgirsiz qiladi — "Тошкент" va "тошкент" mos kelmaydi.
`building` jadvaliga `searchText: text("search_text").notNull().default("")` qo'shing (izoh: `name + " " + location`,
`toLocaleLowerCase()` bilan, **ilova** yozadi — D02 da). Boshqa `ilike` joyi (`chat.ts` username qidiruvi) — username
email bo'lgani uchun ASCII, ustun shart emas.

### `src/index.ts`
```ts
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schemas";

export function createDb(d1: D1Database) {
  return drizzle(d1, { schema });
}
export type Database = ReturnType<typeof createDb>;
export * from "./schemas";
```
`D1Database` turi uchun `@cloudflare/workers-types` (apps/api'da bor) — `packages/db/tsconfig.json` `types` ga qo'shing yoki
devDependency. `@neondatabase/serverless` — olib tashlang.

### `drizzle.config.ts`
`dialect: "sqlite"`, `schema`, `out: "./drizzle"`, `strict`, `verbose`. `DATABASE_URL` talabi va `dbCredentials` **olib
tashlanadi** (generate uchun kerak emas; migratsiyalar `wrangler` bilan qo'llanadi — D02). `migrate`/`studio` skriptlari
`package.json` dan olib tashlanadi; `generate` qoladi.

### Baseline
`bun run --cwd packages/db generate --name=baseline` → `drizzle/0000_baseline.sql`. Tekshiring: `CREATE TABLE` 39 ta,
`FOREIGN KEY ... ON DELETE` lar mos, `PRAGMA foreign_keys` qatori **yo'q** (D1'da taqiqlangan — bo'lsa olib tashlang
va `database.md` ga qarang).

## D01b — ma'lumotnoma seed'i versiyalangan migratsiya sifatida

Hozir `seed.ts` (`seedReferenceDataWithDb`, 456 qator) Neon'ga ulanib yozadi va "allaqachon seed qilingan bo'lsa erta
chiqib ketadi" — yangi qatorlar hech qachon yetib bormaydi (`database.md`). D1'da seed **migratsiya fayli** bo'ladi:
har muhitga (`--local`, CI, `--remote`) `wrangler d1 migrations apply` bilan avtomatik, bir marta, tartib bilan tushadi.

1. Ma'lumotni (`MATERIALS`, iqlim normallari, tariflar va h.k.) `seed.ts` dan alohida `src/reference-data.ts` ga ajrating
   (sof massivlar, DB'siz). `seedReferenceDataWithDb(db)` qoladi va shu massivlardan foydalanadi — testlar (D03) uni
   chaqiradi. Manba izohi ("har qiymat Excel'dan ko'chirilgan") ko'chiriladi, **qiymatlar o'zgarmaydi**.
2. `scripts/build-reference-migration.ts`: `reference-data.ts` dan `INSERT OR IGNORE INTO ... VALUES (...)` bayonotlarini
   hosil qiladi. Literal'lar: satr — `'` → `''`; `null` → `NULL`; boolean → `0/1`; Date → ms integer; json → satr.
   Har bayonot ≤ 100 KB (D1 limiti) — qatorlarni bo'laklang. ID'lar (`crypto.randomUUID()`) skript ishga tushganda
   bir marta hosil qilinadi va faylga yoziladi (deterministik bo'lishi shart emas — fayl bir marta yaratiladi va commit qilinadi).
3. `bun run --cwd packages/db generate --custom --name=reference_data` (drizzle-kit jurnalga bo'sh migratsiya qo'shadi) →
   skript natijasini shu faylga yozing. Skriptni `package.json` ga `"build:reference-migration"` sifatida qo'shing.
4. `seed.ts` dagi Neon'ga ulanuvchi kirish nuqtasi (`seedReferenceData(databaseUrl)`, CLI) olib tashlanadi; `seed` skripti ham.
5. Kelajakdagi ma'lumotnoma o'zgarishi = **yangi** `--custom` migratsiya (eski faylni tahrirlash taqiqlangan — u allaqachon
   qo'llangan bo'ladi). Buni `database.md` ga yozing (D04 da to'liq qayta yoziladi).

## Qabul mezonlari

- [ ] `bun run --cwd packages/db type-check` yashil (`apps/api` D02 gacha sinishi kutiladi — commit lokal qoladi).
- [ ] `drizzle/` da faqat `0000_baseline.sql`, `0001_reference_data.sql` va yangi `meta/`.
- [ ] Ikkala SQL fayl toza SQLite'ga qo'llanadi: `bunx wrangler d1 execute` D02 da; hozir tez tekshiruv —
      `sqlite3 :memory: < 0000_baseline.sql` va keyin `0001_reference_data.sql` xatosiz (macOS'da `sqlite3` bor).
- [ ] `select count(*)` har ma'lumotnoma jadvali bo'yicha — `reference-data.ts` dagi massiv uzunliklari bilan teng.
