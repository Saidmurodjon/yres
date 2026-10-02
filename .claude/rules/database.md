# Baza (Cloudflare D1 + Drizzle)

> **O'tish davri (2026-10-02, K20 / `docs/adr/ADR-016-cloudflare-d1.md`):** baza Neon Postgres'dan Cloudflare D1'ga
> ko'chirilmoqda (`docs/production/faza-0/D01`–`D04`). Quyidagi **"D1"** bo'limi — maqsadli qoidalar, D01 dan boshlab
> yangi kodga amal qiladi. Pastdagi **"Neon (eski)"** bo'limi faqat D02 tugaguncha hali Neon'da ishlayotgan kod uchun;
> D04 da o'chiriladi va bu fayl to'liq qayta yoziladi.

## D1

- **Drayver: `drizzle-orm/d1`, `createDb(env.DB)`** — `DB` — Worker binding (`wrangler.toml` `[[d1_databases]]`), ulanish
  satri va sir yo'q. Durable Object'lar ham xuddi shu `env.DB` ni oladi.
- **Interaktiv tranzaksiya yo'q — atomiklik faqat `db.batch([...])`.** D1 hujjati: batch — SQL tranzaksiya, bitta bayonot
  yiqilsa butun ketma-ketlik orqaga qaytadi. "Shu stsenariy qatorlarini almashtirish" andozasi o'zgarmaydi: bitta
  `delete().where(...)` + insert(lar), hammasi bitta `db.batch()` da.
- **Bitta bayonotda ≤ 100 bog'langan parametr.** `insert(table).values(rows)` massiv bilan — **faqat `insertChunked()`**
  (`packages/db/src/batch.ts`) orqali; u qatorlarni `100 / ustunlar_soni` bo'laklarga bo'lib, bir nechta insert bayonotini
  qaytaradi, ular **o'sha bitta** batch'ga qo'shiladi. Xom `values(rows)` 10 ta 10-ustunli qatordan oshganda
  `too many SQL variables` bilan yiqiladi — bu D1'ga xos, Postgres'da yo'q edi.
- **Bir Worker chaqiruvida ≤ 1 000 so'rov (Paid; Free'da 50).** Batch ichidagi har bayonot hisobga kiradi. Sikl ichida
  so'rov yubormang; ko'p qatorli o'qishni `inArray` bilan bitta so'rovga yig'ing.
- **Bayonot ≤ 100 KB, qator/satr ≤ 2 MB, baza ≤ 10 GB (oshirilmaydi).** Katta fayl/matn — R2'da, bazada faqat kalit.
- **Tiplar (D01 xaritasi):** id — `text` + `crypto.randomUUID()`; pul/fizik kattalik — `real`; vaqt — `integer`
  `timestamp_ms`; boolean — `integer` `boolean` rejimi; sana — `text` `YYYY-MM-DD`; JSON — `text` `json` rejimi;
  enum — `text({ enum })`. **Enum DB darajasida tekshirilmaydi** — yagona himoya zod sxemasi; yangi enum qiymati
  qo'shilganda zod va `enums.ts` bir commit'da.
- **Katta-kichik harfga sezgirsiz qidiruv:** SQLite `LIKE`/`lower()` faqat ASCII. Kirill/o'zbek matni bo'yicha qidiruv —
  ilova yozadigan normallashtirilgan ustun (`toLocaleLowerCase()`), masalan `building.searchText`. Yangi qidiriladigan
  matn maydoni qo'shilsa, normallashtirilgan ustunni ham yozing. `ilike` — yo'q (Postgres operatori).
- **Foreign key'lar har doim majburiy**, `PRAGMA foreign_keys = OFF` D1'da ishlamaydi. Jadvalni qayta yaratadigan migratsiya
  (drizzle-kit SQLite'da ustun tipini o'zgartirishda shunday qiladi) boshida `PRAGMA defer_foreign_keys = on;` bo'lishi va
  tugashigacha buzilish qolmasligi kerak. drizzle-kit hosil qilgan `PRAGMA foreign_keys=OFF` qatorini olib tashlang.
- **Migratsiyalar:** `packages/db/src/schemas/` → `bun run db:generate` → `packages/db/drizzle/NNNN_*.sql`; qo'llash faqat
  `wrangler d1 migrations apply` bilan (`db:migrate:local`, `db:migrate:prod` — `migrations_dir` `wrangler.toml` da). Wrangler
  qo'llanganlarni `d1_migrations` jadvalida kuzatadi. Qo'llangan migratsiya fayli **hech qachon tahrirlanmaydi**.
  `drizzle-kit migrate`/`push`/`studio` ishlatilmaydi.
- **Ma'lumotnoma seed'i — versiyalangan migratsiya.** `src/reference-data.ts` — manba (har qiymat Excel'dan ko'chirilgan,
  o'ylab topilmagan); o'zgarish = yangi `generate --custom` migratsiyasi (`INSERT OR IGNORE` / `UPDATE`) va
  `build:reference-migration` skripti. "Seed allaqachon bor — erta chiqish" muammosi endi yo'q.
- **Lokal baza bor:** `wrangler dev` va testlar Miniflare'ning lokal D1'ida ishlaydi (D03). Production D1'ga lokal
  skriptdan yozish — faqat `wrangler d1 ... --remote` bilan va faqat loyiha egasi buyrug'i bilan.
- **Mavjud jadvalga unique constraint qo'shishdan oldin dublikatlarni tekshiring** (`group by ... having count(*) > 1`) —
  quyidagi Neon bo'limidagi qoida D1'da ham amal qiladi.
- **Backup — D1 Time Travel** (Paid: 30 kun) + logik eksport (`wrangler d1 export`); runbook `docs/runbooks/backup-va-tiklash.md` (T10).

## Neon (eski — D02 tugaguncha amal qiladi, D04 da o'chiriladi)

- **Ilova Neon'ning HTTP drayveridan foydalanadi** (`@neondatabase/serverless` orqali
  `drizzle-orm/neon-http`, `packages/db/src/index.ts`ga qarang), **TCP ulanish pool'idan emas.**
  Bunda bitta katta oqibat bor: **interaktiv tranzaksiyalar yo'q.** Atomik bo'lishi kerak bo'lgan
  har qanday ko'p-bayonotli yozuv o'rniga `db.batch([...])` ishlatadi (`apps/api/src/routes/
  envelope.ts`ning izohiga, va `systems.ts`/`consumption.ts`dagi PUT route'lariga qarang). Yangi
  "shu stsenariyning qatorlarini almashtirish" endpoint'ini qo'shayotganda, mavjud andozaga
  ergashing: bitta `delete().where(...)` bayonoti + bitta shartli `insert().values(rows)`
  bayonoti, ikkalasi birga `db.batch()`ga uzatiladi.
- **Lokal Postgres Neon'ning o'rnini bosa olmaydi.** `packages/db/src/seed.ts`ning boshidagi izoh
  va `README.md` buning sababini tushuntiradi — ilovaning drayveri haqiqiy Neon HTTP endpoint'ini
  talab qiladi. Lokal dev va ushbu sandboxda, agar sessiya uchun haqiqiy `DATABASE_URL`
  berilmagan bo'lsa, baza yo'q.
- **Sxema o'zgarishlari**: `packages/db/src/schemas/`ni tahrirlang, keyin `packages/db/drizzle/`
  ostida migratsiya hosil qilish uchun `bun run db:generate` (`drizzle-kit generate`)ni ishga
  tushiring. Sxema o'zgarishini va hosil qilingan `.sql`ni birga commit qiling.
  `drizzle-kit generate`ga faqat `DATABASE_URL` env o'zgaruvchisi *o'rnatilgan* bo'lishi kerak
  (istalgan qiymat) — u `generate` ishga tushirish uchun ulanmaydi, faqat `migrate`/`push` uchun
  introspeksiya qiladi.
- **`drizzle-kit migrate` ushbu sandboxdan loyihaning Neon instansiyasiga qarshi osilib qolgan
  yoki sezdirmasdan muvaffaqiyatsiz bo'lgan**, verbose/CI rejimida ham foydali xato chiqishi
  bo'lmagan, sababi hech qachon aniqlanmagan (xuddi shu bazaga to'g'ridan-to'g'ri `pg` `Client`
  ulanishi yaxshi ishlaydi). Agar u osilib qolsa yoki xabarsiz 1 bilan chiqsa:
  1. Migratsiyaning `.sql`ini `pg` paketining `Client`i yordamida bir martalik skript bilan
     to'g'ridan-to'g'ri qo'llang (workspace'ning Neon-http `createDb`si emas — u TCP ulanishga
     qarshi shu tarzda ixtiyoriy DDL ishga tushira olmaydi). Buning uchun ulanish satrining
     "-pooler" bo'lmagan host'idan foydalaning.
  2. Buni Drizzle'ning o'z kuzatuv jadvaliga yozib qo'ying, shunda kelajakdagi `drizzle-kit
     migrate` ishga tushirishlari uni qayta qo'llashga urinmaydi: `insert into
     drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`, bu yerda `hash` —
     migratsiya faylining `sha256sum`i, `created_at` esa `packages/db/drizzle/meta/
     _journal.json`dagi shu migratsiya yozuvidan millisekund vaqt belgisi.
  3. Bir martalik skriptni keyin o'chiring — unda ulanish satri qatorga yozilgan yoki uning
     muhitida bo'ladi.
- **Mavjud jadvalga yangi unique constraint qo'shishdan oldin avval oldindan mavjud
  qoidabuzarliklarni tekshiring** (`select ... group by ... having count(*) > 1`). Bu bizni bir
  marta chalg'itdi: oldingi qo'lda testlashdan qolgan haqiqiy takroriy juftlik production'da
  mavjud edi va hal qilinmaguncha constraint'ni bloklab turdi. Yechimni taxmin qilmang —
  ziddiyatli qatorlarni tekshiring va ataylab tanlang (masalan to'liqroq qatorni saqlang), va
  nima olib tashlangani va nima uchunligini ochiq ayting.
- **Ma'lumotnoma/seed ma'lumoti ko'chirilishi kerak, o'ylab topilmasligi kerak.**
  `packages/db/src/seed.ts`ning boshidagi izohi buni aniq bayon qiladi: har bir qiymat asl Excel
  jadvalidan (`3-DMTT v5.xlsx`, `docs/data-dictionary.md`ga qarang) olingan. Agar bir varaq
  seed'ga faqat qisman kirgan bo'lsa, bo'shliqlarni ishonarli ko'rinadigan raqamlar bilan
  to'ldirish o'rniga buni izohda ayting. Deyarli-takroriy qatorlarni birlashtirganda (masalan
  bir xil koeffitsientli, ikki tilda nomlangan bir xil material), birlashtirish qarorini izohda
  hujjatlashtiring — ma'lumotni sezdirmasdan tashlab yubormang.
- `bun run db:seed` (`seedReferenceDataWithDb`) **agar ma'lumotnoma ma'lumoti allaqachon seed
  qilingandek ko'rinsa, erta chiqib ketadi** (mavjud iqlim mintaqasini tekshiradi). Allaqachon
  seed qilingan bazaga qarshi uni qayta ishga tushirish hech narsa qilmaydi — u `seed.ts`ga yangi
  qo'shilgan qatorlarni *olmaydi*. Allaqachon seed qilingan muhitga yangi seed qatorlarini
  to'ldirish uchun, faqat o'sha yangi qatorlarni to'g'ridan-to'g'ri kiriting
  (`.onConflictDoNothing({ target: table.uniqueColumn })` buni qayta ishga tushirish uchun
  xavfsiz qiladi).
- **Integratsiya test to'plamining `resetTestDb`/`TRUNCATE TABLE ... CASCADE`ini hech qachon
  haqiqiy (production yoki umumiy) bazaga qarshi ishga tushirmang.** U tegadigan har bir
  jadvalni tozalab tashlaydi. Integratsiya testlari amalda qanday ishga tushirilishi kerakligi
  haqida testing.md'ga qarang.
