# Baza (Cloudflare D1 + Drizzle)

Baza — Cloudflare D1 (SQLite), ADR-016 (`docs/adr/ADR-016-cloudflare-d1.md`; Neon Postgres'dan 2026-10-02 da ko'chirilgan).
Quyidagi har qoida D1/SQLite'ning haqiqiy cheklovidan kelib chiqadi.

- **Drayver: `drizzle-orm/d1`, `createDb(env.DB)`** — `DB` — Worker binding (`wrangler.toml` `[[d1_databases]]`), ulanish
  satri va sir yo'q. Durable Object'lar ham xuddi shu `env.DB` ni oladi.
- **Interaktiv tranzaksiya yo'q — atomiklik faqat `db.batch([...])`.** D1 hujjati: batch — SQL tranzaksiya, bitta bayonot
  yiqilsa butun ketma-ketlik orqaga qaytadi. "Shu stsenariy qatorlarini almashtirish" andozasi o'zgarmaydi: bitta
  `delete().where(...)` + insert(lar), hammasi bitta `db.batch()` da.
- **Bitta bayonotda ≤ 100 bog'langan parametr.** `insert(table).values(rows)` massiv bilan — **faqat `insertChunked()`**
  (`packages/db/src/batch.ts`) orqali; u qatorlarni `100 / ustunlar_soni` bo'laklarga bo'lib, bir nechta insert bayonotini
  qaytaradi, ular **o'sha bitta** batch'ga qo'shiladi. Xom `values(rows)` 10 ta 10-ustunli qatordan oshganda
  `too many SQL variables` bilan yiqiladi.
  **Bu chegara `inArray`/`notInArray` ga ham tegishli** — IN ro'yxatidagi har element bitta parametr: foydalanuvchiga bog'liq
  uzunlikdagi JS massivini bermang, subquery (`inArray(col, db.select({ id }).from(...))`) yoki ≤ 90 lik bo'laklar ishlating.
- **So'rov byudjeti: bitta HTTP so'rov / DO xabari ≤ 40 ta D1 so'rovi.** Hozirgi reja — Workers Free, unda chegara
  **50/chaqiruv** (Paid'da 1 000); batch ichidagi **har bayonot** va Better Auth sessiya tekshiruvi ham hisobga kiradi —
  40 shu sababli zaxira bilan. Sikl ichida so'rov yubormang; ko'p qatorli o'qishni `inArray` bilan bitta so'rovga yig'ing.
  Ko'p qatorli yozuvli endpoint'da zod `.max()` chegaralari eng yomon holatni byudjetga sig'dirishi kerak:
  `1 + Σ ceil(qatorlar / floor(100 / ustunlar))` (delete'lar + bo'laklangan insert'lar) — buni endpoint izohida hisoblab yozing.
  Mavjud o'lchov: `runFullAudit` ≈ 20, PDF hisobot ≈ 30. Byudjetga sig'maydigan ehtiyoj — Paid'ga o'tish triggeri (ADR-016), uni
  so'rovni bir necha HTTP chaqiruvga bo'lib, atomiklikni buzib "chetlab o'tmang".
- **Bayonot ≤ 100 KB, qator/satr ≤ 2 MB, baza ≤ 500 MB (Free; Paid'da 10 GB, oshirilmaydi).** Katta fayl/matn — R2'da, bazada faqat kalit.
- **Tiplar (D01 xaritasi):** id — `text` + `crypto.randomUUID()`; pul/fizik kattalik — `real`; vaqt — `integer`
  `timestamp_ms`; boolean — `integer` `boolean` rejimi; sana — `text` `YYYY-MM-DD`; JSON — `text` `json` rejimi;
  enum — `text({ enum })`. **Enum DB darajasida tekshirilmaydi** — yagona himoya zod sxemasi; yangi enum qiymati
  qo'shilganda zod va `enums.ts` bir commit'da.
- **Katta-kichik harfga sezgirsiz qidiruv:** SQLite `LIKE`/`lower()` faqat ASCII. Kirill/o'zbek matni bo'yicha qidiruv —
  ilova yozadigan normallashtirilgan ustun (`toLocaleLowerCase()`), masalan `building.searchText`. Yangi qidiriladigan
  matn maydoni qo'shilsa, normallashtirilgan ustunni ham yozing. `ilike` / `selectDistinctOn` kabi Postgres'ga xos operatorlar yo'q; `LIKE`da foydalanuvchi matnini `apps/api/src/lib/search.ts`dagi `likeContains()` bilan escape qiling (`%`/`_`).
- **Foreign key'lar har doim majburiy**, `PRAGMA foreign_keys = OFF` D1'da ishlamaydi. Jadvalni qayta yaratadigan migratsiya
  (drizzle-kit SQLite'da ustun tipini o'zgartirishda shunday qiladi) boshida `PRAGMA defer_foreign_keys = on;` bo'lishi va
  tugashigacha buzilish qolmasligi kerak. drizzle-kit hosil qilgan `PRAGMA foreign_keys=OFF` qatorini olib tashlang.
- **Migratsiyalar:** `packages/db/src/schemas/` → `bun run db:generate` → `packages/db/drizzle/NNNN_*.sql`; qo'llash faqat
  `wrangler d1 migrations apply` bilan (`db:migrate:local`, `db:migrate:prod` — `migrations_dir` `wrangler.toml` da). Wrangler
  qo'llanganlarni `d1_migrations` jadvalida kuzatadi. Qo'llangan migratsiya fayli **hech qachon tahrirlanmaydi**.
  `drizzle-kit migrate`/`push`/`studio` ishlatilmaydi.
- **Ma'lumotnoma seed'i — versiyalangan migratsiya.** `src/reference-data.ts` — manba (har qiymat Excel'dan ko'chirilgan,
  o'ylab topilmagan); o'zgarish = yangi `generate --custom` migratsiyasi (`INSERT OR IGNORE` / `UPDATE`) va
  `build:reference-migration` skripti (id'lar tasodifiy — fayl bir marta yaratilib commit qilinadi). Testlar uchun
  `seedReferenceDataWithDb()` shu massivlardan yozadi (`insertChunked` bilan).
- **Lokal baza bor:** `wrangler dev` va testlar Miniflare'ning lokal D1'ida ishlaydi (D03). Production D1'ga lokal
  skriptdan yozish — faqat `wrangler d1 ... --remote` bilan va faqat loyiha egasi buyrug'i bilan.
- **Mavjud jadvalga unique constraint qo'shishdan oldin dublikatlarni tekshiring** (`group by ... having count(*) > 1`) —
  aks holda migratsiya production'da yiqiladi. Yechimni taxmin qilmang: ziddiyatli qatorlarni ko'ring, ataylab tanlang
  (masalan to'liqroq qatorni saqlang) va nima olib tashlangani va nima uchunligini ochiq ayting.
- **Backup — D1 Time Travel** (Free: 7 kun, Paid: 30 kun) + logik eksport (`wrangler d1 export`); runbook `docs/runbooks/backup-va-tiklash.md` (T10).
