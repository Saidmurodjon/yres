# T07 — Iste'mol: bo'sh tashuvchi o'chirilsin, ko'p yil atomik saqlansin (2 commit: T07a, T07b)

**Manba:** 03 §1.1 U5, U6 · Jiddiylik: 🔴 Kritik (ma'lumot). **Bog'liqlik:** T05 (parse), T06a (dirty konteksti).

## Muammolar (kodda tasdiqlangan)

- **U5** — `components/building-detail/consumption-tab.tsx` `buildBillGroupsForYear()` (~86–103): tashuvchining
  barcha oylari bo'shatilsa, `bills.length === 0` → guruh **yuborilmaydi** → serverdagi eski qatorlar qoladi.
  Backend tayyor: `PUT /:id/consumption` (`apps/api/src/routes/consumption.ts` ~101–148) `bills: []` bilan
  kelsa delete'ni bajaradi va insert'ni o'tkazib yuboradi.
- **U6** — `handleSaveActiveYear()` (~203–220): faqat **faol yil** saqlanadi, tashuvchilar bo'yicha ketma-ket
  alohida so'rovlar (atomik emas — o'rtada xato bo'lsa yarmi saqlanadi). Excel import (~222+) 3 yilni
  `gridsByYear` ga yuklaydi — foydalanuvchi "import qilindi = saqlandi" deb o'ylaydi, boshqa yillar sahifadan
  chiqqanda yo'qoladi.

---

## T07a — backend: bitta so'rovda ko'p yil/ko'p tashuvchini atomik almashtirish

**Fayllar:** `apps/api/src/schemas/consumption.ts`, `apps/api/src/routes/consumption.ts`,
`apps/web/src/lib/api.ts`, `apps/web/src/lib/api-types.ts` (agar tur shu yerda bo'lsa), `apps/web/src/hooks/use-consumption.ts`,
`apps/api/tests/integration/measures-consumption.test.ts`.

1. Sxema:
   ```ts
   // Free reja so'rov byudjeti (database.md, ≤ 40): yil bo'yicha to'liq almashtirish — 1 delete
   // + ceil(300 qator / 11 qator-bo'lak) = 28 insert ≈ 29 bayonot (+ auth/access ≈ 4).
   export const bulkReplaceUtilityBillsSchema = z.object({
     years: z.array(z.object({
       year: z.number().int().min(1990).max(2100),
       carriers: z.array(z.object({
         energyCarrier: z.enum(ENERGY_CARRIERS),
         bills: z.array(monthlyBillInputSchema).max(12),
       })).max(5),
     })).min(1).max(5),
   }).refine(/* yillar va har yil ichida tashuvchilar takrorlanmasin */);
   ```
   (T04c chegaralari — `year` diapazoni, `.finite().nonnegative()` — `replaceUtilityBillsSchema` orqali avtomatik keladi.)
2. Route `PUT /:id/consumption/bulk` — mavjud `PUT /:id/consumption` bilan bir xil authz (`findAccessibleBuilding` +
   `canWrite`, 404/403 matnlari bir xil). **Yil bo'yicha to'liq almashtirish:** bitta
   `delete(utilityBill).where(and(eq(buildingId), inArray(year, years)))` + barcha yuborilgan qatorlar uchun
   `insertChunked(...)`; **hammasi bitta `db.batch()`**. Bu tashuvchi-yil juftligi bo'yicha alohida delete'lardan (60 tagacha
   bayonot — Free rejaning 50 chegarasidan oshadi) ko'ra byudjetga sig'adi. Shartnoma: yuborilgan yilda **yuborilmagan
   tashuvchining** qatorlari ham o'chadi — shuning uchun frontend iflos yilning **barcha** tashuvchilarini (bo'shlarini ham)
   yuboradi. Buni route izohida aniq yozing. `withDerivedFields` — mavjud
   yordamchi, qayta ishlating. Javob: `{ groups: [{ energyCarrier, year, count }] }`.
   Izohda: nega bitta batch (yarim saqlangan import bo'lmasin) va mavjud bitta-guruhli PUT nega qoladi (orqaga moslik).
3. Integratsiya testlari: (a) 2 yil × 2 tashuvchi saqlanadi; (b) `bills: []` guruhi eski qatorlarni o'chiradi;
   (c) takroriy yil yoki tashuvchi → 400; (c2) yuborilgan yilning yuborilmagan tashuvchisi o'chadi; (c3) 5 yil × 5 tashuvchi × 12 oy — eng yomon holat lokal D1'da o'tadi (so'rov byudjeti); (d) viewer → 403; (e) begona → 404.
4. Frontend API: `api.consumption.bulkReplace(buildingId, groups)` va `useBulkReplaceConsumption(buildingId)` —
   muvaffaqiyatda `["buildings", buildingId, "consumption"]` (mavjud kalitni `use-consumption.ts` dan oling) invalidatsiya.

---

## T07b — frontend: "Barcha o'zgarishlarni saqlash"

**Fayl:** `components/building-detail/consumption-tab.tsx` (+ uz/ru/en `consumption.json`).

1. **Dastlabki holatni eslab qolish:** server ma'lumotidan qurilgan grid'ni (`initialized` bo'lgan paytdagi)
   `baselineByYear` ref'ida saqlang. Har `(yil, tashuvchi)` uchun "iflos" = joriy grid baseline'dan farq qiladi.
2. **Guruh qurish** — `buildBillGroupsForYear` o'rniga `buildDirtyGroups(gridsByYear, baselineByYear, locale)`:
   - faqat iflos **yillar**, lekin har iflos yilning **barcha 5 tashuvchisi** (T07a shartnomasi — yil to'liq almashtiriladi);
   - bo'shatilgan tashuvchi `bills: []` bilan ketadi va serverda o'chadi (U5 tuzatishi);
   - bir so'rovda ≤ 5 yil (sxema chegarasi); undan ko'p iflos yil bo'lsa — kamdan-kam holat, foydalanuvchiga
     "avval N yilni saqlang" xabari (bir necha so'rovga jimgina bo'lish taqiqlangan — atomiklik buziladi);
   - katak `parseLocaleNumber` (T05) bilan; `invalid` katak → saqlash to'xtaydi, katak qizil chegara
     (`aria-invalid`), xato xabarida yil/tashuvchi/oy ko'rsatiladi. **Hech qachon jimgina tashlanmaydi.**
   - `tariffLocal` ham xuddi shu qoida bilan.
3. **Saqlash tugmasi:** "{{year}} yilni saqlash" → "O'zgarishlarni saqlash ({{count}})" (`count` = iflos guruhlar soni,
   i18next ko'plik shakllari — ruscha `_one/_few/_many`). Bitta `bulkReplace` chaqiruvi. Muvaffaqiyatda baseline =
   joriy holat. Xatoda — grid o'zgarmaydi, xato ko'rsatiladi (ma'lumot tashlanmaydi).
4. **Yil tab'larida indikator:** iflos guruhi bor yil yonida nuqta (`●`) + `aria-label` ("saqlanmagan o'zgarishlar").
   Holatni faqat rang bilan bildirmang (03 §6.1).
5. **Import'dan keyin:** xabar "N yil import qilindi — hali saqlanmagan. «O'zgarishlarni saqlash»ni bosing."
   (mavjud `excel.importedSummary` kalitini kengaytiring yoki yangisini qo'shing).
6. **Dirty-himoya:** `useRegisterDirty("consumption", hasDirtyGroups)` (T06b dagi vaqtinchalik ulanishni shu bilan almashtiring).

## Qabul mezonlari

- [ ] Excel'dan 3 yil import → bitta tugma → 3 yil ham saqlanadi (sahifani yangilab tekshirish).
- [ ] Gaz qatorining barcha oylarini tozalash → saqlash → sahifani yangilash → gaz qatorlari **yo'q**.
- [ ] `12abc` katak → saqlash bloklanadi, xato aniq katakni ko'rsatadi; boshqa kataklar saqlanmaydi (atomik).
- [ ] Toza holatda tugma disabled (yoki `count = 0`).
- [ ] Integratsiya testlari lokal D1'da yashil; type-check/lint/build yashil.
