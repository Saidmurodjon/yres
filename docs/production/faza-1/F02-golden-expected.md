# F02 — Golden ekstraktor: `expected.json` (v7.20 natijalari)

**Manba:** 06 §2.1–2.4 · **Commit:** bitta · Dvigatelga tegilmaydi.
**Fayllar (yangi):** `tools/golden/extract_expected.py`, `tools/golden/common.py`, `tools/golden/requirements.txt`,
`tools/golden/README.md`, `apps/api/tests/golden/fixtures/3-dmtt/v7.20/expected.json`, `.gitignore` (`tools/golden/.venv`).

## Printsiplar (06 §2.1)

- Kutilgan qiymat **qo'lda yozilmaydi** — faqat skript chiqaradi; JSON qo'lda tahrirlanmaydi.
- `meta`: `{ "workbook": "3-DMTT v7.20.xlsx", "sha256": "187d1996…f5a", "version": "v7.20", "lastDecision": "X98",
  "extractedAt": "<ISO>", "extractor": "tools/golden/extract_expected.py" }`. sha256 mos kelmasa — `exit 1`.
- **Yorliq tekshiruvi:** har katak manzili yonidagi yorliq bilan birga beriladi (masalan `("Measures_summary", "D38", label=("B38", "Total (all measures)"))`);
  yorliq matni mos kelmasa — xato bilan to'xtash (qator siljigan). `Measures_summary` chora-tadbir qatorlari raqam
  bo'yicha topiladi (B ustunida 1…19), `Financial indicators` bloklari `C2` (= chora-tadbir nomi) bo'yicha.
- Matnli natijalar (`"> 20"`, `"n/a (<0)"`, `"—"`) → `{ "kind": "none", "excel": "> 20" }`; Excel xato katagi
  (`#N/A`, `#REF!`) golden'ga **kirmaydi** (ekstraktor ogohlantirish chiqaradi, `skipped[]` ro'yxatiga yozadi).
- Har yozuv: `{ "id", "excel": "Sheet!Cell", "value" | "kind", "class": "G0".."G6" }`. `id` — barqaror nom
  (`measures.4.standardizedSavingsKwh`, `totals.all.capexUsd`, `balance.heat.theoreticalFinalKwh` …).
  Qaysi `AuditResult` maydoniga solishtirilishi — F03 da (bu yerda faqat Excel tomoni).

## Ajratiladigan nazorat nuqtalari (barchasi kitobda tekshirilgan)

| Guruh | Katak(lar) | Izoh / kutilgan qiymat |
|---|---|---|
| G0 geometriya | `Envelope!L95`, `M95` | 2 518,855 m² · 7 556,565 m³ |
| G1 qobiq oldin | `Losses env. before!G7, G9, G11, G13, G18, G19, G20, G21, G23, G25, G26, G28, G31, G32` | element (D ustuni kodi: W1, Socle 1., Socle 2, R1, F1, F3, Win2, Win3, D1) + jami 260 229,00 |
| G1 qobiq keyin | `Losses env. after!` mos qatorlar + `G28` jami | kodlarni D ustunidan o'qing |
| G1 U-qiymat | `Losses env. before!F7…F28`, `…after!F*` | element bo'yicha (F21 = U·n = 0,7727) |
| G1 tizimlar | `Overall gener. & distrib. eff.!D7, F7, H7, J7, L7, M7, N7, D11, F11, H11, J11, J12, N11, D15, F15, H15, J15, N15, H21, N21` | generatsiya/taqsimot |
| G1 boshqa | `Lighting!L11, L16, L17`, `Equipment!K49, K100, K102`, `PV!C25, C34, C35, C36, C38`, `Solar DHW!I13`, `EMS!D9, D10` | |
| G2 balans | `Breakdown Baseline & Balance!D4:D12, D15, F15, G4:G14, H4:H14, D16:D21, D25, F25, G16:G24, G25, H25` | D15 = 496 820,78 · F15 = 240 365,83 · F25 = 56 045 · H25 = 167 433,00 |
| G2 solishtirma | `…!G75, H75, H76` | 234,69 / 30,91 / −29,02 |
| G2 sinf (Faza 2) | `…!G78, H78, H84` | F / A / ZEB — matn, `class: "G2-text"` |
| G2 kalibrlash | `Measures_summary!D55, D56` | 0,483808 · 0,594117 |
| G3 chora-tadbir | `Measures_summary!` 5–23 qatorlar: `D, E, F, I, J, M, Q, R, S, T, U, V, W` | 19 ta; S = T/E/M (tashuvchi) |
| G3 non-EE | `Measures_summary!` 25–37: `C, D, Q` | 13 ta |
| G3 jamilar | `D38, E38, F38, I38, J38, T38, U38` va `D39, E39, F39, I39, T39, U39` | D38 = 975 113,37 · D39 = 706 124,26 |
| G3 tarkib | `D61, D62, D63, D64, D65, D67, E67, D68, E68, D71` | issiqlik nasosi tarkibi, balans nazorati, D71 = 0,974225 |
| G4 moliya | `Measures_summary!` 5–23: `G, H, K, L, N, O`; jami `G38, K38, N38, N39` | H/L/O ko'pincha `none` |
| G4 moliya (actual) | `Financial indicators` har blokning `D16` (actual NPV), `D22` (actual IRR) | blok qadami 24 qator, `C2` bo'yicha toping |
| G4 pul oqimi | №1 va №15 bloklar: 3-qator (yillar), 6, 8, 9, 10, 13, 17 qatorlar `D:X` | F05 uchun yil-ba-yil nazorat |
| G4 parametrlar | `Financial parameters!D5:D23` | D9 = 0,0608 · D13 = 0,04856 · D14 = 0,0404 |
| G5 CO₂ | `Measures_summary!P5:P23, P38`; `D43:F43` | P38 = 200,887 t/y |
| G6 Checks | `Checks!` — A-bo'lim natijalari (matn) | Faza 2; hozir faqat yozib qo'yiladi |

Sonli ro'yxatni to'liq qo'lda sanab bo'lmasa (masalan `Losses env. after` qatorlari), ekstraktor D ustunidagi kodlar
bo'yicha **o'zi** yig'sin va hech bir kod tushib qolmaganini tekshirsin (before'dagi kodlar ⊆ after'dagi kodlar + "o'zgarmagan").

## `tools/golden/README.md`

Qanday ishga tushirish (`python3 -m venv tools/golden/.venv && tools/golden/.venv/bin/pip install -r tools/golden/requirements.txt`,
`… extract_expected.py --xlsx "<yo'l>"`), kitob qayerda (§2 README), yangi Excel versiyasi chiqqanda tartib (06 §2.5 oxiri).

## Qabul mezonlari

- [ ] Skript ikki marta ishga tushirilganda `expected.json` faqat `extractedAt` da farq qiladi (deterministik tartib).
- [ ] JSON da `Measures_summary!E38` = 664 253,78…, `F38` = 23 784,885…, `D38` = 975 113,365, `G38` = 40,997…, `N38` = −654 709,02… bor.
- [ ] `skipped[]` bo'sh yoki har biri izohli.
- [ ] Noto'g'ri sha256 bilan `exit 1`; noto'g'ri yorliq bilan `exit 1` (qo'lda bir marta sinab, PROGRESS.md ga yozing).
- [ ] `bunx biome lint` JSON'ni formatlamaydi/sindirmaydi (kerak bo'lsa `biome.json` `files.ignore` ga fixtures yo'li).

## Qilmang

- Kitobni yoki uning nusxasini repo'ga qo'shish. `inputs.json` (F03). TS test (F03).
