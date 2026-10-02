# F08 — Pol: gruntdagi pol (zona usuli) va isitilmaydigan bo'shliq ustidagi pol (`n`-faktor)

**Manba:** 01 P0-5, §1.6 · X13, X26, X75, X83 · M3 · **Commitlar:** F08a (sxema + API + UI), F08b (dvigatel + testlar).
**Bog'liqlik:** F07. **Yopadi:** D3.

## Kitobdagi hisob (tekshirilgan, `U-values!Q108:U135`, `Losses env. before!20-23, 56-57`)

**F1 — gruntdagi pol, zona usuli (ShNQ 2.01.04 / SNiP II-3-79):** bitta blok `L × W` (3-DMTT: 50,3 × 12,8 m, 2 ta blok).
- Zonalar (2 m polosalar), maydon:
  `A_I = L·W − max(0,L−4)·max(0,W−4) + 16` (4 burchak 2×2 ikki marta), `A_II = max(0,L−4)·max(0,W−4) − max(0,L−8)·max(0,W−8)`,
  `A_III = max(0,L−8)·max(0,W−8) − max(0,L−12)·max(0,W−12)`, `A_IV = max(0,L−12)·max(0,W−12)`.
  3-DMTT: 252,4 / 204,4 / 172,4 / 30,64 m².
- `R_i = R_ni,i + ΣR_izol`, `R_ni` = 2,1 / 4,3 / 8,6 / 14,2 m²K/W; `ΣR_izol` — qatlamlardan faqat `0 < λ < 1,2` lari (`T118` SUMIFS).
  Oldin: 0,0658 → U_eq **0,28796**; keyin (XPS 100 mm + …): 2,8567 → U_eq **0,14961** W/m²K.
- `U_eq = Σ(A_i / R_i) / (L·W)` — maxraj **haqiqiy** pol maydoni (`R120` = 643,84), +16 siz. Rsi/Rse **qo'shilmaydi**.
- Yo'qotish: element maydoni (`Envelope!AH115` = 1 090,3 m² — qobiq elementlaridan, blok `L·W` dan **emas**) × U_eq × Δt × soat.
  Ya'ni zona geometriyasi (L, W) — **tur** (konstruksiya) xossasi, maydon — elementlardan.

**F3 — isitilmaydigan bo'shliq (podpol/kanal) ustidagi pol:** `U = 1/(ΣR + Rsi 0,115 + Rse 0,167)`, keyin `U·n`, `n = 0,4`
(ShNQ 2.01.04: yer ostidagi, teshiksiz isitilmaydigan bo'shliq). Oldin 1,9317 → **0,77269**; keyin 0,30224 → **0,12090**.

**Soat qoidasi (D9, alohida):** kitobda `F1` faqat ish soatlari bilan (`E56`), `F3` — ish + noish soatlari (`E57`). Bu farqni F08
yopmaydi — K22 savoli (F10). F08b dvigatelda mavjud ikki davrli hisobni qoldiradi, golden'da D9 ochiq qoladi.

## F08a — sxema, API, UI

1. `envelopeElementCategoryEnum` ga **qo'shish** (olib tashlash yo'q): `floor_ground`, `floor_over_unheated`. Mavjud `floor` — eski
   ma'lumot, avvalgidek oddiy `U·A·Δt` (+ `warnings[]`: "pol turi aniqlanmagan"). Zod va `enums.ts` bir commit'da (`database.md`).
2. `construction_type.temperature_reduction_factor` (real, nullable; null = 1): `floor_over_unheated` va `socle_unheated` uchun (X13 —
   hozir `socle_unheated` to'liq Δt bilan, ortiqcha baho). Zod: `.finite().gt(0).max(1)`; `floor_over_unheated` da majburiy.
3. `construction_type.ground_length_m`, `ground_width_m` (real, nullable): `floor_ground` turi uchun zona usulining namunaviy blok
   o'lchamlari (`U-values!S110:S111`). Zod: `floor_ground` da ikkalasi majburiy, `> 0 .max(1000)`. Element maydoni avvalgidek
   elementlardan.
4. `surface_resistance` ma'lumotnomasiga yangi kategoriyalar qatori — **versiyalangan migratsiya** (`database.md`: `generate --custom`,
   `INSERT OR IGNORE`): `floor_over_unheated` Rsi 0,115 / Rse 0,167 (v7.20 `U-values!T131:T132`); `floor_ground` — ishlatilmaydi,
   lekin qator qo'shing (Rsi/Rse 0 emas — zona usuli ularni chetlab o'tadi, izoh bilan).
5. Qobiq muharriri: kategoriya tanlovida yangi turlar, `floor_over_unheated`/`socle_unheated` da
   "Harorat koeffitsienti n" (`NumberInput`); `floor_ground` turida "Blok uzunligi/kengligi (m)". i18n — atamalarni PROGRESS.md da loyiha egasi tekshiruviga belgilang.

## F08b — dvigatel

1. `uvalue.service.ts`: `calculateGroundFloorUValue({ lengthM, widthM, layers })` — yuqoridagi zona usuli (sof funksiya).
   `R_ni` jadvali konstanta, manba izohi bilan.
2. Tur darajasida U: `floor_ground` — turning `ground_length_m × ground_width_m` va qatlamlaridan zona U_eq;
   `floor_over_unheated`/`socle_unheated` — `U·n`. Yo'qotish F06 dagi `(kategoriya, tur kodi)` guruhlarida element maydoni bilan.
   "Keyin" holatida retrofit turining qatlamlari bilan qayta hisoblanadi (zona maydonlari o'zgarmaydi).
3. `UValueResult`/hisobot: zona maydonlari va R lar `AuditResult` da ko'rinsin (Annex 2 uchun) — `hisobot.md` B-bo'lim qatoriga qo'shing.
4. Unit testlar: L 50,3 × W 12,8, oldin qatlamlar → 0,28796 (±0,0001); keyin → 0,14961; zonalar 252,4/204,4/172,4/30,64;
   `L < 4` (faqat I zona) va `L < 8` chekka holatlari; `U·n` = 0,77269.
5. `extract_inputs.py`: F1 → `floor_ground` (tur: 50,3 × 12,8 — `U-values!S110:S111`; elementlar `Envelope` dan), F3 → `floor_over_unheated`, `n = 0,4`.

## Qabul mezonlari

- [ ] Golden: `Losses env. before!F20, F21, G23` va `…after` mos kataklar U bo'yicha tolerans ichida; yo'qotishdagi qolgan farq faqat D9.
- [ ] `Measures_summary!E9` (№5) — D9 dan tashqari tolerans ichida.
- [ ] Eski `floor` kategoriyali binolar hisobi o'zgarmaydi (integratsiya testi) va ogohlantirish beradi.
- [ ] Migratsiyalar lokal D1'da; type-check, build, lint, test yashil.

## Qilmang

- ISO 13370 to'liq usuli (perimetr/maydon nisbati, `B'`) — v7.20 zona usulini ishlatadi; o'zingizcha "yaxshilamang".
- Mavjud `floor` qatorlarini avtomatik `floor_ground` ga ko'chirish — o'lchamlar yo'q, taxmin bo'ladi.
