# F09 — FES: o'z iste'moli / eksport, solishtirma iste'mol 0 ga qirqilmaydi

**Manba:** 01 P0-7, §2.1 (FES qatori) · X36, X88 · K4 qarori (eksport — loyiha parametri, sukut bo'yicha o'chiq)
**Commit:** bitta. **Bog'liqlik:** F05 (`pv_export_enabled`, eksport tarifi), F06 (tashuvchi qismlari). **Yopadi:** D2.

## Kitobdagi hisob (tekshirilgan, `PV!C25:C38`, `Breakdown…!G16:H84`)

- Yillik ishlab chiqarish `C25` = 150 954,94 kWh.
- "Keyin" elektr talabi FESsiz (BEMS tejashi bilan) `C34 = Σ Breakdown!G16:G21 + G24` = **77 855,28** (yoritish + uskunalar +
  sovutish + ISI + issiqlik nasosi + ventilyator elektri − BEMS).
- O'z iste'moli `C35 = MIN(C25, C34)` — **yillik** balans (oylik emas); eksport `C36 = C25 − C35` = 73 099,66.
- Qiymat `C38 = C35 · tarif_el + C36 · eksport_tarif` = 13 676,93 USD (eksport tarifi `= D19/D16`, kitobda chakana bilan teng).
- Solishtirma: `H75` FESsiz 30,91, `H76` FES bilan **−29,02** kWh/m²·y (manfiy — sof eksportchi); qoplash `H82 = H72/H71` = 1,939.

## Muammo (kodda)

- `buildAuditSummary` (`audit.engine.ts:1109-1116`) `Math.max(0, …)` — sof eksport ko'rinmaydi (ZEB/−29 kWh/m²).
- "Keyin" jami faqat `finalEnergyByEndUse` + yoritish + uskunalar — **ventilyator elektri va BEMS tejashi kirmaydi** (`:1096-1116`),
  v7.20 `H71` ikkalasini oladi.
- FES chora-tadbiri tejashi = butun ishlab chiqarish × elektr tarifi (`resolveMeasureStandardizedSavingsKwh` `case "pv"`), eksport
  qiymati va o'chirilgan eksport holati farqlanmaydi.

## Bajarish

1. `AuditResult.renewableBalance`: `{ productionKwh, demandAfterWithoutPvKwh, selfConsumedKwh, exportedKwh, coverageRatio }`
   (yillik, v7.20 formulalari). `demandAfterWithoutPvKwh` — "keyin" elektr: yoritish + uskunalar + sovutish + elektr tashuvchili
   isitish/ISI generatsiyasi + mexanik ventilyator + BEMS elektr tejashi (manfiy).
2. FES chora-tadbiri: kWh tejash = `selfConsumedKwh + (eksport yoqilgan ? exportedKwh : 0)`; USD = `self × tarif_el + (yoqilgan ? export × eksport_tarif : 0)`.
   Eksport o'chiq bo'lsa (sukut, K4) — eksport qismi natijada ko'rinadi, lekin pulga aylanmaydi va `warnings[]` emas, `renewableBalance` da
   aniq ko'rinadi. Actual: elektr nisbati bilan (v7.20 `I19 = E19·D56`).
3. `AuditSummary`: `potentialEnergyUseKwhPerM2Year` — FES bilan, **qirqilmagan** (manfiy bo'lishi mumkin); yangi
   `potentialEnergyUseWithoutPvKwhPerM2Year`; "joriy" va "keyin" jamiga ventilyator elektri va BEMS qo'shiladi. Frontend'da manfiy
   qiymat to'g'ri ko'rinsin (masalan "−29,0 kWh/m² (sof eksport)") — dashboard/natijalar sahifasida `Math.max` yoki `abs` yo'qligini tekshiring.
4. `hisobot.md`: E/C bo'limlariga `renewableBalance` qatori; hisobot hozir manfiy qiymatni qanday chiqarishini tekshiring (PDF yaratib ko'ring).
5. Gelio (X11, ehtiyojdan ortiq ishlab chiqarish) — **qilinmaydi** (P1), lekin xuddi shu `MIN` andozasi keyin qo'llanadi — izoh qoldiring.

## Qabul mezonlari

- [ ] Golden: `PV!C34:C38`, `Breakdown…!H71:H76`, `Measures_summary!E19, F19, I19` tolerans ichida (inputs'da eksport yoqilgan).
- [ ] Unit: eksport o'chiq → USD faqat o'z iste'moli; ishlab chiqarish < talab → eksport 0; manfiy solishtirma.
- [ ] Mavjud natijalar sahifasi va PDF manfiy qiymatni buzmaydi (qo'lda tekshirish yoki report integratsiya testi).
- [ ] type-check, build, lint, test yashil.

## Qilmang

- Oylik balans (soatlik/oylik o'z iste'moli) — v7.20 yillik; batareya. EE sinfi/ZEB yorlig'i — Faza 2 (`coverageRatio` tayyor turadi).
