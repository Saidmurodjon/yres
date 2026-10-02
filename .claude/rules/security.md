# Xavfsizlik qoidalari

Manba: `docs/production/02-arxitektura-va-texnologiyalar.md` §2.1–2.3, §5.1. Topilma ID'lari (S-1, V-1…) shu
hujjatdan. Bandlar ikki guruhda: **hozir amal qiladi** — har yangi kodda; **keyinroq** — infratuzilmasi hali yo'q,
uni oldindan "yo'l-yo'lakay" qurmang.

## Hozir amal qiladi

- **Har bino route'ida authz qo'lda, lekin to'liq:** `findAccessibleBuilding()` → topilmasa `404` (403 emas —
  mavjudligini oshkor qilmaslik uchun); yozuvchi amal (`POST/PUT/PATCH/DELETE`, R2'ga yozish, `audit_run` yaratish)
  oldidan `canWrite(access.role)` → `403 { error: "You only have view access to this building." }`. Viewer
  "faqat GET" degani emas: GET ham hech narsa yozmasligi kerak (A-2).
- **Bola resurs har doim ota scope bilan filtrlanadi**: `where(and(eq(child.id, id), eq(child.buildingId, buildingId)))`.
  Faqat `eq(child.id, id)` bilan update/delete — IDOR.
- **Har zod sxemada chegara:** massivlar `.max()`, satrlar `.max()`, raqamlar `.finite()` + fizik diapazon
  (harorat, soat, yil, koordinata). Yangi sxema chegarasiz qo'shilmaydi (V-3). Chegarani real ma'lumotdan tor
  qilmang — shubha bo'lsa kengroq oling.
- **Foydalanuvchi yuklagan fayl API origin'ida inline render qilinmaydi**: MIME allowlist (`lib/attachments.ts`),
  SVG/HTML/XML hech qachon; berishda saqlangan turni **qayta** tekshirish (eski obyektlar), `nosniff`,
  `CSP: sandbox`, rasmdan boshqasi `Content-Disposition: attachment` (V-1).
- **HTML/email shablonlariga foydalanuvchi matni faqat `escapeHtml()` orqali** (`lib/html.ts`, S-4).
- **WebSocket freymlari zod bilan tekshiriladi** (DO ichida) — `JSON.parse` natijasiga ishonilmaydi (V-2).
- **Mijozga ichki xato matni (`error.message`, stack) qaytarilmaydi** — umumiy matn + `code`; tafsilot logga.
  Mavjud joylar (masalan `audit.ts` run xatosi, V-6) tegilganda tuzatiladi.
- **Loglarga shaxsiy ma'lumot yozilmaydi**: email, token, parol tiklash URL'i, cookie. `userId` — mumkin.
- **Sirlar faqat `wrangler secret`**; yangi sir qo'shilsa `deployment.md`dagi ro'yxat va `Env` interfeysi bir commit'da.
- **Auth o'zgarishi (`apps/api/src/auth/`) har doim `auth.md` bilan birga.** Account-linking sozlamasi
  `revokeUnverifiedCredentialOnSocialLink` (S-1) bilan juft: biri ikkinchisisiz o'zgartirilmaydi.
- **Xavfsizlik sarlavhalari:** web — `apps/web/public/_headers` (CSP, HSTS, XFO); API — `secureHeaders` middleware.
  `index.html` dagi inline skript o'zgarsa, `_headers` dagi CSP `sha256-` hash'i yangilanadi. API'da CORP
  `same-site` (same-origin chat rasmlarini sindiradi).
- **Zaif bog'liqlik qo'shilmaydi**: yangi paketdan oldin ma'lum CVE'larni tekshiring; npm'da tashlab qo'yilgan
  paketlar (masalan SheetJS npm nashri) o'rniga rasmiy manba.

## Keyinroq (infratuzilma kelganda)

- `buildingScope(minRole)` middleware va authz test matritsasi (begona → 404, viewer yozuv → 403, egasi → 2xx) — Faza 4 (ADR-002). Kelgach, qo'lda `findAccessibleBuilding` taqiqlanadi.
- Har tashkilot scope'i, `can()` policy — `tenancy.md`.
- Presigned upload, alohida user-content domeni — Faza 4 (ADR-003, ADR-007).
- Rate-limit binding'larini limit bo'yicha ajratish, `cf-connecting-ip` only, email+IP kalit (S-3).
- LIKE qidiruvida `%`/`_` escape va tenant bilan cheklash, username default'i slug (A-4, ADR-014).
- 2FA `admin`/bank/regulyator rollari uchun (S-5).
