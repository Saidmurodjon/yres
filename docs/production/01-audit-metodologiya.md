# 01 — Audit metodologiyasi: Excel v7.20 ↔ YRES dvigateli, kiritish bosqichlari va platforma qoidalari

> **Muallif roli:** energiya auditori / metodologiya eksperti (EN ISO 13790/52016, ShNQ 2.01.04, VM 277).
> **Sana:** 2026-09-27. **Holat:** tahlil hujjati — kod o'zgartirilmagan.
> **Manbalar:** `3-MTM/3-DMTT v5.xlsx`, `3-MTM/3-DMTT v7.20.xlsx` (openpyxl bilan o'qildi),
> `3-MTM/docs/{TARIX,V5_INVENTAR,277_QAROR_VA_LOYIHA,SAVOLLAR_LOYIHACHIGA,SKILL_MATERIALLARI}.md`,
> `3-MTM/CLAUDE.md` §1, `yres/docs/calculation-engine-audit.md`, `yres/apps/api/src/services/*.ts`,
> `yres/packages/db/src/schemas/*.ts`, `yres/packages/types/src/audit.ts`.
>
> Havola formati: `Varaq!Katak` — Excel; `fayl.ts:qator` — YRES kodi; `TARIX §sana` — 3-MTM tarixi.

---

## 0. Qisqa xulosa (boshqaruvchi uchun)

1. **YRES dvigateli `v5` ni takrorlaydi, `v7.20` ni emas.** v5 → v7.20 oralig'ida Excel'da ~80 ta
   defekt/qaror (`X19`–`X98`) kiritilgan; ulardan kamida **4 tasi YRES'da aynan takrorlangan**
   (X33 generatsiya formulasi, X38 chiziqli narx o'sishi, X86 nominal/real diskont, X93/X95 qo'sh hisob xavfi).
2. 🔴 **Eng xavflisi — X33:** `generation.service.ts:24-31` `(Need+Loss)·(2−η)` formulasini "Excel bilan
   paritet uchun" ataylab saqlaydi. Gaz qozon uchun yoqilg'ini kam ko'rsatadi; **issiqlik nasosi (COP 3,11)
   uchun natija MANFIY chiqadi** (`(2−3,11) < 0`). Excel v6'da `=(D+F)/G` ga tuzatilgan (`V5_INVENTAR.md` X33;
   baza 637 312 → 773 812 kWh/y). ZEB/IN loyihalarida (VM 277 majburiy COP ≥ 3) YRES yaroqsiz natija beradi.
3. 🔴 **Yoqilg'i almashtirish (gaz → elektr) modellashtirilmaydi.** Har chora-tadbirga bitta tashuvchi
   (`inferCarrierForMeasure`, `audit.engine.ts:904-921`); v7.20 esa har chora-tadbir tejashini gaz va elektr
   qismlariga ajratadi (`Measures_summary!T:W`) — IN chora-tadbiri: gaz +1 089 USD/y, elektr −1 768 USD/y.
4. 🔴 **"Keyin" holatida har kategoriya uchun bitta oyna/eshik turi** (`getEffectiveOpeningType`,
   `envelope.service.ts`). 3-MTM'ning haqiqiy qarori (X55/X98: derazalar ta'mirlanadi, faqat Win2 vitrajlari
   almashtiriladi) YRES'da kiritib bo'lmaydi.
5. 🔴 **Bir xil kategoriyadagi ikki chora-tadbir bir xil tejashni ikki marta oladi**
   (`resolveMeasureStandardizedSavingsKwh`, `audit.engine.ts:973+` — tejash kategoriya bo'yicha delta,
   chora-tadbir bo'yicha emas). v7.20'da 19 ta EE chora-tadbir (deraza ta'miri + vitraj + 2 xil eshik...) bor.
6. 🔴 **Nazorat qatlami yo'q.** v7.20 `Checks` varag'i: 13 ichki balans (A), 20 ta VM 277 talabi (C1–C20),
   9 sanity (S1–S9), 10 qo'shimcha (C21–C30). YRES'da ularning birortasi, EE toifasi (A…G) va ZEB darajasi yo'q.
7. 🔴 **Natija qayta tiklanmaydi.** `runFullAudit()` natijani saqlamaydi, `audit_run` faqat holatni saqlaydi
   (`packages/db/src/schemas/audits.ts`), `verify.ts` faqat bino nomi+sanani qaytaradi. Chiqarilgan hisobotni
   regulyator keyinroq tekshirsa — kirishlar o'zgargan bo'lsa, raqamlarni qayta hosil qilib bo'lmaydi.
8. **Moliyaviy model v5 darajasida:** diskont 4 % qattiq kodlangan (`audit.engine.ts:828,839`), inflatsiya yo'q,
   o'sish chiziqli (`financial.service.ts:45-47`), xizmat xarajati o'smaydi, tariflar global jadvalda
   (`energy_tariff` — `buildingId` yo'q). v7.20: `Financial parameters` varag'i (nominal 6,08 %, gaz 4,86 %,
   elektr 4,04 % murakkab o'sish, bazaviy yil 2027, FES eksport tarifi).
9. **Excel'ning o'zida ham "eskirgan izoh" muammosi bor** — platforma buni avtomatik yechishi kerak:
   `Checks` D-bo'limi "18 of 20" va "S3 352 USD/m², S4 28,0 y" deydi, joriy qiymat esa 16/20, 387,13 va 41,0;
   `Checks!H25` (C2) "NOT MET 43 %" deydi, formula esa 0,70 → OK; `Breakdown!E72` izohi "48,36 kW, 75 477 kWh/y",
   qiymat 150 955 kWh/y; `Checks` sarlavhasi hali "file: 3-DMTT v6.xlsx".
10. **Yaxshi tomonlar:** YRES X32 (tushumlar generatsiyadan oldin), X40 (tashuvchi bo'yicha actual/nazariy nisbat),
    diskontlangan qoplanish, non-EE ning jami investitsiyaga qo'shilishi, mexanik ventilyatsiya entalpiya yuki
    to'g'ri amalga oshirilgan (`calculation-engine-audit.md`).

**P0 ro'yxati** — §2.3 da.

---

## 1. v5 → v7.20: nima o'zgardi

### 1.1 Varaqlar tuzilmasi

| Varaq | v5 | v7.20 | O'zgarish mazmuni |
|---|---|---|---|
| `Sheet1` → **`Climate data`** | A1:R18 | A1:R18 | Nomi o'zgargan (X72); matnli haroratlar songa (X24) |
| `Building_data` | B2:D18 | B2:E22 | + `D19` ish kunlari/yil (250, MTT rejimi, X53); `D6` sovutiladigan maydon 0 → 2 518,86 (X5); `D10` 3,9 → 5,41 °C; `D11` −14 → −15 °C |
| `Envelope` | 125 qator | **217 qator** | Blok bo'yicha geometriya, fasad kalit-chizmasi, oriyentatsiya sputnik bo'yicha tuzatilgan (TARIX 08.09 (5)), isitiladigan maydon = brut − devor kesimi (X77), 16 ta chizma rasmi (v7.10) |
| `U-values` | 27 ustun | **39 ustun** | Pol gruntda — zona usuli `Q108:U121` (X75); pol F3 isitilmaydigan bo'shliq ustida `Q124:U135` (X83); SUMIFS mezoni lokaldan mustaqil (X82) |
| `Losses env. after` | 81 qator | 91 qator | Konvert CAPEX `L71:Q91` smetaga bog'langan (X57–X60, X68); deraza qatorlari `24`=Win4/V4, `25`=Win3 (ta'mir), `26`=D4 |
| `Ventilation losses` | 77 | 90 | Bazaviy — faqat tabiiy (X76); infiltratsiya keyin 0,15 (X51); rekuperator VENTS Micra 100 E ERV, η 0,86 (X90) |
| `IHS` | 21 | 34 | "Heat source (HP + MTB)": IN 2×65 kWt, oylik SCOP 3,11 (`IHS!B16:J34`, X89), MTB zaxira 2×75 kWt (X96) |
| `PV` | 29 | 38 | 96,72 kWp (X56); o'z iste'moli/eksport bo'linishi `B33:C38` (X88) |
| `Shading` | 30 ustun | 45 ustun | To'g'ri hisob 21–29-q. (X39), 58 kozirek CAPEX |
| `Breakdown Baseline & Balance` | 45 | **92** | Element bo'yicha konvert (48–64), elektr bloki, **EE toifa (67–92)**, ZEB darajasi (`84`), toifa chegaralari `86:92` |
| **`Checks`** | — | **yangi, 86 qator** | A1–A13, C1–C20 (VM 277), S1–S9, C21–C30, D-jamlanma |
| **`Financial parameters`** | — | **yangi** | Yagona moliyaviy parametrlar (X86) |
| `Financial indicators` | 17 blok (4 ta #REF!) | **21 blok** | 19 chora-tadbir + 2 jami; murakkab o'sish; sof tejash diskontlanadi; IRR boshlang'ich taxmin |
| `Measures_summary` | B3:Q48, 11 EE | **B3:W84, 19 EE + 13 non-EE** | T–W: gaz/elektr qismlari (USD); 55–56 actual/nazariy nisbat; 60–65 IN tarkibi; **66–70 balans nazorati**; 71 tushumlar tuzatmasi 0,974 (X94); 72–81 yakuniy jamlanma, EE toifa, ZEB |
| `Sheet2` | bo'sh | o'chirilgan | — |

### 1.2 Asosiy ko'rsatkichlar evolyutsiyasi

| Ko'rsatkich | v5 | v7.20 | Manba (v7.20) |
|---|---|---|---|
| Isitiladigan maydon | 2 515,42 m² | **2 518,86 m²** | `Building_data!D4` ← `Envelope!L95` |
| Jami investitsiya | 225 459 USD | **975 113 USD** | `Measures_summary!D38` (EE 725 738 — `D74`) |
| Taklif qilingan | 164 320 USD | 702 496 USD | `Measures_summary!D39` |
| Nazariy tejash | 527 517 kWh/y | **664 254 kWh/y · 23 785 USD/y** | `E38`, `F38` |
| Haqiqiy (kalibrlangan) tejash | 96 057 kWh/y | 339 841 kWh/y | `I38` |
| Oddiy qoplanish | 14,28 y | **41,0 y** | `G38`, `D78` |
| NPV (jami) | #REF!/#N/A | **−654 709 USD** | `M38` |
| CO₂ kamayishi | 122,0 t/y | 200,9 t/y | `P38` |
| Solishtirma oldin / keyin (FESsiz) | 223,75 / 33,99 (faqat isitish) | **234,69 / 30,91 kWh/m²·y** (jami yakuniy) | `Breakdown!D75/E75` |
| FES bilan | — | **−29,02 kWh/m²·y** (eksportchi) | `Breakdown` 76 |
| EE toifa | yo'q | **F → A** | `Breakdown` 78 |
| ZEB | yo'q | **ZEB** | `Breakdown` 84, `Measures_summary!D81` |
| Xato kataklar | 794 (Excel) / 3 138 (LibreOffice) | **0** | `Checks!E20` (A13) |

### 1.3 Metodologik o'zgarishlar (formula mantiqi)

| # | Mavzu | v5 | v7.20 | Havola |
|---|---|---|---|---|
| M1 | Generatsiya yakuniy energiyasi | `(Q+Qd)(1−η)+Qd+Q` | `(Q+Qd)/η` (COP uchun ham) | X33, `Overall!H5:H12, N5:N12` |
| M2 | Tushumlar | generatsiyadan keyin ayiriladi | generatsiyadan **oldin** (COP'ga bo'lishdan oldin) | X32, `Overall!D7,J7` |
| M3 | Pol | yer sirt qarshiligi podpol ustidagi yopmaga (U 0,428) | F1 gruntda zona usuli + F3 isitilmaydigan bo'shliq ustida (n = 0,4) | X26, X75, X83 |
| M4 | Bazaviy ventilyatsiya | tabiiy + mexanik | faqat tabiiy (mavjud binoda AHU yo'q) | X76 |
| M5 | Ish rejimi | 7 kun, 1 660+900 soat | 250 kun × 10 soat = 2 500 soat | X53, `Checks` C28 |
| M6 | Narx o'sishi | `1,08+0,08·(y−y0)` chiziqli | `(1+g_nom)^(y−y0)`, gaz/elektr alohida | X38, X86 |
| M7 | Diskont | 4 % (inflatsiyasiz, oqimlar esa nominal) | real 4 % + inflatsiya 2 % → nominal 6,08 % (Fisher) | X86, `Financial parameters` |
| M8 | Diskontlanadigan oqim | yalpi tejash (xizmat xarajati tushib qolgan) | **sof** tejash | X86 |
| M9 | Chora-tadbir tejash taqsimoti | `Breakdown` I-ustunining mos kelmaydigan qatorlari | `I = E × nisbat` (issiqlik 0,48, elektr 0,59) | X40, `Measures_summary!D55:D56` |
| M10 | Chora-tadbirlar yig'indisi ↔ balans | tekshirilmagan | `F67` gaz, `F68` elektr — farq < 1 % | X93–X95 |
| M11 | Tushumlarning kamayishi | e'tiborsiz | `D71` = 1 + H12/ΣH4:H8 = 0,974 barcha konvert tejashlariga | X94 |
| M12 | BEMS | 3 % yassi, komponentlarda ham (qo'sh) | EN ISO 52120-1 C→B, f_th 0,88 / f_el 0,93 | X35, X87 |
| M13 | FES | tejash = generatsiya | o'z iste'moli 77 855 + eksport 73 100 kWh/y, eksport tarifi | X88 |
| M14 | CAPEX | qo'lda terilgan, formuladan uzilgan | yagona narx bazasi — buyurtmachi smetasi "Ю КГ 3" (604 pozitsiya) | X57–X60 |
| M15 | Demontaj | aralash | chora-tadbir uchun zarur demontaj → EE CAPEX; chiqindi olib chiqish → non-EE | X60 |
| M16 | Parapet | EE | isitiladigan qobiqdan yuqorida → non-EE (tejash 0 ↔ investitsiya 0) | X49, `Checks` C23 |
| M17 | Qaror bekor qilish | — | X97 (v7.19) bekor qilindi, fayl muzlatilgan "❌", v7.20 = v7.18 + X98 | TARIX 27.09 |

### 1.4 VM 277 nazorat ro'yxati (`Checks` B-bo'lim, v7.20 holati)

| Kod | Talab (VM 277) | Formula (`Checks!E`) | Chegara | Natija |
|---|---|---|---|---|
| C1 | FES ≥ 50 % elektr (6-ilova 2.1) | `PV!C25/SUM(Breakdown!G16:G21)` = 1,79 | ≥ 0,50 | OK |
| C2 | Gelio ≥ 60 % IsSuv | `'Solar DHW'!I13/'DHW generation'!K36` = 0,70 | ≥ 0,60 | OK (izoh eskirgan: "43 % NOT MET") |
| C3 | COP ≥ 3,0 (4-ilova 10-band) | `Overall!M7` = 3,11 | ≥ 3,0 | OK |
| C4 | Rekuperator majburiy | `'Ventilation losses'!H45` = 0,86 | > 0 | OK |
| C5 | Bazalt ρ ≤ 50, ≥ 100 mm | qatlamlar | — | OK (smetada ρ = 80 — izohda) |
| C6 | Devor R₀ ≥ 3,61 | `1/'U-values'!O17` = 3,64 | ≥ 3,61 | OK |
| C7 | Tom R₀ ≥ 3,35 | `1/'U-values'!O91` = 6,50 | ≥ 3,35 | OK |
| C8 | Pol R₀ ≥ 3,92 | `1/'U-values'!O122` = 6,68 | ≥ 3,92 | OK |
| C9 | Deraza/vitraj/eshik U ≤ 1,38 | `MAX('Losses env. after'!F24:F26)` = 2,94 | ≤ 1,38 | **FAIL (qabul qilingan, qaror 27.09)** |
| C10 | PVC 2-kamerali, og'ma | tavsif (qo'lda) | — | **FAIL (qabul qilingan)** |
| C11 | Tashqi quyosh himoyasi | `'Losses env. after'!Q89` | > 0 | OK |
| C12 | Tambur-vestibyul | tavsif (qo'lda) | — | OK |
| C13 | 100 % LED + sensor | `Lighting!H13` = 1 | = 1 | OK (sensor faqat 56/382 — formula tekshirmaydi) |
| C14 | BEMS | `EMS!C14` | > 0 | OK (narx ⚠ taxminiy) |
| C15 | VFD | `EMS!D11` | > 0 | OK |
| C16 | Bufer bak | tavsif (qo'lda) | — | **FAIL (qabul qilingan)** |
| C17 | Oldindan izolyatsiyalangan quvur | `'Heat distr. efficiency'!F17` = 1 | = 1 | OK |
| C18 | Fankoyl | `Equipment!H94` | > 0 | OK |
| C19 | Akkumulyator | `PV!E30` = 0 | > 0 | **FAIL (qabul qilingan)** |
| C20 | EE toifa ≥ C | `Breakdown!H78` = A | A/B/C | OK |

Sanity (`Checks` C-bo'lim): **S3** solishtirma investitsiya 387,13 USD/m² (200–300) — FAIL; **S4** oddiy
qoplanish 41,0 y (8–20) — FAIL. ⚠ **Nomlash to'qnashuvi:** `Checks` dagi `S3/S4` (sanity) va
`SAVOLLAR_LOYIHACHIGA.md` dagi `S3/S4` (loyihachiga savollar) — bir xil prefiks, boshqa ma'no. Platformada
nomlar maydoni ajratilishi shart (§4.2).

Jami: 51 OK / 6 FAIL (4 tasi "qabul qilingan FAIL" — auditor/buyurtmachi qarori bilan), xato 0 (`3-MTM/CLAUDE.md` §1).

### 1.5 Qaror jurnali (X-log) — tuzilma namunasi

| X | Sana | Tur | Mazmun | Holat |
|---|---|---|---|---|
| X55 | 24.09 | Loyiha qarori (smetadan) | Derazalar almashtirilmaydi | Faol |
| X81 | 24.09 | Metodik | Deraza ta'miri: infiltratsiya 0,20 → 0,15 ulushi (8 213 kWh/y) ventilyatsiyadan derazaga; ta'mir CAPEX non-EE → EE | Faol |
| X96 | 24.09 | Auditor qarori | MTB 2×150 → 2×75 kWt, narx proporsional ⚠ | Faol, taxminiy |
| X97 | 27.09 | Qaror (noto'g'ri tushunilgan) | Derazalar almashtiriladi | **Bekor** (v7.19 ❌) |
| X98 | 27.09 | Qaror (tasdiqlangan) | Derazalar ta'mir; Win2 vitraj (67,86 m², 1223-ВИТ) almashtiriladi | Faol |

X97→X98 holati platforma uchun asosiy saboq: **qaror bekor qilinishi** o'chirish emas, "superseded" holati
bilan qayd etilishi va bekor qilingan versiya muzlatilishi kerak.

### 1.6 Excel'dagi 18 ta v5 xatosi (+ keyingilari) YRES'da takrorlanganmi

`calculation-engine-audit.md` faqat `data-dictionary.md` "Ambiguities" dagi 10 bandni tekshirgan —
`V5_INVENTAR.md` §5 dagi X1–X18 va keyingi X19–X98 bilan solishtirilmagan. To'liq solishtirish:

| X | Mazmun | YRES holati | Havola |
|---|---|---|---|
| X1–X3, X6b–X6d, X14, X15, X24, X25, X27–X29, X34 | #REF!/matnli son/VLOOKUP/SUMIF diapazoni | **Ahamiyatsiz** — DB/tiplangan arxitektura | `calculation-engine-audit.md` |
| X4 | Bo'sh qatlamli konstruksiya → #DIV/0! | ⚠ **Jim o'tadi**: qatlamsiz konstruksiya U = 1/(Rsi+Rse) ≈ 6 beradi, ogohlantirish yo'q | `uvalue.service.ts:28-37` |
| X5 | Sovutiladigan maydon 0 | ⚠ `netCooledFloorAreaM2` default 0, validatsiya yo'q | `schemas/buildings.ts:28` |
| X6, X6a | Qoplanish/IRR topilmaydi | ✅ `null` qaytariladi; hisobotda "n/a (>20)" / "n/a (<0)" yozuvi kerak | `financial.service.ts` |
| X7 | Manfiy sof devor maydoni | ⚠ **Yashiriladi**: `Math.max(0, …)` — kiritish xatosi 0 ga aylanadi, ogohlantirishsiz | `envelope.service.ts:95-99` |
| X8, X10 | CAPEX miqdor/birlik bilan bog'lanmagan | ⚠ Chora-tadbir CAPEX'i bitta raqam (`investmentCostUsd`), miqdor×narx×birlik yo'q | `schemas/measures.ts` |
| X9 | Pol U o'zgarmagan → manfiy "tejash" | ⚠ Manfiy tejash tekshiruvi yo'q (`Checks` S8) | — |
| X11 | Gelio ehtiyojdan 1,94× ko'p → ortiqcha "tejash" | 🔴 **Takrorlanadi**: tejash = generatsiya, IsSuv ehtiyoji bilan cheklanmaydi | `audit.engine.ts` `case "solar_dhw"` |
| X12 | IsSuv 13 kishi vs 418 | 🔴 **Takrorlanishi mumkin**: `dhwSource.personsServed` `occupantCount` dan mustaqil, nazorat yo'q | `dhw.service.ts:3-7` |
| X13 | Isitilmaydigan sokl yo'qotishi 0 | ⚠ Teskari: `socle_unheated` to'liq U·A·Δt bilan (b-koeffitsient yo'q) — ortiqcha baho | `envelope.service.ts:123` |
| X16–X18 | Kasalxona shabloni qoldiqlari | ⚠ Bino turiga bog'liq me'yor jadvallari yo'q (ichki tushum 6 W/m² qattiq kodlangan) | `audit.engine.ts:~405` |
| X26, X75, X83 | Pol: grunt/bo'shliq usuli | 🔴 **Yo'q**: pol oddiy U·A·Δt, zona usuli/b-koeffitsient yo'q | `heatloss.service.ts` |
| X32 | Tushumlar generatsiyadan oldin | ✅ To'g'ri (tushumlar isitish balansida) | `audit.engine.ts:398-410` |
| **X33** | Generatsiya formulasi `(Q+Qd)(2−η)` | 🔴 **AYNAN TAKRORLANGAN** (izohda "paritet uchun" deb yozilgan) | `generation.service.ts:11-31`, `audit.engine.ts:556` |
| X35 | BEMS qo'sh hisobi | ✅ Qo'sh hisob yo'q, lekin 3 % yassi va tashuvchi "gas" deb olinadi | `audit.engine.ts:96, 910` |
| X36 | FES qoplamasi sof iste'molga solishtirilgan | ⚠ Qoplama umuman hisoblanmaydi | — |
| **X38** | Narx o'sishi chiziqli | 🔴 **TAKRORLANGAN**: `base·(1+rate·(y−1))` | `financial.service.ts:40-47` |
| X39 | Soyalash hisobi | ⚠ Chora-tadbir kategoriyasi yo'q | `enums.ts` `measureCategoryEnum` |
| X40 | Tashuvchi bo'yicha actual nisbat | ✅ To'g'ri | `calculation-engine.md` |
| X51–X54 | Infiltratsiya, SFP, ish soati | ⚠ Nazorat chegaralari yo'q; IsSuv 365 kun (MTT 250) | `dhw.service.ts:26` |
| X77 | Isitiladigan maydon = brut − devor kesimi | ⚠ Blok `footprint L×W×qavat` dan — ichki/tashqi o'lcham qoidasi aniqlanmagan | `audit.engine.ts:186` |
| **X86** | Diskont nominal/real, xizmat inflatsiyasi | 🔴 **TAKRORLANGAN**: 4 % qattiq, inflatsiya yo'q, xizmat o'smaydi | `audit.engine.ts:828,839`; `financial.service.ts:50` |
| **X93/X95** | Qo'sh hisob (devor+poydevor, deraza+infiltratsiya) | 🔴 **Umumlashgan shaklda takrorlanadi**: bir kategoriyadagi har chora-tadbir butun kategoriya deltasini oladi | `audit.engine.ts:990-1003` |
| X94 | Tushumlar kamayishi tuzatmasi | 🔴 Yo'q — konvert tejashlari yig'indisi balansdan oshadi | — |
| X55/X98 | Oynalarning bir qismi almashtiriladi | 🔴 Imkonsiz: "keyin" da kategoriya bo'yicha bitta tur | `envelope.service.ts` `getEffectiveOpeningType` |

---

## 2. YRES dvigateli qamrovi: v7.20 funksiyalari bo'yicha

### 2.1 Jadval

| Excel v7.20 funksiyasi | YRES holati | Ustuvorlik | Izoh |
|---|---|---|---|
| Iqlim (oylik harorat, isitish kunlari) | Bor | — | `climate` sxemasi |
| Bino parametrlari (`Building_data`) | Qisman | P1 | Ish kunlari/yil (`D19`) yo'q; ichki tushum, inersiya qattiq kodlangan |
| Blok geometriyasi, isitiladigan maydon | Qisman | P1 | Maydon o'lchash qoidasi (ichki/tashqi, X77) va ТЭП bilan solishtirish (X80) yo'q |
| Konvert elementlari, oriyentatsiya | Bor | — | `envelope_element` |
| U-qiymat qatlamlardan (ISO 6946) | Bor | — | `uvalue.service.ts` |
| Pol gruntda — zona usuli (ISO 13370/ShNQ) | Yo'q | **P0** | X75, X83; bazaviy iste'molga ±30 % ta'sir (S14) |
| Isitilmaydigan bo'shliqqa b-koeffitsient | Yo'q | **P0** | X13, X83 (n = 0,4) |
| Oynalar: har ochiq joy uchun alohida "keyin" holati | Yo'q | **P0** | X55/X81/X98 |
| Konvert yo'qotishlari oylik oldin/keyin | Bor | — | `heatloss.service.ts` |
| Tabiiy/mexanik ventilyatsiya, rekuperatsiya | Bor | — | `ventilation.service.ts` |
| Infiltratsiya ulushini deraza chora-tadbiriga berish | Yo'q | P1 | X81 |
| Ichki + quyosh tushumlari, foydalanish koeffitsienti | Qisman | P1 | 6 W/m² × 24 h qattiq; bino turiga bog'liq bo'lishi kerak |
| Taqsimlash (quvur) yo'qotishlari | Bor | — | Yillik agregat |
| IsSuv ehtiyoji | Qisman | P1 | 365 kun; `personsServed` nazoratsiz (X12) |
| Generatsiya: `(Q+Qd)/η`, COP/SCOP | **Noto'g'ri** | **P0** | X33; IN uchun manfiy |
| Oylik SCOP (IN) | Yo'q | P2 | `IHS!B16:J34` |
| Zaxira manba (bivalent, ulush 0 %) | Qisman | P2 | `shareOfDemand` bor, "zaxira" tushunchasi yo'q |
| Sovutish (quyosh, uskuna, mex. vent. entalpiya, SEER) | Bor | — | `cooling.service.ts` |
| Soyalash (g, rafshtora) | Qisman | P1 | `shadingFactor` bor, chora-tadbir kategoriyasi yo'q |
| Yoritish | Bor | — | Bino turi normalari yo'q (X18) |
| Uskunalar | Bor | — | |
| FES: generatsiya | Bor | — | Oylik PVGIS kiritish |
| FES: o'z iste'moli / eksport / eksport tarifi | Yo'q | **P0** | X88; summary 0 ga qirqiladi (`Math.max(0, …)`, `audit.engine.ts` `buildAuditSummary`) — ZEB/−29 kWh/m² ko'rinmaydi |
| Gelio: ehtiyoj bilan cheklash | Yo'q | P1 | X11 |
| BEMS (EN ISO 52120-1 faktorlari) | Qisman | P1 | 3 % yassi; tashuvchi "gas" |
| Energobalans (baseline ↔ hisob) | Qisman | P1 | `energyBalanceBreakdown` bor; balans yopilish nazorati yo'q |
| Actual/nazariy kalibrlash | Bor | — | Tashuvchi bo'yicha nisbat |
| Chora-tadbir tejashi — chora-tadbir darajasida (kategoriya emas) | Yo'q | **P0** | X93/X95 |
| Tushumlar kamayishi tuzatmasi (D71) | Yo'q | P1 | X94 |
| Chora-tadbir tejashining gaz/elektr qismlari (yoqilg'i almashtirish) | Yo'q | **P0** | `Measures_summary!T:W` |
| Konvert tejashini yakuniy energiyaga o'tkazish (÷η bazaviy qozon) | Tekshirilsin | **P0** | YRES konvert deltasini (foydali) to'g'ridan-to'g'ri gaz tarifiga ko'paytiradi; v7.20 `Measures_summary!D61` "baseline boiler η = 0,58" orqali |
| Non-EE ishlar | Bor | — | Jami investitsiyaga qo'shiladi |
| "Barcha" va "taklif qilingan" jamilari alohida | Qisman | P1 | YRES faqat taklif qilingan + barcha non-EE (`D38` vs `D39` farqi yo'q) |
| CAPEX = miqdor × birlik narx, smeta pozitsiyasiga havola | Yo'q | P1 | X57–X60; `sourceSheetRef` matn maydoni bor |
| Moliyaviy parametrlar (loyiha darajasida) | Yo'q | **P0** | Diskont, inflatsiya, bazaviy yil, o'sish, kurs |
| Murakkab narx o'sishi | Noto'g'ri | **P0** | X38 |
| NPV, IRR, oddiy/diskontlangan qoplanish | Bor | — | IRR boshlang'ich taxmin 0,1 (Excel 0,05) |
| Pul oqimi jadvali `AuditResult` da | Yo'q | P1 | `hisobot.md` F-bo'lim |
| CO₂, birlamchi energiya | Qisman | P1 | CO₂ bor; birlamchi energiya faktori sxemada bor, hisoblanmaydi |
| Tariflar/kurs loyiha va sana bo'yicha | Yo'q | **P0** | `energy_tariff` global, `buildingId` yo'q |
| EE toifa (A–G) | Yo'q | **P0** | `Breakdown` 67–92; VM 277: ≥ C majburiy |
| ZEB darajasi (ZEB/NZEB/Ready/Oriented) | Yo'q | P1 | VM 277 4-ilova 1-jadval |
| `Checks`: ichki balans A1–A13 | Yo'q | **P0** | |
| `Checks`: VM 277 C1–C20 | Yo'q | **P0** | |
| `Checks`: sanity S1–S9, C21–C30 | Yo'q | P1 | |
| "Qabul qilingan FAIL" (asoslangan istisno) | Yo'q | P1 | C9/C10/C16/C19 |
| Taxmin (⚠) belgisi har qiymatda | Yo'q | **P0** | v7.20 da 26 ta |
| Qaror jurnali (X-log) | Yo'q | **P0** | |
| Versiyalash, natija snapshot'i | Yo'q | **P0** | `audit_run` natijasiz |
| Auditor imzosi/tasdiq | Yo'q | P1 | |
| Hisobot (WB shabloni bo'limlari) | Qisman | P1 | `.claude/rules/hisobot.md` holat jadvali |

### 2.2 Tushuntirish: X33 nima uchun P0

`generation.service.ts:24-31`:
```ts
return needPlusLoss * (1 - generationEfficiency) + distributionLossKwh + usefulEnergyNeedKwh;
```
- Gaz qozon η = 0,58: YRES `(Q+Qd)·1,42`, to'g'risi `(Q+Qd)/0,58 = (Q+Qd)·1,72` → yoqilg'i **17 % kam**,
  demak baseline kalibrlash nisbati va barcha "actual" raqamlar siljiydi.
- IN COP = 3,11: YRES `(Q+Qd)·(−1,11)` → **manfiy elektr iste'moli**; `buildAuditSummary` manfiy qiymatni
  yig'adi, keyin FES bilan `Math.max(0, …)` ga qirqadi — xato ko'rinmay qoladi.
- `calculation-engine.md` qoidasi "jadvalga sodiqlik" deydi — lekin haqiqat manbai endi **v7.20**, v5 emas.
  Qoida matnini yangilash kerak (loyiha egasi qarori — Ochiq savollar Q1).

### 2.3 P0 ro'yxati (production'dan oldin majburiy)

| # | Ish | Asos |
|---|---|---|
| P0-1 | Generatsiya formulasini `(Q+Qd)/η` ga o'tkazish (COP/SCOP bilan) + regressiya testi v7.20 `Overall!H8` ga | X33 |
| P0-2 | Chora-tadbir tejashini tashuvchi bo'yicha ajratish (gaz/elektr/…; manfiy qism ruxsat) → yoqilg'i almashtirish | `Measures_summary!T:W` |
| P0-3 | Tejashni chora-tadbir darajasida aniqlash (qaysi element/ochiq joy/tizimga tegishli) + Σ chora-tadbir = balans nazorati | X93–X95, `F67/F68` |
| P0-4 | Har ochiq joy (oyna/vitraj/eshik guruhi) uchun alohida "keyin" holati: saqlanadi / ta'mir / almashtiriladi | X55, X81, X98 |
| P0-5 | Pol: grunt (zona usuli) va isitilmaydigan bo'shliq (b-faktor) | X26, X75, X83 |
| P0-6 | Loyiha darajasidagi moliyaviy parametrlar: bazaviy yil, davr, inflatsiya, real diskont → nominal, gaz/elektr real o'sish → nominal murakkab, xizmat inflatsiyasi, kurs, tariflar (sana bilan), FES eksport tarifi | X38, X86, `Financial parameters` |
| P0-7 | FES: o'z iste'moli/eksport, summary manfiy bo'lishi mumkin (0 ga qirqish olib tashlanadi) | X88 |
| P0-8 | EE toifa hisobi (shkala konfiguratsiya qilinadigan, manbasi bilan) | VM 277 3-band, `Breakdown` 67–92 |
| P0-9 | Nazorat dvigateli: A (balans), C1–C20 (VM 277), natija OK/FAIL/NOTE/ACCEPTED_FAIL + izoh avtomatik | `Checks` |
| P0-10 | Taxmin belgisi va manba har kiritilgan qiymatda (§4.1) | CLAUDE.md §5.1 |
| P0-11 | Qaror jurnali (X-log) + "superseded" holati | X97→X98 |
| P0-12 | Chiqarilgan hisobot uchun kirishlar + natijalar snapshot'i (o'zgarmas), xesh, `verify` da tekshirish | §6 |

---

## 3. Auditor uchun ma'lumot kiritish bosqichlari

Umumiy tamoyil: har bosqich **"to'liq/tasdiqlangan"** holatiga o'tmaguncha keyingi bosqich hisob-kitobi
"qoralama" deb belgilanadi. Har maydon: qiymat + birlik + **manba** (hujjat, bet/katak) + **ishonchlilik**
(o'lchangan / hujjatdan / taxmin ⚠).

### 3.1 Bosqich 1 — Dala tekshiruvi (walkthrough)

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Obyekt, manzil, koordinata, bino turi, qurilgan yil | Walkthrough varag'i (`Walkthrough EA 3-DMTT.xlsx`) | Koordinata viloyat chegarasida | Shablon qoldig'i (X16–X18: kasalxona matnlari MTT da) |
| Ish rejimi: kun/yil, soat/kun, smena, dam olish | Muassasa ma'lumotnomasi | MTT 250×10; maktab ≈ 200; kasalxona 365×24 | 7-kunlik/24-soatlik standart qoldiq (X53) |
| Odamlar soni (bolalar + xodimlar) | Muassasa | IsSuv/ventilyatsiya bilan bir xil son | X12 (13 vs 418) |
| Mavjud tizimlar: qozon turi/quvvati/yili, radiatorlar, quvur izolyatsiyasi, IsSuv, konditsionerlar, yoritish tarkibi (% LED) | Ko'zdan kechirish, foto | Har tizim uchun foto majburiy | X47: yoritish 98 % LED bo'lgan, model lyuminessent deb olgan |
| Deraza/eshik holati (tur, ramka, zichlik) | Ko'zdan kechirish | Har tur uchun foto + soni | Oyna turlari aralashtiriladi |
| Oriyentatsiya | Sputnik tasvir + kompas | Fasad azimuti ±15° | TARIX 08.09 (5): oriyentatsiya nuqsoni, natija o'zgargan |

### 3.2 Bosqich 2 — Kadastr va loyiha hujjatlari

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Bloklar: uzunlik, kenglik, qavatlar, qavat balandligi, xona balandligi | Chizmalar (A/B/Б-blok), kadastr PDF | Σ blok maydoni ↔ ТЭП ±5 % (X80: 2 518,86 vs 2 346,9 — izohlangan farq) | Blok nomlash chalkashligi (smeta А/Б/В ↔ chizma A/B/Б ↔ v5 A/B/C) |
| Isitiladigan maydon qoidasi | Metodika tanlovi | Qoida aniq belgilanadi: brut − devor kesimi (X77) | Tashqi o'lcham bilan hisob |
| Isitiladigan hajm chegarasi (cherdak, yerto'la) | Kesim chizmasi | Qobiq balandligi ≤ isitiladigan hajm | X43: devor 6,80 → 6,00 m (sovuq cherdak ustida) |
| Loyihaviy U/R₀ talablari | Chizma "Общие данные" | VM 277 va ShNQ bilan solishtirish | — |
| Smeta (narx bazasi) | Buyurtmachi smetasi (asl ruscha) | Σ pozitsiya = smeta jami (C24) | Birlik xatosi (S2: gelio ×300), bloklarda takrorlanish (S1) |

### 3.3 Bosqich 3 — Qobiq (envelope)

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Element: kategoriya, oriyentatsiya, uzunlik, balandlik (havo/grunt bilan aloqa), chegara turi (tashqi havo / grunt / isitilmaydigan bo'shliq / qo'shni isitiladigan) | Chizma fasadlari | Sof maydon > 0 (manfiy → xato, 0 ga qirqilmaydi — X7) | Parapet qobiqqa kiritilgan (X49) |
| Ochiq joylar: tur, o'lcham, soni, **"keyin" harakati** (saqlanadi/ta'mir/almashtiriladi + yangi tur) | Spetsifikatsiya | Σ oyna maydoni ↔ smeta ±2 % (X98: 67,86 vs 68,85 m²) | Vitraj/eshik aralashtiriladi |
| Konstruksiya qatlamlari: material, qalinlik, λ | Chizma uzellari, material katalogi | λ katalog oralig'ida; qatlamsiz konstruksiya — xato | λ terish xatosi (X44: 0,058 → 0,76) |
| Sirt qarshiliklari (Rsi/Rse) — chegara turiga qarab avtomatik | ISO 6946 | Pol gruntda Rse yo'q, zona usuli | X26 (pol U 0,428 imkonsiz) |
| Oynalar: U, g, ramka ulushi, soyalash | Pasport | U 0,8–6,0; g 0,2–0,9 | — |

### 3.4 Bosqich 4 — Muhandislik tizimlari

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Generatsiya: tur, quvvat, η/COP/SCOP (oldin/keyin), ulush, tashuvchi | Pasport, walkthrough | η ≤ 1,1 yonish uchun; COP 2–6 IN uchun; Σ ulush = 1 | Pasport topilmasa analog (X89) — ⚠ belgisi majburiy |
| Hisobiy issiqlik yuklamasi (UA·Δt + ventilyatsiya) | Avtomatik | Quvvat/yuklama ≤ 1,5 (zaxira alohida) | Oversizing (X96: 2×150 → 2×75; TARIX 08.09 tun) |
| Taqsimlash: quvur uzunligi, izolyatsiya ulushi | Chizma ОВ | 0–1 | — |
| Ventilyatsiya: tabiiy n, infiltratsiya, mexanik oqim, η rekuperator, SFP, ish soati | Loyiha ОВ | Jami havo 0,8–1,2 1/h (C29); 12–20 m³/h·kishi (C30); SFP ≤ 1 800 (C27) | Qo'sh hisob (X51–X52) |
| IsSuv: l/kishi·kun, kishi, kun/yil | Me'yor | Kishi = bino odamlari | X12 |
| Yoritish, uskunalar, sovutish | Ro'yxat | W/m² oraliq | — |
| QTEM: FES (kWp, oylik PVGIS), gelio | PVGIS, smeta | Tom maydoni ≥ 10 m²/kWp (S7); gelio ≤ ehtiyoj (X11) | Tom maydoni noto'g'ri (X45) |

### 3.5 Bosqich 5 — Iste'mol (baseline)

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Oylik hisob-fakturalar ≥ 2–3 yil, tashuvchi bo'yicha (natural birlik + kWh + summa) | Kommunal hisoblar | Oylik mavsumiylik; yillar orasida ±30 % | Bo'sh blok → #DIV/0 (X6b); gaz xarajati elektr tarifida (X85) |
| Konversiya koeffitsientlari (gaz 9,5 kWh/m³, 1 Gkal = 1 163 kWh) | Qoida | Loyiha parametri | — |
| Baseline yillari tanlovi | Auditor qarori | X-log'ga yoziladi | — |

### 3.6 Bosqich 6 — Chora-tadbirlar

| Majburiy maydonlar | Manba | Validatsiya | Tipik xatolar |
|---|---|---|---|
| Nomi, turi (EE / non-EE / himoya), qaysi element(lar)/tizimga ta'sir qiladi | Auditor + smeta | Har EE chora-tadbir kamida bitta obyektga bog'langan; bitta obyekt ikki chora-tadbirda — ogohlantirish | Qo'sh hisob (X93, X95) |
| CAPEX: miqdor × birlik narx, smeta pozitsiyasi(lari), demontaj ulushi | Smeta | Σ = smeta jami (C24); USD/m², USD/kWt oralig'i | X10 (birlik), qo'lda uzilgan CAPEX (V5_INVENTAR §5-D) |
| Xizmat muddati, xizmat % | Me'yor (EN 15459) | 10–50 y | — |
| Taklif qilingan (Ha/Yo'q) + sabab | Auditor | "Yo'q" sababi majburiy | Bo'sh qatorlar "Yes" (X15) |

### 3.7 Bosqich 7 — Moliyaviy

| Majburiy maydonlar | Manba | Validatsiya |
|---|---|---|
| Bazaviy yil, davr, real diskont, inflatsiya, real o'sish (tashuvchi bo'yicha), kurs (sana+manba), tariflar (qaror raqami+sana), eksport tarifi | `Financial parameters` analogi | Nominal = (1+r)(1+i)−1 avtomatik; tarif manbasiz — ⚠ |

### 3.8 Bosqich 8 — Tekshiruvlar

Avtomatik (§4.4, §6). FAIL → auditor yo tuzatadi, yo "qabul qilingan FAIL" sifatida **asos + qaror sanasi +
kim** bilan yopadi. Ochiq FAIL bilan hisobot "yakuniy" holatga o'tmaydi.

### 3.9 Bosqich 9 — Hisobot

WB namuna tuzilishi (`.claude/rules/hisobot.md`) + nazorat natijalari ilovasi + X-log ilovasi + taxminlar
ro'yxati. Hisobot chiqarilganda snapshot muzlatiladi (§4.3).

---

## 4. Metodologik qoidalar (platforma qoidalari)

### 4.1 Taxmin va manba

- **R1.** Har kiritiladigan qiymat `provenance` ga ega: `measured | document | standard | estimate | derived`,
  `sourceRef` (hujjat + bet/katak/pozitsiya, masalan `[Смета Ю КГ 3, ОВ 60]`), `note`.
- **R2.** `estimate` qiymatlar hisobotda ⚠ belgisi bilan va alohida "Taxminlar" ilovasida chiqadi
  (v7.20: 26 ta, masalan BEMS 15 USD/m², MTB narxi, USD inflatsiyasi).
- **R3.** Taxmin natijaga ta'siri katta bo'lsa (masalan > 5 % investitsiya) — sezgirlik ko'rsatiladi.
- **R4.** Izohlar raqamni matn ichida takrorlamaydi — raqam har doim jonli qiymatdan olinadi
  (§0-9 dagi eskirgan izohlar muammosi).
- **R5.** Standart qiymatlar (ichki tushum W/m², l/kishi·kun, havo m³/h·kishi) **bino turi profilidan**
  keladi va manbasi bilan (me'yor raqami).

### 4.2 Qaror jurnali (X-log) va identifikatorlar

- **R6.** Yozuv: `id` (X-raqam, loyiha ichida uzluksiz), sana, tur (`defect | methodology | client_decision |
  auditor_decision | data_received`), tegishli maydonlar (oldin → keyin), sabab, manba, muallif, holat
  (`active | superseded | cancelled`), `supersedesId`.
- **R7.** Qaror o'chirilmaydi; bekor qilinsa `cancelled`/`superseded` (X97 → X98 namunasi).
- **R8.** Identifikator nomlar maydonlari ajratiladi: `X` — qaror/defekt, `Q` — loyihachiga savol,
  `CHK-A/B/S` — nazoratlar (bugungi `S3` to'qnashuvi takrorlanmasin).
- **R9.** Ochiq savollar reestri (S-savollar analogi) holat bilan: ochiq / javob kutilmoqda / yopildi (qaysi X bilan).

### 4.3 Versiyalash

- **R10.** Loyiha holati — versiyalar zanjiri: `draft` (tahrirlanadi) → `issued` (muzlatilgan snapshot:
  barcha kirishlar + natijalar + nazoratlar + parametrlar + dvigatel versiyasi). Muzlatilgan versiya
  o'zgarmaydi (3-MTM `v7.NN 🔒` qoidasi).
- **R11.** Har versiyada: versiya raqami, X-diapazon, qisqa izoh, asosiy ko'rsatkichlar farqi
  (CAPEX, tejash, qoplanish, NPV, EE toifa, Checks OK/FAIL) — 3-MTM CLAUDE.md §1 jadvali kabi.
- **R12.** Bekor qilingan versiya (v7.19) saqlanadi, "❌ bekor" belgisi bilan.
- **R13.** Dvigatel versiyasi (`engineVersion`) snapshot'ga yoziladi — metodika o'zgarsa eski hisobot eski
  dvigatel bilan qayta hosil qilinadi yoki farq ko'rsatiladi.

### 4.4 Auditor tasdig'i

- **R14.** Rollar: auditor (kirituvchi), yetakchi auditor (tasdiqlovchi), buyurtmachi (qarorlar), regulyator (o'qish).
- **R15.** Har bosqich (§3) yetakchi auditor tomonidan tasdiqlanadi; tasdiqdan keyin o'zgarish — yangi X-yozuv.
- **R16.** "Qabul qilingan FAIL" faqat qaror (X) havolasi bilan yopiladi.
- **R17.** `issued` versiya elektron imzolanadi (kim, qachon, xesh).

### 4.5 Me'yoriy chegaralar

- **R18.** Chegaralar kodda emas, **me'yoriy profil** jadvalida: `normId` (VM 277 6-ilova, 4-ilova, ShNQ 2.01.04,
  VM 690), kuchga kirish sanasi, qo'llanish sohasi (bino turi, moliyalash manbai), qiymat, manba bandi.
- **R19.** Loyihaga qo'llaniladigan profil qo'lda tanlanadi va snapshot'ga kiradi (me'yor o'zgarsa eski hisobot buzilmaydi).
- **R20.** EE toifa shkalasi rasmiy manbaga ega bo'lmaguncha (S17 — VM 690 2-ilova matni topilmagan) hisobotda
  "vaqtinchalik shkala" deb belgilanadi.

### 4.6 Hisob-kitob qoidalari (dvigatel invariantlari)

| # | Invariant | Nazorat |
|---|---|---|
| I1 | Σ element yo'qotishi = jami | A8/A9 |
| I2 | Tashuvchi ulushlari Σ = 1 | A3/A4 |
| I3 | Baseline = hisob-fakturalar | A6/A7 |
| I4 | Σ chora-tadbir tejashi (tashuvchi bo'yicha) = balans farqi, < 1 % | `F67/F68` |
| I5 | Chora-tadbir kWh tejashi ≥ 0 **va** USD ishorasi izohlangan (IN/ventilyatsiya USD manfiy bo'lishi mumkin) | S8 (hozir faqat kWh) |
| I6 | Qobiqdan tashqaridagi element (parapet) EE tejash = 0 ↔ EE CAPEX = 0 | C23 |
| I7 | Σ CAPEX = smeta jami (taxminiy qo'shimchalar alohida) | C24 |
| I8 | Xato/NaN/Infinity natijalar = 0 | A13 |

---

## 5. Bino turi va sanoat uchun abstraksiya

**Muammo:** YRES `buildingTypeEnum` (8 tur) faqat yorliq; hech narsa unga bog'liq emas. Ichki tushum 6 W/m²,
IsSuv 60 °C, EMS 3 %, inersiya parametri qattiq kodlangan. Sanoat korxonasi (texnologik jarayon, siqilgan
havo, bug', motorlar, sex isitilishi) uchun "bino = qobiq + HVAC" modeli yetarli emas.

**Tavsiya — uch qatlam:**

| Qatlam | Mazmuni | Misol |
|---|---|---|
| 1. **Obyekt turi profili** (`facilityProfile`) | Standart qiymatlar va me'yor jadvallari: ish rejimi, odam zichligi, ichki tushum, IsSuv l/kishi, havo m³/h·kishi, yoritish lx normalari, sanity oraliqlari | MTT (IQN 03-19), maktab, kasalxona, ofis, turar joy, sanoat sexi |
| 2. **Modullar** (`calculationModule`) | Yoqiladigan hisob bloklari; har biri o'z kirishi, natijasi, nazoratlari bilan | Bino qobig'i, HVAC, IsSuv, yoritish, QTEM, **sanoat:** motorlar/nasoslar (VFD), siqilgan havo (qochqin %), bug'/kondensat, texnologik issiqlik, issiqlik utilizatsiyasi, reaktiv quvvat |
| 3. **Me'yoriy profil** (§4.5) | Qaysi talab va nazoratlar qo'llaniladi | VM 277 (davlat binolari, markazlashgan mablag'), WB CEBU, sanoat uchun — energoaudit to'g'risidagi qonun/ISO 50002 |

Qo'shimcha:
- **Chora-tadbir katalogi** kategoriya enum emas, modulga bog'langan shablon: ta'sir qiladigan obyektlar,
  tejash formulasi, standart xizmat muddati, tashuvchi(lar). v7.20 dagi 19 ta chora-tadbirdan kamida 6 tasi
  (poydevor, vitraj eshiklar, soyalash kozirogi, MTB zaxira, sovutish, induksion plitalar) bugungi
  `measureCategoryEnum` ga sig'maydi.
- **Energiya tashuvchilari** kengaytiriladigan ro'yxat: gaz, elektr, markaziy issiqlik, ko'mir, **bug', dizel,
  suyultirilgan gaz, biomassa** — har biri NCV, CO₂, birlamchi energiya faktori bilan.
- **Hisob asosi**: bino uchun m² (kWh/m²·y), sanoat uchun **mahsulot birligi** (kWh/t, SEC) — solishtirma
  ko'rsatkich maxraji profilda belgilanadi.
- **Oylik → soatlik**: sanoat va IN uchun oylik usul yetarli bo'lmasligi mumkin (EN ISO 52016 soatlik) —
  modul interfeysi davr uzunligidan mustaqil bo'lsin.
- Bitta loyihada bir nechta obyekt (korxona = ma'muriy bino + sexlar) — `site → facility → zone` ierarxiyasi.

---

## 6. Regulyatorlar (Uzenergoinspeksiya, ESMA) uchun tekshiruv funksiyalari

| Funksiya | Nima uchun | YRES bugun |
|---|---|---|
| **Regulyator roli** (faqat o'qish, loyihalar ro'yxati, filtr: hudud, tur, toifa) | Tekshiruvchi kirishi | Yo'q (`userRoleEnum`: admin/auditor/viewer) |
| **O'zgarmas snapshot + xesh**, `verify` sahifasida xesh va asosiy ko'rsatkichlar (EE toifa, CAPEX, tejash) | Hisobot soxtalashtirilmaganini tasdiqlash | `verify.ts` faqat nom + sana; natija saqlanmaydi |
| **Qayta hisoblash**: snapshot kirishlarini shu dvigatel versiyasida qayta ishga tushirib, natija mosligini ko'rsatish | Mustaqil tekshiruv | Yo'q |
| **Nazorat hisoboti**: barcha CHK (A, VM 277, sanity) — qiymat, chegara, natija, "qabul qilingan FAIL" asoslari | VM 277 muvofiqligi | Yo'q |
| **Taxminlar ro'yxati** va ularning ulushi | Ishonchlilik bahosi | Yo'q |
| **X-log eksporti** (qarorlar, kim, qachon) | Audit izi | Yo'q |
| **Manba hujjatlar** (smeta, chizma, hisob-fakturalar) biriktirmalari va har qiymatdan havola | Iz qoldirish | Qisman (R2 bucket bor) |
| **Benchmark**: shu turdagi binolar bo'yicha solishtirma iste'mol, CAPEX/m², qoplanish taqsimoti; chetlanishlar (outlier) | Shubhali hisobotlarni aniqlash | Yo'q |
| **Portfel paneli**: 50+ obyekt (Jahon banki loyihasi) bo'yicha holat, toifa, ochiq FAIL | Dastur monitoringi | Dashboard bor, metodik ko'rsatkichlarsiz |
| **Eksport** (xlsx/json — WB shabloni tuzilishida) | Regulyator o'z vositasida tekshiradi | Yo'q |
| **Izoh/talab yuborish** (regulyator → auditor), javob majburiy | Rasmiy muloqot | Chat bor, rasmiy oqim yo'q |

---

## 7. Ochiq savollar (loyiha egasiga)

| # | Savol | Nega muhim |
|---|---|---|
| Q1 | YRES uchun haqiqat manbai endi **v7.20** mi? `calculation-engine.md` dagi "v5 ga sodiqlik" qoidasini "v7.20 metodikasiga sodiqlik" ga almashtiramizmi? | X33/X38/X86 tuzatishlari shunga bog'liq |
| Q2 | Konvert chora-tadbirlari tejashi hisobotda **foydali** (kWh issiqlik) yoki **yakuniy** (kWh gaz, ÷η) ko'rinishida beriladimi? v7.20 `E` ustuni qaysi? | Tariflash va CO₂ to'g'riligi |
| Q3 | EE toifa shkalasi (`Breakdown!86:92`, A < 50 … G > 300 kWh/m²·y) rasmiy manbaga egami (VM 690 2-ilova — S17)? Platformada vaqtinchalik deb belgilaymizmi? | Hisobot huquqiy asosi |
| Q4 | FES eksportidan daromad (1 100 so'm/kWh) byudjet tashkiloti uchun rasmiy tasdiqlanganmi (S28)? Platformada standart "yoqilgan"mi? | NPV, ZEB |
| Q5 | "Qabul qilingan FAIL" (C9, C10, C16, C19) ni kim tasdiqlaydi — auditor, buyurtmachi yoki ikkalasi? Hujjat talab qilinadimi? | VM 277 ekspertizasi |
| Q6 | Sanity oraliqlari (CAPEX 200–300 USD/m², qoplanish 8–20 y) qaysi manbadan? Bino turi profiliga ko'chiramizmi? | S3/S4 FAIL izohi |
| Q7 | Mavjud 3-MTM loyihasini YRES'ga ko'chirish (import) kerakmi, yoki YRES v7.20 bilan **regressiya etaloni** sifatida ishlatiladimi? | Test strategiyasi |
| Q8 | Sanoat obyektlari qachon kutilmoqda va qaysi me'yor (ISO 50002 / O'zR energoaudit qoidalari)? | §5 modullar ustuvorligi |
| Q9 | Regulyatorlar bilan rasmiy kelishuv bormi (format, imzo turi — E-IMZO)? | §6 ustuvorligi |
| Q10 | Moliyaviy tahlil real yoki nominal narxlarda bo'lishi kerakmi (WB talabi)? v7.20 nominal 6,08 %. | P0-6 |
| Q11 | Oylik hisob usuli (ISO 13790) saqlanadimi yoki ISO 52016 soatlik usulga o'tish rejalashtirilganmi? | Dvigatel arxitekturasi |
| Q12 | `Checks` D-bo'limidagi eskirgan izohlar (18/20, 352 USD/m², C2 "43 %") v7.21 da tuzatiladimi? | Excel ↔ YRES etalon mosligi |
