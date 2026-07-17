# Hisoblash dvigateli auditi — `3-DMTT v5.xlsx`ga nisbatan tekshiruv

Holati: **tekshiruv yakunlandi, topilgan kamchiliklarni tuzatish tasdiqlanishi
kutilmoqda**. Bu boshqa uchta tashabbus (`social-features.md`,
`ui-guidelines.md`, `i18n-and-appearance.md`) bilan bir xil tasdiqlash
jarayonidan o'tadi — hozircha kod o'zgartirilmagan, faqat tekshiruv va
tavsiyalar.

## Metodologiya

`docs/data-dictionary.md`ning "Ambiguities / items requiring manual review"
bo'limi (10 band) manba Excel faylini ochish orqali qo'lda **bevosita
tekshirildi** — taxmin qilinmadi:

```
python3 -c "openpyxl bilan docs/3-DMTT v5.xlsx'ni data_only=False rejimida
ochib, flag qilingan har bir katakning haqiqiy formula matnini o'qish"
```

Bu orqali, jumladan, hujjatda oldin "array formula matni tiklab bo'lmadi"
deb belgilangan **chegirmali qoplanish muddati (discounted payback)
formulasi to'liq dekodlandi** (pastga qarang). Keyin har bir band
`apps/api/src/services/*.ts` va `audit.engine.ts`dagi joriy
implementatsiya bilan solishtirildi.

## Natija: 10 tadan 8 tasi allaqachon to'g'ri hal qilingan

Bu ijobiy va muhim topilma — hisoblash dvigateli kutilganidan ancha
puxta qurilgan. Har biri tasdiqlandi:

| # | `data-dictionary.md`dagi band | Holat |
|---|---|---|
| 2 | `Financial indicators`ning chegirmali qoplanish muddati array-formulasi "tiklab bo'lmadi" deb belgilangan edi | **Endi dekodlandi** (pastga qarang) — `financial.service.ts`ning `calculateDiscountedPaybackYears()` funksiyasi bu formulaning aynan o'zini (yil indeksi + kasrli-yil interpolyatsiyasi) mustaqil ravishda to'g'ri amalga oshirgan ekan. Tasdiqlangan mos kelish. |
| 4 | `Cooling!U47` — markazlashtirilgan sovutish tizimini o'lchamlash formulasi `Building_data!E17/E15`ga (mavjud bo'lmagan kataklarga) ishora qiladi, buzilgan | Reimplementatsiya arxitekturasi buni **ahamiyatsiz qiladi**: yangi tizimda CAPEX har doim auditor tomonidan to'g'ridan-to'g'ri kiritiladi (o'lchamlash formulasidan avtomatik hisoblanmaydi), shuning uchun bu buzilgan formula umuman qayta qurilishi shart emas — va qurilmagan ham. |
| 5 | `Heat distr. efficiency!Z15:AF15` — `Building_data!#REF!` buzilgan havola | Reimplementatsiya bu oylik-harorat dublikat jadvalidan foydalanmaydi (`distribution.service.ts` yillik agregat qiymat oladi) — buzilgan jadval hech qachon ko'chirilmagan, shuning uchun muammo emas. |
| 6 | `DHW distr. efficiency`ning qayta-masshtablash formulasi (`=W/75*D5`) haqiqatda litr/kishi/kun qiymatini (D5) harorat sifatida ishlatadi — xato | **To'g'irlangan**: `dhw.service.ts`da `DHW_TARGET_TEMP_C = 60` doimiy sifatida to'g'ridan-to'g'ri belgilangan, xato katakka ishora qilinmaydi. |
| 7 | `Financial indicators`ning eskalatsiya darajasi bitta blokda (devor/isitish) 8%, boshqalarida esa footnote'ga mos 2.8%/2% — mos kelmaslik | **To'g'irlangan**: `financial.service.ts`ning `ENERGY_ESCALATION_RATES`i har doim footnote'dagi hujjatlashtirilgan darajalardan (gaz 2.8%, elektr 2%) foydalanadi, 8% xatosi hech qayerda takrorlanmagan — aniq izoh bilan. |
| 8 | `Financial indicators`ning ta'mirlash-xarajati formulasi keyingi bloklarda birinchi blokning investitsiya katagiga (`$D$5`) ishora qiladi, o'zinikiga emas — copy-paste xatosi | **To'g'irlangan**: `financial.service.ts`da har bir chora-tadbir o'zining haqiqiy investitsiya qiymatidan foydalanadi (`maintenanceCostPercent * investmentCostUsd`), xato takrorlanmagan. |
| 9 | `Shading` varag'i `Measures_summary`da alohida qatorga ega emas — noaniq | Reimplementatsiyada ham "shading" alohida chora-tadbir toifasi sifatida yo'q — bu **manbadagi tugallanmagan holat bilan izchil**, xato emas. Auditor buni alohida chora-tadbir sifatida qo'shishni xohlasa, kelajakda ixtiyoriy kengaytma bo'lishi mumkin. |
| 10 | `Sheet1`ning `O` ustuni (min. harorat) buzilgan formula, hech qayerda ishlatilmaydi | Reimplementatsiyada bu jadval umuman ko'chirilmagan — muammo emas. |

**#1** (to'liq oylik katak-katak audit) va **#3** (5 ta "orphaned" Financial
blok — qaysi o'chirilgan chora-tadbirga tegishli bo'lgani tiklab
bo'lmaydi) — bular reimplementatsiya arxitekturasi tufayli **ahamiyatsiz**:
yangi tizim `Financial indicators`ning qattiq-kodlangan qator
pozitsiyalarini o'qimaydi, har bir chora-tadbir uchun moliyaviy
ko'rsatkichlarni yangidan quradi — shuning uchun "qaysi qator qaysi
chora-tadbirga tegishli edi" degan tarixiy savol yo'qoladi.

## Dekodlangan formula: chegirmali qoplanish muddati (item 2)

`Financial indicators!D19` (va har bir blokning mos katagi) haqiqiy
formulasi:
```
=MATCH(TRUE,INDEX($E17:$X17>0,0),0)
  +(-LOOKUP(9.99...E307, IF($E17:$X17<0, $E17:$X17))
     /LOOKUP(9.99...E307, IF($E17:$X17<0, OFFSET($E13:$X13,0,1))))
```
Bu — **kumulyativ chegirmalangan pul oqimi manfiydan musbatga o'tgan
oxirgi yil + o'sha yildagi qolgan manfiy balansning keyingi yilning
chegirmalangan sof tejamkorligiga nisbati** (standart kasrli-yil
interpolyatsiya usuli). `financial.service.ts`ning
`calculateDiscountedPaybackYears()` funksiyasi **aynan shu mantiqni**
mustaqil ravishda to'g'ri amalga oshirgan — tasdiqlash uchun ikkalasini
solishtirib ko'rish kifoya edi. Bu band endi `data-dictionary.md`da
"hal qilindi" deb belgilanadi.

## Topilgan haqiqiy kamchiliklar (2 ta — ikkalasi ham tuzatildi)

### 1. Energiya-tejamkor bo'lmagan (Non-EE) chora-tadbir xarajatlari umumiy investitsiyaga qo'shilmayapti — TUZATILDI

**Manba**: `Measures_summary!D30/D31` — umumiy investitsiya har doim
`Non-EE measures` varag'idagi yordamchi xarajatlarni (kabel almashtirish,
izolyatsiyadan keyin devorni qayta suvash, eski quvurlarni buzish) ham
o'z ichiga oladi, garchi ular energiya-tejamkorlik/CO2/NPV ustunlariga
kirmasa ham.

**Joriy holat**: `packages/db/src/schemas/measures.ts`da `nonEeMeasure`
jadvali **mavjud** (migratsiya bilan birga), lekin:
- Hech qanday API route'i yo'q (`apps/api/src/routes/`da yaratish/o'qish/
  yangilash uchun endpoint yo'q — `measures.ts` route'ida ham tekshirildi,
  yo'q).
- `audit.engine.ts` bu jadvalni **hech qachon so'ramaydi** — import
  ro'yxatida yo'q.
- `buildAuditSummary()`dagi `totalInvestmentUsd` faqat `energyMeasure`
  qatorlarini yig'adi.

**Ta'sir**: haqiqiy loyihada har doim deyarli bo'ladigan yordamchi
xarajatlar (buzish, qayta suvash va h.k.) hisobga olinmasdan, bankka
ko'rsatiladigan **"umumiy investitsiya" raqami kam ko'rsatiladi** — bu
"bankka tayyor" audit vositasi uchun jiddiy kamchilik.

**Tavsiya etilgan tuzatish**:
- `apps/api/src/routes/measures.ts`ga (yoki yangi kichik route bo'limiga)
  `non_ee_measure` uchun CRUD endpoint'lar qo'shish (mavjud
  `energy_measure` route'lari andozasida).
- `audit.engine.ts`da `nonEeMeasure` qatorlarini so'rash va
  `buildAuditSummary()`ning `totalInvestmentUsd`iga (energiya/CO2/NPV
  ustunlariga **kirmagan holda**, xuddi Excel'dagi kabi) qo'shish.
- Frontend'da (`apps/web`) chora-tadbirlar bo'limiga yordamchi xarajatlar
  kiritish uchun kichik jadval/forma qo'shish (hozircha yo'q ko'rinadi —
  tekshirish kerak).

**Amalga oshirildi**: `apps/api/src/routes/measures.ts`ga CRUD
endpoint'lari (`GET`/`POST`/`DELETE /:id/non-ee-measures`), `audit.engine.ts`
`nonEeMeasure` qatorlarini so'raydi va yangi `totalNonEeMeasureCostUsd`
(shaffoflik uchun alohida) + `totalInvestmentUsd`ga qo'shiladi. Chora-tadbirlar
tab'iga "Ancillary costs" bo'limi, PDF hisobotga tegishli jadval va
"of which ancillary" qatori qo'shildi.

### 2. Mexanik ventilyatsiyaning sovutish-mavsumi entalpiya yuki hisoblanmayapti — TUZATILDI

**Manba**: `Heat gains Mec Vent` varag'i — mexanik ventilyatsiya (AHU)
tomonidan olib kirilgan tashqi havoning sovutish mavsumidagi issiqlik
yukini (olib tashlanishi kerak bo'lgan issiqlik) **entalpiya farqi**
usuli bilan hisoblaydi (oddiy ΔT emas): `M = (havo_oqimi * zichlik(1.2) *
0.277778 * ΔEntalpiya * soatlar) * (1-issiqlik_qaytarish_samaradorligi)`.
Bu `Cooling` varag'idagi sovutish yukiga qo'shiladigan alohida had.

**Joriy holat**: Building sxemasida kerakli uchta kirish qiymati
**allaqachon saqlanadi** (`apps/api/src/schemas/building.ts`:
`coolingEnthalpyInsideKjKg`, `coolingEnthalpyOutsideKjKg`,
`coolingEnthalpyHottestDayKjKg` — `Building_data!D15/D16/D17`ga mos
keladi), lekin **hech qanday servis funksiyasi bu qiymatlarni
ishlatmaydi** — `cooling.service.ts`ning `calculateCoolingResult()`i
faqat quyosh yutumi (`solarGainsKwh`) va uskunalarning sovutish-mavsumi
iste'moli (`equipmentResult.coolingSeasonConsumptionKwh`)ni oladi;
mexanik ventilyatsiyaning entalpiya yuki hech qayerda hisoblanmaydi va
`audit.engine.ts`da `cooling.push(...)` chaqiruviga qo'shilmaydi.

**Ta'sir**: mexanik ventilyatsiya (AHU) o'rnatilgan har qanday bino uchun
sovutish yuki (va shunga mos elektr energiyasi) **kam baholanadi** —
qancha kam bo'lishi ventilyatsiya havo oqimi va ichki/tashqi entalpiya
farqiga bog'liq, lekin printsipial jihatdan noldan farqli, hisobga
olinmagan had.

**Tavsiya etilgan tuzatish**:
- Yangi funksiya, masalan `calculateMechanicalVentilationCoolingGainKwh()`
  — `ventilation.service.ts`ga yoki yangi kichik modulga, formula:
  `(havoOqimiM3h * 1.2 * 0.277778 * (tashqiEntalpiya - ichkiEntalpiya) *
  operatsiyaSoatlari * (1 - issiqlikQaytarishSamaradorligi)) / 1000`.
- `audit.engine.ts`da bu qiymatni hisoblab, `calculateCoolingResult()`ga
  uchinchi had sifatida qo'shish (`totalCoolingLoadKwh = solarGainsKwh +
  internalGainsKwh + mechVentCoolingGainKwh`).
- Test: `apps/api/tests/services/`ga yangi test fayli, `Building_data!
  D15/D16/D17`ning namunaviy qiymatlari (48.4/59.5/69.13 kJ/kg) bilan
  Excel'ning natijasiga solishtirilgan holda.

**Amalga oshirildi**: `ventilation.service.ts`ga
`calculateMechanicalVentilationCoolingGainKwh()` qo'shildi (namunaviy
48.4/59.5 kJ/kg qiymatlari bilan unit test qilingan), `CoolingResult`ga
`mechanicalVentilationGainKwh` maydoni qo'shildi, `audit.engine.ts`
uni hisoblab `calculateCoolingResult()`ga uchinchi had sifatida uzatadi.
"Operatsiya soatlari" uchun yangi `ventilation_system.cooling_season_hours`
ustuni qo'shildi (migratsiya `0003_giant_mandrill.sql`) va Systems tab'iga
tegishli kirish maydoni qo'shildi.

## Qurish tartibi (tasdiqlangandan so'ng) — YAKUNLANDI

1. Non-EE chora-tadbirlar: sxema allaqachon tayyor → route qo'shish →
   `audit.engine.ts`ga ulash → frontend forma. Type-check, `bun run test`,
   commit. ✅
2. Mexanik ventilyatsiya entalpiya yuki: yangi hisoblash funksiyasi + unit
   test → `audit.engine.ts`ga ulash → `bun run test`, commit. ✅
3. `docs/data-dictionary.md`ning "Ambiguities" bo'limini yuqoridagi jadvalga
   mos yangilash (har bir band uchun "hal qilindi"/"ahamiyatsiz" holatini
   qayd etish) — alohida, kichik commit. ✅

## Tekshirish

Har ikkala tuzatish ham `apps/api/tests/services/`dagi mavjud unit-test
andozasiga ergashadi (`.claude/rules/testing-and-verification.md`) —
sof funksiyalar, baza kerak emas. Qo'shimcha ravishda, agar loyiha egasida
haqiqiy Excel faylidagi namunaviy binoning yakuniy raqamlari (masalan
umumiy investitsiya, sovutish uchun elektr energiyasi) bo'lsa, tuzatishdan
keyingi audit natijasini o'sha raqamlar bilan qo'lda solishtirish eng
ishonchli tasdiq bo'ladi.
