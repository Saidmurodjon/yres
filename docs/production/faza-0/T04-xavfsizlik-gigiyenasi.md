# T04 — Xavfsizlik gigiyenasi (5 ta alohida commit: T04a–T04e)

**Manba:** 02 §2.1–2.3 (S-4, A-2, V-3, V-5, V-2). Har kichik band — o'z commit'i va PROGRESS.md qatori.

---

## T04a — S-4: email HTML injection

**Fayllar:** yangi `apps/api/src/lib/html.ts`, `apps/api/src/auth/index.ts`, yangi `apps/api/tests/services/html.test.ts`.

- `auth/index.ts` ~37: `html: \`<p>Welcome to YRES, ${user.name}!</p>...\`` — `user.name` foydalanuvchi
  kiritgan matn, escape'siz. Ism maydoniga `<a href="https://evil">Click</a>` yozilsa, bizning domenimizdan
  phishing havolali email ketadi.
- `lib/html.ts`: `export function escapeHtml(value: string): string` — `& < > " '` → `&amp; &lt; &gt; &quot; &#39;`
  (`&` birinchi). Welcome email'da `escapeHtml(user.name)`.
- Reset/verify email'laridagi `url` — Better Auth o'zi yasaydi, escape kerak emas, lekin `href` atributida
  bo'lgani uchun `escapeHtml(url)` ham xavfsiz va izchil — qo'llang.
- Unit test: 5 ta belgi, bo'sh satr, allaqachon escape qilingan satr ikki marta escape bo'lishi (bu to'g'ri xatti-harakat).

---

## T04b — A-2: viewer yozuvchi amallarni chaqira olmasin

**Fayl:** `apps/api/src/routes/audit.ts`, `apps/api/tests/integration/audit.test.ts` (yoki `members.test.ts` — qaysi
birida viewer fixture bor bo'lsa).

- `POST /:id/audit/run` (~30): `findAccessibleBuilding` dan keyin `canWrite(access.role)` yo'q — viewer
  `audit_run` qatorini yozadi. Qo'shing: aks holda
  `403 { error: "You only have view access to this building." }` (mavjud matn bilan bir xil, `consumption.ts:116`).
- `GET /:id/audit/report` (~136–194): viewer yuklab olishi **mumkin** (o'qish), lekin R2 `put` va
  `audit_run.reportR2Key` update'i faqat `canWrite(access.role)` bo'lganda bajarilsin. Izoh: GET'dagi yon
  ta'sir to'liq Faza 2 da (snapshot + `POST /reports`) olib tashlanadi; bu oraliq chora.
- `GET /:id/audit/results` va boshqa audit route'larida yozuv bormi — grep bilan tekshiring
  (`insert(`/`update(`/`.put(`), bo'lsa xuddi shu qoida.
- Integratsiya testi: viewer `POST /audit/run` → 403; editor → 201.

---

## T04c — V-3: input chegaralari va body limiti

**Fayllar:** `apps/api/src/schemas/*.ts`, `apps/api/src/index.ts`, mavjud unit/integratsiya testlari.

Massivlarga `.max()` (hozir chegarasiz — `grep -n "z.array(" apps/api/src/schemas/*.ts`):

| Sxema | Maydon | Chegara |
|---|---|---|
| `consumption.ts` | `createUtilityBillsSchema.bills` | `.max(600)` (5 tashuvchi × 10 yil × 12) |
| `consumption.ts` | `year` (ikkala sxemada) | `.min(1990).max(2100)` |
| `consumption.ts` | `consumptionNative`, `expenseLocal`, `tariffLocal` | `.finite().nonnegative()` |
| `envelope.ts` | `layers` | `.max(20)` |
| `envelope.ts` | `openings` | `.max(200)` |
| `envelope.ts` | `buildingBlocks`, `constructionTypes`, `openingTypes` | `.max(100)` |
| `envelope.ts` | `envelopeElements` | `.max(500)` |
| `systems.ts` | barcha `systems`/`sources`/`windows`/`zones`/`items` | `.max(200)` |
| `chat.ts` | `usernames`, `addUsernames`, `removeUserIds` | `.max(50)` |
| `measures.ts` | `measureIds` | `.max(500)` |

Fizik diapazonlar (`schemas/building.ts`): harorat maydonlari (`indoorTemp*C`, `outdoor*TempC`) `.min(-60).max(60)`;
`heatingSeasonDurationDays` `.min(0).max(366)`; `*HoursPerDay` `.min(0).max(24)`; `yearBuilt` `.min(1800).max(2100)`;
`latitude` ±90, `longitude` ±180; maydon/hajm/soni `.nonnegative()`. Barcha `z.number()` ga `.finite()`.
Satrlar: `name`/`location` `.max(300)`, izoh/matn maydonlari `.max(10_000)`.

**Diqqat — mavjud ma'lumotni sindirmang:** chegaralar production'dagi real qiymatlardan tor bo'lmasin.
Har chegara uchun real dunyoda oshib ketishi mumkinmi deb o'ylang; shubhali bo'lsa kengroq oling va
PROGRESS.md ga yozing. Testlardagi fixture'lar chegaradan o'tsa — fixture emas, chegara noto'g'ri bo'lishi mumkin.

Body limiti (`index.ts`, CORS'dan keyin): `hono/body-limit` bilan `/api/*` uchun 1 MB; chat yuklash route'i
(`/api/chat/conversations/:id/attachments`) uchun alohida 11 MB (fayl 10 MB + multipart overhead).
Tartibni shunday quringki, umumiy 1 MB limit yuklash route'iga qo'llanmasin — Hono middleware
yo'l moslashuvini tekshirib, yuklash yo'lini istisno qiling. Oshsa: `413 { error: "Payload too large", code: "PAYLOAD_TOO_LARGE" }`.

Testlar: har sxema uchun bitta "chegaradan oshdi → safeParse false" unit testi (`tests/services/` da yangi
`schemas.test.ts`, baza kerak emas).

---

## T04d — V-5: xavfsizlik sarlavhalari

**Fayllar:** yangi `apps/web/public/_headers`, `apps/web/index.html` (izoh), `apps/api/src/index.ts`.

**Web (`_headers`, Cloudflare Pages formati):**
```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-<HASH>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://yres-api.saidmurod.com; font-src 'self' data:; connect-src 'self' https://yres-api.saidmurod.com wss://yres-api.saidmurod.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'
```
- `<HASH>` — `index.html` dagi tema-bootstrap inline `<script>` matnining SHA-256 (base64). Hisoblash:
  teglar orasidagi **aniq** matn (bo'shliq va yangi qatorlar bilan) — `vite build` dan keyin `dist/index.html`
  dagi variantdan hisoblang (Vite inline skriptni o'zgartirmasligini tekshiring). `index.html` dagi skript
  ustiga izoh: "Bu skript o'zgarsa, `public/_headers` dagi CSP hash'ini yangilang."
- `style-src 'unsafe-inline'` — Radix/recharts inline `style` atributlari uchun majburiy; olib tashlamang.
- `_redirects` bilan to'qnashmasligini tekshiring; `bun run build` dan keyin `dist/_headers` mavjudligini tasdiqlang.
- Ishlashini production'da faqat deploy'dan keyin ko'rish mumkin — PROGRESS.md da loyiha egasi uchun:
  deploy'dan keyin DevTools Console'da CSP xatolari yo'qligini, login, Google OAuth, chat (WS), PDF yuklab olish,
  Excel import ishlashini tekshirish ro'yxati.

**API (`index.ts`):** `hono/secure-headers`, CORS'dan keyin:
```ts
secureHeaders({
  crossOriginResourcePolicy: "same-site",   // NOT same-origin: web <img> chat rasmlarini API'dan oladi
  crossOriginOpenerPolicy: false,
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
})
```
- `same-origin` CORP chat rasm preview'larini sindiradi (`yres` va `yres-api` — bir sayt, lekin turli origin).
- API CSP `default-src 'none'` JSON javoblarga ta'sir qilmaydi; chat biriktirma javobi T03 dagi o'z
  sarlavhalarini qo'yadi — `secureHeaders` ularni ustidan yozmasligini tekshiring (route javobidagi sarlavha
  ustun bo'lishi kerak; bo'lmasa, biriktirma route'ida aniq qayta o'rnating).
- Better Auth OAuth redirect javoblari buzilmasligini tekshiring (`/api/auth/*` ham shu middleware'dan o'tadi).

---

## T04e — V-2: WebSocket freymlari validatsiyasi

**Fayllar:** `apps/api/src/durable-objects/conversation-room.ts`, `apps/api/src/schemas/chat.ts`, yangi unit test.

Muammolar (`conversation-room.ts` ~60–126): freym `JSON.parse` dan keyin tekshirilmaydi; `attachmentUrl` ixtiyoriy
satr — frontend `${API_URL}${m.attachmentUrl}` qiladi, `"@evil.com/x"` → `https://yres-api.saidmurod.com@evil.com/x`
(userinfo hiylasi) tashqi saytga olib ketadi; `body` uzunligi cheksiz.

- `schemas/chat.ts` ga `incomingWsMessageSchema` — `z.discriminatedUnion("type", [...])` mavjud
  `IncomingWsMessage` turining har varianti uchun. `body` `.max(4000)`; `messageId`/`replyToId` `.uuid()`;
  `attachmentUrl` faqat regex `^/api/chat/attachments/chat/<conversationId>/[^/?#]+$` — conversationId DO ichida
  ma'lum (`this.ctx.id.name`), shuning uchun sxemani funksiya qilib yasang:
  `makeIncomingWsMessageSchema(conversationId)`; `attachmentName` `.max(200)`, `attachmentMimeType` T03 allowlist'idan,
  `attachmentSizeBytes` `.int().min(0).max(10 * 1024 * 1024)`.
- `webSocketMessage` da `JSON.parse` dan keyin `safeParse`; muvaffaqiyatsiz bo'lsa — log (`console.warn`, matnsiz)
  va jim `return` (hozirgi parse-xato xatti-harakati bilan bir xil).
- `IncomingWsMessage` turi sxemadan `z.infer` bilan olinsin (ikki manba bo'lmasin).
- Unit test: `@evil.com/x` rad; boshqa conversation prefiksi rad; 4001 belgili body rad; to'g'ri freym qabul.
- A'zolikdan chiqarilgan foydalanuvchi socket'ini yopish — **bu commit'da emas** (DO RPC, `realtime.md`); PROGRESS.md
  da "ochiq qoldi" deb yozing.
