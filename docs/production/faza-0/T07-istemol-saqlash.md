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
   export const bulkReplaceUtilityBillsSchema = z.object({
     groups: z.array(replaceUtilityBillsSchema).min(1).max(60), // 5 tashuvchi × 12 yil
   }).refine(
     (v) => new Set(v.groups.map((g) => `${g.energyCarrier}:${g.year}`)).size === v.groups.length,
     { message: "Duplicate (energyCarrier, year) group" },
   );
   ```
   (T04c chegaralari — `year` diapazoni, `.finite().nonnegative()` — `replaceUtilityBillsSchema` orqali avtomatik keladi.)
2. Route `PUT /:id/consumption/bulk` — mavjud `PUT /:id/consumption` bilan bir xil authz (`findAccessibleBuilding` +
   `canWrite`, 404/403 matnlari bir xil). Har guruh uchun bitta `delete(...).where(building+carrier+year)` va (qatorlar
   bo'lsa) `insertChunked(...)` (D02 — D1'da 100 parametr/so'rov limiti; 60 guruh × 12 oy bitta insert'ga sig'maydi);
   **hammasi bitta `db.batch()`** (`database.md` andozasi). Batch hajmi: 60 guruh → ≤ 60 delete + bo'laklangan insert'lar —
   1 000 so'rov/chaqiruv limitidan ancha past. `withDerivedFields` — mavjud
   yordamchi, qayta ishlating. Javob: `{ groups: [{ energyCarrier, year, count }] }`.
   Izohda: nega bitta batch (yarim saqlangan import bo'lmasin) va mavjud bitta-guruhli PUT nega qoladi (orqaga moslik).
3. Integratsiya testlari: (a) 2 yil × 2 tashuvchi saqlanadi; (b) `bills: []` guruhi eski qatorlarni o'chiradi;
   (c) dublikat guruh → 400; (d) viewer → 403; (e) begona → 404.
4. Frontend API: `api.consumption.bulkReplace(buildingId, groups)` va `useBulkReplaceConsumption(buildingId)` —
   muvaffaqiyatda `["buildings", buildingId, "consumption"]` (mavjud kalitni `use-consumption.ts` dan oling) invalidatsiya.

---

## T07b — frontend: "Barcha o'zgarishlarni saqlash"

**Fayl:** `components/building-detail/consumption-tab.tsx` (+ uz/ru/en `consumption.json`).

1. **Dastlabki holatni eslab qolish:** server ma'lumotidan qurilgan grid'ni (`initialized` bo'lgan paytdagi)
   `baselineByYear` ref'ida saqlang. Har `(yil, tashuvchi)` uchun "iflos" = joriy grid baseline'dan farq qiladi.
2. **Guruh qurish** — `buildBillGroupsForYear` o'rniga `buildDirtyGroups(gridsByYear, baselineByYear, locale)`:
   - faqat iflos `(yil, tashuvchi)` juftliklari;
   - barcha oylari bo'sh bo'lsa ham guruh **yuboriladi** (`bills: []`) — agar baseline'da qiymat bo'lgan bo'lsa
     (U5 tuzatishi);
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
