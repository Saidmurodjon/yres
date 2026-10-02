# F07 — "Keyin" holati: ochiq joy turi bo'yicha almashtirish va qobiq "keyin" muharriri

**Manba:** 01 P0-4 · X55, X81, X98 · **Commit:** bitta (dvigatel + API + UI birga — biri ikkinchisisiz foydasiz).
**Bog'liqlik:** F06 (maqsad kodlari). **Yopadi:** ochiq joylar bo'yicha G1/G3 tafovutlari (№6–№8).

## Muammo (kodda tasdiqlangan)

1. `getEffectiveOpeningType` (`envelope.service.ts:53-64`) "keyin" holatida **kategoriyadagi birinchi** keyingi turni barcha ochiq
   joylarga qo'llaydi. `opening_type.retrofit_of_id` ustuni bazada bor (`packages/db/src/schemas/envelope.ts`), lekin hech kim
   o'qimaydi va API'da `retrofitOfCode` yo'q (`apps/api/src/schemas/envelope.ts:33-45`; konstruksiyalarda bor — `:30`).
   3-DMTT: kitobda keyingi deraza turi `Win4` (`Envelope!AG98`) bor, lekin derazalar **almashtirilmaydi** (№6, `Losses env. after!F25` = 2,94);
   almashtiriladi faqat `Win2 → V4` (vitraj) va `D1 → D4` (eshiklar). Joriy dvigatel `Win4` ni barcha derazalarga qo'llardi.
2. **Web UI "keyin" qobig'ini umuman kirita olmaydi:** `envelope-editor/state.ts:6` `EDIT_SCENARIO = "before"` qattiq; UI
   `retrofitOfCode` yubormaydi (`grep retrofitOfCode apps/web/src` — bo'sh). Demak UI orqali yaratilgan binoda qobiq
   chora-tadbirlari doim 0 tejash beradi (keyin turi yo'q → `resolveHeatLossGroups` oldingi turni oladi).

## Bajarish

1. **API:** `openingTypeInputSchema` ga `retrofitOfCode` (konstruksiyalar bilan bir xil izoh va qoida), route'da konstruksiyalar
   uchun mavjud lookup andozasi (`routes/envelope.ts` ~110-150) ochiq joy turlari uchun takrorlanadi (bitta `inArray` so'rovi,
   noma'lum kod → 400). Byudjet izohini (`:80-84`) yangilang (≤ 40).
   `PUT` `scenario: "after"` payload'i faqat turlarni olib keladi (geometriya/elementlar oldingi holatniki) — route buni hozir
   qanday qiladi, tekshiring; "keyin" saqlash oldingi elementlarni o'chirmasligi integratsiya testi bilan isbotlansin.
2. **Dvigatel:** `getEffectiveOpeningType` → "keyin" holatida `retrofitOfId === oldingi tur id` bo'lgan tur, bo'lmasa **oldingi tur
   o'zi** (saqlanadi). Konstruksiyalar bilan bir xil semantika.
   Eski ma'lumot: kategoriyada keyingi turlar bor, lekin **hech biri** `retrofitOfId` ga ega emas → eski xatti-harakat (birinchi keyingi tur
   hammaga) + `warnings[]`: "keyingi ochiq joy turi qaysi turni almashtirishi ko'rsatilmagan". `retrofitOfId` li turlar bor bo'lsa —
   bog'lanmagan keyingi tur ishlatilmaydi va ogohlantirish beradi. Quyosh tushumlari (`audit.engine.ts:376-395`) shu funksiyadan
   foydalanadi — alohida o'zgartirish kerak emas, test bilan tasdiqlang.
3. **UI — qobiq "keyin" muharriri:** qobiq tab'ida "Oldin / Keyin" almashtirgich. "Keyin" rejimida geometriya (elementlar, bloklar)
   faqat o'qish uchun; konstruksiya va ochiq joy turlari ro'yxati tahrirlanadi, har bir keyingi turda majburiy "Qaysi turni almashtiradi"
   tanlovi (oldingi holat kodlari; bitta oldingi turni faqat bitta keyingi tur almashtiradi). Almashtirilmagan oldingi turlar ro'yxatda
   "saqlanadi" deb ko'rsatiladi. Saqlash — `PUT /envelope` `scenario: "after"`. `EDIT_SCENARIO` konstantasini rejim holatiga aylantiring;
   `useRegisterDirty` (rejim almashtirishda ham tasdiq — T06 andozasi), viewer uchun faqat o'qish, 375 px. i18n uz/ru/en.
4. `extract_inputs.py`: `V4.retrofitOf = Win2`, `D4.retrofitOf = D1`, `Win4` — bog'lanmagan (ishlatilmaydi, ogohlantirish kutiladi);
   konstruksiyalar: `Losses env. after` dagi kodlar ↔ oldingilari.

## Qabul mezonlari

- [ ] Unit: 2 ta deraza turi, faqat bittasi almashtiriladi → ikkinchisining U si "keyin"da o'zgarmaydi; eski ma'lumot (retrofit'siz) →
      avvalgi natija + ogohlantirish.
- [ ] Golden: `Losses env. after!G24:G28` (deraza/vitraj/eshik) va `Measures_summary!E10:E12` (№6 da D5 dan tashqari) tolerans ichida.
- [ ] Brauzerda (Preview MCP + mock API, `testing-and-verification.md`) "keyin" rejimida tur qo'shish → saqlash → hisob natijasida
      tejash paydo bo'ladi; imkon bo'lmasa PROGRESS.md da "brauzerda tekshirilmadi" + qo'lda tekshirish ro'yxati.
- [ ] type-check, build, lint, test yashil.

## Qilmang

- Har bir **alohida** ochiq joy (envelope_opening qatori) uchun keyingi tur — tur darajasi yetarli (3-DMTT ham tur bo'yicha).
- Deraza ta'mirining infiltratsiyaga ta'siri (X81, D5) — P1.
