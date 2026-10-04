# A03 — Bino soft-delete (`deleted_at`) va tiklash

**Manba:** 02 D-4, §5.2; `data-integrity.md` · **Commit:** bitta · **Qachon:** hozir
**Bog'liqlik:** A02 (`audit_event`). **Keyin:** A04 — snapshot FK'si binoni qattiq o'chirishni to'sadi, shuning uchun bu oldin.

## Maqsad

`DELETE /buildings/:id` audit tarixini, kiritmalarni va (A04 dan keyin) snapshot'larni yo'q qilmasin. Bino yashiriladi, tiklanadi.

## Hozirgi holat

- `routes/buildings.ts:238-251` — egasi `db.delete(building)`; ~20 bola jadvali `onDelete: "cascade"` (`grep 'references(() => building.id'`
  `packages/db/src/schemas`) — bitta so'rov hammasini o'chiradi, `audit_run` ham (`schemas/audits.ts:13-15`).
- Bino o'quvchilari: `lib/building-access.ts:14-22` (`findOwnedBuilding`), `:39-60` (`findAccessibleBuilding`, A02 dan keyin bitta so'rov);
  `routes/buildings.ts:21-27` (`accessibleBuildingsCondition` — `GET /` `:47`, `/locations` `:112`, `/stats` `:130` ishlatadi);
  `services/audit-inputs.ts:40` (faqat kirish tekshiruvidan keyin chaqiriladi); `routes/verify.ts:25-34` (join).
- Kodda foydalanuvchini o'chirish yo'li yo'q (`grep "delete(user)" apps/api/src` — bo'sh) → `building.userId` kaskadi (02 D-4) tegilmaydi (README §0.4).

## Bajarish

1. `building.deletedAt` — `integer("deleted_at", { mode: "timestamp_ms" })` NULL. Migratsiya faqat `ALTER TABLE … ADD` (expand).
   `building` jadvali **qayta yaratilmasligi** kerak — `db:generate` chiqishini tekshiring.
2. `building-access.ts`: ikkala funksiyada `isNull(building.deletedAt)` sharti; yangi
   `findOwnedBuildingIncludingDeleted()` (faqat tiklash uchun). Authz bu fayldan tashqariga chiqmaydi (`future-platform.md`).
3. `accessibleBuildingsCondition` ga `isNull(building.deletedAt)` — ro'yxat, hududlar, statistika (dashboard metrikalari, `dashboard.md`).
4. `DELETE /buildings/:id` → `db.batch([auditEvent({ entity: "building", action: "delete" }), update(building).set({ deletedAt: now })
   .where(and(eq(building.id, id), isNull(building.deletedAt)))])`. Javob `204` o'zgarmaydi. Byudjet: sessiya 2 + egalik 1 + 2 = 5.
5. `POST /buildings/:id/restore` — faqat egasi (`findOwnedBuildingIncludingDeleted`), o'chirilmagan bo'lsa `409`; batch: audit `restore` +
   `deletedAt = null`. Web UI'da "O'chirilganlar" ro'yxati **qurilmaydi** (Faza 3/4); endpoint loyiha egasi/qo'llab-quvvatlash uchun,
   `docs/runbooks/backup-va-tiklash.md` ga bitta qator (curl misoli) qo'shing.
6. Web o'chirish tasdiq matni (`components/building-detail/delete-building-dialog.tsx`, `ConfirmDialog`) — "qaytarib bo'lmaydi" deyilgan bo'lsa,
   "qo'llab-quvvatlash orqali tiklanadi" ga o'zgartiring (uz/ru/en). Tugma destruktivligicha qoladi.
7. `verify.ts` join'iga **filtr qo'shilmaydi** — o'chirilgan binoning chiqarilgan hisoboti tekshirilaverishi kerak (A07 da test).

## Qabul mezonlari

- [ ] O'chirilgan bino: `GET /buildings`, `/stats`, `/locations` da yo'q; `GET /:id`, envelope/systems/... route'lari `404` (403 emas).
- [ ] Bola qatorlar (`envelope_element`, `utility_bill`, `audit_run`) o'chirilmagan; `audit_event` da `delete` qatori.
- [ ] Muharrir/viewer o'chira olmaydi (`404`, mavjud xatti-harakat); qayta `DELETE` → `404`.
- [ ] `restore` → bino yana ko'rinadi; begona foydalanuvchi → `404`; o'chirilmaganini tiklash → `409`.
- [ ] `buildings.test.ts` dagi mavjud o'chirish testlari yangi semantikaga moslangan (o'chirish → yo'q emas, yashirin).

## Tekshiruvlar

`db:generate` (faqat `ADD COLUMN`), `db:migrate:local`, type-check, lint, `bun run --cwd apps/api test`, `bun run build` (web matni).

## Qilmang

- Bola jadvallarga `deleted_at` (README §0.3). Qattiq o'chirish/purge endpoint'i. `onDelete` larni o'zgartirish.
- `deletedAt` filtrini route'larning o'zida takrorlash — faqat `building-access.ts` va `accessibleBuildingsCondition` da.
