# Backup va tiklash (Cloudflare D1 Time Travel)

Manba: ADR-011, ADR-016, `docs/production/02-arxitektura-va-texnologiyalar.md` M-1. Baza — D1 (`yres-production`).
Bu hujjatdagi buyruqlarni **faqat loyiha egasi** ishga tushiradi (`.claude/rules/deployment.md`, `database.md`).
Barcha buyruqlar `apps/api/` papkasidan (`wrangler.toml` shu yerda).

## Maqsadlar

- **RPO ≤ 24 soat** (Time Travel bilan amalda — daqiqalar), **RTO ≤ 4 soat** (ADR-011).

## D1 Time Travel

- Saqlash muddati reja bo'yicha: **Free — 7 kun**, Paid — 30 kun (Cloudflare limitlar sahifasi, 2026-10-02 holati; qayta tekshiring).
- Hozirgi holat va bookmark'ni ko'rish (o'qish, xavfsiz):

```bash
npx wrangler d1 time-travel info yres-production --env production
```

## Choraklik tiklash mashqi (production'ga tegmasdan)

1. Logik nusxa:
   ```bash
   npx wrangler d1 export yres-production --remote --env production --output=backup-<SANA>.sql
   ```
2. Sinov bazasi yaratish va nusxani yuklash:
   ```bash
   npx wrangler d1 create yres-restore-drill
   npx wrangler d1 execute yres-restore-drill --remote --file=backup-<SANA>.sql
   ```
3. Faqat o'qiydigan tekshiruvlar (`npx wrangler d1 execute yres-restore-drill --remote --command "..."`):
   asosiy jadvallar bo'yicha `select count(*) from building;` (`user`, `audit_run`, `utility_bill` ham), va
   `select max(updated_at) from building;` — eng so'nggi yozuv kutilgan vaqtga yaqinmi.
4. Natijani pastdagi "Mashqlar jurnali"ga yozing (qancha vaqt ketdi — RTO bahosi).
5. Sinov bazasini o'chiring: `npx wrangler d1 delete yres-restore-drill`; `backup-<SANA>.sql` faylini xavfsiz joyga
   olib qo'ying yoki o'chiring (ichida shaxsiy ma'lumot bor — commit qilmang).

## Haqiqiy falokatda: Time Travel restore (joyida orqaga qaytarish)

> **Xavfli:** production bazani tanlangan vaqtga **joyida** qaytaradi, shu vaqtdan keyingi yozuvlar yo'qoladi.
> Faqat haqiqiy falokatda va loyiha egasi qarori bilan. Mashq sifatida production'da bajarilmaydi.

1. `info` bilan joriy bookmark'ni yozib oling (xato bo'lsa qaytish nuqtasi shu):
   `npx wrangler d1 time-travel info yres-production --env production`
2. Tiklash vaqtini aniqlang (UTC, falokatdan oldingi):
   ```bash
   npx wrangler d1 time-travel restore yres-production --env production --timestamp=<UNIX-yoki-ISO-vaqt>
   ```
   (yoki `--bookmark=<id>`). Buyruq oldingi bookmark'ni chiqaradi — saqlang.
3. Tekshiring: yuqoridagi `select count(*)` so'rovlari, ilovaga kirish, bitta binoni ochish.

## Yumshoq o'chirilgan binoni tiklash (A03)

`DELETE /buildings/:id` binoni qattiq o'chirmaydi — `deleted_at`ni belgilaydi (bola qatorlar, `audit_event`, kelgusi
snapshot'lar tegilmaydi). Foydalanuvchi "binomni qaytarib bering" deb murojaat qilsa, Web UI'da tiklash tugmasi yo'q
(ataylab, Faza 3/4) — faqat bino egasi nomidan, loyiha egasi/qo'llab-quvvatlash to'g'ridan-to'g'ri API'ga so'rov yuboradi
(egasining sessiya cookie'si/token'i bilan):

```bash
curl -X POST https://yres-api.saidmurod.com/api/buildings/<BUILDING_ID>/restore \
  -H "Cookie: <egasining sessiya cookie'si>"
```

Muvaffaqiyatli bo'lsa `200` + tiklangan `building` qatori; allaqachon o'chirilmagan bo'lsa `409`; begona foydalanuvchi
nomidan yoki mavjud bo'lmagan id bilan `404`.

## Rejalashtirilgan (hozir emas)

- Kunlik `wrangler d1 export` → R2 `yres-backups` (cron) — Faza 4. Time Travel muddatidan uzoq saqlash kerak bo'lsa
  (WB: hisobotlar ≥ 5–10 yil) — ular R2'da snapshot sifatida (Faza 2).

## Mashqlar jurnali

| Sana | Bajaruvchi | Tiklash nuqtasi | Vaqt | Natija | Izoh |
|---|---|---|---|---|---|
|  |  |  |  |  |  |
