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
