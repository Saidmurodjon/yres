# A06 — Rasmiy PDF snapshot'dan: o'zgarmas R2 kaliti + SHA-256; jonli PDF = QORALAMA

**Manba:** 02 D-1, A-2, P-1; 05 §2.2 Q1/Q2, §5.2, R7; master reja §4 metodika 5 · **Commit:** bitta · **Qachon:** hozir
(`report.service.ts`/`audit.ts` — dvigatel emas; `report-data.service.ts` ga tegilmaydi). **Bog'liqlik:** A04, A05.

## Maqsad

Bankka ketadigan PDF bir marta, snapshot'dan generatsiya qilinadi, baytlari R2'da o'zgarmas kalitda saqlanadi va har yuklab olishda
**aynan shu baytlar** qaytadi (qayta generatsiya yo'q → "bir yildan keyin ham baytma-bayt bir xil" konstruksiya bo'yicha). Jonli
hisobot qoladi, lekin aniq "QORALAMA" va QR'siz.

## Hozirgi holat

- `GET /:id/audit/report` (`routes/audit.ts:140-205`): natija jonli (`:161-167`), QR → `/verify/{auditRunId}` (`:175`), yozuvchi uchun
  `reports/{buildingId}/latest.pdf` ustidan yoziladi va `audit_run.report_r2_key` yangilanadi (`:185-196` — "Faza 2 da yo'qoladi" izohi bilan).
- `generateAuditReportPdf(building: Building, result, extras, lang, yandexKey?, verifyUrl?)` (`services/report.service.ts:884-891`),
  `Building = typeof building.$inferSelect` (`:16`); QR bloki `:907-919` (`verifyUrl` bo'lmasa chizilmaydi). `PDFDocument.create()` `:103`.
- Yandex xaritasi har generatsiyada tashqaridan olinadi (`:857`, `:927`) → qayta generatsiya baytma-bayt bir xil bo'lmaydi; shu sabab saqlanadi.

## Bajarish

1. `report.service.ts`:
   - `ReportBuilding = Pick<Building, …REPORT_BUILDING_FIELDS>` (A05) — `generateAuditReportPdf` shu turni qabul qiladi (to'liq qator ham mos).
   - Oxirgi ixtiyoriy argument `options?: { draft?: boolean; snapshot?: { id: string; engineVersion: string; methodologyVersion: string } }`.
   - `draft` → har sahifaga diagonal `t(lang, "draftWatermark")` (`page.drawText`, `rotate: degrees(45)`, `opacity` ≈ 0,12, rang `MUTED`;
     `ReportLayout` sahifa qo'shilganda ham — `addPage` yo'lini toping) va muqovada "Rasmiy emas" qatori.
   - `snapshot` → muqovada QR ostida: `Snapshot <id 8 belgi> · Dvigatel <engineVersion> · <methodologyVersion> · <generatedAt sanasi>`.
   - `doc.setCreationDate/ModificationDate(new Date(result.generatedAt))` — metadata hozirgi vaqtga bog'lanmasin.
   - `report-i18n.ts`: `draftWatermark` (uz "QORALAMA", ru "ЧЕРНОВИК", en "DRAFT"), `notOfficial`, `snapshotLine` — ru matnini PROGRESS.md da
     loyiha egasi ko'rib chiqishi uchun belgilang (`i18n-and-appearance.md`).
2. `GET /:id/audit/report` (jonli): `draft: true`, `verifyUrl` **berilmaydi**, R2 yozuvi va `audit_run` UPDATE **olib tashlanadi** (`:185-196`)
   → GET endi hech narsa yozmaydi (A-2 to'liq yopiladi). `audit_run.report_r2_key` ustuni qoladi (contract — keyinroq, `data-integrity.md`).
3. `POST /:id/audit/snapshots/:sid/reports` `{ lang }` (zod `enum(["en","ru","uz"])`): `canWrite` → 403; snapshot (`id` + `buildingId` bilan)
   holati `submitted|approved` bo'lmasa `409`; `(sid, lang)` qatori bor bo'lsa → `200` mavjudini qaytaradi (**qayta generatsiya yo'q**).
   Aks holda: `result.json` + `context.json` (hash tekshiruvi, A05) → PDF (`draft: false`, `verifyUrl = ${WEB_URL}/verify/s/${sid}`, `snapshot` meta)
   → `sha256` → R2 `reports/{b}/{sid}/{lang}-{reportId}.pdf` (**`reportId` kalitda** — parallel so'rovlar bir-birining baytini ustidan
   yozmasin; 02 D-1 dagi `{lang}.pdf` dan ataylab chetlanish) → `db.batch([auditEvent(snapshot, issue_report, { lang, sha256 }),
   insert(audit_snapshot_report)])`. Unique to'qnashuv (poyga) → mavjud qatorni qaytaring, yetim obyekt zararsiz.
   **Byudjet:** sessiya 2 + kirish 1 + snapshot 1 + mavjud hisobot 1 + batch 2 = 7 D1; R2 2 get + 1 put + Yandex 1.
4. `GET /:id/audit/snapshots/:sid/reports/:lang` (viewer ham): qator snapshot orqali `buildingId` bilan bog'lab o'qiladi (IDOR); R2 baytlari,
   SHA-256 qayta tekshiruvi (mos kelmasa `500` + `[snapshot] report integrity mismatch`); `Content-Type: application/pdf`,
   `Content-Disposition: attachment; filename="<slug>-<sid 8>-<lang>.pdf"`. Hech narsa yozmaydi.
5. Web: jonli yuklab olish tugmasi (`routes/_authenticated/buildings/$buildingId/results.tsx:195-206`) yorlig'i "Qoralama PDF" (uz/ru/en);
   rasmiy tugmalar — A08.

## Qabul mezonlari

- [ ] Integratsiya: snapshot → submit → PDF chiqarish → ikki marta yuklab olish: baytlar bir xil va `sha256` qatorga teng; bino kiritmasi va
      global tarif o'zgargach ham yuklab olingan baytlar o'zgarmaydi; ikkinchi POST → o'sha qator (yangi R2 obyekti yo'q).
- [ ] `draft` snapshot uchun POST → 409; viewer POST → 403, GET → 200; begona bino → 404.
- [ ] Jonli GET R2'ga va `audit_run` ga yozmaydi (`report.test.ts` / `audit-access.test.ts` yangilanadi); PDF'da QR yo'q.
- [ ] `report.service.test.ts`: `draft: true` va `snapshot` meta bilan PDF yaratiladi; PDF'ni ochib ko'rib (`hisobot.md` §Tekshirish)
      suv belgisi sahifadan chiqmasligi tekshiriladi — ochib ko'rilmagan bo'lsa PROGRESS.md da ochiq yozing.

## Tekshiruvlar

type-check, lint, `bun run --cwd apps/api test`, `bun run build` (web yorlig'i).

## Qilmang

- Rasmiy PDF'ni GET da "lazy" generatsiya qilish (GET yozmaydi, `security.md`). DOCX, raqamlash `YRES-…-v1.0`, imzo — Faza 5 (K26).
- Snapshot PDF'ni `draft` snapshot'dan chiqarish; mavjud PDF'ni "yangilash" (yangi snapshot yarating).
