# T10 — Backup/tiklash runbook (D1 Time Travel), ADR-011 va ADR-015 (faqat hujjat) + loyiha egasi ro'yxati

**Manba:** 02 M-1, ADR-011, ADR-015, P-1 · 06 §5.4. **Commit:** bitta (faqat markdown).
**Fayllar:** yangi `docs/runbooks/backup-va-tiklash.md`, yangi `docs/adr/ADR-011-backup-dr.md`,
yangi `docs/adr/ADR-015-workers-paid.md`, `docs/deployment.md` (havola), `.claude/rules/deployment.md` (bir band).

Bu topshiriqda **hech qanday tashqi tizimga ulanilmaydi** — Cloudflare sozlamalarini faqat loyiha egasi o'zgartiradi.

> K20/ADR-016: baza endi D1. Backup = **D1 Time Travel** (Workers Paid: 30 kun, Free: 7 kun — rasmiy limitlar sahifasi,
> 2026-10-02 holati). Neon PITR, `neonctl` va Neon reja bo'limlari **kerak emas**.

## Bajarish

1. `docs/runbooks/backup-va-tiklash.md` (o'zbekcha, qadam-baqadam, buyruqlar nusxalanadigan):
   - **Maqsadlar:** RPO ≤ 24 soat (Time Travel bilan — daqiqalar), RTO ≤ 4 soat (ADR-011).
   - **D1 Time Travel:** retention reja bo'yicha (hozir Free — **7 kun**; Paid — 30 kun). Holatni ko'rish:
     `npx wrangler d1 time-travel info yres-production --env production`.
   - **Tiklash mashqi (choraklik) — production'ga tegmasdan:** (1) `wrangler d1 export yres-production --remote --env production
     --output=backup-<sana>.sql` (logik nusxa); (2) yangi sinov bazasi `wrangler d1 create yres-restore-drill` va unga
     `wrangler d1 execute yres-restore-drill --remote --file=backup-<sana>.sql`; (3) faqat o'qiydigan tekshiruvlar (`select count(*)`
     asosiy jadvallar, eng so'nggi `building.updated_at`); (4) "Mashqlar jurnali"ga yozish; (5) sinov bazasini o'chirish.
     Time Travel **restore** (`wrangler d1 time-travel restore … --timestamp=…`) bazani joyida orqaga qaytaradi — faqat haqiqiy
     falokatda, alohida bo'lim, loyiha egasi qarori bilan; buyruq oldin `info` bilan bookmark'ni ko'rsatadi.
   - **Kunlik eksport (keyingi bosqich, hozir emas):** `wrangler d1 export` → R2 `yres-backups` cron orqali — Faza 4; Time Travel
     30 kundan uzoq saqlash kerak bo'lsa (WB: ≥ 5–10 yil hisobotlar — ular R2'da snapshot sifatida, Faza 2). "Rejalashtirilgan" deb belgilang.
   - **Mashqlar jurnali** — bo'sh jadval: `| Sana | Bajaruvchi | Tiklash nuqtasi | Vaqt | Natija | Izoh |`.
2. `docs/adr/ADR-011-backup-dr.md` va `ADR-015-workers-paid.md` — qisqa ADR shakli: Kontekst · Variantlar ·
   Qaror · Oqibatlar · Holat. Matnni 02 §6 jadvalidan oling. Holat: **"Taklif — loyiha egasi tasdig'i kutilmoqda"**
   (ular K-reyestrida hali tasdiqlanmagan — "Qabul qilindi" deb yozmang). ADR-015 da: PDF generatsiyasi Free rejaning
   CPU limitidan oshishi (02 P-1), Queues/Workflows faqat Paid'da, D1 Free'da 50 so'rov/chaqiruv va 500 MB/baza. **Holat:**
   "Kechiktirilgan — Free bilan boshlanadi (loyiha egasi, 2026-10-02); o'tish ADR-016 dagi triggerlar bo'yicha".
   ADR-011 da: RPO/RTO va Time Travel + eksport. ADR-016 — allaqachon yozilgan (`docs/adr/ADR-016-cloudflare-d1.md`), unga havola qiling.
3. `docs/deployment.md` va `.claude/rules/deployment.md` — "Backup va tiklash: `docs/runbooks/backup-va-tiklash.md`" havolasi.

## Loyiha egasi uchun ro'yxat (PROGRESS.md ga ham ko'chiring)

Sonnet bularni **bajarmaydi**, faqat ro'yxatni qoldiradi:

- [ ] Birinchi tiklash mashqini runbook bo'yicha bajarish va jurnalga yozish (Faza 0 chiqish mezoni).
- [ ] Cloudflare: hozir Free. Paid'ga o'tish faqat ADR-016 triggerlari bo'yicha (`1102`/CPU xatolari, 40-so'rov byudjeti, 400 MB, Time Travel).
- [ ] GitHub → Actions: T01 push'idan keyingi CI natijasini ko'rish; yiqilgan integratsiya testlari bo'lsa — ro'yxatini Claude'ga berish.
- [ ] T02–T04 deploy qilingach: S-1 qo'lda tekshiruvi, CSP konsol tekshiruvi (T04d), chat yuklash (T03).
- [ ] Branch strategiyasi: `main` ochilsinmi (CI `push: main` triggeri va `deploy.yml` unga bog'liq)?

## Qabul mezonlari

- [ ] Uchala yangi fayl bor, havolalar ishlaydi (nisbiy yo'llar to'g'ri).
- [ ] Hujjatlarda sir, ulanish satri, parol yo'q.
- [ ] Faqat markdown o'zgargan — type-check/build talab qilinmaydi.
