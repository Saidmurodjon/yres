# F05 — Bino darajasidagi moliyaviy parametrlar va v7.20 pul oqimi modeli

**Manba:** 01 §1.3 M6–M8, P0-6 · X38, X85–X86 · K2 qarori (nominal 6,08 %, kurs loyiha darajasida) · K4 (FES eksport sukut bo'yicha o'chiq)
**Commitlar:** F05a (sxema + API), F05b (dvigatel), F05c (UI). **Yopadi:** D1 (va G4 ning asosiy qismi).

## Kitobdagi model (tekshirilgan, `Financial parameters` + `Financial indicators` 1- va 15-bloklar)

| Parametr | Katak | v7.20 qiymati |
|---|---|---|
| Bazaviy yil (yil 0 — investitsiya) | `D5` | 2027 |
| Hisob davri | `D6` | 20 yil — **chora-tadbir umridan qat'i nazar** (`E6` sharti `yil − D3 <= D6`) |
| Inflyatsiya (USD) | `D7` | 2 % ⚠ |
| Real diskont | `D8` | 4 % |
| Nominal diskont | `D9 = (1+D8)(1+D7)−1` | 6,08 % |
| Real o'sish: gaz / elektr / issiqlik-ko'mir | `D10 / D11 / D12` | 2,8 % / 2 % / 2 % |
| Nominal o'sish | `D13 = (1+D10)(1+D7)−1`, `D14` | 4,856 % / 4,04 % |
| Xizmat xarajati o'sishi | `D15 = D7` | 2 % |
| Kurs | `D16` | 12 140,91 UZS/USD |
| Tariflar | `D17` gaz 2 000 UZS/m³, `D18` elektr 1 100 UZS/kWh, `D19` FES eksport 1 100, `D20` issiqlik 1 067 132,64 UZS/Gcal, `D21` ko'mir 1 200 000 UZS/t | manba matni E ustunida |
| Gaz NCV | `D22` | 9,5 kWh/m³ |
| IRR boshlang'ich taxmin | `D23` | 0,05 |

USD/kWh (`Measures_summary!D45:F45`): gaz = `D17/(D22·D16)` = 0,017340; elektr = `D18/D16` = 0,090603; issiqlik = `D20/1163/D16` = 0,075577.

Yil `t = 1…N` (N = `D6`), yil 0 = bazaviy yil:
- `CAPEX_0 = I`; xizmat `M_t = R · I · (1+D15)^(t−1)` (R — `Measures_summary!R`, CAPEX ulushi).
- yalpi tejash `S_t = T·(1+g_gaz)^(t−1) + U·(1+g_el)^(t−1)` — **tashuvchi qismlari alohida o'sadi** (T/U F06 da; F05 da
  chora-tadbirning bitta tashuvchisi bo'yicha, F06 dan keyin qismlar bo'yicha).
- sof `N_t = S_t − M_t`, `N_0 = −I`; NPV = `Σ N_t / (1+r_nom)^t`; IRR — `Σ N_t <= 0` bo'lsa `null` ("n/a (<0)"),
  aks holda Newton, boshlang'ich `D23`; CAPEX 0 → hammasi `null` ("—").
- Actual: xuddi shu, `V/W` qismlar bilan (alohida chaqiruv — `calculation-engine.md`, masshtablamang).
- Tekshirilgan raqamlar: №15 FES — CAPEX 50 331,61; M_1 = 503,32; S_1 = 13 676,93, S_2 = 14 229,5 (×1,0404);
  NPV **158 731,35**, IRR **29,977 %**; №1 — S_1 = 2 158,16, NPV **−192 678,70**.

### ⚠ Diskontlangan qoplanish — kitobdagi xato (yangi topilma)

`Financial indicators!D19` (massiv formula) = `MATCH(birinchi musbat kumulyativ) + (−oxirgi manfiy kumulyativ / keyingi yil diskontlangan oqimi)`.
`MATCH` 1 dan boshlab sanaydi, shuning uchun natija **1 yilga ortiq**: №15 da kumulyativ 4-yil oxirida −2 019,3, 5-yilda +9 504,6 →
to'g'risi `4 + 2019,3/11 523,9 = 4,18` y, kitob **5,18** y beradi. Joriy dvigatel (`financial.service.ts`
`calculateDiscountedPaybackYears`) to'g'ri (4,18). **Qaror loyiha egasida (K21, F10 ro'yxatiga):** dvigatel to'g'ri qoladi,
golden'da `D13 "Excel xatosi, v7.21 da tuzatish"` `status: "accepted"`ni kutadi. Xatoni takrorlamang.

## F05a — sxema va API

1. **`building_financial_parameters`** (`packages/db/src/schemas/financial.ts`), PK = `building_id` (FK, cascade):
   `base_year` int, `period_years` int, `inflation_rate`, `real_discount_rate`, `real_escalation_gas`,
   `real_escalation_electricity`, `real_escalation_heat` (issiqlik+ko'mir), `exchange_rate_uzs_per_usd`,
   `gas_tariff_uzs_per_m3`, `gas_ncv_kwh_per_m3`, `electricity_tariff_uzs_per_kwh`, `heat_tariff_uzs_per_gcal`,
   `coal_price_uzs_per_t` (nullable), `coal_ncv_kwh_per_kg` (nullable), `pv_export_enabled` bool, `pv_export_tariff_uzs_per_kwh`,
   `irr_initial_guess`, `tariff_source` text (nullable), `tariff_effective_date` text `YYYY-MM-DD` (nullable), `updated_at`.
   Hammasi `real`/`integer` (`database.md` tiplari). Nominal qiymatlar **saqlanmaydi** — hisoblanadi (Fisher).
2. **Sukut qiymatlari** — bitta joyda, `packages/types` yoki `apps/api/src/lib/financial-defaults.ts`: v7.20 ning yuqoridagi
   qiymatlari, `base_year` = joriy yil + 1, `pv_export_enabled = false` (K4). Ko'mir NCV — `null` (manba yo'q; ko'mir tashuvchili
   chora-tadbirda tarif `null` → USD hisoblanmaydi, natijada `warnings[]` ga yozuv — jim 0 emas).
3. **API** (`routes/financial.ts`, `index.ts` ga ulang): `GET /buildings/:id/financial-parameters` → saqlangan qator **yoki**
   sukut obyekti + `isDefault: true` (GET hech narsa yozmaydi — A-2); `PUT` → upsert (`onConflictDoUpdate`), `canWrite`.
   Zod: stavkalar `.finite().min(-0.5).max(1)`, yillar `period 1..50`, `baseYear 2000..2100`, kurs `> 0 .max(1e6)`,
   tariflar `>= 0 .max(1e9)`, NCV `> 0 .max(100)`, matnlar `.max(500)`. `findAccessibleBuilding` → 404; IDOR yo'q (PK = buildingId).
4. Integratsiya testi: begona → 404, viewer PUT → 403, GET sukut, PUT → GET qaytaradi.
5. `energy_tariff` jadvali **o'chirilmaydi** (expand→contract): CO₂ omillari undan o'qilishda davom etadi (seed: gaz 0,198,
   elektr 0,585, issiqlik 0,05 — v7.20 `Measures_summary!D43:F43` bilan bir xil); `unitCostUsd` endi dvigatelda ishlatilmaydi.

## F05b — dvigatel

1. `AuditInputs.financialParameters` (F01 tipiga qo'shing; yo'q bo'lsa sukut). `loadAuditInputs` +1 so'rov (byudjet ichida).
2. `financial.service.ts`: `buildCashflow` v7.20 modeliga — yuqoridagi formulalar; kirish: `{ investmentCostUsd, maintenanceRate,
   savingsUsdByCarrier: { gas?, electricity?, district_heat?, coal? }, escalationByCarrier, maintenanceEscalation, periodYears,
   discountRate }`. `ENERGY_ESCALATION_RATES`, `DEFAULT_DISCOUNT_RATE`, chiziqli `1 + r·(y−1)` olib tashlanadi.
   `FinancialIndicators.analysisHorizonYears = periodYears`; `discountRate` = nominal.
3. `audit.engine.ts` `:793-839`: `latestTariffByCarrier` o'rniga parametrlardan USD/kWh; `discountRate: 0.04` (`:827`, `:838`)
   o'rniga nominal; chora-tadbir umri pul oqimini **cheklamaydi** (v7.20). `lifetimeYears` natijada informatsion qoladi.
4. `AuditSummary`/`AuditResult` ga `financialAssumptions` (bazaviy yil, davr, inflyatsiya, real/nominal diskont, nominal o'sishlar,
   kurs, USD/kWh tariflar) — hisobotning "Assumptions" bo'limi uchun (`hisobot.md` F-bo'lim qatorini ⚠ ga o'zgartiring).
5. Unit testlar: №15 va №1 raqamlari yuqorida (bitta tashuvchi bilan, F06 dan oldin ham to'g'ri chiqadi); IRR `null` holati; CAPEX 0.
6. `extract_inputs.py` → `Financial parameters!D5:D23` ni `financialParameters` ga; `pv_export_enabled = true` (kitobda eksport yoqilgan,
   `D19` va `PV!C38`).

## F05c — UI

Bino sahifasida (chora-tadbirlar tab'i tepasida yoki alohida "Moliya" kartasi) forma: barcha maydonlar `NumberInput`,
foizlar foiz ko'rinishida (2 → 0,02 — konvertatsiya bitta yordamchida), `isDefault` bo'lsa "⚠ Sukut qiymatlar (v7.20)" belgisi,
hisoblangan nominal diskont/o'sish faqat o'qish uchun ko'rsatiladi. `useRegisterDirty`, viewer uchun faqat o'qish. 375 px da scroll'siz.
i18n uz/ru/en — moliyaviy atamalar ro'yxatini PROGRESS.md ga "loyiha egasi tekshirsin" deb yozing.

## Qabul mezonlari

- [ ] Golden: `Measures_summary!N5:N23`, `O`, `G`, `K` va `Financial indicators` 1/15-blok yil-ba-yil qatorlari tolerans ichida
      (T/U bo'linishi talab qiladigan chora-tadbirlar — ventilyatsiya №10, issiqlik nasosi №11 — F06 gacha ochiq tafovut).
- [ ] D13 (diskontlangan qoplanish +1 yil) `divergences.json` da, `status: "open"`, izohi bilan; dvigatel 4,18 beradi.
- [ ] Hech qayerda `0.04`/`0.028`/`0.02` qattiq kodlangan moliyaviy konstanta qolmagan (`grep`).
- [ ] Migratsiya lokal D1'da; type-check, build, lint, test yashil.

## Qilmang

- Snapshot'da parametrlarni muzlatish — Faza 2 (`data-integrity.md`), lekin `financialAssumptions` natijada bo'lgani uchun tayyor.
- Bir nechta sanali tariflar tarixi (tarif jadvali vaqt bo'yicha) — keyinroq; hozir bitta qiymat + manba + sana.
