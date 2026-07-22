# Hisobot (PDF audit report, `report.service.ts`)

Bu fayl hisobotning **maqsadli strukturasini** va uni hisoblash dvigateli (`AuditResult`,
`.claude/rules/calculation-engine.md`) bilan qanday moslashtirishni belgilaydi. To'liq namunaviy
hisobot (WB ECE dasturi doirasidagi energiya auditi shabloni) manba fayli:
`C:\Users\Saidmurod\OneDrive\EA\2026\WB ECE Energy Audit\Namuna hujjatlar\пример отчёта Мд.docx`
— bu Word shabloni bo'lib, o'zi bo'sh (namuna/andoza), lekin bo'limlar tartibi, jadval sarlavhalari
va har bir jadvalning ustunlari haqiqiy hisobotning "shakli" sifatida ishonchli manba hisoblanadi.

## Asosiy qoida: hech qanday kiritilgan/hisoblangan qiymat "egasiz" qolmasin

Hisobot — audit natijasining **to'liq va izchil taqdimoti**, qisqartirilgan xulosa emas.
`AuditResult`ning (`packages/types/src/audit.ts`) har bir maydoni pastdagi jadvalda kamida bitta
hisobot bo'limiga bog'langan bo'lishi kerak — yangi hisoblash natijasi (`AuditResult`ga yangi
maydon) qo'shilganda, shu jadvalga ham qator qo'shing va `generateAuditReportPdf()`da unga mos
bo'lim yarating. Aksincha, hisobotda ko'rsatilgan har bir raqam haqiqiy `AuditResult`/DB
maydonidan kelishi kerak — namunaviy hujjatdagidek qo'lda to'ldiriladigan bo'sh joy emas.

Ikkinchi qoida — **standardized/actual juftligi hech qachon ajratilmasin**
(`calculation-engine.md`dagi `standardized` vs `actual` tushuntirishiga qarang): hisobotda bitta
ko'rsatkich (tejamkorlik, to'lov muddati, NPV/IRR) ko'rsatilganda, imkon qadar ikkalasi — nazariy
(standardized) VA kalibrlangan (actual) — yonma-yon ko'rsatilsin, namunaviy hujjatning "Theoretical
payback" / "Actual payback" ustunlari juftligidagi kabi. Faqat bittasini ko'rsatib, ikkinchisini
yashirish chalg'ituvchi — bank buni ikkalasini ko'rishni kutadi.

## Hisobot tuzilishi (bo'lim → manba → holat)

Namunaviy hujjatning tuzilishi ikki qismga bo'linadi: **asosiy matn** (tavsif + xulosa,
insonga o'qish uchun) va **Annex 2** (xom hisob-kitob jadvallari, auditor o'z ishini tekshirishi
uchun). Bizning avtomatik generatsiya qilinadigan hisobotimiz uchun ikkalasi ham kerak, lekin bir
xil PDF ichida ketma-ket, alohida Word fayl kabi qo'lda to'ldirilmaydi.

Holat ustuni: ✅ mavjud (`report.service.ts`da hozir bor) · ⚠️ qisman · ❌ yo'q (qo'shilishi kerak).

### A. Muqova va xulosa

| Bo'lim | Manba | Holat |
|---|---|---|
| Sarlavha, bino nomi/manzili, hisobot sanasi | `building.name`, `building.location`, `result.generatedAt` | ✅ |
| Qisqa xulosa jadvali (namunaning Table 1) — har bir chora-tadbir uchun investitsiya, to'lov muddati (nazariy/haqiqiy), CO2 kamayishi, amalga oshirishga tavsiya | `result.measures[]` (`investmentCostUsd`, `standardized.simplePaybackYears`/`actual.simplePaybackYears`, `co2ReductionTonnesPerYear`, `proposedForImplementation`) + `result.nonEeMeasures[]` | ⚠️ — hozir faqat oddiy jadval bor, nazariy/haqiqiy to'lov muddati juftligi yo'q |
| Umumiy xulosa KPI'lari (joriy/potensial solishtirma sarf, CO2, investitsiya, jamlangan to'lov muddati) | `result.summary` (`AuditSummary`) | ✅ |

### B. Bino tavsifi

| Bo'lim | Manba | Holat |
|---|---|---|
| Umumiy ma'lumot jadvali (namunaning Table 2: yuk maydoni/hajmi, harorat, davomiylik va h.k.) | `building.*` (`heatingSeasonDurationDays`, `indoorTempOperationC`/`NonOperationC`, `outdoorAvgHeatingSeasonTempC`, `outdoorDesignTempC`, `occupantCount`, `coolingEnthalpy*KjKg` va h.k. — to'liq ro'yxat `Building_data` sheet, `docs/data-dictionary.md`) | ⚠️ — hozir faqat nom/joylashuv/tur/yil/maydon/aholi bor, iqlim/harorat parametrlari yo'q |
| Qobiq yuzalari (devor/socle/tom/pol/deraza/eshik maydoni) | `result.envelopeAreas` (`EnvelopeAreaBreakdown`) | ✅ |
| Devor/tom/pol U-qiymat hisob-kitobi (namunaning Table 7-9, 26-28: qatlamlar, qalinlik, λ, R, U) | `constructionType` + `constructionLayer` (qatlamlar, `material.thermalConductivityWPerMk`) → `UValueResult` | ❌ — hozir hisobotda yo'q, faqat maydon jadvali bor |
| Derazalar/eshiklar tavsifi (tur, U-qiymat) | `openingType` (`uValueWm2k`, `gValue`, `frameFactor`, `shadingFactor`) | ❌ |
| O'rnatmalar/uskunalar (isitish, ISI, ventilyatsiya, yoritish, boshqa uskunalar) — matnli tavsif emas, hisoblangan quvvat/samaradorlik | `result.generation[]`, `result.lighting[]`, `result.equipment[]` | ⚠️ — jamlangan raqamlar bor (energiya balansi bo'limida), lekin alohida bo'lim sifatida yo'q |

### C. Energiya sarfi (baseline)

| Bo'lim | Manba | Holat |
|---|---|---|
| Oylik issiqlik/elektr/ISI sarfi grafigi, oxirgi 3 yil + o'rtacha (baseline) — namunaning Table 20-22 | `utilityBill` (`energyCarrier`, `year`, `month`, `consumptionKwh`/`consumptionNative`, `expenseLocal`) | ❌ — hisobotda umuman yo'q, faqat `apps/web`dagi `consumption-comparison-chart.tsx` dashboard'da bor |
| Generatsiya/taqsimot samaradorligi jadvali (isitish/ISI/sovutish bo'yicha, namunaning Table 23/40) | `result.generation[]` (`endUse`, `usefulEnergyNeedKwh`, `distributionLossKwh`, `efficiencyOrSeer`, `finalEnergyConsumptionKwh`) | ❌ |
| Baseline energiya balansi taqsimoti (issiqlik/elektr, maqsad bo'yicha % — namunaning Table 24/41) | `result.energyBalanceBreakdown[]` (`EnergyBalanceRow`, `section: "envelope_ventilation_loss"` va `"final_energy"`) | ❌ — bu maydon `AuditResult`da hisoblangan, lekin hisobotga hali chiqarilmagan |

### D. Renovatsiya chora-tadbirlari

| Bo'lim | Manba | Holat |
|---|---|---|
| Chora-tadbirlar ro'yxati (tavsif, investitsiya, tejamkorlik, to'lov muddati, CO2) | `result.measures[]` (`EnergyMeasureResult`) | ✅ — lekin faqat standardized tejamkorlik ko'rsatilgan, `actual*` maydonlari yo'q |
| Himoya chora-tadbirlari/qo'shimcha xarajatlar (namunaning "Protective measures") | `result.nonEeMeasures[]` (`NonEeMeasureResult`) | ✅ |
| Isitish/ISI/ventilyatsiya/yoritish/uskuna bo'yicha "oldin/keyin" taqqoslash (namunaning 3.1-3.2 bo'limlari) | `result.envelopeHeatLoss[]`, `result.dhwDemand[]`, `result.ventilationLoss[]`, `result.lighting[]`, `result.equipment[]`, `result.cooling[]` — har biri `scenario: "before"/"after"` | ⚠️ — faqat issiqlik balansi (`heatingEnergyBalance`) va yakuniy energiya (`finalEnergyByEndUse`) ko'rsatilgan, qolganlari yo'q |

### E. GHG emissiyalari

| Bo'lim | Manba | Holat |
|---|---|---|
| CO2 kamayishi (jami va chora-tadbir bo'yicha) | `result.summary.co2ReductionTonnesPerYear`, `result.measures[].co2ReductionTonnesPerYear` | ⚠️ — jami raqam bor, alohida bo'lim/qo'llanilgan koeffitsientlar (`energyTariff.emissionFactorKgCo2PerKwh`) izohlanmagan |

### F. Moliyaviy ko'rsatkichlar

| Bo'lim | Manba | Holat |
|---|---|---|
| Taxminlar (chegirma stavkasi, tarif, tahlil gorizonti) — namunaning "Assumptions" | `financial.service.ts`dagi `DEFAULT_DISCOUNT_RATE`, `energyTariff.*` | ❌ |
| Har bir chora-tadbir uchun moliyaviy tahlil (NPV, IRR, oddiy/diskontlangan to'lov muddati — nazariy va haqiqiy, namunaning Table 39) | `result.measures[].standardized`/`.actual` (`FinancialIndicators`) | ❌ — `EnergyMeasureResult`da hisoblangan, hisobotda ko'rsatilmaydi |
| Yillik pul oqimi jadvali (cashflow, namunaning Table 39 satrlari) | `financial.service.ts`ning `CashflowYear[]` — **`AuditResult`ga hali chiqarilmagan**, faqat `FinancialIndicators` (yakuniy natija) bor | ❌ — bu ilova darajasida ham yetishmayotgan ma'lumot, avval `EnergyMeasureResult`ga (yoki alohida endpoint'ga) `cashflow: CashflowYear[]` qo'shish kerak |

### G. Xulosalar va Annex 1 (jamlanma jadval)

| Bo'lim | Manba | Holat |
|---|---|---|
| Jamlanma natijalar jadvali (namunaning Table 3/Annex 1 — barcha chora-tadbirlar, investitsiya, nazariy/haqiqiy tejamkorlik, NPV, IRR, CO2, tavsiya) | `result.measures[]` + `result.nonEeMeasures[]` to'liq | ⚠️ — hozirgi jadval NPV/IRR va nazariy/haqiqiy juftligini ko'rsatmaydi |

### H. Annex 2 — batafsil hisob-kitoblar (ilova, auditor uchun)

Namunaviy hujjatning Table 4-19 va 25-38 qatori — bular xom kiritma/oraliq hisob-kitob
jadvallari (devor/tom/pol maydon o'lchamlari, U-qiymat qatlam-qatlam hisobi, tabiiy/mexanik
ventilyatsiya yo'qotishlari, yoritish/uskuna elektr sarfi, ISI hisob-kitobi va h.k. — har biri
"oldin" va "keyin" juft holatda). Bularning barchasi `AuditResult`da mavjud
(`envelopeHeatLoss`, `ventilationLoss`, `dhwDemand`, `distributionLoss`, `cooling`, `lighting`,
`equipment`, `generation` — har biri oylik/kategoriya bo'yicha batafsil).

**Qaror**: bularni asosiy hisobotga emas, alohida "Ilova 2: Batafsil hisob-kitoblar" bo'limiga
(hisobotning oxirgi qismi, jadval-ko'rinishida, `ReportLayout.table()` bilan) qo'shing — bank
o'quvchisi uchun emas, auditorning o'z ishini tekshirishi uchun. Asosiy matn qismida faqat
jamlangan/yillik raqamlar (B-G bo'limlari) ko'rsatiladi. ❌ — hozircha umuman yo'q.

Annex 3 (bino rejalari, me'yoriy-huquqiy hujjatlar ro'yxati) — bu ilovada bino rejasi
yuklash/chizish funksiyasi yo'q, shuning uchun **maqsad emas**; me'yoriy hujjatlar ro'yxati esa
statik matn bo'lardi (hisoblanadigan ma'lumot emas) — kerak bo'lsa alohida so'rovga ko'ra qo'shiladi.

## Grafiklar haqida muhim texnik nozik jihat

`report.service.ts` **Cloudflare Workers runtime'ida** ishlaydi va PDF'ni `pdf-lib` bilan
generatsiya qiladi — bu yerda DOM/canvas yo'q, shuning uchun `apps/web`da grafiklar uchun
ishlatilayotgan **recharts'ni server tarafida hech qanday shaklda ishlatib bo'lmaydi** (na SVG
render qilib, na canvas orqali PNG'ga aylantirib — ikkalasi ham DOM/canvas kerak qiladi).
Hisobotga grafik (masalan energiya balansi pie/bar chart, oylik sarf line chart) qo'shish uchun
yagona yo'l — `pdf-lib`ning o'z primitivlari bilan qo'lda chizish:
- Ustunli diagramma (bar chart) — `page.drawRectangle()` ketma-ketligi, balandligi qiymatga
  proportsional.
- Doiraviy diagramma (pie/donut) — `page.drawSvgPath()` bilan har bir segment uchun `M/A/L`
  buyruqli SVG path (markazdan yoy chizib) — `pdf-lib`ning `drawSvgPath` metodi buni to'g'ridan-
  to'g'ri qabul qiladi, tashqi kutubxona shart emas.
- Chiziqli grafik (line chart, oylik trend) — `page.drawLine()` ketma-ketligi nuqtalar orasida.

Bu ancha ishchi kod talab qiladi (`recharts`dan farqli, hech qanday tayyor komponent yo'q) —
`ReportLayout` klassiga (`report.service.ts:22`) yangi metodlar (`barChart()`, `pieChart()`)
qo'shib, mavjud `table()`/`keyValueGrid()` andozasiga ergashing (cursor-asoslangan sahifa oqimi,
`ensureSpace()` orqali sahifa almashtirish). Grafikni "chiroyli qilish" uchun web dashboard'dagi
rang palitasini emas, `report.service.ts`ning o'z `INK`/`MUTED`/`ACCENT`/`RULE` konstantalarini
ishlating — ular allaqachon bosma hisobot uchun mo'ljallangan (yuqori kontrast, minimal rang).

## Tekshirish

Hisobot bo'limi ustida ishlaganda, `bun run test` (`apps/api`) yetarli emas — `report.service.ts`
uchun hozircha maxsus unit test yo'q (faqat `tests/integration/report.test.ts`, u lokal Postgres
kerak qiladi, `testing-and-verification.md`ga qarang). PDF'ning haqiqatan to'g'ri chiqishini
tekshirish uchun `/:id/audit/report` endpoint'ini haqiqiy (yoki mock) ma'lumot bilan chaqirib,
natijadagi baytlarni `.pdf` faylga yozib, qo'lda ochib ko'ring — `pdf-lib`ning o'zi validatsiya
qilmaydi, noto'g'ri koordinata/o'lcham matnni sahifadan tashqariga chiqarib yuborishi mumkin,
buni faqat ochib ko'rish orqali bilib bo'ladi.
