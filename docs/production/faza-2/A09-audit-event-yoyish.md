# A09 — `audit_event` ni barcha bino mutatsiyalariga yoyish

**Manba:** 02 D-3; `data-integrity.md` ("batch'dan tashqari audit yozuvi taqiqlanadi") · **Commit:** ikkita (a, b) · **Qachon:** hozir
**Bog'liqlik:** A02 (yordamchi), A03/A05/A06 (o'zlari allaqachon yozadi).

## Maqsad

Har bino kiritmasi o'zgarishining muallifi va vaqti ma'lum bo'lsin — `audit_event` qatori o'sha `db.batch()` ichida.

## Hozirgi holat (mutatsiya route'lari, `grep 'Routes\.\(post\|put\|patch\|delete\)('`)

| Route | Fayl:qator | Hozir | `entity` |
|---|---|---|---|
| `PUT /:id/envelope` | `routes/envelope.ts:70`, batch `:376` | batch | `envelope` |
| `PUT /:id/systems/{ventilation,dhw,distribution,generation,cooling-windows,cooling-systems,lighting,equipment,renewables}` | `routes/systems.ts:92,129,165,207,244,280,315,350,392` | batch | `systems.<bo'lim>` |
| `POST/PUT /:id/consumption`, `PUT …/bulk` | `routes/consumption.ts:76,117,172` | batch | `consumption` |
| `POST/PUT/DELETE /:id/measures[/:mid]`, `POST …/select` | `routes/measures.ts:59,102,154,184` | batch / yakka | `measures` |
| `POST/PUT/DELETE /:id/non-ee-measures[/:mid]` | `routes/measures.ts:262,290,323` | yakka | `non_ee_measures` |
| `PUT /:id/financial-parameters` | `routes/financial.ts:44` | yakka (upsert) | `financial` |
| `POST/PATCH/DELETE /:id/members[/:mid]` | `routes/members.ts:47,115,146` | yakka + `notifyUser` | `members` |
| `PUT /:id/audit/annotations/:key` | `routes/audit.ts:228` | yakka (bo'sh → delete) | `annotations` |
| `POST /:id/audit/run` | `routes/audit.ts:30-78` | 3 alohida yozuv (02 D-5) | `audit_run` |

## A09a — qobiq, tizimlar, iste'mol (bulk-replace)

1. Har route'da `auditEventStatement(...)` batch'ning **birinchi** bayonoti; `action: "replace"` (consumption POST — `create`).
   `summary`: qobiq — `{ scenario, counts: { blocks, constructionTypes, openingTypes, elements, openings } }`; tizimlar — `{ count }`;
   iste'mol — `{ years, carriers, count }`. Payload'ning o'zi yozilmaydi (8 KB chegarasi, A02).
2. Byudjet izohlarini yangilang: qobiq (`schemas/envelope.ts:100-112`) — "oldin" PUT `32 + 1 o'qish + PRAGMA + 2 UPDATE + sessiya 2 +
   kirish 1 + audit 1 = 40`; "keyin" `32 + 2 lookup + 3 + 1 = 38`; tizimlar (`schemas/systems.ts:1-8`) `28 → 28` (kirish −1, audit +1);
   iste'mol bulk (`schemas/consumption.ts:46-48`) `23 + 5 → 23 + 4 + 1`. Har birida formula yozilsin (`database.md`).

## A09b — chora-tadbirlar, moliya, a'zolar, izohlar, audit run

3. Yakka yozuvlarni `db.batch([auditEvent, mutation])` ga o'tkazing (javob shakli o'zgarmaydi; `.returning()` batch natijasidan).
   DELETE'larda `summary` ga o'chirilgan qatorning qisqa tavsifi (`{ name, category, investmentCostUsd }` — ichki ma'lumot, shaxsiy emas).
4. `members`: `summary` da faqat `targetUserId` va `role` (**email emas**); `notifyUser` batch'dan **keyin**, fire-and-forget (`realtime.md`).
5. `audit/run`: `audit_event` (`run`) **birinchi INSERT** bilan bir batch (`insert audit_run running` + audit). Shu yerga tegilgani uchun V-6:
   `:66-76` dagi `error.message` mijozga qaytarilmaydi — umumiy matn + `code: "audit_failed"`, tafsilot `console.error("[audit] …")`
   (`security.md`); `audit_run.error_message` ga saqlash qoladi (faqat bino a'zolari ko'radi — coder tekshiradi: `/status` uni qaytaradimi,
   qaytarsa ham shu xatti-harakat saqlanadi).
6. Admin route'lari (`admin-users.ts`) — **tegilmaydi** (README §6).

## Qabul mezonlari

- [ ] `tests/integration/audit-event-matrix.test.ts`: jadvaldagi **har** route uchun muvaffaqiyatli so'rov → bitta `audit_event`
      (to'g'ri `entity`, `action`, `actor_user_id`, `entity_revision` +1); zod 400 / 403 / 404 → qator yo'q.
- [ ] Batch yiqilishi (masalan qobiqda noma'lum `materialId` → FK) → `audit_event` ham yo'q (atomiklik).
- [ ] Mavjud testlar (`envelope`, `systems`, `measures-consumption`, `consumption-bulk`, `members`, `audit`) o'zgarishsiz yashil;
      `d1-parameter-limit.test.ts` eng og'ir qobiq payload'i bilan hamon o'tadi.
- [ ] `summary` da email/ism yo'q (members testi assert qiladi).

## Tekshiruvlar

type-check, lint, `bun run --cwd apps/api test` — har commit'da.

## Qilmang

- Route ichida batch'dan keyin alohida `insert(auditEvent)`. To'liq payload/diff'ni `summary` ga yozish (tarix — snapshot'larda).
