# A05 — Snapshot API: yaratish/ro'yxat/o'qish (a) va holat o'tishlari (b)

**Manba:** 02 D-1, P-2, ADR-004; master reja §4 metodika 5-qoida ("rasmiy natija faqat snapshot'dan") · **Commit:** ikkita (a, b)
**Qachon:** hozir — `loadAuditInputs`/`computeAudit` faqat **chaqiriladi**, o'zgartirilmaydi. **Bog'liqlik:** A01, A02, A04.

## Hozirgi holat

- `runFullAudit` = `computeAudit(await loadAuditInputs(db, id), { generatedAt: now })` (`services/audit.engine.ts:115-119`).
  `AuditInputs` (`services/audit-inputs.ts:96-263`) JSON-serializatsiyalanadi va barcha tashqi qiymatlarni o'z ichiga oladi: tariflar va
  emissiya koeffitsientlari (`tariffs`), kurs/diskont/o'sish (`financialParameters`, sukutlar `defaultFinancialParameters(now)` bilan
  hal qilingan), iqlim normallari (`climateRegion.monthlyNormals`), `surfaceResistances`, `pipeLossReferences`, `lampTypes`, materiallar
  (`constructionTypes[].layers[].material`). 21 so'rov (`:266`).
- Hisobot qo'shimcha manbalarni **jonli** o'qiydi (`routes/audit.ts:161-167`): `getUValueBreakdown` (2 so'rov), `getConsumptionHistory` (1),
  `getLatestEnergyTariffs` (1, global!), `getReportAnnotations` (1) — `services/report-data.service.ts:48,171,186,202` — va `access.building`.
  Ular ham muzlatilishi kerak → `context.json`.

## A05a — yaratish, ro'yxat, o'qish

1. `services/snapshot.service.ts`:
   - `buildSnapshotPayload(db, building, generatedAt)` → `{ inputs, result, context }`; `context = { building: pick(REPORT_BUILDING_FIELDS),
     extras: ReportExtras }`. `REPORT_BUILDING_FIELDS` — `report.service.ts` ishlatadigan maydonlar (`name, location, buildingType, yearBuilt,
     latitude, longitude, netCooledFloorAreaM2, heatingSeasonDurationDays, indoorTemp*, outdoor*, occupantCount, coolingEnthalpy*`;
     `grep -o "building\.[a-zA-Z]*" services/report.service.ts`). `userId`, `searchText`, `Date` maydonlar kirmaydi.
   - `serialize(x)` → `TextEncoder().encode(JSON.stringify(x))`; `sha256Hex(bytes)` (`crypto.subtle.digest`). Hash **saqlangan baytlar**dan.
   - `readSnapshotJson(bucket, key, expectedSha)` — o'qishda hashni qayta tekshiradi; mos kelmasa xato (route: `500` umumiy matn,
     log `[snapshot] integrity mismatch <snapshotId>` — shaxsiy ma'lumotsiz).
2. `routes/snapshots.ts` (yoki `audit.ts` ichida; `src/index.ts` da ulash):
   - `POST /:id/audit/snapshots` — `findAccessibleBuilding` → 404, `canWrite` → 403. `generatedAt = now`. Tartib: **avval 3 ta R2 `put`**
     (`snapshots/{b}/{s}/…json`), **keyin** `db.batch([auditEvent(snapshot, create, entityId s), update(audit_snapshot).set(superseded)
     .where(building_id=b AND status IN ('draft','submitted')), insert(audit_snapshot)])`. Batch yiqilsa R2'da yetim obyektlar qoladi —
     zararsiz (hech kim ularga ishora qilmaydi), izohda yozing. Javob `201 { snapshot }`.
     **Byudjet:** sessiya 2 + kirish 1 + kiritmalar 21 + kontekst 5 + batch 3 = **32 D1**; + 3 R2 = 35 subrequest (< 50).
   - `GET /:id/audit/snapshots` — viewer ham; `limit 50`, `created_at desc`; har biriga `audit_snapshot_report` qatorlari
     (`inArray(snapshotId, subquery)` — JS massivi emas, `database.md`). R2'ga tegmaydi (`summary` ustunidan).
   - `GET /:id/audit/snapshots/:sid` — `:sid` `z.string().uuid()`; qator **`and(eq(id, sid), eq(buildingId, id))`** (IDOR, `security.md`);
     `result.json` R2'dan, hash tekshiruvi bilan → `{ snapshot, result }`. **Qayta hisoblamaydi.**
3. Testlar uchun R2: `tests/helpers/test-env.ts:9-11,40` dagi `put`-only soxta bucket o'rniga `getPlatformProxy` ning lokal R2'si
   (`proxy.env.REPORTS_BUCKET`, `wrangler.toml` binding'idan) — ishlamasa `Map` asosidagi `get/put/head` soxtasi (README §5).

## A05b — holat o'tishlari

4. `lib/building-access.ts`: `canApprove(role)` — **K24 tavsiyasi: faqat `owner`**. Route'da `role === "owner"` yozilmaydi (`future-platform.md`).
5. `POST /:id/audit/snapshots/:sid/submit` — `canWrite`; batch `[auditEvent(submit), update status='submitted', submitted_by/at]`.
   `POST …/:sid/approve` — `canApprove` → 403; batch `[auditEvent(approve), update(eski approved → superseded, superseded_at, superseded_by_id=sid)
   **avval**, keyin update(sid → approved, approved_by/at)]` (qisman unique indeks har bayonotda tekshiriladi).
   Noqonuniy o'tish trigger orqali butun batch'ni qaytaradi → route `409 { error, code: "illegal_transition" }` (xato matnida
   `illegal snapshot status transition`); ichki xato matni mijozga berilmaydi.

## Qabul mezonlari

- [ ] (a) Snapshot yaratilgach bino kiritmasi, global `energy_tariff` va `climate_monthly_normal` o'zgartiriladi → `GET …/:sid` natijasi
      o'zgarmagan, jonli `/audit/results` esa o'zgargan.
- [ ] (a) Qayta tiklanuvchanlik: `computeAudit(JSON.parse(inputs), { generatedAt })` == saqlangan `result` (deep equal, shu `ENGINE_VERSION`).
- [ ] (a) R2 obyektini buzish (test) → `500`, natija qaytmaydi. Begona bino `:sid` → `404`; viewer POST → `403`.
- [ ] (a) Yangi snapshot ochiq `draft`/`submitted` ni `superseded` qiladi; `approved` ga tegmaydi.
- [ ] (b) `draft→submitted→approved`; ikkinchi approve → eski `superseded`; `approved` ni yana `submit` → 409; editor approve → 403.
- [ ] Har amal `audit_event` da (`snapshot`, mos `action`, `entity_id`).

## Tekshiruvlar

type-check, lint, `bun run --cwd apps/api test`.

## Qilmang

- Snapshot uchun `computeAudit`/`AuditResult`/golden'ga o'zgarish. Snapshot'ni "kesh" sifatida `/results` da ishlatish (draft jonli qoladi).
- `audit_snapshot` qatorini `DELETE` qiluvchi endpoint.
