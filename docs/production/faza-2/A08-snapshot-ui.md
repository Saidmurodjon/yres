# A08 — UI: natijalar sahifasida "Rasmiy versiyalar" paneli

**Manba:** 05 §5.2 (jonli vs muzlatilgan rejim), 03 §6 (UX qoidalari) · **Commit:** bitta · **Qachon:** hozir · **Bog'liqlik:** A05, A06, A07.

## Maqsad

Auditor platformadan chiqmasdan: natijani muzlatadi, ko'rib chiqishga yuboradi, (egasi) tasdiqlaydi, rasmiy PDF chiqaradi va yuklab oladi;
jonli natija esa aniq "QORALAMA" deb belgilanadi.

## Hozirgi holat

- `apps/web/src/routes/_authenticated/buildings/$buildingId/results.tsx` — jonli natija, PDF tugmasi `:86`, `:195-206`, xato `:229-232`.
- Hook'lar `apps/web/src/hooks/use-audit.ts` (`useAuditResults` `:16`, `useDownloadAuditReport` `:69`), API `lib/api.ts:407-449`.
- Bino roli javobda bor (`GET /buildings/:id` → `role`, `routes/buildings.ts:188-199`).

## Bajarish

1. `lib/api.ts` `audit.snapshots`: `list`, `get`, `create`, `submit`, `approve`, `issueReport(sid, lang)`, `downloadReport(sid, lang)` (blob,
   mavjud `report` andozasi). Turlar — `packages/types` dagi `AuditSnapshotListItem` (A04 §6).
2. `hooks/use-snapshots.ts`: TanStack Query (`["snapshots", buildingId]`); mutatsiyalardan keyin `invalidateQueries`. Zustand'ga nusxa yo'q
   (`ui-guidelines.md`).
3. `components/building-detail/snapshots-panel.tsx` (natijalar sahifasida, jonli natija ustida yoki yonida):
   - Jadval/kartalar: sana, holat (**belgi + matn**), dvigatel versiyasi, kim yaratgan (ism API'da bo'lmasa — ko'rsatilmaydi; coder tekshiradi:
     A05 ro'yxat javobiga `createdByName` qo'shish byudjetga sig'adimi — 1 join), chiqarilgan tillar.
   - Tugmalar (rolga qarab; viewer — faqat yuklab olish): "Natijani muzlatish" (writer), "Ko'rib chiqishga yuborish" (draft), "Tasdiqlash"
     (submitted, faqat egasi — UI `role === "owner"` ni faqat yashirish uchun ishlatadi, haqiqiy tekshiruv API'da), "PDF chiqarish (<joriy til>)"
     (submitted/approved), "Yuklab olish" (chiqarilgan tillar).
   - **Tasdiqlash** va **muzlatish** `ConfirmDialog` bilan (qaytarib bo'lmaydi; muzlatish ochiq qoralama/yuborilganni almashtirishini aytadi —
     `forms-and-numbers.md` U4: mavjudni almashtiruvchi amal asosiy tugma emas). Fokus "Bekor"da.
   - Har snapshot qatorida "Verify havolasi" (approved/submitted) — `/verify/s/<id>`.
   - Bo'sh / yuklanish / xato holatlari; 409 (`illegal_transition`) → "Holat boshqa foydalanuvchi tomonidan o'zgartirilgan" + ro'yxatni yangilash.
4. Jonli natija sarlavhasiga "Qoralama — jonli hisob, rasmiy emas" belgisi; jonli PDF tugmasi "Qoralama PDF" (A06 §5).
5. i18n uz/ru/en (`audit` namespace). Ru atamalar ro'yxati PROGRESS.md ga ("Снимок результатов"? — loyiha egasi tanlasin; tavsiya
   "Официальная версия").
6. 375 px: jadval `overflow-auto` + `whitespace-nowrap` (`frontend.md`), tugmalar o'raladi; `sm+` da ham tekshiring.

## Qabul mezonlari

- [ ] Writer: muzlatish → yuborish → (egasi) tasdiqlash → PDF chiqarish → yuklab olish; viewer: faqat ko'rish va yuklab olish.
- [ ] Holat faqat rang bilan ko'rsatilmaydi; tasdiqlash/muzlatish tasdiq so'raydi.
- [ ] Preview MCP + mock API (`testing-and-verification.md`, mock shakli `AuditSnapshotListItem` ga mos) yoki PROGRESS.md da
      "brauzerda tekshirilmadi" + qo'lda tekshirish ro'yxati; 375 px skrinshot/tekshiruv.

## Tekshiruvlar

`bun run build` (Vite + tsc), `bun run --cwd apps/web test`, lint. Yangi `packages/ui` klassi qo'shilsa — `frontend.md` `@source` tekshiruvi.

## Qilmang

- Snapshot natijasini alohida sahifada to'liq ko'rsatish (natijalar sahifasini snapshot rejimiga o'tkazish) — keyinroq; hozir PDF yetarli.
- Sheet/Drawer komponentini yangidan yaratish (`frontend.md`: yo'q).
