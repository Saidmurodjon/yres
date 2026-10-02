# F01 — `runFullAudit` ni "yuklash" va "hisoblash"ga ajratish

**Manba:** 06 §2.2 variant B · **Commit:** bitta · **Natija o'zgarmaydi** (sof refaktor).
**Fayllar:** `apps/api/src/services/audit.engine.ts`, yangi `apps/api/src/services/audit-inputs.ts`,
`apps/api/tests/services/` (yangi test).

## Nima uchun

Golden test (F03) dvigatelni v7.20 kirishlari bilan **bazasiz**, millisekundlarda ishga tushirishi kerak.
Hozir `runFullAudit(db, buildingId)` (`audit.engine.ts:119`) o'qish va hisoblashni aralashtiradi:
16 ta o'qish `:124-172` dagi `Promise.all` da, yana 4 tasi o'rtada `:702-707` da (bills, measures, non-EE, tariffs).

## Bajarish

1. **`audit-inputs.ts`** — `export interface AuditInputs { ... }` va `export async function loadAuditInputs(db, buildingId): Promise<AuditInputs>`.
   - Ikkala `Promise.all` ni bitta `loadAuditInputs` ichiga ko'chiring (bitta `Promise.all`, 20 ta o'qish —
     so'rov soni o'zgarmaydi; `database.md` byudjeti ≤ 40). Bino topilmasa — hozirgidek `throw`.
   - **Tiplar faqat dvigatel o'qiydigan maydonlar** bo'lsin: `Pick<typeof building.$inferSelect, "indoorTempOperationC" | …>`
     va relation qismlari (`climateRegion.monthlyNormals`, `blocks`, `openings.openingType`, `layers.material`,
     `monthlyProduction`). `createdAt`/`updatedAt`/`userId` kabi dvigatelga keraksiz va JSON'da `Date` bo'lib
     qoladigan maydonlar **kirmaydi** — F03 fixture'i oddiy JSON bo'ladi.
   - `loadAuditInputs` natijasi shu `Pick` tiplariga mos kelishi uchun DB qatorlarini qayta qurishingiz shart emas
     (ortiqcha maydonli obyekt `Pick` ga tayinlanadi); faqat tip darajasida toraytiring.
2. **`computeAudit(inputs: AuditInputs, options: { generatedAt: string }): AuditResult`** — `audit.engine.ts` da,
   **sinxron, `db` siz**. `runFullAudit` tanasining hisoblash qismi (`:175` dan oxirigacha) shu yerga ko'chadi;
   `buildingId` `inputs.building.id` dan (yoki `inputs.buildingId`).
3. **`runFullAudit(db, buildingId)`** = `computeAudit(await loadAuditInputs(db, buildingId), { generatedAt: new Date().toISOString() })`.
   Imzosi va chaqiruvchilari (`routes/audit.ts`, `report`) o'zgarmaydi.
4. Yordamchi funksiyalar (`inferCarrierForMeasure`, `resolveMeasureStandardizedSavingsKwh`, `buildAuditSummary` …)
   o'z joyida qoladi; faqat chaqiruv joyi ko'chadi.

## Test

`apps/api/tests/services/compute-audit.test.ts`: kichik qo'lda yozilgan `AuditInputs` (1 blok, 1 devor, 1 deraza,
1 gaz qozon, 12 oylik iqlim, 1 chora-tadbir) → `computeAudit` → natija `generatedAt` ni aynan qaytaradi va
asosiy maydonlar chekli son (`Number.isFinite`). Bu golden emas — faqat "bazasiz ishlaydi" isboti.

## Qabul mezonlari

- [ ] `computeAudit` hech qanday `db`/`Database` importisiz chaqiriladi (fayl darajasida `@yres/db` dan faqat tiplar va jadval
      obyektlari `loadAuditInputs` da).
- [ ] Mavjud barcha testlar o'zgarishsiz yashil (`audit.test.ts`, `report.test.ts` — natija baytma-bayt bir xil bo'lishi kutiladi,
      `generatedAt` dan tashqari).
- [ ] `bun run type-check`, `bunx biome lint` yashil.

## Qilmang

- Formulalarni o'zgartirish (F04+). Natija keshlash (`data-integrity.md`). `computeAudit` ni async qilish.
