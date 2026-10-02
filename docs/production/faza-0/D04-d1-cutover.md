# D04 — Production cutover: D1'ni yaratish, deploy, Neon'ni o'chirish, hujjatlar

**Manba:** ADR-016. **Commit:** bitta (konfiguratsiya + hujjatlar). **Bog'liqlik:** D01–D03 yashil.
**Bu topshiriqda loyiha egasi qadamlari bor** — ular belgilangan; Sonnet ularni o'zi bajarmaydi.

## A. Loyiha egasi (Sonnet buyruqlarni tayyorlab beradi, egasi ishga tushiradi)

1. `cd apps/api && npx wrangler d1 create yres-production` → chiqqan `database_id` ni Sonnet'ga beradi.
2. Reja — **Workers Free** (qaror 2026-10-02). Paid'ga o'tish faqat ADR-016 dagi triggerlardan biri yuz berganda.

## B. Sonnet

1. `wrangler.toml` `[env.production.d1_databases]` ga haqiqiy `database_id`.
2. Hujjatlar — Neon'ga oid hamma narsani D1 ga moslash (bir commit'da):
   - `.claude/rules/database.md` — **to'liq qayta yoziladi**: hozirgi faylning "D1" bo'limi asosiy matnga aylanadi,
     "Neon (eski)" bo'limi o'chiriladi.
   - `.claude/rules/realtime.md` — "Postgres — yagona haqiqat manbai", "Neon'ning HTTP drayveri DO ichidan…" → D1 binding.
   - `.claude/rules/testing-and-verification.md` — D03 da yangilanmagan qoldiqlar.
   - `.claude/rules/deployment.md` — sirlar ro'yxatidan `DATABASE_URL`; deploy tartibiga migratsiya qadami
     (`db:migrate:prod` **deploy'dan oldin**, faqat qo'shuvchi migratsiyalar — `data-integrity.md`).
   - `.claude/rules/calculation-engine.md`, `stack.md`, `CLAUDE.md`, `README.md`, `docs/deployment.md`, `docs/er-diagram.md`
     (agar Postgres tiplari ko'rsatilgan bo'lsa) — `grep -rln "Neon\|Postgres\|DATABASE_URL\|neon-http" .claude docs README.md CLAUDE.md`
     bo'yicha. `docs/production/01–06` — **tegilmaydi** (tarixiy tahlil hujjatlari); faqat 00-MASTER-PLAN K20 qatoriga "ijro etildi".
   - `.github/workflows/deploy.yml`: `db:migrate`/`db:seed` → `db:migrate:prod`. (Workflow hali ishlatilmagan — Faza 4.)

## C. Loyiha egasi — cutover (Sonnet aniq buyruqlar ro'yxatini PROGRESS.md ga yozadi)

```bash
cd apps/api
npx wrangler d1 migrations apply yres-production --remote --env production   # baseline + reference_data
npx wrangler deploy --env production
npx wrangler secret delete DATABASE_URL --env production
cd ../web && VITE_API_URL=https://yres-api.saidmurod.com bun run build \
  && npx wrangler pages deploy dist --project-name=yres-web --branch=main --commit-dirty=true
```
Keyin smoke (Free reja CPU chegarasi uchun ayniqsa **PDF yuklab olish** va **ro'yxatdan o'tish/kirish** — `1102` xatosi
chiqsa, bu Paid triggeri, `npx wrangler tail --env production` bilan tasdiqlang): ro'yxatdan o'tish (yangi akkaunt — eski test akkauntlar ko'chirilmagan), Google bilan kirish, bino yaratish,
qobiq, audit run, PDF, chat xabari (DO → D1). Hammasi ishlasa — Neon loyihasini Neon konsolida o'chirish (bir necha kun
kutib turish tavsiya etiladi, lekin u yerdagi ma'lumot test ma'lumoti).

## Qabul mezonlari

- [ ] `grep -rn "Neon\|neon-http\|DATABASE_URL\|@neondatabase" apps packages .claude CLAUDE.md README.md docs/deployment.md` —
      faqat tarixiy eslatmalar (ADR-016, PROGRESS.md) qoladi.
- [ ] PROGRESS.md: cutover buyruqlari va smoke ro'yxati; loyiha egasi bajargach "✅ production D1'da" yozuvi (keyingi sessiya).
- [ ] Type-check/build/lint yashil (konfiguratsiya o'zgargani uchun).
