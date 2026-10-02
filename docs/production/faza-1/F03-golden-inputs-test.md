# F03 — Golden: `inputs.json`, `golden.test.ts`, `divergences.json`

**Manba:** 06 §2.2, §2.3, §2.5 · **Commitlar:** F03a (ekstraktor + `inputs.json`), F03b (test + `divergences.json`).
**Bog'liqlik:** F01 (`AuditInputs`, `computeAudit`), F02 (`expected.json`). Dvigatel formulalariga tegilmaydi.

## F03a — `tools/golden/extract_inputs.py` → `fixtures/3-dmtt/v7.20/inputs.json`

`inputs.json` = F01 dagi `AuditInputs` shakli (JSON). `meta` F02 dagidek (sha256 tekshiruvi bilan).

### Asosiy qoida — kirish, oraliq natija emas

Faqat v7.20 ning **kiritma kataklari** (konstanta yoki faqat konstantalarga havola) olinadi. Excel'ning oraliq
natijasini (masalan `U-values!H17` dagi tayyor U, `gains!K20` dagi tayyor ehtiyoj) dvigatelga "kirish" qilib
berish **taqiqlanadi** — bu golden'ni ma'nosiz qiladi. Dvigatel modelida kirish uchun joy yo'q bo'lsa
(masalan pol zona usulining blok o'lchamlari — F08 gacha), eng yaqin halol ko'rinishni bering va F03b da
tafovut sifatida ro'yxatga oling. **Ekstraktor model bilan birga o'sadi:** F05/F06/F07/F08/F09 har biri
o'z yangi maydonlarini shu skriptga qo'shadi va `inputs.json` ni qayta chiqaradi.

### Varaq → `AuditInputs` xaritasi (kitobda tekshirilgan joylashuvlar)

| `AuditInputs` qismi | v7.20 manbasi | Izoh |
|---|---|---|
| `building` (harorat, soat, davomiylik, aholi, entalpiya) | `Building_data!D7:D19` | D9 = 22 °C (ish), D8 = 14 °C, D14 = 10 soat/kun, D13 = 14, D7 = 163 kun, D18 = 418 kishi, D15/D16 entalpiya |
| `climateRegion.monthlyNormals` (isitish oylari) | `Losses env. before!N36:T38` (oy, harorat, kun) | Oct…Apr; `heatingDaysInMonth` = 38-qator (15, 27, 28, 28, 25, 28, 12) |
| quyosh radiatsiyasi (isitish) | `gains!` N3 dan pastdagi jadval (A.4) | yo'nalish guruhlari: South, North, East/West, SE/SW, NE/NW, Horizontal |
| quyosh radiatsiyasi (sovutish oylari) | `Cooling!J5:N12` | V*–IX* |
| `blocks` | `Envelope!D84:L95` (D87 Block A, D88 B, D89 C) | E brut maydon/qavat, F qavat, H balandlik, I perimetr, J devor qalinligi. Dvigatel `footprintLengthM × footprintWidthM` kutadi — brut maydonni `length = maydon, width = 1` bilan bering (izoh qoldiring); `perimeterLossCoefficient` = J (devor qalinligi). Natija `Envelope!L95` bilan solishtiriladi (G0) |
| `envelopeElement` | `Envelope!B7:Q62` (blok, yo'nalish C, tomon D, element turi E, uzunlik F, balandliklar G/H) | 74–79-qatorlar jami — **kirish emas** |
| `envelopeOpening` | `Envelope!L:T` ustunlar (tur kodi N, o'lcham, soni) | `AG86:AH92` — turlar va U |
| `openingType` (oldin/keyin) | `Envelope!AE86:AH92`, `AE96:AH100` (Win4, V4, D4) | g, Fw, soya — `gains!B4:H10` |
| `constructionType` + `layers` | `Envelope!AF102:AG123` (kodlar) + `U-values!` qatlam bloklari (C/D material, E qalinlik, F λ; keyin — J/K/L/M) | material λ — `U-values!Y7:Z60` jadvali; Parapet (`AG105`) issiqlik yo'qotishida **yo'q** (I6, `AI105` izohi) |
| `surfaceResistance` | `U-values!T10:U10` va bloklardagi `Rint/Rext` | |
| `ventilationSystem` | `Ventilation losses!B5:G14` (tabiiy, oldin/keyin), mexanik — `Ventilation losses` 40–76-qatorlar | |
| `dhwSource` | `DHW generation!B5:I17` (oldin), `B21:I35` (keyin) | litr/kishi·kun, kishi soni, ΔT, kunlar |
| `distributionSystem` | `Heat distr. efficiency!B6:H12` (oldin), `B13:H19` (keyin) | DN, uzunlik, izolyatsiya ulushi |
| `generationSource` | `Overall gener. & distrib. eff.!C5:C17`, G/M ustunlar | oldin: gaz qozon η 0,58; keyin: issiqlik nasosi COP = `IHS!D34` (3,1109 — **oraliq natija, istisno**: oylik SCOP hisobi P2, shu bitta qiymat kirish sifatida beriladi va tafovutlar ro'yxatida "D6 qisman" deb belgilanadi); ISI elektr isitgich 1,0 |
| `lightingZone` | `Lighting!C7:J16` | texnologiya ulushlari E:H |
| `lampType` | `Lighting!Q8:R11` | W/m² |
| `equipmentItem` | `Equipment!` oldin 3–48 (jami `K49`), keyin 53–99 (jami `K100`) | sarlavha `B1`/`B51`; chegarani yorliq bo'yicha tekshiring |
| `coolingWindow`, `coolingSystem` | `Cooling!D6:I12` (oldin), 15–23 (keyin); SEER `Cooling!G37/O37` | |
| `renewableSystem` (PV) | `PV!C13:C24` oylik ishlab chiqarish (kVt × koeff — keshlangan kWh qiymati **kirish** sifatida qabul qilinadi, PVGIS chiqishi) | |
| `renewableSystem` (Solar DHW) | `Solar DHW!I13` (yillik) | oylik bo'linish yo'q — bitta qiymatni 12 ga bo'lmang; dvigatel faqat yillik yig'indini ishlatsa, 1 ta oy qatori bilan bering va izoh qoldiring |
| `utilityBill` | `Consumption!` gaz 7–18 (2023/2024/2025: D, G, J ustunlar, m³), elektr 25–36 (kWh), markazlashgan issiqlik 43–54; jamilar 19/37/55-qatorlar — kirish emas | kWh = m³ × NCV (`Consumption!V10`); baseline = 3 yil o'rtachasi (`M19` = 240 365,83 kWh, `M37` = 56 045) |
| `energyMeasure` | `Measures_summary!B5:R23` | `sourceSheetRef = "Measures_summary!<qator>"` (F03b moslash shu orqali); kategoriya — pastdagi jadval |
| `nonEeMeasure` | `Non-EE measures!C4:H16` | `quantity = 1`, `unitCostUsd = H` (yoki varaqdagi miqdor × birlik narx, agar ustunlar bo'lsa) |
| `energyTariff` | hozircha seed qiymatlari; F05 dan keyin `Financial parameters` | |

### Chora-tadbir kategoriyalari (19 ta)

| № | v7.20 | `category` |
|---|---|---|
| 1 | Devor + sokl (ventfasad) | `envelope_wall_insulation` |
| 2 | Poydevor (Socle 2) | `envelope_wall_insulation` |
| 3 | Parapet (non-EE ga ko'chirilgan, 0) | `other`, `proposedForImplementation: false` |
| 4 | Tom | `envelope_roof_insulation` |
| 5 | Pol | `envelope_floor_insulation` |
| 6 | Derazalar — ta'mir (almashtirilmaydi) | `window_replacement` |
| 7 | Vitraj | `window_replacement` |
| 8 | Eshiklar | `window_replacement` |
| 9 | Soyabonlar | `other` |
| 10 | Ventilyatsiya (rekuperatsiya) | `mechanical_ventilation_heat_recovery` |
| 11 | Issiqlik nasosi | `gas_boiler_replacement` |
| 12 | MTB (zaxira, tejash 0) | `other` |
| 13 | Isitish tizimi (quvurlar, radiatorlar) | `heating_system` |
| 14 | Quyosh suv isitgichlari | `solar_dhw` |
| 15 | FES 96,72 kWt | `pv` |
| 16 | LED | `lighting` |
| 17 | Induksion plitalar | `equipment_replacement` |
| 18 | BEMS | `ems` |
| 19 | Sovutish (talab kamayishi) | `other` |

`investmentCostUsd = D`, `lifetimeYears = M`, `maintenanceCostPercent = R`, `proposedForImplementation = (Q == "Yes")`.

## F03b — `apps/api/tests/golden/golden.test.ts`

1. `inputs.json` → `computeAudit(inputs, { generatedAt: "2026-01-01T00:00:00.000Z" })` (bazasiz, Vitest unit to'plamida).
2. **`mapping.ts`**: `expected.json` dagi har `id` → `(result: AuditResult, inputs) => number | null` accessor.
   Chora-tadbirlar `sourceSheetRef` bo'yicha topiladi. Dvigatelda tushunchasi yo'q `id` lar (EE sinfi, `Checks`,
   T/U qismlar F06 gacha) — **mapping'da yo'q**, lekin `divergences.json` da `"notModelled": [...]` ro'yxatida
   bo'lishi shart. Qoida: har `expected.id` yo mapping'da, yo `notModelled` da — aks holda test yiqiladi.
3. **`expectClose(actual, expected, tol)`** — xabar: `id  Excel-katak  actual vs expected (Δ%)`. Toleranslar 06 §2.3
   "boshlang'ich" ustunidan, `class` bo'yicha (`tolerances.ts` da bitta jadval). `kind: "none"` ↔ `null` aynan.
4. **`divergences.json`** — `[{ "id": "D1", "x": ["X85","X86"], "title": "...", "status": "open" | "accepted" | "unexplained",
   "closesIn": "F05" | "Faza 2" | ..., "expectedIds": ["measures.1.npvUsd", ...], "note": "..." }]` + `notModelled`.
   **Ikki tomonlama qoida (06 §2.5):**
   - tolerans ichida emas va `id` hech bir ochiq tafovutning `expectedIds` da yo'q → **yiqiladi** ("yangi tafovut");
   - `id` ochiq tafovutda bor, lekin tolerans ichida → **yiqiladi** ("o'z-o'zidan yopildi — divergences.json ni yangilang").
5. **Boshlang'ich ro'yxatni to'ldirish:** `bun run --cwd apps/api golden:report` (yangi skript) — joriy farqlarni
   `{ id, excel, actual, expected, deltaPct }` jadvali qilib chiqaradi. Ularni 06 §2.5 dagi D1–D8 ga va quyidagi
   kitobda ko'rilgan farqlarga guruhlang; hech biriga tushmaganini `unexplained` qiling (README §5):
   - **D9** — sokl/grunt/pol elementlari uchun ish-vaqti/noish-vaqti: v7.20 `Losses env. before` 42–57-qatorlarda devor va
     tom ikkala davrni oladi, `Socle 1`, `Socle 2`, `F1` faqat ish soatlarini, `F3` ikkalasini (×n); noish-vaqti Δt manfiy
     bo'lsa ham qo'shiladi (`K44` = −397,4 kWh) — dvigatel `Math.max(0, …)` qiladi (`heatloss.service.ts`). Avval sababini
     kitobdan tasdiqlang, keyin yozing.
   - **D10** — ISI taqsimot yo'qotishi `F11 = D11·(1−0,98·0,85)` va sovutish taqsimoti `F15 = D15·(1−0,96)` (F04 da yopiladi).
   - **D11** — soyalash (№9) va sovutish talabi (№19) kategoriyasi yo'q.
   - **D12** — `Breakdown Baseline & Balance!G13` dan `D9` gacha ISI va gelio blok taqsimoti (gelio elektr blokida).
6. `package.json` (`apps/api`): `"golden:report"`. Golden test oddiy `bun run test` ichida ishlaydi (alohida flag yo'q).

## Qabul mezonlari

- [ ] F03a: `inputs.json` deterministik; sha256 tekshiriladi; `computeAudit(inputs)` xatosiz ishlaydi.
- [ ] F03a: G0 (`Envelope!L95/M95`) tolerans ichida **yoki** sababi aniq tafovut (D4) — bloklar xaritasi buzilmaganining isboti.
- [ ] F03b: `bun run test` yashil; har `expected.id` mapping'da yoki `notModelled` da.
- [ ] F03b: qo'lda sinov — bitta ochiq tafovutni vaqtincha ro'yxatdan olib tashlash testni yiqitadi; qaytarilganda yashil (PROGRESS.md ga yozing).
- [ ] `divergences.json` da `unexplained` bo'lsa — PROGRESS.md da ro'yxat va loyiha egasiga savol.

## Qilmang

- Testni yashil qilish uchun tolerans kengaytirish yoki `inputs.json` ga Excel oraliq natijasini qo'yish (IHS!D34 istisnosidan tashqari).
- Dvigatelni o'zgartirish — F04 dan boshlab, har biri o'z tafovutini yopadi.
