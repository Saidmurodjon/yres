# T03 — V-1: chat biriktirmalari orqali stored XSS

**Manba:** 02 §2.3 V-1 · Jiddiylik: 🟠 Yuqori. **Commit:** bitta.
**Tegiladigan fayllar:** `apps/api/src/routes/chat.ts`, yangi `apps/api/src/lib/attachments.ts`,
yangi `apps/api/tests/services/attachments.test.ts`, `apps/web/src/routes/_authenticated/chat/$conversationId.tsx`
(faqat `accept` atributi, ixtiyoriy), uz/ru/en `chat.json` (yangi xato kaliti, agar UI ko'rsatsa).

## Muammo (kodda tasdiqlangan)

- `POST /api/chat/conversations/:id/attachments` (`chat.ts` ~455–480): mijoz bergan `file.type`
  so'zma-so'z `httpMetadata.contentType` ga yoziladi; R2 kaliti `chat/${conversationId}/${uuid}-${file.name}` —
  `file.name` tozalanmagan.
- `GET /api/chat/attachments/*` (~485–525): `Content-Type` = saqlangan tur, `Content-Disposition`,
  `X-Content-Type-Options`, CSP yo'q. `text/html` yoki `image/svg+xml` fayl havolasi
  (`$conversationId.tsx` ~152, `<a href>`) ochilganda **API origin'ida** skript bajariladi va cookie bilan
  istalgan API'ni chaqira oladi.
- **Allaqachon yuklangan** zararli obyektlar R2'da qolgan bo'lishi mumkin — shuning uchun himoya
  faqat yuklashda emas, **berishda ham** bo'lishi shart.

## Bajarish

1. `lib/attachments.ts` — sof funksiyalar (unit test qilinadigan):
   ```ts
   export const INLINE_IMAGE_MIME_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
   export const ALLOWED_ATTACHMENT_MIME_TYPES = [
     ...INLINE_IMAGE_MIME_TYPES,
     "application/pdf",
     "text/plain",
     "text/csv",
     "application/msword",
     "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
     "application/vnd.ms-excel",
     "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
     "application/zip",
   ] as const;
   export function normalizeAttachmentMime(raw: string | undefined | null): string | null
   export function sanitizeAttachmentFileName(name: string): string
   export function attachmentResponseHeaders(storedMime: string | undefined, fileName: string): Headers
   ```
   - `normalizeAttachmentMime`: kichik harf, `;` dan keyingi parametrlarni tashlash, allowlist'da bo'lmasa `null`.
     SVG, HTML, XML, JS **hech qachon** ruxsat etilmaydi.
   - `sanitizeAttachmentFileName`: `/ \ : * ? " < > |` va boshqaruv belgilarini `_` ga, oldingi nuqtalarni
     olib tashlash, 120 belgigacha qisqartirish (kengaytmani saqlab), bo'sh bo'lsa `"file"`.
   - `attachmentResponseHeaders`: saqlangan turni **qayta** `normalizeAttachmentMime` dan o'tkazadi
     (eski obyektlar uchun); allowlist'da bo'lmasa `application/octet-stream`. Har doim:
     `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox; default-src 'none'`,
     `Cache-Control: private, max-age=3600`. `Content-Disposition`: inline-rasm bo'lsa
     `inline`, aks holda `attachment`; ikkalasida ham `filename="<ASCII-xavfsiz>"; filename*=UTF-8''<encodeURIComponent>`.
2. Yuklash route'i: `normalizeAttachmentMime(file.type)` → `null` bo'lsa
   `400 { error: "Unsupported file type.", code: "ATTACHMENT_TYPE_NOT_ALLOWED" }`. Kalit:
   `chat/${conversationId}/${uuid}-${sanitizeAttachmentFileName(file.name)}`; `httpMetadata.contentType` =
   normallashtirilgan tur; javobdagi `attachmentName` — tozalangan nom.
3. Berish route'i: R2 kalitidan fayl nomini oling (`uuid-` prefiksidan keyingi qism) va
   `new Response(object.body, { headers: attachmentResponseHeaders(object.httpMetadata?.contentType, name) })`.
   A'zolik tekshiruvi o'zgarmaydi.
4. Frontend (ixtiyoriy, lekin tavsiya): fayl tanlash `<input>` ga `accept` ro'yxati (server allowlist'i bilan
   bir xil kengaytmalar); 400 kodi kelsa i18n xabari (uz/ru/en uchala `chat.json` da).
5. Unit testlar (`tests/services/attachments.test.ts` — baza kerak emas): `image/svg+xml` → null;
   `text/html; charset=utf-8` → null; `IMAGE/PNG` → `image/png`; `../../evil.html` → xavfsiz nom;
   eski obyekt `text/html` bilan saqlangan → sarlavhalarda `application/octet-stream` + `attachment` +
   `nosniff`; `image/png` → `inline`.

## Qabul mezonlari

- [ ] Unit testlar yashil; type-check/lint yashil; `apps/web` tegilgan bo'lsa `bun run build`.
- [ ] Chat'dagi rasm preview (`<img src=…>`) ishlashda davom etadi (inline + `image/*`).
- [ ] PROGRESS.md: qo'lda tekshirish — `.html` va `.svg` fayl yuklashga urinish 400 qaytaradi;
      PDF havolasi yuklab olinadi (brauzerda ochilmaydi), rasm chat ichida ko'rinadi.

## Qilmang

- Alohida "user content" domeni — Faza 4 (ADR-003). Presigned URL — Faza 4 (ADR-007).
- Mavjud R2 obyektlarini o'chirish/ko'chirish skripti — kerak emas, 3-qadam ularni zararsizlantiradi.
