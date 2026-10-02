# F04 — Generatsiya `(Q+Qd)/η` (X33), taqsimot samaradorligi (ISI, sovutish), yillik ish soatlari

**Manba:** 01 §1.3 M1, §2.2, P0-1 · X33 · **Commit:** bitta. **Bog'liqlik:** F03 (golden yashil).
**Yopadi:** X33 qismi (06 §2.5 da alohida D-raqami yo'q — F03b da u qaysi ID olgan bo'lsa), D10.

## Kitobdagi formula (tekshirilgan)

`Overall gener. & distrib. eff.`:
- `H7 = IFERROR((D7+F7)/G7, 0)` — oldin, gaz qozon η = 0,58: (251 383,25 + 36 772,8)/0,58 = **496 820,78** kWh.
- `N7 = IFERROR((J7+L7)/M7, 0)` — keyin, issiqlik nasosi COP `M7 = IHS!D34` = 3,1109: **11 708,07** kWh (musbat!).
- `F11 = D11·(1 − 0,98·0,85)`, `H11 = (D11+F11)/G11` — ISI elektr isitgich, quvursiz taqsimot yo'qotishi.
- `F15 = D15·(1 − 96 %)`, `H15 = (D15+F15)/G15` (G15 = SEER 3,2) — sovutish.
- Hozirgi kod: `generation.service.ts:22-31` `(Q+Qd)(1−η)+Qd+Q` = `(Q+Qd)(2−η)` → gaz qozonda 17 % kam,
  COP 3,11 da **manfiy**; `cooling.service.ts` `load/SEER` (taqsimot yo'qotishisiz).

## Bajarish

1. `calculateFinalEnergyConsumptionKwh(Q, Qd, η)` → `(Q + Qd) / η`. `η` — qozon samaradorligi **yoki** COP/SCOP
   (bir xil formula). `η <= 0` yoki chekli emas → `RangeError` (zod `systems.ts:61` allaqachon `positive()` — bu faqat
   himoya). JSDoc'dagi "kept as-is for parity" izohini olib tashlang, v7.20 manbasini yozing (`Overall…!H7`).
2. **Quvursiz taqsimot yo'qotishi (ISI/sovutish):** v7.20 ikkala joyda ham `yo'qotish = ehtiyoj × (1 − η_taqs)`.
   - `generation_source.distribution_efficiency` (real, nullable) — faqat shu end-use uchun quvur segmentlari
     (`distribution_system`) **bo'lmasa** qo'llanadi; bo'lsa — mavjud quvur hisobi (ikkalasi birga emas — qo'sh hisob).
     ISI uchun 3-DMTT qiymati `0,98·0,85 = 0,833`.
   - `cooling_system.distribution_efficiency` (real, NOT NULL, **default 1**) — v7.20 dagidek:
     `F = load·(1 − η_taqs)`, `electrical = (load + F)/SEER`. 3-DMTT: 0,96.
   - Default qiymatlar mavjud binolar natijasini o'zgartirmaydi (null/1 = yo'qotish yo'q) — migratsiya faqat qo'shuvchi.
3. Zod (`apps/api/src/schemas/systems.ts`): ikkala maydon `z.number().finite().gt(0).max(1)`, generation'da `.nullable().optional()`.
   Tizimlar UI (`NumberInput`, `forms-and-numbers.md`) — maydonni mavjud generatsiya/sovutish kartalariga qo'shing
   (yorliq: "Taqsimot samaradorligi (quvursiz)", ixtiyoriy). i18n uz/ru/en.
4. `CoolingResult`/`GenerationSourceResult` ga taqsimot yo'qotishi allaqachon bor maydonlarda ko'rinsin
   (`distributionLossKwh`); cooling uchun yangi `distributionLossKwh` maydoni + `hisobot.md` jadvaliga qator.
5. **Yillik ish soatlari (M5, X53 — F03b golden'da topildi):** v7.20 yoritish soatlari `Lighting!J8 = Building_data!D19 × D14`
   = 250 kun × 10 soat = **2 500** soat/yil; dvigatel `operationHoursPerDay × heatingSeasonDurationDays` = 1 630 ni ishlatadi
   (`audit.engine.ts` yoritish chaqiruvi). Dvigatelning oldingi yoritish natijasi aynan 1 630/2 500 nisbatda kam (17 045 vs 26 143).
   `building.working_days_per_year` (integer, nullable; null → eski xatti-harakat + `warnings[]`), zod `1..366`, bino formasida
   `NumberInput`. Yoritish soatlari = ish kunlari × kunlik ish soati. Uskunalar o'z soatlarini qatordan oladi — tegmang.
   Golden: `Lighting!L11`, `L16`, `L17`, `Measures_summary!E20`.
6. `extract_inputs.py` — barcha yangi maydonlarni to'ldiradi; `inputs.json` qayta chiqariladi.
7. Unit testlar (`generation.service.test.ts`, `cooling.service.test.ts`): gaz qozon 0,58 → 496 820,78; COP 3,1109 →
   11 708,07 (musbat); `η = 0` → `RangeError`; sovutish 63 437,52 → 20 617,19.

## Golden kutilmasi

`Overall gener. & distrib. eff.!H7, N7, H8, N8, H11, N11, H15, N15` tolerans ichiga kiradi (qolgan farq faqat yuqoridagi
kirishlardan — `D7`/`J7` gains va `F7`/`L7` quvurlar). Kalibrlash nisbatlari (`Measures_summary!D55/D56`) yaqinlashadi.
`divergences.json`: tegishli yozuvlar yopiladi; yangi farq chiqsa — README §5.

## Qabul mezonlari

- [ ] Hech bir COP > 1 manbada yakuniy energiya manfiy emas (unit test).
- [ ] Mavjud integratsiya testlari: natija o'zgargan joylar faqat generatsiya ↔ (`audit.test.ts` kutilmalari yangilansa — commit
      matnida qaysi va nima uchun).
- [ ] Migratsiya lokal D1'ga toza qo'llanadi; `bun run build` (UI o'zgargani uchun), type-check, lint, test yashil.
- [ ] `calculation-engine.md` dagi X33 bandi "yopildi (F04)" deb yangilanadi.

## Qilmang

- Oylik SCOP (`IHS!B16:J34`) — P2; COP kirish sifatida qoladi. Zaxira manba (MTB, ulush 0 %) logikasi — P2.
