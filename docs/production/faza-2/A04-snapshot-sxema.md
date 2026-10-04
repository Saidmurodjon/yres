# A04 — `audit_snapshot` va `audit_snapshot_report` sxemasi, o'zgarmaslik triggerlari, ADR-004

**Manba:** 02 D-1, ADR-004, §5.2; 05 §5.2 · **Commit:** bitta · **Qachon:** hozir
**Bog'liqlik:** A03 (FK binoni qattiq o'chirishni to'sadi). **Keyin:** A05–A07.

## Maqsad

Rasmiy natijaning o'zgarmas yozuvi. JSON'lar R2'da, D1'da kalit + SHA-256 + holat. O'zgarmaslik **DB darajasida** (trigger),
faqat kod intizomiga tayanmaydi.

## Hozirgi holat

- `audit_run` (`packages/db/src/schemas/audits.ts:7-29`) — faqat hayot sikli; `report_r2_key` ustidan yoziladigan `latest.pdf` ga ishora
  qiladi (`routes/audit.ts:187-196`). Natija/kiritma saqlanmaydi (02 D-1).
- O'lcham (README §0.1): `result` ≈ 214 KB, `inputs` ≈ 41 KB (3-DMTT) → D1 bayonoti ≤ 100 KB ga sig'maydi → R2.
- R2: faqat `REPORTS_BUCKET` (`wrangler.toml:27-29`, prod `:104-106`). Yangi bucket **ochilmaydi** — prefiks bilan ajratiladi.
- `docs/adr/` da ADR-004 fayli yo'q (faqat 011, 015, 016).

## Bajarish

1. `enums.ts`: `snapshotStatusEnum = ["draft", "submitted", "approved", "superseded"]`.
2. `packages/db/src/schemas/snapshots.ts`, jadval **`audit_snapshot`**:
   `id`; `building_id` → `building.id` **`onDelete` siz** (restrict — snapshot hech qachon kaskad o'chmaydi); `status` (default `draft`);
   `engine_version` NOT NULL; `methodology_version` NOT NULL; `build_sha` NULL; `generated_at` text (ISO, `result.generatedAt` bilan bir xil);
   `inputs_r2_key`, `inputs_sha256`, `result_r2_key`, `result_sha256`, `context_r2_key`, `context_sha256` — barchasi NOT NULL;
   `summary` text `json` (faqat `AuditSummary`, ≈ 1,3 KB — ro'yxat uchun R2'siz); `created_by_user_id` → `user.id`, `created_at`;
   `submitted_by_user_id`/`submitted_at`, `approved_by_user_id`/`approved_at`, `superseded_at`, `superseded_by_id` (o'ziga, FK'siz) — NULL.
   Indekslar: `index(building_id, created_at)`; **qisman unique** `(building_id) WHERE status = 'approved'` (bitta binoda bitta amaldagi
   rasmiy versiya). drizzle `uniqueIndex().on().where(sql…)` generatsiya qilmasa — `--custom` migratsiyaga.
3. Jadval **`audit_snapshot_report`**: `id`; `snapshot_id` → `audit_snapshot.id` (`onDelete` siz); `lang` (`en|ru|uz`);
   `r2_key`, `sha256`, `size_bytes` NOT NULL; `created_by_user_id`, `created_at`. `uniqueIndex(snapshot_id, lang)`.
4. **Triggerlar** (`generate --custom`, har biri alohida `--> statement-breakpoint` bilan):
   - `audit_snapshot_frozen`: `BEFORE UPDATE OF building_id, engine_version, methodology_version, build_sha, generated_at, inputs_r2_key,
     inputs_sha256, result_r2_key, result_sha256, context_r2_key, context_sha256, summary, created_by_user_id, created_at ON audit_snapshot`
     → `RAISE(ABORT, 'audit_snapshot is immutable')`.
   - `audit_snapshot_status_flow`: `BEFORE UPDATE OF status … WHEN NOT ((OLD.status='draft' AND NEW.status IN ('submitted','superseded'))
     OR (OLD.status='submitted' AND NEW.status IN ('approved','superseded')) OR (OLD.status='approved' AND NEW.status='superseded'))`
     → `RAISE(ABORT, 'illegal snapshot status transition')`. Bu A05b dagi parallel tasdiqlashni ham atomik to'sadi.
   - `audit_snapshot_report_frozen`: `BEFORE UPDATE ON audit_snapshot_report` → ABORT.
   DELETE triggerlari yo'q (`resetTestDb`, A02 §2); o'chirish yo'li kodda yo'q va bino FK'si restrict.
5. **R2 kalitlari (o'zgarmas, `REPORTS_BUCKET`):** `snapshots/{buildingId}/{snapshotId}/inputs.json|result.json|context.json`,
   `reports/{buildingId}/{snapshotId}/{lang}.pdf` (02 D-1). Eski `reports/{buildingId}/latest.pdf` A06 da yozilmay qo'yiladi.
6. `packages/types`: `AuditSnapshotStatus`, `AuditSnapshotListItem` (id, status, engineVersion, generatedAt, createdAt, summary,
   reports: `{ lang, sha256, createdAt }[]`) — web A08 shu turdan foydalanadi.
7. `docs/adr/ADR-004-audit-snapshot.md` (ADR-016 formatida): qaror (b), R2 sababi (o'lcham), triggerlar, holat oqimi, K24–K26 havolasi.
8. `docs/data-dictionary.md` / `docs/er-diagram.md` da yangi jadvallar (qisqa).

## Qabul mezonlari

- [ ] Migratsiya lokal D1'ga toza qo'llanadi; `building` jadvali qayta yaratilmagan.
- [ ] Integratsiya (`tests/integration/snapshot-schema.test.ts`): muzlatilgan ustunni UPDATE → xato; `draft→approved`, `approved→draft`,
      `superseded→approved` → xato; `draft→submitted→approved→superseded` → o'tadi; bitta binoda ikkinchi `approved` → unique xatosi;
      `audit_snapshot_report` UPDATE → xato; snapshot'li binoni `db.delete(building)` → FK xatosi.

## Tekshiruvlar

`db:generate` + `--custom`, SQL'ni ko'zdan kechirish, `db:migrate:local`, type-check, lint, `bun run --cwd apps/api test`.

## Qilmang

- `inputs_json`/`result_json` ni D1 ustuniga (README §0.1). Gzip bilan siqib sig'dirishga urinmang — R2 oddiyroq va chegarasiz.
- `audit_run` ga snapshot ustunlarini qo'shish — u jonli hisoblash sikli bo'lib qoladi (`dashboard.md`: holatlar mustaqil).
