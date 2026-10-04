# A01 — `ENGINE_VERSION` konstantasi va oshirish qoidasi

**Manba:** 02 D-1, §5.2 (`data-integrity.md` "Faza 2 dan"), ADR-004 · **Commit:** bitta · **Qachon:** hozir
**Bog'liqlik:** yo'q. **Keyin kim ishlatadi:** A04/A05 (snapshot qatoriga yoziladi), A07 (verify), A11 (qulf testi).

## Maqsad

Har snapshot qaysi dvigatel versiyasi bilan hisoblanganini bilsin. Versiya — kodda bitta joyda yashaydigan qiymat,
natijani o'zgartiruvchi har commit'da qo'lda oshiriladi; A11 dan keyin buni golden test majburlaydi.

## Hozirgi holat (kodda tasdiqlangan)

- `grep -rn ENGINE_VERSION apps packages` — bo'sh. `data-integrity.md` "Faza 2 dan" bandida
  `apps/api/src/services/engine-version.ts` nomi va semver qoidasi bor (02 §5.2), lekin qoida ziddiyatli: "natija o'zgarsa
  minor, formula tuzatilsa patch" — formula tuzatish ham natijani o'zgartiradi.
- Hisob sof: `computeAudit(inputs, { generatedAt })` (`services/audit.engine.ts:125`) ichida `Date`/`Math.random`/env yo'q
  (`grep "new Date\|Date.now\|Math.random\|process.env" services/` — faqat `runFullAudit` `:117`). Sana-bog'liq yagona sukut —
  `defaultFinancialParameters(now)` (`lib/financial-defaults.ts`, `baseYear = now + 1`), u `loadAuditInputs` da hal qilinadi →
  snapshot `inputs` ichida muzlaydi (A05).
- Deploy qilingan kodning git sha'si Worker'ga berilmaydi (`Env`, `src/index.ts:29-60`; `wrangler.toml [vars]` `:12-16`).

## Bajarish

1. `apps/api/src/services/engine-version.ts` (yangi; `audit.engine.ts` ga **tegilmaydi**):
   ```ts
   /** Bump in the same commit as any change to computeAudit's output (see calculation-engine.md). */
   export const ENGINE_VERSION = "0.9.0";
   /** Methodology the engine targets — the golden fixture's workbook. */
   export const METHODOLOGY_VERSION = "3-DMTT v7.20";
   ```
   `0.9.0` — Faza 1 hali tugamagan; F10 yakunida `1.0.0` (A12 da tekshiriladi).
2. **Qoida** (izoh sifatida faylda va `calculation-engine.md` ga yangi band):
   - `computeAudit` natijasining **raqamlari** har qanday kiritma uchun o'zgarsa (formula, sukut qiymat, yangi had) → MINOR.
   - Faqat **shakl** qo'shilsa (yangi ixtiyoriy maydon, mavjud raqamlar o'zgarmaydi) → PATCH.
   - Metodika kitobi versiyasi almashsa (v7.20 → v7.21) yoki `AuditResult` dan maydon olib tashlansa → MAJOR, `METHODOLOGY_VERSION` ham.
   - Refaktor (natija baytma-bayt bir xil) → oshirilmaydi.
   - Faza 1 qolgan topshiriqlari (F08b, F09, F10) ham shu qoidaga bo'ysunadi — PROGRESS.md ga eslatma yozing.
3. `Env` ga ixtiyoriy `GIT_SHA?: string` (izoh: deploy vaqtida `--var GIT_SHA:$(git rev-parse --short HEAD)`; yo'q bo'lsa `null`).
   `.claude/rules/deployment.md` dagi API deploy buyrug'iga shu `--var` qo'shiladi (sir emas — `[vars]` qiymati).
4. `GET /health` (`src/index.ts:109`) javobiga `engineVersion` qo'shing (`future-platform.md` kuzatuv bandi bilan mos,
   ichki ma'lumot oshkor qilmaydi).

## Qabul mezonlari

- [ ] `engine-version.ts` mavjud, `audit.engine.ts` va golden fayllar o'zgarmagan (`git diff --stat`).
- [ ] `calculation-engine.md` da oshirish qoidasi; `deployment.md` da `GIT_SHA`.
- [ ] `/health` integratsiya testi `engineVersion` ni tekshiradi.

## Tekshiruvlar

type-check, biome lint, `bun run --cwd apps/api test`.

## Qilmang

- `AuditResult` ga `engineVersion` maydoni qo'shmang — bu `computeAudit` natijasini o'zgartiradi (Faza 1 golden'iga tegadi);
  versiya snapshot qatorida saqlanadi (A04).
- Versiyani `package.json` yoki git tag'dan avtomatik hosil qilmang — dvigatel versiyasi ilova relizi bilan bir xil emas.
