# T08 — "Auditni ishga tushirish" mavjud qobiqni almashtirmasin

**Manba:** 03 §1.1 U4 · Jiddiylik: 🔴 Kritik (ma'lumot). **Commit:** bitta. **Bog'liqlik:** T06a (`ConfirmDialog`).
**Fayllar:** `routes/_authenticated/buildings/$buildingId/audit.tsx`, uz/ru/en `audit.json`.

## Muammo (kodda tasdiqlangan)

- Bino sahifasidagi asosiy CTA (`$buildingId/index.tsx` ~103, `overview.runAudit`) → `/buildings/$buildingId/audit`.
- `AuditWizardPage` (`audit.tsx` ~40–120): `useState<WizardStep>("envelope")` — har doim 1-qadamdan boshlanadi.
- `EnvelopeStep` (~263+): forma `DEFAULT_QUICK_ENVELOPE` bilan to'ldirilgan; submit →
  `replaceEnvelope.mutateAsync(buildQuickEnvelopePayload(values))` — **to'liq qobiqni soddalashtirilgan
  "tezkor" qobiq bilan almashtiradi**. `hasEnvelope` bo'lsa faqat sariq ogohlantirish matni bor
  (`wizard.envelope.replaceWarning`), standart yo'l baribir destruktiv.

## Bajarish

1. **Boshlang'ich qadam:** `envelopeLoading` tugagach bir marta aniqlansin — `hasEnvelope ? "consumption" : "envelope"`.
   (`useState` initial qiymati yuklanishdan oldin hisoblanadi — `useEffect` bilan bir martalik o'rnatish yoki
   yuklanish tugaguncha skeleton; mavjud `envelopeLoading` skeleton'idan foydalaning.)
2. **`EnvelopeStep`, `hasEnvelope === true`:** tezkor formani darhol ko'rsatmang. O'rniga karta:
   - sarlavha "Qobiq allaqachon kiritilgan", qisqa xulosa (elementlar soni — `envelopeData.envelopeElements.length`,
     bloklar soni bo'lsa) va havola "Qobiqni tahrirlash" → bino sahifasining qobiq tab'i;
   - **asosiy** tugma: "Mavjud qobiq bilan davom etish" → `onDone()`;
   - **ikkilamchi**, `variant="outline"` (yoki ghost) tugma: "Tezkor qobiq bilan almashtirish…" → formani ochadi;
   - formadagi submit `hasEnvelope` bo'lsa avval `ConfirmDialog` (`destructive`): "Mavjud qobiq (N element)
     o'chiriladi va tezkor qobiq bilan almashtiriladi. Buni qaytarib bo'lmaydi." Faqat tasdiqdan keyin `replaceEnvelope`.
3. **`hasEnvelope === false`:** joriy xatti-harakat o'zgarmaydi (tezkor qobiq — bo'sh bino uchun foydali).
4. Stepper'dagi raqamli tugmalar (`onClick={() => setStep(s.id)}`) — o'zgarishsiz qoladi.
5. i18n: yangi kalitlar uz/ru/en `audit.json` da (`wizard.envelope.existingTitle`, `existingSummary` — i18next ko'plik
   bilan, `continueWithExisting`, `replaceWithQuick`, `confirmReplaceTitle`, `confirmReplaceDescription`, `confirmReplace`).
   Eski `replaceWarning` kaliti endi ishlatilmasa — olib tashlang (uchala tildan).

## Qabul mezonlari

- [ ] Qobig'i bor bino → "Auditni ishga tushirish" → ustoz **2-qadamdan** (iste'mol) boshlanadi.
- [ ] 1-qadamga qaytilsa — xulosa kartasi, asosiy tugma qobiqni o'zgartirmaydi.
- [ ] Almashtirish faqat ikki marta ochiq harakat + tasdiqdan keyin.
- [ ] Qobig'i yo'q bino → avvalgidek tezkor forma.
- [ ] `bun run build`, type-check, lint yashil; mobil (< 640 px) va `sm+` da karta tugmalari sig'adi.

## Qilmang

- Ustozni olib tashlash yoki "Hisoblash"ni to'liqlik paneliga ko'chirish — Faza 3 (bosqichli ish maydoni).
