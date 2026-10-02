# 06 — Sifat, test strategiyasi va reliz jarayoni

> Muallif roli: Senior QA / Test muhandisi · Sana: 2026-09-27 · Holat: **taklif (kod o'zgartirilmagan)**
> Manbalar (faqat o'qildi): `apps/api/tests/**`, `apps/web/tests/e2e/**`, `apps/api/vitest.config.ts`,
> `apps/web/playwright.config.ts`, `.github/workflows/ci.yml`, `deploy.yml`, `apps/api/src/**`,
> `packages/db/drizzle/*.sql`, `PROGRESS.md`, `.claude/rules/*`, `docs/calculation-engine-audit.md`,
> `3-MTM/3-DMTT v7.20.xlsx` (`Checks`, `Measures_summary`, `Breakdown…`, `Financial parameters`,
> `Financial indicators`), `3-MTM/3-DMTT v5.xlsx`, `3-MTM/docs/TARIX.md` (v7.17–v7.20),
> `EA calc-Cardiology Institute_Dispensary_Draft 16.02.xlsx` (varaq ro'yxati).
>
> Eslatma: bu hujjat yozilayotganda testlar **ishga tushirilmadi** (`bun install` yo'q, qoida bo'yicha).
> "Tasdiqlangan" deb belgilangan narsalar — kodni o'qish orqali; "ehtimol" deb belgilanganlar —
> GitHub Actions tarixida tasdiqlanishi kerak.

---

## 0. Qisqa xulosa (TL;DR)

| # | Topilma | Jiddiylik | Holat |
|---|---|---|---|
| Q1 | **CI integratsiya/E2E testlari uchun bazaga faqat BIRINCHI migratsiya qo'llanadi.** `ci.yml`: `psql "$TEST_DATABASE_URL" -f packages/db/drizzle/*.sql` — `psql -f` faqat bitta fayl oladi; glob kengaygan qolgan 9 fayl (`0001`…`0009`) ortiqcha argument sifatida e'tiborsiz qoldiriladi. Natijada `building_member`, `notification`, `conversation*`, `message`, `report_annotation` jadvallari va 0002–0009 ustun o'zgarishlari yo'q. `resetTestDb()` birinchi bo'lib `TRUNCATE "building_member"` qiladi → **har bir integratsiya testi CI'da yiqilishi kerak**, `deploy.yml` esa faqat CI muvaffaqiyatida ishga tushadi. | **S1** | Kod o'qib tasdiqlandi; Actions tarixida tekshirilsin |
| Q2 | Hisoblash dvigateli **Excel bilan avtomatik solishtirilmaydi** (golden test yo'q). Moslik faqat qo'lda, bir martalik (`PROGRESS.md`: $164 320 CAPEX "aynan mos") tekshirilgan. `audit.engine.ts` uchun to'g'ridan-to'g'ri unit test yo'q. | S2 | — |
| Q3 | Dvigatelning moliya modeli **v5** (chiziqli eskalatsiya `1+r·(y−1)`, real diskont 4 %, chora-tadbir umri) — **v7.20** esa murakkab (compound) nominal eskalatsiya 4,856 %/4,04 %, nominal diskont 6,08 %, 20 yillik hisob davri, texnik xizmat eskalatsiyasi, FES eksporti. v7.20 golden'lari moliya bo'yicha **dizayn bo'yicha mos kelmaydi** — "ma'lum tafovut" sifatida boshqarilishi kerak (§2.5). | S2 | — |
| Q4 | E2E faqat **Desktop Chrome**, mobil viewport yo'q; E2E server (`apps/api/tests/e2e/server.ts`) `chat`, `notifications`, `users`, `admin-users`, `verify` route'larini **ulamaydi** → bu oqimlar E2E'da umuman qamrab olinmagan. | S2 | — |
| Q5 | **Staging muhiti yo'q**: `wrangler.toml`da faqat default (dev) va `[env.production]`. Barcha deploylar qo'lda, `deploy.yml` hech qachon haqiqiy ishlatilmagan (`PROGRESS.md:462`). | S2 | — |
| Q6 | Test DB'dagi `batch()` shim'i ketma-ket `await` — **atomiklik hech qachon testlanmaydi** (Neon `db.batch` semantikasi). | S3 | — |
| Q7 | Qamrov chegarasi (coverage threshold), a11y, vizual regressiya, i18n kalit-to'liqlik avtomatik testi, unumdorlik testi, xavfsizlik skaneri — **yo'q**. | S3 | — |

---

## 1. Joriy test qamrovi xaritasi

### 1.1 Test to'plamlari (fayl/qator soni)

| To'plam | Fayllar | Qatorlar | Ishga tushirish | Baza |
|---|---|---|---|---|
| API servis unit (`apps/api/tests/services`) | 15 | ~1 290 | `bun run test` (vitest) | Kerak emas — **64/64 o'tgan** (PROGRESS, oxirgi sessiyalar) |
| API integratsiya (`apps/api/tests/integration`) | 10 | ~1 915 | `bun run test` (xuddi shu vitest) | Lokal Postgres `127.0.0.1:5432` (`TEST_DATABASE_URL`) |
| Web E2E (`apps/web/tests/e2e`) | 7 | ~450 | `bunx playwright test` | Lokal Postgres + real Hono (`tests/e2e/server.ts`) + Vite |
| Web unit (komponent/hook) | **0** | — | — | — |
| `packages/db` (seed/migratsiya) | **0** | — | — | — |

### 1.2 Servislar (`apps/api/src/services`)

| Servis | Unit test | Izoh |
|---|---|---|
| `uvalue`, `envelope`, `heatloss`, `ventilation`, `gain`, `dhw`, `distribution`, `generation`, `cooling`, `lighting`, `equipment`, `renewable`, `financial` | ✅ | Formulalar sintetik misollar bilan; Excel katak qiymatlariga bog'lanmagan (golden emas). `generation` (20 qator), `renewable` (30), `dhw` (40) — juda yupqa |
| `report.service` | ✅ (407 qator) | PDF yuklanadimi / sahifa soni / tashlanmaydimi; kontent snapshot yo'q |
| `report-data.service` | ✅ | — |
| **`audit.engine.ts` (`runFullAudit`)** | ❌ | Faqat integratsiya (`audit.test.ts`, "physically sensible" — oraliq tekshiruv, aniq qiymat emas) va `report.service.test` fixture orqali bilvosita |
| **`consumption.service.ts`** (`computeConsumptionKwh`, m³→kWh, Gkal→kWh) | ❌ | Kalibrlash nisbati (actual/theoretical) shunga bog'liq — yuqori xavf |
| `report-i18n.ts` | ⚠️ | `it.each(["ru","uz"])` render testlari — kalit to'liqligi emas |

### 1.3 Route'lar (`apps/api/src/routes`)

| Route | Integratsiya | E2E | Authz (boshqa foydalanuvchi) testi |
|---|---|---|---|
| `buildings` | ✅ CRUD, 400, pagination | ✅ | ✅ 404 (leak yo'q) |
| `envelope` | ✅ bulk-replace, noma'lum kod | ✅ (golden-path) | ❌ |
| `measures` | ✅ | ✅ | ⚠️ faqat "boshqa bino chora-tadbiri" 404 |
| `consumption` | ✅ | ❌ (Excel shablon yuklash/paste yo'q) | ❌ |
| `systems` (vent/DHW/distr/gen/cooling/lighting/equipment/renewables) | ✅ (386 qator) | ✅ | ✅ 404 |
| `audit` (+ report PDF) | ✅ | ✅ PDF yuklab olish | ✅ report 404 |
| `members` (ulashish, rol) | ✅ owner/editor/viewer | ✅ | ✅ |
| auth (sign-up/in, reset, rate-limit) | ✅ | ✅ reset | — |
| **`chat`** (+ `ConversationRoom` DO) | ❌ | ❌ | ❌ — a'zo bo'lmagan foydalanuvchi suhbatni o'qiy oladimi — testlanmagan |
| **`notifications`** (+ `UserNotificationChannel` DO) | ❌ | ❌ | ❌ |
| **`users`** (profil, username 409) | ❌ | ❌ | ❌ |
| **`admin-users`** (`requireRole("admin")`) | ❌ | ❌ | ❌ — **auditor/viewer'ning admin API'ga kira olmasligi testlanmagan** |
| **`verify`** (ommaviy, QR) | ❌ | ❌ | — (UUID bo'lmagan `:auditRunId` → Postgres `22P02` → 500 bo'lishi mumkin — tekshirilsin) |
| `climate`, `reference` (Cache API) | ⚠️ bilvosita | ⚠️ | — |

### 1.4 UI oqimlari (Playwright)

| Oqim | Holat |
|---|---|
| Ro'yxatdan o'tish → bino → qobiq → audit → natija (`golden-path`) | ✅ (faqat EN locale yorliqlari) |
| Tizimlar, yoritish/uskunalar, chora-tadbirlar, ulashish, PDF, parolni tiklash | ✅ |
| Google OAuth, `errorCallbackURL` | ❌ (mock IdP kerak) |
| Dashboard filtrlari/grafik, iste'mol jadvali (Excel paste/yuklash), profil, sozlamalar (til/tema), chat, bildirishnoma, admin panel, `/verify/:id`, eskirgan chunk qayta yuklash | ❌ |
| Mobil (`sm`dan past icon-header), planshet | ❌ |

### 1.5 CI aslida nimani ishga tushiradi

`ci.yml` (push `main` + PR): `bun install --frozen-lockfile` → `lint` → `type-check` → **migratsiya (Q1 xatosi bilan)** → `bun run test` (turbo → `apps/api` vitest: servis **va** integratsiya birga) → Playwright Chromium → E2E → `build`.

- Integratsiya testlari CI'da **Postgres 16 service container** bilan mo'ljallangan — g'oya to'g'ri, lekin Q1 sababli sxema to'liq emas.
- `psql`da `-v ON_ERROR_STOP=1` yo'q — SQL xatosi ham CI'ni to'xtatmaydi.
- `retries: 0`, `workers: 1`, trace faqat xatoda — yaxshi; lekin artefakt (trace/report) yuklanmaydi (`actions/upload-artifact` yo'q).
- `deploy.yml` — `workflow_run` CI muvaffaqiyatidan keyin; `db:migrate` + `db:seed` + deploy. Staging bosqichi, smoke test, rollback qadami **yo'q**.

**Q1 uchun tavsiya etilgan tuzatish (kod emas — keyingi PR uchun):**
```yaml
- name: Apply migrations to test database
  run: |
    for f in packages/db/drizzle/*.sql; do
      psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
    done
```
(yoki `DATABASE_URL=$TEST_DATABASE_URL bun run db:migrate` — lekin drizzle-kit migrate Neon'da osilishi haqidagi `database.md` ogohlantirishini hisobga olib, psql-sikl soddaroq va deterministik.) Qo'shimcha: `TABLES_IN_FK_ORDER`da `report_annotation` yo'q (CASCADE orqali tozalanishi mumkin, lekin aniq qo'shilsin) — yangi jadval qo'shilganda ro'yxatni avtomatik `information_schema`dan olish yaxshiroq.

### 1.6 Zaif joylar (xavf bo'yicha)

1. Dvigatel ↔ Excel moslik regressiyasi faqat qo'lda ushlanadi (Q2).
2. CI yashil/qizil holati ishonchsiz (Q1) → "CI o'tdi" signali hozir hech narsani kafolatlamaydi.
3. Authz: admin/chat/notification/users route'lari testsiz; `building-access.ts` (`findAccessibleBuilding`/`canWrite`) har route'da to'g'ri chaqirilishini tekshiruvchi "matritsa" testi yo'q.
4. Atomiklik (`db.batch`) — faqat Neon'da; test DB'da sezilmaydi.
5. Durable Objects/WebSocket — faqat qo'lda `wrangler dev` orqali.
6. PDF kontenti — faqat "yiqilmaydi" darajasida; raqamlar to'g'riligi tekshirilmaydi.
7. i18n — kalit to'liqligi bir marta qo'lda tekshirilgan, CI'da emas.

---

## 2. GOLDEN TEST strategiyasi (Excel = haqiqat manbai)

### 2.1 Maqsad va printsip

- **Excel kitobi (`3-DMTT vX.xlsx`) — oracle.** YRES dvigateli shu kitobning kirishlarini olganda, uning hisoblangan kataklariga tolerans ichida mos kelishi kerak (`calculation-engine.md`: "maqsad — jadvalga sodiqlik").
- Kutilgan qiymatlar **qo'lda yozilmaydi** — Python ekstraktor skripti (`openpyxl`, `data_only=True`, LibreOffice orqali qayta hisoblangan fayldan) JSON hosil qiladi; JSON commit qilinadi, uning ichida manba fayl `sha256`, versiya (`v7.20`) va oxirgi X-raqam (`X98`) saqlanadi.
- Katak manzillari emas, **yorliq bo'yicha qidirish** (masalan `Measures_summary`da "Total (all measures)" qatori) — WB shablonining boshqa nusxalarida (Cardiology) qatorlar siljiydi.

### 2.2 Arxitektura

```
tools/golden/                      (repo ichida, Python, CI'da ishlamaydi — faqat qo'lda)
  extract_inputs.py   xlsx → fixtures/<bino>/<versiya>/inputs.json   (API payload shaklida)
  extract_expected.py xlsx → fixtures/<bino>/<versiya>/expected.json (natijalar + toleranslar)
apps/api/tests/golden/
  fixtures/3-dmtt/v5/{inputs,expected}.json
  fixtures/3-dmtt/v7.20/{inputs,expected,divergences}.json
  fixtures/cardiology/draft-16.02/{inputs,expected}.json      (keyinroq)
  golden.test.ts   inputs → (test Postgres'ga seed | yoki sof funksiya) → runFullAudit → expected bilan solishtirish
```

- `runFullAudit(db, buildingId)` DB'ga bog'liq. Ikki variant:
  - **A (hozir, kod o'zgarishisiz):** golden testni integratsiya to'plamiga qo'shish — `inputs.json`ni mavjud route'lar orqali (`PUT /envelope`, `/systems`, `/consumption`, `/measures`) test Postgres'ga yozish, keyin `runFullAudit`. Afzallik: route validatsiyasi ham tekshiriladi. Kamchilik: Postgres kerak (CI'da bor, Q1 tuzatilgach).
  - **B (tavsiya, keyinroq):** `runFullAudit`ni "yuklash" va "hisoblash"ga ajratish (`loadAuditInputs(db,id)` + sof `computeAudit(inputs)`), golden test esa DB'siz `computeAudit(inputs.json)`ni chaqiradi — millisekundlarda, sandbox'da ham ishlaydi. Bu arxitektura qarori — alohida ADR.
- Solishtirish yordamchisi: `expectClose(actual, expected, {rel, abs})` — xatoda **yo'l + Excel manbasi + farq %** chiqaradi (masalan `measures[0].standardized.savingsKwh  Measures_summary!E5  124459.54 vs 123801.2 (−0.53 %)`).

### 2.3 Qaysi natijalar solishtiriladi va toleranslar

Toleranslar dvigatel Excel formulasini **aynan** takrorlashi kerakligidan kelib chiqadi; farq faqat suzuvchi nuqta, yaxlitlash va oylik→yillik yig'ish tartibidan bo'lishi mumkin. Boshlanishda "keng", 2 relizdan keyin "qat'iy" rejimga toraytiriladi.

| Daraja | Natija (AuditResult / DB) | Excel manbasi (v7.20) | Boshlang'ich tolerans | Qat'iy tolerans |
|---|---|---|---|---|
| G0 geometriya | Isitiladigan maydon, hajm, qobiq yuzalari (`envelopeAreas`) | `Envelope!L95`, `M95` | rel 0,1 % | rel 0,01 % |
| G1 U-qiymat | Har konstruksiya U (`UValueResult`) | `U-values!O17`, `O91`, `O122` | abs 0,005 W/m²K | abs 0,001 |
| G1 | Qobiq yo'qotishlari oldin/keyin (yillik) | `Losses env. before!G32`, `…after!G28` | rel 1 % | rel 0,2 % |
| G1 | Ventilyatsiya, ISI, yoritish, uskuna, sovutish, PV yillik | tegishli varaqlar | rel 1 % | rel 0,2 % |
| G2 balans | Nazariy issiqlik talabi | `Breakdown!D15` = 496 820,78 kWh | rel 1 % | rel 0,2 % |
| G2 | O'lchangan bazaviy (hisob-faktura) | `Breakdown!F15` = 240 365,83; `F25` = 56 045 | abs 1 kWh | **aynan** (kirishdan) |
| G2 | Kalibrlash nisbati actual/theoretical | `Measures_summary!E55` 0,48381 (issiqlik), `E56` 0,59412 (elektr) | rel 0,5 % | rel 0,1 % |
| G2 | Solishtirma iste'mol oldin / keyin (FESsiz) / keyin (FES bilan) | `Breakdown!G75`, `H75`, `H76` = 234,69 / 30,91 / −29,02 kWh/m²·y | abs 1,0 kWh/m² | abs 0,2 |
| G2 | EE sinfi oldin/keyin | `Breakdown!G78:H78` = F / A | **aynan** | aynan |
| G3 chora-tadbir | Har chora-tadbir: standart tejash kWh, USD | `Measures_summary!E5:F23` | rel 2 % | rel 0,5 % |
| G3 | Har chora-tadbir: actual tejash kWh, USD | `I5:J23` | rel 2 % | rel 0,5 % |
| G3 | CAPEX (har qator + jami) | `D5:D37`, `D38` = 975 113,37 | abs 0,01 USD | aynan (kirish yig'indisi) |
| G4 moliya | Oddiy qoplanish (std/actual) | `G`, `K` ustunlar | abs 0,1 y | abs 0,02 y |
| G4 | Diskontlangan qoplanish | `H`, `L` ("> 20" → `null`) | abs 0,2 y; `null`↔"> 20" aynan | abs 0,05 |
| G4 | NPV | `N5:N39` | max(rel 2 %, abs 50 USD) | max(rel 0,5 %, abs 5) |
| G4 | IRR | `Financial indicators` 3.9/3.10 | abs 0,2 p.p.; "n/a (<0)" ↔ `null` aynan | abs 0,05 p.p. |
| G5 CO₂ | Kamayish t/y (jami, har chora) | koeff. `Measures_summary!D43:G43` | rel 1 % | rel 0,2 % |
| G6 Checks | `Checks` A1–A13 (ichki balans) | `Checks!` | A-bandlar OK bo'lishi | — |

**Belgilar qoidasi:** Excel `"—"`, `"> 20"`, `"n/a (<0)"` kabi matnli qiymatlar dvigatelda `null` bo'lishi kerak — ekstraktor bularni `{"kind":"none","excel":"> 20"}` ko'rinishida saqlaydi, test aynan tekshiradi. Excel xato kataklari (`#N/A`, `#REF!`) golden'ga **kiritilmaydi** (§2.4).

### 2.4 v7.20 golden qiymatlari (ekstraktor uchun nazorat nuqtalari)

| Ko'rsatkich | v7.20 qiymati | Katak |
|---|---|---|
| Isitiladigan maydon / hajm | 2 518,855 m² / 7 556,57 m³ | `Envelope!L95/M95` |
| Tejash (barcha chora-tadbirlar) | **664 253,78 kWh/y · 23 784,89 USD/y** | `Measures_summary!E38/F38` |
| Actual tejash | 339 840,55 kWh/y · 13 180,69 USD/y | `I38/J38` |
| CAPEX jami (EE + non-EE) | **975 113,37 USD** | `D38` |
| Taklif etilgan (proposed) CAPEX | 702 496,08 USD · tejash 640 645,72 kWh | `D39/E39` |
| Oddiy qoplanish (std / actual) | **41,00 y** / 73,98 y | `G38/K38` |
| NPV jami (std) | **−654 709,02 USD** (taklif etilgan: −378 471,01) | `N38/N39` |
| Solishtirma: oldin / keyin FESsiz / FES bilan | 234,69 (F) / 30,91 / −29,02 (A, ZEB) | `Breakdown!G75:H76`, `G78:H79` |
| FES ishlab chiqarish | 150 954,94 kWh/y | `Breakdown!H72` |
| Moliya parametrlari | 20 y, real 4 % + infl. 2 % → nominal 6,08 %; eskalatsiya gaz 4,856 % / elektr 4,04 % (nominal); kurs 12 140,91 | `Financial parameters!D5:D14` |
| `Checks` | 51 OK / 6 FAIL (C9, C10, C16, C19 — qabul qilingan; S3, S4) · xato kataklar 0 | `Checks` |

Namuna — alohida chora-tadbir qatorlari (golden'ning chora-tadbir darajasi uchun): №1 devor+sokl: 229 201,98 USD, 124 459,54 kWh, 2 158,16 USD/y, oddiy qoplanish 106,2 y, NPV −192 678,70; №15 FES 96,72 kWt: 50 331,61 USD, 150 954,94 kWh, 13 676,93 USD/y, 3,68 y (disk. 5,18), NPV +158 731,35; №16 LED: 5 139,53 USD, 10 791,03 kWh, 5,26 y, NPV +9 942,35.

### 2.5 v5 va v7.20 orasidagi farqqa yondashuv

v5 — dvigatel **qurilgan** model (`docs/3-DMTT v5.xlsx`, `calculation-engine-audit.md`). v7.20 — auditor hozir ishlatayotgan, 98 ta defekt (`X1`–`X98`) tuzatilgan **maqsadli** model. Ular ikki xil savolga javob beradi, shuning uchun **ikki qatlamli golden**:

| Qatlam | Fixture | Savol | CI'da xatti-harakat |
|---|---|---|---|
| **Fidelity (v5)** | `3-dmtt/v5` | "Dvigatel o'zi takrorlashi kerak bo'lgan modelni hali ham to'g'ri takrorlayaptimi?" — regressiya himoyasi | **Bloklovchi** (yiqilsa merge yo'q) |
| **Target (v7.20)** | `3-dmtt/v7.20` + `divergences.json` | "Dvigatel auditorning joriy modelidan qanchalik orqada?" — backlog o'lchovi | Ma'lum tafovutlar `it.fails`/`expectedDivergence` bilan; **yangi** tafovut yoki ro'yxatdagi tafovutning **o'z-o'zidan yopilishi** — ikkalasi ham testni yiqitadi (ro'yxat yangilanishga majbur) |

v5 bo'yicha istisno: v5 `Measures_summary`da `#N/A` (diskontlangan qoplanish), `#REF!` (umr jami) bor — `calculation-engine-audit.md` #2, #7, #8 bandlari bo'yicha dvigatel **ataylab** Excel xatosini takrorlamaydi (8 % eskalatsiya, `$D$5` havolasi). Bunday kataklar `v5/expected.json`da `"skip": "engine-intentional-fix #7"` bilan belgilanadi — izohsiz tashlab yuborilmaydi.

**`divergences.json` boshlang'ich ro'yxati** (v7.20 da bor, dvigatelda yo'q/boshqacha — TARIX va kodni o'qish asosida; har biri golden ishga tushgach aniq raqam bilan tasdiqlanadi):

| ID | X-raqam | Tafovut | Ta'sir qiladigan golden'lar |
|---|---|---|---|
| D1 | X85–X86 | `Financial parameters`: nominal diskont 6,08 %, compound `POWER()` eskalatsiya (gaz 4,856 %, elektr 4,04 %), xizmat xarajati eskalatsiyasi 2 %, 20 yillik hisob davri. Dvigatel: `DEFAULT_DISCOUNT_RATE = 0.04`, chiziqli `1 + r·(y−1)`, chora-tadbir umri | Barcha G4 (NPV, IRR, disk. qoplanish) |
| D2 | X88 | FES ortiqchasini eksport tarifi (1 100 so'm/kWh) bilan pul tejashiga qo'shish | №15 USD, NPV; FES bilan solishtirma |
| D3 | X75, X83 | Pol: gruntda zona usuli + isitilmaydigan bo'shliq ustidagi pol (F3, n = 0,4) | Pol U, pol yo'qotishi, №5 |
| D4 | X77, X80 | Isitiladigan maydon = brut − devor kesimi | Barcha solishtirma ko'rsatkichlar, EE sinfi |
| D5 | X81 | Deraza ta'miri: infiltratsiya ulushini ventilyatsiyadan derazaga qayta taqsimlash | №6, №10 |
| D6 | X84, X96 | IN (issiqlik nasosi) SCOP 3,11 + zaxira MTB; "keyin" yoqilg'isiz issiqlik | Issiqlik tashuvchisi, actual kalibrlash |
| D7 | X93–X95 | Gaz balansi tuzatishlari (tushumlar D71 = 0,974, qo'sh hisob) | G2 balans |
| D8 | X65–X66 | BEMS (⚠ taxminiy 15 USD/m²) ↔ dvigatelning `EMS_SAVINGS_RATE = 0.03` | №18 |

Qoida: **dvigatelda v7 metodikasi qo'shilganda** (masalan `Financial parameters` konfiguratsiyasi) — mos `D*` yozuvi o'chiriladi va v7.20 golden o'sha qismda bloklovchiga aylanadi. Metodika farqi ikkala modelni ham qo'llab-quvvatlashni talab qilsa (v5 chiziqli vs v7 compound), parametr audit darajasida saqlanadi va har bir fixture o'z parametrini beradi.

**Excel versiyasi yangilanganda (v7.21, v8):** ekstraktor qayta ishga tushiriladi → JSON diff PR'da ko'rinadi → PR tavsifida TARIX'dagi X-raqam(lar) ko'rsatiladi. Golden JSON'ni qo'lda tahrirlash taqiqlanadi.

### 2.6 Boshqa bino turlari (Cardiology Institute va keyingilar)

- `EA calc-Cardiology Institute_Dispensary_Draft 16.02.xlsx` — xuddi shu WB shabloni (`Envelope`, `U-values`, `Losses env.*`, …, `Measures_summary`), lekin **`Checks`, `Financial parameters`, `Climate data` yo'q**, qo'shimcha `Carbon Emisions` varag'i bor → ekstraktor varaq/yorliq mavjudligini tekshirishi va yo'q bo'lsa aniq xato berishi kerak (jim sukut emas).
- "Draft" fayl — golden sifatida faqat auditor "yakunlandi" deb tasdiqlagan versiyasi olinadi; shungacha `status: "draft"` — CI'da hisobotga chiqadi, bloklamaydi.
- Maqsadli golden portfeli (production'dan keyin): 1 × MTT/bog'cha (3-DMTT), 1 × kasalxona (Cardiology), 1 × maktab, 1 × ma'muriy bino, 1 × **minimal** bino (faqat qobiq, hisob-fakturasiz — `actual == standardized` sukut yo'li, `calculation-engine.md`). World Bank loyihasidagi 50+ obyektdan har yangi bino turi uchun bittadan qo'shiladi.

---

## 3. Test piramidasi va to'liq TEST REJASI

### 3.1 Piramida (maqsadli nisbat)

| Qatlam | Asbob | Maqsadli soni | Tezlik | Qayerda ishlaydi |
|---|---|---|---|---|
| Unit (servis, util, labels, zod schema) | Vitest | 250+ | < 10 s | har PR, sandbox |
| Golden (Excel moslik) | Vitest | 3–5 fixture × ~150 tasdiq | < 30 s | har PR (fidelity bloklovchi) |
| Integratsiya (API + Postgres) | Vitest + pg service | 120+ | < 3 min | har PR (CI) |
| Kontrakt (API tiplar ↔ web) | `tsc` + zod | — | build ichida | har PR |
| E2E | Playwright | 20–25 ssenariy × 2 viewport | < 10 min | har PR (smoke-subset), nightly (to'liq) |
| Vizual / PDF snapshot / a11y / perf / security | Playwright, axe, k6, ZAP | — | — | nightly + relizdan oldin |

### 3.2 Unit testlar (qo'shilishi kerak)

| # | Nima | Ustuvorlik |
|---|---|---|
| U1 | `consumption.service.computeConsumptionKwh` — gaz 9,5 kWh/m³, 1 Gkal = 1 163 kWh, ko'mir 5,5 Gkal/t, nol/manfiy/NaN | P0 |
| U2 | `audit.engine`: `inferCarrierForMeasure()`, `carrierForGenerationSourceType()` — har enum qiymati (switch to'liqligi `satisfies Record<…>` bilan) | P0 |
| U3 | Kalibrlash nisbati: hisob-faktura yo'q → 1; nazariy 0 → 1 (nolga bo'lish yo'q) | P0 |
| U4 | `EnergyBalanceRow.section` — `envelope_ventilation_loss` va `final_energy` aralashtirilmaydi; `renewable_offset` faqat "keyin" | P1 |
| U5 | `financial.service`: `standardized` va `actual` ikki alohida chaqiruv (masshtablash emas) — xossa-asosli test (fast-check): NPV tejashga nisbatan monoton | P1 |
| U6 | `apps/web/src/lib/labels.ts` — `formatNumber/Currency/Date` 3 tilda, `isBuildingOverdue()` (on_hold → overdue, completed → yo'q) | P1 |
| U7 | `packages/db/seed.ts` — idempotentlik, `onConflictDoNothing` | P2 |
| U8 | `realtime`: `webSocketClose` 1004/1005/1006/1015 kodlari → argumentsiz `close()` (shim bilan) | P1 |

Web uchun Vitest + Testing Library qo'shish (`apps/web`da hozir unit runner yo'q) — hooklar (`useBuildings`), Zustand store'lar (tema/WS holati), i18n pluralizatsiya.

### 3.3 Integratsiya (API + DB) va AUTHZ matritsasi

Asosiy qo'shimcha — **avtomatik authz matritsa testi**: har bir route × har bir aktor.

| Aktor → / Amal ↓ | Egasi | Editor | Viewer | Begona (autentifikatsiyalangan) | Anonim | Global `admin` | `auditor`/`viewer` roli |
|---|---|---|---|---|---|---|---|
| GET bino va barcha ichki resurslar | 200 | 200 | 200 | **404** (leak yo'q) | 401 | 404 (bino-rolidan mustaqil!) | — |
| PUT/POST/DELETE (envelope, systems, consumption, measures) | 200 | 200 | **403/404** | 404 | 401 | 404 | — |
| Audit ishga tushirish / PDF | 200 | 200 | 200/403 (qaror kerak) | 404 | 401 | 404 | — |
| A'zo taklif/rol/olib tashlash | 200 | 404 | 404 | 404 | 401 | — | — |
| `/api/admin/users/*` | — | — | — | — | 401 | 200 | **403** |
| Chat: suhbat xabarlari, WS upgrade | a'zo 200 | — | — | a'zo emas **403/404** | 401 | — | — |
| Bildirishnomalar | o'ziniki | — | — | boshqasiniki **404** | 401 | — | — |
| `/verify/:id` | ommaviy; faqat nom + sana; noto'g'ri UUID → 404 (500 emas) | | | | | | |

Amalga oshirish: `describe.each(ROUTES)(…)` — route ro'yxati Hono app'dan avtomatik olinadi (`app.routes`), yangi route qo'shilib matritsaga kiritilmasa test yiqiladi.

Qo'shimcha integratsiya ishlari:
- **I1** Q1 migratsiya tuzatishi; `TABLES_IN_FK_ORDER` o'rniga `information_schema` asosidagi TRUNCATE.
- **I2** Atomiklik: `db.batch` ichidagi 2-bayonot yiqilganda 1-bayonot orqaga qaytishi — node-postgres'da `BEGIN/COMMIT` bilan shim (hozirgi ketma-ket shim o'rniga) yoki staging Neon branch'da nightly test.
- **I3** Migratsiya testi: bo'sh baza → barcha migratsiyalar → `drizzle-kit check`/sxema diff = 0; oldingi reliz sxemasi + seed ma'lumot → yangi migratsiya (ma'lumot saqlanadimi).
- **I4** Unique constraint qo'shishdan oldin dublikat tekshiruvi (`database.md`) — migratsiya PR shabloniga SQL qo'shiladi.
- **I5** Rate-limit (mavjud) + parol tiklash tokeni muddati.

### 3.4 E2E (Playwright)

**Konfiguratsiya o'zgarishlari:** `projects`ga `Pixel 7` (mobil, < `sm`) va `iPad (gen 7)` (planshet, `sm+`) qo'shish; E2E server'ga barcha route'larni ulash (hozir 9/14); `uz` va `ru` locale bilan kamida oltin yo'l; CI'da `playwright-report` artefakti.

| # | Ssenariy (auditor oltin yo'li va boshqalar) | Viewport | Ustuvorlik |
|---|---|---|---|
| E1 | **To'liq auditor yo'li**: kirish → bino (koordinata bilan) → qobiq (bloklar, konstruksiya qatlamlari, derazalar) → tizimlar → 3 yillik iste'mol (**Excel paste**) → chora-tadbirlar + non-EE → audit → natijalar (standart/actual juftligi) → moliya → PDF (uz) | desktop + mobil | P0 |
| E2 | 3-DMTT golden fixture'ni API orqali seed qilib, UI'dagi KPI'lar golden bilan mos kelishi (UI ↔ engine izchilligi) | desktop | P0 |
| E3 | Ulashish: egasi → editor tahrirlaydi, viewer faqat o'qiydi (tugmalar yo'q/disabled) | desktop | P0 (mavjud, kengaytirish) |
| E4 | Mobil navigatsiya: `sm`dan past icon-header, barcha `NAV_ITEMS` mavjud; bino sahifasidagi 6 tab gorizontal scroll bilan yetiladi | mobil | P0 |
| E5 | Dashboard filtrlar/hudud grafigi, 100+ bino pagination (server-side) | desktop | P1 |
| E6 | Til/tema almashtirish, localStorage saqlanishi, qayta yuklashdan keyin | desktop | P1 |
| E7 | Eskirgan chunk: `web-preview` build, chunk nomini o'zgartirib → bir marta qayta yuklash, cheksiz sikl yo'q | desktop | P1 |
| E8 | OAuth xato yo'li: `errorCallbackURL` → `/login?error=…` (mock IdP / route stub) | desktop | P1 |
| E9 | Chat: 2 brauzer konteksti, xabar/tahrir/o'chirish/✓✓ (`wrangler dev` bilan nightly) | desktop | P2 |
| E10 | Admin: foydalanuvchini faolsizlantirish → u kira olmaydi | desktop | P1 |
| E11 | `/verify/:id` — ommaviy sahifa, faqat nom va sana | mobil | P2 |

### 3.5 Vizual regressiya

Playwright `toHaveScreenshot()` — 10 ta asosiy ekran × 2 tema × 2 viewport; ma'lumot deterministik fixture'dan, sana/vaqt muzlatilgan (`page.clock`), `maxDiffPixelRatio: 0.01`. Asosiy maqsad — `packages/ui` Tailwind `@source` regressiyasini ushlash (`frontend.md`): qo'shimcha ravishda build CSS'da majburiy klasslar mavjudligini tekshiruvchi skript (`grep '\.inline-flex{' dist/assets/*.css`, `whitespace-nowrap`, `overflow-x-auto`) CI qadami sifatida.

### 3.6 Hisobot (PDF / DOCX) snapshot

| Tekshiruv | Usul |
|---|---|
| Struktura | `pdf-lib`/`pdfjs-dist` bilan matn chiqarish → bo'lim sarlavhalari ketma-ketligi (`hisobot.md` A–H) snapshot |
| Raqamlar | Golden fixture'dan hosil qilingan PDF'da jami CAPEX, tejash, NPV, qoplanish **golden qiymati bilan** mos (formatlashdan keyin) — "egasiz raqam yo'q" qoidasi |
| Standart/actual juftligi | Har ko'rsatkich jadvalida ikkala ustun mavjud |
| Vizual | Har sahifani PNG'ga render (`pdftoppm`) → `toMatchSnapshot` (nightly); matn sahifadan chiqib ketmasligi (koordinata chegarasi) |
| Tillar | uz/ru/en — har biri render bo'ladi, WinAnsi bo'lmagan glif xatosi yo'q (mavjud test kengaytiriladi) |
| Bo'sh sahifa | Sahifa soni ≤ kutilgan (regressiya "bo'sh sahifalar", commit `7cf9515`) |
| DOCX (kelajak) | `docx` → XML snapshot + LibreOffice → PDF → yuqoridagi tekshiruvlar |

### 3.7 i18n (uz/ru/en)

- CI skripti: `apps/web/src/i18n/locales/{uz,ru,en}/*.json` va `apps/api/src/services/report-i18n.ts` — kalitlar to'plami tengligi (CLDR ko'plik suffikslari normallashtirilgan: uz `_other`; en `_one/_other`; ru `_one/_few/_many/_other`), bo'sh qiymat yo'q, interpolatsiya o'zgaruvchilari (`{{count}}`) har tilda bir xil.
- Kodda ishlatilgan, lekin JSON'da yo'q kalit — `i18next-parser` yoki statik skan.
- Pseudo-locale (matn +40 % uzunlik) bilan vizual test — tor viewportda overflow.
- Texnik terminologiya: yangi tarjima PR'i "terminologiya ko'rib chiqildi" belgisini talab qiladi (`i18n-and-appearance.md` — loyiha egasi tasdig'i).

### 3.8 Accessibility

`@axe-core/playwright` — har E2E sahifada `serious`/`critical` = 0 (WCAG 2.1 AA); klaviatura bilan oltin yo'l (Tab tartibi, `Dialog` fokus-tuzog'i, Esc); forma maydonlarida `label` (E2E `getByLabel` allaqachon buni qisman tasdiqlaydi); rang kontrasti ikkala temada; grafiklar uchun matnli muqobil (jadval).

### 3.9 Unumdorlik

| Ssenariy | Ma'lumot hajmi | Maqsad (p95) | Asbob |
|---|---|---|---|
| Dashboard ro'yxati | 1 foydalanuvchi × 60 bino (WB loyihasi 50+) va 500 bino | API < 500 ms, LCP < 2,5 s (4G mobil) | k6 + Lighthouse CI |
| `runFullAudit` | 3-DMTT to'liq (72 hisob-faktura, 19 chora-tadbir) va sun'iy "katta" bino (200 qobiq elementi, 10 yil × 4 tashuvchi hisob-faktura) | < 1,5 s Worker CPU ichida; Workers CPU limitiga yetmaslik | k6 + `wrangler tail` CPU vaqti |
| PDF generatsiya | 3-DMTT to'liq, 3 til | < 5 s, xotira < 128 MB | k6 |
| Iste'mol PUT | 10 yil × 12 oy × 4 tashuvchi | < 800 ms | k6 |
| Bir vaqtda | 20 auditor parallel audit | xato 0 %, p95 < 3 s | k6 |
| Bundle | `apps/web` | Asosiy chunk < 250 KB gzip, route chunk'lar lazy | `vite build --report` |

Faqat **staging**da (production Neon'da hech qachon).

### 3.10 Xavfsizlik (OWASP ASVS L1 — asosiy tekshiruvlar)

| ASVS bo'lim | Tekshiruv | Qanday |
|---|---|---|
| V2 Autentifikatsiya | Parol min uzunlik, brute-force rate-limit (mavjud test), reset token bir martalik + muddatli (mavjud), email enumeration yo'q (mavjud) | integratsiya |
| V3 Sessiya | Cookie `Secure`, `HttpOnly`, `SameSite=Lax`, domen faqat `saidmurod.com` sharti (`auth.md`); chiqishda sessiya bekor | integratsiya + curl smoke |
| V4 Kirish nazorati | §3.3 authz matritsasi; IDOR (UUID almashtirish), admin rol | integratsiya |
| V5 Validatsiya | Barcha body zod bilan; juda katta payload (413), manfiy/NaN/Infinity sonlar, Excel yuklashda formula-injection (`=cmd…`) | integratsiya + fuzz |
| V7 Xato/log | 500 javobida stack trace yo'q; Sentry'ga PII (email, parol) yuborilmaydi | integratsiya |
| V8 Ma'lumot himoyasi | `/verify` minimal oshkor qilish; PDF'da boshqa foydalanuvchi ma'lumoti yo'q | integratsiya |
| V12 Fayllar | R2 chat biriktirmalari: MIME/o'lcham cheklovi, kontent-disposition, boshqa suhbat faylini olish imkoni yo'q | integratsiya |
| V13 API | CORS faqat `WEB_URL` (credentials bilan `*` yo'q) | integratsiya |
| V14 Konfiguratsiya | Xavfsizlik sarlavhalari (CSP, HSTS, X-Content-Type-Options, frame-ancestors) web va API'da; `bun audit`/`osv-scanner` — critical = 0; sirlar repoda yo'q (`gitleaks`) | CI + ZAP baseline (staging, nightly) |

### 3.11 AI funksiyalari uchun eval (kelajak)

- Golden eval to'plami: 50–100 savol/vazifa (masalan hisob-fakturadan ma'lumot ajratish, chora-tadbir tavsiyasi, hisobot matni) + kutilgan javob/rubrika; **raqamli chiqish dvigatel natijasiga qarshi deterministik tekshiriladi** (AI raqam o'ylab topmasligi).
- Metrikalar: ajratish aniqligi (maydon darajasida F1 ≥ 0,95), gallyutsinatsiya darajasi (manba yo'q raqam = 0), tillar bo'yicha sifat, xavfsizlik (prompt-injection hujjat ichida — rad etiladi).
- Har model/prompt o'zgarishida eval regressiyasi CI'da (qisqa to'plam) va nightly (to'liq); natija trend jadvalga yoziladi.

### 3.12 Telegram integratsiyasi — shartnoma testlari (kelajak)

- YRES ↔ bot (TelegramHub / EnergyAuditorBot) API'si uchun **consumer-driven contract** (Pact yoki JSON Schema + zod): so'rov/javob shakllari, xato kodlari, versiyalash.
- Bot faqat allowlist + `dry_run` bilan yozadi (TelegramHub qoidalari) — shartnomada majburiy maydon sifatida testlanadi.
- Webhook imzosi/secret token, idempotentlik (bir xil `update_id` ikki marta), FloodWait'da qayta urinish.

---

## 4. Muhitlar

| Muhit | Web / API | Baza | Maqsad | Kim deploy qiladi |
|---|---|---|---|---|
| **local** | `vite` 5173 / `wrangler dev` 3000 (Miniflare DO) | Lokal Postgres (testlar) **yoki** shaxsiy Neon dev branch (`.dev.vars`) | Ishlab chiqish, integratsiya/E2E | Dasturchi |
| **preview** (har PR) | Cloudflare Pages preview URL (`<hash>.yres-web.pages.dev`) + API'ning `--env preview` Worker'i | Neon **ephemeral branch** (PR ochilganda yaratiladi, yopilganda o'chiriladi) | UI ko'rib chiqish, E2E smoke | CI avtomatik |
| **staging** (yangi) | `yres-staging.saidmurod.com` / `yres-api-staging.saidmurod.com` (cookie uchun bir xil registrable domen — `auth.md`) | Neon **`staging` branch** (production'dan har hafta anonimlashtirilgan nusxa yoki toza seed + golden binolar) | Reliz nomzodi, perf/ZAP/a11y, migratsiya repetitsiyasi | CI (`main` → avtomatik) |
| **production** | `yres.saidmurod.com` / `yres-api.saidmurod.com` | Neon `main` branch (+ PITR) | Haqiqiy foydalanuvchilar | CI + qo'lda tasdiq (GitHub Environment reviewers) |

Kerakli o'zgarishlar: `wrangler.toml`ga `[env.staging]` (alohida `RATE_LIMITER` namespace, R2 bucket'lar, DO nomlari), Google OAuth'ga staging redirect URI, Resend'da staging uchun sinov domeni/sandbox (real foydalanuvchiga email ketmasin).

**Preview muhitida `*.pages.dev` ↔ `*.workers.dev` cookie bo'lishmaydi** (`auth.md`) — preview'da autentifikatsiyali oqimlar uchun API'ni ham Pages Functions/bir xil domen proxy orqali berish yoki preview'ni faqat autentifikatsiyasiz smoke uchun ishlatish kerak. Buni ADR bilan hal qiling.

### 4.1 Seed ma'lumotlar

| To'plam | Tarkib | Qayerda |
|---|---|---|
| `reference` | Iqlim (Toshkent + boshqa hududlar), materiallar, lampalar, tariflar (VM 243, 01.06.2026), quvur yo'qotishlari — **Excel'dan ko'chirilgan, o'ylab topilmagan** (`database.md`) | barcha muhitlar |
| `golden` | 3-DMTT v7.20 (va v5), keyinroq Cardiology — golden fixture'dan API orqali | local, preview, staging |
| `demo` | 5 ta turli holatdagi bino (`not_started`/`in_progress`/`completed`/`on_hold`, muddati o'tgan) | staging |
| `volume` | 1 foydalanuvchi × 500 bino, 10 yillik hisob-fakturalar | staging (perf) |

### 4.2 Test foydalanuvchilar (staging/preview; production'da yo'q)

| Login | Global rol | Maqsad |
|---|---|---|
| `qa-admin@test.yres` | admin | Admin panel |
| `qa-auditor-owner@test.yres` | auditor | Bino egasi, golden binolar |
| `qa-auditor-editor@test.yres` | auditor | Ulashilgan binoda editor |
| `qa-viewer@test.yres` | viewer | Faqat o'qish |
| `qa-outsider@test.yres` | auditor | IDOR/authz — hech narsaga kirishi yo'q |
| `qa-inactive@test.yres` | auditor (faolsiz) | Kira olmasligi |

Parollar GitHub/1Password sirlarida; `*@test.yres` domeni production'da ro'yxatdan o'tishda bloklanadi.

---

## 5. Reliz jarayoni va Definition of Done

### 5.1 Definition of Done (bitta vazifa)

- [ ] Kod + test bitta commit'da (`git-and-commits.md`: bitta mantiqiy o'zgarish), xabar *nima uchun*ni tushuntiradi.
- [ ] `bun run type-check`, `bun run build` (web — haqiqiy Vite build), `bunx biome lint` — yashil.
- [ ] Hisoblash o'zgarsa: unit + **golden (fidelity) yashil**; v7.20 `divergences.json` yangilangan (yopilgan tafovut o'chirilgan).
- [ ] Yangi route: authz matritsasiga qo'shilgan; zod validatsiya; 404 (leak yo'q) andozasi.
- [ ] UI: 3 tilda kalitlar, mobil (`< sm`) va planshet (`sm+`) tekshirilgan, `packages/ui` yangi klasslar build CSS'da bor.
- [ ] Sxema: migratsiya `.sql` + sxema bir commit'da; unique constraint uchun dublikat so'rovi PR tavsifida.
- [ ] `PROGRESS.md` yozuvi (CLAUDE.md tartibi).

### 5.2 PR check-list (PR shabloni)

```
- [ ] CI yashil (lint · type-check · unit · golden · integratsiya · E2E-smoke · build · CSS-klass tekshiruvi · i18n kalitlar)
- [ ] Qamrov: o'zgargan servis/route fayllari uchun line coverage ≥ 80 %
- [ ] Migratsiya bormi? → orqaga-mos (expand/contract), staging'da repetitsiya rejasi yozilgan
- [ ] Hisob natijasi o'zgaradimi? → golden diff PR'ga ilova, TARIX X-raqami
- [ ] Yangi env/sir? → deployment.md va wrangler.toml (staging + production)
- [ ] Skrinshot (desktop + mobil) UI o'zgarishida
- [ ] Xavfsizlik: yangi ommaviy endpoint / fayl yuklash / CORS o'zgarishi bormi?
```

### 5.3 Reliz check-list

1. `main` → staging avtomatik deploy; staging'da **migratsiya repetitsiyasi** (production nusxasi branch'ida).
2. Staging'da: to'liq E2E (desktop + mobil), golden seed binolar KPI'lari, PDF snapshot, ZAP baseline, axe, k6 qisqa yuklama.
3. Reliz eslatmasi (uz): o'zgarishlar, migratsiyalar, ma'lum muammolar, hisob natijasiga ta'siri (golden diff).
4. Production'ga tasdiq (GitHub Environment reviewer = loyiha egasi).
5. Deploy tartibi: **(a)** Neon PITR nuqtasi / branch snapshot → **(b)** migratsiya (faqat qo'shuvchi, expand) → **(c)** API (`wrangler deploy --env production`) → **(d)** web (`VITE_API_URL` build vaqtida) → **(e)** smoke → **(f)** 30 daqiqa monitoring.
6. Deploy asset xeshi o'zgarganini tekshirish (`deployment.md`: `curl … | grep assets/index-…js`).
7. Git tag `vYYYY.MM.DD-N`, `CHANGELOG`.

### 5.4 Rollback

| Komponent | Usul | Maqsadli vaqt |
|---|---|---|
| Web (Pages) | Cloudflare Pages oldingi deploymentni "Rollback" | < 5 daq |
| API (Worker) | `wrangler rollback --env production` (oldingi versiya) | < 5 daq |
| DO | DO migratsiyalari (`new_sqlite_classes`) orqaga qaytmaydi — DO klass o'zgarishlari faqat qo'shuvchi | — |
| Baza | Migratsiyalar **expand/contract**: ustun o'chirish/nomini o'zgartirish — keyingi relizda, kod unga tayanmay qo'yganidan keyin. Falokatda: Neon PITR'dan yangi branch → ulanish satrini almashtirish | < 30 daq (RTO), RPO < 5 daq |
| Qaror mezoni | Smoke yiqildi · 5xx > 2 % 5 daqiqa · golden-KPI farqi production'da · login ishlamayapti → darhol rollback, keyin tahlil | — |

### 5.5 Migratsiya xavfsizligi

- Faqat `drizzle-kit generate` bilan hosil qilingan, ko'rib chiqilgan `.sql`; qo'lda qo'llangan bo'lsa `__drizzle_migrations`ga yozilgan (`database.md`).
- Taqiqlangan bitta relizda: `DROP COLUMN`, `ALTER TYPE` (enum qiymatini olib tashlash), `NOT NULL`ni default'siz qo'shish, katta jadvalda qulflovchi indeks (`CREATE INDEX CONCURRENTLY` ishlatiladi).
- CI: bo'sh bazaga barcha migratsiyalar (Q1 tuzatilgan) + oldingi reliz tag'idagi sxema → yangi migratsiya (upgrade testi).
- `db:seed` production'da idempotent — yangi seed qatorlari alohida `onConflictDoNothing` skripti bilan.
- `TRUNCATE`li test yordamchilari hech qachon Neon URL bilan ishlamaydi — `test-db.ts`ga himoya: URL `neon.tech` yoki `-pooler` o'z ichiga olsa, darhol `throw`.

### 5.6 Deploydan keyingi smoke testlar (avtomatik, < 2 daqiqa)

| # | Tekshiruv | Kutilgan |
|---|---|---|
| SM1 | `GET https://yres-api.saidmurod.com/health` | 200 |
| SM2 | `GET /` web, asset xeshi yangi | 200, xesh ≠ oldingi |
| SM3 | Smoke foydalanuvchisi bilan email/parol login (production'da maxsus `smoke@…` akkaunt, faqat o'z binosi) | sessiya cookie `Domain=.saidmurod.com; Secure; HttpOnly` |
| SM4 | Smoke binosi (3-DMTT golden nusxasi) → audit ishga tushirish → `summary` golden bilan mos | tolerans ichida |
| SM5 | PDF yuklab olish | 200, `%PDF`, > 50 KB |
| SM6 | `/api/reference/climate` | 200, kesh sarlavhasi |
| SM7 | WebSocket bildirishnoma kanaliga ulanish | 101 Switching Protocols |
| SM8 | `/verify/<smoke-run-id>` | `valid: true` |

### 5.7 Monitoring va alertlar

| Signal | Manba | Alert chegarasi |
|---|---|---|
| API 5xx ulushi | Workers Analytics / Sentry | > 1 % 5 daq → ogohlantirish; > 5 % → sahifa (Telegram) |
| API p95 latency | Workers Analytics | > 2 s 10 daq |
| Worker CPU limit / exceeded | Workers logs | har qanday hodisa |
| Sentry yangi xato turi | Sentry | birinchi paydo bo'lishi |
| Audit `failed` holati | `audit_run.status` so'rovi (cron) | > 3 soat ichida 2 ta |
| Neon ulanish xatolari / saqlash hajmi | Neon | xato > 0,5 %; hajm > 80 % |
| Auth: `account_not_linked`, `state_mismatch` | Worker loglari | soatiga > 5 |
| Sintetik smoke (SM1, SM3, SM4) | Cron (GitHub Actions scheduled / Cloudflare Cron) har 15 daq | 2 marta ketma-ket yiqilsa |
| Email (Resend) bounce/xato | Resend webhook | > 5 % |

### 5.8 Bug triage — jiddiylik darajalari

| Daraja | Ta'rif (YRES misollari) | Javob | Tuzatish |
|---|---|---|---|
| **S1 Kritik** | Ma'lumot yo'qolishi/oshkor bo'lishi (boshqa foydalanuvchi binosi ko'rinadi), login umuman ishlamaydi, **hisob natijasi Excel'dan jim farq qiladi va bank hisobotiga tushadi**, production bazasi buzildi | 1 soat | Rollback yoki hotfix 24 soat ichida; postmortem |
| **S2 Yuqori** | Asosiy oqim bloklangan (audit ishga tushmaydi, PDF yiqiladi, iste'mol saqlanmaydi), mobil'da asosiy sahifa ishlatib bo'lmaydi, CI ishonchsiz (Q1) | 1 ish kuni | Keyingi reliz (≤ 1 hafta) |
| **S3 O'rta** | Muqobil yo'li bor funksional xato, tarjima yo'q, noto'g'ri formatlash, sekinlik (p95 > maqsad) | 3 ish kuni | Rejalangan sprint |
| **S4 Past** | Kosmetik, matn, kichik UI nomuvofiqligi | Backlog | Imkon bo'lganda |

Qoida: hisob-kitob bilan bog'liq har qanday xato kamida **S2**; agar natija allaqachon yuborilgan hisobotga ta'sir qilgan bo'lsa — **S1** + ta'sirlangan hisobotlar ro'yxati.

---

## 6. PRODUCTION-GA CHIQISH MEZONLARI (Go-live gate)

Barcha bandlar **o'lchanadigan**; har biri uchun dalil (CI havolasi, hisobot, skrinshot) reliz chiptasiga biriktiriladi.

### 6.1 Sifat

| # | Mezon | O'lchov | Chegara |
|---|---|---|---|
| G1 | CI to'liq ishlaydi | Q1 tuzatilgan; oxirgi 10 ta `main` run | 10/10 yashil, flaky < 2 % |
| G2 | Golden fidelity (v5) | `golden.test.ts` | 100 % tasdiq tolerans ichida (qat'iy rejim) |
| G3 | Golden target (v7.20) | tafovutlar | Har `D*` yozuvi hujjatlashtirilgan **va** loyiha egasi tomonidan "go-live uchun qabul qilinadi" yoki "yopildi" deb belgilangan; **G4 moliya (D1) yopilgan** bo'lishi tavsiya — aks holda bankka ketadigan NPV/IRR auditorning Excel'idan farq qiladi |
| G4 | Ikkinchi bino turi golden | Cardiology (yoki boshqa) | ≥ 1 ta qo'shimcha fixture yashil |
| G5 | Unit + integratsiya qamrovi | `vitest --coverage` (`apps/api/src`) | lines ≥ 80 %, `services/` ≥ 90 %, `audit.engine.ts` ≥ 85 % |
| G6 | Authz matritsasi | route × aktor | 100 % route qamrab olingan, 0 ta muvaffaqiyatsiz |
| G7 | E2E | E1–E4, E10 | desktop + mobil yashil, 3 ketma-ket run |
| G8 | Ochiq buglar | triage | S1 = 0, S2 = 0, S3 ≤ 10 (hammasi rejalangan) |

### 6.2 Xavfsizlik va ma'lumot

| # | Mezon | Chegara |
|---|---|---|
| G9 | ASVS L1 tekshiruvlari (§3.10) | 100 % bajarilgan yoki hujjatlashtirilgan istisno |
| G10 | ZAP baseline (staging) | High = 0, Medium ≤ 3 (asoslangan) |
| G11 | Bog'liqliklar | `bun audit`/osv: Critical = 0, High = 0 |
| G12 | Sirlar | gitleaks: 0; barcha sirlar `wrangler secret`da |
| G13 | Zaxira va tiklash | Neon PITR yoqilgan; **tiklash repetitsiyasi** staging'da o'tkazilgan, RTO < 30 daq, RPO < 5 daq |

### 6.3 Unumdorlik va barqarorlik

| # | Mezon | Chegara |
|---|---|---|
| G14 | Dashboard 60 bino | API p95 < 500 ms; LCP (4G mobil) < 2,5 s |
| G15 | `runFullAudit` 3-DMTT | p95 < 1,5 s; CPU limit hodisasi 0 |
| G16 | PDF | p95 < 5 s, 3 tilda |
| G17 | Yuklama | 20 parallel auditor, 15 daq: xato 0 %, p95 < 3 s |
| G18 | Staging'da barqarorlik | 7 kun: 5xx < 0,5 %, Sentry'da yangi S1/S2 yo'q |

### 6.4 Foydalanish qulayligi

| # | Mezon | Chegara |
|---|---|---|
| G19 | a11y | axe: serious/critical = 0 asosiy 10 sahifada |
| G20 | i18n | uz/ru/en kalitlari 100 % to'liq; texnik atamalar loyiha egasi tomonidan tasdiqlangan (ru) |
| G21 | Mobil | E4 yashil; 375 px kenglikda gorizontal page-scroll yo'q |
| G22 | UAT | Kamida 1 haqiqiy auditor 3-DMTT'ni boshidan oxirigacha platformada bajargan; natija v7.20 bilan (G3 qabul qilingan tafovutlar doirasida) mos; imzolangan UAT bayonnomasi |

### 6.5 Operatsion tayyorlik

| # | Mezon | Chegara |
|---|---|---|
| G23 | Staging muhiti | mavjud, `main`dan avtomatik deploy |
| G24 | Deploy pipeline | `deploy.yml` kamida 3 marta staging'ga va 1 marta production'ga muvaffaqiyatli ishlatilgan (qo'lda yo'l faqat zaxira) |
| G25 | Smoke + sintetik monitoring | SM1–SM8 avtomatik, alertlar Telegram'ga keladi (sinov alerti yuborilgan) |
| G26 | Rollback | Web va API rollback staging'da sinalgan, < 5 daq |
| G27 | Runbook | Incident, rollback, DB tiklash, OAuth diagnostika (`wrangler tail`) — `docs/`da |

---

## 7. Amalga oshirish tartibi (tavsiya)

| Bosqich | Ishlar | Taxminiy hajm |
|---|---|---|
| 0 (darhol) | Q1 CI migratsiya tuzatishi; Actions tarixini tekshirish; `test-db.ts` Neon-himoya; trace/report artefaktlari | 0,5 kun |
| 1 | Golden ekstraktor (Python) + `3-dmtt/v5` fidelity golden (variant A — integratsiya orqali) | 3–4 kun |
| 2 | `3-dmtt/v7.20` target golden + `divergences.json` (D1–D8 aniq raqamlar bilan) | 2 kun |
| 3 | Authz matritsasi + chat/notifications/users/admin/verify integratsiya testlari | 3 kun |
| 4 | Playwright mobil/planshet, E1/E2/E4, axe, vizual, i18n-kalit skripti, CSS-klass tekshiruvi | 4 kun |
| 5 | Staging muhiti (wrangler env, Neon branch, OAuth, Resend), `deploy.yml` → staging → production, smoke + alertlar | 3–4 kun |
| 6 | PDF snapshot + golden raqamlar, perf (k6), ZAP, tiklash repetitsiyasi, UAT | 4–5 kun |
| 7 | Dvigatelda `Financial parameters` (D1) va boshqa v7 tafovutlari — alohida muhandislik vazifasi (ADR) | loyiha egasi bilan rejalanadi |
