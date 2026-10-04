# A11 — `ENGINE_VERSION` qulfi: dvigatel natijasi o'zgarsa versiya oshirilishi shart

**Manba:** `data-integrity.md` (`ENGINE_VERSION` har natija o'zgarishida), A01 qoidasi · **Commit:** bitta
**Qachon:** **F10 dan keyin** — golden test infratuzilmasiga (`apps/api/tests/golden/`) tegadi; Faza 1 golden'i hali harakatda.
**Bog'liqlik:** A01, Faza 1 F10.

## Maqsad

A01 qoidasi faqat intizomga tayanmasin: `computeAudit` golden natijasi o'zgarib, `ENGINE_VERSION` o'zgarmasa — test qizil.
Aks holda turli natijali ikki snapshot bir xil versiya bilan belgilanadi va verify sahifasidagi versiya ma'nosini yo'qotadi.

## Hozirgi holat

- Golden: `tests/golden/golden.test.ts`, kiritma `fixtures/3-dmtt/v7.20/inputs.json` (`load-inputs.ts`), `divergences.json` — natijani
  kitob bilan tolerans ichida solishtiradi, lekin **har qanday** o'zgarishni ushlamaydi (tolerans ichidagi o'zgarish ham versiyani talab qiladi).
- `computeAudit` sof (A01 "Hozirgi holat"); `generatedAt` tashqaridan beriladi.

## Bajarish

1. `apps/api/tests/golden/engine-version.lock.json`: `{ "engineVersion": "1.0.0", "resultDigest": "<sha256>" }`.
2. `apps/api/tests/golden/engine-version.test.ts`:
   - `computeAudit(goldenInputs, { generatedAt: "2000-01-01T00:00:00.000Z" })` → raqamlarni **10 ta muhim raqamgacha** yaxlitlab
     (`Number(x.toPrecision(10))`, rekursiv; V8/JSC oxirgi ulp farqlari va kelajakdagi Workers runtime farqi qulfni sindirmasin) →
     kalitlar tartiblangan JSON → SHA-256.
   - `digest !== lock.resultDigest && ENGINE_VERSION === lock.engineVersion` → xato: "Dvigatel natijasi o'zgardi — ENGINE_VERSION ni
     A01 qoidasi bo'yicha oshiring va lock'ni yangilang".
   - `ENGINE_VERSION !== lock.engineVersion` → xato: "lock'ni yangilang" (versiya va lock bir commit'da o'zgaradi).
   - Yangilash: `UPDATE_ENGINE_LOCK=1 bun run --cwd apps/api test golden/engine-version` faylni qayta yozadi (faqat shu env bilan).
3. F10 yakunida `ENGINE_VERSION = "1.0.0"` (agar F10 o'zi oshirmagan bo'lsa — shu commit'da, PROGRESS.md da izoh bilan).
4. `calculation-engine.md` K1 qoidasi 2 ga bitta qator: "golden o'zgarishi → `ENGINE_VERSION` + `engine-version.lock.json` bir commit'da".

## Qabul mezonlari

- [ ] Hozirgi kodda test yashil. Sinov uchun (commit qilinmaydi) bitta formulaga `* 1.0001` qo'shilsa — test qizil, xabar tushunarli.
- [ ] `ENGINE_VERSION` ni oshirib lock'ni yangilamaslik — qizil.
- [ ] CI `bun run test` da ishlaydi (Python yoki tarmoq kerak emas).

## Tekshiruvlar

`bun run --cwd apps/api test` (golden ham), lint, type-check.

## Qilmang

- `divergences.json`/`expected.json` ni o'zgartirish — bu qulf ulardan mustaqil.
- Snapshot'ni dvigatel versiyasi o'zgarganda "migratsiya" qilish yoki qayta hisoblash — eski snapshot eski versiyada qoladi (ADR-004).
