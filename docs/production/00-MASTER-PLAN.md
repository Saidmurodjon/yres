# 00 — YRES: Production'ga tayyorlash bo'yicha master reja

> **Sana:** 2026-09-27 · **Tuzuvchi:** loyiha boshqaruvchisi (Claude), 6 ta mutaxassis agent xulosalari asosida
> **Holat:** reja — kodga hali tegilmagan. Har faza alohida Claude Code sessiyasida, `CLAUDE.md` tartibida
> (tekshirish → `PROGRESS.md` → bitta topshiriq = bitta commit) bajariladi.

## Hujjatlar to'plami

| # | Hujjat | Mutaxassis | Asosiy savol |
|---|---|---|---|
| 00 | `00-MASTER-PLAN.md` (shu fayl) | Loyiha boshqaruvchisi | Nima, qaysi tartibda, kim qaror qiladi |
| 01 | `01-audit-metodologiya.md` | Energoauditor | Excel v7.20 ↔ YRES dvigateli farqi, kiritish bosqichlari, metodik qoidalar |
| 02 | `02-arxitektura-va-texnologiyalar.md` | Arxitektor | Xavfsizlik, multi-tenancy, snapshot, ADR'lar, `.claude/rules` uchun yangi qoidalar |
| 03 | `03-ux-va-malumot-kiritish.md` | UX dizayner | 11 bosqichli kiritish oqimi, to'liqlik paneli, dizayn tizimi, rollar |
| 04 | `04-ai-va-telegramhub-integratsiyasi.md` | AI integrator | AI use-case'lar, "~100 band" reyestri, TelegramHub shartnomasi (haqiqiy kodga moslangan) |
| 05 | `05-professional-hisobot.md` | Hisobot mutaxassisi | Hisobot tuzilmasi, PDF/DOCX/XLSX, QC, muzlatilgan versiya |
| 06 | `06-sifat-test-va-reliz.md` | QA muhandisi | Golden testlar, test rejasi, reliz jarayoni, 27 ta go-live mezoni |

---

## 1. Umumiy tashxis — bir paragrafda

YRES'ning texnik poydevori yaxshi: zamonaviy stack, ishlaydigan dvigatel, PDF, i18n, chat.
Lekin **production'ga to'rtta tizimli to'siq bor**. Birinchisi: dvigatel Excel'ning **eskirgan v5** versiyasini
takrorlaydi, auditor esa **v7.20** bilan ishlaydi. Oradagi ~80 ta tuzatish YRES'ga o'tmagan, ulardan
biri (X33) issiqlik nasosi uchun manfiy iste'mol beradi. Ikkinchisi: natija saqlanmaydi. Hisobot har safar
qayta hisoblanadi, shuning uchun bank yoki regulyator uni keyin tekshira olmaydi. Uchinchisi: auditning
asosiy tushunchalari UI'da yo'q — taxmin/manba belgisi, `Checks`/VM 277 nazorati, dala savollari, dalil
fayllari. To'rtinchisi: xavfsizlik va operatsiya bo'shliqlari bor — akkauntni oldindan egallash, XSS,
staging yo'q, CI testlari noto'g'ri sxemada ishlaydi, backup sinalmagan.

## 2. Eng muhim 12 topilma (barcha hujjatlardan)

| # | Topilma | Jiddiylik | Manba |
|---|---|---|---|
| 1 | Generatsiya formulasi `(Q+Qd)·(2−η)` — gaz qozonda ~17 % kam, issiqlik nasosida **manfiy** iste'mol (keyin `Math.max(0)` bilan yashiriladi) | 🔴 Kritik | 01 §2.2 |
| 2 | Hisobot/natija snapshot'i yo'q: `latest.pdf` ustidan yoziladi, QR mazmunni tasdiqlamaydi | 🔴 Kritik | 01, 02 D-1, 05 §5 |
| 3 | Akkauntni oldindan egallash (tasdiqlanmagan email + Google linking) | 🔴 Kritik | 02 S-1 |
| 4 | CI'da 10 migratsiyadan faqat 1 tasi qo'llanadi — integratsiya/E2E testlar amalda ishlamaydi | 🔴 Kritik | 06 S1, 02 M-2 |
| 5 | O'nlik vergul (`12,5`) jimgina `0`/`12` ga aylanadi; saqlanmagan tahrirlar yo'qoladi | 🔴 Kritik (ma'lumot) | 03 §1.1 |
| 6 | Chora-tadbir tejashi kategoriya bo'yicha — qo'sh hisob; yoqilg'i almashtirish (gaz→elektr) yo'q | 🟠 Yuqori | 01 §0 |
| 7 | Moliya modeli v5: diskont 4 % qattiq kodda, chiziqli o'sish, tariflar global → NPV/IRR Excel'dan farq qiladi | 🟠 Yuqori | 01, 06 §2.5 |
| 8 | `Checks` qatlami (A1–A13, VM 277 C1–C20, S1–S9), EE toifa, ZEB yo'q | 🟠 Yuqori | 01 §1.4 |
| 9 | Chat biriktirmalari orqali XSS; cookie butun `.saidmurod.com`ga ochiq | 🟠 Yuqori | 02 V-1, S-2 |
| 10 | Staging yo'q, deploy qo'lda (`--commit-dirty`), backup/PITR tiklash sinalmagan | 🟠 Yuqori | 02 C-1, M-1; 06 §4 |
| 11 | Dalil fayllari (foto, teplovizor, smeta, SUIN) uchun saqlash yo'q | 🟠 Yuqori | 02 F-1, 05 §4 |
| 12 | Joriy PDF namunaviy tuzilmaning ~35–40 % ini qoplaydi; DOCX yo'q | 🟡 O'rta | 05 §2 |

---

## 3. Yo'l xaritasi — birlashtirilgan fazalar

Agentlar takliflari (02 F0–F4, 03 P0–P3, 04 Faza 0–4, 05 R1–R12, 06 bosqich 0–7) bitta ketma-ketlikka
keltirildi. Muddatlar bitta dasturchi + Claude Code uchun taxminiy.

```
Faza 0  Qon to'xtatish           ▓▓                     1–1,5 hafta
Faza 1  Hisob to'g'riligi        ░░▓▓▓▓                 3–4 hafta
Faza 2  Bankka tayyor yadro        ░░░▓▓▓               2–3 hafta   (1 bilan qisman parallel)
Faza 3  Auditor ish maydoni            ▓▓▓▓▓            4–5 hafta
Faza 4  Platforma va dalillar             ░▓▓▓▓         3–4 hafta
Faza 5  Professional hisobot                  ▓▓▓▓      3–4 hafta
Faza 6  TelegramHub + AI MVP                  ░░▓▓▓▓    4–6 hafta   (TelegramHub parallel quriladi)
GO-LIVE  06 §6 dagi G1–G27                            ◆
```

### Faza 0 — "Qon to'xtatish" (1–1,5 hafta) · ⛔ hamma narsadan oldin
Maqsad: production'dagi mavjud xavflar va jimgina ma'lumot yo'qolishini yopish.

| Ish | Hujjat |
|---|---|
| CI migratsiya sikli (`ON_ERROR_STOP=1`), Actions tarixini tekshirish, `test-db.ts` Neon-himoyasi | 06 §7-0 |
| S-1 akkaunt egallash, V-1 chat XSS (`Content-Disposition: attachment` + MIME allowlist), S-4, A-2, V-3, V-5 | 02 §2.1–2.3 |
| Neon PITR yoqish + tiklash repetitsiyasi; Workers Paid rejasi (ADR-015) | 02 M-1, ADR-011 |
| `parseLocaleNumber` + `NumberInput`; dirty-himoya (tizimlar, qobiq dialogi, `useBlocker`); o'chirishga tasdiq; iste'mol ko'p yilli saqlash; "Auditni ishga tushirish" qobiqni almashtirmasin | 03 §8 P0 (U1–U7) |
| `xlsx@0.18.5` zaifligini yopish | 02 |

**Chiqish mezoni:** CI 3/3 yashil (to'liq sxema bilan); `12,5` uchala tilda to'g'ri saqlanadi; tiklash mashqi bajarilgan.

### Faza 1 — Hisob to'g'riligi: dvigatelni v7.20 ga yetkazish (3–4 hafta)
Maqsad: YRES raqamlari auditorning Excel'i bilan mos kelsin.

1. **Golden test infratuzilmasi avval** (06 §2): Python ekstraktor → `inputs.json`/`expected.json`;
   `3-dmtt/v5` fidelity (bloklovchi) + `3-dmtt/v7.20` target + `divergences.json` (D1–D8).
2. Dvigatel P0'lari (01 §2.3), har biri golden'da tafovutni yopadi:
   X33 generatsiya `(Q+Qd)/η` (COP/SCOP); tashuvchi bo'yicha tejash (yoqilg'i almashtirish);
   chora-tadbir darajasida tejash + Σ = balans nazorati; har ochiq joy uchun alohida "keyin" harakati;
   pol grunt zona usuli + b-faktor; loyiha darajasidagi `financial_parameters` (nominal diskont, murakkab
   o'sish, bazaviy yil, sanali tariflar); FES o'z iste'moli/eksport.
3. `calculation-engine.md` dagi "v5 ga sodiqlik" qoidasi → "v7.20 metodikasiga sodiqlik" (Q1 qarori kerak).

**Chiqish mezoni:** v7.20 golden: tejash 664 253,78 kWh/y · 23 784,89 USD/y · CAPEX 975 113,37 · qoplanish 41,00 y ·
NPV −654 709 (06 §2.3 toleranslari ichida); qabul qilinmagan D-tafovut qolmagan.

### Faza 2 — Bankka tayyor yadro (2–3 hafta)
Maqsad: chiqarilgan hisobot huquqiy jihatdan himoyalangan bo'lsin.

- ADR-004 `audit_snapshot` (inputs + result + `ENGINE_VERSION` + SHA-256), o'zgarmas R2 kalitlari, verify sahifasida hash/versiya (05 §5.2, R7).
- Nazorat dvigateli: A-balans, VM 277 C1–C20, S1–S9; EE toifa; ZEB; "qabul qilingan FAIL" asos matni bilan (01 §1.4, §4).
- Maydon meta-ma'lumoti: holat (bo'sh/standart/⚠ taxmin/manbali/dala/tasdiqlangan) + manba havolasi (01 §4.1, 03 §2.2).
- Qaror jurnali (X-log, "superseded" holati bilan); audit trail (kim/qachon/nima); soft-delete (02 D-3, D-4).

**Chiqish mezoni:** bir snapshot'dan olingan PDF bir yildan keyin ham baytma-bayt bir xil; har o'zgarishning muallifi ma'lum.

### Faza 3 — Auditor ish maydoni (4–5 hafta)
Maqsad: Excel'dan ko'ra tezroq va xatosizroq ishlash.

- 11 bosqichli oqim (03 §2): Loyiha → Bino turi shabloni → Umumiy+iqlim → Dala → Qobiq → Tizimlar → Iste'mol → Chora-tadbirlar → Moliya → Tekshiruvlar → Hisobot. Har bosqichda URL, avtosaqlash va to'liqlik.
- To'liqlik paneli: qamrov · ishonchlilik · tekshiruvlar (03 §3.1).
- "~100 band" reyestri (`report_item` ↔ `field_key`) → deterministik "yetishmayotganlar" (04 §3). Bu Faza 6 dagi Telegram savollari uchun ham poydevor.
- Savol obyekti (S/Q-kodlar) + Word "aniqlashtirish so'rovi" generatsiyasi (03 §3.3).
- Excel-first import (oldindan ko'rish + farq), DataGrid, o'xshash binodan klonlash (03 §4).
- i18n: enum/oy/birlik, `formatNumber` ilova lokali bilan.

**Chiqish mezoni:** auditor 3-DMTT'ni boshidan oxirigacha platformada kiritadi (UAT-qoralama), qo'shimcha Excel kerak bo'lmaydi.

### Faza 4 — Platforma va dalillar (3–4 hafta)
- ADR-001/002: `organization` + `org_membership` + `project`, markaziy `can()` policy (auditor firma, ESCO, egasi, bank, regulyator).
- ADR-003: mahsulot domeni (masalan `yres.uz`), API bir origin ostida (host-only cookie).
- ADR-010: staging (wrangler env + Neon branch), `deploy.yml` orqali deploy, smoke SM1–SM8, alertlar Telegram'ga.
- ADR-007: dalil fayllari — R2 presigned upload, `evidence` jadvali, teplovizor juftligi, EMF/WMF→PNG, HEIC→JPEG.
- Portfel dashboard (50+ korxona: bosqich, mas'ul, muddat, ochiq savollar) (03 §5).
- Kuzatuv: web'da Sentry, xavfsizlik sarlavhalari, strukturali loglar.

### Faza 5 — Professional hisobot (3–4 hafta)
- ReportDocument modeli → PDF + **DOCX** + XLSX (ADR-005/006; Queue + report-worker).
- 05 §1 tuzilmasi: titul, disclaimer, tomonlar/imzo, 15 bob, A–J ilovalar; mundarija, raqamlash, kolontitul.
- Hisoblangan, lekin chiqmayotgan bo'limlar (deraza, ISI, yoritish, uskuna, sovutish, QTE), VM 277 muvofiqligi, EE/ZEB, xavflar.
- So'm + kurs, EE-only vs jami moliya; taxminlar registri hisobotda ko'rinadi.
- QC paneli: 15 avtomatik + 8 qo'lda tekshiruv; muvaffaqiyatsiz bo'lsa "Chiqarish" bloklanadi (05 §5.1).

Minimal "bankka tayyor" to'plam: **R1–R5, R7, R8, R12**.

### Faza 6 — TelegramHub + AI MVP (4–6 hafta, TelegramHub parallel)
**Tamoyil (04 §1):** AI hech qachon hisoblamaydi. U faqat ajratadi, taklif qiladi va matn yozadi. Har AI chiqishi `proposed` holatida saqlanadi, manba havolasi bilan keladi va auditor tasdiqlagandan keyingina yoziladi.

- YRES tomoni: `inbox_file`, `ai_job`, `ai_suggestion`, `data_request`, `outbox_message`, byudjet/ledger; Queue + Workflow; HMAC `/events`, `/files/upload-intents`, `/links`.
- MVP'ning 3 funksiyasi:
  1. Telegram inbox + fayllarni tasniflash.
  2. Hisob-faktura ajratish → `utility_bill` takliflari.
  3. Yetishmayotganlar → guruhga savollar (bot tayyor bo'lgunicha "nusxalash" tugmasi bilan).
- TelegramHub tomoni (04 §10, T0–T10):
  - v0 ni haqiqiy akkauntda sinash;
  - ADR-001…007;
  - `integrations/yres/{config,signing,client,schema,sync,link}.py`;
  - launchd kursorli sync;
  - `core/policy.py` + `logs/actions.jsonl`;
  - yozish uchun bot.
- Keyingi bosqichlar (04 Faza 2–4): shildik/TEP/teplovizor/SUIN ajratish, anomaliyalar, uz/ru hisobot matni, regulyator QA, EnergyCore RAG.

**Chiqish mezoni:** hisob-faktura rasmi ≤ 2 daqiqada tasdiqlangan `utility_bill` bo'ladi; 36 oylik iste'mol < 15 daqiqada kiritiladi; AI xarajati byudjet ichida qoladi.

### GO-LIVE darvozasi
`06 §6` dagi **G1–G27** — barchasi o'lchanadigan. Eng muhimlari:
- CI 10/10 yashil;
- golden fidelity 100 %, v7.20 tafovutlari yopilgan;
- authz matritsasi 100 %;
- S1/S2 buglar soni 0;
- ZAP High 0;
- tiklash repetitsiyasi bajarilgan;
- `deploy.yml` production'da ishlatilgan;
- **haqiqiy auditor imzolagan UAT bayonnomasi**.

---

## 4. Platforma qoidalari (qisqa to'plam)

To'liq matnlar tegishli hujjatlarda. Bu yerda — buzilmaydigan asosiylari:

**Metodika (01 §4):**
1. Excel v7.20 (keyinchalik — versiyalangan metodika) haqiqat manbai. Har dvigatel o'zgarishi golden testdan o'tadi.
2. Har kiritilgan qiymatning holati va manbasi bor. Taxmin hisobotda ⚠ bilan ko'rinadi.
3. Qaror jurnali (X-log): har metodik qaror ID, sana, asos, ta'sir bilan yoziladi; bekor qilingani o'chirilmaydi, "superseded" bo'ladi.
4. Izohlardagi raqamlar jonli qiymatdan olinadi, qo'lda yozilmaydi (Excel'dagi "eskirgan izoh" muammosi takrorlanmasin).
5. Rasmiy natija faqat snapshot'dan chiqadi. Draft ko'rinish qayta hisoblanishi mumkin.

**Muhandislik (02 §5 — `.claude/rules/` ga qo'shiladi):** `security.md`, `data-integrity.md`, `tenancy.md`, `observability.md`, `async-jobs.md`, `ai.md`.

**UX (03 §6):** raqam kiritish faqat `NumberInput` orqali bo'ladi. Hech bir forma saqlanmagan tahrirni jimgina tashlamaydi. Har ekranda bo'sh, yuklanish va xato holatlari bor. Interfeys 375 px kenglikda gorizontal scroll'siz ishlaydi.

**AI (04 §1, R1–R12):**
- AI hisoblamaydi.
- Uning chiqishi `proposed` holatida saqlanadi va inson tasdig'idan o'tadi.
- Manba havolasi majburiy.
- Hisobot matnidagi raqamlar faqat `{{placeholder}}` orqali keladi.
- Hujjat ichidagi matn ma'lumot sifatida o'qiladi, ko'rsatma sifatida bajarilmaydi.
- Byudjet chegarasi bor.

**Reliz (06 §5):** DoD, PR check-list, expand/contract migratsiyalar, 5 daqiqadan qisqa rollback. Hisob-kitobga oid har qanday bug kamida S2 hisoblanadi.

---

## 5. Loyiha egasi qarorlari — birlashtirilgan reyestr

Agentlarning ~45 savoli takrorlanishlardan tozalandi. **Qalin** — keyingi fazani bloklaydiganlar.

| ID | Qaror | Tavsiya | Bloklaydi | Manba |
|---|---|---|---|---|
| **K1** | YRES uchun haqiqat manbai endi v7.20 mi ("v5 ga sodiqlik" qoidasi bekor qilinadimi)? | Ha | Faza 1 | 01 Q1 |
| **K2** | Moliya: nominal yoki real narxlar (WB talabi)? Diskont, o'sish sur'atlari, bazaviy yil, kurs manbasi (shartnoma 12 140,91 yoki MB) | v7.20 dagi kabi nominal 6,08 %, kurs loyiha darajasida | Faza 1 | 01 Q10, 05 Q4 |
| **K3** | Konvert tejashi hisobotda foydali issiqlik (kWh) yoki yakuniy yoqilg'i (÷η) ko'rinishida beriladimi? | Ikkalasi, tariflash yakuniy bo'yicha | Faza 1 | 01 Q2 |
| **K4** | FES eksport daromadi (1 100 so'm/kWh) byudjet tashkiloti uchun standart holatda yoqilganmi? | Loyiha parametri, sukut bo'yicha o'chiq | Faza 1 | 01 Q4 |
| **K5** | EE toifa shkalasi (VM 690 2-ilova) rasmiy matni | Hozircha "vaqtinchalik" belgisi bilan | Faza 2 | 01 Q3, 05 Q5 |
| **K6** | "Qabul qilingan FAIL"ni kim tasdiqlaydi (auditor / buyurtmachi)? | Auditor + asos matni; buyurtmachi hisobotda ko'radi | Faza 2 | 01 Q5 |
| **K7** | Asl texnik topshiriq (ToR): hisobot tili, formati, imzo, nusxalar soni | ToR'ni topib 3-MTM'ga qo'shish | Faza 5 | 05 Q1–Q3 |
| **K8** | Imzo: qog'oz + muhr, E-IMZO yoki ikkalasi; DOCX majburiymi? | DOCX majburiy; imzo — ToR bo'yicha | Faza 5 | 05 Q3, 01 Q9 |
| **K9** | Anthropic API hisobi (Claude Pro API'ni qoplamaydi) va oylik AI byudjeti | Alohida API kalit, 50 USD/oy, 80 % da ogohlantirish | Faza 6 | 04 D1, D3 |
| **K10** | Hisob-faktura va hujjatlarni xorijiy API'ga yuborish: shaxsiy ma'lumotlar qonuni + WB shartnomasi | Yuridik tekshiruv; kerak bo'lsa crop/maskalash | Faza 6 | 04 D2 |
| K11 | Dala xodimi — akkauntli foydalanuvchimi yoki faqat Telegram orqali javob beradimi? | MVP: faqat Telegram | Faza 3 | 03 Q2 |
| K12 | Buyurtmachi platformaga kiradimi? | Faqat ko'rish rejimi, Faza 4 dan keyin | Faza 4 | 03 Q4 |
| K13 | TelegramHub sync qayerda ishlaydi: Mac launchd yoki VPS? Guruhga yozish: bot yoki user akkaunt? | MVP: Mac + bot | Faza 6 | 04 D9, D10 |
| K14 | Mahsulot domeni (`yres.uz`?) | Ha, Faza 4 da | Faza 4 | 02 ADR-003 |
| K15 | Sanoat obyektlari qachon kerak va qaysi me'yor asosida (ISO 50002)? | Bino turi shabloni (ADR-012) orqali, maktab → kasalxona → sanoat | Faza 4+ | 01 Q8 |
| K16 | Rus tilidagi texnik terminlar lug'atini kim tasdiqlaydi? Hisobot rasmiy tili qaysi? | Loyiha egasi; hisobot tili loyiha darajasida tanlanadi | Faza 5 | 03 Q5, 05 Q2 |
| K17 | Sanity oraliqlari (CAPEX 200–300 USD/m², qoplanish 8–20 y) manbasi | Bino turi profiliga ko'chiriladi, versiyalanadi | Faza 2 | 01 Q6 |
| K18 | 3-MTM loyihasini YRES'ga import qilish kerakmi yoki u faqat regressiya etaloni bo'ladimi? | Avval etalon, keyin import (UAT uchun) | Faza 1/3 | 01 Q7 |
| K19 | Excel'dagi eskirgan izohlar v7.21 da tuzatiladimi (`Checks` D-bo'limi, C2, `Breakdown!72`)? | Ha, golden'dan oldin | Faza 1 | 01 Q12 |

---

## 6. Ish tartibi (governance)

- **Sessiyalar:** har faza alohida Claude Code sessiyasida, repo ichida bajariladi. Sessiya boshida
  `docs/production/00-MASTER-PLAN.md` va tegishli 01–06 hujjat o'qiladi.
- **Bitta topshiriq = bitta tekshirilgan commit** va `PROGRESS.md` yozuvi (`CLAUDE.md` qoidasi).
- **Mutaxassis agentlar har fazada:**
  - dasturchi — amalga oshiradi;
  - auditor — dvigatel o'zgarishlarini golden bilan tekshiradi;
  - QA — DoD va go-live mezonlarini tekshiradi;
  - dizayner — UI o'zgarishlarini preview'da tekshiradi.
- **Qaror jurnali:** yuqoridagi K-qarorlar javob olgach, shu jadvalda "Qaror:" ustuni bilan yangilanadi. Tegishli ADR `docs/adr/` ga yoziladi.
- **3-MTM ↔ YRES sinxronligi:** Excel'da har yangi versiya (v7.21…) chiqqanda golden fixture qayta ajratiladi, `divergences.json` yangilanadi.

### Keyingi sessiya uchun tayyor prompt (Faza 0)

```
docs/production/00-MASTER-PLAN.md dagi Faza 0 ni bajaring. Avval 02 (§2.1–2.3, M-1, M-2),
03 (§1.1, §8 P0) va 06 (§1.5, §7-bosqich 0) ni o'qing. Tartib: (1) CI migratsiya tuzatishi,
(2) S-1, (3) V-1 va qolgan xavfsizlik bandlari, (4) NumberInput/parseLocaleNumber,
(5) dirty-himoya va o'chirishga tasdiq, (6) iste'molni ko'p yil bo'yicha saqlash, (7) audit tugmasi.
Har band — alohida commit; CLAUDE.md dagi tekshiruvlar; PROGRESS.md yozuvi.
```

---

## 7. Xavflar

| Xavf | Ehtimol | Ta'sir | Chora |
|---|---|---|---|
| Excel metodikasi ishlab chiqish davomida o'zgarishda davom etadi (v7.21+) | Yuqori | Golden testlar doim qizil bo'ladi | Golden'ni Excel versiyasiga bog'lash, `divergences.json` |
| Bitta dasturchi — 20+ hafta ish | Yuqori | Kechikish | Faza 0–2 ni qat'iy ustuvor qilish; Faza 6 ni 3-MTM ishidan ajratish |
| Kod faqat o'qib tekshirildi, topilmalar ishga tushirib tasdiqlanmagan | O'rta | Ba'zi topilmalar noto'g'ri chiqishi mumkin | Har bandni tuzatishdan oldin test orqali qayta ishlab chiqarish |
| AI xarajati va maxfiylik (WB ma'lumotlari) | O'rta | Yuridik va moliyaviy | K9 va K10 qarorlari Faza 6 dan oldin |
| TelegramHub v0 haqiqiy akkauntda sinalmagan | O'rta | Faza 6 kechikadi | YRES tomoni TelegramHub'siz boshlanadi (qo'lda yuklash, "nusxalash" tugmasi) |
