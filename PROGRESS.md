# Progress

Nima qurilgani, hozir nima ishlab turgani va nima yetishmayotgani haqida bosqichma-bosqich yozuv.
`README.md`da arxitektura/repo-tuzilishi havolasi bor; `.claude/rules/`da operatsion nozik
jihatlar bor. Ushbu fayl "nima va qanday tartibda sodir bo'lgani" yozuvi.

## Holat: production'da ishlamoqda

- Web: https://yres.saidmurod.com (Cloudflare Pages)
- API: https://yres-api.saidmurod.com (Cloudflare Worker + Neon Postgres)

Asosiy platforma qurilgan va deploy qilingan: ma'lumotlar modeli, EN ISO 13790 asosidagi
hisob-kitob dvigateli, REST API, va to'liq frontend (dashboard, bino boshqaruvi, audit
wizard'i, natijalar, moliyaviy tahlil, PDF hisobot eksporti). Auth (email/parol + Google OAuth),
rate limiting, va xato kuzatuvi joyida.

## Qurilish bosqichlari (xronologik)

1. **Poydevor** — Turborepo/bun monorepo qoliplanishi; Excel jadvali tahlili
   `docs/data-dictionary.md` va `docs/er-diagram.md` ga; Drizzle sxemalari.
2. **Hisob-kitob dvigateli** — `AuditEngine` va `apps/api/src/services/` ostidagi har bir
   yo'nalish bo'yicha xizmatlar (qobiq issiqlik yo'qotishi, ventilyatsiya, DHW, taqsimot,
   generatsiya, moliyaviy ko'rsatkichlar).
3. **REST API + UI poydevori** — binolar, qobiq, chora-tadbirlar, iste'mol, audit uchun
   route'lar/validatsiya; `@yres/ui` komponent to'plami; auth; API klienti; router qobig'i.
4. **Ilova sahifalari** — Dashboard, Binolar ro'yxati/tafsiloti, qobiq/iste'mol tahrirlash,
   Audit Natijalari va Moliyaviy Tahlil sahifalari.
5. **Deploy infratuzilmasi** — migratsiyalar, seed skripti, CI, Cloudflare provisioning
   (`docs/deployment.md`ga qarang).
6. **Test qamrovi** — integratsiya + unit test to'plamlari (ular qanday amalda ishga
   tushirilishi haqida `testing-and-verification.md`ga qarang — integratsiya to'plami haqiqiy
   lokal Postgres talab qiladi, bu sandboxda u yo'q).
7. **Systems tab'i** — ventilyatsiya, DHW, taqsimot, generatsiya, sovutish uchun CRUD API + UI.
8. **PDF hisobot eksporti** — `apps/api/src/services/report.service.ts`, Natijalar sahifasidan
   yuklab olinadi.
9. **Yoritish/uskuna/qayta tiklanadigan manbalar** — `AuditEngine`da modellashtirilgan,
   Systems tab'iga qo'shilgan.
10. **Energiya chora-tadbirlari CRUD'i** — "Chora-tadbir qo'shish" formasi; har safar yuklanishda
    Chora-tadbirlar va Iste'mol tab'larini sezdirmasdan 400 qaytarayotgan pagination cap bug'i
    tuzatildi.
11. **Bino ulashish** — rol bo'yicha (owner/editor/viewer) muharrirlar/ko'ruvchilarni taklif
    qilish.
12. **Production mustahkamlash** — tranzaksion email (Resend), Sentry xato kuzatuvi, auth
    endpoint'larida rate limiting.

## Ishga tushirilgandan keyingi tuzatishlar (ushbu bosqich)

Ilova jonli bo'lgandan keyin topilgan va tuzatilgan, topilish tartibida taxminan:

- **Google orqali kirish buglari**: `errorCallbackURL` yetishmasligi (xatolar API'ning yalang'och
  xato sahifasida tugab qolardi), muvaffaqiyatsizlikda butunlay qotib qoladigan va qayta urinib
  bo'lmaydigan tugma, va email/parol bilan ro'yxatdan o'tgan, lekin hech qachon tasdiqlash
  havolasini bosmagan foydalanuvchilarni sezdirmasdan qaytarib yuboradigan `account_not_linked`
  xatosi (`auth.md`ga qarang).
- **Dizayn/joylashuv ko'rib chiqish**: Tailwind `@source` bugi (ilovadagi har bir icon tugma
  production'da `display: block` bo'lib chiqayotgan edi — `frontend.md`ga qarang), matn
  scroll o'rniga qatorlarga bo'linib ketayotgan jadval kataklari, mobil qurilmada ekrandan
  chiqib ketayotgan tab panellari, va mobil uchun umuman zaxira varianti yo'q bo'lgan yon panel.
- **Materiallar katalogi**: manba jadvalidagi ~38 ta ma'lumotnoma materialning atigi ~9 tasi
  seed ma'lumotiga o'tkazilgan edi; qolganlari to'ldirildi.
- **Iste'mol kiritish UX'i**: bir vaqtda bitta hisob kiritadigan forma o'rniga oylik jadval
  (bir vaqtning o'zida bitta tashuvchi/yil, manba jadvalning tuzilishiga mos) — buning uchun
  `(building_id, energy_carrier, year, month)` bo'yicha unique constraint va bulk-replace
  `PUT` route'i qo'shish talab qilindi.
- **Deploy'dan keyingi eskirgan-chunk muammosi**: deploy vaqtida ochiq qolgan tab keyingi route
  navigatsiyasida xom, tiklab bo'lmaydigan xato tashlardi; endi root route bir marta avtomatik
  tiklanadi, aks holda do'stona xato ekraniga o'tadi (`frontend.md`ga qarang).
- **Hisob bo'yicha kalibrlangan tejash + energiya balansi taqsimoti**: `EnergyMeasureResult.actual`
  shunchaki `standardized`ning nusxasi bo'lib turgan stub edi — hech qanday kod `utility_bill`
  jadvalini o'qimasdi. Endi hisob-kitoblardan haqiqiy har-tashuvchi-bo'yicha kalibrlash
  koeffitsienti hisoblanadi. Shuningdek `AuditResult`ga `energyBalanceBreakdown` qo'shildi —
  manba jadvalning "Breakdown Baseline & Balance" varag'iga mos, har bir tarkibiy qism
  (devor/tom/pol/deraza/ventilyatsiya/generatsiya/yoritish/uskuna/sovutish/PV) bo'yicha
  before/after jadvali (`calculation-engine.md`ga qarang).

## Joriy sessiya: navbar/rollar/chat/i18n dizayni + hisoblash dvigateli auditi

Loyiha egasi bilan kelishilgan holda, kod yozishdan oldin to'rtta yangi tashabbus uchun to'liq
dizayn hujjatlari yozildi (har biri alohida tasdiqlash uchun) va barcha `.claude/rules/*.md`
fayllari o'zbek tiliga o'girildi:

- **Navbar/rollar/profil/bildirishnoma/chat** (`docs/social-features.md`,
  `.claude/rules/social-features.md`): bell + profil menyusi, global `admin/auditor/viewer`
  roli (mavjud bino-bo'yicha `owner/editor/viewer` roli bilan aralashtirilmaydi), profil
  tahrirlash, `username` maydoni (birlamchi qiymati — email), ro'yxatdan o'tganda xush kelibsiz
  emaili (kirishda email yo'q — parolni tiklash mavjud link-asosidagi Better Auth oqimi
  o'zgarishsiz qoladi), Cloudflare Durable Objects orqali real-time bildirishnoma va chat
  (Telegram-uslubidagi: yozayotganlik, online/oxirgi ko'rilgan, o'qilganlik ✓✓, reply,
  tahrirlash/o'chirish, fayl biriktirish).
- **Platforma UI qoidalari** (`docs/ui-guidelines.md`, `.claude/rules/ui-guidelines.md`):
  responsive breakpoint strategiyasi (mavjud ikki-rejimli navbar planshetni ham qamrab oladi,
  uchinchi rejim kerak emas), state boshqaruvi uchun Zustand (faqat sof-mijoz vaqtinchalik
  holat — bazadan kelgan hamma narsa TanStack Query'da qoladi), unumdorlik qoidalari
  (virtualizatsiya, debounce, memoizatsiya, parallel so'rovlar).
- **uz/ru/en ko'p tillilik + kun/tun rejimi** (`docs/i18n-and-appearance.md`,
  `.claude/rules/i18n-and-appearance.md`): `react-i18next` (rus ko'plik shakllari uchun),
  butun mavjud ilova (~30 ta `.tsx` fayl) namespace bo'yicha bosqichma-bosqich tarjima
  qilinadi, kun/tun uchun CSS allaqachon tayyor (faqat toggle yetishmaydi), til/tema
  localStorage'da saqlanadi.
- **Hisoblash dvigateli auditi** (`docs/calculation-engine-audit.md`, `docs/data-dictionary.md`
  yangilandi, `.claude/rules/calculation-engine.md` yangilandi): manba `docs/3-DMTT v5.xlsx`
  fayli bevosita `openpyxl` orqali ochilib, `data-dictionary.md`dagi 10 ta "noaniq" bandning
  barchasi haqiqiy Excel formulalari bilan tekshirildi va joriy `apps/api/src/services/*.ts`
  bilan solishtirildi. 8 tasi allaqachon to'g'ri hal qilingan ekan (jumladan oldin "tiklab
  bo'lmaydi" deb belgilangan chegirmali-qoplanish-muddati array-formulasi endi dekodlandi va
  joriy kod bilan mos kelishi tasdiqlandi). **2 ta haqiqiy kamchilik topildi, hali
  tuzatilmagan**: (1) `non_ee_measure` jadvali sxemada bor, lekin hech qanday route/servis
  ishlatmaydi — yordamchi renovatsiya xarajatlari umumiy investitsiyaga qo'shilmayapti; (2)
  mexanik ventilyatsiyaning sovutish-mavsumi entalpiya yuki (`Heat gains Mec Vent` varag'i)
  hech qayerda hisoblanmaydi — kerakli uch kirish qiymati saqlanadi, lekin ishlatilmaydi.

To'rtta hujjat ham loyiha egasi tomonidan tasdiqlandi; audit'da topilgan ikkita kamchilikni
tuzatish boshlandi:

- **Tuzatildi**: `non_ee_measure` (yordamchi renovatsiya xarajatlari) endi to'liq ulangan — CRUD
  route'lari qo'shildi, `audit.engine.ts` ularni so'raydi va `AuditSummary.totalInvestmentUsd`ga
  (alohida `totalNonEeMeasureCostUsd` sifatida ham) qo'shadi, Chora-tadbirlar tab'iga "Ancillary
  costs" bo'limi va PDF hisobotga tegishli jadval qo'shildi. Tekshirildi:
  `apps/api`/`apps/web` type-check, `apps/api` unit testlari (51/51 o'tdi), biome lint.

- **Tuzatildi**: mexanik ventilyatsiyaning sovutish-mavsumi entalpiya yuki endi hisoblanadi —
  `ventilation.service.ts`ga `calculateMechanicalVentilationCoolingGainKwh()` qo'shildi (manba
  jadvalning namunaviy 48.4/59.5 kJ/kg qiymatlari bilan tasdiqlangan), `CoolingResult`ga uchinchi
  had sifatida ulandi. Buning uchun yangi `ventilation_system.cooling_season_hours` ustuni
  qo'shildi (migratsiya `0003_giant_mandrill.sql`) va Systems tab'iga kirish maydoni qo'shildi.
  Tekshirildi: `apps/api`/`apps/web` type-check, unit testlar (55/55 o'tdi), biome lint.

Ikkala hisoblash kamchiligi ham tuzatildi va `docs/calculation-engine-audit.md`/
`docs/data-dictionary.md` "hal qilindi" deb yangilandi.

Endi `docs/social-features.md`dagi "Qurish tartibi" bosqichlariga o'tildi:

- **Social Phase 1 (sxema)**: `user.role` endi haqiqiy `userRoleEnum`
  (admin/auditor/viewer); `user.username` (NOT NULL UNIQUE, email'dan backfill —
  migratsiya qo'lda xavfsiz ketma-ketlikka o'tkazildi: nullable qo'shish →
  backfill → NOT NULL, bittalik `ADD COLUMN NOT NULL` emas); `user.lastSeenAt`;
  yangi `notification`/`conversation`/`conversation_member`/`message` jadvallari.
  Better Auth'ga minimal `databaseHooks.user.create.before` qo'shildi
  (username=email — yangi ustunda DB-darajasidagi standart qiymat yo'qligi
  uchun zarur, ro'yxatdan o'tishni buzmasligi uchun). **Diqqat**: bu hook'ning
  aniq shakli Better Auth hujjatlariga qarshi tasdiqlanmagan (bu sandbox'da
  integratsiya testi/haqiqiy signup ishga tushirib bo'lmaydi) — faqat
  type-check orqali tekshirilgan, haqiqiy deploy'dan keyin signup oqimini
  qo'lda tekshirish tavsiya etiladi.

- **Social Phase 2 (`packages/ui` primitivlari)**: `DropdownMenu`, `Popover`,
  `Avatar`, `Toaster`/`toast` (sonner) qo'shildi, mavjud Radix-o'ram+`cn()`
  andozasida. Bularni build'da tekshirish (`frontend.md`ning `@source`
  qoidasi) haqiqiy, oldindan mavjud kamchilikni ochdi: `dialog.tsx`dagi
  `animate-in`/`fade-in-0`/`zoom-in-95` klasslari Tailwind v4'da hech qachon
  haqiqiy utility bo'lmagan (mos plagin yo'q edi) — sezdirmasdan hech qanday
  CSS ishlab chiqarmagan, ya'ni Dialog animatsiyasi hech qachon ishlamagan.
  `tw-animate-css` qo'shilib, ham yangi komponentlar, ham mavjud Dialog uchun
  tuzatildi (build'da `zoom-in-95`/`fade-in-0` endi haqiqatan CSS'da bor deb
  tekshirildi).

- **Social Phase 3 (Navbar)**: `NAV_ITEMS`ga ixtiyoriy `roles` filtri qo'shildi
  (mobil header va desktop sidebar ikkalasida ham o'qiladi). Oddiy
  email+chiqish blokini `DropdownMenu`-asoslangan `ProfileMenu` (Avatar,
  ism/email/rol belgisi, chiqish) va `Popover`-asoslangan `NotificationBell`
  (hozircha statik — haqiqiy ma'lumot Phase 8'da) almashtirdi. Better Auth'ga
  `user.additionalFields` (`role`, `username`, ikkalasi `input:false`)
  qo'shildi, shunda ular session javobida haqiqatan qaytariladi; klient
  tomonida `SessionUser` turi orqali assert qilinadi (`createAuthClient()`
  bu yerda server turi bilan avtomatik bog'lanmagan). **Diqqat**: bu
  sandbox'da Preview MCP vositasi (`testing-and-verification.md`da
  tasvirlangan) mavjud emas edi — vizual tekshiruv qilib bo'lmadi, faqat
  type-check/build/lint orqali tekshirildi. Haqiqiy deploy'dan keyin
  brauzerda ko'rib chiqish tavsiya etiladi.

- **Social Phase 4 (Profil + parol)**: `GET`/`PATCH /api/users/me` (ism/
  username/rasm, username to'qnashuvida 409) + yangi `/profile` sahifasi.
  Parolni almashtirish uchun maxsus backend yozilmadi — Better Auth'ning
  o'z `authClient.changePassword`i ishlatildi (joriy parolni tekshirish,
  xeshlash, `revokeOtherSessions` orqali boshqa sessiyalarni bekor qilish
  — bularning barchasini Better Auth allaqachon boshqaradi). `ProfileMenu`
  endi `/profile`ga havola qiladi (Phase 3'da route hali yo'q edi).

- **Social Phase 5 (Rollar/admin)**: `requireRole()` middleware
  (bino-bo'yicha `building-access.ts`dan mustaqil), `GET`/`PATCH
  /api/admin/users` faqat admin uchun (o'z-o'zini "admin"dan pasaytirish
  bloklangan — bo'lmasa barcha adminlar tashqarida qolib ketishi mumkin).
  Yangi `/admin/users` sahifasi, `beforeLoad`da admin-gated (admin bo'lmasa
  `/dashboard`ga qaytaradi). `NAV_ITEMS`ga `roles: ["admin"]` bilan "Users"
  qo'shildi.

- **Social Phase 6 (Xush kelibsiz emaili)**: `user.create.after` hook'i
  qo'shildi (Phase 1'dagi `username=email` hook'i bilan bir joyda),
  mavjud `sendEmail()` orqali. Kirishda (login) hech qanday email
  qo'shilmadi — bu qaror ikki marta o'zgargani ("har safar" → "faqat
  yangi qurilma" → "umuman yo'q") uchun ayniqsa ochiq qayd etilmoqda.

- **Social Phase 7 (Durable Objects infratuzilmasi)**: `wrangler.toml`ga
  `ConversationRoom` (suhbat-bo'yicha) va `UserNotificationChannel`
  (foydalanuvchi-bo'yicha) DO binding'lari + `new_sqlite_classes` migratsiya
  bloki qo'shildi (Workers Free rejasida ham ishlashi mumkin — akkauntga
  nisbatan tasdiqlanmagan). Ikkalasi ham hozircha faqat skelet (WebSocket
  Hibernation API orqali ulanishni qabul qiladi, xabar/broadcast mantig'i
  Phase 8/10'da). `UserNotificationChannel`ning `pushNotification()`i RPC
  metod sifatida yozilgan (Cloudflare'ning zamonaviy `DurableObject` bazaviy
  klassi buni ichki fetch route'isiz qo'llab-quvvatlaydi). Yo'lda haqiqiy
  `noUncheckedIndexedAccess` xatosi topildi va tuzatildi (`WebSocketPair`ni
  `Object.values()` orqali emas, to'g'ridan-to'g'ri `[0]`/`[1]` bilan
  indekslash kerak edi). **Bu sandbox'da hech qanday DO/WebSocket
  xatti-harakatini tekshirib bo'lmaydi** — faqat type-check/lint orqali
  tekshirildi, haqiqiy `wrangler deploy`dan keyin qo'lda tasdiqlash kerak.

- **Social Phase 8 (Bildirishnomalar)**: `notify.ts`ning `notifyUser()`i
  `notification` qatorini kiritadi + `UserNotificationChannel`ga RPC orqali
  fire-and-forget push yuboradi (DO xatosi hech qachon chaqiruvchi amalni
  buzmaydi — logga yozilib yutiladi). Birinchi haqiqiy tetikchi sifatida
  `members.ts`ning bino-taklif route'iga ulandi. `GET /api/notifications`
  (sahifalangan + o'qilmagan soni), `PATCH .../read-all`, `PATCH
  .../:id/read`, `GET .../ws` qo'shildi. Frontend'da `NotificationBell`
  endi haqiqiy ma'lumot bilan ishlaydi — WebSocket `AppShell` darajasida bir
  marta ulanadi (`NotificationBell` ikki marta render bo'lgani uchun,
  mobil+desktop). **Bu sandbox'da WebSocket ulanishini haqiqatan sinab
  bo'lmadi** — haqiqiy deploy'dan keyin tasdiqlash kerak.

- **Social Phase 9 (Chat backend)**: `GET`/`POST /api/chat/conversations`
  (to'g'ridan-to'g'ri — username bo'yicha, mavjudini qayta ishlatadi,
  takrorlamaydi — yoki guruh), `GET .../:id/messages` (sahifalangan),
  `PATCH .../:id/read`, `PATCH .../:id` (qayta nomlash/a'zo qo'shish-
  olib tashlash, faqat guruh egasi), `PATCH`/`DELETE
  /api/chat/messages/:id` (tahrirlash/soft-delete, faqat yuboruvchi),
  `GET /api/chat/users/search` (username qidiruvi), va biriktirma
  yuklash/o'qish (`CHAT_ATTACHMENTS_BUCKET` — hech qachon ochiq
  ko'rsatilmaydi, faqat suhbat a'zoligi tekshirilgan holda API orqali
  proksi qilinadi). Ataylab xabar-yaratish REST route'i yo'q — haqiqiy
  yuborish faqat `ConversationRoom` WebSocket orqali (Phase 10).

- **Social Phase 10 (Chat real-time + frontend) — YAKUNIY BOSQICH**:
  `ConversationRoom`ning `webSocketMessage()`i endi haqiqiy ishlaydi
  (Phase 7'dan beri skelet edi) — xabar/tahrirlash/o'chirish/yozayotganlik/
  o'qildi hodisalarini qayta ishlaydi, `@yres/db` orqali Postgres'ga yozadi,
  Hibernation API'ning `getWebSockets()`i orqali barcha ulangan socket'larga
  translatsiya qiladi. Yuboruvchining `userId`si Worker route'i tomonidan
  query-param sifatida qo'shiladi (DO'da session konteksti yo'q) va
  `serializeAttachment` orqali socket'ga biriktiriladi (hibernation'dan
  keyin ham saqlanadi). Hozir ulanmagan a'zolar haqiqiy `notification`
  qatori + jonli bell push oladi. Frontend: `/chat` (suhbatlar ro'yxati +
  "yangi chat" dialogi) va `/chat/$conversationId` (thread — pufakchalar,
  reply, hover'da tahrirlash/o'chirish, rasm/fayl biriktirma, yozayotganlik
  ko'rsatkichi, o'qilganlik). **Ma'lum bo'shliqlar**: thread sarlavhasida
  online/oxirgi-ko'rilgan indikatori yo'q (qo'shimcha infratuzilma talab
  qiladi, hozircha qoldirilgan); WebSocket protokoli uchtan-uchgacha
  tekshirilmagan (bu sandbox'da Cloudflare runtime yo'q) — haqiqiy
  deploy'dan keyin xabar yuborish/qabul qilish/tahrirlash/o'chirish/
  yozayotganlik/o'qildi barchasini qo'lda tasdiqlash kerak.

**`docs/social-features.md`ning barcha 10 bosqichi yakunlandi.** Endi
`docs/i18n-and-appearance.md`ning bosqichlariga o'tildi (`docs/
ui-guidelines.md`dagi qoidalar — Zustand, responsive, unumdorlik — allaqachon
qurilgan koddа amal qilindi; alohida "bosqich"i yo'q edi, standart qoidalar
sifatida amal qildi).

- **i18n Phase 1 (infratuzilma)**: `react-i18next` + `i18next` +
  `i18next-browser-languagedetector` qo'shildi (brauzer tilini aniqlaydi,
  qo'llab-quvvatlanmasa o'zbek tiliga tushadi). Hozircha faqat minimal
  `common` namespace urug'lantirildi — to'liq ~30 fayl migratsiyasi
  Phase 4. `index.html`ga bloklovchi tema-skripti qo'shildi (birinchi
  chizishdan oldin `data-theme`ni o'rnatadi, noto'g'ri tema
  yarq etishining oldini oladi). `zustand` ham qo'shildi (Phase 2'dan
  boshlab ishlatiladi — social-features ishida kerak bo'lmagan edi, oddiy
  komponent holati va react-query yetarli edi).

- **i18n Phase 2 (`useTheme` + ko'rinish)**: `useThemeStore` (Zustand'ning
  loyihadagi birinchi haqiqiy ishlatilishi) light/dark/system'ni sof-mijoz
  holat sifatida saqlaydi (`ui-guidelines.md`ga muvofiq, hech qachon
  serverga yozilmaydi). `index.html`ning bloklovchi skripti allaqachon
  qo'llagan qiymatni o'qiydi, birinchi render'da qayta qo'llash shart
  emas — faqat aniq o'zgartirishda. Yangi `/settings` sahifasi (hozircha
  faqat ko'rinish bo'limi), `ProfileMenu`dan havola qilingan.
- **i18n Phase 3 (til selektori)**: Yangi `settings` namespace (uz/ru/en),
  `settings.tsx` endi o'z matni uchun `useTranslation()`dan foydalanadi,
  `i18n.changeLanguage()`ga ulangan til tanlovchisi qo'shildi.
- **i18n Phase 4 (namespace bo'yicha ko'chirish) — davom etmoqda**:
  - ✅ `nav` — navbar (`app-shell.tsx`)
  - ✅ `auth` — login/register/forgot-password/reset-password
  - ✅ `dashboard` — `dashboard.tsx`, `__root.tsx`ning umumiy qismlari
  - ✅ `buildings` (ro'yxat/yaratish/tahrirlash/o'chirish) —
    `buildings/index.tsx`, `buildings/new.tsx`, `building-form-fields.tsx`
    (`parseBuildingFormValues()` endi `TFunction`ni parametr sifatida
    qabul qiladi — validatsiya funksiyasi komponent emas, hook chaqira
    olmaydi), `edit-building-dialog.tsx`, `delete-building-dialog.tsx`.
  - ✅ `buildings` kengaytmasi — bino-tafsiloti sahifasining qobig'i
    (`$buildingId/index.tsx`: orqaga havola, xatolik holati, tab
    yorliqlari — yangi `detail.*` bo'limi), `overview-tab.tsx` (yangi
    `overview.*` bo'limi), `sharing-tab.tsx` (yangi `sharing.*` bo'limi).
    Umumiy `share-bar.tsx` komponenti (audit/natijalar/moliyaviy
    sahifalarda qayta ishlatiladi) `common.noDataAvailable`ga o'tkazildi.
  - ✅ `envelope` — `envelope-tab.tsx` + `envelope-editor-dialog.tsx`
    (`tab.*`/`editor.*` bo'limlari, 13 ta validatsiya xabari
    `{{code}}`/`{{blockName}}` bilan interpolyatsiya qilingan).
  - ✅ `systems` — `systems-tab.tsx` (~180 satr, 9 kichik-tizim bo'limi:
    ventilyatsiya, ISS, taqsimot, generatsiya, sovutish oynalari/tizimlari,
    yoritish, uskuna, qayta tiklanadigan manbalar).
  - ✅ `measures` — `measures-tab.tsx` (`ee.*` energiya-samaradorlik
    chora-tadbirlari + `ancillary.*` yordamchi xarajatlar bo'limi).
  - ✅ `consumption` — `consumption-tab.tsx` (oylik hisob-faktura jadvali +
    barcha hisob-fakturalar tarixi).
  - ✅ `audit` — audit sehrgar (`audit.tsx`), natijalar (`results.tsx`),
    moliyaviy tahlil (`financial.tsx`) va ularning umumiy holat
    komponenti (`audit-result-states.tsx`) — bitta namespace, chunki bu
    bitta uzluksiz foydalanuvchi oqimi. Chora-tadbirlar soni uchun
    i18next'ning `_one`/`_few`/`_many`/`_other` ko'plik shakllari
    ishlatildi (rus tilida to'g'ri fe'l-moslashuv bilan).
  - ✅ `admin` — `admin/users.tsx` (rol boshqaruvi).
  - ✅ `chat` — `chat/index.tsx` + `chat/$conversationId.tsx` (suhbat
    ro'yxati, yangi-chat/guruh dialogi, thread — yozayotganlik,
    tahrirlash/o'chirish, reply, biriktirma).
  - ✅ `profile` — `profile.tsx` (profil tafsilotlari + parol o'zgartirish).

**Phase 4 to'liq yakunlandi.** Barcha ~25 fayl uz/ru/en'ga o'tkazildi.
Oxirgi 5 ta namespace guruhi (envelope, systems, measures, audit,
admin/chat/profile) parallel background agentlar orqali bir vaqtda
qurildi — barchasi bitta ishchi katalogda ishlagani uchun
`apps/web/src/i18n/index.ts` bir nechta agent tomonidan bir vaqtda
tahrirlangan; har biri faqat o'z faylini commit qilib, `git push`da
to'qnashuv chiqsa `git pull --rebase` bilan boshqalarning namespace
yozuvlarini saqlab qolgan holda birlashtirgan — hech qanday namespace
yo'qolmagan, hammasi `bun run type-check`/`bunx biome lint`dan alohida
va oxirida hammasi birga qayta tekshirilgan (`c8d3af2`gacha bo'lgan
commit'lar). Enum-asoslangan label lug'atlari (`BUILDING_TYPE_LABELS`,
`VENTILATION_SYSTEM_TYPE_LABELS`, `USER_ROLE_LABELS` va h.k.,
`lib/labels.ts`da) ataylab ingliz tilida qoldirildi — ular bir nechta
tab/sahifa o'rtasida umumiy va bitta-fayl migratsiyasining ko'lamidan
tashqarida.

**Yon tuzatish**: shu yakuniy tekshiruv paytida `bun run test`
integratsiya testlarining hammasi kutilgan `ECONNREFUSED` o'rniga
`Failed to load url cloudflare:workers` bilan muvaffaqiyatsiz
bo'layotgani aniqlandi — social-features Durable Object'lari
(`ConversationRoom`/`UserNotificationChannel`) `src/index.ts` orqali
import qilingach, Vitest'ning oddiy Node muhitida `cloudflare:workers`
o'rnatilgan modulini hal qila olmasligi sababli. `apps/api/
vitest.config.ts`ga `cloudflare:workers`ni arzimas shim klassiga
(`tests/helpers/cloudflare-workers-shim.ts`) yo'naltiruvchi
`resolve.alias` qo'shildi — integratsiya testlari hech qachon haqiqiy
Durable Object'ni ishga tushirmaydi, shim faqat modul grafigini
yuklanishini ta'minlaydi, shundan keyin testlar `testing-and-
verification.md` kutgan hujjatlashtirilgan tarzda (haqiqiy Postgres
yo'qligi sababli) muvaffaqiyatsiz bo'ladi.

**Yakuniy umumiy tekshiruv o'tkazildi** (repo bo'ylab): `bun run type-check`
(barcha workspace, shu jumladan `apps/web`ning haqiqiy Vite build'i orqali),
`bun run build`, `bunx biome lint` (5 ta workspace) — barchasi toza.
`bun run test`: 55/55 unit test o'tdi; 47 ta integratsiya testi kutilgan
`ECONNREFUSED` bilan muvaffaqiyatsiz bo'ldi (lokal Postgres yo'qligi
sababli, hujjatlashtirilgan holat — `testing-and-verification.md`ga
qarang) — haqiqiy regressiya yo'q.

`.claude/rules/`/`docs/` izchilligini tasdiqlashda bitta haqiqiy bo'shliq
topildi: `docs/social-features.md`ning "Qurish tartibi" 11-bosqichi
("Yakunlash") qurish davomida haqiqatan duch kelingan nozik jihatlar bilan
yangi `.claude/rules/realtime.md` yaratishni va uni `CLAUDE.md`ning
qoidalar jadvaliga qo'shishni talab qilar edi — bu qadam Phase 7–10 orqali
o'tkazib yuborilgan edi. Endi qo'shildi: `serializeAttachment` vs xotiradagi
holat, `getWebSockets()` orqali broadcast, `WebSocketPair`ni `[0]`/`[1]`
bilan to'g'ridan-to'g'ri indekslash (`Object.values()` emas), RPC metodlar
(`pushNotification()`), bildirishnoma push'ining fire-and-forget tabiati,
Postgres yagona-haqiqat-manbai qoidasi, va Vitest'ning `cloudflare:workers`
shim'i haqida — hammasi mavjud kod/izohlarga qarshi tekshirilgan holda.
`docs/i18n-and-appearance.md`ning 6-bosqichi ("barcha namespace'lar uchala
tilda to'liqligini tekshirish") ham qo'lda tasdiqlandi: har bir namespace
fayli (uz/ru/en) dasturiy ravishda taqqoslandi — yagona farqlar i18next'ning
til-bo'yicha CLDR ko'plik-suffikslari (o'zbekcha faqat `_other`, inglizcha
`_one`/`_other`, ruscha to'rttala shakl) bo'lib, bular kutilgan, kalit
yetishmasligi emas.

**Joriy sessiya yakunlandi**: barcha to'rtta tashabbus (navbar/rollar/chat,
UI qoidalari, i18n/kun-tun, hisoblash dvigateli auditi) to'liq qurildi,
tekshirildi va hujjatlashtirildi. Qolgan yagona element — bu sandbox'da
tekshirib bo'lmaydigan narsalar (haqiqiy WebSocket/DO xatti-harakati,
brauzerda vizual ko'rib chiqish, signup/OAuth oqimlari) — haqiqiy
`wrangler deploy`dan keyin qo'lda tasdiqlanishi kerak, `realtime.md`/
`social-features.md`da ochiq qayd etilgan.

## To'liq lokal ishga tushirish (API + web, haqiqiy Neon bazasi bilan)

Birinchi marta sinaldi va ishlaydigan holga keltirildi: `apps/api/.dev.vars`da
allaqachon haqiqiy Neon ulanish satri bor edi (`ep-crimson-tree-adsgnc1o`),
`apps/api/wrangler.toml` API'ni port 3000'ga mahkamlagan (OAuth
`redirect_uri` bilan mos kelishi uchun), `apps/web/.env`ning standart
`VITE_API_URL=http://localhost:3000` shu bilan mos — `bun run dev` ikkala
`apps/api`/`apps/web`da qo'shimcha sozlashsiz ishga tushdi.

**Topilgan va tuzatilgan haqiqiy bug**: Google orqali kirish
`/api/auth/error?error=internal_server_error`ga tushib qolardi — sabab shu
`.dev.vars` Neon bazasida faqat `0000`–`0002` migratsiyalari qo'llangan
ekan, `0003` (`ventilation_system.cooling_season_hours`) va `0004`
(`user.username`/`role`/`last_seen_at`, `notification`/`conversation`/
`message` jadvallari — Social Phase 1) hech qachon qo'llanilmagan edi.
Production/deploy'lar bu migratsiyalarni ko'rgan bo'lishi mumkin (turli
Neon instansiyasi/branch), lekin bu aniq `.dev.vars` bazasi ko'rmagan edi.
`database.md`dagi hujjatlashtirilgan qo'lda-qo'llash tartibi bilan (`pg`
paketining `Client`i, non-pooler host, tranzaksiya ichida, so'ng
`drizzle.__drizzle_migrations`ga hash+timestamp yozib qo'yildi) ikkalasi
ham qo'llandi — foydalanuvchi tasdig'idan keyin. Bir martalik skript
ishlatilgandan so'ng o'chirildi (`database.md` qoidasiga muvofiq).

**Diqqat — keyingi sessiyada eslab qolish kerak**: agar shu `.dev.vars`
bazasiga qarshi yana boshqa muammo chiqsa, avval
`select id, hash, created_at from drizzle.__drizzle_migrations` bilan
qaysi migratsiyalar qo'llanganini tekshiring — `drizzle-kit migrate` bu
sandbox/muhitda ishonchli emasligi allaqachon `database.md`da qayd etilgan.
Yangi migratsiya (`packages/db/drizzle/000N_*.sql`) yozilsa, uni ushbu
`.dev.vars` bazasiga ham qo'lda qo'llash kerakligini unutmang — u avtomatik
sodir bo'lmaydi.

Log buferlash bilan bog'liq amaliy eslatma: Windows'da `bun run dev > file
2>&1 &` orqali fonga yuborilgan `wrangler dev`ning chiqishi faylga darhol
yozilmasligi mumkin (hech qanday so'rov logi ko'rinmaydi, garchi server
haqiqatan javob berayotgan bo'lsa ham) — `stdbuf -oL -eL bun run dev ...`
bilan qayta ishga tushirish buni tuzatdi va real vaqtli so'rov/xato
loglarini ko'rsatishni boshladi. Kelajakda shu andozaga ergashing.

## Haqiqiy chat bug'i topildi va tuzatildi (`webSocketClose` noto'g'ri kod)

Yuqoridagi to'liq lokal ishga tushirish (real Neon bazasi + `stdbuf` bilan
to'g'ri loglash) tufayli birinchi marta haqiqiy chat xatosi topildi:
foydalanuvchi "chat ishlamayapti" deb xabar berdi, `apps/api/.dev-server.log`
esa har bir anormal WebSocket uzilishida (sahifa yopilishi, qayta yuklash,
React StrictMode'ning ikkinchi marta effect ishga tushirishi)
`Uncaught TypeError: Invalid WebSocket close code: 1006`/`1005` bilan
ushlanmagan xatoni ko'rsatdi. Sabab: `ConversationRoom` va
`UserNotificationChannel`ning ikkalasi ham `webSocketClose(ws, code, reason)`da
runtime bergan `code`ni tekshirmasdan `ws.close(code, reason)`ga qaytarib
uzatardi — `1004`/`1005`/`1006`/`1015` WebSocket spetsifikatsiyasida
"faqat-hisobot-uchun" qiymatlar bo'lib, `.close()`ga argument sifatida
berish taqiqlangan. Bu haqiqiy production'da ham mavjud bo'lgan bug edi
(bu sandbox'ga xos emas). Tuzatildi: shu to'rtta kod aniqlansa argumentsiz
`ws.close()`, aks holda `code`/`reason` bilan yopiladi
(`.claude/rules/realtime.md`ga batafsil yozildi).

Yo'l-yo'lakay `.claude/rules/realtime.md`, `docs/social-features.md` va
`use-chat.ts`dagi eskirgan "bu sandbox'da WebSocket/DO xatti-harakatini
hech qachon tekshirib bo'lmaydi" da'vosi tuzatildi — bu Claude Code
sessiyasining o'ziga (brauzer yo'q) to'g'ri, lekin foydalanuvchining haqiqiy
mashinasida `bun run dev` Miniflare orqali DO/WebSocket'ni to'liq mahalliy
simulyatsiya qiladi, deploy shart emas — bu bug ham aynan shu tarzda,
haqiqiy `wrangler dev`ga real brauzerdan ulanib topildi.

Tekshirildi: `bun run type-check` (barcha workspace), `bunx biome lint`
(tegilgan fayllar) — toza. `wrangler dev` fayl o'zgarishini avtomatik
qayta yukladi ("Reloading local server..."), qayta yuklashdan keyin log
faylida yangi `Invalid WebSocket close code` xatosi ko'rinmadi.

## Ma'lum bo'shliqlar

- **Multi-tenant/tashkilot modeli yo'q.** Binolar bitta foydalanuvchiga tegishli, jamoa
  bo'ylab aniq owner/ESCO/auditor/bank rollariga ega tashkilotga emas. Bino darajasidagi
  ulashish (owner/editor/viewer, 11-bosqich) mavjud; tashkilot darajasidagi tuzilma (kompaniya
  akkaunti o'z auditorlarini taklif qilishi, hisobotlarda umumiy brending, tashkilot bo'ylab
  standart qiymatlar) yo'q.
- **Soyalash elementlari**da hali CRUD/UI yoki hisob-kitobga ulanish yo'q.
- **Energiya balansi taqsimoti** (yuqorida ko'rsatilgan) dvigatel boshqa joyda allaqachon
  hisoblab chiqargan raqamlardan jadvalning tarkibiy-qism-bo'yicha qatorlarini qayta quradi;
  bu jadvalning aniq ishorali-yig'indi umumiy summalari (ayniqsa gains/EMS/solar-DHW qatorlari)
  bilan katakma-katak solishtirilmagan — buni tiyin-tiyingacha mos kelishi kafolatlangan nusxa
  emas, informativ deb hisoblang.
- **GitHub Actions deploy pipeline'i** (`.github/workflows/deploy.yml`) mavjud, lekin haligacha
  haqiqiy deploy yo'li bo'lmagan — hozirgacha barcha deploylar qo'lda qilingan
  (`deployment.md`). Uning secrets/environment-protection sozlamasi oxirigacha tekshirilmagan.
- Hali standart konstruksiya-turi "shablon" kutubxonasi yo'q (auditor har bir qatlamni noldan
  qurish o'rniga boshlanishi mumkin bo'lgan mahalliy devor/tom tuzilmalari) — mumkin bo'lgan
  keyingi qadam sifatida belgilangan, boshlanmagan.

## Manba Excel'dan (`3-DMTT v5.xlsx`) haqiqiy bino kiritildi — API orqali, UI'siz

Lokal dev muhitida (`bun run dev`, haqiqiy Neon bazasiga ulangan `.dev.vars` bilan) manba
hisob-kitob jadvalining o'zidagi bino ma'lumotlari birinchi marta platformaga real bino sifatida
kiritildi. Foydalanuvchi `saidmurodjonkhamdamov@gmail.com` bilan Google orqali (Claude Chrome
kengaytmasi orqali, parol/2FA foydalanuvchining o'zi tomonidan kiritilgan holda) tizimga kirdi.

**Yondashuv**: Excel'da 300+ alohida qiymat (`Building_data` ~11 maydon, `Envelope` ~67 qator,
`Consumption` 36 oy × 2 tashuvchi) borligi va platformada Excel-import funksiyasi yo'qligi
sababli, qo'lda UI orqali forma-baqadam kiritish o'rniga: (1) fon vazifasi (`xlsx` npm paketi
bilan, faqat scratchpad'da izolyatsiya qilingan holda) manba faylni API'ning
`POST /buildings`, `PUT .../envelope`, `PUT .../systems/<key>` (×7), `PUT .../consumption` (×6)
so'rov shakllariga mos JSON'ga aylantirdi; (2) `climateRegionId` va barcha `materialId`lar
haqiqiy sessiya orqali `GET /api/climate/regions` / `GET /api/reference/materials`dan olib,
qo'lda joylashtirildi; (3) brauzer sessiyasidagi (httpOnly cookie) autentifikatsiyadan
foydalanish uchun, JSON fayllarni vaqtinchalik scratch `Bun.serve()` static-server (port 4321,
faqat `http://localhost:5173` uchun CORS) orqali sahifa kontekstidagi `fetch()`ga uzatildi va
so'rovlar shu yerdan `credentials: 'include'` bilan yuborildi — qo'lda cookie ajratib olishga
hojat qolmadi.

**Haqiqiy audit topilgan va tuzatilgan** (`api-contract-notes.md`dagi ambiguity #5): birinchi
o'tishda deraza maydoni 234 m² chiqdi, manba Excel'ning o'zi 257 m² deb ko'rsatgan edi (~9%
kam) — sabab, `length=0` bo'lgan ikkita "socle-continuation" qatori (P1 shimoliy socle 4×
0.8×0.8, P11 janubiy socle 11× 1.0×1.8) qator-filtri tomonidan tashlab yuborilgan edi.
Foydalanuvchi tanlovi bilan bu tuzatildi (256.62 m², 0.15% qoldiq — Excel'ning o'z
yaxlitlashi doirasida).

**Ma'lum bo'shliqlar/soddalashtirishlar** (to'liq ro'yxat scratchpad'dagi
`api-contract-notes.md`da, chunki u vaqtinchalik joyda va keyingi sessiyalar uchun
saqlanmaydi — shuning uchun eng muhimlari shu yerga ko'chirildi):
- Faqat **"before" (audit qilingan holat)** ssenariysi kiritildi — manba Excel'dagi "after
  renovation" parallel ma'lumotlar (yaxshiroq U-qiymatlar, issiqlik-qaytarish ventilyatsiyasi,
  0.97-samaradorlikli qozon) va yangilanuvchi energiya (PV/quyosh issiq suv) — bular
  taklif etilgan chora-tadbirlar, "hozirgi holat"ga kirmaydi — kiritilmadi.
- **Bino turi (`buildingType`) `other` qilib qo'yildi** — Excel'da aniq maydon yo'q edi
  (418 kishi + xona-turlari jadvalidan "hospital" degan xulosa chiqarilgan edi, lekin
  foydalanuvchi buni tasdiqlamadi va aniq alternativa ham bermadi). Bino nomi/loyiha kodi
  sifatida `3-DMTT` ishlatildi (foydalanuvchi tasdig'i bilan). Kerak bo'lsa bino sahifasining
  "Tahrirlash" tugmasi orqali o'zgartiring.
- `envelopeElements[].blockName` barcha 30 elementda `"3-DMTT"` (bino nomi) qilib qoldirilgan,
  `buildingBlocks`dagi haqiqiy blok nomlari ("A blok"/"B blok"/"C blok")ga mos kelmaydi — bu
  API'da qattiq FK emas, faqat erkin matn maydoni (`apps/api/src/routes/envelope.ts:176`), shuning
  uchun so'rov xatosiz o'tdi, lekin UI'da har bir devorning qaysi blokka tegishli ekanligi
  noto'g'ri ko'rsatilishi mumkin — tuzatilmagan.
- Bino gabaritlari (`footprintLengthM`/`footprintWidthM`) haqiqiy o'lchamlar emas — Excel faqat
  maydonni saqlagani uchun `sqrt(maydon)` (kvadrat shakl taxmini) qo'llanilgan; maydonning o'zi
  to'g'ri, lekin uzunlik/kenglik individual raqamlari haqiqiy emas.
- Tom (R1) va pol (F1) `lengthM: 1, heightEnvContactM: 1279` sifatida "soxta devor" qilib
  modellashtirilgan — sxema faqat devor-shaklidagi maydonni qo'llab-quvvatlagani uchun, aniq
  "yassi maydon" maydoni yo'q; ko'paytma (1279 m²) to'g'ri, individual raqamlar mazmunsiz.
- `ventilationSystem.coolingSeasonHours` (yaqinda qo'shilgan mexanik-ventilyatsiya sovutish-yuki
  maydoni) bo'sh (`null`) qoldirildi — manba jadvalda aniq bitta katak sifatida topilmadi.

**Tekshirildi**: bino UI'da to'g'ri ko'rindi (Umumiy tab), keyin `POST /:id/audit/run` to'g'ridan-
to'g'ri chaqirildi (UI'ning "Auditni ishga tushirish" tugmasi standart-qiymatli qisqa
wizard'ga olib borgani uchun, allaqachon kiritilgan batafsil ma'lumotdan foydalanish o'rniga —
shuning uchun wizard chetlab o'tildi). Audit xatosiz yakunlandi (`status: "completed"`),
`/results` sahifasida haqiqiy raqamlar chiqdi: joriy energiya iste'moli 345 kWh/m²/yil,
issitish/issiq suv/sovutish ulushi 98%/1%/1%. Bu butun zanjirni (bino → qobiq → tizimlar →
iste'mol → hisoblash dvigateli → UI) haqiqiy manba ma'lumoti bilan uchtan-uchga tekshirdi.

**Aniqlangan UI nozik jihati (tuzatilmagan, keyingi qadam sifatida qayd etildi)**: bino
sahifasidagi "Auditni ishga tushirish" tugmasi allaqachon to'liq qobiq/tizimlar/iste'mol
ma'lumoti kiritilgan bino uchun ham har doim soddalashtirilgan tezkor-wizard'ga (standart
gabarit qiymatlari bilan) olib boradi — bu chalkashtiruvchi, chunki wizard orqali yuborilgan
har qanday narsa allaqachon kiritilgan batafsil ma'lumotni ustiga yozib qo'yishi mumkin.
Kelajakda: bino allaqachon batafsil ma'lumotga ega bo'lsa, tugma to'g'ridan-to'g'ri
`POST /:id/audit/run`ni chaqirishi kerak, wizard'ga yo'naltirmasdan.

Lokal dev serverlari (`apps/api` port 3000, `apps/web` port 5173) shu sessiya oxirida ishlab
turibdi — keyingi tekshiruv uchun to'xtatilmadi.

## Qobiq (Envelope) muharriri bosqichli qayta qurildi

Yuqoridagi Excel-kiritish tajribasi paytida foydalanuvchi `envelope-editor-dialog.tsx`
(1034 qator, uchta narsani — konstruksiya-qatlam retseptlari, oyna/eshik katalogi, 30 ta yuza
nusxasi — bitta uzun formaga jamlagan) chalkashtiruvchi ekanini bevosita boshdan kechirdi
(shu sababdan deraza maydoni birinchi urinishda 234 vs 257 m² xato chiqqan edi). Foydalanuvchi
so'roviga ko'ra oraliq yamoq emas, to'liq bosqichli qayta qurish qilindi — reja
`.claude/plans/wiggly-weaving-bird.md`da (endi bajarilgan holatda).

**Yangi tuzilma** — `apps/web/src/components/building-detail/envelope-editor/` papkasi:
`state.ts` (qator turlari, `toEditorState`/`parseEditorState`), `calculations.ts` (jonli
U-qiymat va maydon formulalar — backend bilan **bir xil**: `uvalue.service.ts`ning
`U=1/(Rint+Rext+ΣR)`i va `envelope.service.ts`ning `netArea=uzunlik×balandlik−ochilmalar`i),
`row-card.tsx`, va 4 ta bosqich komponenti (`building-blocks-step.tsx`,
`construction-types-step.tsx`, `opening-types-step.tsx`, `envelope-elements-step.tsx`).
`envelope-editor-dialog.tsx` endi faqat qobiq: bosqich holati + `audit.tsx` wizard'idagi bilan
bir xil qo'lda yasalgan raqamli-nishon stepper.

**4 bosqich**: (0) Bino bloklari — YANGI, ilgari bu dialog `buildingBlocks`ni umuman
to'ldirmasdan tashlab yuborar edi; (1) Konstruksiya turlari — endi har bir turi kartasida
jonli "U ≈ X.XX Vt/m²K" belgisi (backend uchun yangi `GET /api/reference/surface-resistance`
endpoint'i, `reference.materials()` andozasida); (2) Ochilma turlari — deyarli o'zgarishsiz;
(3) Yuzalar — eng katta o'zgarish: elementlar `sideCode` bo'yicha (P1, P2, ...) tug'ma
`<details>/<summary>` yordamida yig'iladigan guruhlarga bo'lingan (`packages/ui`da Accordion
yo'q — tug'ma HTML ishlatildi), tepada doim ko'rinadigan (sticky) jami-maydon paneli bilan
(devor/socle/tom/pol/deraza/eshik, jonli qayta hisoblanadi) — bugungi 234 vs 257 m² xatosi
turini darhol ko'rsatib beradi. `blockName` endi erkin matn emas, 0-bosqichdagi bloklardan
to'ldiriladigan `<Select>`.

**Qo'lda tekshirildi**: `bun run type-check`, `bun run build` (haqiqiy Vite build), `bunx biome
lint` — barchasi toza. `bun run test` — servis unit testlari o'tdi, integratsiya testlari
kutilganidek `ECONNREFUSED` (lokal Postgres yo'q). Brauzerda: yangi muharrir bilan mavjud
30-elementli bino ochildi, barcha 4 bosqich to'g'ri yuklandi, jami-hisoblagich aniq **256.6 m²
deraza / 61.4 m²** eshikni ko'rsatdi (bugun API orqali tasdiqlangan qiymat bilan bir xil),
U-qiymat oldindan ko'rsatuvi ishladi (W1 devor uchun 1.35 Vt/m²K), `blockName`ni "A blok"ga
o'zgartirib Saqlash bosildi — `GET .../envelope` o'zgarishni to'g'ri qaytardi (30 element
saqlanib qoldi), va `POST .../audit/run` hamon xatosiz yakunlandi.

**Aniqlangan "ma'lumot yo'qolishi" — aslida bug emas**: shu tekshiruv paytida bugun ertalab
yaratilgan asl `3-DMTT` bino (`id: 0c9bb740-...`) bazada topilmay qoldi, o'rniga faqat
2026-07-12'da yaratilgan eski `3-DMTT` bino (`id: 35661d4c-...`) qolgani aniqlandi. Sabab
tekshirildi: test to'plami (`bun run test`) `TEST_DATABASE_URL` o'rnatilmagan bo'lsa standart
holatda mahalliy `localhost:5432`ga ulanadi (`apps/api/tests/helpers/test-db.ts:7-8`) va bu
`ECONNREFUSED` bilan muvaffaqiyatsiz bo'lgani tasdiqlandi — demak haqiqiy Neon bazasiga
tegmagan; wrangler dev process ham qayta ishga tushmagan. **Haqiqiy sabab: foydalanuvchining
o'zi ikkita takroriy `3-DMTT` binosidan birini (bugungisini) qo'lda o'chirib tashlagan edi.**
Bugungi Excel ma'lumoti scratchpad'dagi JSON fayllardan eski `35661d4c` binoga muvaffaqiyatli
qayta tiklandi (envelope + systems + consumption + bino metama'lumotlari) — ma'lumot butun,
tizimda muammo yo'q.

## Iste'mol (Consumption) kiritish qayta qurildi: yil-tab jadval + Excel shablon/yuklash

Foydalanuvchi energiya iste'molini kiritish hali ham noqulay ekanini aytdi (bitta tashuvchi +
bitta yilni Select orqali tanlab, 12 oylik jadvalni to'ldirib saqlash — ko'p yil/tashuvchi
uchun picker'larni almashtirib qayta-qayta saqlash kerak edi) va ikkita narsa so'radi: (1)
Excel varag'iga o'xshash qulayroq jadval, (2) Excel shablonini yuklab olib, to'ldirib, qayta
yuklash orqali ma'lumot kiritish.

**Yangi tuzilma**: `apps/web/src/components/building-detail/consumption-tab.tsx` qayta
yozildi — yil `Select` o'rniga `Tabs` (Excel varaq-yorlig'i kabi, "+ Yil qo'shish" bilan), har
bir yil ichida BITTA jadval (qatorlar — oylar, ustunlar — har bir tashuvchi uchun asosiy
"Miqdor"). kVt·soat/Xarajat/Tarif maydonlari har bir katak yonidagi `Popover` orqali ochiladigan
"Batafsil" panelida (agar to'ldirilgan bo'lsa, ikonka rangi o'zgaradi — ma'lumot yashiringan
paytda ham yo'qolib qolmasligi uchun). "Hammasini saqlash" faol yil tab'idagi barcha
tashuvchilar uchun ketma-ket `PUT /consumption` chaqiradi (bitta tugma bilan, avval har bir
tashuvchi/yil uchun alohida saqlash kerak edi).

**Yangi**: `apps/web/src/components/building-detail/consumption-excel.ts` — `xlsx` (SheetJS,
`bun add xlsx --cwd apps/web` bilan qo'shildi) paketidan foydalanib:
- `downloadConsumptionTemplate` — ro'yxat ("ledger") formatidagi shablon
  (`Yil | Oy | Tashuvchi | Miqdor | kVt·soat | Xarajat | Tarif`, namuna qator + qabul
  qilinadigan tashuvchilar ro'yxati bilan "O'qish" varag'i) yaratib yuklab beradi.
- `parseConsumptionWorkbook` — yuklangan faylni sarlavha-nomi bo'yicha o'qiydi (uz/en/ru —
  qaysi tilda shablon olingan bo'lsa ham ishlaydi), har bir qatorni tekshiradi, noto'g'ri
  qatorlarni qator raqami bilan xato ro'yxatiga qo'shib tashlab yuboradi (butun faylni rad
  etmaydi). Natija to'g'ridan-to'g'ri mavjud jadval holatiga birlashtiriladi — alohida
  oldindan-ko'rish dialogi yo'q, import qilingan ma'lumot darhol tahrirlanadigan asosiy
  jadvalda ko'rinadi va xuddi shu "Saqlash" tugmasi bilan saqlanadi.

**Muhim arxitektura qarori**: `xlsx` og'ir kutubxona (minified ~430KB) — asosiy bundle'ga
og'irlik qo'shmasligi uchun ikkala funksiya ham uni faqat chaqirilganda `await import("xlsx")`
orqali dinamik yuklaydi (Vite buni avtomatik alohida chunk qiladi — build tekshiruvida
tasdiqlandi, asosiy `index-*.js` chunk hajmi deyarli o'zgarmadi).

**Tekshirildi**: `bun run type-check`/`build` (`apps/web`, `noUncheckedIndexedAccess` bo'yicha
bir nechta massiv-indeks joyini haqiqiy fallback bilan tuzatishga to'g'ri keldi), `bunx biome
lint` — toza. Brauzerda: `3-DMTT` binosining haqiqiy 2023-yil ma'lumoti (Gas/Electricity, 12 oy)
yangi yil-tab jadvalida to'g'ri ko'rindi, "Batafsil" popover to'g'ri qiymatlarni ko'rsatdi
(kVt·soat/Xarajat/Tarif), "Shablonni yuklab olish" haqiqiy `.xlsx` fayl yaratdi (2 varaq: asosiy
+ "O'qish"), va eng muhimi — haqiqiy `parseConsumptionWorkbook` funksiyasi (mock emas) sinov
fayliga qarshi to'g'ridan-to'g'ri ishga tushirilib tekshirildi: 2 to'g'ri qator to'g'ri
o'qildi, 2 ataylab noto'g'ri qator (oy=13, noma'lum tashuvchi) to'g'ri rad etildi va aniq xato
xabari bilan qaytdi; yuklab olingan shablonning o'z namuna qatori ham xatosiz qayta o'qildi
(to'liq round-trip). "Saqlash" tugmasi bosilib, `GET .../consumption` orqali 2023-yil uchun
24 ta hisob-faktura (12 oy × 2 tashuvchi) saqlanganligi tasdiqlandi.

Diqqat: brauzer avtomatlashtirish vositasining fayl-yuklash cheklovi tufayli haqiqiy fayl
tanlash dialogi orqali "Excel yuklash" tugmasi ustida qo'lda bosib ko'rish sinalmadi — buning
o'rniga xuddi shu `parseConsumptionWorkbook` funksiyasi to'g'ridan-to'g'ri chaqirilib
tekshirildi (yuqorida). Foydalanuvchi birinchi haqiqiy foydalanishda UI orqali ham sinab
ko'rishi tavsiya etiladi.

### Darhol keyingi tuzatish: birinchi urinish ham "tushunarsiz/noqulay" chiqdi

Yuqoridagi bosqichli jadval saqlangandan so'ng foydalanuvchi darhol uni ham "tushunarsiz va
tartibsiz" deb baholadi, uch bosqichda aniqlashtirildi:

1. **"excelda yagona o'lchovga keltirilgan kWh"** — manba Excel'da barcha tashuvchilar
   solishtirilishi uchun yagona o'lchov (kVt·soat)ga keltirilgan, birinchi urinishda esa
   asosiy ko'rinadigan maydon har xil o'lchovli "Miqdor" (gaz uchun m³) edi, kVt·soat esa
   "Batafsil"ga yashiringan edi — teskari edi. Tuzatildi: endi asosiy (va yagona doim
   ko'rinadigan) maydon kVt·soat; alohida "asl o'lchov" maydoni butunlay olib tashlandi
   (API hamon `consumptionNative`ni talab qiladi — saqlashda oddiygina kVt·soat qiymatiga
   tenglashtiriladi).
2. **"jadval ham noqulay"** → aniqlashtirilgach: har bir katakdagi kichik "Batafsil"
   popover-tugmasi (12 oy × 4 tashuvchi = 48 ta kichik tugma) chalg'itar ekan. Tuzatildi:
   popover butunlay olib tashlandi, o'rniga bitta global belgi ("Xarajat va tarifni ham
   ko'rsatish") — yoqilganda HAR BIR jadvalga haqiqiy qo'shimcha ustunlar sifatida qo'shiladi
   (popover emas), o'chirilganda (standart holat) faqat kVt·soat ustuni ko'rinadi.
3. **"har bir energiya mahsulot uchun alohida bo'lsin"** — bitta katta ko'p-tashuvchili jadval
   o'rniga endi har bir tashuvchi (Gas/Electricity/District heat/Coal) o'zining alohida kichik
   jadvaliga ega, barchasi bir yil-tab ichida yonma-yon (`grid sm:grid-cols-2 xl:grid-cols-4`)
   — "boshqa energiya manbasi ham bo'lishi mumkin" degani esa aniqlashtirilgach hozirgi 4
   tashuvchi har doim ko'rinishi kifoya ekani ma'lum bo'ldi (yangi tashuvchi turi qo'shish —
   `energyCarrierEnum`ni kengaytiradigan kattaroq backend o'zgarish — so'ralmadi).

`packages/ui`da `Checkbox` komponenti yo'qligi aniqlandi — oddiy tug'ma `<input
type="checkbox">` (Tailwind `accent-primary` bilan) ishlatildi, yangi umumiy komponent
qo'shilmadi.

Tekshirildi: `bun run type-check`/`bunx biome lint` toza. Brauzerda: Gas-2023-yanvar endi
69103 (kVt·soat) ko'rsatadi (avvalgi 7274 m³ o'rniga), "Xarajat va tarifni ham ko'rsatish"
belgisi yoqilganda haqiqiy qiymatlar (18185000 / 2500) to'g'ri ko'rindi, Saqlash bosilgach
`GET .../consumption` orqali `consumptionKwh === consumptionNative === 69103` ekanligi va
24 ta hisob-faktura saqlanib qolgani tasdiqlandi.

### To'rtinchi tuzatish: birlamchi (asl) qiymat + avtomatik konversiya + Excel'dan paste

Foydalanuvchi yana bir bor aniq talab bildirdi: kVt·soatni foydalanuvchining o'zi hisoblab
kiritishi shart emas — **asl o'lchov birligidagi qiymat** (gaz uchun m³ va h.k.) kiritilsin,
tizim o'zi kVt·soatga o'tkazsin, va tarif kiritilganda xarajat avtomatik chiqsin. Bundan
tashqari Excel ustunini nusxalab jadvalga to'g'ridan-to'g'ri joylashtira olish (paste) so'raldi.

**Muhim topilma**: `audit.engine.ts:692-698` audit kalibrlashi **faqat `consumptionKwh`ni**
o'qiydi va uni yo'q hisob-fakturani jimgina tashlab yuboradi — demak bu shunchaki kosmetik
emas, noto'g'ri/yo'q konversiya audit natijasini sezdirmasdan buzadi. Shuning uchun konversiya
**backend'da, saqlash paytida, majburiy** qilib qo'yildi (frontend faqat oldindan ko'rsatish).

**Konversiya koeffitsientlari — manba Excel'ning o'zidan** (o'ylab topilmagan,
`docs/data-dictionary.md:188-191,1103-1105`dan): gaz 9.5 kVt·soat/m³, elektr 1:1, markazlashgan
issiqlik 1163 kVt·soat/Gcal, ko'mir 5.5 kVt·soat/kg (manba Excel'ning o'zi buni "g'alati
kombinatsiya" deb qayd etgan — foydalanuvchi tasdig'i bilan shu qiymat, "taxminiy" deb
belgilangan holda, qo'llanildi). Xarajat = Miqdor(asl birlik) × Tarif — bu haqiqiy saqlangan
ma'lumot bilan tasdiqlandi (7274×2500=18,185,000, aynan mavjud `expenseLocal`).

**Backend**: yangi `apps/api/src/services/consumption.service.ts`
(`CARRIER_KWH_PER_NATIVE_UNIT` + `computeConsumptionKwh`). `apps/api/src/schemas/
consumption.ts`dan `consumptionKwh` mijoz-kirish maydoni sifatida **butunlay olib
tashlandi** — server har doim hisoblaydi. `apps/api/src/routes/consumption.ts`ning POST/PUT
handler'lari `withDerivedFields()` orqali saqlashdan oldin `consumptionKwh`ni hisoblaydi va
`expenseLocal`ni (agar berilmagan bo'lsa) `consumptionNative × tariffLocal` sifatida standart
qiymat qiladi.

**Frontend**: `MonthRow` endi faqat `{ consumptionNative, tariffLocal }`. Yangi
`consumption-units.ts` — backend bilan **bir xil** konstantalar nusxasi (faqat oldindan
ko'rsatish uchun, server yagona haqiqat manbai) + har bir tashuvchining asl birligi
(`m³`/`kVt·soat`/`Gcal`/`kg`). Har bir tashuvchi jadvalida endi: Oy | **Miqdor ({birlik})**
(tahrirlanadigan) | **≈ kVt·soat** (doim ko'rinadigan, faqat-o'qish, jonli) | (belgi
yoqilganda) Tarif (tahrirlanadigan) | Xarajat (faqat-o'qish, jonli). **Excel'dan paste**: har
bir Miqdor/Tarif input'ida `onPaste` — ko'p qatorli clipboard matnini bosilgan oydan
boshlab pastga to'ldiradi (bitta qiymatli oddiy paste standart holicha ishlaydi).
`consumption-excel.ts` shabloni endi **Yil | Oy | Tashuvchi | Miqdor (asl birlik) | Tarif**
(5 ustun, kVt·soat/Xarajat ustunlari olib tashlandi), "O'qish" varag'ida har bir tashuvchining
asl birligi ro'yxati bilan.

**Tekshirildi**: `bun run type-check`, `bunx biome lint`, `bun run test` (baza bilan bir xil —
55 o'tdi/47 integratsiya ECONNREFUSED) toza. Brauzerda: Gas-yanvar katagiga `7274` (m³)
kiritilganda "≈ kVt·soat" ustunida jonli **69,103** chiqdi (7274×9.5); Tarif `2500`da Xarajat
**18,185,000** avtomatik chiqdi; District heat'ga sintetik `paste` hodisasi orqali (haqiqiy OS
clipboard ruxsatisiz, `ClipboardEvent`+`DataTransfer` bilan to'g'ridan-to'g'ri) `10/11/12/13/14`
joylashtirildi — Yanvardan Maygacha to'g'ri tarqaldi, konversiya (10×1163=11,630) to'g'ri
chiqdi. Saqlab, `GET .../consumption` orqali **backend hisoblagan** `consumptionKwh=69103`,
`expenseLocal=18185000` (mijoz bularni umuman yubormagan holda!) tasdiqlandi, `POST
.../audit/run` hamon xatosiz. Shablonni yuklab olib (`Yil|Oy|Tashuvchi|Miqdor (asl
birlik)|Tarif`, namuna qatorda haqiqiy 7274/2500), haqiqiy `parseConsumptionWorkbook`
funksiyasi bilan qayta o'qib, `consumptionNative: 7274` (kVt·soat sifatida emas) to'g'ri
tanilgani tasdiqlandi.

### Beshinchi tuzatish: ixcham (bir tashuvchi — bir qator) jadval + yillar taqqoslash grafigi

Foydalanuvchi jadvalni yana ham ixchamlashtirishni so'radi: har bir tashuvchi uchun 12 qatorli
jadval o'rniga **bitta qator** (oylar ustun bo'lib chiqadi), va tarif ham oyma-oy emas, **butun
yilga bitta** qiymat (haqiqiy ma'lumot buni tasdiqlagan edi — gaz/elektr tarifi 12 oy davomida
bir xil bo'lib chiqqan). Bundan tashqari 3 yillik oylar kesimida taqqoslash ustunli grafigi
(katta ekranda jadval yonida, tor ekranda pastida) va "Barcha kommunal hisob-fakturalar"
faqat-o'qish jadvalini olib tashlash so'raldi.

**Yangi jadval**: qatorlar — 4 tashuvchi (Gas/Electricity/District heat/Coal), ustunlar — 12 oy
+ bitta Tarif + jonli "Jami (kVt·soat)" — jami 4 qator (avvalgi 48 qator o'rniga). Paste
funksiyasi endi **gorizontal** (Excel'dan qator nusxalanganda tab-ajratilgan) ustuvor, vertikal
(ustun nusxalanganda newline-ajratilgan) ham hamon qo'llab-quvvatlanadi
(`splitPastedValues`ning ikkalasini ham aniqlashi).

**Yangi grafik**: `consumption-comparison-chart.tsx` — mavjud `recharts`+`chart-tooltip.tsx`+
`chart-legend.tsx`+`lib/chart-colors.ts` andozasi bilan (dataviz skill'i yuklab o'qildi, mavjud
`results.tsx`dagi BarChart aniq nusxa olindi). Ma'lumotdagi barcha bill'lardan eng so'nggi 3
yil tanlanadi, har bir oy uchun **barcha tashuvchilar bo'yicha jami kVt·soat** hisoblanadi
(tashuvchilar allaqachon bitta o'lchovda — kVt·soat — bo'lgani uchun to'g'ridan-to'g'ri
qo'shish mumkin). Rang: yangi `RECENCY_COLORS` konstantasi (`chart-colors.ts`) — mavjud
`SCENARIO_COLORS`dagi "eski=muted, yangi=primary" urg'u mantig'ining 3-seriyali versiyasi
(muted→warning→primary), qat'iy tartibda, yangi rang o'ylab topilmagan.

Sahifa tartibi: `grid lg:grid-cols-2` — chap ustun kiritish kartasi, o'ng ustun grafik kartasi;
`lg`dan tor ekranlarda ustma-ust tushadi (grafik pastda).

**Tekshirildi**: `bun run type-check`, `bunx biome lint` toza. Brauzerda: jadval haqiqiy
ma'lumot bilan to'g'ri ko'chgan (masalan 2025-yil Gas-yanvar 6976), grafik 2024/2025/2026
guruhlangan ustunlarni to'g'ri ranglar bilan chizgan; District heat qatoriga sintetik
tab-ajratilgan `paste` (`5\t6\t7\t8\t9\t10\t11\t8`) May kataklaridan boshlab qo'llanilib,
May-Dekabrgacha to'g'ri tarqalgani tasdiqlandi; Saqlab, `GET .../consumption` orqali barcha
8 oy uchun backend hisoblagan `consumptionKwh` (masalan oy=10: 10×1163=11630) to'g'ri
ekanligi va `POST .../audit/run` hamon xatosiz ishlashi tasdiqlandi.
