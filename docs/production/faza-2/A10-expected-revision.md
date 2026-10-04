# A10 — `expectedRevision` → 409 (optimistik raqobat nazorati)

**Manba:** 02 D-6; `data-integrity.md` ("qatorlarni almashtirish" endpoint'lari) · **Commit:** ikkita (a: API, b: web) · **Qachon:** hozir
**Bog'liqlik:** A02 (mexanizm), A09 (barcha route'lar `audit_event` yozadi).

## Maqsad

Ikki foydalanuvchi bir bo'limni bir vaqtda tahrirlasa, ikkinchisining saqlashi birinchisini jimgina o'chirmasin: `409`, ma'lumot
o'zgarmaydi, web tahrirlarni saqlab qoladi va foydalanuvchiga tanlov beradi.

## Hozirgi holat

- "Qatorlarni almashtirish" route'lari oxirgi yozuvchi yutadi (`routes/envelope.ts:70-376` va A09 jadvalidagi tizimlar/iste'mol).
- Revision manbai — A02 dagi `audit_event.entity_revision` (`max` per `(building_id, entity)`), guard — `auditEventStatement({ expectedRevision })`.
- Web tahrir holati `useSyncedRows`/`useRegisterDirty` bilan (`forms-and-numbers.md`); qobiq dialogi
  `components/building-detail/envelope-editor-dialog.tsx`, tizimlar `systems-tab.tsx`, iste'mol `consumption-tab.tsx`,
  chora-tadbirlar `measures-tab.tsx`, moliya `financial-parameters-card.tsx`.

## A10a — API

1. **GET'lar revision qaytaradi** (`getRevisions`, +1 so'rov): `GET /:id/envelope` (`routes/envelope.ts:24`) → `revision`;
   `GET /:id/systems` (`routes/systems.ts:40`) → `revisions: { ventilation, dhw, … }`; `GET /:id/consumption` (`consumption.ts:45`) → `revision`;
   `GET /:id/measures` (`measures.ts:22`) → `revision`; `GET /:id/financial-parameters` (`financial.ts:15`) → `revision`.
2. **Guard qo'llanadigan yozuvlar** (to'liq almashtiruvchi): `PUT envelope`, 9 ta `PUT systems/*`, `PUT consumption`, `PUT consumption/bulk`,
   `POST measures/select`, `PUT financial-parameters`. Zod: `expectedRevision: z.number().int().min(0).max(1_000_000).optional()`.
   **Ixtiyoriy (expand):** yo'q bo'lsa guard'siz yoziladi — eski ochiq web tab'lar deploy'dan keyin 400 olmasin. Majburiy qilish —
   keyingi relizda (contract), A12 da qayd.
3. Batch yiqilsa va `isRevisionConflict(err)` → `409 { error: "This section was changed by someone else.", code: "revision_conflict",
   currentRevision }` (`currentRevision` — faqat konflikt yo'lida 1 qo'shimcha o'qish). Boshqa xatolar avvalgidek.
4. Muvaffaqiyatli javobga yangi `revision` qo'shiladi (`expectedRevision + 1` yoki guard'siz bo'lsa qayta o'qilgan qiymat — coder tekshiradi:
   batch natijasidan olish mumkinmi, aks holda +1 so'rov byudjetga sig'adimi; qobiq "oldin" PUT 40/40 — u yerda **faqat** `expectedRevision + 1`).
5. Yakka CRUD (`measures` POST/PUT/DELETE, `non-ee`) guard'siz, lekin `measures` revision'ini oshiradi (A09) — tanlash sahifasi eskirgan
   ro'yxat bilan saqlasa 409 oladi. Bu ataylab.

## A10b — web

6. Har tahrirlovchi forma GET'dan kelgan `revision` ni tahrir boshlangan paytdagi qiymat sifatida saqlaydi (server sinxronida
   `useSyncedRows` — iflos holatda revision ham yangilanmaydi) va saqlashda `expectedRevision` yuboradi; muvaffaqiyatda javobdagi `revision`.
7. `409 revision_conflict` → `ConfirmDialog` (destruktiv emas): "Bu bo'limni boshqa foydalanuvchi o'zgartirdi. [Mening tahrirlarimni
   saqlash (ustidan yozish)] [Ularning versiyasini yuklash (mening tahrirlarim yo'qoladi)]". Birinchisi `currentRevision` bilan qayta yuboradi,
   ikkinchisi tasdiq bilan refetch. **Tahrirlar hech qachon jimgina tashlanmaydi** (`forms-and-numbers.md`). Matn uz/ru/en.
8. `ApiError` (`lib/api.ts:60-66`) `code` ni allaqachon olib yuradi — yangi tur kerak emas.

## Qabul mezonlari

- [ ] (a) Integratsiya: A va B bir xil `revision` bilan o'qiydi; A saqlaydi → 200; B saqlaydi → 409, B ning ma'lumoti yozilmagan,
      `audit_event` da B qatori yo'q. `expectedRevision` siz → eski xatti-harakat. Tizimlarning boshqa bo'limini saqlash 409 bermaydi.
- [ ] (a) Qobiq "oldin" PUT eng og'ir payload + `expectedRevision` bilan D1 byudjetidan oshmaydi (`d1-parameter-limit` andozasi).
- [ ] (b) Brauzerda (Preview MCP + mock API 409 qaytaradi) dialog chiqadi, tahrirlar saqlanadi; yoki PROGRESS.md da qo'lda ro'yxat.

## Tekshiruvlar

(a) type-check, lint, `bun run --cwd apps/api test`. (b) `bun run build`, `bun run --cwd apps/web test`, lint.

## Qilmang

- `If-Match`/ETag sarlavhasi bilan parallel ikkinchi mexanizm. `building.revision` ustuni (A02 §Qilmang).
- 409 da avtomatik qayta urinish yoki avtomatik birlashtirish (merge).
