# ADR-016 — Ma'lumotlar bazasi: Neon Postgres → Cloudflare D1

- **Holat:** ✅ Qabul qilindi (loyiha egasi, 2026-10-02) · Master reja K20
- **Ijro:** `docs/production/faza-0/D01`–`D04` (Faza 0 boshida, T01 dan oldin)

## Kontekst

YRES API, fayllar (R2), real-time (Durable Objects) allaqachon Cloudflare'da. Faqat baza tashqarida — Neon
Postgres, `drizzle-orm/neon-http` orqali. Bu bo'linish amalda bir nechta muammo bergan (`database.md`):
`drizzle-kit migrate` sandbox'dan osilib qolgan, lokal Postgres Neon HTTP drayverining o'rnini bosa olmaydi
(lokal dev va integratsiya testlari bazasiz), CI testlari node-postgres orqali boshqa drayverda ishlaydi,
backup/PITR alohida reja va alohida runbook talab qiladi. Production'dagi ma'lumot — faqat test ma'lumoti
(loyiha egasi tasdiqladi), ya'ni ko'chirish narxi hozir eng past.

## Variantlar

| Variant | Afzallik | Kamchilik |
|---|---|---|
| (a) Neon'da qolish | Ish yo'q, Postgres imkoniyatlari | Yuqoridagi muammolar qoladi; ikki provayder, ikki hisob-kitob |
| (b) Neon + Hyperdrive | Postgres qoladi, ulanish tezlashadi | Baza baribir tashqarida; lokal/test muammosi hal bo'lmaydi |
| **(c) Cloudflare D1** | Hammasi bitta platformada; `wrangler dev` haqiqiy lokal D1 beradi; `batch()` atomik (joriy andoza saqlanadi); Time Travel PITR o'rnatilgan (Free: 7 kun, Paid: 30 kun); DO'dan binding orqali | SQLite: tiplar soddaroq, 100 parametr/so'rov, 10 GB/baza chegarasi, Kirill harflari uchun case-insensitive `LIKE` yo'q |

## Qaror

**(c) D1.** Bo'sh bazadan boshlanadi (test ma'lumoti ko'chirilmaydi, foydalanuvchilar qayta ro'yxatdan o'tadi).
Drizzle ORM qoladi (`drizzle-orm/d1`, `sqlite-core`), Better Auth drizzle adapteri `provider: "sqlite"`.

## Oqibatlar

**Soddalashadi:**
- Lokal dev va integratsiya testlari haqiqiy D1 bilan ishlaydi (Miniflare) — "sandbox'da baza yo'q" cheklovi yo'qoladi.
- CI'dan Postgres service container va psql migratsiya sikli olib tashlanadi.
- Backup = D1 Time Travel (`wrangler d1 time-travel`), alohida provayder rejasi kerak emas (T10 soddalashadi).
- Migratsiyalar `wrangler d1 migrations apply` bilan (local/remote bir xil), `drizzle-kit migrate` osilishi muammosi yo'qoladi.
- Ma'lumotnoma seed'i versiyalangan migratsiya fayliga aylanadi — "seed erta chiqib ketadi" muammosi yo'qoladi.

**Yangi cheklovlar (qoidaga aylandi — `database.md`):**
- **Bitta so'rovda ≤ 100 bog'langan parametr** → ommaviy `insert().values(rows)` bo'laklarga bo'linadi
  (bir batch ichida bir nechta insert).
- **Boshlang'ich reja — Workers Free** (loyiha egasi qarori, 2026-10-02). Free'da bitta Worker chaqiruvida **≤ 50 so'rov**
  (batch ichidagi har bayonot hisobga kiradi), baza ≤ 500 MB, Time Travel 7 kun. O'lchangan yuk (2026-10-02, kod bo'yicha):
  `runFullAudit` ≈ 20 so'rov, PDF hisobot route'i ≈ 30 — sig'adi. Shuning uchun har endpoint uchun **so'rov byudjeti ≤ 40**
  qoidasi kiritildi (`database.md`), zod chegaralari eng yomon holatni shu byudjetga sig'diradi.
- **Paid'ga o'tish triggerlari** (ADR-015, oldindan emas): (1) production'da `1102 Worker exceeded resource limits` yoki CPU
  xatolari (eng ehtimolli — PDF generatsiyasi, 02 P-1); (2) biror zarur endpoint 40 so'rov byudjetiga sig'masligi;
  (3) baza 400 MB ga yaqinlashishi; (4) 7 kunlik Time Travel yetarli bo'lmasligi (birinchi haqiqiy mijoz ma'lumoti
  kelganda qayta ko'rib chiqiladi); (5) Queues/Workflows kerak bo'lishi (Faza 5/6).
- Baza ≤ 10 GB (oshirib bo'lmaydi). Dalil fayllari R2'da bo'lgani uchun YRES hajmi bundan ancha kichik
  bo'lishi kutiladi; kelajakda tashkilot bo'yicha alohida D1 bazalari varianti ochiq qoladi (ADR-001 (c)).
- Tiplar: `uuid` → `text` (ilova `crypto.randomUUID()`), `numeric` → `real` (JS'da baribir `number` edi),
  `timestamp` → `integer` (`timestamp_ms`), `boolean` → `integer` (`boolean` rejimi), `jsonb` → `text` (`json` rejimi),
  `pgEnum` → `text({ enum })` (DB darajasida CHECK yo'q — validatsiya zod'da).
- `ilike` yo'q; SQLite `LIKE`/`lower()` faqat ASCII'ni katta-kichik harfga sezgirsiz qiladi → Kirill matnli qidiruv
  uchun ilova darajasida normallashtirilgan ustun.
- Interaktiv tranzaksiya yo'q (Neon HTTP bilan bir xil) — `db.batch()` andozasi o'zgarmaydi.

**Bekor bo'ladi:** `@neondatabase/serverless`, `DATABASE_URL` siri, Neon loyihasi (cutover'dan keyin loyiha egasi o'chiradi),
`database.md` dagi Neon bo'limlari, 02 M-1/M-3 tavsiyalarining Neon qismi.
