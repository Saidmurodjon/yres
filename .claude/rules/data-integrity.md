# Ma'lumotlar yaxlitligi, audit trail va snapshot

Manba: `docs/production/02-arxitektura-va-texnologiyalar.md` §2.5–2.6, §5.2; `00-MASTER-PLAN.md` §4 (metodika 5-qoida).

## Hozir amal qiladi

- **Atomiklik faqat `db.batch()`** (`database.md`): bitta foydalanuvchi amalining barcha yozuvlari bitta batch'da.
  Frontend'dan ketma-ket bir nechta mutatsiya bilan "bitta amal"ni yasamang — backend'da bitta endpoint qiling.
- **Migratsiya expand→contract:** `DROP COLUMN`, ustun nomini o'zgartirish, enum qiymatini olib tashlash,
  default'siz `NOT NULL` — bitta relizda taqiqlangan; kamida ikki deploy'ga bo'linadi (06 §5.5).
- **CI barcha migratsiyalarni `ON_ERROR_STOP=1` bilan qo'llaydi**; yangi migratsiya psql'da toza o'tishi shart.
- **Test yordamchilari faqat lokal bazaga** — `test-db.ts` dagi host himoyasini olib tashlamang/chetlab o'tmang.
- **Natija keshlanmaydi** (`calculation-engine.md`) — draft ko'rinish har safar qayta hisoblanadi. Snapshot kelguncha
  hisobot ham shunday; buni "tuzatish" uchun vaqtinchalik kesh qo'shmang.

## Faza 2 dan amal qiladi (ADR-004 — hozir qurmang)

- **Snapshot'lar immutable**: `audit_snapshot` (`inputs_json`, `result_json`, `engine_version`, `inputs_hash`,
  `status: draft→submitted→approved→superseded`) va unga bog'langan R2 obyektlari hech qachon UPDATE/ustidan
  yozilmaydi; tuzatish = yangi snapshot + eskisi `superseded`. Rasmiy hisobot faqat snapshot'dan.
- **Snapshot hisobga ta'sir qiluvchi barcha tashqi qiymatlarni muzlatadi**: tariflar, kurs, diskont/o'sish,
  iqlim normallari, `ENGINE_VERSION`. Dvigatelga yangi global kirish qo'shilsa — `inputs_json` ga ham.
- **`ENGINE_VERSION`** natijani o'zgartiruvchi har commit'da oshiriladi.
- **`audit_event`** (append-only) har mutatsiya bilan **bir batch ichida**; batch'dan tashqari audit yozuvi taqiqlanadi.
- **Soft-delete** (`deleted_at`) biznes jadvallari uchun; snapshot/hujjatlarga kaskad o'chirish yo'q.
- **Konkurent tahrir:** "qatorlarni almashtirish" endpoint'lari `expectedRevision` qabul qiladi, farqda 409.
- **Data migration** — `packages/db/data-migrations/` da idempotent fayl, qo'lda SQL emas.
