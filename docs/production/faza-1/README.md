# Faza 1 — "Hisob to'g'riligi": ijro paketi

> **Kim uchun:** Faza 1 kodini yozadigan Claude Code sessiyasi (Sonnet).
> **Kim tayyorlagan:** loyiha boshqaruvchisi sessiyasi (Opus), 2026-10-02, repo holati `b89386a`.
> **Maqsad (master reja §3):** YRES raqamlari auditorning `3-DMTT v7.20.xlsx` kitobi bilan mos kelsin.
> Bu papka — **qanday qurish** bo'yicha yagona manba. **Nima uchun** — `00-MASTER-PLAN.md` §3 Faza 1,
> `01-audit-metodologiya.md` §1.3, §1.6, §2.3 (P0) va `06-sifat-test-va-reliz.md` §2 (golden).
> Har spec kodga **va** v7.20 kitobining o'ziga qarshi tekshirilgan (katak manzillari va qiymatlar
> keshlangan qiymatlardan o'qilgan; fayl:qator havolalari `b89386a` holatida — siljigan bo'lsa grep bilan toping).

## 0. Faza 0 dan farqi — o'qing

- **Bu faza hisob natijalarini o'zgartiradi.** Har dvigatel o'zgarishi golden test bilan birga keladi
  (`calculation-engine.md` K1 qoidasi 2): commit qaysi `divergences.json` yozuvini yopganini ko'rsatadi.
- **Haqiqat manbai — v7.20 kitobi, hujjatlar emas.** 01/06 hujjatlaridagi raqamlar ba'zan eskirgan
  (masalan 06 §2.4 dagi "taklif etilgan CAPEX 702 496,08" — kitobda `Measures_summary!D39` = **706 124,26**;
  varaq nomi `Breakdown` emas, **`Breakdown Baseline & Balance`**). Ziddiyatda kitobdagi keshlangan qiymat ustun;
  farqni PROGRESS.md ga yozing.
- **Paketni tayyorlashda topilgan, rejada yo'q ikki narsa:** (1) web UI qobiqning "keyin" holatini umuman kirita olmaydi
  (`envelope-editor/state.ts:6` `EDIT_SCENARIO = "before"`) — UI orqali yaratilgan binoda qobiq chora-tadbirlari doim 0 tejash beradi;
  F07 ga kiritildi. (2) v7.20 diskontlangan qoplanish formulasi 1 yilga ortiq beradi — dvigatel to'g'ri, Excel xatosi (F05, K21).
- **Master rejadan chetlanish (boshqaruvchi qarori):** 06 §2.5 dagi "v5 fidelity (bloklovchi)" qatlami
  **qurilmaydi**. Sabab: K1 qarori bilan v5 haqiqat manbai emas; v5 golden har P0 tuzatishida (X33 dan
  boshlab) ataylab sinadi, ya'ni u regressiyani emas, tuzatishni "ushlaydi". Regressiya himoyasini
  v7.20 golden + `divergences.json` ning ikki tomonlama qoidasi beradi (F03).

## 1. Sessiya boshida (har safar, context siqilgandan keyin ham)

1. `CLAUDE.md` → `.claude/rules/` (ayniqsa `calculation-engine.md`, `database.md`, `security.md`,
   `forms-and-numbers.md`, `data-integrity.md`, `testing-and-verification.md`, `git-and-commits.md`).
2. Shu `README.md`.
3. `PROGRESS.md` oxirgi bo'limi va pastdagi §4 jadval — qaysi topshiriq tugaganini **shulardan** bilasiz.
4. Faqat navbatdagi bitta `F0N-*.md` faylini o'qing va bajaring.

## 2. v7.20 kitobi va Python muhiti

- Kitob repo'da **yo'q** va commit qilinmaydi (8–10 MB, WB ma'lumoti). Joylashuvi (loyiha egasining Mac'i):
  `~/Library/CloudStorage/OneDrive-Personal/EA/2026/WB ECE Energy Audit/3-MTM/3-DMTT v7.20.xlsx`,
  `sha256 187d19962269d25ff6b241b97374ba868b9b38c94a9b9d27f5ac78ddf6dc5f6a`. Ekstraktor yo'lni
  `--xlsx` argumentidan oladi; sha256 mos kelmasa — xato bilan to'xtaydi.
- Kitob Excel'da saqlangan — **keshlangan qiymatlar bor**, `openpyxl` `data_only=True` yetarli, LibreOffice
  bilan qayta hisoblash shart emas. Diskontlangan qoplanish kataklari (`Financial indicators!D19` va h.k.)
  `ArrayFormula` — qiymati keshda (`"> 20"`).
- Python: tizim `python3` + loyiha ichidagi venv (`tools/golden/.venv`, gitignore). `openpyxl` versiyasi
  `tools/golden/requirements.txt` da qotiriladi. Python **faqat** fixture yaratish uchun; CI va `bun run test`
  Python'ga bog'liq emas (fixture JSON commit qilinadi).

## 3. Har topshiriq sikli va tekshiruvlar

Faza 0 README §2–§3 bilan bir xil (bitta topshiriq = bitta commit; `git-and-commits.md` uslubi; push joriy
branch'ga; deploy va production bazaga tegilmaydi). Qo'shimcha:

| Tegilgan joy | Qo'shimcha tekshiruv |
|---|---|
| `apps/api/src/services/**` yoki `audit.engine.ts` | `bun run --cwd apps/api test` to'liq yashil, **golden test ham** (F03 dan keyin) |
| Golden natijasi o'zgargan | `divergences.json` diff'i commit'da; commit matnida "yopildi: D…; yangi: D…" qatori |
| `packages/db` sxemasi | `db:generate` → SQL ko'rib chiqish → `db:migrate:local`; migratsiya faqat qo'shuvchi (`data-integrity.md`) |
| Natija shakli (`packages/types` `AuditResult`) | `hisobot.md` jadvaliga yangi maydon qatori (bo'lim holati ❌ bo'lsa ham) |

## 4. Holat jadvali

| # | Topshiriq | Fayl | Commit(lar) | Holat |
|---|---|---|---|---|
| F01 | `runFullAudit` → `loadAuditInputs` + sof `computeAudit` (xatti-harakat o'zgarmaydi) | `F01-compute-audit.md` | 1 | ✅ |
| F02 | Golden ekstraktor: `expected.json` (natijalar) | `F02-golden-expected.md` | 1 | ✅ |
| F03 | Golden ekstraktor: `inputs.json` + `golden.test.ts` + `divergences.json` | `F03-golden-inputs-test.md` | 2 (a, b) | ✅ |
| F04 | X33 generatsiya `(Q+Qd)/η` (COP), sovutish/ISI taqsimot yo'qotishi | `F04-generatsiya.md` | 1 | ✅ |
| F05 | Bino darajasidagi moliyaviy parametrlar + v7.20 pul oqimi modeli | `F05-moliya.md` | 3 (a–c) | ✅ |
| F06 | Chora-tadbir darajasida tejash, tashuvchi bo'yicha bo'lish, D71, balans nazorati | `F06-chora-tadbir-tejash.md` | 3 (a–c) | ✅ |
| F07 | Ochiq joy turi bo'yicha "keyin" holati + qobiq "keyin" muharriri (UI) | `F07-ochiq-joy.md` | 1 | ✅ |
| F08 | Pol: grunt zona usuli va isitilmaydigan bo'shliq `n`-faktori | `F08-pol.md` | 2 (a, b) | ✅ |
| F09 | FES: o'z iste'moli / eksport, summary 0 ga qirqilmaydi | `F09-fes.md` | 1 | ✅ |
| F10 | Yakun: qoidalar, golden qat'iylashtirish, loyiha egasi uchun tafovutlar ro'yxati | `F10-yakun.md` | 1 | ✅ |

**Tartib majburiy:** F01 → F02 → F03 (golden infratuzilmasisiz dvigatelga tegilmaydi) → F04 → F05 → F06 →
F07 → F08 → F09 → F10. F05 F06 dan oldin, chunki F06 ning USD qismlari F05 tariflariga tayanadi.

## 5. Qachon TO'XTASH va so'rash kerak

Faza 0 README §5 dagi barcha holatlar, qo'shimcha:
- Golden farqi spec'da tushuntirilmagan va v7.20 kitobining tegishli varag'ini o'qib ham sababi aniq
  bo'lmasa — formulani "yaqinlashtirish" uchun koeffitsient o'ylab topmang; `divergences.json` ga
  `"status": "unexplained"` bilan yozing va so'rang.
- v7.20 dagi formula bino-maxsus qattiq kodlangan bo'lsa (masalan `E10` — aniq kataklarga havola) va uni
  umumlashtirishning bir nechta halol yo'li bo'lsa — variantlarni PROGRESS.md ga yozib so'rang.
- Spec'da ko'rsatilmagan yangi K-qarori kerak bo'lsa (moliya, metodika).

## 6. Faza 1 da QILINMAYDIGAN narsalar

EE toifa, ZEB, `Checks` dvigateli (A/C/S) — Faza 2 (golden'da `divergences.json` yozuvi sifatida qoladi);
`audit_snapshot`, `ENGINE_VERSION`, maydon meta-ma'lumoti (⚠ taxmin) — Faza 2; bosqichli ish maydoni va
Excel import — Faza 3; hisobot bo'limlari (`hisobot.md` ❌ qatorlari) — Faza 5; oylik SCOP (`IHS`), BEMS
EN ISO 52120-1, gelio ehtiyoj bilan cheklash, soyalash hisobi, maydon o'lchash qoidasi (X77) — P1/P2,
golden'da tafovut sifatida qoladi. Cardiology fixture'i — keyinroq (06 §2.6).

## 7. Chiqish mezoni

`golden.test.ts` v7.20 fixture'ida yashil; F10 dagi "boshlang'ich" toleranslar ichida: tejash
664 253,78 kWh/y · 23 784,89 USD/y · CAPEX 975 113,37 · oddiy qoplanish 41,00 y · NPV −654 709,02
(`Measures_summary!E38/F38/D38/G38/N38`). `divergences.json` dagi har yozuv yo `accepted` (loyiha egasi
tasdig'i, sana bilan), yo keyingi fazaga havola qilingan. PROGRESS.md da yakuniy xulosa; `00-MASTER-PLAN.md`
§3 Faza 1 sarlavhasiga "✅ bajarildi (sana)".

## 8. Sonnet sessiyasi uchun tayyor prompt

```
docs/production/faza-1/README.md ni o'qing va unga qat'iy amal qiling. PROGRESS.md va README §4
jadvaliga qarab navbatdagi bajarilmagan topshiriqni aniqlang, faqat o'shani bajaring:
spec → kod → qabul mezonlari → tekshiruvlar (golden ham) → PROGRESS.md → bitta commit → push.
Spec bilan kod yoki v7.20 kitobi mos kelmasa yoki README §5 holati yuz bersa — to'xtang va so'rang.
```
