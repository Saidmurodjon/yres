# A02 — `audit_event` (append-only) + revision mexanizmi; `findAccessibleBuilding` bitta so'rov

**Manba:** 02 D-3, D-6, §5.2; `data-integrity.md` · **Commit:** bitta · **Qachon:** hozir
**Bog'liqlik:** A01 (shart emas, lekin tartib). **Keyin:** A03, A05 (o'z batch'iga qo'shadi), A09 (yoyish), A10 (409).

## Maqsad

"Kim, qachon, nimani" — har bino mutatsiyasi bilan **bir `db.batch()`** ichida bitta qator. Shu qatorning o'zi
bo'lim revision'ini (`entity_revision`) beradi — A10 dagi `expectedRevision` tekshiruvi qo'shimcha bayonotsiz shu yerda bajariladi.

## Hozirgi holat

- Audit izi yo'q: faqat `building.updatedAt` (`packages/db/src/schemas/buildings.ts:59`); bola jadvallar `delete + insert`
  (`routes/envelope.ts:323-376`, `routes/systems.ts:121-444`, `routes/consumption.ts:156,214`) tarixni yo'q qiladi.
- Byudjet: "oldin" qobiq PUT = 40/40 (`schemas/envelope.ts:100-112`: 32 + sessiya 2 + kirish 2 + 4). `findAccessibleBuilding`
  (`lib/building-access.ts:39-60`) a'zo uchun **2 so'rov** (bino, keyin `building_member`).
- `buildings.ts` POST (`:165-186`) va PUT (`:202-235`) — bitta yozuv, batch'siz.

## Bajarish

1. **Sxema** `packages/db/src/schemas/audit-events.ts` (+ `index.ts` eksporti), jadval `audit_event`:
   `id` (uuid), `building_id` text NOT NULL, `actor_user_id` text NOT NULL, `entity` text enum, `entity_id` text NULL,
   `action` text enum, `entity_revision` integer **NOT NULL**, `summary` text `json` NULL, `request_id` text NULL, `created_at` `timestamp_ms`.
   **FK yo'q (ataylab):** jurnal bino/foydalanuvchi o'chirilishiga bog'lanmasligi va uni to'smasligi kerak — izohda yozing.
   Indekslar: `uniqueIndex(building_id, entity, entity_revision)`, `index(building_id, created_at)`.
   `enums.ts`: `auditEntityEnum` (`building`, `envelope`, `systems.ventilation|dhw|distribution|generation|cooling_windows|cooling_systems|lighting|equipment|renewables`,
   `consumption`, `measures`, `non_ee_measures`, `financial`, `members`, `annotations`, `audit_run`, `snapshot`) va
   `auditActionEnum` (`create`, `update`, `replace`, `delete`, `restore`, `run`, `submit`, `approve`, `issue_report`).
2. **Migratsiya:** `db:generate` (jadval) + `generate --custom` (trigger):
   `CREATE TRIGGER audit_event_append_only BEFORE UPDATE ON audit_event BEGIN SELECT RAISE(ABORT, 'audit_event is append-only'); END;`
   DELETE trigger **qo'yilmaydi** — `resetTestDb()` (`tests/helpers/test-db.ts:59-69`) barcha jadvallarni `DELETE` qiladi; o'chirishga
   qarshi himoya — kodda bunday yo'l yo'qligi (A12 qoidasi).
3. **Yordamchi** `apps/api/src/lib/audit-event.ts`:
   - `auditEventStatement(db, c, { buildingId, entity, entityId?, action, summary?, expectedRevision? }): BatchItem<"sqlite">` —
     `actorUserId = c.get("user").id`, `requestId = c.req.header("cf-ray") ?? null`.
     `entity_revision` SQL subquery bilan: `(select coalesce(max(entity_revision),0)+1 from audit_event where building_id=? and entity=?)`;
     `expectedRevision` berilsa — `case when coalesce(max(…),0) = ? then coalesce(max(…),0)+1 end` → mos kelmasa **NULL → NOT NULL
     xatosi → butun batch orqaga qaytadi** (D1 batch = tranzaksiya, `database.md`).
   - Batch'da **birinchi** bayonot bo'lsin (keyingilar audit_event'ga tegmaydi, lekin o'qish tartibi aniq bo'lsin).
   - `isRevisionConflict(err)`: xato zanjirida (`err`, `err.cause`) `audit_event.entity_revision` matni bor-yo'qligi.
   - `getRevisions(db, buildingId, entities)`: bitta `select entity, max(entity_revision) … group by entity` → `Record<entity, number>` (yo'q = 0).
   - `summary`: kichik obyekt (soni, id/kodlar, o'zgargan maydon **nomlari**); `JSON.stringify` > 8 KB → `{ truncated: true }`.
     Email, ism, token, xom payload yozilmaydi (`security.md`).
4. **`findAccessibleBuilding` → bitta so'rov:** `building` LEFT JOIN `building_member` (`building_member.building_id = building.id AND user_id = ?`),
   `limit(1)`; qaytish turi va semantikasi o'zgarmaydi (egasi → `owner`, a'zo → rol, aks holda `null`). `schemas/envelope.ts:110` byudjet
   izohida `findAccessibleBuilding (≤ 2)` → `(1)`, jami "oldin" PUT 39 bo'ladi (A09a `audit_event` bilan 40).
5. **Birinchi iste'molchilar:** `POST /buildings` — id oldindan `crypto.randomUUID()`, `db.batch([auditEvent(create), insert…returning()])`;
   `PUT /buildings/:id` — `db.batch([auditEvent(update, summary: { fields: Object.keys(parsed.data) }), update…returning()])`.
   Javob shakli o'zgarmaydi.

## Qabul mezonlari

- [ ] Integratsiya: POST/PUT bino → `audit_event` qatori (actor, entity `building`, action, revision 1 → 2).
- [ ] Batch yiqilsa (mavjud bo'lmagan `climateRegionId` → FK xatosi) → bino ham, `audit_event` ham yo'q.
- [ ] `expectedRevision` noto'g'ri → `isRevisionConflict` true, ma'lumot o'zgarmagan (yordamchining o'z testi, route'siz ham bo'ladi).
- [ ] `UPDATE audit_event …` → xato (trigger).
- [ ] `audit-access.test.ts`, `members.test.ts` o'zgarishsiz yashil (bitta-so'rov refaktori xatti-harakatni o'zgartirmagan).

## Tekshiruvlar

`db:generate` SQL ko'rib chiqish, `db:migrate:local`, type-check, lint, `bun run --cwd apps/api test`.

## Qilmang

- `org_id` ustuni (Faza 4 — expand migratsiya bilan keladi). Batch'dan tashqari "keyin yozib qo'yamiz" audit yozuvi.
- `building.revision` ustuni — revision `audit_event` dan olinadi, alohida UPDATE bayonoti byudjetni buzadi.
