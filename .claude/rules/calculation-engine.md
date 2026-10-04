# Hisoblash dvigateli (`apps/api/src/services/`, `audit.engine.ts` tomonidan boshqariladi)

- **Haqiqat manbai — `3-DMTT v7.20.xlsx` metodikasi (K1 qarori, 2026-10-02).** Avval bu qoida
  "`3-DMTT v5.xlsx`ga sodiqlik" edi — **bekor qilindi**. Auditor v7.20 bilan ishlaydi, v5 → v7.20
  oralig'idagi ~80 ta tuzatish esa dvigatelga hali o'tmagan (`docs/production/01-audit-metodologiya.md`
  §1–2). Joriy kod hali v5 xatti-harakatida; o'tish — `docs/production/00-MASTER-PLAN.md`ning
  Faza 1i. Shundan kelib chiqadigan qoidalar:
  1. v5 dan qolgan, v7.20 dan farq qiladigan formulani "ataylab Excel bilan bir xil" deb himoya
     qilmang — u tuzatilishi kerak bo'lgan tafovut. **X33 yopildi (F04):** `generation.service.ts`
     endi v7.20 dagidek `(Q+Qd)/η` (η — qozon FIK yoki COP); `η <= 0` → `RangeError`. Quvursiz
     taqsimot yo'qotishi `generation_source.distribution_efficiency` (ISI: 0,98·0,85) va
     `cooling_system.distribution_efficiency` (0,96) orqali; quvur segmentlari bor end-use'da faqat
     quvur hisobi (qo'sh hisob yo'q). Yoritish soatlari `building.working_days_per_year` ×
     kunlik ish soati (bo'sh bo'lsa eski xatti-harakat + `AuditResult.warnings`).
  2. Dvigatel o'zgarishi faqat golden test bilan birga kiritiladi (`3-dmtt/v7.20` fixture va
     `divergences.json`, `docs/production/06-sifat-test-va-reliz.md` §2) — o'zgarish qaysi tafovutni
     yopganini test ko'rsatsin. Maqsad hamon umuman "to'g'riroq" model emas, **v7.20 ga sodiqlik**:
     hisoblash noto'g'ri ko'rinsa, formulani o'zingizcha "yaxshilashdan" oldin v7.20 dagi tegishli
     varaqni tekshiring.
  3. `docs/data-dictionary.md` hali v5 bo'yicha yozilgan — varaq/katak tuzilishi uchun foydali, lekin
     v7.20 farqlari uchun `01-audit-metodologiya.md`ni ustun deb oling. v7.20 fayli repo'da yo'q
     (`3-MTM/` papkasida, loyiha egasida) — kerak bo'lsa so'rang, taxmin qilmang.
- **Pol U-qiymati (F08b, X75/X83 yopildi)** `uvalue.service.ts`ning `calculateConstructionTypeU()`ida (dvigatel ham, hisobot ham shuni chaqiradi): `floor_ground` — 2 m zona usuli (`calculateGroundFloorUValue`, turning `ground_length_m × ground_width_m` bloki, Rsi/Rse qo'shilmaydi, `λ < 1,2` qatlamlar ΣR); `floor_over_unheated`/`socle_unheated` — `U·n` (`temperature_reduction_factor`, null = 1); eski `floor` — oddiy `1/ΣR` + `warnings[]`. Zona maydonlari `AuditResult.groundFloorZones`da. Kitobdagi F1 faqat ish soatlarida hisoblanadi (D9/K22) — dvigatel hamon ikki davrli.
- **FES balansi (F09, X88 yopildi):** `AuditResult.renewableBalance` — yillik (oylik emas) `self = MIN(ishlab chiqarish, "keyin" elektr talabi FESsiz)`, `export = qolgani` (`calculateRenewableBalance`, v7.20 `PV!C34:C36`). Talab = yoritish + uskuna + sovutish + elektr tashuvchili isitish/ISI generatsiyasi + mexanik ventilyator fani − BEMS elektr tejashi. FES chora-tadbiri tejashi = `self` (retail tarif) + (eksport yoqilgan bo'lsa) `export` (`CarrierSavingPart.usdPerKwh` — eksport tarifi); eksport o'chiq (K4, sukut) bo'lsa surplus pulga aylanmaydi, faqat `renewableBalance`da ko'rinadi. `summary.potentialEnergyUseKwhPerM2Year` FES bilan **0 ga qirqilmaydi** (manfiy = sof eksportchi), `…WithoutPv…` — FESsiz; "joriy"/"keyin" jamiga ventilyator elektri, "keyin"ga BEMS tejashi (barcha tashuvchilar) kiradi. Gelio (X11) hamon qirqilmaydi (P1) — kelganda xuddi shu `MIN` andozasi.
- **`runFullAudit()` har chaqiruvda saqlangan kirishlardan hammasini qayta hisoblaydi — `audit_run`
  holat qatoridan tashqari hech narsa saqlanmaydi.** Buni tushunmasdan ichiga keshlash/memoizatsiya
  qo'shmang (binolarning kirishlari tahrirlash paytida doimo o'zgaradi; eskirgan keshlangan natija
  qayta hisoblashdan yomonroq bo'lardi).
- **`ENGINE_VERSION` (`services/engine-version.ts`, A01) — `computeAudit` natijasini o'zgartiradigan
  har commit'da qo'lda oshiriladi.** Qoida: raqamlar o'zgarsa (formula, sukut, yangi had) → MINOR;
  faqat shakl qo'shilsa (mavjud raqamlar o'zgarmaydi) → PATCH; metodika kitobi versiyasi almashsa
  yoki `AuditResult`dan maydon olib tashlansa → MAJOR (`METHODOLOGY_VERSION` ham); baytma-bayt bir
  xil natija beradigan refaktor → oshirilmaydi. Faza 1'ning qolgan/kelgusi topshiriqlari ham shu
  qoidaga bo'ysunadi. Versiya snapshot qatorida saqlanadi (A04/A05) — `AuditResult`ning o'ziga
  maydon qo'shilmagan (golden'ga tegmaslik uchun).
- **`EnergyMeasureResult`: tashuvchi qismlari (F06b, X93/X95 yopildi — qo'sh hisob endi maqsad kodi bo'yicha ajratiladi).** Har chora-tadbirning tejashi *yakuniy* energiyada, tashuvchi bo'yicha
  `savingsByCarrier[]` (qism manfiy bo'lishi mumkin: issiqlik nasosi gaz +, elektr −; ventilyatsiya issiqlik +, fan −);
  `standardizedAnnualSavingsKwh/Usd` va `actual*` — qismlar yig'indisi, `usefulSavingsKwh` — foydali (generatsiyagacha) energiya (K3).
  Atributsiya `measure-savings.service.ts`da (v7.20 `Measures_summary`): qobiq chora-tadbiri **maqsad kodi** bo'yicha
  (`annualByTypeCode`, kalit `kategoriya:oldingi-tur-kodi`) foydali yo'qotish deltasi ÷ `η_b` × `D71`, bazaviy isitish tashuvchilari
  yakuniy energiya ulushiga mutanosib; maqsadsiz (eski) chora-tadbir — butun kategoriya deltasi. `η_b` — "oldingi" isitish
  manbalarining `Σ(Q+Qd)/Σ yakuniy`; `D71` (`AuditResult.gainsUtilizationCorrection`) — foydalanilgan tushumlar kamayishi tuzatmasi
  (yo'qotish kamaymasa 1). Isitish tizimi (quvur) — ÷`η_b`, D71 siz. Bazaviy isitish manbai yo'q bo'lsa — gaz, η = 1 va `warnings[]`.
  `standardized` — nazariy model; `actual` — har **qism** o'z tashuvchisining nisbati bilan (o'lchangan bazaviy o'rtacha ÷ shu
  tashuvchining nazariy "oldingi" ehtiyoji; hisob-faktura yoki nazariy hamkor yo'q bo'lsa nisbat `1`, hech qachon taxmin/nolga bo'lish
  yo'q). Moliya hamon ikki marta, qismlar bo'yicha alohida pul oqimi (F05). **`inferCarrierForMeasure` olib tashlandi** — tashuvchi
  chora-tadbir toifasidan emas, `carrierForGenerationSourceType()` orqali manbadan keladi; yangi chora-tadbir toifasi qo'shsangiz,
  `resolveMeasureSavings()`ga tarmoq qo'shing (aks holda `default` — 0 tejash).
- **Balans nazorati va jamilar (F06c):** `AuditResult.measureBalance[]` — har tashuvchi uchun Σ(barcha chora-tadbirlar `savingsByCarrier`) vs oldin−keyin yakuniy energiya (generatsiya, yoritish, uskuna, sovutish + FES/gelio ishlab chiqarishi + EMS qismlari); `ok` agar `|farq| < 1 %` (elektr: yoki `< 10 kWh`). `summary.all` (v7.20 38-qator) va `summary.proposed` (39-qator; non-EE ham o'z `proposed` bayrog'i bo'yicha); eski `summary.total*` maydonlari `proposed` ga teng. Paket NPV = Σ NPV − non-EE xarajat; paket IRR — yig'ilgan pul oqimidan (kitobda tekshirilmagan).
- **`carrierForGenerationSourceType()`** `generationSource.sourceType`ni u qaysi sotib olingan
  energiya tashuvchisi bo'yicha hisob-fakturalanishiga moslaydi (gaz/elektr/markazlashgan
  issiqlik/ko'mir), umuman hisob-fakturalanmaydigan turlar uchun `null` qaytaradi (`solar_dhw` —
  bepul to'plangan energiya, hech qachon o'lchanmaydi) yoki haqiqatan noaniq bo'lganlar uchun
  (`other`). Shu switch'ni kengaytiring, boshqa joyda tashuvchi-taxmin qilish logikasi qo'shmang —
  bu moslashtirish yashaydigan yagona joy, va ham bazaviy-kalibrlash nisbati, ham energiya-balans
  taqsimoti buning o'z-o'zi bilan mos kelishiga bog'liq.
- **`EnergyBalanceRow.section` bir xil energiya oqimining ikki xil bosqichini ajratadi — ularni
  bitta umumiy summa kutib yig'indilamang.** `envelope_ventilation_loss` qatorlari — yalpi,
  generatsiyagacha bo'lgan issiqlik ehtiyoji (hech qanday uskuna aralashmasdan oldin qobiq/
  ventilyatsiya nima yo'qotadi). `final_energy` qatorlari — generatsiya/taqsimot samaradorligidan
  keyin haqiqatan sotib olingan narsa, tashuvchi bo'yicha — hisob-fakturaga taqqoslanadigan.
  `renewable_offset`da faqat "keyingi" qiymat bor (hech qanday "oldingi" holat yo'q — buning sababi
  uchun `renewable.service.ts`ning izohiga qarang). Yangi taqsimot toifasi qo'shsangiz, qaysi
  bo'limga halol tegishli ekanligini hal qiling, summani to'g'ri chiqaradigan bo'limni tanlamang.
- **Moliya modeli v7.20 (F05b, X38/X86 yopildi):** parametrlar `AuditInputs.financialParameters` (bino qatori yoki sukut) dan; nominal diskont/o'sish
  Fisher bilan `deriveFinancialAssumptions()`da hisoblanadi; pul oqimi gorizonti — hisob davri (`periodYears`), chora-tadbir umri emas;
  tashuvchi qismlari alohida (murakkab) o'sadi; IRR — `Σ net <= 0` yoki CAPEX 0 bo'lsa `null`. Diskontlangan qoplanish kitobda 1 yilga
  ortiq (K21) — dvigatel to'g'ri, golden'da D13. Tarifi hisoblab bo'lmagan tashuvchi (ko'mir NCV yo'q) → USD 0 + `warnings[]`.
- **Chora-tadbir maqsadlari (F06a):** qobiq chora-tadbirlari `energy_measure_target` orqali qaysi *oldingi* konstruksiya/ochiq joy
  turini almashtirishini aytadi — **kod** bo'yicha (`PUT /envelope` turlarni yangi UUID bilan qayta yaratadi). Maqsadsiz (eski)
  qobiq chora-tadbiri hamon butun kategoriya deltasini oladi, lekin `warnings[]` ga tushadi; topilmagan kod ham. Non-EE qatorlarda
  `proposed_for_implementation` (default `true`) — paket yig'indisiga faqat taklif etilganlar kiradi (v7.20 `D39` = `SUMIF(Q, "Yes")`).
- Moliyaviy ko'rsatkichlar (NPV/IRR/qoplanish muddati) `financial.service.ts`ning
  `calculateFinancialIndicators()`idan keladi — uni ikki marta chaqiring (bir marta
  standartlashtirilgan tejamkorlik bilan, bir marta kalibrlangan haqiqiy tejamkorlik bilan),
  `actual`ni `standardized`ning natija raqamlarini masshtablash orqali chiqarmang; NPV/IRR
  tejamkorlik kirishiga nisbatan chiziqli emas, bu buni yaroqsiz qilardi.

## Audit topilmalari (2026-yil tekshiruvi)

`docs/data-dictionary.md`ning "Ambiguities" bo'limidagi barcha 10 band manba `.xlsx` fayliga
qarshi bevosita tekshirildi va joriy kod bilan solishtirildi — to'liq natija
`docs/calculation-engine-audit.md`da. Qisqacha:
- **8 tasi allaqachon to'g'ri hal qilingan** (yo ataylab Excel bilan bir xil qoldirilgan aniq
  izoh bilan, yo to'g'ri tuzatilgan aniq izoh bilan). **Diqqat:** bu tekshiruv v5 ga nisbatan
  qilingan — "Excel bilan bir xil qoldirilgan" qarorlar K1 dan keyin v7.20 ga nisbatan qayta
  ko'rib chiqiladi (Faza 1).
- **2 ta haqiqiy kamchilik topildi, ikkalasi ham tuzatildi**: (1) `non_ee_measure` (yordamchi
  renovatsiya xarajatlari) endi `apps/api/src/routes/measures.ts`dagi CRUD route'lari orqali
  boshqariladi va `audit.engine.ts` uni `AuditSummary.totalInvestmentUsd`ga qo'shadi; (2) mexanik
  ventilyatsiyaning sovutish-mavsumi entalpiya yuki `ventilation.service.ts`ning
  `calculateMechanicalVentilationCoolingGainKwh()`i orqali hisoblanib, `CoolingResult`ga
  uchinchi had sifatida qo'shildi (buning uchun `ventilation_system.cooling_season_hours`
  ustuni ham qo'shildi). To'liq tafsilot: `docs/calculation-engine-audit.md`.
