# F06 — Chora-tadbir darajasida tejash, tashuvchi bo'yicha bo'lish, D71, balans nazorati

**Manba:** 01 P0-2, P0-3, §4.6 I4 · X93–X95, X40 · K3 qarori (foydali va yakuniy ikkalasi, tariflash yakuniy bo'yicha)
**Commitlar:** F06a (maqsadlar: sxema + API + UI), F06b (dvigatel: atributsiya + tashuvchi qismlari), F06c (balans nazorati + jamilar).
**Bog'liqlik:** F05 (USD tariflar, pul oqimi tashuvchi qismlari bilan). **Yopadi:** D7 (qisman), X93/X95, P0-2/P0-3.

## Muammo (kodda)

`resolveMeasureStandardizedSavingsKwh` (`audit.engine.ts:972-1080`) kategoriya deltasini beradi: bir kategoriyadagi har
chora-tadbir **butun** kategoriya deltasini oladi (3-DMTT: №1 devor+sokl va №2 poydevor ikkalasi `envelope_wall_insulation` →
qo'sh hisob; №6/№7/№8 uchala `window_replacement`). Foydali issiqlik deltasi to'g'ridan-to'g'ri gaz tarifiga ko'paytiriladi
(`:824`) — yakuniy yoqilg'iga (÷η) o'tkazilmaydi. Har chora-tadbir bitta tashuvchi (`inferCarrierForMeasure`) — issiqlik nasosi
(gaz → elektr) va ventilyatsiya (issiqlik +, elektr −) ifodalab bo'lmaydi.

## Kitobdagi atributsiya (tekshirilgan, `Measures_summary` E/T/U ustunlari)

Belgilar: `η_b` — bazaviy isitish generatsiya samaradorligi (`Overall…!G7` = 0,58); `D71 = 1 + H12 / Σ(H4:H8)` (`Breakdown…`) —
"tushumlar kamayishi" tuzatmasi: `H12 = utilized_gains_after − utilized_gains_before` (manfiy), `H4:H8` — devor, tom, pol,
deraza+eshik, ventilyatsiya foydali yo'qotish deltalari. 3-DMTT: **0,974225**.

| Tur | v7.20 formulasi | Tashuvchi |
|---|---|---|
| Qobiq (№1, 2, 4, 5, 7, 8) | `Σ_maqsad (L_oldin − L_keyin) / η_b × D71` (№1: `((G13−G11)_b − (G13−G11)_a)/G7·D71` = 124 459,54) | bazaviy isitish (T) |
| Deraza ta'miri (№6) | `(ΔL_deraza / η_b + G16 / η_b) × D71`, `G16` — infiltratsiya kamayishining derazaga berilgan ulushi (X81) | T |
| Ventilyatsiya (№10) | issiqlik: `(ΔL_vent − G16)/η_b × D71` (T qismi 461,66 USD); elektr: `fan_oldin − fan_keyin` (`I51` = −7 570,45 kWh, U qismi −685,90 USD) | aralash (M) |
| Isitish tizimi (№13) | `ΔL_quvur / η_b` — **D71 siz** (`E17`) | T |
| Issiqlik nasosi (№11) | gaz: `+D61 = (J7+L7)/η_b` = 62 798,09; elektr: `−(D62 + D65 − D63)`, D62 = nasos elektr 11 708,07, D65 = yangi aylanish nasoslari 7 808,64, D63 = ISIdagi nasos tejashi 0 | aralash (M), USD = `D61·tarif_gaz − (…)·tarif_el` = −679,33 |
| Gelio (№14) | `I13·(1 + (1 − 0,98·0,85)) / η_ISI_zaxira` = 18 145,36 | ISI tashuvchisi (E) |
| FES (№15) | F09 | E |
| LED, uskunalar, sovutish (№16, 17, 19) | `oldin − keyin` (№17 ga `+D65` — nasoslar shu yerga qaytariladi) | E |
| BEMS (№18) | `EMS!D10` (P1 — EN ISO 52120, hozir 3 %) | keyingi holatdagi end-use tashuvchilari bo'yicha |

Balans (`D67`, `D68`): Σ T-qismlar + ventilyatsiya issiqlik qismi + D61 = **496 820,78** (bazaviy nazariy issiqlik, `Breakdown!D15`);
Σ E-qismlar + `I51` − D62 − D65 + D63 = **167 433,00** (`Breakdown!H25`). Farq < 1 % → "OK".

## F06a — chora-tadbir maqsadlari

1. `energy_measure_target` (`measures.ts`): `id`, `measure_id` (FK cascade), `kind` (`construction_type` | `opening_type`), `code` text.
   **Kod bo'yicha**, id bo'yicha emas: `PUT /envelope` turlarni qayta yaratadi (yangi UUID — `routes/envelope.ts:136-150`), kod esa barqaror.
   Hisobda topilmagan kod → `warnings[]` (jim 0 emas).
2. Chora-tadbir POST/PUT (`routes/measures.ts`): `targets: { kind, code }[]` (`.max(40)`, kod `.max(100)`), bitta `db.batch()`:
   eski maqsadlarni o'chirish + `insertChunked`. Byudjetni endpoint izohida hisoblang (`database.md`).
3. `non_ee_measure.proposed_for_implementation` (bool, NOT NULL, **default true** — joriy "har doim kiradi" xatti-harakati saqlanadi).
   v7.20 da non-EE ham `Q` ustuniga ega (`D39` faqat "Yes" larni yig'adi: 706 124,26).
4. UI (chora-tadbir dialogi): qobiq kategoriyalari uchun "Qaysi konstruksiya/ochiq joy turlari" multi-select (oldingi holat kodlari +
   tavsif), qobiq bo'lmagan kategoriyalarda yashirin. Non-EE qatorida "Taklif etiladi" belgisi. i18n, `useRegisterDirty`, 375 px.
5. **Maqsadsiz qobiq chora-tadbiri** (eski ma'lumot): mavjud kategoriya deltasi, lekin natijada `warnings[]`: "maqsad tanlanmagan —
   butun kategoriya hisoblandi, qo'sh hisob xavfi". Bir kategoriyada ≥ 2 maqsadsiz chora-tadbir — har biriga ogohlantirish.

## F06b — dvigatel

1. `resolveHeatLossGroups` / `calculateEnvelopeHeatLoss` — guruh kaliti `(kategoriya, oldingi tur kodi)`; `annualByCategory` avvalgidek
   (yig'indi o'zgarmaydi), yangi `annualByTypeCode`. Ochiq joylar — F07 gacha mavjud kategoriya-darajali "keyin" bilan.
2. `EnergyMeasureResult` ga: `usefulSavingsKwh` (foydali — K3), `savingsByCarrier: { carrier, standardizedKwh, standardizedUsd, actualKwh, actualUsd }[]`
   (manfiy qism ruxsat), mavjud `standardizedAnnualSavingsKwh/Usd`, `actual*` = qismlar yig'indisi (orqaga moslik). `co2` = Σ qism × omil.
3. Atributsiya — yuqoridagi jadval, umumiy ko'rinishda:
   - `η_b` = oldingi holatdagi isitish manbalarining `Σ(Q+Qd)·ulush / Σ yakuniy` (bitta manbada = η). Bazaviy isitish tashuvchisi
     `carrierForGenerationSourceType` orqali; bir nechta tashuvchi bo'lsa qismlar yakuniy energiya ulushiga mutanosib.
   - `D71` — `HeatingEnergyBalanceResult` dan foydalanilgan tushumlar (oldin/keyin) va qobiq+ventilyatsiya deltalaridan; `AuditResult.gainsUtilizationCorrection`.
   - Generatsiya almashtirish (`gas_boiler_replacement`): har oldingi tashuvchi `+ (keyingi Q+Qd)·ulush / η_b`, har keyingi manba tashuvchisi `− yakuniy`.
     Aylanish nasoslari (D65) uskunalarda qoladi — v7.20 ularni №11 dan ayirib №17 ga qo'shadi; jamida farq yo'q, chora-tadbir darajasida
     tafovut `D14` sifatida yoziladi.
   - Infiltratsiyaning derazaga ulushi (`G16`, X81) — **P1, qilinmaydi**: №6 faqat `ΔL_deraza` oladi, D5 ochiq qoladi.
   - Kalibrlash (actual): har qism o'z tashuvchisining nisbati bilan (`D55` issiqlik, `D56` elektr); qismlar bo'yicha alohida pul oqimi (F05).
4. `inferCarrierForMeasure` — faqat tashuvchini aniqlab bo'lmaydigan `other` uchun qoladi; `ems`/`solar_dhw` "gas" taxmini olib tashlanadi.
5. Unit testlar: qo'shni ikki devor chora-tadbiri (har biri o'z kodi) — yig'indi = kategoriya deltasi (qo'sh hisob yo'q); issiqlik nasosi —
   gaz +, elektr −; D71 = 1 tushumlarsiz.

## F06c — balans nazorati va jamilar

1. `AuditResult.measureBalance: { carrier, sumOfMeasuresKwh, scenarioDeltaKwh, diffPct, status: "ok" | "check" }[]` — `scenarioDeltaKwh`
   = oldin − keyin yakuniy (FES/BEMS ham), `ok` agar `|diff| < 1 %` (v7.20 `F67`; elektr `F68` da `< 10 kWh` — 1 % va 10 kWh dan kattasi).
   Faqat **taklif etilganlar** emas, **barcha** chora-tadbirlar (v7.20 `D67` barcha qatorlar). Hisobot/UI hozircha ko'rsatmasa ham natijada bo'lsin.
2. `AuditSummary` → `all` va `proposed` ikki to'plam (`Measures_summary` 38/39-qatorlar): capex (EE + non-EE — non-EE ham `proposed` bo'yicha),
   kWh, USD (std/actual), oddiy qoplanish (`D/F`), CO₂, paket NPV/IRR (`Financial indicators` 469+/493+ bloklari — ular non-EE CAPEX ni
   oladimi, kitobdan tekshiring va izohda yozing). Eski maydonlar (`totalInvestmentUsd` …) `proposed` ga teng qoladi (orqaga moslik);
   `hisobot.md` A va G bo'lim qatorlarini yangilang.
3. `extract_inputs.py` — maqsad kodlari (№1: W1, Socle 1.; №2: Socle 2; №4: R1; №5: F1, F3; №6: Win3; №7: Win2; №8: D1) va non-EE `Q`.

## Qabul mezonlari

- [ ] Golden: `Measures_summary!E5:E23`, `I`, `T:W`, `D67/D68`, `D71`, `E38/F38/I38/J38`, `D39/E39/F39` tolerans ichida yoki
      tafovut ID si bilan (D5, D8, D11, D14).
- [ ] `measureBalance` 3-DMTT da ikkala tashuvchi `ok`.
- [ ] Maqsadsiz eski chora-tadbirlar ishlashda davom etadi (integratsiya testi) va ogohlantirish beradi.
- [ ] `calculation-engine.md`: "standardized vs actual" bandi tashuvchi qismlari bilan yangilanadi; `inferCarrierForMeasure` bandi.
- [ ] type-check, build, lint, test yashil; migratsiyalar lokal D1'da.

## Qilmang

- BEMS EN ISO 52120 faktorlari (P1), soyalash hisobi (P1), infiltratsiya ulushi (P1).
- Chora-tadbirlar orasidagi o'zaro ta'sirni (ketma-ket qo'llash) modellash — v7.20 ham qilmaydi (paket "keyin" holati + atributsiya).
