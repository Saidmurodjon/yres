# T10 — Backup/tiklash runbook, ADR-011 va ADR-015 (faqat hujjat) + loyiha egasi ro'yxati

**Manba:** 02 M-1, ADR-011, ADR-015, P-1 · 06 §5.4. **Commit:** bitta (faqat markdown).
**Fayllar:** yangi `docs/runbooks/backup-va-tiklash.md`, yangi `docs/adr/ADR-011-backup-dr.md`,
yangi `docs/adr/ADR-015-workers-paid.md`, `docs/deployment.md` (havola), `.claude/rules/deployment.md` (bir band).

Bu topshiriqda **hech qanday tashqi tizimga ulanilmaydi** — Neon/Cloudflare sozlamalarini faqat loyiha egasi o'zgartiradi.

## Bajarish

1. `docs/runbooks/backup-va-tiklash.md` (o'zbekcha, qadam-baqadam, buyruqlar nusxalanadigan):
   - **Maqsadlar:** RPO ≤ 24 soat (PITR bilan — daqiqalar), RTO ≤ 4 soat (ADR-011).
   - **Neon PITR:** reja talabi (tarix oynasi ≥ 7 kun — Launch yoki undan yuqori), tekshirish joyi (Neon konsol →
     Project → Settings → Storage/History retention). Aniq reja nomlari va narxlarni hujjatga **yozmang** — ular
     o'zgaradi; "Neon konsolida tekshiring" deb yozing.
   - **Tiklash mashqi (choraklik):** (1) konsolda yoki `neonctl` bilan o'tmishdagi vaqt nuqtasidan yangi branch;
     (2) shu branch ulanish satri bilan **faqat o'qiydigan** tekshiruv so'rovlari (`select count(*)` asosiy
     jadvallar bo'yicha, eng so'nggi `building.updated_at`); (3) natijani shu faylning "Mashqlar jurnali" jadvaliga
     yozish (sana, kim, tiklash nuqtasi, sarflangan vaqt, muammo); (4) sinov branch'ini o'chirish.
     Production ulanish satrini **almashtirish** — faqat haqiqiy falokatda, alohida bo'lim, `wrangler secret put
     DATABASE_URL --env production` bilan.
   - **Logik dump (keyingi bosqich, hozir emas):** kunlik `pg_dump` → R2 `yres-backups` — Faza 4 (staging bilan birga);
     shu yerda "rejalashtirilgan" deb belgilang.
   - **Mashqlar jurnali** — bo'sh jadval: `| Sana | Bajaruvchi | Tiklash nuqtasi | Vaqt | Natija | Izoh |`.
2. `docs/adr/ADR-011-backup-dr.md` va `ADR-015-workers-paid.md` — qisqa ADR shakli: Kontekst · Variantlar ·
   Qaror · Oqibatlar · Holat. Matnni 02 §6 jadvalidan oling. Holat: **"Taklif — loyiha egasi tasdig'i kutilmoqda"**
   (ular K-reyestrida hali tasdiqlanmagan — "Qabul qilindi" deb yozmang). ADR-015 da: PDF generatsiyasi Free rejaning
   CPU limitidan oshishi (02 P-1), Queues/Workflows faqat Paid'da.
3. `docs/deployment.md` va `.claude/rules/deployment.md` — "Backup va tiklash: `docs/runbooks/backup-va-tiklash.md`" havolasi.

## Loyiha egasi uchun ro'yxat (PROGRESS.md ga ham ko'chiring)

Sonnet bularni **bajarmaydi**, faqat ro'yxatni qoldiradi:

- [ ] Neon: joriy reja va tarix oynasini tekshirish; kerak bo'lsa rejani ko'tarish (≥ 7 kun PITR).
- [ ] Birinchi tiklash mashqini runbook bo'yicha bajarish va jurnalga yozish (Faza 0 chiqish mezoni).
- [ ] Cloudflare: Workers rejasini tekshirish, Paid'ga o'tish (ADR-015) va ADR holatini yangilash.
- [ ] GitHub → Actions: T01 push'idan keyingi CI natijasini ko'rish; yiqilgan integratsiya testlari bo'lsa — ro'yxatini Claude'ga berish.
- [ ] T02–T04 deploy qilingach: S-1 qo'lda tekshiruvi, CSP konsol tekshiruvi (T04d), chat yuklash (T03).
- [ ] Branch strategiyasi: `main` ochilsinmi (CI `push: main` triggeri va `deploy.yml` unga bog'liq)?

## Qabul mezonlari

- [ ] Uchala yangi fayl bor, havolalar ishlaydi (nisbiy yo'llar to'g'ri).
- [ ] Hujjatlarda sir, ulanish satri, parol yo'q.
- [ ] Faqat markdown o'zgargan — type-check/build talab qilinmaydi.
