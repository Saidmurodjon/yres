# A07 — Verify: snapshot holati, dvigatel versiyasi, SHA-256; PDF faylni brauzerda tekshirish

**Manba:** 05 §2.2 Q2, §5.2 (verify bandi), R7; 06 §1 (`/verify` UUID bo'lmagan id → 404) · **Commit:** bitta · **Qachon:** hozir
**Bog'liqlik:** A04–A06.

## Maqsad

QR'ni skanerlagan (bank) shaxs ko'radi: hisobot qaysi binoga tegishli, hozir **amaldami yoki almashtirilganmi**, qaysi dvigatel/metodika
versiyasi, PDF hash'i — va qo'lidagi faylni yuklamasdan, brauzerning o'zida hash bilan solishtiradi. Raqamlar oshkor qilinmaydi.

## Hozirgi holat

- API `GET /api/verify/:auditRunId` (`apps/api/src/routes/verify.ts:21-45`, ulanishi `src/index.ts:145`) — faqat `audit_run.status ===
  "completed"` + bino nomi + sana; mazmunni tasdiqlamaydi (05 Q2).
- Web `apps/web/src/routes/verify.$auditRunId.tsx` (67 qator, `_authenticated` dan tashqarida), hook `useVerifyAuditRun`
  (`hooks/use-audit.ts:58-66`), `api.verify` (`lib/api.ts:445-449`), tarjima `i18n/locales/{uz,ru,en}/verify.json`.
- Allaqachon tarqatilgan PDF'larda QR `/verify/{auditRunId}` ga ishora qiladi — bu havolalar ishlashda davom etishi kerak.

## Bajarish

1. **API** `verify.ts` ga `GET /s/:snapshotId` (ommaviy, `authMiddleware` siz — mavjud andoza):
   - `snapshotId` `z.string().uuid()` emas → `404 { valid: false }`; snapshot yo'q yoki `status = 'draft'` → `404` (qoralama rasmiy emas).
   - Javob (oq ro'yxat, boshqa maydon yo'q): `{ valid: true, buildingName, status, generatedAt, submittedAt, approvedAt, supersededAt,
     engineVersion, methodologyVersion, inputsSha256, reports: [{ lang, sha256, sizeBytes, createdAt }] }`.
     Joylashuv, koordinata, moliya, natija raqamlari, foydalanuvchi ismlari/email — **yo'q** (`security.md`, 06 V8).
   - Bino `deleted_at` bo'lsa ham javob beradi (A03 §7) — join'ga filtr qo'shilmaydi.
   - `Cache-Control: no-store` (holat o'zgarishi mumkin).
   - Byudjet: 2–3 so'rov (snapshot+bino join, hisobotlar).
2. **Eski route** `GET /:auditRunId`: javobga `legacy: true` qo'shiladi, xatti-harakat o'zgarmaydi; UUID bo'lmagan id → `404`.
3. **Web** `apps/web/src/routes/verify.s.$snapshotId.tsx` (URL `/verify/s/$snapshotId`, ommaviy), hook `useVerifySnapshot`, `api.verifySnapshot`:
   - Holat belgisi **belgi + matn** bilan (faqat rang emas, `forms-and-numbers.md`): `approved` — "Amalda (tasdiqlangan, sana)";
     `submitted` — "Ko'rib chiqilmoqda, hali tasdiqlanmagan"; `superseded` — "Yangi versiya bilan almashtirilgan (sana)".
   - Versiya: `engineVersion`, `methodologyVersion`, hisoblangan sana; har til uchun SHA-256 (birinchi 16 belgi + "nusxalash" tugmasi).
   - **Fayl tekshiruvi:** `<input type="file" accept="application/pdf">` → `crypto.subtle.digest("SHA-256", await file.arrayBuffer())` →
     `reports[].sha256` bilan solishtirish → "Fayl ushbu hisobotga mos (til: …)" yoki "Mos emas — fayl o'zgartirilgan yoki boshqa versiya".
     Matnda aniq: "Fayl serverga yuborilmaydi". 50 MB dan katta fayl — xato matni, hisoblanmaydi.
   - Eski sahifa (`verify.$auditRunId.tsx`): `legacy` bo'lsa ogohlantirish "Eski formatdagi hisobot: platformada yaratilgani tasdiqlanadi,
     raqamlari tasdiqlanmaydi".
   - 375 px'da gorizontal scroll yo'q (uzun hash `break-all`), yuklanish/xato/404 holatlari; uz/ru/en (`verify` namespace).
4. CSP: `apps/web/public/_headers` o'zgarmaydi (inline skript yo'q); `crypto.subtle` faqat HTTPS/localhost — ikkalasi ham shunday.

## Qabul mezonlari

- [ ] Integratsiya (`tests/integration/verify.test.ts`): approved/submitted/superseded → to'g'ri `status`; draft, mavjud bo'lmagan, `not-a-uuid`
      → 404; javob kalitlari aynan oq ro'yxat (moliya/manzil yo'qligi assert); o'chirilgan bino snapshot'i → 200; eski route `legacy: true`.
- [ ] Web: haqiqiy PDF faylni tanlash → "mos"; bitta baytni o'zgartirilgan nusxa → "mos emas" (Preview MCP + mock API, yoki
      "brauzerda tekshirilmadi" + qo'lda ro'yxat PROGRESS.md da).
- [ ] `bun run build` — yangi route `routeTree` ga tushgan.

## Tekshiruvlar

type-check, lint, `bun run --cwd apps/api test`, `bun run build`.

## Qilmang

- Faylni serverga yuklab tekshirish. Rate-limit/CAPTCHA (keyinroq, S-3). Verify javobida natija raqamlari ("tejash X kWh").
