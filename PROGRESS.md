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

## `3-DMTT` ma'lumotini to'ldirish o'tishi (dastlabki kiritishdan keyingi bo'shliqlarni yopish)

Foydalanuvchi "exceldagi ma'lumotlari 3-DMTT ga kiritilsin" deb qayta so'raganda, avval haqiqiy
bazadagi holat tekshirildi — dastlabki kiritish to'liq emas ekan, va oraliqda qilingan UI
sinovlaridan (paste-test'lar, sidebar/dashboard tekshiruvlari) qolgan sintetik test-qatorlar ham
bor edi. Hammasi manba `docs/3-DMTT v5.xlsx`ga qarshi qatorma-qator solishtirilib to'g'irlandi:

- **Iste'mol (`Consumption` varag'i) — asosiy bo'shliq**: bazada faqat 20 ta hisob-faktura bor
  edi (gaz 17, elektr 3), Excel esa 3 yil (2023/2024/2025) × 12 oy × 2 tashuvchi = **72 ta**
  to'liq qator beradi (`GAS` bloki qator 4-19, `Electrical Energy` bloki qator 22-37). Yetishmagan
  hammasi (gaz 2023 to'liq + 2024-yilning iyun-dekabr, elektr 2023/2024/2025 to'liq) `PUT
  .../consumption` orqali (tashuvchi+yil bo'yicha to'liq 12 oylik almashtirish) qo'shildi.
  Shuningdek bazada **oldingi sinovlardan qolgan 3 ta soxta elektr-2026 qatori** (native
  120/100/100 — synthetic paste-test qiymatlari) va **13 ta soxta district_heat qatori** (native
  10/11/12/13/14 va 5/6/7/8/9/10/11/8 — xuddi shu sintetik naqsh) topildi va o'chirildi: Excel'ning
  "Energie Termică" bloki (qator 40-55) **butunlay bo'sh** — bu bino markazlashgan issiqlikdan
  foydalanmaydi, shuning uchun `district_heat` uchun 0 ta qator to'g'ri natija, ko'mir uchun
  Consumption varag'ida umuman blok yo'q (to'g'ri — bino ko'mir ishlatmaydi).
- **`netCooledFloorAreaM2` = 0 edi — haqiqiy bo'shliq, ataylab qoldirilgan soddalashtirish
  emas** (asl kiritish yozuvida bu maydon "ma'lum bo'shliqlar" ro'yxatida umuman qayd etilmagan
  — original o'tishda tushirib qoldirilgan). Excel'ning `Envelope!L92` ("Total" qatori, "Net
  heated area" ustuni) **2515.415 m²** beradi (A blok 1236.24 + B blok 1236.24 + C blok 42.935)
  — `PUT /buildings/:id` bilan to'g'rilandi. Bu Dashboard'da "Jami qavat maydoni" doim 0
  ko'rsatib turishining haqiqiy sababi edi (avvalgi sessiyalarda bu displey-nozikligi deb
  taxmin qilingan edi — aslida yo'q ma'lumot edi).
- **Chora-tadbirlar (`energy_measure`) — 0 dan 11 taga**: `Measures_summary` varag'i
  (qator 5-15) 11 ta nomzod chora-tadbirni "Investment [USD]" va "Proposed for implementation"
  (Ha/Yo'q) bilan beradi. Barcha 11 tasi kiritildi (`POST .../measures`, kategoriyalar
  `measureCategoryEnum`ga moslashtirildi — masalan "Thermal insulation of walls"→
  `envelope_wall_insulation`, "Replacement of gas boiler"→`gas_boiler_replacement`), so'ng **9
  tasi** ("Mechanical ventilation with heat recovery" va "Installation of LED lighting..." dan
  tashqari hammasi — Excel'da bu ikkitasi "No" deb belgilangan) `POST .../measures/select`
  orqali tanlandi. Tekshirish: tanlangan 9 ta chora-tadbirning investitsiya yig'indisi
  ($76,138+$16,624+$15,350+$18,000+$22,770+$4,170+$7,268+$4,000+$0=**$164,320**) Excel'ning
  o'z "Total proposed for implementation" qatoridagi $164,320 bilan **aynan** mos keldi.
- **"Protective measures, other investments" (`non_ee_measure`) — ataylab kiritilmadi**: Excel'da
  3 ta haqiqiy band bor (kabel almashtirish $4,000, ichki devor gipslash $5,000, quvur
  demontaji $2,000), lekin ularning barchasi ham "Proposed for implementation" ustunida **"No"**
  deb belgilangan (qolgan 10 ta qator — bo'sh, tavsif="0", investitsiya=$0, mazmunsiz). `apps/
  api/src/services/audit.engine.ts`ning izohi "bu qatorlarda manba jadvalida tanlov bayrog'i
  yo'q, shuning uchun har doim qo'shiladi" deb taxmin qiladi — bu **manba faylga nisbatan
  noto'g'ri** (ular haqiqatan ham "No" bayrog'iga ega). Shu nomuvofiqlik sababli bu 3 bandni
  kiritmaslikni tanladim (Excel ularni tanlanmagan deb belgilagan, kiritilsa
  `totalInvestmentUsd`ni foydalanuvchi tanlamagan xarajat bilan shishirardi) — bu keyingi
  ko'rib chiqish uchun ochiq qoldirilgan qaror, `audit.engine.ts`dagi izoh yangilanishi kerak
  bo'lishi mumkin.
- **Qobiq (`Envelope`) — qayta tekshirildi, o'zgarish kerak emas**: 3 blok (A/B/C)ning
  footprint/qavat soni/balandlik/perimetr qiymatlari `Envelope!` qator 84-86 bilan aynan mos
  keldi — oldingi sessiyada allaqachon to'g'ri kiritilgan edi.

**Tekshirildi**: barcha o'zgarishlar haqiqiy autentifikatsiyalangan sessiya orqali
(`saidmurodjonkhamdamov@gmail.com`, mavjud brauzer tab'i) to'g'ridan-to'g'ri API'ga
`fetch(..., {credentials:'include'})` bilan qo'llanildi. `POST .../audit/run` xatosiz
yakunlandi (`status: "completed"`); `AuditSummary.totalInvestmentUsd=$164,320` Excel bilan
aynan mos keldi (yuqoriga qarang); `totalNonEeMeasureCostUsd=0` (non-EE bandlar kiritilmagani
uchun, kutilganidek). **Diqqat**: `potentialEnergyUseKwhPerM2Year` natijada `0` chiqdi (kutilgan
"retrofit'dan keyin kamaygan, lekin nolga teng bo'lmagan" qiymat o'rniga) — bu ma'lumot
bo'shlig'i emas, balki hisoblash dvigateli xatti-harakatiga oid savol bo'lishi mumkin
(masalan "after" konstruktsiya turlari qobiq elementlariga ulanmagan bo'lishi mumkin — asl
kiritishda ataylab faqat "before" ssenariysi kiritilgan edi, yuqoriga qarang), keyingi sessiyada
alohida tekshirilishi kerak, bu o'tishda tekshirilmadi (doira tashqarisida).

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

### Oltinchi tuzatish: vertikal (ustuvor) joylashuvga qaytish, siqiq padding, har tashuvchi uchun alohida grafik

Foydalanuvchi 5-tuzatishdagi gorizontal (bir tashuvchi — bir qator, oylar ustun) joylashuvni
qisman qaytardi: **oylik inputlar yana vertikal** bo'lsin (har tashuvchi o'z alohida
12-qatorli ustunida), lekin **siqiq padding/margin bilan** (avvalgi vertikal versiyadagi
kabi baland bo'lmasin). Grafik tomonida esa: har bir tashuvchi uchun **o'z birligida**
alohida 3-yillik taqqoslash grafigi, va **eng pastida** barcha tashuvchilarni yagona
birlikda (kVt·soat) birlashtirgan yakuniy taqqoslash grafigi.

Muhim: state/saqlash/paste mantig'i (`CarrierYearRow { months, tariffLocal }`,
`buildBillGroupsForYear`, `splitPastedValues`) o'zgarishsiz qoldi — faqat JSX render
qismi (jadval ustuvor→vertikal) qayta yozildi, chunki holat tuzilishi allaqachon
yo'nalishga bog'liq emas edi. `Table`ning standart `p-4` katakchasi juda baland edi —
har bir katakka `p-1`/`h-7` kabi siqiq `className` qo'llanib, 12 qatorli ustun ancha
ixchamlashtirildi.

`consumption-comparison-chart.tsx` generik `MonthlyComparisonChart` komponentiga
qayta ishlandi (`valueForBill` funksiyasi orqali parametrlashtirilgan) — 5 marta
qayta ishlatiladi: 4 marta har tashuvchi uchun (`consumptionNative`, o'z birligida),
1 marta jami uchun (`consumptionKwh`, kVt·soatda, eng pastda).

**Tekshirildi**: `bun run type-check`, `bunx biome lint` toza. Brauzerda: 4 ta kichik
vertikal ustun (Gas/Electricity/District heat/Coal) yonma-yon, har biri siqiq 12
qatorli, pastida Tarif + jonli "Jami (kVt·soat)"; pastda 4 ta alohida-birlikdagi
tashuvchi grafigi (Coal'da ma'lumot yo'qligi to'g'ri ko'rsatildi) + eng pastda umumiy
kVt·soat taqqoslash grafigi. `POST .../audit/run` mavjud ma'lumot bilan hamon
xatosiz ishlashi tasdiqlandi.

### Ettinchi tuzatish: har tashuvchi grafigi 2 tadan qatorga

Foydalanuvchi 4 ta alohida-birlikdagi grafikni (Gas/Electricity/District heat/Coal) kengroq
ekranda 4 tadan emas, **doim 2 tadan** joylashtirishni so'radi. `grid gap-3 sm:grid-cols-2
xl:grid-cols-4` konteynerining `xl:grid-cols-4` qismi olib tashlandi — endi `sm:grid-cols-2`
har doim amal qiladi (`5fb19c8`).

## Navbar yaratish va sidebar yig'ish/kengaytirish

Foydalanuvchi: "Navbar qismini tekshirsin mavjud bo'lmasa, yaratsin, side bardagi user va bell
navbarda bo'lishi kerak!" — desktop uchun alohida navbar mavjud emas edi (bell/profil sidebar
pastida edi). `app-shell.tsx`ga asosiy kontent tepasida `<header>` qo'shildi, `NotificationBell`/
`ProfileMenu` sidebar pastidan shu yerga ko'chirildi (mobil `sm:hidden` icon-header o'zgarishsiz
qoldi, u allaqachon o'z ichida bell/profilga ega) — `5a14bcf`.

Keyin ikkita ketma-ket tuzatish so'raldi: **"side bar, kichiklashtirilganda meny va sub menyu
icon ko'rinsin, hover bo'lganda matnni o'zi ko'rsatilsin"** — sidebar uchun collapse (faqat
icon) rejimi va hover-tooltip kerak bo'ldi.

- **Yangi**: `apps/web/src/stores/use-sidebar-store.ts` — `use-theme-store.ts`ning bir xil
  andozasi (Zustand + `localStorage`, `ui-guidelines.md`dagi sof-mijoz-holat chegarasiga mos),
  `collapsed: boolean` + `toggle()`.
- **Yangi**: `packages/ui`ga `@radix-ui/react-tooltip` qo'shildi (avval `Tooltip` primitivi
  umuman yo'q edi) — `packages/ui/src/components/tooltip.tsx` (`Tooltip`/`TooltipTrigger`/
  `TooltipContent`/`TooltipProvider`), `packages/ui/src/index.ts`dan eksport qilindi.
- `app-shell.tsx`: `<aside>` collapsed bo'lganda `w-16` (faqat icon'lar, logotip "Y"), aks holda
  `w-64` (to'liq, `transition-[width]`); collapsed holatda har bir nav item `Tooltip` bilan
  o'raladi (`side="right"`, matn faqat hover'da chiqadi).

So'ng ikkita aniqlashtirish keldi:
1. **"yig'ish kengaytirish navbarda bo'lishi kerak"** — collapse tugmasi dastlab `<aside>`
   pastida edi, navbar (`<header>`)ga ko'chirildi (chap tomonga, bell/profil guruhi o'ng
   tomonda qoladi, `<header>` `justify-between`ga o'zgardi).
2. **"hover bo'lganda bg o'zgarmasin yig'ishga tegishli"** — collapse tugmasi `Button`ning
   standart `ghost` varianti (`hover:bg-accent hover:text-accent-foreground`,
   `packages/ui/src/components/button.tsx:14`) bilan fon rangini o'zgartirar edi; tugmaga
   `className="hover:bg-transparent hover:text-foreground"` qo'shilib bu bekor qilindi.

`nav.json` (uz/ru/en) ga `collapseSidebar`/`expandSidebar` kalitlari qo'shildi.

**Tekshirildi**: `bun run type-check`, `bun run build` (`apps/web`), `bunx biome lint` toza.
Brauzerda (`3-DMTT` sessiyasi): navbar toggle bosilganda sidebar `w-16`ga qisqarib icon-only
holatga o'tdi va `localStorage.getItem("yres-sidebar-collapsed")` `"1"`ga yozildi (qayta
bosilganda `"0"`ga qaytdi); collapsed holatda nav icon'ga hover qilinganda "Binolar" tooltip'i
chiqdi; toggle tugmasiga real hover qilingandan keyin `getComputedStyle(btn).backgroundColor`
`rgba(0, 0, 0, 0)` (shaffof) ekanligi tasdiqlandi.

## Dashboard: filtrlar, hududlar bo'yicha grafik, boyitilgan bino ma'lumoti

Foydalanuvchi: "dashboarda bo'lishi kerak, filter, binolar hududlar bo'yicha grafik, binolar
haqidagi umumiy malumotda nomi, manzili, statusi, auditorlar soni, boshlangan sanasi, deadline,
shunga o'xshash muhim ma'lumotlar bo'lishi kerak" — mavjud Dashboard faqat 2 ta metrika va
so'nggi 5 ta binoning yalang'och ro'yxatini ko'rsatardi. Tekshirilgandan so'ng ma'lum bo'ldiki
`building` jadvalida status ham, deadline ham yo'q edi — Plan mode orqali foydalanuvchi bilan
ikkita savol aniqlashtirildi: (1) status — audit_run'ning hisoblash holatidan mustaqil, qo'lda
belgilanadigan loyiha holati (yangi ustun); (2) deadline — bino darajasida ixtiyoriy sana,
muddati o'tgan+tugallanmagan binolar qizil belgi bilan ajratiladi.

**Sxema** (`packages/db`): yangi `buildingStatusEnum` (`not_started`/`in_progress`/`completed`/
`on_hold`, `enums.ts`), `building`ga `status` (notNull, default `not_started`) va `deadline`
(`date`, ixtiyoriy) ustunlari. Migratsiya `bun run db:generate` bilan hosil qilindi
(`0005_bumpy_veda.sql`), haqiqiy Neon'ga `drizzle-kit migrate` bilan muvaffaqiyatli qo'llandi
(bu safar osilib qolmadi — `database.md`dagi fallback kerak bo'lmadi), `information_schema`
so'rovi bilan ustunlar borligi tasdiqlandi.

**Backend**: `schemas/building.ts`ga `status`/`deadline` (ikkalasi ham optional) qo'shildi.
`routes/buildings.ts` GET `/` endi har bino uchun **`collaboratorCount`**ni ham qaytaradi —
qo'shimcha guruhlangan `buildingMember` so'rovi (`count()` + `groupBy`) + har doim `+1` (bino
egasi hech qachon `buildingMember` qatori bo'lmagani uchun).

**Frontend**: `packages/types`ga `BuildingStatus` turi; `api-types.ts`ning `Building`/
`BuildingWithRole`i yangilandi; `labels.ts`ga `BUILDING_STATUSES`, `BUILDING_STATUS_TRANSLATION_KEYS`
(snake_case→camelCase i18n kalit xaritasi — `BUILDING_TYPE_LABELS`dan farqli, matn to'g'ridan-to'g'ri
emas, `t("buildings:status.*")` orqali lokalizatsiya qilinadi), `isBuildingOverdue()`. Bino
formasiga (`building-form-fields.tsx`, ham `new.tsx`, ham `edit-building-dialog.tsx` tomonidan
ishlatiladi) Status `Select` va Deadline `<input type="date">` qo'shildi.

**Dashboard sahifasi** to'liq qayta qurildi: qidiruv+tur+status+hudud filtrlari (barchasi
client-side `useMemo`, `hudud` — mavjud erkin-matn `location`ning noyob qiymatlari); metrika
kartalari endi filtrlangan to'plamdan; yangi **hududlar bo'yicha grafik** (`dataviz` skill —
bitta seriya→bitta rang `CHART_COLORS.primary`, legend shart emas, mavjud `results.tsx`dagi
`BarChart`+`ChartTooltip` andozasi); "So'nggi binolar" (5 tasi) o'rniga **barcha filtrlangan
binolar** jadvalda — ustunlar Nomi/Manzil/Status(`Badge`, `not_started`→secondary/`in_progress`→
warning/`completed`→success/`on_hold`→outline)/Auditorlar/Boshlangan/Muddat(+`destructive`
"Muddati o'tgan" belgisi).

**Tekshirildi**: `bun run type-check`, `bun run build`, `bunx biome lint` toza (barcha 5
workspace). Brauzerda (`3-DMTT` binosi): edit dialogida Status="Jarayonda"+Deadline="2026-06-01"
saqlangandan keyin `GET /api/buildings/:id` orqali backend'da to'g'ri saqlanganini (avvalgi bir
urinish HMR-buzilgan sahifa holati sababli saqlanmagandek ko'ringan edi — sahifani to'liq qayta
yuklab tuzatildi) tasdiqlandi; Dashboard'da status badge (amber "Jarayonda") + qizil "Muddati
o'tgan" belgisi + Auditorlar=2 to'g'ri chiqdi; status filtrini "Tugallangan"ga o'zgartirib Jami
binolar=0, grafik "Ko'rsatish uchun ma'lumot yo'q", jadval "Filtrga mos bino topilmadi" holatlari
to'g'ri ishlashi tasdiqlandi. Test uchun kiritilgan status/deadline qiymatlari tekshiruvdan so'ng
`not_started`/`null`ga qaytarildi (haqiqiy bino yozuvini test ma'lumoti bilan ifloslantirmaslik
uchun). `.claude/rules/dashboard.md` yozildi, `CLAUDE.md`ning qoidalar jadvaliga qo'shildi.

## 3-DMTT: qobiq tiklandi, chora-tadbirlar uchun "keyingi" (after) stsenariy ma'lumotlari kiritildi

Foydalanuvchi: chora-tadbir tejamkorligi energiya balansidan (oldingi − keyingi) shakllanishi,
narxga ko'paytirilib daromad chiqishi, investitsiya aniq bo'lishi kerak. Tekshirilganda bu
mexanizm `audit.engine.ts`da allaqachon to'g'ri yozilgan ekan (`resolveMeasureStandardizedSavingsKwh()`,
`inferCarrierForMeasure()`) — muammo faqat ma'lumotda edi: (1) qobiq ma'lumotlari sababsiz
yo'qolib qolgan edi (1 ta standart "Main block", 0 konstruksiya/ochilish turi, 0 element), (2)
"keyingi" stsenariy qatorlari umuman kiritilmagan edi.

**Qobiq (before) tiklandi** — `docs/3-DMTT v5.xlsx`ning `Envelope` varag'idan qayta o'qib
kiritildi: 3 blok (A/B/C, `Envelope!84-86`), 4 konstruksiya turi (W1/Socle1-unheated/R1/F1,
qatlamlari `U-values` varag'idan — masalan W1: ichki suvoq 2mm + kengaytirilgan gil-beton 10mm +
g'isht 380mm + kengaytirilgan gil-beton 10mm, U=1.375), 6 ochilish turi (Win1/2/3, D1/2/3), 30
qobiq elementi (P1-P14 devor+sokl juftlari + tom + pol).

**Nozik jihat — oyna/eshik maydoni**: Excel'da "Win3" nomli oyna turi turli qatorlarda turli
o'lchamlarda uchraydi (masalan 1.2×1.8=2.16m² va 1.9×1.8=3.42m² bir xil "Win3" nomi ostida) —
sxemamiz esa bitta ochilish turiga bitta o'lcham beradi. Yechim: `widthM=1`,
`heightM`="maydon-vazn o'rtachasi" (jami maydon ÷ jami dona), shunda `soni×kenglik×balandlik`
har doim jami maydonni aynan takrorlaydi (256.62m² oyna, 61.43m² eshik — `Envelope!row71` bilan
tasdiqlangan), U-qiymat esa Win3/D1'ning haqiqiy qiymati bo'lib qoladi (barcha nolmas-maydonli
oyna/eshik aynan Win3/D1 bo'lgani uchun aniq, taxminiy emas). Excel'ning 2 ta "overflow" qatori
(row6, row42 — oldingi qatorning davomi, element nomi bo'sh) alohida topilib oldingi qatorga
qo'shildi (`check-overflow.mjs` bilan tekshirildi) — busiz jami maydon 234.26m² chiqib, 22.36m²
kam bo'lardi.

**"Keyingi" (after) ma'lumotlar kiritildi** — `GET /measures`dan tasdiqlangan taklif qilingan 9
toifa: `envelope_wall_insulation, window_replacement, envelope_roof_insulation, heating_system,
gas_boiler_replacement, equipment_replacement, pv, solar_dhw, ems` (floor_insulation,
mechanical_ventilation_heat_recovery, lighting taklif qilinmagan — kiritilmadi):
- `construction_type` (`after`): W1-after (U=0.295, +100mm mineral wool + ruberoid + tashqi
  suvoq), Socle1u-after (U=0.314), R1-after (U=0.311, +150mm Polistirolbeton) — hammasi
  `U-values` varag'idan.
- `opening_type` (`after`): Win4 (U=1.5), D4 (U=1.8) — `Envelope!row95-96`.
- `distribution_system` (`after`, heating): `insulatedFraction=1` (`Heat distr. efficiency!
  row16`, tejamkorlik 28166.4 kWh/y — Excel bilan aynan mos).
- `generation_source` (`after`, heating/gas_boiler): `efficiencyOrSeer=0.97`
  (`Overall gener. & distrib. eff.!row7`, oldingi 0.58).
- `equipment_item` (`after`): bitta sintetik yig'indi qator (`7927.169` kWh/y, `Equipment!row100`)
  — 11 ta qurilmani alohida oldin/keyin qayta modellashtirish o'rniga soddalashtirish, izohda
  belgilangan (natijaviy audit tejamkorligi Excel'ning o'z "savings=5953.396" qiymatidan farq
  qiladi — mavjud "before" qatorlaridagi umumiy summaning Excel bilan mos kelishi tekshirilmadi,
  keyingi sessiya uchun qayd etilsin).
- `renewable_system` + oylik ishlab chiqarish: PV (10kW, `PV!row12-23` 12 oylik qiymat, jami
  15607.42 kWh — aynan mos), Solar DHW (jami 7927.8 kWh — Excel oylik taqsimotni bermagani
  uchun PV'ning oylik nisbati bilan proportsional taqsimlandi, faqat yillik jami aniq;
  `renewable.service.ts` faqat jami qiymatni ishlatadi, oylik taqsimot audit natijasiga
  ta'sir qilmaydi).

**⚠️ Topilgan haqiqiy kod bo'shlig'i (tuzatilmadi — bu ma'lumot kiritish, kod o'zgarishi emas)**:
`PUT /api/buildings/:id/envelope`ning `constructionTypeInputSchema`sida `retrofitOfId`ni
o'rnatish uchun **hech qanday maydon yo'q** (`apps/api/src/schemas/envelope.ts`), garchi
`envelope.service.ts`ning `resolveHeatLossGroups()` funksiyasi "keyingi" stsenariy uchun
devor/tom/sokl issiqlik yo'qotishini aynan shu maydon orqali (`retrofitOfId` — qaysi "oldingi"
turga tegishli ekanligi) hisoblasa ham. Natijada `envelope_wall_insulation` va
`envelope_roof_insulation` uchun `standardizedAnnualSavingsKwh` **doim 0 bo'lib qoladi**,
W1-after/R1-after/Socle1u-after qatorlari kiritilgan bo'lsa ham — ular hech qachon o'zining
"oldingi" turiga bog'lanmaydi. Oyna/eshik (`opening_type`) va boshqa tizimlar bunday muammoga
duch kelmaydi, chunki ularning "keyingi" holati faqat toifa (`category`) bo'yicha aniqlanadi,
`retrofitOfId`siz. **Tuzatish uchun**: `constructionTypeInputSchema`ga `retrofitOfCode: z.string
().optional()` (envelope elementlarning `constructionTypeCode` andozasiga o'xshab) qo'shish va
`routes/envelope.ts`da shu kodni `constructionTypeIdByCode` xaritasi orqali haqiqiy ID'ga
o'girib, insert paytida `retrofitOfId` sifatida yozish kerak.

**Tekshirildi**: `POST /audit/run` muvaffaqiyatli (`status: completed`). Oldin
`potentialEnergyUseKwhPerM2Year=0` edi, endi **137.39 kWh/m²/yil**. Ishlagan chora-tadbirlar:
`window_replacement` 22,210 kWh/$486, `heating_system` 28,166 kWh/$617 (Excel bilan aynan mos),
`gas_boiler_replacement` 461,488 kWh/$10,107, `equipment_replacement` 13,724 kWh/$1,256, `pv`
15,607 kWh/$1,428 (aynan mos), `solar_dhw` 7,928 kWh/$174 (aynan mos), `ems` 10,262 kWh/$225.
Yuqoridagi kod bo'shlig'i sababli `envelope_wall_insulation` va `envelope_roof_insulation` hamon
0 kWh/0 $ ko'rsatadi — bu keyingi sessiyada `retrofitOfCode` maydonini qo'shish bilan
tuzatilishi kerak.

## `retrofitOfCode` kod bo'shlig'ini tuzatish — devor/tom izolatsiyasi tejamkorligi ishga tushdi

Foydalanuvchi to'g'ridan-to'g'ri so'radi: chora-tadbir tejamkorligi energiya balansidan
(oldingi−keyingi) shakllanishi, tegishli tashuvchi narxiga ko'paytirilib daromad chiqishi, va
investitsiya aniq hisob-kitob qilinishi kerak. Tekshiruv shuni ko'rsatdikim, bu mexanizm
`audit.engine.ts`da allaqachon to'g'ri yozilgan edi — yagona muammo yuqorida qayd etilgan
`retrofitOfId` bo'shlig'i edi. Shu bo'shliq endi tuzatildi:

- **`apps/api/src/schemas/envelope.ts`**: `constructionTypeInputSchema`ga
  `retrofitOfCode: z.string().min(1).nullable().optional()` qo'shildi.
- **`apps/api/src/routes/envelope.ts`**: PUT handler'i endi so'ralgan `retrofitOfCode`larni
  binoning mavjud `"before"` stsenariyli konstruksiya turlaridan (kod bo'yicha) qidiradi va
  topilgan ID'ni yangi qatorning `retrofitOfId`siga yozadi; noma'lum kod uchun 400 xato
  qaytaradi (`envelopeElements`ning noma'lum `constructionTypeCode`ga qanday munosabatda
  bo'lishiga o'xshab).
- Frontend Qobiq muharriri hamon faqat `"before"` stsenariyni tahrirlaydi (`EDIT_SCENARIO =
  "before"`, `envelope-editor/state.ts`) — bu ataylab shunday qoldirildi, "keyingi" ma'lumot
  hozircha faqat API orqali kiritiladi; alohida "keyingi" tahrirlash UI'si so'ralmagan.

**Muhim amaliy saboq**: `PUT /:id/envelope` bitta stsenariy uchun **hammasini almashtiradi** —
`constructionTypes`, `openingTypes`, `envelopeElements`ning har biri, payload'da berilmagan
bo'lsa ham, o'sha stsenariyning mavjud qatorlari **avval o'chiriladi**. W1-after/R1-after/
Socle1u-after'ga `retrofitOfCode` qo'shish uchun qilingan qayta-PUT dastlab faqat
`constructionTypes`ni yubordi — natijada Win4/D4 (`openingTypes`) sezdirmasdan o'chib ketdi;
keyin faqat `openingTypes`ni tuzatish uchun qilingan ikkinchi PUT esa yangi tuzatilgan
`constructionTypes`ni yana o'chirib yubordi. Ikkalasi bitta PUT'da birga yuborilgach to'g'ri
tiklandi. Bu endpoint'dan foydalanadigan har qanday kelajakdagi skript **bitta stsenariy uchun
barcha to'rtta massivni (`buildingBlocks` ixtiyoriy, qolgan uchtasi doim) bitta so'rovda birga**
yuborishi shart — qisman PUT xavfsiz emas.

**Tekshirildi**: `bun run test` (`apps/api`) — 55/55 unit test (`tests/services/*`) toza
o'tdi (10 ta integratsiya test fayli `ECONNREFUSED` bilan muvaffaqiyatsiz — kutilgan holat,
`testing-and-verification.md`ga qarang). `bunx tsc --noEmit` va `bunx biome lint` toza.
`POST /audit/run` orqali: `envelope_wall_insulation` 77,173 kWh/$1,690 (investitsiya $76,138),
`envelope_roof_insulation` 136,734 kWh/$2,994 (investitsiya $15,350), qolgan 7 ta chora-tadbir
avvalgidek ishlashda davom etmoqda (`window_replacement` qayta tiklangandan keyin yana 22,210
kWh/$486ga qaytdi), `totalInvestmentUsd` hamon $164,320 (o'zgarishsiz, Excel bilan mos).
`potentialEnergyUseKwhPerM2Year`: 137.39 → **51.01 kWh/m²/yil** (devor/tom izolatsiyasi endi
"keyingi" energiya sarfini to'g'ri kamaytiryapti).

## Hisobotni platformaga to'liq integratsiya qilish (ko'p bosqichli, davom etmoqda)

`.claude/rules/hisobot.md` WB ECE namunaviy hisobot shakli (`Namuna hujjatlar/пример отчёта
Мд.docx`) bilan solishtirib PDF hisobotning (`report.service.ts`) maqsadli strukturasini va
~12 ta bo'shliqni belgiladi — reja `C:\Users\Saidmurod\.claude\plans\harmonic-wondering-treehouse.md`da,
8 bosqichga bo'lingan. Qarorlar: hisobot inglizcha qoladi (i18n qamrovga kirmaydi), pul oqimi
jadvali faqat `proposedForImplementation` chora-tadbirlar uchun, grafiklar `pdf-lib`
primitivlari (`drawRectangle`/`drawSvgPath`/`drawLine`) bilan qo'lda chiziladi (Workers
runtime'da DOM/canvas yo'q, `recharts` server tarafida ishlamaydi).

**1-bosqich (tugallandi)** — `EnergyMeasureResult`ga (`packages/types/src/measures.ts`)
`standardizedCashflow`/`actualCashflow: CashflowYear[]` qo'shildi; `audit.engine.ts`
`calculateFinancialIndicators()`dan hozir `cashflow`ni ham destructure qilib shu maydonlarga
yozadi (yangi hisob-kitob yo'q — funksiya buni allaqachon qaytargan, faqat tashlab
yuborilayotgan edi). Tekshirildi: `bun run type-check` (butun repo, `@yres/web` ham), `bunx
biome lint`, `bun run test` — 55/55 unit test toza (integratsiya testlari kutilganidek
`ECONNREFUSED`).

**2-bosqich (tugallandi)** — yangi `apps/api/src/services/report-data.service.ts`:
`getUValueBreakdown()` (`constructionType`+`layers.material` — `audit.engine.ts:168-171`dagi
bir xil so'rov andozasi, lekin yig'indi o'rniga har bir qatlamni saqlab qoladi, qatlam
qarshiligini mavjud `uvalue.service.ts`ning `calculateLayerResistance()`/`calculateUValue()`si
orqali hisoblaydi — audit.engine.ts'ning joyida qayta yozgan formulasi takrorlanmadi),
`getConsumptionHistory()` (`utilityBill`ni carrier→oy→yil bo'yicha guruhlovchi sof
`groupBillsByCarrierYearMonth()` funksiyasi orqali, alohida export qilingan — 8-bosqichda
DB'siz unit-test qilinadi), `getLatestEnergyTariffs()` (`audit.engine.ts:729-735`dagi
"carrier bo'yicha eng so'nggi tarif" andozasi). Tekshirildi: `bun run --cwd apps/api
type-check`, `bunx biome lint`, `bun run test tests/services` — 55/55 toza.

**3-bosqich (tugallandi)** — `report.service.ts`dagi `ReportLayout` klassiga `barChart()`
(proportsional `drawRectangle()` ketma-ketligi) va `pieChart()` (`drawSvgPath()` bilan
markazdan chizilgan sektorlar + yon legend) qo'shildi. Muhim tuzatish: pdf-lib'ning
`drawSvgPath()`si ichkarida har doim `scale(1, -1)` qo'llaydi ("SVG path Y axis is opposite
pdf-lib's" — kutubxonaning o'z manba kodidagi izohi), shuning uchun `wedgePath()` funksiyasi
barcha Y koordinatalarini path ichida oldindan manfiylab beradi — aks holda sektor sahifadan
tashqariga chiqib ketardi. Metodlar hali `generateAuditReportPdf()`dan chaqirilmaydi (4-6
bosqichlarda ulanadi) — bu bosqichda faqat klassga qo'shildi. Tekshirildi: `bun run
type-check`, `bunx biome lint` — toza. Vizual tekshiruv (chizilgan PDF'ni ochib ko'rish) bu
sandbox'da imkonsiz — `hisobot.md`ning tekshirish izohiga qarang; funksional tekshiruv
(xatosiz PDF chiqishi) 8-bosqich testida qilinadi.

**4-bosqich (tugallandi, 7-bosqich bilan birga)** — `generateAuditReportPdf()` uchinchi
`extras: ReportExtras` argumentini oldi (`uValues`/`consumptionHistory`/`tariffs` —
2-bosqichning yangi so'rovlari); imzo o'zgargani `routes/audit.ts`ni ham darhol buzgani uchun
7-bosqich (route simlash — `runFullAudit()` bilan bir qatorda `Promise.all` orqali uchtasini
chaqirish) shu bosqichda birga qilindi, aks holda oraliq holat buziq qolardi. Qo'shilgan
bo'limlar: iqlim/harorat parametrlari (Bino bo'limiga), qatlam-qatlam U-qiymat jadvallari,
oylik sarf tarixi jadvali+`barChart()` (carrier bo'yicha), generatsiya/taqsimot samaradorligi
jadvali (`aggregateGenerationByEndUseScenario()` — bir nechta manba bitta end-use'ga xizmat
qilganda samaradorlikni `finalEnergyConsumptionKwh` bo'yicha vaznlab o'rtachalaydi), energiya
balansi taqsimoti jadvali+`barChart()` (ikki bo'lim: `envelope_ventilation_loss` uchun "oldin"
taqsimoti — bugungi muammoni tashxislash, `final_energy` uchun "keyin" taqsimoti — nima sotib
olinadi).

**Haqiqiy bug topildi va tuzatildi (smoke-test orqali, commit qilinmasdan oldin)**: U-qiymat
jadvalining "λ (W/mK)" sarlavhasi PDF'ning standart `WinAnsiEncoding`sida yo'q belgi
(`λ` — grek harfi) ishlatgani uchun **har safar** (haqiqiy binoda construction type bo'lsa)
`generateAuditReportPdf()`ni "WinAnsi cannot encode 'λ'" xatosi bilan yiqitardi. Bu faqat
haqiqiy `generateAuditReportPdf()`ni chaqirib (qo'lda tuzilgan `AuditResult`/`extras` fixture
bilan, `apps/api/smoke-report.ts` — vaqtinchalik, commit qilinmadi) topildi; `type-check`/`lint`
buni tutib bermaydi (matn satri sifatida to'liq yaroqli TypeScript). Sarlavha "Conductivity
(W/mK)"ga almashtirildi. Bu ushbu kengaytirishning **hisobot xatolarini faqat kod o'qishdan
bilib bo'lmasligi** haqidagi `hisobot.md`ning tekshirish izohini tasdiqladi — shu sababli har
bir keyingi bosqichda ham xuddi shu tarzda (qo'lda fixture bilan haqiqiy chaqiruv) qo'shimcha
tekshiriladi, faqat 8-bosqichning rasmiy testiga qoldirilmaydi. Bo'sh massivlar (yangi
bino, hech narsa kiritilmagan) bilan ham sinovdan o'tdi — xato yo'q.

Tekshirildi: `bun run type-check` (butun repo), `bunx biome lint`, `bun run test
tests/services` (55/55), va yuqoridagi ikkita qo'lda smoke-test (to'liq ma'lumot + bo'sh
ma'lumot).

**5-bosqich (tugallandi)** — Chora-tadbirlar jadvali standardized/actual juftligini ikkita
qo'shni jadval sifatida ko'rsatadigan qilib qayta yozildi (bu chizish dvigatelida ko'p-qatorli
katak yo'q, shuning uchun bitta qatorga ikkalasini sig'dirish imkonsiz — ikkita qo'shni jadval
bir xil qator tartibida "hech qanday ajratish yo'q" tamoyilini saqlaydi). Qo'shildi: GHG bo'limi
(chora-tadbir bo'yicha CO2 jadvali + qo'llanilgan emissiya koeffitsientlari), Moliyaviy
taxminlar bloki (`DEFAULT_DISCOUNT_RATE`, `ENERGY_ESCALATION_RATES` — `financial.service.ts`dan
import qilingan, qayta yozilmagan — hisoblanmagan, faqat ko'rsatilgan) + tariflar jadvali
(`extras.tariffs`), va har bir **taklif qilingan** chora-tadbir uchun pul oqimi jadvali —
standardized va actual ustunlari bitta jadvalda yonma-yon (yil bo'yicha zip qilinib), alohida
ikki jadval o'rniga. Yangi `fmtPct()` yordamchisi qo'shildi.

Smoke-test qayta ishlatildi (ikkinchi, taklif qilinmagan chora-tadbir qo'shilgan holat bilan —
`proposedForImplementation: false` filtri to'g'ri ishlayotganini tasdiqlash uchun). Tekshirildi:
`bun run type-check` (butun repo), `bunx biome lint`, `bun run test tests/services` (55/55),
qo'lda smoke-test (ikki chora-tadbirli, bittasi taklif qilinmagan) — xatosiz, `%PDF` bilan
boshlanadi.

**6-bosqich (tugallandi)** — Hisobot oxiriga "Annex 2: Detailed calculations" bo'limi
qo'shildi: qobiq issiqlik yo'qotishi (`envelopeHeatLoss[].monthly`), ventilyatsiya yo'qotishi
(`ventilationLoss[].monthly`), issiqlik balansi (`heatingEnergyBalance[].monthly`) — har biri
oldin/keyin stsenariysi bo'yicha alohida oylik jadval. Hech qanday yangi hisob-kitob yo'q —
`AuditResult`da allaqachon mavjud, faqat hech qayerda ko'rsatilmagan massivlar jadvalga
chiqarildi (`hisobot.md`ning Annex-2 bo'shlig'i shu bilan yopildi). Bu bilan `hisobot.md`da
belgilangan barcha ~12 bo'shliq yopildi.

Smoke-test to'liq oylik massivlar (`monthly: [...]`, 12 oy × har bir manba) bilan qayta
ishlatildi — 22KB'lik PDF, xatosiz. Tekshirildi: `bun run type-check` (butun repo), `bunx
biome lint`, `bun run test tests/services` (55/55).

**8-bosqich (tugallandi) — hisobot integratsiyasi yakunlandi**. 4-6 bosqichlarda qo'lda
ishlatilgan vaqtinchalik smoke-test skriptlari (commit qilinmagan) endi doimiy testlarga
aylandi: `apps/api/tests/services/report.service.test.ts` (to'liq to'ldirilgan `AuditResult`/
`ReportExtras` fixture bilan `generateAuditReportPdf()`ni chaqirib, natijani `pdf-lib`ning
o'zi bilan qayta yuklab `%PDF-` sarlavhasi va sahifa sonini tasdiqlaydi; bo'sh/yangi bino
holatini ham, taklif qilinmagan chora-tadbir cashflow bo'limidan chiqarib tashlanishini ham
qamrab oladi) va `apps/api/tests/services/report-data.service.test.ts` (`groupBillsByCarrierYear
Month()` sof funksiyasini baza kerak bo'lmagan holda — guruhlash, `consumptionKwh: null`
qatorlarni o'tkazib yuborish, oy bo'yicha saralash).

**Yakuniy holat**: `hisobot.md`da belgilangan barcha 8 bo'lim (A-H)/~12 bo'shliq yopildi.
Tekshirildi: `bun run type-check` (butun repo), `bunx biome lint`, `bun run test
tests/services` — **62/62 unit test toza** (7 yangi test qo'shildi, avvalgi 55 ta o'zgarishsiz
o'tdi). Integratsiya testlari (`tests/integration/report.test.ts`) bu sandbox'da lokal
Postgres yo'qligi sababli tekshirilmadi (`testing-and-verification.md`ga qarang) —
`/:id/audit/report` endpoint'ining haqiqiy HTTP orqali ishlashi keyingi haqiqiy muhitda
tasdiqlanishi kerak.

## Hisobotni zamonaviylashtirish: grafik dizayni + katta qayta ko'rib chiqish taklifi

Loyiha egasi hisobotdagi grafiklarning "juda eski" ko'rinishidan norozi bo'lib, avval
grafik dizayni tuzatishni, keyin esa ancha kattaroq ro'yxatni (shrift, til, tuzilma, auditor
izohlari, QR-kod, xarita) so'radi. Ikki alohida bosqichda ishlandi.

### Grafik modernizatsiyasi (tugallandi, commit qilindi)

`report.service.ts`ning `ReportLayout.barChart()`/`pieChart()`i qayta yozildi: ikkalasi ham
endi karta fonida (och kulrang panel + chap tarafda ACCENT chiziqli), bar chart'da 0/25/50/
75/100% setka chiziqlari + o'lchov yorliqlari, markazlashtirilgan qiymat/kategoriya yozuvlari.
`pieChart()` donut'ga aylantirildi (markazda jami qiymat, yon legendada rangli belgi+foiz) va
ikkita bo'limga (issiqlik/ventilyatsiya yo'qotish taqsimoti "oldin", sotib olingan energiya
taqsimoti "keyin") ulandi — bu funksiya avval yozilgan, lekin hech qayerda chaqirilmagan edi.

**Haqiqiy bug topildi va tuzatildi** (birinchi marta haqiqiy PDF generatsiya qilib, sahifalarni
ochib ko'rish orqali — `Read` vositasi PDF sahifalarini rasm sifatida ko'rsata oladi ekan, bu
avval "sandbox'da tekshirib bo'lmaydi" deb hujjatlashtirilgan edi): `wedgePath()`ning yagona SVG
`A` (arc) buyrug'i orqali chizilgan donut sektorlar amalda parchalanib ketgan (kichik sektorlar
uchun ingichka bir-biriga kesishgan bo'laklar, 50%dan katta sektorlar uchun juda katta noto'g'ri
shakl) — `drawSvgPath()`ning o'zining `scale(1,-1)` flip'i bilan arc'ning katta-yoy/yo'nalish
bayroqlari kutilganidek o'zaro bekor bo'lmagan. Tuzatish: yoyni bitta `A` buyrug'i o'rniga
to'g'ri chiziqlar ketma-ketligi (har ~4°da bitta segment) bilan almashtirish — bayroq
noaniqligi umuman yo'qoladi. Haqiqiy binoga qarshi qayta generatsiya qilib tasdiqlandi (barcha
sahifalar to'g'ri chiqdi).

Tekshirildi: `bun run --cwd apps/api type-check`, `bunx biome lint`, `bun run test
tests/services/report.service.test.ts tests/services/report-data.service.test.ts` (7/7),
haqiqiy Neon bazadagi bino bilan generatsiya qilingan PDF vizual tekshirildi. Commit qilindi.

### Katta qayta ko'rib chiqish — spec-first yondashuv

Loyiha egasi keyin bitta xabarda ko'p talab qo'shdi: Times New Roman shrift, izohlar kursiv,
hisobot tizim tilida (uz/ru/en) yozilsin, energiya iste'moli platformadagi kabi 3-yillik
guruhlangan ustunli grafik bilan ko'rsatilsin, energiya balansi Excel'dagi tuzilishida
(carrier bo'yicha, standardized/actual), auditor har bir bo'limga (ayniqsa qatlam ma'lumotlari
va grafiklar ostida) izoh qoldira olsin, grafik bo'lsa jadval shart emas, QR-kod +
haqiqiylik/amal qilish muddati bloki, bino koordinatalari+xarita hisobot boshida.

Bu hajm sabab, avval **`docs/report-redesign-proposal.md`** yozildi — har bir band uchun
(1) nima so'ralgan, (2) kodda hozirgi holat (tekshirilgan, fayl:qator havolasi bilan), (3)
taklif, (4) yangi sxema/infratuzilma kerakmi. Fon tadqiqotida aniqlangan muhim faktlar:
- `constructionType.description` ustuni **allaqachon mavjud** (`envelope.ts:21`) va frontendda
  tahrirlanadi — auditor izohi uchun yangi sxema shart emas, faqat `report-data.service.ts` →
  PDF ulanishi yetishmayapti (eng tez bajariladigan band).
- Platformaning 3-yillik iste'mol grafigi (`consumption-comparison-chart.tsx`) guruhlangan
  bar chart (har oy ichida yil bo'yicha yonma-yon ustunlar) — PDF'dagi `barChart()` esa hozir
  faqat bitta seriya (o'rtacha) oladi, buni moslashtirish haqiqiy kod o'zgarishi talab qiladi.
- Manba Excel'ning "Specific-consumption summary" jadvali (actual/standardized-oldin/
  standardized-keyin, issitish/ISI/elektr bo'yicha) hozir `AuditResult`da umuman yo'q —
  aniqlangan haqiqiy bo'shliq, `audit.engine.ts`ga yangi hisoblash kerak.
- Auditor izohlari (grafik ostida ixtiyoriy), bino koordinatalari+xarita, va QR-kod/tekshiruv
  sahifasi — barchasi haqiqatan yangi sxema/route/tashqi integratsiya talab qiladi.

Loyiha egasi faylni ko'rib chiqib, bir nechta joyni to'g'ridan-to'g'ri tahrirladi (shrift
o'lchamlari — 12pt yoki 10pt, portraitga sig'masa albom holatga o'tkazilsin; xarita/QR
uchun "bepul va ishonchli" variant tanlansin; auditor izohi faqat kerakli qismlarga; barcha
uch til hoziroq tarjima qilinsin, xato bo'lsa keyin tuzatiladi) va ishni boshlashni
tasdiqladi.

### 1-bosqich: Tipografiya + albom-sahifa zaxira mexanizmi (tugallandi)

`ReportLayout`ning shrift oilasi `Helvetica*`dan `Times*`ga o'tkazildi
(`StandardFonts.TimesRoman`/`TimesRomanBold`/`TimesRomanItalic` — barchasi pdf-lib'da
standart, alohida embed shart emas), yangi `note()` metodi qo'shildi (kursiv, auditor
izohlari uchun — hali hech qayerda chaqirilmaydi, keyingi bosqichlarda ishlatiladi).
O'lchamlar oshirildi: sarlavha 20→22pt, bo'lim sarlavhasi 13→14pt, paragraf 9.5→10pt, jadval
katakchasi 8.5→10pt, `keyValueGrid` qiymati 12→13pt.

**Albom-sahifa zaxirasi** (`table()`ga): agar ustun kengliklari yig'indisi joriy (portret)
sahifaning bosiladigan kengligidan oshsa, jadval o'zining alohida albom (landscape, A4
aylantirilgan) sahifasida chiziladi — buning uchun `ReportLayout` avval qattiq kodlangan
`PAGE_WIDTH`/`PAGE_HEIGHT`/`CONTENT_WIDTH` modul konstantalaridan instance maydonlariga
(`this.pageWidth`/`this.pageHeight`, `this.contentWidth()`) o'tkazildi, shunda albom
sahifadan keyin kelgan har qanday kontent yana toza portret sahifadan davom etadi.

**Ikkita haqiqiy bug topildi va tuzatildi** (yana haqiqiy PDF generatsiya qilib, sahifa-
sahifa ochib ko'rish orqali):
1. Birinchi urinishda albom-almashtirishdan keyin portretga qaytarish kodi butunlay
   unutilgan edi — bir marta albom rejimi ishga tushgach, **butun qolgan hisobot** shu holatda
   qolib ketgan (23 ta sahifaning barchasi albom bo'lib chiqqan). `PDFDocument.load()` orqali
   sahifa o'lchamlarini dasturiy tekshirish bilan aniqlandi (`p.getSize()`), keyin `table()`
   oxiriga yetishmayotgan `this.newPortraitPage()` chaqiruvi qo'shildi.
2. Kattalashtirilgan 10pt shrift bir nechta jadvalning (Tavsiya etilgan chora-tadbirlar —
   ham standardized, ham actual; Generatsiya/taqsimot samaradorligi; manba Excel'ning
   qatlam/energiya balansi Annex 2 jadvallari) oldindan belgilangan ustun kengliklarini haqiqiy
   matn kengligidan torroq qilib qo'ygan edi — natijada nom/qiymat matnlari qo'shni ustunga
   "yopishib" chiqayotgan edi (masalan "Thermal insulation of walls$76,138"). Bu faqat vizual
   tekshiruv orqali topildi (`bun run type-check`/testlar bunday matn-darajasidagi kollizyani
   ushlab bera olmaydi — bu qator to'liq yaroqli TypeScript satri). Tuzatish: chora-tadbirlar
   jadvallarini ataylab kengaytirib albom rejimiga o'tkazildi (nom ustuniga ko'proq joy), qolgan
   uch jadvalning kengliklari esa portret ichida sig'adigan qilib qisqartirildi (ular grafik
   emas, oddiy qisqa qiymatlar edi, albom shart emas edi).

Yakuniy holat: 20 sahifalik hisobotda faqat 3 ta jadval (Tavsiya etilgan chora-tadbirlar —
ikkalasi ham, Generatsiya/taqsimot samaradorligi) albom rejimida, qolgan barchasi portretda —
har biri haqiqiy binoga qarshi qayta generatsiya qilib, PDF'ni to'liq ochib ko'rish orqali
tasdiqlandi (kollizyasiz, o'qilishi oson).

Tekshirildi: `bun run --cwd apps/api type-check`, `bunx biome lint`, `bun run test
tests/services` (barcha 62/62 unit test — faqat `report.service.test.ts`/`report-data.
service.test.ts` emas, butun servis to'plami qayta ishga tushirildi ehtiyot uchun).

**Keyingi qadam**: `docs/report-redesign-proposal.md`ning §9 jadvalidagi qolgan bosqichlar
(til/i18n, 3-yillik guruhlangan grafik, specific-consumption jamlanma jadvali, auditor
izohlari, koordinatalar+xarita, QR-kod) navbat bilan davom etadi — har biri alohida
tekshirilgan+commit qilingan bosqich sifatida.

### 3-bosqich: Construction type izohini ulash (tugallandi)

`report-data.service.ts`ning `ConstructionTypeUValueBreakdown`iga `description: string | null`
qo'shildi (`getUValueBreakdown()` endi `constructionType.description`ni ham qaytaradi — ustun
o'zi allaqachon sxemada va frontendda bor edi, faqat hisobotga ulanmagan edi). `report.
service.ts`ning U-value bo'limida, har bir construction type sarlavhasidan keyin, `description`
mavjud bo'lsa yangi `layout.note()` (kursiv) orqali chiziladi. Haqiqiy binoga qarshi qayta
generatsiya qilib tekshirildi — auditor izohlari (masalan "Roof in contact with unheated
space...") endi har bir U-value bo'limi ostida kursiv matn sifatida chiroyli chiqadi.

### 4-bosqich: 3-yillik guruhlangan ustunli grafik (tugallandi)

Yangi `ReportLayout.groupedBarChart(categories, series)` metodi qo'shildi — platformaning o'z
`MonthlyComparisonChart`i (`consumption-comparison-chart.tsx`, `recharts`) bilan bir xil
tuzilishda: har bir oy ichida yil bo'yicha yonma-yon ustunlar, pastda yil-legend (rangli
belgi+son). Bitta seriyali `barChart()`dan farqli, har bir ustun ustida qiymat yorlig'i
chizilmaydi (12 oy × 3 yil = 36 ustun bo'lishi mumkin, o'qilishi mumkin bo'lmay qolardi) — buning
o'rniga setka+o'q yorliqlari va legend orqali o'qiladi. "Metered energy consumption history"
bo'limidagi eski bitta-seriyali (o'rtacha) `barChart()` chaqiruvi va unga tegishli oy×yil jadvali
olib tashlandi — yangi grafik xuddi shu ma'lumotni (har bir yil, har bir oy) to'liq ko'rsatadi,
jadval endi ortiqcha (`docs/report-redesign-proposal.md`ning grafik-jadval qoidasi).

Haqiqiy binoga qarshi qayta generatsiya qilib tasdiqlandi — gaz va elektr uchun ikkala grafik
ham platformadagi dashboard grafigiga o'xshash chiqdi (rang, guruhlash, legend).

**Ikkita ochiq savol loyiha egasiga berildi va ikkalasi ham tasdiqlandi:**
1. Qobiq/ventilyatsiya yo'qotish va sotib olingan energiya taqsimoti bo'limlari — **har ikkala
   stsenariy uchun ham donut** (before VA after) qo'shildi, jadvallar olib tashlandi. Endi har
   bir bo'lim ikkita donut ko'rsatadi (masalan "Before-renovation distribution" va
   "After-renovation distribution: residual loss once measures are applied") — ikkala ustun
   ham vizual ko'rsatiladi, jadval haqiqatan ortiqcha bo'lib qoladi.
2. Hisobot boshida yangi **"Executive summary — measures overview"** jadvali qo'shildi (Building
   bo'limidan keyin, Summary'dan oldin) — namunaviy hujjatning Table 1: har bir chora-tadbir
   uchun Investment, Payback (std./actual juftligi), CO2 (t/yr), Recommended (Ha/Yo'q). Bu
   hozirgi batafsil "Recommended measures" bo'limidan (hisobotning o'rtasida) mustaqil — undan
   oldin o'quvchi butun ro'yxatni bir qarashda ko'radi.

**Haqiqiy bug yana topildi va tuzatildi** (vizual tekshiruv orqali): yangi Table 1'da eng uzun
chora-tadbir nomi ("Installation of LED lighting and replacing of distribution system", 67
belgi) `Measure` ustuniga (220pt) sig'may, `Investment` qiymatiga yopishib chiqqan edi — xuddi
avvalgi bosqichdagi kabi bug'. Ustun kengligi 280pt'ga oshirildi (jami 660pt, albom rejimini
saqlab qolgan holda).

Tekshirildi: `bun run --cwd apps/api type-check`, `bunx biome lint`, `bun run test
tests/services` (62/62), haqiqiy Neon bazadagi bino bilan generatsiya qilingan PDF har bir
o'zgarishdan keyin vizual tekshirildi.

### 5-bosqich: Hisobot tili platforma tiliga moslashtirildi (tugallandi)

Yangi `apps/api/src/services/report-i18n.ts` — server-tomonidagi hisobot uchun mustaqil,
minimal `t(lang, key, vars?)`/`enumLabel(lang, rawValue)` lug'ati (uz/ru/en, ~90 kalit), frontend
`react-i18next` namespace'laridan ataylab alohida (Workers runtime'ida i18next instansiyasi yo'q).
Platformaning mavjud konventsiyasiga ergashib, fizik birliklarning o'zi ham tarjima qilinadi
(masalan "kWh" → "kVt·soat"/"кВт·ч"), shunchaki yorliqlar emas. `routes/audit.ts`ning
`GET /:id/audit/report`i endi `?lang=` query-parametrini o'qiydi (`isReportLang()` orqali
tekshirilib, yaroqsiz/yo'q bo'lsa `"en"`ga tushadi); `apps/web/src/lib/api.ts`ning `report()`i
so'rovga joriy `i18n.language`ni qo'shadi — hisobot doim platforma qaysi tilda ko'rsatilayotgan
bo'lsa, o'sha tilda generatsiya qilinadi.

**Haqiqiy arxitektura to'sig'i topildi va hal qilindi**: pdf-lib'ning `StandardFonts.TimesRoman`i
faqat WinAnsi (Lotin) kodировкани qo'llab-quvvatlaydi — birinchi rus harfida
(`Error: WinAnsi cannot encode "О"`) yiqildi. Yechim: `@pdf-lib/fontkit` + SIL OFL litsenziyali
**PT Serif** shrifti (`doc.registerFontkit(fontkit)` + `doc.embedFont(base64, {...})`) —
regular/bold/italic har biri `apps/api/src/assets/fonts/pt-serif-*.ts`da base64 satr sifatida
saqlanadi (Wrangler/Vitest ikkalasida ham binary-asset-loader konfiguratsiyasisiz ishlaydi).

**Ikkita qo'shimcha haqiqiy bug topildi va tuzatildi** (faqat vizual tekshiruv orqali, ikkalasi
ham type-check/lint/unit-testlardan o'tgan edi):
1. **Shrift subsetting'dagi glif buzilishi** — `embedFont(..., { subset: true })` bilan rus
   PDF'ining render qilingan tasvirlarida ba'zi harflar (ayniqsa kichik, regular-vazndagi matn)
   uzilgan/ustma-ust tushgan holda chiqardi, garchi PDF'dan chiqarilgan xom matn to'g'ri bo'lsa
   ham. `subset: false`ga o'tkazish (to'liq shriftni ichiga joylash) muammoni butunlay hal qildi —
   fayl hajmi oshdi (~142KB → ~427KB har bir til uchun), bu bir martalik yuklab olinadigan
   hisobot uchun arzimas narx.
2. **Jadval sarlavhalari uzun tarjimalarda qo'shni ustunga yopishib chiqishi** — `table()`
   metodi `columnWidths`ni faqat inglizcha sarlavha uzunligiga qarab tekshirar edi (`needsLandscape`
   hisob-kitobi), lekin haqiqiy sarlavha matnining o'zi (masalan
   "Issiqlik o'tkazuvchanligi (Vt/mK)" — inglizcha "Thermal conductivity (W/mK)"dan uzunroq)
   ustun kengligidan oshib ketganda, keyingi ustun sarlavhasiga bo'shliqsiz yopishib qolar edi
   (masalan "QatlamMaterial", "Qoplash muddat(NPV(yil)"). Tuzatish: har bir ustun kengligi endi
   `this.bold.widthOfTextAtSize(headers[i], 10)` orqali haqiqiy render qilingan sarlavha
   kengligiga nisbatan dinamik kengaytiriladi (`effectiveWidths`) — bu har bir til uchun alohida
   ustun-kenglik sozlashga hojat qoldirmaydi, o'zi moslashadi. Muhim: bu tuzatish faqat uz/ru
   render'ida ko'rindi, chunki barcha oldingi qo'lda-sozlash inglizcha matn uzunligiga qarab
   qilingan edi — yana bir bor "faqat inglizcha bilan tekshirish yetarli emas" isboti.

Tekshirildi: `bun run --cwd apps/api type-check`, `bun run --cwd apps/web type-check` (haqiqiy
Vite build), `bunx biome lint` (barcha tegilgan fayllar), `bun run test tests/services` (64/64,
jumladan yangi `it.each(["ru", "uz"])` render testlari), va uchala tilda (en/ru/uz) haqiqiy Neon
bazadagi "3-DMTT" binosiga qarshi PDF generatsiya qilib, har bir sahifani vizual tekshirish —
ikkala bug (shrift buzilishi va sarlavha kolliziyasi) tuzatilgandan keyin barcha 40+ sahifa uchta
tilda ham toza chiqdi.

**Keyingi qadam**: `docs/report-redesign-proposal.md`ning §9 jadvalidagi qolgan bosqichlar
(specific-consumption jamlanma jadvali, auditor izohlari, koordinatalar+xarita, QR-kod) navbat
bilan davom etadi.

### 6-bosqich: Specific-consumption jamlanma jadvali (tugallandi)

Manba Excel'ning `Breakdown Baseline & Balance` varag'i 28-31 qatorlari (`docs/3-DMTT v5.xlsx`,
`openpyxl` bilan to'g'ridan-to'g'ri ochib formulalar tekshirildi) klassik 3-ustunli energiya-audit
solishtiruv jadvali: issitish/ISI/elektr har biri uchun haqiqiy (hisob-fakturadan) vs
standartlashtirilgan-oldin vs standartlashtirilgan-keyin, kVt·soat/m²/yil birligida. Bu
`AuditResult`da umuman yo'q edi.

**Muhim qaror — manba Excel'ning o'ziga xos formulasidan chetlanish**: manba jadval haqiqiy
qiymatini `Consumption!M19` (gaz) ni to'g'ridan-to'g'ri "issitish"ga va `Consumption!M55`
("Energie Termică"/markazlashgan issiqlik) ni "ISI"ga qattiq bog'lagan — bu faqat o'sha bitta
loyihaning tashuvchi tarkibiga (issitish=gaz, ISI=markazlashgan issiqlik) mos, umumlashtirilmaydi.
Platformaning o'z modeli har qanday tashuvchi kombinatsiyasini qo'llab-quvvatlagani uchun, buning
o'rniga: yangi `SpecificConsumptionRow` (`packages/types/src/audit.ts`) har bir "oldin"
generatsiya manbai o'zining **o'z tashuvchisi** kalibrlash nisbati (`baselineRatioByCarrier`,
allaqachon `EnergyMeasureResult.actual`da ishlatiladigan mexanizm) bilan hisoblanadi — aralash
tashuvchili bino (masalan gaz bilan isitish + elektr ISI) har bir foydalanish turini o'zi
ishlatgan tashuvchiga nisbatan to'g'ri kalibrlaydi, manba jadvalning bitta-loyihaga xos
taxminini takrorlamaydi. Standartlashtirilgan oldin/keyin qiymatlar to'g'ridan-to'g'ri
`finalEnergyByEndUse` (issitish/ISI) va `lighting`+`equipment`+`cooling` yig'indisi (elektr)dan
olinadi, `heatedFloorAreaM2`ga bo'linadi.

`report.service.ts`ga yangi jadval qo'shildi ("Final energy by end-use" jadvalidan keyin,
jadval-faqat — `docs/report-redesign-proposal.md`ning §6/§4b istisnosi, chunki bu aniq sonli
solishtirish, vizual taqsimot emas), `report-i18n.ts`ga uch tilda (`thActualBills`,
`thStandardizedBefore`, `thStandardizedAfter`, `headingSpecificConsumptionSummary`) qo'shildi.

**Haqiqiy bug topildi va tuzatildi** (faqat vizual tekshiruv orqali — haqiqiy Neon bazadagi
"3-DMTT" binosiga qarshi PDF generatsiya qilib, uchala tilni sahifa-sahifa ochib ko'rish orqali,
`ReportLayout.heading()`ning o'zi hech qanday kenglik tekshiruvi/o'rash qilmasligi sababli):
rus tilidagi uzun sarlavha matni ("Сводка удельного потребления (кВт·ч/м²/год — фактическое и
стандартизированное)") sahifaning o'ng chetidan tashqariga chiqib ketgan edi — bu `table()`da
Phase 5'da tuzatilgan sarlavha-kolliziya bugiga o'xshash, lekin `heading()` uchun. Kenglikni
tekshiradigan umumiy mexanizm qo'shish o'rniga (boshqa hech qanday sarlavha hozircha bunchalik
uzun emas), sarlavha matni qisqartirildi ("Specific consumption summary"/"Сводка удельного
потребления"/"Solishtirma iste'mol jamlanmasi") va birlik+tavsif alohida `paragraph()` qatoriga
ko'chirildi (boshqa bo'limlarda sarlavha ostida tushuntiruvchi paragraf bo'lish andozasiga mos).

Vizual tekshiruvda yana aniqlandi (bug emas): jadval sarlavhalar matni tufayli albom (landscape)
rejimga o'tganda, undan oldingi sarlavha ba'zan portret sahifaning deyarli bo'sh pastki qismida
"yolg'iz" qolib ketadi (jadvalning o'zi keyingi albom sahifada boshlanadi) — bu allaqachon
"Generation & distribution efficiency" jadvali uchun ham mavjud, oldindan qabul qilingan naqsh
ekan (`heading()` faqat o'zining balandligi uchun joy tekshiradi, undan keyin keladigan
jadval/albom-almashtirish uchun emas) — yangi kod bilan bog'liq regressiya emas, tuzatilmadi.

Tekshirildi: `bun run --cwd apps/api type-check`, `bun run --cwd apps/web type-check` (Vite
build), `bunx biome lint` (tegilgan fayllar), `bun run --cwd apps/api test tests/services`
(64/64 — jumladan uch tilning barchasida "throwing"siz render testlari). Haqiqiy Neon bazadagi
"3-DMTT" binosiga qarshi (`apps/api`ning `runFullAudit`/`generateAuditReportPdf`ini to'g'ridan-
to'g'ri chaqiradigan bir martalik scratch skript bilan, HTTP autentifikatsiyasiz — skript
tekshiruvdan keyin o'chirildi) uchala tilda PDF generatsiya qilinib, `pymupdf` bilan sahifalar
rasmga aylantirilib vizual tekshirildi (heading-overflow bugi tuzatilgandan keyin barcha uchala
til toza chiqdi). Commit qilindi.

**Keyingi qadam**: §9 jadvalidagi qolgan bosqichlar — auditor izohlari (yangi sxema kerak),
koordinatalar+xarita (yangi ustunlar+tashqi API), QR-kod+tekshiruv sahifasi (yangi route+
kutubxona).

### 7-bosqich: Auditor izohlari (tugallandi)

`docs/report-redesign-proposal.md`ning §5b'sida belgilangan variant (A) amalga oshirildi:
yangi `report_annotation` jadvali (`packages/db/src/schemas/report-annotations.ts`, migratsiya
`0006_workable_zaladane`) — `(buildingId, sectionKey)` bo'yicha unique, `auditRun`ga emas
**binoga** bog'langan (natija hech qachon saqlanmagani uchun — `calculation-engine.md`).
`sectionKey` ataylab enum/FK emas, oddiy matn ustuni (`EnergyBalanceRow.category` bilan bir xil
andoza) — barqaror kalitlar to'plami (`consumption_gas`/`consumption_electricity`/
`consumption_district_heat`/`consumption_coal`/`envelope_ventilation_loss`/`final_energy`/
`renewable_offset`) `packages/db`ga bog'liq bo'lmasligi uchun `packages/types`da
(`REPORT_ANNOTATION_SECTION_KEYS`) saqlanadi, frontend ham backend ham shu yerdan oladi.

**Backend**: `GET`/`PUT /api/buildings/:id/audit/annotations(/:sectionKey)` (`routes/audit.ts`)
— bo'sh izoh qatorni saqlash o'rniga o'chiradi ("izoh yo'q" va "izoh tozalandi" bir xil holatga
tushishi uchun). `report-data.service.ts`ning yangi `getReportAnnotations()`i bilan
`/audit/report` route'iga ulandi — `ReportExtras.annotations` orqali `report.service.ts`ning
iste'mol-tarixi (har bir tashuvchi grafigidan keyin), qobiq-yo'qotish va yakuniy-energiya
donut-juftlari (har biri bitta izoh, oldin/keyin ikkalasiga ham tegishli) ostida kursiv
(`layout.note()`) chizadi.

**Frontend**: qayta ishlatiladigan `AuditorNote` komponenti (`components/auditor-note.tsx`) —
`useReportAnnotations`/`useUpsertReportAnnotation` (React Query, bir xil `buildingId` uchun
keshni ulashadi, necha nusxada render bo'lmasin bitta so'rov) orqali ishlaydi. Uch holat: izoh
yo'q → "Izoh qo'shish" tugmasi; izoh bor, tahrirlanmayotgan → kursiv matn (bosilsa tahrirlash
rejimiga o'tadi); tahrirlash rejimi → `Textarea` + Saqlash/Bekor qilish. `consumption-tab.tsx`ga
(har bir tashuvchi diagrammasi ostida, `MonthlyComparisonChart`ning yangi `footer` prop'i orqali)
va `results.tsx`ga (har bir energiya-balans bo'limi jadvali ostida) ulandi. `common.json`ga uch
tilda yangi kalitlar qo'shildi (`auditorNote`/`auditorNotePlaceholder`/`addNote`).

## Joriy sessiya: tezlik/masshtablanish tuzatishlari (5 bosqich)

Loyiha egasi platformaning sekinlashayotganini va Neon bazaning yirik platforma uchun
yetarliligini so'radi. 3 ta Explore agent bilan tekshiruv shuni ko'rsatdi: Neon'ning o'zi
cheklov emas (hajm/jadval soni bo'yicha masshtabga mos), muammo besh aniq joyda — yo'q
indekslar, `runFullAudit()`ning ~20 ketma-ket DB so'rovi, `chat.ts`dagi haqiqiy N+1,
dashboard/buildings'ning to'liq client-side pagination'i, va ma'lumotnoma jadvallarida
keshning yo'qligi. To'liq reja `EnterPlanMode` orqali tuzilib tasdiqlandi (5 mustaqil
bosqich, har biri alohida commit qilinadi).

### 1-bosqich: Yo'q indekslarni qo'shish (tugallandi)

`packages/db/src/schemas/buildings.ts` (`building`), `audits.ts` (`auditRun`),
`collaboration.ts` (`buildingMember`) — uchalasi ham mavjud `index()` andozasiga
(`chat.ts`dagi `message_conversation_created_at_idx`) ko'ra 3-argumentli `pgTable`
shakliga o'tkazildi:
- `building_user_id_idx` — `building.userId` (buildings ro'yxati route'ining eng ko'p
  ishlatiladigan filtri, hech qanday indeks bo'lmagan).
- `audit_run_building_id_idx` — `auditRun.buildingId` (audit tarixi so'rovlarida
  filtrlanadi, umuman indeks yo'q edi).
- `building_member_user_id_idx` — `buildingMember.userId` (mavjud
  `unique(buildingId, userId)`ning faqat ikkinchi ustuni bo'lgani uchun yakka `userId`
  qidiruvi buni samarali ishlata olmasdi).

Migratsiya `packages/db/drizzle/0008_rare_roxanne_simpson.sql` generatsiya qilindi
(`DATABASE_URL` haqiqiy ulanishsiz, faqat o'rnatilgan holda — `database.md`ga ko'ra) va
uchta `CREATE INDEX` bayonotidan iborat ekani qo'lda tasdiqlandi. Tekshirildi:
`bun run --cwd packages/db type-check`, `bunx biome check --write` (formatlash avtomatik
tuzatildi). **Haqiqiy bazaga qo'llash bu sessiyada qilinmadi** — sandbox'da na lokal
Postgres, na haqiqiy Neon `DATABASE_URL` bor; migratsiyani production'ga qo'llash
foydalanuvchi tomonidan deploy vaqtida amalga oshirilishi kerak.

### 2-bosqich: `runFullAudit()` so'rovlarini parallellashtirish (tugallandi)

`apps/api/src/services/audit.engine.ts` — tahlil 20 ta DB so'rovning hech biri boshqasining
natijasiga bog'liq emasligini tasdiqladi (hammasi faqat boshlang'ich `buildingId`ga yoki 4 ta
global ma'lumotnoma jadvaliga bog'liq, shartli so'rov yo'q). Ikkita `Promise.all` guruhi
qo'shildi:
- Funksiya boshida 16 ta so'rov (bino yozuvi + qobiq/ventilyatsiya/sovutish/DHW/taqsimot/
  generatsiya/yoritish/uskuna/qayta-tiklanadigan manba jadvallari + 4 ta ma'lumotnoma jadvali)
  bitta batch'ga birlashtirildi — bularning barchasi scenario tsiklidan (sof hisoblash, DB
  so'rovsiz) oldin joylashgan edi.
- `utilityBill`/`energyMeasure`/`nonEeMeasure`/`energyTariff` (funksiya oxiriga yaqin,
  moliyaviy hisob-kitoblardan oldin) ikkinchi batch'ga birlashtirildi.

Formulalarga tegilmadi — faqat so'rov bajarilish tartibi (ketma-ket `await` → `Promise.all`)
o'zgardi, o'zgaruvchi nomlari va keyingi ishlatilish joylari aynan saqlandi. Tekshirildi:
`bun run --cwd apps/api type-check`, `bun run --cwd apps/api test tests/services` (64/64 o'tdi,
jumladan `report.service.test.ts`ning `generateAuditReportPdf` orqali `runFullAudit()`ni
to'liq chaqiradigan 5 testi — natija o'zgarmagani tasdiqlandi), `bunx biome check --write`.
Integratsiya testi (`tests/integration/`) bu sandbox'da lokal Postgres yo'qligi sababli
ishlamaydi (kutilgan holat, `testing-and-verification.md`).

### 3-bosqich: `chat.ts`dagi N+1'ni tuzatish (tugallandi)

`apps/api/src/routes/chat.ts`ning `GET /conversations`i har suhbat uchun 2 ta qo'shimcha
so'rov qilardi (oxirgi xabar + o'qilmagan son) — 2N+1. `buildings.ts`dagi
`collaboratorCount`ning `inArray`+`groupBy` naqshi ko'chirilib, 3 ta so'rovga tushirildi
(suhbatdoshlik + 2 ta batched so'rov, `Promise.all`ga birlashtirilgan):
- Oxirgi xabar — `db.selectDistinctOn([message.conversationId], {...})` (Postgres'ning
  `DISTINCT ON` naqshi, har suhbat uchun bitta eng so'nggi qatorni tanlaydi).
- O'qilmagan son — `message`ni `conversationMember`ga (joriy foydalanuvchining o'ziga)
  `innerJoin` qilib, har suhbatning o'z `lastReadAt`i bilan solishtiriladi, `groupBy` bilan
  `count()`. Bu avvalgi kod xotiradagi `membership.lastReadAt`ni ishlatgan bo'lsa, endi join
  orqali xuddi shu solishtirishni bitta SQL so'rovda amalga oshiradi.

Javob formati o'zgarmadi. Tekshirildi: `bun run --cwd apps/api type-check`, `bunx biome check
--write`. Bu route'ning maxsus unit testi yo'q (integratsiya testi orqali tekshiriladi, u bu
sandbox'da lokal Postgres yo'qligi sababli ishlamaydi) — shuning uchun bu yerda faqat
tip-tekshiruv va qo'lda kod ko'rib chiqish bilan cheklandi, haqiqiy chat oqimini brauzerda
tekshirish tavsiya etiladi.

### 4-bosqich: Buildings/dashboard uchun to'liq server-side pagination (tugallandi)

Foydalanuvchi ikkita variantdan (chegarani oshirish vs to'liq server-side pagination) **B**ni
tanladi. `dashboard.md`da hujjatlashtirilgan "real ko'p-bino stsenariysi paydo bo'lguncha"
degan cheklov endi hal qilindi.

**Backend** (`apps/api/src/routes/buildings.ts`, `apps/api/src/schemas/building.ts`):
- `GET /api/buildings` endi `search` (ism/joylashuv, `ilike`), `type`, `status`, `region`
  (aniq moslik) filtrlarini qabul qiladi, va javobga hozirgача umuman yo'q bo'lgan `total`
  maydonini qo'shadi (sahifalash UI'si uchun shart).
- Yangi `GET /api/buildings/locations` — foydalanuvchiga accessible barcha binolarning
  distinct `location` qiymatlari, sahifalanmagan (hudud dropdown'i uchun — joriy sahifadagi
  emas, hammasi).
- Yangi `GET /api/buildings/stats` — `search`/`type`/`status` filtrlari bilan (`region`siz —
  hudud grafigi butun filtrlangan to'plam bo'yicha kerak, tanlangan bitta hudud emas):
  `totalCount`, `totalFloorAreaM2` (SUM), `byRegion` (GROUP BY) — bitta so'rovda, dashboard
  metrikalari va hudud grafigi shu yerdan.
- Access-shart (`or(eq(building.userId,...), inArray(...))`) va filtr shartlari
  `accessibleBuildingsCondition()`/`buildingFilterConditions()` yordamchi funksiyalariga
  chiqarildi (3 endpoint orasida takrorlanmasin deb).

**Frontend** (`apps/web/src/lib/api.ts`, `hooks/use-buildings.ts`, yangi
`hooks/use-debounced-value.ts` va `components/pagination.tsx`, `dashboard.tsx`,
`buildings/index.tsx`):
- `dashboard.tsx`/`buildings/index.tsx`dagi `useMemo`-asoslangan client-side filtrlash butunlay
  olib tashlandi — qidiruv/tur/status/hudud state'lari endi to'g'ridan-to'g'ri
  `useBuildings({ page, pageSize: 20, search, type, status, region })`ga uzatiladi (TanStack
  Query `queryKey`ga kirgani uchun filtr o'zgarganda avtomatik qayta so'raydi). Qidiruv matni
  `useDebouncedValue` (400ms) bilan debounce qilinadi — `ui-guidelines.md`ning yuqori-chastotali
  hodisa qoidasiga ko'ra, har harfda so'rov yubormaslik uchun.
- Filtr o'zgarganda sahifa avtomatik 1-ga qaytariladi (`useEffect`, `biome-ignore
  useExhaustiveDependencies` — repo'da allaqachon bir necha joyda ishlatilgan naqsh).
- Yangi `useBuildingLocations()`/`useBuildingStats()` hook'lari, va oddiy `Pagination`
  komponenti (`@yres/ui`da tayyor komponent yo'q edi — oldingi/keyingi tugma + "N-sahifa,
  jami M", `common.json`ga uch tilda yangi `pagination.*` kalitlari bilan).
- "Binolar umuman yo'q" (bo'sh akkaunt) va "filtr natijasi yo'q" holatlari endi
  `hasFilters`/`total === 0` orqali ajratiladi (avval `buildings.length === 0`ga tayangan edi,
  bu endi noto'g'ri bo'lardi — `buildings` allaqachon sahifalangan/filtrlangan natija).

Tekshirildi: `bun run --cwd apps/api type-check`, `bun run --cwd apps/web type-check` (haqiqiy
Vite build), `bunx biome check --write` (barcha tegilgan fayllar). **Brauzerda vizual
tekshirilmadi** — bu sandbox'da haqiqiy baza yo'q (`testing-and-verification.md`dagi mock-API +
Preview MCP protsedurasi orqali tekshirish tavsiya etiladi, lekin bu sessiyada bajarilmadi).

### 5-bosqich: Ma'lumotnoma endpoint'lariga Cache API (tugallandi)

Foydalanuvchi ikkita variantdan (Cache API vs KV Namespace) **Cache API**ni tanladi — hech
qanday yangi Cloudflare resursi provisioning kerak emas, `wrangler.toml`ga tegilmaydi.

Yangi `apps/api/src/lib/http-cache.ts`ning `withEdgeCache(c, ttlSeconds, fetchData)`i —
Workers'ning `caches.default`idan so'rov URL'i bo'yicha kalitlangan holda foydalanadi, kesh
topilmasa `fetchData()`ni chaqirib natijani `c.executionCtx.waitUntil(cache.put(...))` orqali
javobni bloklamasdan keshlaydi. **Faqat foydalanuvchiga xos bo'lmagan** (barcha
foydalanuvchilar uchun bir xil) endpoint'larga qo'llanildi:
- `apps/api/src/routes/reference.ts` — `/materials`, `/lamp-types`, `/surface-resistance`
  (uch tasi ham, 1 soatlik TTL).
- `apps/api/src/routes/climate.ts`ning `GET /regions`i (kesh kaliti query-string'ni ham
  o'z ichiga oladi, shuning uchun har xil page/pageSize alohida keshlanadi).

`energyTariff` (audit.engine.ts ichida ishlatiladigan, alohida HTTP endpoint emas) bu
bosqichga kiritilmadi — rejada aytilganidek, uning tezligi Bosqich 2'dagi
parallellashtirish orqali allaqachon hal qilingan, Cache API so'rov-asoslangan bo'lgani
uchun unga mos kelmaydi.

Tekshirildi: `bun run --cwd apps/api type-check`, `bunx biome check --write`,
`bun run --cwd apps/api test tests/services` (64/64). Cache API'ning haqiqatan keshlanishi
faqat `wrangler dev`/deploy'dan keyin qo'lda tekshiriladi (bu sessiyada bajarilmadi —
`realtime.md`dagi Miniflare eslatmasiga o'xshab, bu ham brauzer/wrangler dev serveriga
ulanishni talab qiladi).

**5 bosqichning barchasi tugallandi.** Har biri alohida commit qilindi
(`git log --oneline`da ko'rinadi). Haqiqiy bazaga qarshi tekshirilmagan narsalar: Bosqich 1
migratsiyasini production'ga qo'llash, Bosqich 3/4/5'ning brauzerda vizual tasdiqlanishi —
bularning barchasi ushbu sandbox cheklovlari tufayli (`database.md`/`testing-and-verification.md`).

**Haqiqiy tekshiruv**: lokal `.dev.vars` Neon bazasida `0006` migratsiyasi hali qo'llanilmagan
edi — `database.md`dagi qo'lda-qo'llash tartibi (`pg` Client, non-pooler host, tranzaksiya,
`drizzle.__drizzle_migrations`ga hash+timestamp yozish) bilan qo'llandi. Keyin **haqiqiy
brauzerda** (Claude Chrome kengaytmasi, mavjud sessiya) "3-DMTT" binosiga qarshi to'liq oqim
sinaldi: Iste'mol tab'ida gaz grafigига izoh qo'shildi/tahrirlandi/o'chirildi (network so'rovlar
va API log orqali `PUT`/`GET .../audit/annotations`ning 200 qaytarganiga ishonch hosil qilindi),
Natijalar sahifasida "final_energy" bo'limiga izoh qo'shildi, so'ng "Hisobotni yuklab olish"
tugmasi orqali haqiqiy PDF generatsiya qilinib (`pymupdf` bilan sahifalar rasmga aylantirilib)
ikkala izoh ham to'g'ri joyda (mos grafik/jadvaldan keyin, kursiv) chiqqani vizual tasdiqlandi.
Test uchun qo'shilgan ikkala izoh keyin UI orqali tozalandi (bino ma'lumotida sun'iy test matni
qolib ketmasligi uchun).

Tekshirildi: `bun run type-check` (barcha workspace), `bun run --cwd apps/web build`, `bunx biome
lint` (tegilgan fayllar), `bun run --cwd apps/api test tests/services` (64/64,
`fullExtrasFixture()`ga ikkita namunaviy izoh qo'shilgan holda). Ishga tushirilgan lokal dev
server'lar (API 3000, web 5173) tekshiruv oxirida to'xtatildi.

**Keyingi qadam**: §9 jadvalidagi qolgan ikkita bosqich — koordinatalar+xarita (yangi
ustunlar+tashqi statik-xarita API, provayder tanlovi kutilmoqda), QR-kod+tekshiruv sahifasi
(yangi public route+kutubxona).

### 8-bosqich: Bino koordinatalari va xarita (kod tayyor, API kalit kutilmoqda)

Provayder sifatida loyiha egasi **Yandex Static Maps**ni tanladi. API kalit hali yo'q —
loyiha egasi bilan kelishilgan holda avval kod tayyorlandi (`developer.tech.yandex.ru`dan
kalit olish alohida, foydalanuvchining o'zi bajaradigan qadam — akkaunt ro'yxatdan
o'tkazish Claude tomonidan bajarilmaydigan amal).

**Sxema**: `building`ga ikkita ixtiyoriy ustun — `latitude`/`longitude` (`numeric`, nullable),
migratsiya `0007_stale_paper_doll`. `location`ning o'zi (erkin-matn hudud, `dashboard.md`) bilan
almashtirilmaydi, faqat qo'shimcha.

**Backend**: `apps/api/src/schemas/building.ts`ga range-validatsiya (-90..90 / -180..180,
ikkalasi ham ixtiyoriy). `report.service.ts`ga: (1) `formatCoordinates()` — "41.2995° N, 69.2401°
E" uslubida (belgidan yarim-shar harfiga), (2) `fetchYandexStaticMapPng()` — Yandex Static Maps
API'dan PNG olib keladi, **har qanday xatoda (kalit yo'q/tarmoq xatosi/kalit noto'g'ri) `null`
qaytaradi** — hisobotning matn-qismi (koordinatalar) hech qachon xarita rasmiga bog'liq
bo'lmaydi (`notify.ts`ning bildirishnoma-xatosini yutish qoidasiga o'xshash fire-and-forget
uslubi). Yangi `ReportLayout.image()` metodi (PNG'ni o'lchamga moslab `embedPng`+`drawImage`
orqali chizadi). Bino bo'limining **eng boshida** (sarlavhadan keyin, key-value jadvaldan oldin)
chiziladi. `generateAuditReportPdf()`ning yangi ixtiyoriy 5-parametri
(`yandexStaticMapsApiKey?`) `routes/audit.ts`dan `c.env.YANDEX_STATIC_MAPS_API_KEY`ni uzatadi —
`Env` interfeysiga, `wrangler.toml`ning sirlar izohiga, `.dev.vars.example`ga,
`docs/deployment.md`/`.claude/rules/deployment.md`ga qo'shildi (hozircha bo'sh — xarita rasmi
o'tkazib yuboriladi, koordinatalar matni qoladi).

**Frontend**: `building-form-fields.tsx`ga "Kenglik (latitude)"/"Uzunlik (longitude)" sonli
kirish maydonlari (qo'lda kiritish — xarita-tanlagich emas, sodda variant tanlandi) + diapazon
validatsiyasi (`fieldOutOfRange` xato xabari), `overview-tab.tsx`ga "Koordinatalar" maydoni
(faqat ikkalasi ham to'ldirilgan bo'lsa ko'rinadi). Uch tilda (`buildings.json`) yangi kalitlar.

**Haqiqiy tekshiruv**: migratsiya lokal `.dev.vars` bazasiga qo'lda qo'llandi (`database.md`
tartibi). Haqiqiy brauzerda "3-DMTT" binosiga sinov koordinatalari (41.3111, 69.2797 — Toshkent
markazi) kiritilib saqlandi, Umumiy tab'da "Koordinatalar: 41.3111°, 69.2797°" to'g'ri ko'rindi,
so'ng haqiqiy PDF yuklab olinib (`pymupdf` bilan) bino bo'limining eng boshida "Koordinatalar:
41.3111° N, 69.2797° E" matni to'g'ri joyda chiqqani va — API kalit hali sozlanmagani uchun —
xarita rasmisiz, sahifa buzilmasdan chiroyli render bo'lgani vizual tasdiqlandi (aynan
kutilgan gracious-degradation xatti-harakati). Test uchun kiritilgan koordinatalar so'ngra UI
orqali tozalandi (bu bino uchun haqiqiy manzil tasdiqlanmagani uchun).

**Yon voqea**: tekshiruv paytida Claude Chrome kengaytmasi vaqtincha uzilib qoldi (tarmoq
uzilishi) — foydalanuvchi tiklagandan keyin davom etildi, hech qanday ma'lumot yo'qolmadi
(edit dialogidagi kiritilgan qiymatlar saqlanib qolgan edi).

Tekshirildi: `bun run type-check` (barcha workspace), `bun run --cwd apps/web build`, `bunx
biome lint` (tegilgan fayllar), `bun run --cwd apps/api test tests/services` (64/64,
`buildingFixture()`ga Toshkent koordinatalari qo'shilgan holda).

**Keyingi qadam**: loyiha egasi Yandex Developer Console'dan Static API kalitini olgach,
`.dev.vars`/`wrangler secret put YANDEX_STATIC_MAPS_API_KEY`ga qo'shadi — shundan so'ng
`fetchYandexStaticMapPng()`ning haqiqiy URL formati (`static-maps.yandex.ru/v1?...`, hozircha
tasdiqlanmagan taxmin) haqiqiy kalit bilan birga tekshirilishi kerak (agar Yandex boshqacha
javob qaytarsa, URL parametrlarini moslashtirish kerak bo'lishi mumkin). Shundan keyin §9'ning
oxirgi bosqichi — QR-kod+tekshiruv sahifasi (yangi public route+kutubxona) qoladi.

### Yandex Static Maps kaliti olindi, lekin hozircha 503 bilan ishlamayapti

Loyiha egasi Yandex Developer Dashboard'da haqiqiy Static API kalitini yaratdi
(`developer.tech.yandex.ru`, "Connect APIs" oynasidan "Static API" tanlab) — Claude Chrome
kengaytmasi orqali navigatsiya qilib ko'rsatildi, lekin ro'yxatdan o'tish/kalit yaratishning
o'zi loyiha egasi tomonidan bajarildi (akkaunt/kredentsial amallarini Claude bajarmaydi).
Kalit `apps/api/.dev.vars`ga qo'shildi va Yandex dashboard'ida "Static API"ga to'g'ri
bog'langani tasdiqlandi ("Keys" sahifasida ko'rindi).

Ammo haqiqiy so'rov (`static-maps.yandex.ru/v1` ham, eskirgan `1.x` ham) izchil **503 Service
Unavailable** qaytarmoqda — bu sandbox'ning tarmog'idan (`curl`) boshida `403 Invalid api key`
edi, keyin haqiqiy brauzerdan (foydalanuvchining tarmog'i) qayta tekshirilganda **503**ga
o'zgardi, va bu Moskva markazi kabi oddiy test-koordinata bilan ham takrorlandi — demak muammo
parametr formatida emas. Yandex dashboard'ida "daily free limit... 100 requests... choose a
paid plan" degan banner ko'rindi, bu balki bepul reja endi billing bog'lashni talab qilishini
anglatishi mumkin, lekin bu tasdiqlanmagan taxmin.

Loyiha egasi bilan kelishilgan holda **hozircha to'xtatildi** — keyinroq qaytariladi, agar
ishlamasa boshqa provayderga (masalan OpenStreetMap-asoslangan bepul statik-xarita xizmati)
o'tish ko'rib chiqiladi. Kod tomondan hech narsa o'zgartirilishi shart emas —
`fetchYandexStaticMapPng()` allaqachon har qanday xatoda (403/503/tarmoq xatosi) `null`
qaytarib, matn-fallback bilan ishlaydi, shuning uchun bu holat hisobot generatsiyasini
buzmaydi.

**Yangilanish — endi to'liq ishlayapti**: bir necha soatdan keyin (503'ning propagatsiya/
akkaunt-faollashish muddati tugagach bo'lsa kerak) xuddi shu kalit bilan qayta tekshirilganda
`curl` to'g'ridan-to'g'ri `200 OK` va haqiqiy PNG qaytardi (`static-maps.yandex.ru/v1?ll=...`,
kod ichida ishlatilgan URL formati **to'g'ri ekanligi tasdiqlandi**, hech qanday o'zgarish
kerak bo'lmadi). Haqiqiy "3-DMTT" binosiga sinov koordinatalari (41.3111, 69.2797 — Toshkent,
Amir Temur maydoni) qayta kiritilib, haqiqiy PDF hisobot generatsiya qilindi: bino bo'limining
eng boshida koordinatalar matni + **haqiqiy Yandex xarita rasmi** (marker bilan, to'g'ri
joylashuvda) muvaffaqiyatli chiqdi, sahifa buzilmadi. Test koordinatalari so'ngra UI orqali
tozalandi. `docs/report-redesign-proposal.md`ning §7 (koordinatalar+xarita) bosqichi endi
**to'liq, haqiqiy provayder bilan tasdiqlangan holda** yakunlandi.

### 9-bosqich: QR-kod + tekshiruv sahifasi (tugallandi)

`docs/report-redesign-proposal.md`ning §9'idagi oxirgi bosqich. Kutilganidan kichikroq chiqdi —
`auditRun` jadvalida allaqachon kerakli maydonlar bor edi (`id`, `buildingId`, `status`,
`completedAt`), yangi ustun kerak bo'lmadi.

**Backend**: yangi `apps/api/src/routes/verify.ts` — `GET /api/verify/:auditRunId`, **ataylab
`authMiddleware`siz** (`climate.ts`/`reference.ts`dagi public-route andozasiga o'xshab, lekin
ular ham aslida auth talab qiladi — bu birinchi haqiqatan public route). Faqat xavfsiz
maydonlarni qaytaradi: `valid`, `buildingName`, `completedAt` — joylashuv/moliyaviy/texnik
tafsilot yo'q, chunki `auditRunId` UUID bo'lsa ham bu route access-control emas, shunchaki
"taxmin qilib bo'lmaydigan URL" xavfsizlik modeli. Topilmasa yoki `status !== "completed"`
bo'lsa `404 {valid:false}`.

`qrcode-generator` npm paketi qo'shildi (sof JS, Buffer/canvas'ga bog'liq emas — Workers-mos
ehtimoli yuqori, `report-redesign-proposal.md`ning o'z tavsiyasi). `ReportLayout`ga yangi
`qrCode()` metodi — QR matritsasining har bir "qorong'i" katagini `drawRectangle()` bilan
chizadi, tashqi rasm kutubxonasi shart emas. `generateAuditReportPdf()`ning yangi ixtiyoriy
6-parametri (`verifyUrl?`) — muqova sahifasida QR kod + "Ushbu hisobot YRES platformasida
yaratilgan" matni + tekshiruv URL manzili matn sifatida ham chiziladi (skanerlay olmaydiganlar
uchun zaxira). `routes/audit.ts` buni `${WEB_URL}/verify/${latestCompleted.id}`dan quradi.

**Frontend**: yangi public route `apps/web/src/routes/verify.$auditRunId.tsx` (`_authenticated`
tashqarisida, `login.tsx`/`forgot-password.tsx` andozasida — auth talab qilmaydi), yangi
`verify` i18n namespace (uch tilda), `useVerifyAuditRun()` hook'i (`use-audit.ts`, 404'ni
maxsus "tasdiqlanmadi" holati sifatida ushlaydi, boshqa xatolarda qayta uradi — mavjud
`useAuditStatus`/`useAuditResults` andozasiga mos).

**Haqiqiy bug topildi va tuzatildi** (haqiqiy PDF generatsiya qilib, vizual tekshirish orqali):
tekshiruv URL matni ("Haqiqiyligini tekshirish uchun ... http://localhost:5173/verify/...")
sahifadan tashqariga chiqib ketgan edi — `paragraph()`/`note()` metodlari `heading()` kabi hech
qachon matn kengligini o'lchamagan (faqat `table()`ning sarlavha-kolliziyasi va `heading()`ning
o'zi oldin tuzatilgan edi). Bu safar, chunki `paragraph()`/`note()` **umumiy** metodlar (butun
hisobot bo'ylab o'nlab joyda ishlatiladi, faqat bitta yangi chaqiruv emas), sarlavhani
qisqartirish o'rniga **umumiy so'z-bo'yicha o'rash** (`wrapText()`) qo'shildi — bo'shliqlar
bo'yicha bo'ladi, bitta uzun bo'shliqsiz token (URL kabi) hali ham sig'masa belgi-bo'yicha
bo'linadi. Ikkala metod ham endi ko'p qatorli matnni to'g'ri chizadi. Boshqa barcha
paragraph/note joylar (qisqa matnlar) o'zgarishsiz bitta qatorda qoladi — vizual tekshiruvda
regressiya topilmadi.

**Tekshirildi**: `bun run type-check` (barcha workspace), `bun run --cwd apps/web build`, `bunx
biome lint` (tegilgan fayllar), `bun run --cwd apps/api test tests/services` (64/64 — asosiy
test'ga haqiqiy `verifyUrl` qo'shilib QR-chizish yo'li ham endi qamrab olingan). Backend to'liq
haqiqiy muhitda tekshirildi: haqiqiy Neon bazadan "3-DMTT" binosining haqiqiy `auditRunId`si
olinib, `GET /api/verify/:id` haqiqiy (`{valid:true, buildingName:"3-DMTT", completedAt:...}`)
va soxta UUID (`{valid:false}`, 404) holatlarining ikkalasi ham to'g'ri ishlagani tasdiqlandi;
haqiqiy PDF generatsiya qilinib QR kod va tekshiruv matni sahifada to'g'ri chiqqani vizual
tasdiqlandi.

**Keyinroq (kengaytma tiklangandan so'ng) frontend ham brauzerda vizual tasdiqlandi**: haqiqiy
`auditRunId` bilan `/verify/9045896a-...` — yashil ✓ "Ushbu hisobot haqiqiy", bino nomi
("3-DMTT") va sana to'g'ri ko'rsatildi; soxta UUID bilan — qizil ✗ "Tasdiqlanmadi" holati
to'g'ri chiqdi. Ikkala holat ham matn/ikonka/disclaimer bilan birga to'g'ri render bo'ldi.

**`docs/report-redesign-proposal.md`ning barcha §9 bosqichlari tugallandi va to'liq
tekshirildi** (Yandex xaritasi kodi tayyor, faqat kalit hal qilinishi kerak — yuqoriga qarang).

### Hisobotdagi ortiqcha bo'sh sahifalar tuzatildi (loyiha egasi shikoyati asosida)

Loyiha egasi "hisobot orasida bo'sh joylar ko'p" deb shikoyat qildi. Haqiqiy "3-DMTT" binosiga
qarshi to'liq hisobot generatsiya qilinib (bir martalik scratch skript bilan), har bir
sahifaning haqiqiy kontent-pastki chegarasi `pymupdf`ning `get_text("blocks")`/`get_drawings()`
orqali dasturiy ravishda o'lchanib, "sahifaning necha foizi bo'sh" tekshiruvi qilindi — vizual
ko'rib chiqishga tayanish o'rniga aniq sonli tashxis.

**Topilgan ildiz sabab**: `table()` metodi albom (landscape) rejimga o'tgandan so'ng, jadval
tugagach **har doim** yangi portret sahifaga qaytarardi (`newPortraitPage()`, 1-bosqichda
(tipografiya) qo'shilgan). Bu ayniqsa ikkita siklda halokatli edi — U-qiymat hisob-kitoblari
(`extras.uValues`ning har bir elementi uchun: paragraph+note+jadval+paragraph) va moliyaviy
pul-oqimi tafsiloti (har bir chora-tadbir uchun: paragraph+7-ustunli jadval). Har ikkala
siklda **keyingi element ham albom jadval talab qiladi** — natijada: albom jadval → majburiy
yangi PORTRET sahifa (unda faqat 2-3 qatorli matn) → keyingi elementning jadvali yana albom
talab qiladi → yana yangi albom sahifa. 47 sahifalik hisobotda **~30 tasi 90%+ bo'sh** edi
(`content_bottom` sahifa balandligining atigi 10-15%ida tugardi).

**Tuzatish**: `newPortraitPage()`ning majburiy chaqiruvi butunlay olib tashlandi (o'zi ham
endi hech qayerda ishlatilmagani uchun butunlay o'chirildi). Jadvaldan keyingi kontent endi
joriy sahifa o'lchamida davom etadi — agar joriy sahifa allaqachon albom bo'lsa va keyingi
jadval ham albomga muhtoj bo'lsa, `needsLandscape = totalWidth > this.contentWidth()`
tekshiruvi **allaqachon albom kengligiga nisbatan** hisoblanganligi sababli ko'pincha `false`
chiqadi — ya'ni jadval yangi sahifa ochmasdan, xuddi shu albom sahifada davom etadi. Natija:
47 sahifadan **24 sahifaga** tushdi, jiddiy bo'sh sahifalar soni ~30 tadan **2 taga** (faqat
tabiiy holatlar — muqova sahifasining o'zi va hisobotning eng oxirgi sahifasi, ikkalasi ham
odatiy hujjat-oxiri bo'shlig'i, bug' emas).

**Ikkinchi, kichikroq sabab ham topildi va tuzatildi**: `heading()` faqat o'zi uchun 30pt joy
tekshirardi (`ensureSpace(30)`) — agar keyingi kontent albom sahifa talab qilsa-yu, joriy
portret sahifada hali ko'p bo'sh joy qolgan bo'lsa, sarlavha o'sha bo'sh joyning boshida
"yolg'iz" chizilib qolardi (masalan "Executive summary" sarlavhasi jadvalisiz). Bu holatlar
kamroq uchraydi va umuman oldini olib bo'lmaydi (chunki muammo balandlik emas, mo'ljal —
portretdan albomga o'tish — bo'lgani uchun), lekin `ensureSpace(30)` → `ensureSpace(100)`ga
oshirilishi ba'zi holatlarda sarlavhani keyingi sahifaga suradi, agar joriy sahifada 100pt'dan
kam joy qolgan bo'lsa.

Ikkalasi ham umumiy, butun hisobot bo'ylab ishlaydigan tuzatishlar (bitta bo'lim uchun emas) —
`table()`/`heading()` qanday ishlatilishidan qat'iy nazar amal qiladi.

**Tekshirildi**: `bun run --cwd apps/api type-check`, `bunx biome lint`, `bun run --cwd apps/api
test tests/services` (64/64). Haqiqiy Neon bazadagi "3-DMTT" binosiga qarshi to'liq hisobot
qayta generatsiya qilinib, barcha 24 sahifa sahifama-sahifa `pymupdf` bilan rasmga aylantirilib
vizual tekshirildi — U-qiymat va pul-oqimi bo'limlari endi bir nechta elementni bitta zich
sahifada ketma-ket chizadi, hech qanday matn kesilishi/ustma-ust tushishi topilmadi.

## Admin: foydalanuvchini tahrirlash va faolsizlantirish

Loyiha egasi admin panelida foydalanuvchini tahrirlash va "kerak bo'lsa o'chirish" imkonini
so'radi. Bazaning FK grafigini tekshirib chiqdim: haqiqiy `DELETE FROM "user"` xavfli —
`building.userId`da `onDelete: cascade` bor (o'chirilsa, foydalanuvchining barcha binolari/
audit natijalari jimgina o'chib ketardi), `audit_run.triggeredByUserId`/
`conversation.createdBy`/`building_member.invitedByUserId`/`message.senderId`da esa hech
qanday cascade yo'q (Postgres standart RESTRICT) — agar o'sha foydalanuvchi biror audit
ishga tushirgan yoki xabar yozgan bo'lsa, o'chirish FK-xatosi bilan butunlay muvaffaqiyatsiz
bo'lardi. Shu tahlil asosida `EnterPlanMode` orqali reja tuzildi va tasdiqlandi, foydalanuvchi
ikkita xavfli variant (bo'sh akkauntlarni o'chirish / to'liq cascade o'chirish) o'rniga
**"faqat faolsizlantirish"** (soft deactivate)ni tanladi.

**Sxema**: `packages/db/src/schemas/auth.ts`ning `user`iga `isActive: boolean` (default
`true`) qo'shildi, migratsiya `0009_heavy_madame_masque.sql`.

**Backend**:
- `apps/api/src/auth/index.ts`ning `user.additionalFields`iga `isActive` qo'shildi
  (`role`/`username` bilan bir xil naqsh — `input: false`, faqat admin route orqali
  o'zgaradi), shunda `session.user.isActive` mavjud va tiplangan bo'ladi.
- `apps/api/src/middleware/auth.ts`ning `authMiddleware`i endi `session.user.isActive`ni
  tekshiradi va `false` bo'lsa 403 qaytaradi — **darhol** ta'sir qiladi, hatto foydalanuvchi
  allaqachon tizimga kirgan (sessiya hali amal qilayotgan) bo'lsa ham, keyingi har qanday
  himoyalangan so'rov shu yerda to'xtaydi.
- `apps/api/src/routes/admin-users.ts`ga ikkita yangi route: `PATCH /users/:id` (ism/
  username tahrirlash, `users.ts`ning `/me`sidagi bilan bir xil username-conflict 409
  tekshiruvi) va `PATCH /users/:id/status` (`isActive`ni o'rnatadi, o'zini-o'zi
  faolsizlantirishni bloklaydi — mavjud o'zini-o'zi past darajaga tushira olmaslik qoidasi
  bilan bir xil mantiq).

**Frontend**: `EditUserDialog`/`DeactivateUserDialog` (`components/admin/`,
`delete-building-dialog.tsx`/`profile.tsx`ning naqshlarini birlashtirgan holda),
`admin/users.tsx`ga Status ustuni (Badge) va har qatorga Tahrirlash/Faolsizlantirish-
Faollashtirish tugmalari qo'shildi. Faollashtirish (buzg'unchi emas) tasdiqlashsiz oddiy
tugma, faolsizlantirish esa `Dialog`-asoslangan tasdiqlash talab qiladi. Joriy admin o'z
qatorida "Faolsizlantirish" tugmasini ko'rmaydi (backend baribir bloklaydi, bu faqat UI
tozaligi uchun).

Tekshirildi: `bun run --cwd packages/db type-check`, `bun run --cwd apps/api type-check`,
`bun run --cwd apps/api test tests/services` (64/64), `bun run --cwd apps/web type-check`
(haqiqiy Vite build), `bunx biome check --write` (barcha tegilgan fayllar). Migratsiyani
haqiqiy bazaga qo'llash va brauzerda tekshirish — foydalanuvchi tomonidan, deploy'dan keyin
(bu sandbox'da baza yo'q).

## Login/Register — zamonaviy split-screen dizayn

Loyiha egasi login/register sahifalarini "interaktiv, zamonaviy" qilishni, mobilga
moslashtirishni va Google tugmasini Google'ning o'z brendiga mos qilishni so'radi.
`AskUserQuestion` orqali ikkita tuzilish (split-screen vs kengaytirilgan markazlashgan
karta) taqdim qilindi, foydalanuvchi **split-screen**ni tanladi.

- Yangi `apps/web/src/components/auth/auth-layout.tsx` (`AuthLayout`) — `lg+`da chapda
  `bg-primary` brend paneli (YRES logotipi, tagline, 3 ta xususiyat ro'yxati, ikkita
  dekorativ blur-doira), o'ngda forma; `lg`dan past (`docs/ui-guidelines.md`ning desktop
  chegarasi) brend panel **butunlay yashiriladi**, o'rniga ixcham logotip-satri
  ko'rsatiladi — katta rangli panelni telefon ekraniga siqish o'rniga, mobil tezkor va
  ixcham qoladi. Forma `animate-in fade-in-0 slide-in-from-bottom-2` bilan kirib keladi
  (`tw-animate-css`, `packages/ui/globals.css`da allaqachon ulangan, Dialog animatsiyalari
  bilan bir xil mexanizm).
- Yangi `apps/web/src/components/auth/google-icon.tsx` — Google'ning rasmiy 4-rangli "G"
  belgisi (developers.google.com/identity/branding-guidelines), umumiy outline tugma
  o'rniga.
- `login.tsx`/`register.tsx`: `Card` o'rami olib tashlandi (split-screen'da o'ng panelning
  o'zi allaqachon "karta"), email/parol/ism maydonlariga ikonka qo'shildi (`dashboard.tsx`
  qidiruv maydonidagi bilan bir xil `absolute`+`pl-9` naqsh), parol maydoniga
  ko'rsatish/yashirish tugmasi (`Eye`/`EyeOff`), tugmalarga `active:scale-[0.98]`
  o'tish animatsiyasi.
- `apps/web/src/i18n/locales/{en,ru,uz}/auth.json`ga yangi `brand.*` (tagline, 3 ta
  xususiyat — mavjud `login.subtitle`/`register.subtitle` marketing ohangiga mos) va
  `login.showPassword`/`hidePassword` kalitlari.

Tekshirildi: `bun run --cwd apps/web type-check` (haqiqiy Vite build), `bunx biome check
--write`. Qurilgan CSS'da `animate-in`/`slide-in-from-bottom-2`/`fade-in-0` klasslari
haqiqatan chiqqani `grep` bilan tasdiqlandi (`frontend.md`dagi "className satrida bor ≠
build'da bor" qoidasiga ko'ra). **Brauzerda vizual tekshirilmadi** — bu sessiyada Preview
MCP vositasi mavjud emas edi (`testing-and-verification.md`dagi protsedura shu vositaga
tayanadi). Login/register autentifikatsiyasiz sahifalar bo'lgani uchun (hech qanday GET
so'rov qilmaydi, faqat submit'da) mock-API kerak emas — faqat brauzer preview'i yetishmadi.
Loyiha egasi qo'lda tekshirishi tavsiya etiladi: `lg+`da split-screen, `lg`dan pastda
ixcham logotip-satri + to'liq kenglikdagi forma, parol ko'rsatish/yashirish, Google
tugmasidagi rasmiy "G" belgisi.

Keyingi kichik so'rovlar bo'yicha davom etildi: brend paneli matni rasmiy/umumiy ohangga
o'tkazildi (energiya samaradorlik/energo audit atamalari bilan, "bino"ga xos so'zlar olib
tashlandi — loyiha egasi kelajakda sanoat korxonalarini ham audit qilishni rejalashtirgani
sababli, xotiraga yozildi), register'dagi ortiqcha "Bino egalari, ESCO'lar..." qatori olib
tashlandi, register formasiga "Parolni tasdiqlang" maydoni qo'shildi (mos kelmasa
`signUp.email()` chaqirilishidan oldin to'xtaydi).

**Haqiqiy brauzerda tekshirilganda topilgan bug (tuzatildi)**: register submit qilinganda
"username is required" xatosi chiqib, hisob yaratilmasdi. Sabab: `apps/api/src/auth/
index.ts`ning `user.additionalFields.username`i `required: true` deb belgilangan edi, lekin
`defaultValue` yo'q edi — Better Auth bu talabni `databaseHooks.user.create.before` hook
ishga tushishidan **oldin**, client yuborgan xom so'rov (`username`ni umuman
o'z ichiga olmaydi, chunki `input: false`) ustida tekshiradi, shuning uchun hook email'ni
username sifatida qo'yishga ulgurmasdan oldin har bir ro'yxatdan o'tish muvaffaqiyatsiz
bo'lardi. Bu aslida "Social Phase 1" bosqichida ("Diqqat: bu hook'ning aniq shakli Better
Auth hujjatlariga qarshi tasdiqlanmagan... haqiqiy deploy'dan keyin signup oqimini qo'lda
tekshirish tavsiya etiladi" deb) oldindan ogohlantirilgan xavf edi. Tuzatish: `required:
false`ga o'zgartirildi (`role`/`isActive` bilan bir xil naqsh) — haqiqiy kafolat
hook + bazaning NOT NULL cheklovi orqali ta'minlanadi. Tekshirildi: `bun run --cwd apps/api
type-check`, `bunx biome check`. Haqiqiy signup oqimini qayta sinash — foydalanuvchi
tomonidan.

## Production rejasi repo'ga olindi + qoidalar rejaga moslashtirildi (2026-10-02)

Kodga tegilmadi — faqat hujjat/qoida o'zgarishlari, Faza 0 dan oldingi tayyorgarlik.

- `docs/production/` (00-MASTER-PLAN + 01–06 mutaxassis hisobotlari, 2026-09-27) faqat diskda,
  commit qilinmagan holda turgan edi — commit qilindi.
- **K1 qarori: haqiqat manbai — Excel v7.20** (loyiha egasi tasdiqladi). `calculation-engine.md`dagi
  "v5 ga sodiqlik" qoidasi "v7.20 ga sodiqlik + har dvigatel o'zgarishi golden test bilan"ga
  almashtirildi; master rejadagi K1 qatori va `CLAUDE.md` yangilandi. Dvigatel kodi hali v5 da
  (X33 `(Q+Qd)·(2−η)` va boshqalar) — tuzatish Faza 1 da.
- `auth.md`: `requireLocalEmailVerified: false` qoidasi S-1 (akkauntni oldindan egallash) tuzatishini
  to'smasligi aniqlashtirildi; ruxsat etilgan ikki yo'l (a/b) yozildi — tanlov loyiha egasida.
- Kodda qayta tasdiqlangan topilmalar (o'qib + grep): X33 formulasi; `ci.yml`dagi
  `psql -f packages/db/drizzle/*.sql` faqat birinchi migratsiyani qo'llaydi; `DEFAULT_DISCOUNT_RATE
  = 0.04` qattiq kodda; `xlsx@^0.18.5`; `NumberInput`/`parseLocaleNumber` yo'q (`parseFloat`).

Tekshiruv: faqat markdown o'zgardi — type-check/build/lint talab qilinmaydi.

**Qarorlar (shu kuni):** K2 — nominal 6,08 % (v7.20 kabi), K3 — ikkala ko'rinish, K4 — FES eksporti
parametr, sukutda o'chiq; S-1 — (b) yo'l. Master reja va `auth.md`ga yozildi.

**Navbatda:** branch strategiyasi
(repo'da faqat `claude/yres-platform-development-svx6nn` bor, `main` yo'q); keyin Faza 0
(master reja §6dagi tayyor prompt).

## Faza 0 ijro paketi va yangi qoidalar tayyorlandi (2026-10-02)

Kodga tegilmadi — faqat hujjat/qoida. Maqsad: Faza 0 kodini boshqa model (Sonnet) yozadi, shuning uchun har
topshiriq oldindan kodga qarshi tekshirilib, aniq spec qilib yozildi.

- `docs/production/faza-0/README.md` — ijro protokoli (sessiya boshida nima o'qiladi, topshiriq sikli,
  tekshiruvlar, holat jadvali, qachon to'xtab so'rash, ko'lamdan tashqari ro'yxat, tayyor prompt).
- `T01`–`T10` spec'lari: CI migratsiyalari; S-1 (b) yo'l; V-1 chat XSS; S-4/A-2/V-3/V-5/V-2; `parseLocaleNumber` +
  `NumberInput`; dirty-himoya + o'chirishga tasdiq; iste'molni ko'p yil atomik saqlash; audit tugmasi; `xlsx`;
  backup runbook + ADR-011/015.
- Yangi qoidalar: `.claude/rules/security.md`, `forms-and-numbers.md`, `data-integrity.md`,
  `future-platform.md` (hozir amal qilmaydi). `CLAUDE.md` jadvaliga qo'shildi (`hisobot.md` ham — avval yo'q edi)
  va "Joriy faza" bo'limi.

Kodda tasdiqlangan yangi topilmalar (rejada yo'q edi):
- `ci.yml` faqat `push: main` da ishlaydi, `main` esa yo'q — branch'ga push'da CI umuman ishga tushmaydi (T01).
- Better Auth 1.6.23 manbasi (`oauth2/link-account.mjs`): `linkAccount` → `account.create.after` hook → keyin
  `emailVerified = true` → `createSession`. S-1 (b) yo'lini shu hook'da xavfsiz qilish mumkinligi tasdiqlandi (T02).
- Bino sahifasining Radix `Tabs` nofaol tab'ni unmount qiladi — tab almashtirish ham saqlanmagan tahrirni
  yo'qotadi (T06b).
- `apps/web` da unit test runner yo'q — T05a da `vitest` qo'shiladi.

Tekshiruv: faqat markdown — type-check/build talab qilinmaydi. (Rekognostsiya uchun `bun install
--frozen-lockfile` bajarildi; tracked fayllar o'zgarmadi.)

**Navbatda:** Faza 0, T01 dan — `docs/production/faza-0/README.md` §8 dagi prompt bilan Sonnet sessiyasi.

## K20: Neon → Cloudflare D1 qarori va Faza 0 rejasiga kiritilishi (2026-10-02)

Loyiha egasi bazani Cloudflare D1'ga ko'chirishga qaror qildi (to'liq Cloudflare). Production'da faqat test ma'lumot —
**ko'chirilmaydi**, D1 bo'sh bazadan boshlanadi (tasdiqlandi). Kodga tegilmadi — faqat hujjat/qoida.

- `docs/adr/ADR-016-cloudflare-d1.md` (qabul qilindi), master reja K20 qatori va Faza 0 jadvali.
- Yangi spec'lar: `faza-0/D01` (sxema → `sqlite-core`, baseline, ma'lumotnoma seed'i versiyalangan migratsiya sifatida),
  `D02` (`env.DB` binding, Better Auth `sqlite`, `insertChunked`, `ilike` → `searchText`), `D03` (test harness — Miniflare
  lokal D1, CI'dan Postgres), `D04` (production cutover — loyiha egasi qadamlari bilan, Neon hujjatlarini tozalash).
- T01 qisqardi (faqat branch trigger + artefaktlar), T02/T07 testlari lokal D1'da, T10 — D1 Time Travel runbook.
- `database.md`: D1 qoidalari yuqorida (D01 dan amal qiladi), Neon bo'limi "o'tish davri" deb belgilandi. `data-integrity.md`,
  `CLAUDE.md` moslashtirildi.

Rasmiy hujjatda tasdiqlangan D1 faktlari (developers.cloudflare.com, 2026-10-02): `batch()` atomik (biri yiqilsa hammasi
orqaga); **≤ 100 parametr/bayonot**; ≤ 1 000 so'rov/chaqiruv (Free: 50); baza ≤ 10 GB (Free: 500 MB); Time Travel 30 kun
(Free: 7); FK doim majburiy, `PRAGMA foreign_keys=OFF` ishlamaydi — `defer_foreign_keys`.
Koddagi hajm: 39 jadval, 17 enum, 85 `numeric`, 35 `defaultRandom`, 2 ta `ilike`; DB faqat `createDb` orqali ulanadi
(`middleware/db.ts`, `conversation-room.ts`) — ko'chirish yuzasi tor.

**Navbatda:** Sonnet sessiyasi — `faza-0/README.md`, D01 dan.

### Tuzatish: Workers Free bilan boshlanadi (2026-10-02)

Loyiha egasi: boshlanishiga bepul reja yetarli. Yuqoridagi "D1 Free limitlari audit run'ga yetmaydi" degan gap
**tekshirilmagan va noto'g'ri edi** — kod bo'yicha sanaldi: `runFullAudit` ≈ 20 D1 so'rovi, PDF hisobot route'i ≈ 30;
Free chegarasi 50/chaqiruv. Production ham shu paytgacha Free'da ishlagan (`wrangler.toml` izohi).
O'zgarishlar: `database.md` ga **so'rov byudjeti ≤ 40** qoidasi; T07 bulk endpoint'i yil bo'yicha bitta delete'ga
qayta loyihalandi (avvalgi variant 60 ta delete bilan Free chegarasidan oshardi); D02 ga eng yomon holat hisobi; ADR-016 ga
Paid'ga o'tish triggerlari (`1102`/CPU — eng ehtimolli PDF, byudjet, 400 MB, Time Travel 7 kun yetmasligi, Queues);
ADR-015 "kechiktirilgan". Asosiy xavf D1 emas, Workers Free'ning CPU chegarasi (PDF) — D04 smoke'ida tekshiriladi.

## Faza 0 · D01 — `packages/db` SQLite/D1 ga o'tkazildi (2026-10-02)

**D01a (sxema + baseline):** 21 sxema fayli `sqlite-core` ga (tip xaritasi D01 spec'iga aynan), `createDb(d1: D1Database)`,
`@neondatabase/serverless` va `migrate`/`studio` skriptlari olib tashlandi, `drizzle.config.ts` `dialect: "sqlite"`
(`DATABASE_URL` talabisiz). 10 ta PG migratsiyasi o'rniga bitta `0000_baseline.sql`. `building.searchText` qo'shildi
(ilova yozadi — D02). Enum'lar `defineEnum()` orqali `{ enumValues }` shaklida saqlandi — `apps/api` dagi
`z.enum(xEnum.enumValues)` iste'molchilari o'zgarmaydi; ikkita chat enum'i `enums.ts` ga ko'chdi.
**D01b (seed):** ma'lumot `src/reference-data.ts` ga (qiymatlar o'zgarmadi, `effectiveDate` = `2026-10-02` qat'iy),
`seed.ts` faqat `seedReferenceDataWithDb` (Neon CLI entry olib tashlandi), `scripts/build-reference-migration.ts`
(`bun run build:reference-migration <yo'l>`) → `drizzle/0001_reference_data.sql` (`INSERT OR IGNORE`).

Tekshiruv: `packages/db` type-check va biome yashil; `sqlite3` da baseline + reference migratsiyasi xatosiz tushadi;
sanoqlar mos: 39 jadval / 44 FK (33 cascade) / 15 indeks-unique (eski PG snapshot bilan bir xil), material 37,
surface_resistance 6, pipe_loss 6, lamp 4, tariff 4, region 1, monthly 12. `apps/web`/`types`/`ui` yashil.
`apps/api` type-check hozir **yiqiladi** (`BatchItem<"pg">` va h.k.) — D02 da tuzatiladi, shuning uchun D01 commit'lari push qilinmadi.

D02 uchun eslatma: `seedReferenceDataWithDb` hozir `values(rows)` ni bo'laklamaydi (material 37×3, monthly 12×14 parametr
> 100) — D02 da `insertChunked` kelgach shu yerda ham qo'llang (D03 testlari uni chaqiradi).
Brauzerda tekshirilmadi (UI o'zgarmadi).

**Navbatda:** D02 (`apps/api` → D1 binding). D01+D02 birga push.

## Faza 0 · D02 — `apps/api` D1 binding'iga ulandi (2026-10-02)

- `Env.DB: D1Database` (`DATABASE_URL` yo'q); `dbMiddleware`, `ConversationRoom`, Better Auth (`provider: "sqlite"`) shu binding'dan.
- `wrangler.toml`: `[[d1_databases]]` (lokal `local-dev` + `env.production` placeholder `REPLACE_WITH_PRODUCTION_D1_ID` — D04 gacha
  deploy yo'q). Skriptlar: `db:migrate:local`/`db:migrate:prod` (`npx wrangler`), `predev` lokal migratsiyani qo'llaydi;
  eski `db:migrate/seed/studio` olib tashlandi.
- `packages/db/src/batch.ts`: `chunkRowsForInsert`, `insertChunked` (ixtiyoriy `onConflictDoNothing`), `D1_MAX_PARAMS`;
  envelope/systems/consumption/chat'dagi barcha ko'p qatorli insert shu orqali, har route'da bitta `db.batch()`. Consumption POST
  endi bo'laklar bo'yicha `returning()` bilan bitta batch.
- Qidiruv: `lib/search.ts` (`likeContains` — `%`/`_`/`\` escape + `ESCAPE`, `normalizeSearchText`, `buildingSearchText`);
  `building.searchText` POST/PUT'da yoziladi (PUT'da yo'q maydon mavjud qiymatdan olinadi). Chat username qidiruvi `likeContains`.
- `chat.ts`: `selectDistinctOn` (Postgres) → har suhbatning oxirgi xabari `max(createdAt)` subquery join bilan.
- **Zod chegaralari + so'rov byudjeti** (avval umuman yo'q edi; T04c shu chegaralarni kengaytirmasdan, byudjetga moslab qo'llasin):
  envelope — blocks 22, constructionTypes 15 (×≤8 qatlam), openingTypes 14, elements 100, openings jami 160 → eng yomon batch
  33 bayonot (+≤5 sessiya/kirish/retrofit) = 38 ≤ 40; systems — ventilation 20, dhw 20, distribution 50, generation 20,
  cooling windows 100 / systems 50, lighting 100, equipment 200, renewables 20 (eng og'iri equipment: 1+23=24); consumption POST 144.
  Hisob izohlari `schemas/envelope.ts` va `schemas/systems.ts` boshida. Chegaralar real auditdagi hajmdan keng deb tanlangan,
  lekin kichik bino uchun mo'ljallangan — real ma'lumotda yetmasa, Paid'ga o'tish triggeri (ADR-016), chetlab o'tish emas.
- `count()`/`sum()`: `Number(sum ?? 0)` o'rami mavjud — `null` (bino yo'q) → 0. `deadline`/`effectiveDate` avval ham satr — `api-types.ts` mos.
  Eslatma: `building` javobiga `searchText` ham chiqadi (zararsiz ichki ustun; web turiga qo'shilmagan).

Tekshiruv: ildizdan `bun run type-check` (5/5), `bunx biome lint apps packages`, `bun run --cwd apps/web build` yashil.
`bun run --cwd apps/api test`: servis unit testlari **68/68 yashil** (yangi `tests/services/batch.test.ts` bilan); integratsiya
47 test `ECONNREFUSED` (lokal Postgres yo'q — D03 gacha kutilgan, regressiya emas).
Lokal smoke (haqiqiy `wrangler dev` + lokal D1, curl): migratsiyalar tushdi; `/health`; `/api/reference/materials` seed'ni qaytaradi;
ro'yxatdan o'tish (sqlite adapter); bino yaratish (`searchText` yozildi); kirill qidiruvi `тошкент` → topildi, `%` → 0;
eng yomon holat envelope PUT (15 tur×8 qatlam, 100 element) 200; `audit/run` 201 (`completed`); `/stats`; chat ro'yxati
(oxirgi xabar + o'qilmagan soni). **Tekshirilmadi:** Workers Free'ning haqiqiy 50-so'rov chegarasi (Miniflare qo'llamaydi — D04 smoke);
WebSocket/DO oqimi; brauzer UI (o'zgarmadi).
`apps/api/tests/*` hali Postgres'ga tayanadi (`pg`, `test-db.ts`) — D03 da almashtiriladi; `pg` devDependency shu uchun qoldi.

**Navbatda:** D01+D02 push, so'ng D03 (test harness — lokal D1).

## Faza 0 · D03 — test harness lokal D1'da (2026-10-02)

- `tests/helpers/test-db.ts`: Postgres/`pg`/shim o'rniga `getPlatformProxy({ persist: false })` → xotiradagi Miniflare D1,
  `packages/db/drizzle/*.sql` nom tartibida `d1.batch()` bilan qo'llanadi, `testDb = createDb(d1)` (haqiqiy `@yres/db` drayveri,
  haqiqiy atomik `batch()`). `resetTestDb()` — jadvallar `sqlite_master` dan, bitta batch: `PRAGMA defer_foreign_keys = on` + `DELETE`.
  `getPlatformProxy` Vitest (Node) va `bun run` ostida ham ishladi — zaxira (`new Miniflare`) kerak bo'lmadi.
- `setup.ts` (`vi.mock("@yres/db")`) o'chirildi: `testEnv.DB = d1`, `dbMiddleware` o'z ishini qiladi.
- Test muhitiga Workers'ga xos ikki narsa qo'shildi: no-op `caches` (kesh eskirgan ma'lumotnomani qaytarmasin) va
  `testExecutionCtx` (`authRequest`/sign-up shuni uzatadi). Ular yo'qligi `audit`/`report` testlarini 500 bilan yiqitgan edi.
- Yangi testlar: `batch-atomicity.test.ts` (FK buzadigan ikkinchi bayonot → birinchi ham qaytadi), `envelope.test.ts` ga eng yomon
  holat PUT (15 tur×8 qatlam, 14 opening type, 100 element, 160 opening, 22 blok — hammasi qaytib o'qiladi) va openings jami
  chegarasi → 400.
- `ci.yml`: `services.postgres`, `TEST_DATABASE_URL`, psql qadami olib tashlandi; `pg`/`@types/pg` olib tashlandi.
- Hujjatlar: `testing-and-verification.md`, `realtime.md`, README §3/§4 yangilandi (D01/D02 ham ✅ — push qilingan).

Tekshiruv: `bun run --cwd apps/api test` **lokal 27 fayl / 118 test to'liq yashil** (integratsiya birinchi marta shu mashinada);
type-check va biome yashil; `grep "\bpg\b|node-postgres|TEST_DATABASE_URL|postgres:16" apps .github` — bo'sh.
**Playwright E2E (`apps/web`) — YIQILADI, D03 sababli emas:** 7/7 spec yiqiladi; e2e server D1 ustida to'g'ri ko'tariladi
(`/health` 200, `bun run` ostida ham), lekin spetsifikatsiyalar eskirgan UI'ga yozilgan (masalan `getByLabel("Password")` endi 3 ta
elementga mos — "Show password" tugmasi; `/invalid or expired/` matni o'zgargan, sarlavha "Invalid reset link"). E2E CI'da hech qachon
ishlamagan (`ci.yml` faqat `main` da, `main` yo'q). Specs'ni yangilash D03 ko'lamidan tashqari — loyiha egasi/T01 bilan hal qilinsin.
(Chromium shu mashinada `playwright install chromium` bilan o'rnatildi.)

**Navbatda:** D04 — §B (hujjatlar) bajarish mumkin; §C (production cutover) loyiha egasi qadamlarini kutadi.

## Faza 0 · D04 §B — Neon'ga oid hujjat/konfiguratsiya D1 ga moslandi (2026-10-02)

Bajarildi (loyiha egasi qadamlarisiz): `database.md` to'liq qayta yozildi (D1 asosiy matn, Neon bo'limi yo'q);
`realtime.md`, `social-features.md` (rule), `hisobot.md`, `deployment.md` (rule: `DATABASE_URL` sirdan olindi, deploy tartibiga
migratsiya qadami), `CLAUDE.md`, `README.md`, `docs/deployment.md` (§1 endi D1), `docs/er-diagram.md`, `docs/social-features.md`,
00-MASTER-PLAN K20 qatori, `.env.example`, `.dev.vars.example`, kod izohlari. `deploy.yml`: `db:migrate`+`db:seed` →
bitta `db:migrate:prod` (CF token bilan; workflow hali ishlatilmagan). `docs/production/01–06` va ADR tegilmadi.
Grep (`Neon|neon-http|DATABASE_URL|@neondatabase` apps packages .claude CLAUDE.md README.md docs/deployment.md .github)
— faqat tarixiy eslatmalar: `database.md`/`CLAUDE.md` bir qatordan.

**KUTILMOQDA (loyiha egasi), D04 §A/§B.1/§C — Sonnet bajarmaydi:**
1. `cd apps/api && npx wrangler d1 create yres-production` → `database_id` ni bering; men `wrangler.toml`
   `[[env.production.d1_databases]]` dagi `REPLACE_WITH_PRODUCTION_D1_ID` ni almashtiraman (hozir placeholder — shu holda deploy qilmang).
2. Cutover (egasi ishga tushiradi, shu tartibda):
```bash
cd apps/api
npx wrangler d1 migrations apply yres-production --remote --env production   # baseline + reference_data
npx wrangler deploy --env production
npx wrangler secret delete DATABASE_URL --env production
cd ../web && VITE_API_URL=https://yres-api.saidmurod.com bun run build \
  && npx wrangler pages deploy dist --project-name=yres-web --branch=main --commit-dirty=true
```
3. Smoke: ro'yxatdan o'tish (yangi akkaunt), Google bilan kirish, bino yaratish, qobiq, audit run, **PDF yuklab olish**
   va ro'yxatdan o'tish/kirish (Free CPU chegarasi — `1102` chiqsa Paid triggeri, `npx wrangler tail --env production`
   bilan tasdiqlang), chat xabari (DO → D1), eng og'ir envelope PUT (50 so'rov chegarasi haqiqiy Free'da). Hammasi ishlasa —
   Neon loyihasini konsolda o'chirish. Keyin shu yerga "✅ production D1'da" yozing.

**Navbatda:** T01 (CI) — Playwright E2E bo'yicha qaror majburiy (nazoratchi talabi): CI'da E2E qadami bor va spec'lar yiqiladi,
shuning uchun T01 da yo spec'larni tuzatish, yo E2E'ni aniq izoh bilan CI'dan chiqarish; "yashil" deb e'lon qilmaslik.

## Faza 0 · T01 — CI gigiyenasi (2026-10-02)

- `ci.yml`: `push` trigger'i `[main, "claude/**"]` (avval faqat `main` — u yo'q, CI push'da umuman ishlamagan); Playwright traces
  `if: failure()` bilan `actions/upload-artifact@v4` ga (`apps/web/test-results/`, 7 kun). Postgres bandlari D03 da olingan.
- `deploy.yml`: **filtrga ishchi branch QO'SHILMADI** (izoh bilan): production hali eski Neon-davri build'da, bu kod esa D1 talab
  qiladi — avtomatik deploy faqat D04 §C dan keyin, egasi qarori bilan. Qo'lda `workflow_dispatch` placeholder `database_id` tufayli
  migratsiya qadamida yiqiladi — bu ataylab saqlangan, soxta ID qo'yilmagan.
- **Playwright E2E bo'yicha qaror: spec'lar TUZATILDI, CI'dan chiqarilmadi, skip yo'q** (commit 6c8a19a). Sabab: ro'yxatdan o'tish formasida
  "Confirm password" va "Show password" paydo bo'lgan (`getByLabel("Password")` 3 elementga mos), reset-sahifa matni o'zgargan.
  7/7 lokal yashil, 3 marta ketma-ket (Miniflare D1 backend bilan — E2E ham haqiqiy D1 yo'lini tekshiradi). E2E serveri har so'rovga
  sintetik IP beradi (real limiter 10/daq — integratsiya testida qoplangan).
- **OCHIQ TOPILMA (yashirilmagan):** `password-reset.spec` da `/login` → "Forgot password?" bosilgach `/forgot-password` ning email maydoniga
  birinchi `fill()` **to'liq to'plamda** (yolg'iz yurganda emas) ba'zan qabul qilinmaydi: maydon bo'sh qoladi, submit hech narsa qilmaydi.
  Aniqlangan: sahifa qayta yuklanmaydi (`framenavigated`/`load` yo'q), input elementi qayta mount qilinmaydi (`isConnected` true),
  konsolda xato yo'q, sarlavha allaqachon yangi sahifaniki. **Sababi aniqlanmadi** (taxmin: yangi route'ga o'tishdan keyin React
  hodisa-ishlovi tayyor bo'lguncha poyga, faqat Vite dev'da). Haqiqiy foydalanuvchida takrorlanishi ehtimoli past, lekin rad etilmagan.
  Spec'da `toPass` retry bilan aylanib o'tilgan va shu haqda izoh qoldirilgan. Keyingi qadam: T06 (forma himoyasi) atrofida
  production build (`vite preview`) da takrorlashga urinish; takrorlansa — kod tuzatilib, retry olib tashlanadi.
- Tekshiruv (CI qadamlari lokal): `bun run lint`, `type-check`, `test` (118 yashil), `build`, `playwright test` (7/7).
- **Loyiha egasi/nazoratchi uchun:** GitHub Actions natijasini tekshiring (bu sessiyada `gh` yo'q) — birinchi CI ishga tushishi `workerd`
  binari va `playwright install --with-deps` ni ubuntu-latest da sinaydi; yiqilsa xatoni shu yerga yozing.

**Navbatda:** T02 (S-1 akkauntni oldindan egallash, yo'l (b)).

## Faza 0 · T02 — S-1: akkauntni oldindan egallash yopildi, yo'l (b) (2026-10-02)

- `apps/api/src/auth/account-linking.ts`: `revokeUnverifiedCredentialOnSocialLink` (unverified user + social link ⇒ `credential` akkaunt
  va barcha sessiyalar bitta `db.batch()` da o'chadi; `credential` provayder / verified / noma'lum user ⇒ no-op; logda faqat `userId`)
  va `guardNewAccountLink` (xato bo'lsa — yangi hosil bo'lgan link qatorini o'chirib, xatoni qayta otadi). `auth/index.ts` da
  `databaseHooks.account.create.after`; `requireLocalEmailVerified: false` o'zgarmadi, ikkala joyga "juft" izohi qo'yildi. `auth.md` yangilandi.
- **Better Auth 1.6.23 (`bun.lock`) manbasi QAYTA O'QILDI** (`node_modules/better-auth/dist/…`), tartib spec bilan bir xil:
  `oauth2/link-account.mjs:31` `internalAdapter.linkAccount` → (`db/with-hooks.mjs:31-39` `account.create.after`) → `:49` `updateUser({ emailVerified: true })`
  → `:134` `createSession`. Shu sababli hook paytida `emailVerified` hali `false`.
- **Hook faqat implicit linking'da emas:** `createAccount`/`linkAccount` ikkalasi ham `createWithHooks("account")` — shuning uchun hook
  *aniq* `/link-social` yo'lida ham ishlaydi (`api/routes/callback.mjs:111` `link` holati, `api/routes/account.mjs:156` idToken varianti).
  Tizimga kirgan, hali tasdiqlanmagan foydalanuvchi o'z Google'ini ulasa — o'z paroli va joriy sessiyalari o'chadi. Bu xavfsizlik
  teshigi emas (faqat o'ziga ta'sir qiladi, "parolni unutdim" bilan tiklanadi); farqlovchi shart qo'shilmadi (ko'lam). Kod izohida yozilgan.
  Frontend `/link-social` ni ishlatmaydi.
- **Hook xatosi:** `with-hooks.mjs:33` `queueAfterTransactionHook` (`@better-auth/core/dist/context/transaction.mjs:86` — tranzaksiya
  yo'q bo'lsa darhol `await`) → xato **yutilmaydi**, `linkAccount` otadi, `link-account.mjs:30-40` uni ushlab "unable to link account" qaytaradi.
  Lekin link qatori allaqachon INSERT qilingan bo'lardi ⇒ keyingi Google kirishi "linkedAccount bor" shoxiga tushib, hookni chetlab
  o'tib emailni tasdiqlab qo'yardi (parol saqlangan holda) — **spec'da yo'q teshik**; shuning uchun `guardNewAccountLink` fail-closed
  (xatoda linkni o'chiradi). Testi bor (batch'ni sindirib).
- Testlar `tests/integration/account-linking.test.ts` (8): A–D (spec), noma'lum user, Better Auth adapteri orqali hook ulanganligi (unverified →
  parol/sessiyalar ketadi), verified foydalanuvchi o'zgarmaydi (credential + google qoladi), fail-closed. Oddiy email/parol ro'yxatdan
  o'tish (credential, hook no-op) mavjud integratsiya testlari bilan qoplangan (har `signUpTestUser` shu hook'dan o'tadi).
- **Loyiha egasi uchun qo'lda tekshirish (haqiqiy Google kerak, bu sessiyada tekshirilmagan):** (1) yangi email bilan parol akkaunt oching,
  tasdiqlamang; (2) o'sha Gmail bilan "Google bilan kirish"; (3) eski parol bilan kirish **ishlamasligi**, Google bilan kirish ishlashi;
  (4) parol kerak bo'lsa "Parolni unutdim" yangi parol beradi (`social-features.md`: u o'zgarmaydi).

**Navbatda:** T03 (V-1 chat biriktirmalari XSS).

## Faza 0 · T03 — V-1: chat biriktirmalari orqali stored XSS yopildi (2026-10-02)

- `apps/api/src/lib/attachments.ts`: `normalizeAttachmentMime` (allowlist: png/jpeg/webp/gif, pdf, txt, csv, doc/docx, xls/xlsx, zip; SVG/HTML/XML/JS
  hech qachon), `sanitizeAttachmentFileName` (spec'dagi belgilar + `#` va `%` — nom R2 kaliti orqali URL yo'liga kirgani uchun; 120 belgi, kengaytma
  saqlanadi), `attachmentResponseHeaders` (saqlangan turni QAYTA tekshiradi — eski obyektlar `application/octet-stream` + `attachment`;
  `nosniff`, `CSP: sandbox; default-src 'none'`, `Cache-Control: private, max-age=3600`; faqat inline-rasm `inline`; `filename` ASCII + `filename*` RFC 5987).
- `routes/chat.ts`: yuklash — ruxsatsiz tur `400 { code: "ATTACHMENT_TYPE_NOT_ALLOWED" }`, kalit va javobdagi nom tozalangan; berish — `attachmentResponseHeaders`
  (a'zolik tekshiruvi o'zgarmagan).
- Web: fayl `<input accept>` (server ro'yxati bilan bir xil), yuklash xatosi inline `⚠` xabar sifatida (uz/ru/en `chat.json`: `attachmentTypeNotAllowed`,
  `attachmentUploadFailed`); `ApiError.code` qo'shildi. Avval `mutateAsync` xatosi ushlanmay qolardi — endi yozilgan xabar va tanlangan fayl saqlanadi.
- Testlar: `tests/services/attachments.test.ts` (14, spec'dagi hammasi + RFC 5987), `tests/integration/chat-attachments.test.ts` (5: HTML/SVG/bo'sh tur → 400 va
  R2'ga hech narsa yozilmaydi; rasm inline + sarlavhalar; PDF attachment; eski `text/html` obyekt zararsizlanadi; begona foydalanuvchi 404).
- Tekshiruv: api testlar 28→30 fayl yashil, type-check, biome, `apps/web` build yashil.
- **Brauzerda tekshirilmadi** (chat'ga fayl yuklash). Loyiha egasi uchun qo'lda: (1) `.html` va `.svg` yuklashga urinish — chat'da qizil `⚠` xabar, 400;
  (2) PDF havolasini bosish — brauzerda ochilmaydi, yuklab olinadi; (3) rasm chat ichida ko'rinadi (preview `<img>`); (4) fayl tanlash oynasi
  faqat ruxsat etilgan turlarni taklif qiladi.
- Eslatma (kengroq muammo, bu commit'da emas): xabar WebSocket orqali `attachmentUrl` ni mijoz bergan satr sifatida qabul qiladi — kalit `chat/<conversationId>/`
  bilan tekshirilmaydi; bu T04e (V-2, WS freymlari zod) ko'lamida.

**Navbatda:** T04 (xavfsizlik gigiyenasi: a–e).

## Faza 0 · T04 — xavfsizlik gigiyenasi (a–e; har biri alohida commit)

- **T04a (S-4):** `lib/html.ts` `escapeHtml` (`&` birinchi); welcome email'dagi `user.name` va reset/verify email'lardagi `href` `url` escape qilinadi
  (`auth/index.ts`). Boshqa email shabloni yo'q (grep). Unit test `tests/services/html.test.ts` (5).
- **T04b (A-2):** `POST /:id/audit/run` — viewer `403 "You only have view access to this building."` (avval `audit_run` qatori yozilardi);
  `GET /:id/audit/report` — viewer PDF'ni yuklab oladi, lekin R2 `put` va `reportR2Key` yangilanishi faqat `canWrite` da (GET'dagi yon ta'sir to'liq Faza 2 da ketadi).
  Audit route'larida boshqa yozuv yo'q (grep: `annotations` PUT allaqachon `canWrite`). Test `tests/integration/audit-access.test.ts` (viewer 403 + qator yozilmaydi,
  editor 201; viewer PDF 200 va `reportR2Key` null, owner'dan keyin to'ladi). **UI eslatma:** natija sahifasidagi "Auditni ishga tushirish" tugmasi viewer'ga
  yashirilmagan — endi u 403 xabarini ko'radi (`results.tsx` mavjud xato ko'rsatkichi orqali); tugmani yashirish alohida UX ishi.
- **T04c (V-3):** barcha `z.number()` → `.finite()` (JSON `1e999` Infinity'ga aylanadi); `building`: harorat ±60, soat 0–24, kun 0–366, `yearBuilt` 1800–2100,
  `name`/`location`/`search`/`region` ≤300 (lat/lon allaqachon ±90/±180); `consumption`: `year` 1990–2100, summalar `finite().nonnegative()`;
  satr maydonlari (`code`/`description`/`name`/...) ≤100–10 000; `chat` (`usernames`/`addUsernames`/`removeUserIds` ≤50, username ≤320, nom ≤300), `measures` (`measureIds` ≤500,
  `lifetimeYears` ≤100), `members.email` ≤320, `users`/`admin-users` `name` ≤200, `image` ≤2048. Body limiti (`index.ts`, CORS'dan keyin): `/api/*` 1 MB,
  `…/conversations/:id/attachments` 11 MB, `413 { code: "PAYLOAD_TOO_LARGE" }`.
  **Spec jadvalidan FARQ (ataylab — D02 qoidasi: Free so'rov byudjeti ≤40 ustun):** massiv chegaralari D02 dagi kichikroq qiymatlarda qoldi
  (`consumption.bills` 144 — spec 600; `layers` 8 — 20; `openings` jami 160 — 200/element; `constructionTypes` 15, `openingTypes` 14, `buildingBlocks` 22 — 100;
  `envelopeElements` 100 — 500; `systems`-guruhlar 20–200 — hammasi 200). Spec'dagilar Paid uchun edi; byudjetga sig'masa PUT 40 so'rovdan oshib, Free'da yiqiladi.
  Real auditda bu hajmlar yetarli deb baholandi, lekin yetmasa — Paid triggeri (ADR-016), chegarani byudjetsiz oshirish emas.
  Tekshirilmagan qiymatlar (kengroq olingan): `occupantCount`, maydon/hajm yuqori chegarasi, `investmentCostUsd` yuqorisi — faqat `.finite()`.
  Testlar: `tests/services/schemas.test.ts` (17), `tests/integration/body-limit.test.ts` (3: 1 MB → 413, upload >1 MB o'tadi, >11 MB → 413).
  Tekshiruv: api 34 fayl / 173 test, type-check, E2E 7/7 yashil (forma qiymatlari yangi chegaralarga sig'adi).
- **Log gigiyenasi (nazoratchi topilmasi, security.md "loglarda email yo'q"):** `lib/email.ts` dev logidan qabul qiluvchi email olib tashlandi (faqat mavzu).
  `console.*` grep'i: boshqa email/token/URL yozadigan joy yo'q (`[chat] webSocketMessage failed` xato obyektini yozadi — shaxsiy ma'lumot emas, tegilmadi).
- **D02 dan qolgan BUG — IN ro'yxatlari (nazoratchi topilmasi, tasdiqlandi):** D1 ning 100-parametr chegarasi `inArray` elementlariga ham tegadi, lokal D1 buni qo'llaydi.
  Tuzatildi: `measures/select` (≤500 id) — batch: avval binoning hamma bayrog'i `false`, keyin ≤90 lik bo'laklar bo'yicha `true` (7 bayonot, atomik; avvalgi
  `notInArray` yo'q); `buildings` `collaboratorCounts` — `buildingIds` o'rniga subquery; `chat` ro'yxati (`convIds` ikki joyda) — subquery; **qo'shimcha topilma:**
  `POST /conversations` (direct) dagi `myDirectConvIds` ham materiallashtirilgan edi (>100 direct chat bo'lsa yangi chat ochilmasdi) — subquery. Qolgan `inArray` lar
  chegaralangan (envelope ≤15 kod, chat usernames/removeUserIds ≤50). Testlar `tests/integration/d1-parameter-limit.test.ts` (4) tuzatishdan OLDIN to'rttasi ham
  `too many SQL variables` bilan yiqildi, keyin yashil. `database.md` ga bir jumla qo'shildi.
- **T04d (V-5):** API — `secureHeaders` (`index.ts`, CORS/body-limit'dan keyin): CORP `same-site`, COOP/COEP o'chirilgan, CSP `default-src 'none'; frame-ancestors 'none'; sandbox`.
  **Spec'da yo'q tuzoq:** `secureHeaders` route'dan KEYIN ishlaydi va `ctx.res.headers.set` bilan route'ning o'z `Content-Security-Policy`sini USTIDAN YOZADI — T03 dagi
  `sandbox` yo'qolardi; shu sababli global CSP'ga `sandbox` qo'shildi (testlangan: `chat-attachments.test.ts`). WebSocket upgrade'lar o'tkazib yuboriladi (DO javobi sarlavhalari o'zgarmas) —
  **haqiqiy `wrangler dev` da WS ulanish + xabar tekshirildi (101, xabar qaytdi)**. Web — `public/_headers` (HSTS, nosniff, XFO DENY, Referrer, Permissions, CSP; inline tema skripti SHA-256
  `vSGhtd+BGY0jcAYofx0UeO2ast1Wt3E0jlI1b1Oisqc=` — `dist/index.html` dagi matn bilan bir xil ekani skript bilan tekshirildi, Vite o'zgartirmaydi); `index.html` da izoh; `dist/_headers` mavjud.
  Testlar `tests/integration/security-headers.test.ts` (3). **Haqiqiy CSP bilan** (dist'ni `_headers` CSP'si bilan Bun orqali berib, Chromium'da): login sahifasi chiqdi, inline tema skripti ishladi
  (`data-theme="dark"`), CSP buzilishi yo'q.
  **Tekshirilmadi:** Pages'dagi haqiqiy `_headers` qo'llanishi; Google OAuth, chat WS, PDF yuklab olish, Excel import CSP ostida (faqat login sahifasi sinaldi); Better Auth OAuth redirect javoblari
  secureHeaders bilan (Google'siz). **Egasi uchun deploy'dan keyin:** DevTools Console'da CSP xatosi yo'qligini tekshiring: (1) login/ro'yxatdan o'tish, (2) Google bilan kirish (redirect), (3) chat — matn,
  rasm preview, fayl yuborish, WebSocket, (4) PDF hisobotni yuklab olish, (5) Excel import/eksport (consumption tab), (6) tema almashtirish va til; (7) **Google bilan kirgan foydalanuvchining avatari ko'rinadi** (app-shell; `img-src` ga `https://*.googleusercontent.com` qo'shildi — nazoratchi topilmasi; boshqa tashqi rasm manbasi yo'q, grep: faqat `app-shell.tsx` `user.image` va chat `<img>` (API origin)). Eslatma: foydalanuvchi profilida boshqa tashqi URL rasm qo'ysa, CSP uni bloklaydi (ataylab). CSP xato bersa — `_headers` ni shu yerga qaytib tuzating.
- **T04e (V-2):** `schemas/chat.ts` — `makeIncomingWsMessageSchema(conversationId)` (`z.discriminatedUnion("type")`: message/typing/read/edit/delete; `body` ≤4000, `messageId`/`replyToId` uuid,
  `attachmentName` ≤200, `attachmentMimeType` T03 allowlist'idan, `attachmentSizeBytes` 0–10 MB, **`attachmentUrl` faqat `^/api/chat/attachments/chat/<shu conversationId>/[^/?#]+$`**) va
  `IncomingWsMessage = z.infer<…>` (eski qo'lda yozilgan interfeys o'chirildi — bitta manba). `ConversationRoom.webSocketMessage`: >64K belgili freym parse qilinmaydi; `JSON.parse` dan keyin `safeParse`,
  muvaffaqiyatsiz bo'lsa `console.warn` (userId + zod kodi/yo'li, MATNSIZ) va jim `return`. Testlar: `tests/services/ws-schema.test.ts` (4: `@evil.com/x`, boshqa suhbat, `..`, `?`/`#`, 4001 belgi, noto'g'ri uuid/tur/MIME/hajm),
  `tests/integration/conversation-room.test.ts` (3: DO'ning `webSocketMessage` i haqiqiy lokal D1 bilan fake socket'lar orqali — to'g'ri freym saqlanadi+broadcast; evil URL/uzun body/noma'lum tur/buzuq JSON/katta freym —
  saqlanmaydi va broadcast bo'lmaydi).
  **OCHIQ QOLDI:** (1) a'zolikdan chiqarilgan foydalanuvchining ochiq socket'ini yopish (DO RPC, `realtime.md`) — bu commit'da emas; (2) `notifyOfflineMembers` har a'zo uchun alohida INSERT + DO push qiladi —
  50 a'zoli guruhda bitta xabar ~100+ D1 so'rovi, `database.md` ning DO xabari ≤ 40 byudjetidan oshadi (Free'da 50/chaqiruv) — keyingi ishda bitta batch'ga yig'ish kerak (T04 ko'lamida emas).
- **T04e keyingi tuzatishlar (nazoratchi topilmalari):** (1) `edit`/`delete` freymlari endi `conversationId` bilan scope qilingan (avval `id AND senderId` — A suhbat socket'idan B dagi o'z xabarini
  tahrirlash/o'chirish mumkin edi va matn A a'zolariga broadcast bo'lardi); `replyToId` insert'dan oldin shu suhbat xabari ekani tekshiriladi (aks holda dropped + `console.warn`). HTTP `PATCH/DELETE /messages/:id`
  faqat `senderId` bilan scope qilingan, broadcast yo'q, suhbat bo'yicha ma'lumot sizmaydi — tegilmadi (eslatma: chiqarilgan a'zo o'z xabarini baribir tahrirlay oladi). Reply preview server tomonda join qilinmaydi (mijoz yuklangan xabarlardan oladi).
  (2) **`notifyOfflineMembers` production bug'i tuzatildi:** har oflayn a'zo uchun alohida INSERT + DO push (50 a'zoda ~100+ so'rov, Free 50/chaqiruvdan oshib handler yarim yo'lda yiqilardi) →
  `storeAndAnnounceMessage`: xabar + barcha notification qatorlari bitta atomik batch (`insertChunked`), jonli push ≤ 30 (`MAX_LIVE_PUSHES`). Eng yomon hisob: 2 select + 1 reply-check + (1 + ceil(49/12)=5) batch = ≤9 D1 so'rovi; 9 + 30 < 50.
  Cloudflare hujjati (WebFetch, workers/platform/limits): "Subrequests per invocation 50 (Free)", ta'rif R2/KV/D1 ni o'z ichiga oladi, DO chaqiruvi aniq tilga olinmagan → ehtiyotan sanaladi (**tasdiqlanmagan** — haqiqiy Free'da sinab ko'rilmagan, Miniflare chegarani qo'llamaydi).
  Testlar (`conversation-room.test.ts`, 7): A/B suhbat edit/delete o'zgarmaydi va broadcast yo'q; begona `replyToId` rad; 50 a'zoli guruh — 1 xabar, 49 notification, `prepare` sanagich ≤10, push ≤30; tuzatishdan OLDIN uchta yangi test yiqildi.
  Ochiq qoldi: a'zolikdan chiqarilgan foydalanuvchining ochiq socket'ini yopish (DO RPC).

## Faza 0 · T05a — `parseLocaleNumber` + `NumberInput` (hali iste'molchisiz) (2026-10-02)

- `apps/web/src/lib/number.ts`: `parseLocaleNumber` (spec algoritmi aynan: bo'shliq/NBSP/narrow NBSP/thin/`'` olib tashlanadi, `−`→`-`, ikkala ajratgich bo'lsa oxirgisi o'nlik,
  bitta `,` — en'da aniq 3 raqam bo'lsa minglik aks holda o'nlik, bitta `.` har doim o'nlik, qat'iy regex, `isFinite`, `integer`), `formatNumberForInput`, `toNumberLocale`.
  **Spec'ga bitta aniqlik:** minglik guruhi yetakchi nol bilan boshlanmaydi (`0,123` en'da 0.123, 123 emas; `1,234`/`1,234,567` spec jadvalidagidek). Qo'shimcha: `-`, `+5`, `1,234,56` — invalid.
- `src/lib/number.test.ts` — 39 test (spec jadvali to'liq + round-trip + locale xaritasi). `apps/web` ga `vitest ^2.1.8`, `test` skripti, `vitest.config.ts` (turbo `test` avtomatik oladi); `bun.lock` yangilandi.
- `src/components/number-input.tsx`: matn `<Input>` (`inputMode` decimal/numeric), lokal `i18n.language` dan, qiymatni o'zgartirmaydi, blur'da inline xato (`⚠` + matn, `role="alert"`, `aria-invalid`/`aria-describedby`),
  `integer`/`min`/`max`/`unit`/`error`. Bo'sh maydon xato bermaydi (majburiylik — formaning ishi). `common.json` (uz/ru/en): `number.invalid/min/max/integer`. **Ruscha matnni loyiha egasi ko'rib chiqsin** (`i18n-and-appearance.md`).
- **Joylashuv qarori (spec bilan bir xil):** `apps/web` da, `packages/ui` da emas — i18n'ga bog'lanmaslik va `@source` tuzog'idan qochish; 03 §6.2 taklifidan ataylab chetlanish.
- Tekshiruv: type-check, biome, `bun run build` (apps/web), `bun run test` yashil. Brauzerda tekshirilmadi (komponent hali hech qayerda ishlatilmaydi — T05b da).

**Navbatda:** T05b — barcha `type="number"` iste'molchilarini o'tkazish.

## Faza 0 · T05b — barcha raqam maydonlari `NumberInput` + `parseLocaleNumber` ga o'tkazildi (2026-10-02)

Har fayl bo'yicha:
- `components/buildings/building-form-fields.tsx` (+ `edit-building-dialog.tsx`, `routes/…/buildings/new.tsx`): 15 ta `type="number"` → `NumberInput` (butun: yil, aholi, isitish kunlari); `parseRequiredNumber/OptionalNumber`
  endi `parseLocaleNumber` (imzo + `locale`); server qiymatlari `formatNumberForInput`; bo'sh majburiy maydon va noto'g'ri qiymat — xato, `occupantCount` bo'sh bo'lsa `0` (backend default, faqat BO'SH uchun).
- `consumption-tab.tsx`: oylik/tarif/yil kataklari `NumberInput` (tor katakda `showMessage={false}`: qizil chegara + `title`), `buildBillGroupsForYear` endi invalid katakni **tashlamaydi** — saqlash to'xtaydi va "qaysi katak"lar ro'yxati
  ko'rsatiladi; yil 1990–2100 (API bilan bir xil); jonli kWh yig'indisi (faqat ko'rsatish) invalid katakni hisoblamaydi. Bir yilni ko'p tashuvchiga ketma-ket saqlash (atomik emas) — T07.
- `consumption-excel.ts`: `readNumberCell` (raqamli katak o'zi; matn — `parseLocaleNumber`, ilova lokali); noto'g'ri **tarif** endi jimgina `null` bo'lmaydi — qator xato bilan o'tkazib yuboriladi (yangi `invalidTariff`); o'qib bo'lmaydigan miqdor legacy ustunga qaytmaydi.
- `measures-tab.tsx`: `Number(x) || 20` / `|| 0` olib tashlandi — bo'sh bo'lsa default (20 yil, 0), noto'g'ri bo'lsa xato (`lifetimeInvalid`, `maintenanceInvalid`); investitsiya/narx/miqdor `parseLocaleNumber`.
- `systems-tab.tsx`: `num()`/`numOrNull()` o'rniga `RowParser` (9 bo'lim): majburiy bo'sh yoki noto'g'ri — saqlash to'xtaydi, kataklar qizil bilan belgilanadi + umumiy xabar (`invalidNumbers`); ixtiyoriy (nullable) maydonlar bo'sh = `null`;
  butun ustunlar (`personsServed`, `quantity`, `collectorCount`) `integer`; `Math.round` jimgina yaxlitlash yo'q.
- `envelope-editor/state.ts`: validatsiya `parseLocaleNumber` orqali; ixtiyoriy maydonlar (kenglik, balandlik, g, ramka, soyalanish, perimetr koeff., balandliklar) endi noto'g'ri bo'lsa **xato** (avval NaN API'ga ketardi); `toEditorState(data, locale)`.
  `calculations.ts`: `previewNumber` — noto'g'ri → 0 **faqat ko'rsatish uchun** (izoh bilan; saqlashdan oldin `state.ts` to'xtatadi). 4 ta step fayl `NumberInput` (6+1+4+6).
- `routes/…/audit.tsx` (tezkor qobiq + iste'mol qadami): `|| 0` / `|| 1` / `Math.round` yo'q; barcha maydon majburiy — bo'sh yoki noto'g'ri bo'lsa maydonlar belgilanadi va saqlanmaydi (`fixNumbers`); iste'mol qatorida yil/oy/miqdor tekshiruvi. `financial.tsx:188` dagi `type="number"` — recharts `XAxis`, forma emas.
- i18n (uz/ru/en): `common.number.*`, `consumption.invalidNumberAt*`/`invalidTariff`, `measures.ee.lifetimeInvalid`/`maintenanceInvalid`, `systems.common.invalidNumbers`/`invalidCell`, `envelope.editor.errors.numberInvalid`, `audit.wizard.*`.
  **Ruscha/o'zbekcha matnlarni loyiha egasi ko'rib chiqsin** (`i18n-and-appearance.md`).
- `NumberInput`: `showMessage` (tor katak), qizil chegara `border-destructive!` — **build'dagi CSS tekshirildi**: oddiy `border-destructive` `border-input` dan OLDIN chiqadi va yutqazardi; `!` bilan `…!important` qoidasi bor. `pr-12`, `text-destructive`, `inset-y-0` ham CSS'da.

Qabul mezonlari: `grep 'type="number"' apps/web/src` — faqat izohlar va `financial.tsx` (chart o'qi). `Number(`/`parseFloat` qoldiqlari: `consumption-tab.tsx` `Number(activeYear)` (ilovaning o'z `String(yil)` — foydalanuvchi matni emas), `chart-tooltip.tsx` (ko'rsatish).
`|| 0`/`?? 0` — faqat server ma'lumoti/ko'rsatish yoki BO'SH uchun backend default'i.
Tekshiruv: type-check, biome lint, `bun run build`, `bun run test` (web 62 + api), **Playwright 12/12 haqiqiy brauzerda** — yangi `tests/e2e/number-input.spec.ts` (5 test, bino formasi, saqlangan qiymat API'dan o'qiladi):
uz `12,5`/`12.5` → 12.5; ru `1 234,5` → 1234.5; en `1,234` → 1234; uz `1,234` → 1.234; en `12abc` → inline `⚠` xabar + `aria-invalid`, saqlash to'xtaydi.
**Qo'lda tekshirilmagan (loyiha egasi, 375 px va `sm+`):** tizimlar kartasi, iste'mol katakchalari, qobiq muharriri, tezkor audit, o'lchovlar — `12,5`, `12.5`, `1 234,5`, `12abc`, bo'sh uz/ru/en'da; xato matni 375 px da joyidan chiqmasligi (kataklarda matn yo'q, faqat belgi — shu maqsadda).
Ma'lum cheklov: tahrirlash dialoglaridagi `useEffect([open/building])` qayta-sinxronlash (U2) — T06 da `useSyncedRows` bilan.

**Navbatda:** T06 (dirty-himoya, blocker, o'chirishga tasdiq).

## Faza 0 · T06a — saqlanmagan tahrir infratuzilmasi (hali ulanmagan) (2026-10-02)

- `components/confirm-dialog.tsx` (`ConfirmDialog`: `destructive`, `pending`+spinner, fokus dastlab **Bekor**da — `onOpenAutoFocus` + `data-confirm-cancel`, chunki `@yres/ui` `Button` `ref` tipini qabul qilmaydi va `packages/ui` ga tegilmadi; Esc/overlay/× = bekor, `pending` paytida yopilmaydi).
- `components/unsaved-changes.tsx`: `UnsavedChangesProvider` (React state `Map<key, dirty>`; **Zustand emas** — sabab faylda yozilgan: holat bitta sahifa nusxasiga tegishli, global store eskirgan bayroqni boshqa binoga olib o'tardi),
  `useRegisterDirty(key, dirty)` (unmount'da o'zini o'chiradi — osilib qolgan bayroq chiqishni bloklamaydi), `useConfirmDiscard()`; ichida `useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })` (TanStack Router 1.170.17), `ref` orqali eskirgan closure yo'q;
  bitta `ConfirmDialog` ham blocker (`proceed`/`reset`), ham tab/scenario almashtirish (`pendingAction`) uchun. Provider tashqarisida hook'lar no-op (qulab tushmaydi).
- `hooks/use-synced-rows.ts` (`useSyncedRows(serverRows, resetKey)`): server o'zgarsa **faqat toza bo'lsa** qayta sinxronlanadi; `resetKey` o'zgarsa doim; `setRows` → dirty; `markClean()`. "Server o'zgardimi" — `JSON.stringify` imzosi (chaqiruvchi massivni har render'da yangidan yasaydi — havola solishtirish doim qayta sinxronlardi; qatorlar kichik) — faylda asoslangan.
- i18n (uz/ru/en `common.json`): `unsaved.title/description/discard/stay`, `confirmDelete.title/description/confirm`. **Ruscha matnni loyiha egasi ko'rib chiqsin.**
- Tekshiruv: type-check, biome, `bun run build` yashil. `useSyncedRows` ni unit sinash uchun web'da DOM/React testing kutubxonasi yo'q — xatti-harakat T06b da **haqiqiy brauzerda E2E** bilan tekshiriladi (U2 regressiya).

**Navbatda:** T06b — tizimlar kartalari, bino tab'lari, qobiq dialogi, boshqa formalar.

## Faza 0 · T06a tuzatish + T06b — saqlanmagan tahrirlar ulandi (2026-10-02)

**Nazoratchi topilmalari (T06a, alohida commit 0f3e95d):** (1) `useSyncedRows` poygasi — refetch `markClean()` dan OLDIN kelsa server qatorlari abadiy yo'qolardi → mantiq sof reducer'ga
(`missedSync`), ikkala tartib uchun unit test (6); (2) `clearAll()` olib tashlandi (mount bo'lib turgan muharrir "toza" ko'rinardi) — `confirmDiscard` action'i muharrirni unmount yoki reset qilishi shart, kontrakt context izohida.
**Qo'shimcha haqiqiy bug (E2E topdi, alohida commit):** bino formasi bo'sh "Net cooled floor area" ni `null` yuboradi, API faqat `number|yo'q` qabul qilardi → maydonni to'ldirmasdan bino yaratib bo'lmasdi (400). Sxema `.nullable()` qilindi + test.

T06b — qamrab olinganlar:
- `$buildingId/index.tsx`: sahifa `UnsavedChangesProvider` ichida, `Tabs` controlled, `onValueChange → confirmDiscard` (Radix nofaol tab'ni unmount qiladi — action editorlarni haqiqatan unmount qiladi).
- `systems-tab.tsx`: 9 bo'lim `useSyncedRows<Row>(serverRows, scenario)` + `useRegisterDirty("systems.<bo'lim>")` + saqlangach `markClean()`; scenario tab `confirmDiscard` (reset key o'zgaradi → qatorlar reset). `useEffect(setRows)` andozasi **0 ta** qoldi (grep).
- `consumption-tab.tsx`: yil bo'yicha `dirtyYears` (bir yilni saqlash boshqa yilning iflosligini tozalamaydi), yuklash/paste/import/tahrir iflos qiladi; to'liq ko'p-yilli atomik saqlash — T07.
- `envelope-editor-dialog.tsx`: boshlang'ich holat (serialize) bilan solishtirish; Esc/tashqariga/×/"Bekor" → iflos bo'lsa `ConfirmDialog`; muvaffaqiyatli saqlashdan keyin yopish tasdiqsiz; dialog yopiq → dirty `false`.
- Boshqa formalar: `buildings/new.tsx` (provider + dirty + `useRunWithoutBlocking` — saqlangach navigatsiya bloklanmaydi), `edit-building-dialog.tsx` (confirm-close; **U2 xatosi ham tuzatildi** — `useEffect([open, building])` refetch'da yozilgan matnni o'chirardi, endi faqat ochilganda),
  `measures-tab.tsx` (belgilangan tanlov `selectionTouched` — refetch tanlovni qaytarmaydi; ikkala "qo'shish" formasi), `sharing-tab.tsx` (yuborilmagan taklif emaili), `profile.tsx` (`useEffect([data])` yozilgan ismni o'chirardi — `touched` bilan; provider),
  `audit.tsx` tezkor audit (qobiq qiymatlari, iste'mol qatorlari; bosqich tugmalari `confirmDiscard`). `financial.tsx` — saqlash tugmali forma emas (grafik) — tegilmadi.
  Qo'shilmadi: chat yozish maydoni (qoralama), admin foydalanuvchi tahriri dialogi — ro'yxatda yo'q va saqlash tugmali sahifa formasi emas; kerak bo'lsa alohida.
- **Haqiqiy brauzerda** (`tests/e2e/unsaved-changes.spec.ts`, 9 test, hammasi yashil): U2 regressiya (generation kartasini saqlash ventilyatsiyadagi saqlanmagan qatorni saqlab qoladi); tab almashtirish — dialog, fokus "Keep editing"da, Keep → qator joyida, Discard → o'tadi va qator yo'q;
  toza sahifada hech qachon dialog yo'q (tab/scenario); scenario almashtirish; route'dan chiqish (router blocker); qobiq dialogi (toza — Esc darhol yopadi; iflos — dialog); bino yaratgandan keyin ogohlantirish yo'q; `beforeunload` iflosda chiqadi, toza sahifada chiqmaydi.
- Tekshiruv: type-check, biome lint, build, web 68 + api 192 test, **Playwright 21/21**.
- **Qo'lda (loyiha egasi):** 375 px da `ConfirmDialog` joylashuvi; uz/ru matnlar (ruscha ko'rib chiqilsin); iste'mol tab'ida ko'p yilli tahrir + yil saqlash; o'lchovlar tanlovi + yangi forma; profil formasi.

**Navbatda:** T06c — server obyektlarini o'chirishga `ConfirmDialog`.

## Faza 0 · T06c — server obyektini o'chirishga tasdiq (2026-10-02)

- `ConfirmDialog` ga `error` prop: muvaffaqiyatsiz o'chirish xatosi **dialog ichida** (`⚠` + matn, `role="alert"`) ko'rinadi, dialog ochiq qoladi (jimgina yutilmaydi); `pending` paytida tugma o'chiq va dialog yopilmaydi (ikki marta bosib bo'lmaydi).
- Qamrab olindi: `measures-tab.tsx` (chora-tadbir + non-EE: nomi tavsifda, `destructive`, fokus "Cancel"da), `sharing-tab.tsx` (a'zoni olib tashlash: kim kirish huquqini yo'qotishi tavsifda), chat xabarini o'chirish (hamma uchun yo'qoladi; WS orqali — natija kutilmaydi,
  shuning uchun `pending`/inline xato yo'q — asos), `delete-building-dialog.tsx` (allaqachon tasdiqli, andoza). i18n (uz/ru/en `common.confirmDelete.*`) — **ruscha ko'rib chiqilsin**.
- Grep (`mutate(`/`mutateAsync(` + delete/remove): faqat shu to'rtta; admin (rol/holat) va chat guruhidan a'zo olib tashlash UI'da yo'q / qaytariladigan (admin) — tasdiq qo'shilmadi, asos: qaytarish mumkin. Lokal (saqlanmagan) jadval qatorini o'chirish tasdiqsiz (dirty-himoya ostida), "5 soniyalik undo" — Faza 3.
- Haqiqiy brauzerda `tests/e2e/confirm-delete.spec.ts`: chora-tadbir qo'shish (`12 500,5` — T05 parse), o'chirish → dialog, fokus Cancel'da, Cancel — qoladi, Delete — yo'qoladi. Playwright jami 22/22. Xato yo'li (server o'chirishni rad etsa) brauzerda sinalmadi — qo'lda: tarmoqni uzib o'chirishga urinib ko'ring.
- Tekshiruv: type-check, biome, build.

**Faza 0 holati:** D01–D03, T01–T06 ✅; D04 §C (production cutover) loyiha egasini kutadi. **Navbatda:** T07 (iste'mol: bo'sh tashuvchini o'chirish + ko'p yilni atomik saqlash).
- **T06c nazoratchi tekshiruvi:** `delete-building-dialog.tsx` (Radix birinchi fokusni oladi — fokus "Bekor"da EMAS edi) va `deactivate-user-dialog.tsx` `ConfirmDialog` ga o'tkazildi: fokus Bekor'da, xato dialog ichida, `pending` da ikki marta bosish bloklangan;
  bino o'chirilgach navigatsiya `useRunWithoutBlocking` bilan (saqlanmagan narsa endi ahamiyatsiz). Chat guruhidan a'zoni chiqarish (`removeUserIds`) uchun UI **yo'q** (faqat API/tur) — tasdiq kerak emas.
  Brauzerda: `confirm-delete.spec.ts` bino o'chirishni ham qamraydi (fokus Cancel'da, Cancel qoldiradi, tasdiq o'chiradi va `/buildings` ga o'tadi ogohlantirishsiz); Playwright 23/23. (Oldingi commit xabaridagi "22/22" o'sha paytda `measures.spec` yiqilganini o'tkazib yuborgan edi — alohida commit bilan tuzatildi.)
  Admin deaktivatsiya dialogi brauzerda sinalmadi (admin akkaunt kerak).

## Faza 0 · T07a — iste'mol: bir so'rovda ko'p yilni atomik almashtirish (2026-10-02)

- `PUT /:id/consumption/bulk` (`routes/consumption.ts`, sxema `bulkReplaceUtilityBillsSchema`): ≤5 yil × ≤4 tashuvchi × ≤12 oy; takroriy yil/tashuvchi → 400. **Yil to'liq almashtiriladi:** yuborilgan har yilning BARCHA eski qatorlari (yuborilmagan tashuvchilar ham) bitta `delete(year IN …)` bilan o'chadi, keyin `insertChunked` — hammasi bitta `db.batch()`.
  Eng yomon holat: 1 delete + 22 insert = 23 (+auth/access ≤5) ≤ 40. Authz oldingi PUT bilan bir xil (404/403). Bitta-guruhli `PUT /:id/consumption` orqaga moslik uchun qoldi.
- Testlar `consumption-bulk.test.ts` (5): 2×2 saqlanadi; bo'sh guruh va yuborilmagan tashuvchi eski qatorlarni o'chiradi; takroriy → 400 va hech narsa yozilmaydi; 5×4×12 = 240 qator lokal D1'da o'tadi; viewer 403 / begona 404. api 38+ fayl yashil.
- Web: `api.consumption.bulkReplace`, `useBulkReplaceConsumption` (invalidatsiya), `BulkReplaceYearInput` turi.
**Navbatda:** T07b — consumption-tab "O'zgarishlarni saqlash".

## Faza 0 · T07b — iste'mol tab'i: "O'zgarishlarni saqlash" (2026-10-02)

- `consumption-tab.tsx`: boshlang'ich holat (`baseline`, yuklangan/oxirgi saqlangan grid); (yil, tashuvchi) baseline'dan farq qilsa iflos. Bitta tugma `Save changes (N)` (i18next ko'plik: uz/en `_one/_other`, ru `_one/_few/_many/_other`) — `useBulkReplaceConsumption`
  bilan bitta atomik so'rov, har iflos yilning BARCHA tashuvchilari `ENERGY_CARRIERS` dan (qattiq kodlanmagan), bo'shatilgani `bills: []` (U5 tuzatildi). >5 iflos yil — jimgina bo'linmaydi, "N yilda saqlanmagan, ko'pi bilan 5" xatosi.
  Noto'g'ri katak butun saqlashni to'xtatadi, xabarda yil/tashuvchi/oy; xatoda grid o'zgarmaydi. Yil tab'ida `●` (`role="img"` + `aria-label` "Saqlanmagan o'zgarishlar"). Toza holatda tugma disabled. Excel importdan keyin xabarga "hali saqlanmagan — saqlang" qo'shildi.
  `useRegisterDirty("consumption", iflosGuruhlar > 0)` (T06b dagi vaqtinchalik `dirtyYears` o'rniga). i18n uz/ru/en — **ruscha ko'rib chiqilsin.**
- Brauzerda `tests/e2e/consumption-save.spec.ts`: toza — tugma disabled; 2 yilda tahrir (`12,5`) → 2 ta `●`; `12abc` saqlashni to'xtatadi; bir tugma ikkala yilni saqlaydi; yangilanganda `12.5` va `7`; gaz oyi tozalanib saqlansa — yangilangandan keyin serverdan YO'Q.
  Eslatma: grid server ma'lumoti yuklangach quriladi — undan oldin yozilgan matn ustidan yoziladi (oldindan bor, kichik poyga; testda `networkidle` kutiladi).
- Tekshiruv: type-check, biome, web 68 test, api 197 test, **Playwright 24/24** (UI topshirig'i oxirida bir marta).
**Navbatda:** T08 (audit tugmasi mavjud qobiqni almashtirmasin).

## Faza 0 · T10 — backup/tiklash runbook va ADR'lar (faqat hujjat) (2026-10-02)

- Yangi: `docs/runbooks/backup-va-tiklash.md` (Time Travel, choraklik mashq, falokat restore'i, mashqlar jurnali), `docs/adr/ADR-011-backup-dr.md` (Taklif — egasi tasdig'i kutilmoqda), `docs/adr/ADR-015-workers-paid.md` (Kechiktirilgan — Free). `docs/deployment.md` va `.claude/rules/deployment.md` ga havola.
- README §4 da T09 ✅ belgisi T09 commit'ida tushib qolgan edi — shu commit'da tuzatildi.
- Tekshiruv: faqat markdown; sir/parol yo'q.

**Loyiha egasi uchun ro'yxat:**
- [ ] Birinchi tiklash mashqini runbook bo'yicha bajarib jurnalga yozish (Faza 0 chiqish mezoni).
- [ ] Cloudflare hozir Free; Paid'ga o'tish faqat ADR-016 triggerlari bo'yicha (`1102`/CPU, 40-so'rov byudjeti, 400 MB, Time Travel).
- [ ] GitHub Actions: T01 push'idan keyingi CI natijasini ko'rish; yiqilgan integratsiya testlari bo'lsa ro'yxatini Claude'ga berish.
- [ ] T02–T04 deploy qilingach: S-1 qo'lda tekshiruvi, CSP konsol tekshiruvi (T04d), chat yuklash (T03).
- [ ] Branch strategiyasi: `main` ochilsinmi (CI `push: main` va `deploy.yml` unga bog'liq)?
- [ ] ADR-011 ni tasdiqlash.

**Faza 0 holati:** barcha topshiriqlar bajarildi, D04 §C (production cutover) va tiklash mashqi loyiha egasini kutadi.

## Faza 1 · ijro paketi tayyorlandi (boshqaruvchi, 2026-10-02)

- `docs/production/faza-1/` — README + F01–F10. Har spec kodga (`b89386a`) va `3-DMTT v7.20.xlsx` ning keshlangan qiymatlariga qarshi
  tekshirilgan (sha256 `187d1996…f5a`, OneDrive `3-MTM/`). Tartib: F01 (bazasiz `computeAudit`) → F02/F03 (golden) → F04 X33 → F05 moliya →
  F06 chora-tadbir atributsiyasi → F07 "keyin" ochiq joylar + UI → F08 pol → F09 FES → F10 yakun.
- Paketda topilgan, rejada yo'q: (1) web UI qobiqning "keyin" holatini kirita olmaydi (`EDIT_SCENARIO = "before"`) — qobiq chora-tadbirlari
  UI'da doim 0 tejash beradi → F07; (2) v7.20 diskontlangan qoplanish formulasi +1 yil xato (FES 5,18 vs 4,18) → K21;
  (3) `Losses env.` da grunt elementlari faqat ish soatlari bilan → K22; (4) 06 §2.4 dagi `D39`/`N39` eskirgan (kitobda 706 124,26 / −382 339,98).
- Master rejadan chetlanish: v5 fidelity golden qatlami qurilmaydi (K1) — `faza-1/README.md` §0.
- `00-MASTER-PLAN.md`: K21–K23, Faza 1 paket havolasi; `CLAUDE.md` "Joriy faza" → Faza 1.

**Navbatda:** F01 (coder sessiya). Loyiha egasi: K21–K23 qarorlari (F10 gacha), Faza 0 dagi qolgan ro'yxat.

## Faza 1 · F01 — `computeAudit` / `loadAuditInputs` ajratildi (2026-10-02)

- Yangi `apps/api/src/services/audit-inputs.ts`: `AuditInputs` (faqat dvigatel o'qiydigan ustunlar, `Pick` bilan — JSON-mos) va `loadAuditInputs(db, buildingId)` (bitta `Promise.all`, 20 o'qish; avvalgi 16+4 bilan bir xil so'rovlar).
- `audit.engine.ts`: `computeAudit(inputs, { generatedAt })` — sinxron, `db` siz; `runFullAudit` = `computeAudit(await loadAuditInputs(...))`. Formulalar o'zgarmadi.
- Test: `tests/services/compute-audit.test.ts` (bazasiz). Eslatma: fixture `as unknown as AuditInputs` orqali yozilgan (butun DB qator shakli qo'lda to'ldirilmaydi).
- Tekshiruv: type-check, biome, api 198 test (integratsiya `audit`/`report` o'zgarishsiz yashil).
**Navbatda:** F02.
- F01 tuzatish: `AuditInputs` `Strip<>` o'rniga dvigatel o'qiydigan ustunlar bilan `Pick` (nom/manzil kabi keraksiz maydonlar yo'q); test fixture'idagi `as unknown as` cast olib tashlandi (noto'g'ri `wall_insulation` toifasi → `envelope_wall_insulation`), devor chora-tadbiri `standardizedAnnualSavingsKwh > 0` tekshiriladi (after konstruksiya `retrofitOfId` bilan). Eslatma: `apps/api/tsconfig` testlarni qamramaydi — fixture tipi vaqtincha tsconfig bilan tekshirildi.

## Faza 1 · F02 — golden ekstraktor: `expected.json` (2026-10-02)

- `tools/golden/{common,extract_expected}.py`, `requirements.txt` (openpyxl 3.1.5), `README.md`; `.gitignore` ga `tools/golden/.venv/`; `biome.json` `files.ignore` ga `apps/api/tests/golden/fixtures/**` (generatsiya qilingan JSON formatlanmaydi).
- `apps/api/tests/golden/fixtures/3-dmtt/v7.20/expected.json` — 741 yozuv, `skipped[]` bo'sh. Sinflar: G0 2 · G1 124 · G2 59(+3 matn) · G3 328 · G4 189 · G5 23 · G6 13.
- Tekshiruv: `Measures_summary` E38 = 664253,7829 · F38 = 23784,8851 · D38 = 975113,365 · G38 = 40,9972 · N38 = −654709,0246 (spec bilan mos); D39 = 706124,26; ikki marta ishga tushirishda faqat `extractedAt` farq qiladi; noto'g'ri sha256 → exit 1; noto'g'ri yorliq → exit 1 (ikkalasi qo'lda sinaldi).
- Format qarori: spec'dagi `{ "kind": "none", "excel": "> 20" }` da `excel` kalit katak manziliga band, shuning uchun matn `"text"` maydonida: `kind: "none"` (placeholder `> 20`, `n/a`, `—`), `kind: "text"` (Yes/No, tashuvchi, sinf, Checks), gorizontal oraliq — `values[]`.
- Spec'dan farqlar: (1) "before ⊆ after" tekshiruvi o'rniga element yo'qotishlari yig'indisi bo'lim jami bilan solishtiriladi (before'da Win1/Win2/D1, after'da Win4/D4 — kodlar almashgan, ⊆ noto'g'ri bo'lardi); (2) elektr balansida `H16:H24` (qator bo'yicha tejash) yozilmaydi — spec ro'yxatida faqat `H4:H14`, `H25`.
**Navbatda:** F03 (inputs.json + golden.test.ts + divergences.json; F03b ga `apps/api/tsconfig.test.json` va type-check skriptida ikkinchi `tsc -p` — yres-01 so'rovi).

## Faza 1 · F03a — davom etmoqda (commit QILINMAGAN) (2026-10-02)

- **Commit qilingan:** F01 `995d94e`+`c8d99b8`, F02 `fc1130f`, F02 qo'shimcha (H16:H24, G39/J39/K39/P39) `e71657f`. F03a hali commit qilinmagan.
- **Ishchi daraxtda (commit qilinmagan):** yangi `tools/golden/extract_inputs.py` (~450 qator, to'liq yozilgan, `common.py` ni ishlatadi). Hali `inputs.json` yaratilmagan.
- **Holat:** skript birinchi ishga tushirishda `ERROR: Envelope row 48: no geometry` bilan to'xtaydi — `Envelope!48–50` "Porch and wall projections / Abutments" qatorlarida E='W1' bor, lekin I/J (maydon) = 0 → geometriyasiz qatorlarni (I va J nol/bo'sh) o'tkazib yuborish kerak (xato emas). Undan keyingi bo'limlar (konstruksiyalar, ochiq joylar, ventilyatsiya, ... tariflar) hali bir marta ham ishga tushirilmagan — har biri birinchi ishga tushirishda xato berishi mumkin.
- **Keyingi qadamlar:** (1) 48–50-qatorlarni o'tkazib yuborish; (2) skriptni oxirigacha ishlatib `inputs.json` olish, `Envelope!K74` (W1 net 1244,918) o'z-o'zini tekshirishi o'tishini ko'rish; (3) vaqtinchalik bun skriptida `computeAudit(inputs)` xatosiz ishlashini va `Envelope!L95` (2518,855) geometriyasi mos kelishini tekshirish (`lampTypes[].name` dagi `@LAMP:<key>` ni `LAMP_TYPE_NAMES[<key>]` bilan almashtirib; F03b loader'i ham shuni qiladi); (4) noto'g'ri sha256/yorliq bilan exit 1 ni sinash; (5) F03a commit; (6) F03b: `tsconfig.test.json` + type-check skripti (yres-01 so'rovi), `tolerances.ts`, `mapping.ts`, `golden.test.ts`, `divergences.json`, `golden:report`.
- **Qarorlar (kodda izohlangan):** AuditInputs'ga `sourceSheetRef` qo'shilmadi (Pick tor) — chora-tadbirlar `id: "measure-N"` bilan; `expected.json`dagi `measures.N.*` shunga mos. Parapet issiqlik yo'qotishda yo'q (Envelope!AI105) — element sifatida kiritilmaydi. Roof/floor — maydon-qatorlari (`length = maydon, height = 1`). Ochiq joy turlari (kod, kenglik, balandlik) bo'yicha alohida. `MODEL_GAPS` ro'yxati skript oxirida (F03b `divergences.json` ga ko'chadi).
- **Ochiq savollar (loyiha egasiga hozircha yo'q, F03b da aniqlanadi):** `unexplained` tafovutlar hali ro'yxatga olinmagan (golden:report yo'q). `Consumption!V10` yorlig'i 'kWh/m3', qiymat `U10` = 9,5 (spec "V10" deganida yorliq katagini nazarda tutgan).
- **Eslatma (yres-01):** `Envelope!48–50` maydoni 0 — o'tkazib yuborish xavfsiz. `Envelope!51` ni o'tkazib YUBORMANG: u manfiy ayirma, `I51 = −2·(3,9+0,4)·G43 = −27,692 m²` (o'tish yo'lagi tutashuvi). Dvigatel element maydonini `max(0)` qiladi, shuning uchun uni manfiy element sifatida berib bo'lmaydi — C blok devorining (43/46-qatorlar) uzunligidan ayiring va izoh qoldiring. Tekshiruv: W1 jami `Envelope!K74 = 1 244,918 m²` (`Losses env. before!E7`) bilan mos kelishi kerak. (Bu yuqoridagi "manfiy uzunlikli element" qarorini almashtiradi; skript va `MODEL_GAPS` shunga moslanadi.)

## Faza 1 · F03a — `inputs.json` ekstraktori tugadi (2026-10-02)

- `tools/golden/extract_inputs.py` → `apps/api/tests/golden/fixtures/3-dmtt/v7.20/inputs.json` (`{ meta, modelGaps, inputs }`, `inputs` = `AuditInputs`). Qayta ishga tushirishda faqat `extractedAt` farq qiladi; noto'g'ri sha256 → exit 1.
- Tuzatishlar: `Envelope!48–50` (maydon 0) o'tkazib yuboriladi; `Envelope!51` (−27,692 m²) C blok devori (`el-43`) uzunligidan ayriladi (`−8,6 m`); `gains!B10` (Horizontal, bo'sh) = 0 maydon.
- Tekshiruv: `Envelope!K74` o'z-o'zini tekshirish o'tdi; `computeAudit(inputs)` xatosiz (19 chora-tadbir), devor maydoni 1244,918; **G0**: `Envelope!L95` = 2518,855 va `M95` = 7556,565 — **aynan mos** (`calculateBuildingBlockAreas`).
- `@LAMP:<key>` → `LAMP_TYPE_NAMES` almashtirish F03b loader'ida (`tests/golden/load-inputs.ts`).
**Navbatda:** F03b (`tsconfig.test.json` + type-check, `tolerances.ts`, `mapping.ts`, `golden.test.ts`, `divergences.json`, `golden:report`).

## Faza 1 · F03b — golden test, `mapping.ts`, `divergences.json` (2026-10-02)

- Yangi `apps/api/tests/golden/`: `load-inputs.ts` (`@LAMP:` → `LAMP_TYPE_NAMES`), `tolerances.ts` (06 §2.3 "boshlang'ich"), `mapping.ts`, `compare.ts`, `golden.test.ts`, `report.ts` (`bun run --cwd apps/api golden:report`), `divergences.json`.
- `apps/api/tsconfig.test.json` + `type-check` = `tsc --noEmit && tsc -p tsconfig.test.json` (yres-01 so'rovi). Testlarni qamrab olish ikkita eski strict-index xatosini ochdi (`heatloss.service.test.ts`) — tuzatildi.
- Natija: `expected.json` 741 id dan **385 tasi mapping'da** (179 tolerans ichida, 206 tashqarida — hammasi `divergences.json` da), **356 tasi `notModelled`** (sabab guruhlari bilan: per-element U/yo'qotish, balans bloklari, pul oqimi qatorlari, tashuvchi bo'yicha USD, `Checks`, `Financial parameters`). Ikki tomonlama qoida testda: yangi tafovut → yiqiladi; o'z-o'zidan yopilgan → yiqiladi; har id mapping yoki notModelled da.
- Qo'lda sinov: D3 ni ro'yxatdan olib tashlash → "new divergence" yiqildi; mos kelayotgan id ni tafovutga qo'shish → "stale divergence" yiqildi; ikkalasi qaytarilganda yashil.
- Tekshiruv: type-check, biome, `bun run test` 203 test yashil (golden 5).
- **`divergences.json` holati:** D2 (FES, F09), D3 (pol, F08), D5 (deraza ta'miri, F07), D6 (issiqlik nasosi + X33, F04), D8 (BEMS, F06), D9 (sokl/grunt ish-vaqti, devor yo'qotishi +7–9 %), D11 (soyabon/sovutish, F07), D12 (chora-tadbir atributsiyasi + jamilar, F06). **D1 (moliya) alohida id olmadi:** har chora-tadbirning moliyaviy ustunlari saqlash tafovuti bilan birga buzilgan, shuning uchun ular saqlash tafovutlariga yozilgan; F05 dan keyin qolganlari yangi tafovut sifatida chiqadi.
- **`unexplained` (spec D-ro'yxatida yo'q, sababi hali aniqlanmagan) — loyiha egasiga savol:**
  - D13 — deraza/eshik yo'qotishi: oldin 47 523 vs 27 423 kWh (+73 %), keyin 21 154 vs 22 059; (umumiy bino yo'qotishi ham shu sabab).
  - D14 — yoritish: oldin 17 045 vs 26 143 kWh, keyin 16 128 vs 15 352; №16.
  - D15 — uskunalar "keyin" 31 731 vs 24 160 kWh; №17 (Excel +5300 kWh tejash, dvigatel −10 079).
  - D16 — №13 isitish tizimi: 5 477 vs 48 563 kWh.
  - D17 — №14 quyosh suv isitgichi: kWh 15 549 vs 18 145, USD 270 vs 1 644 (tarif tashuvchisi?).
  D13–D15 kirish xaritasi (ekstraktor) xatosi bo'lishi ham mumkin — F04 dan oldin yres-01 bilan tekshirish kerak.
**Navbatda:** F04 (X33, D10). Avval D13–D17 sabablarini aniqlash tavsiya etiladi.

## Faza 1 · F03c — golden kirish xaritasi tuzatildi, unexplained tafovutlar sinflandi (2026-10-02)

- **Kirish xatolari (ekstraktor):** (1) `pipeLossReference.insulated` matn enum (`'insulated'`/`'non_insulated'`) bo'lishi kerak, ekstraktor boolean berardi → dvigatel izolyatsiyasiz quvur qiymatini 0 olardi; tuzatildi: №13 foydali delta endi 28 166,4 (`Heat distr. efficiency!L20` bilan aynan). (2) `Equipment!85–86` (chiqarish ventilyatorlari + 72 rekuperator) uskunalardan chiqarildi (kitob ularni ventilyatsiyaga qo'shadi); `equipment.after` endi mos (K100 = 24 160,219). Ventilyator elektri `fanElectricalPowerKw` nominal yig'indisi bilan qoladi (dvigatel ishlatilish koeffitsientsiz, 1630 soat) — mapping'da `Ventilation losses!I50` id si yo'q, shuning uchun alohida tafovut ochilmadi.
- Oldingi hisobotdagi "356 notModelled" noto'g'ri edi: haqiqiy raqamlar — 385 id mapping'da (180 tolerans ichida, 205 tafovutda), 368 `notModelled`.
- **Tafovut ID'lari qayta berildi** (spec'dagi D13 = diskontlangan qoplanish/F05, D14 = nasoslar/F06 bilan to'qnashmaslik uchun): 
  - D9 kengaytirildi: Socle 1/2, F1, derazalar, eshiklar — faqat ish soatlari (K22), `windowsDoors` id lari qo'shildi.
  - D3: pol + `envelope.*.total.building` (pol farqi hukmron, D9 ham ta'sir qiladi).
  - D14 (F06): №17 uskunalar `E21 = Equipment!K102 + D65` — dvigatel K102 ni (−2508,64) aynan beradi, nasoslar D65 = 7808,64 yo'q.
  - D20 (F04): yoritish soatlari 2500 vs 1630 (nisbat aynan); `K13` kirish sifatida o'qilgan.
  - D21 (F06): №13 — `/η_b` (28166,4 / 0,58 = 48562,76).
  - D22 (F06): №14 gelio — `D64` va elektr tarifi o'rniga xom ishlab chiqarish va gaz tarifi.
- `unexplained` = 0. Tekshiruv: type-check, biome, `bun run test` yashil (api 203, web 68).
**Navbatda:** F04.

## Faza 1 · F04 — generatsiya `(Q+Qd)/η`, taqsimot samaradorligi, ish kunlari (2026-10-02)

- `generation.service.ts`: `(Q+Qd)/η` (X33 yopildi), `η <= 0`/NaN → `RangeError`; yangi `calculateUnpipedDistributionLossKwh`. COP > 1 da yakuniy energiya endi musbat (unit test).
- Quvursiz taqsimot: `generation_source.distribution_efficiency` (nullable; ISI 0,98·0,85) — faqat end-use'da `distribution_system` segmentlari bo'lmasa; `cooling_system.distribution_efficiency` (NOT NULL, default 1; 0,96) → `CoolingResult.distributionLossKwh`, elektr = (yuk + yo'qotish)/SEER.
- `building.working_days_per_year` (nullable): yoritish soatlari = kunlar × kunlik soat; bo'sh → eski (isitish mavsumi) + `AuditResult.warnings` (yangi maydon, PDF'da "Input warnings").
- Migratsiya `0002_panoramic_quicksilver.sql` (faqat qo'shuvchi). Zod: η `gt(0).max(1)`. UI: tizimlar kartalarida ustun (η ∈ (0,1], tashqarisi inline xato), bino formasida "Yiliga ish kunlari" (uz/ru/en). PDF: sovutish jadvali + ogohlantirishlar. `calculation-engine.md`, `hisobot.md` yangilandi.
- Ekstraktor: formula matni tekshiriladi (`F11`, `L11`, `F15`, `L15`) va konstantalar kirish sifatida beriladi; `Building_data!D19` = 250. `inputs.json` qayta chiqarildi.
- Golden: sovutish "oldin" elektr 20 617,19 (`H15`) aynan; yoritish "oldin" 26 143 aynan; №13 delta 28 166,4. `divergences.json`: D20 endi "yoritish keyin" (Excel `Lighting!I13` = BoQ o'rnatilgan quvvat 4,59 W/m², dvigatel LED 7,4 W/m² — modelda kirish yo'q, `closesIn: Faza 2+`); `closesIn` yres-01 so'roviga ko'ra: D5 → P1 (Faza 2+), D6 → P2, D8 → P1, D9 → K22 (loyiha egasi), D11 → P1. unexplained = 0.
- Qolgan farq faqat yuqori oqimdagi kirishlardan (issiqlik talabi 420 657 vs 251 383 — D3/D9; ISI talabi 32 421 vs 22 212 — DHW modeli ish kunlari/ΔT, README ro'yxatidagi ma'lum bo'shliq): `H7`/`N7`/`H11` formulalari to'g'ri, lekin ularning kirishlari hali farq qiladi, shuning uchun generatsiya id'lari mapping'ga kiritilmagan.
- Tekshiruv: type-check, build, biome, `bun run test` (api 211, web 68) yashil.
**Navbatda:** F05 (moliya).

## Faza 1 · F04 qo'shimcha — ISI talabi ish kunlari bo'yicha, generatsiya qatorlari mapping'da (2026-10-02)

- `dhw.service.ts`: `workingDaysPerYear` berilsa `G = round(isitishKunlari·ishKunlari/365)` (163/250 → 112), `I = ishKunlari − G` (138), ΔT 55/45 (`DHW generation!F5:I5`); bo'sh → eski 365 kunlik bo'linish + `warnings[]` (yoritish ogohlantirishi bilan birlashtirilgan). Unit test 112/138, `K16 = 22 212,46264`; golden'da `K16` mos (tafovutda yo'q).
- Mapping: `Overall gener. & distrib. eff.!H7/N7/H8/N8/H11/N11` (+ D, J, H21, N21, sovutish, COP) — faqat kitobda mavjud qatorlar. Ochiq qolganlari D3 ga (issiqlik talabi 420 657 vs 251 383 — pol, D9) bog'landi; `N12/N13` D22 ga.
- `Ventilation losses!I50` (7 570,45) expected'da va `ventilation.mechanicalElectricalKwh` ga bog'langan; dvigatel 17 895,84 (nominal kW × 24 soat × kunlar, soat/koeffitsient kirishi yo'q) → **D23** (`closesIn` F06 — yres-01 qarori: F06b da fan quvvati × soat × foydalanish).
- Eski "per-source generation" notModelled guruhi olib tashlandi. unexplained = 0. type-check, biome, `bun run test` (api 213) yashil.
**Navbatda:** F05a.

## Faza 1 · F05a — moliyaviy parametrlar sxemasi va API (2026-10-02)

- `building_financial_parameters` (PK = `building_id`, cascade; faqat real stavkalar — nominal hisoblanadi), migratsiya `0003_regular_retro_girl.sql` (faqat qo'shuvchi, lokal D1'ga qo'llandi). Sukut qiymatlar `apps/api/src/lib/financial-defaults.ts` (v7.20 `D5:D23`, `baseYear` = joriy yil + 1, `pvExportEnabled = false`, ko'mir NCV `null`).
- `routes/financial.ts`: `GET/PUT /api/buildings/:id/financial-parameters` — GET saqlangan qator yoki sukut + `isDefault` (hech narsa yozmaydi), PUT upsert + `canWrite`; zod chegaralari spec bo'yicha. 404 begona, 403 viewer.
- Test: `tests/integration/financial-parameters.test.ts` (sukut, upsert, chegaralar, authz). `energy_tariff` o'chirilmadi.
- D23 `closesIn` → F06 (yres-01 so'rovi).
- Tekshiruv: type-check, biome, `bun run test` (api 217) yashil. Web'ga tegilmadi.
**Navbatda:** F05b (dvigatel).

## Faza 1 · F05b — v7.20 moliya modeli dvigatelda (2026-10-03)

- `financial.service.ts`: `deriveFinancialAssumptions()` (nominal diskont 6,08 %, nominal o'sish gaz 4,856 % / elektr 4,04 %, USD/kWh tariflar), `buildCashflow` — yil 0 capex, `Σ s_c(1+g_c)^(t-1)`, xizmat `R·I·(1+m)^(t-1)`, gorizont = `periodYears`; chiziqli o'sish, `DEFAULT_DISCOUNT_RATE`, `ENERGY_ESCALATION_RATES` olib tashlandi. IRR `null`: `Σ net <= 0` yoki CAPEX 0; boshlang'ich taxmin `D23`.
- `audit.engine.ts`: pul qiymati parametrlardan (`energy_tariff` faqat CO₂ omili uchun qoldi); `AuditResult.financialAssumptions` (yangi, PDF'dagi diskont/o'sish qatori undan o'qiydi). `loadAuditInputs` 21 so'rov. Ko'mir NCV yo'q → `warnings[]`, jim 0 emas.
- Ekstraktor: `Financial parameters!D5:D23` → `inputs.financialParameters` (formulalar `D9`, `D15` tekshiriladi), `pvExportEnabled = true`; `inputs.json` qayta chiqarildi.
- Golden: №15 NPV 158 731,35 / IRR 29,977 % aynan; №1 NPV −192 678,70 unit testda (dvigatel savings farqi D12). **D1 yopildi** (№15, №6/№7/№8 IRR ham); **yangi D13** — diskontlangan qoplanish +1 yil (kitob xatosi, №15: 4,18 vs 5,18; K21); `financial.10.npvActualUsd` D12 ga (F06 gacha). unexplained = 0.
- `hisobot.md`/`calculation-engine.md` yangilandi. type-check, build, biome, `bun run test` (api 221) yashil.
**Navbatda:** F05c (UI).

## Faza 1 · F05b qo'shimcha — golden'da moliya qatorlari ulandi (2026-10-03)

- `divergences.json`: D1 olib tashlandi (yopilgan). `notModelled`dan "Financial parameters" va "Cash-flow" guruhlari olib tashlandi.
- `mapping.ts`/`compare.ts`: vektor (`values`) qatorlari qo'llab-quvvatlanadi; `financial.1/15.cashflow.*` (yillar, yalpi std/actual, xizmat, sof, diskontlangan, jamlangan) `standardizedCashflow`/`actualCashflow` ga ulandi; №15 tolerans ichida, №1 farqi (yalpi tejamkorlik) → D12 (jamlangan diskontlangan ham D12, D13 emas). `financialParameters.*` — hosilalar `financialAssumptions`dan, qolganlari kirish sifatida.
- `faza-1/README.md` §4: F03, F04 ✅, F05 a, b ✅.
- type-check, biome, `bun run test` (221) yashil.
**Navbatda:** F05c (UI).

## Faza 1 · F05c — moliyaviy parametrlar UI (2026-10-03)

- `FinancialParametersCard` (`components/building-detail/financial-parameters-card.tsx`) — "Chora-tadbirlar" tab'i tepasida. Barcha raqam maydonlari `NumberInput`; foizlar `lib/percent.ts`dagi bitta juftlik (`fractionToPercentText` / `parsePercentAsFraction`, 0,028 ↔ 2,8 %) orqali; noto'g'ri/bo'sh majburiy maydon → inline xato va saqlash to'xtaydi (jim `0`/default yo'q), bo'sh ko'mir narxi/NCV → `null`. `isDefault` → "⚠ Sukut qiymatlar (v7.20)" belgisi; `useSyncedRows` + `useRegisterDirty("measures.financial")`; viewer'da maydonlar `disabled`, saqlash tugmasi yo'q.
- Nominal diskont/o'sish va USD/kWh tariflar **faqat o'qish**: formulani frontendda takrorlamaslik uchun GET/PUT javobiga `assumptions` (`deriveFinancialAssumptions`) qo'shildi; saqlangandan keyin yangilanadi (yozayotganda jonli qayta hisoblanmaydi).
- Saqlangach audit natijasi keshi (`["buildings", id, "audit"]`) bekor qilinadi. i18n: `measures.json` → `financial.*` (uz/ru/en). Testlar: `percent.test.ts`, integratsiya testiga `assumptions` tekshiruvi.
- **Brauzerda tekshirilmadi** (lokal baza/mock API ishga tushirilmadi): 375 px'da gorizontal scroll yo'qligi faqat kod bo'yicha (maydonlar `grid-cols-1 sm:grid-cols-2`, `Derived` qatorlar `justify-between`) — qo'lda ko'rib chiqish kerak. Build CSS'da `sm:grid-cols-2` bor.
- Tekshiruv: type-check, build, biome, `bun run test` (api 221, web 71) yashil.
- **Loyiha egasi tekshirsin — moliyaviy atamalar (uz/ru/en):** Bazaviy yil / Базовый год / Base year · Hisob davri / Расчётный период / Calculation period · Inflyatsiya / Инфляция · Real diskont stavkasi / Реальная ставка дисконтирования / Real discount rate · Real narx o'sishi / Реальный рост цен / Real escalation · Nominal diskont stavkasi / Номинальная ставка дисконтирования · IRR boshlang'ich taxmini / Начальное приближение IRR · Quyi yonish issiqligi / Низшая теплота сгорания / Net calorific value · QES eksport tarifi / Тариф на экспорт ФЭС / PV export tariff · Markaziy issiqlik / Центральное теплоснабжение / District heat · Tarif manbasi, amal qilish sanasi / Источник и дата действия тарифов.
**Navbatda:** F06 (chora-tadbir darajasida tejash).

## Faza 1 · F06a — chora-tadbir maqsadlari (2026-10-03)

- `energy_measure_target` (`measure_id` cascade, `kind`, `code`) + `non_ee_measure.proposed_for_implementation` (default `true`) — migratsiya `0004_chunky_dracula.sql` (faqat qo'shuvchi, lokal D1'ga qo'llandi). Maqsad **kod** bo'yicha (`PUT /envelope` turlarni yangi UUID bilan yaratadi).
- API: `POST /measures` endi `targets` (`.max(40)`, kod `.max(100)`) qabul qiladi; yangi `PUT /measures/:id` (maqsadlar to'plam sifatida almashadi); yangi `PUT /non-ee-measures/:id`. Bitta `db.batch()`: POST = 1 + ceil(40/25) = 3 bayonot, PUT = 2 + 2 = 4. GET javobida `targets`.
- `loadAuditInputs` hamon **21** so'rov (`with: { targets }` bitta SQL ichiga qo'shiladi). `AuditInputs`: `energyMeasures[].targets`, `constructionTypes/openingTypes[].code`.
- Dvigatel: `collectMeasureTargetWarnings` — maqsadsiz qobiq chora-tadbiri (kategoriya deltasi hamon butun; bir kategoriyada ≥ 2 bo'lsa "double counting" bilan) va "oldingi" holatda topilmagan kod uchun `warnings[]`. Non-EE: paket yig'indisiga faqat `proposedForImplementation` qatorlar (v7.20 `D39 = SUMIF(Q5:Q37,"Yes",D5:D37)`; `Non-EE measures` varag'ida Q yo'q, bayroq `Measures_summary!Q25:Q37` da).
- Ekstraktor: konstruksiya/ochiq joy `code`, `MEASURE_TARGETS` (№1: W1 + Socle 1.; №2: Socle 2; №4: R1; №5: F1, F3; №6: Win3; №7: Win2; №8: D1), non-EE `Q`. `inputs.json` qayta chiqarildi (v7.20, sha256 mos). Golden yashil, unexplained = 0; hech bir tafovut yopilmadi (D12/D21/D22/D23 F06b–c da).
- UI (`measures-tab.tsx`): qobiq kategoriyalari uchun "oldingi" turlar checkbox'lari (devor/tom/pol → konstruksiya, deraza → ochiq joy; kod bo'yicha takrorlanmaydi), jadvalda kodlar; non-EE jadvalda "Taklif etiladi" checkbox (serverga darhol PUT) va qo'shish formasida belgi. i18n uz/ru/en.
- Testlar: integratsiya (targets POST/PUT/cascade/cap 41 → 400/begona bino 404), `compute-audit` (ogohlantirishlar, non-EE proposed). type-check, build, biome, `bun run test` (api 225, web 71) yashil.
- **Brauzerda tekshirilmadi** (mock API ishga tushirilmadi); 375 px — checkbox'lar `flex-wrap`. **Loyiha egasi tekshirsin (ru):** «Какие типы конструкций/проёмов заменяются», «Цели», «Предлагается».
**Navbatda:** F06b (dvigatel: atributsiya + tashuvchi qismlari).

## Faza 1 · F06a qo'shimcha — mavjud chora-tadbirni tahrirlash (2026-10-03)

- Chora-tadbir qatorida "Tahrirlash" (qalam) tugmasi: "add" formasi (alohida dialog yo'q — forma inline) mavjud qiymatlar va maqsadlar bilan to'ldiriladi (`formatNumberForInput`), saqlash `PUT /measures/:id` (`useUpdateMeasure`, `api.measures.update`), "Bekor qilish" tugmasi. Sarlavha/tugma matni tahrir rejimida almashadi.
- Dirty holat `baseline` (yuklangan forma) bilan solishtiriladi — yangi ochilgan tahrir "saqlanmagan" emas; tahrirni boshlash `useConfirmDiscard` orqali. Binoda endi yo'q bo'lgan eski maqsad kodlari belgilangan holda ro'yxatda qoladi (olib tashlash mumkin). Maqsadsiz eski chora-tadbir ogohlantirishi endi tahrir orqali yo'qoladi.
- i18n uz/ru/en: `editTitle`, `saveEdit`, `cancelEdit`, `editAria`, `failedToUpdate`. type-check, build, biome, web testlar yashil. Brauzerda tekshirilmadi. **Ru atamalar loyiha egasi ko'rib chiqishi uchun:** «Редактирование мероприятия», «Сохранить изменения».
**Navbatda:** F06b.

## Faza 1 · F06b — chora-tadbir atributsiyasi va tashuvchi qismlari (2026-10-03)

- `heatloss`/`envelope`: issiqlik yo'qotish guruhi kaliti `(kategoriya, oldingi tur kodi)`; yangi `EnvelopeHeatLossResult.annualByTypeCode` (`kategoriya:kod`), `annualByCategory` o'zgarishsiz (yig'indi bir xil).
- Yangi `measure-savings.service.ts`: `deriveBaselineHeating` (`η_b = Σ(Q+Qd)/Σ yakuniy`, tashuvchi ulushlari), `calculateGainsUtilizationCorrection` (D71 = 1 + H12/Σ(H4:H8)), `resolveMeasureSavings` — qobiq (maqsad kodi bo'yicha ÷η_b×D71), ventilyatsiya (issiqlik + / fan −), isitish tizimi (÷η_b, D71 siz), qozon/issiqlik nasosi (`(Q+Qd)_keyin/η_b − yakuniy_keyin` tashuvchi bo'yicha), yoritish/uskuna/FES, gelio (ISI tashuvchilari bo'yicha), EMS (keyingi tashuvchilar bo'yicha). `inferCarrierForMeasure` va eski `resolveMeasureStandardizedSavingsKwh` olib tashlandi.
- `EnergyMeasureResult`: `usefulSavingsKwh`, `savingsByCarrier[]` (std/actual kWh va USD), mavjud jami maydonlar = qismlar yig'indisi; CO₂ = Σ qism × tashuvchi omili; kalibrlash har qism o'z tashuvchisi nisbati bilan; pul oqimi qismlar bo'yicha. `AuditResult.gainsUtilizationCorrection`.
- Golden: yopildi — №1/№2/№4/№7/№8 (D12 qatorlari), №13 (D21), №11 qator-qator (D6); `balanceCheck.gainsUtilisationCorrection` (D71 = 0,974225) ulandi va mos. D5 ga №6/№10 ning ikki yangi qatori (infiltratsiya ulushi, P1). Fresh/unexplained = 0.
- Qilinmadi (spetsifikatsiya bo'yicha): G16 infiltratsiya ulushi (D5), D65 nasoslarini №11→№17 ko'chirish (D14 ochiq), BEMS EN ISO 52120 (D8).
- Testlar: `measure-savings.service.test.ts` (qo'shni ikki devor — yig'indi = kategoriya deltasi; issiqlik nasosi gaz +/elektr −; ventilyatsiya fan −; D71 = 1). `calculation-engine.md`, `hisobot.md` yangilandi. type-check, build, biome, `bun run test` (api 232, web 71) yashil.
**Navbatda:** F06c (balans nazorati `measureBalance` + `all`/`proposed` jamilar).

## Faza 1 · F06c — balans nazorati va jamilar (2026-10-03)

- `AuditResult.measureBalance[]` (`audit.engine.ts` `buildMeasureBalance`): har tashuvchi uchun Σ barcha chora-tadbirlar vs oldin−keyin yakuniy energiya (generatsiya, yoritish, uskuna, sovutish, FES/gelio ishlab chiqarishi va EMS qismlari qo'shiladi, chunki ular "keyin" end-use modelida yo'q); `ok` — `|farq| < 1 %` (elektr: yoki `< 10 kWh`).
- `AuditSummary.all` / `.proposed` (`MeasurePackageTotals`, v7.20 38/39-qatorlar): capex (non-EE o'z `proposed` bayrog'i bo'yicha), kWh/USD (std/actual), oddiy qoplanish, CO₂, NPV (Σ NPV − non-EE), IRR (yig'ilgan pul oqimidan; kitobda tekshirilmagan). Eski `summary.total*` = `proposed`. Golden `totals.*` endi to'g'ridan-to'g'ri `summary.all/proposed` dan; `totals.proposed.investmentUsd` D12 dan o'zi yopildi (non-EE endi faqat taklif etilganlar).
- Golden: `balanceCheck.*` (D67/E67/D68/E68) ulandi, lekin tolerans tashqarisida (gaz 738 661 vs 496 821; elektr 137 923 vs 167 433) — yuqoridan kelgan D3 (pol) va D5/D9/D22 farqlari; D3 ga yozildi, unexplained = 0. **Qabul mezoni "3-DMTT da ikkala tashuvchi `ok`" hali bajarilmadi** — F08 (D3) dan keyin qayta tekshirish kerak. Ekstraktor (maqsad kodlari, non-EE `Q`) F06a da bajarilgan edi.
- Testlar: `compute-audit.test.ts` (all/proposed, balans shakli). `calculation-engine.md`, `hisobot.md` yangilandi. type-check, build, biome, `bun run test` (api 233, web 71) yashil.
**Navbatda:** F07 (ochiq joy turi bo'yicha "keyin" + qobiq muharriri).

## Faza 1 · F07 — ochiq joy "keyin" turi va qobiq "keyin" muharriri (2026-10-03)

- Dvigatel: `getEffectiveOpeningType` "keyin"da `retrofitOfId` bo'yicha almashtiradi (konstruksiyalar bilan bir xil; moslik **kod** bo'yicha — bir kodning barcha o'lchamlari bitta almashtirishni oladi); almashtirilmagan tur o'z U-qiymatini saqlaydi. Eski ma'lumot (kategoriyada keyingi turlar bor, hech birida `retrofitOfId` yo'q) → avvalgi xatti-harakat + `warnings[]`; bog'lanmagan keyingi tur, bog'langanlar bilan birga, ishlatilmaydi va ogohlantiradi (`collectOpeningRetrofitWarnings`). Quyosh tushumlari shu funksiyadan foydalanadi — o'zgarishsiz.
- API: `openingTypes[].retrofitOfCode` (noma'lum kod → 400); `loadAuditInputs`ga `retrofitOfId`. **Qo'shimcha topilma:** "oldin" qobig'ini qayta saqlash "oldin" turlarini yangi id bilan yaratadi, "keyin" turlari esa FK orqali ularga bog'langan — shuning uchun `scenario: "before"` PUT avval "keyin" turlarining `retrofit_of_id`sini `NULL` qiladi (+2 bayonot; byudjet izohi yangilandi, ≤ 39). Natija: "oldin" qayta saqlansa, "keyin" bog'lanishlari tanlovi tiklanadi (UI'da ogohlantirish bor). "keyin" saqlash oldingi elementlarni o'chirmasligi integratsiya testida.
- UI: muharrir dialogida Oldin/Keyin almashtirgich (`EDIT_SCENARIO` olib tashlandi). "Keyin"da faqat konstruksiya va ochiq joy turlari qadamlari, har qatorda majburiy "Almashtiradi" tanlovi (toifa mos, bitta oldingi turni bitta keyingi tur), almashtirilmaganlar "O'zgarishsiz saqlanadi: …" deb ko'rsatiladi; bloklar `buildingBlocks` yuborilmaydi. Rejim almashtirishda saqlanmagan tahrir uchun tasdiq. i18n uz/ru/en.
- Golden: ekstraktor V4→Win2, D4→D1, Win4 bog'lanmagan; `inputs.json` qayta chiqarildi. O'zi yopilgan tafovut qatorlari (`divergences.json`dan olib tashlandi): D5 `measures.6.irrStandardized`, D6 `financial.11.npvActualUsd`, `measures.11.actualSavingsKwh`, D12 `measures.4.npvStandardizedUsd`. unexplained = 0.
- Testlar: unit (bir tur almashtiriladi, ikkinchisi o'zgarmaydi; eski ma'lumot + ogohlantirish; bog'lanmagan tur), integratsiya (retrofitOfCode, 400, before qayta saqlash FK). type-check, build, biome, `bun run test` (api 239, web 71) yashil.
- **Brauzerda tekshirilmadi** (mock API ishga tushirilmadi). Qo'lda tekshirish: qobiq tab'i → Tahrirlash → "Keyin" → tur qo'shish, "Almashtiradi" tanlash → saqlash → Natijalarda qobiq chora-tadbiri tejashi paydo bo'ladi; 375 px'da `sm:grid-cols-*` bir ustunga tushishi, scenariy tugmalari sig'ishi. **Ru atamalar loyiha egasi ko'rib chiqishi uchun:** «Заменяет», «Остаются без изменений», «сценарий «После»».
**Navbatda:** F08 (pol: grunt zona usuli).

## Faza 1 · F07 tuzatish — "oldin" qayta saqlanganda almashtirishlar saqlanadi (2026-10-03)

- Muammo: `PUT /envelope` `scenario: "before"` barcha "keyin" turlarining `retrofit_of_id`sini `NULL` qilardi — auditor "oldin"da bitta maydonni tuzatsa almashtirishlar jimgina yo'qolardi (forms-and-numbers.md bilan zid).
- Tuzatish (`routes/envelope.ts`): batch'dan oldin bitta `union all` select bilan joriy after→before **kodlar** o'qiladi; batch ichida `PRAGMA defer_foreign_keys = on` → odatdagi delete/insert → har jadval uchun bitta `CASE` UPDATE har "keyin" turini yangi "oldin" turiga (shu kod bo'yicha) qayta bog'laydi. Kod endi yo'q bo'lsa — `NULL` (dvigatel "almashtirish ko'rsatilmagan" ogohlantirishini beradi). UI'dagi "bog'lanishlar tiklanadi" ogohlantirishi olib tashlandi.
- **Byudjet:** "oldin" PUT: 32 (massivlar) + 1 o'qish + PRAGMA + ≤ 2 UPDATE + sessiya/kirish 4 = 40. Shunga `MAX_ENVELOPE_OPENINGS_TOTAL` **160 → 150** qilindi (−1 bayonot); izoh va `schemas.test.ts` yangilandi. Shubha: real bino 150 tadan ortiq ochiq joy qatoriga ega bo'lsa, chegara oshiriladi (yoki Paid'ga o'tish).
- Testlar: o'zgarmagan kodlar bilan qayta saqlash → `retrofitOfId` yangi "oldin" turiga ko'rsatadi; kod olib tashlansa faqat shu tur `NULL`, qolgani saqlanadi. type-check, build, biome, `bun run test` (api 240, web 71) yashil.
**Navbatda:** F08.

## Faza 1 · F08a — pol turlari: sxema, API, UI (2026-10-04)

- `envelopeElementCategoryEnum` + `EnvelopeElementCategory`: `floor_ground`, `floor_over_unheated` (qo'shuvchi; `floor` — eski ma'lumot). Migratsiya `0005` (`construction_type.temperature_reduction_factor`, `ground_length_m`, `ground_width_m`, hammasi nullable) va versiyalangan ma'lumotnoma migratsiyasi `0006` (`INSERT OR IGNORE`: `floor_over_unheated` Rsi 0,115 / Rse 0,167; `floor_ground` — zona usuli Rsi/Rse ni chetlab o'tadi, qator faqat yo'qolmasligi uchun 0,17/0,04). `reference-data.ts` bilan juft (testlar seed'i).
- API: `constructionTypes[]` ga `temperatureReductionFactor` (`gt(0).max(1)`, `floor_over_unheated` da majburiy, `socle_unheated` da ixtiyoriy), `groundLengthM/WidthM` (`gt(0).max(1000)`, `floor_ground` da ikkalasi majburiy) — `superRefine`. Qo'shuv ustunlari 7 → 10: bo'lak 14 → 10 qator, 15 tur uchun hamon 2 bayonot — byudjet o'zgarmadi.
- Dvigatel (faqat minimal): yangi toifalar maydon taqsimotida (`floorAreaM2`) va `envelope_floor_insulation` chora-tadbiri toifalarida qo'llab-quvvatlanadi; eski `floor` elementi bor binoda `warnings[]` ("Floor type is not specified…"). **Zona usuli va `n`-faktor hisobi — F08b**, shuning uchun yangi turlar hozircha oddiy `U·A·Δt` beradi (golden o'zgarmadi, D3 ochiq). `socle_unheated` ning `n` si ham F08b da qo'llanadi.
- UI: qobiq muharriri kategoriya ro'yxatida yangi turlar; `floor_over_unheated`/`socle_unheated` da "Harorat kamaytirish koeffitsienti n" (`NumberInput`), `floor_ground` da "Blok uzunligi/kengligi" (`NumberInput`; U-qiymat badge'i yashiriladi — zona U ni dvigatel hisoblaydi, F08b). Noto'g'ri qiymat → inline xato, saqlash to'xtaydi. Hisobot/UI yorliqlari (uz/ru/en).
- Testlar: integratsiya (majburiy maydonlar → 400, `n > 1` → 400, saqlash/qaytarish), `compute-audit` (eski `floor` ogohlantirishi, yangi turlar jim). type-check, build, biome, `bun run test` (api 243, web 71) yashil; migratsiyalar testlarda lokal Miniflare D1'ga qo'llanadi.
- **Brauzerda tekshirilmadi** (yres-08 UI tekshiruvi uchun): konstruksiya turi qatorida kategoriya almashtirilganda maydonlar paydo bo'lishi, 375 px'da `sm:grid-cols-3` bir ustunga tushishi.
- **Loyiha egasi tekshirsin (ru/uz atamalar):** «Коэффициент снижения температуры n», «Длина/Ширина блока», «Пол по грунту», «Пол над неотапливаемым пространством» · «Harorat kamaytirish koeffitsienti n», «Gruntdagi pol», «Isitilmaydigan bo'shliq ustidagi pol».
**Navbatda:** F08b (dvigatel: zona usuli, `n`, golden, extract_inputs; so'ng F06c balans nazoratini qayta tekshirish).

## Faza 1 · F08b — pol zona usuli va `n`-faktor, balans qayta tekshiruvi (2026-10-04)

- `uvalue.service.ts`: `calculateGroundFloorUValue` (2 m zonalar, `R_ni` = 2,1/4,3/8,6/14,2, ΣR faqat `0 < λ < 1,2` qatlamlardan, `U_eq = Σ(A_i/R_i)/(L·W)`, Rsi/Rse yo'q) va umumiy `calculateConstructionTypeU` (`floor_ground` zona; `floor_over_unheated`/`socle_unheated` `U·n`, null = 1; eski `floor` oddiy). Dvigatel ham, hisobot (`report-data.service.ts`) ham shuni chaqiradi — ikki joyda ikki xil U bo'lmasin. `AuditResult.groundFloorZones[]` (zona maydonlari, `R_i`, `U_eq`; `hisobot.md` B-bo'lim qatori ❌ Annex 2). `floor_ground` blok o'lchamisiz → oddiy yig'indi + `warnings[]`.
- **Chekka holat (spec'da aniq emas, men tanladim):** zona I dagi `+16` (4 burchak 2×2 ikki marta) faqat ikkala tomon ≥ 4 m bo'lsa qo'shiladi; `L < 4` da faqat zona I = `L·W` (burchak o'tishmasi yo'q). Kitob faqat 50,3×12,8 ni tekshiradi.
- Golden: `extract_inputs.py` — F1 → `floor_ground` (50,3 × 12,8, `S110:S111`), F3 → `floor_over_unheated` (`n` = `T134`/`U134`, Rsi/Rse `T131:T132`); `mapping.ts` pol toifalari uch tur. U'lar kitob bilan mos: F1 **0,28796 / 0,14961**, F3 **0,77269 / 0,12090** (unit testlar ±1e-4 va golden). F3 yo'qotishi 7173 vs 7140 kWh (0,5 %, tolerans ichida).
- **Divergences.json:** **D3 yopildi (olib tashlandi).** O'zi yopilgan qatorlar: `financial.5.irrActual`, `measures.5.discountedPaybackStandardizedYears`, `measures.5.irrStandardized` (D3); `financial.1.{cashflow.accumulatedDiscountedStandardUsd, cashflow.grossActualSavingsUsd, npvActualUsd}`, `measures.1.{actualSavingsKwh, actualSavingsUsd}` (D12); `financial.13.npvActualUsd` (D21). D3 ning qolgan 21 qatori **D9 ga ko'chirildi**: tajriba (vaqtincha non-operating soatlarni socle/F1/deraza/eshikdan olib tashlash) envelope jami (walls, windowsDoors, floor, building) ni tolerans ichiga olib keldi — pol qoldig'i faqat D9 (kitobda F1 8490 kWh, dvigatelda 14713). Yangi qatorlar (isitish talabi o'zgargani sababli kalibrlash chegarada siljidi): D12 ga `measures.4.{npvStandardizedUsd, co2ReductionTonnesPerYear}`, `financial.7/8.npvActualUsd`; D6 ga `measures.11.actualSavingsKwh`, `financial.11.npvActualUsd`. unexplained = 0.
- **F06c balans nazorati qayta tekshirildi — hali `ok` EMAS:** gaz Σ chora-tadbir 471 867 vs oldin−keyin 520 937 kWh (−9,4 %, kitobda ikkalasi 496 821), elektr 135 498 vs 174 228 (−22,2 %; kitobda 167 433). Sabab: (1) D9 — dvigatel qobiq yo'qotishini oshirib, isitish talabi +5,6 % (253→265 MWh foydali), shu sababli "oldin−keyin" tomoni yuqori; (2) chora-tadbir yig'indisi past — D5 (infiltratsiya ulushi, №6/№10), D22/D12 qatorlari; D9 ni (tajribada) olib tashlasak isitish talabi kitobdan −7 % pastga o'tadi, ya'ni D9 dan tashqari boshqa hissalar ham bor va ular hali ajratilmagan (F10 da qayta ko'rish). Koeffitsient "to'g'rilash" uchun o'ylab topilmadi. `balanceCheck.*` qatorlari D9 ostida.
- `calculation-engine.md`, `hisobot.md` yangilandi. type-check, build, biome, `bun run test` (api 249, web 71) yashil. F08 ✅ (README).
**Navbatda:** F09 (yres-08 alohida branch'da), F10.
## Faza 1 · F09 — FES: o'z iste'moli / eksport, solishtirma sarf qirqilmaydi (2026-10-04)

- `AuditResult.renewableBalance` (`calculateRenewableBalance`): yillik `self = MIN(ishlab chiqarish, talab)`, `export = qolgani`, `coverageRatio`; talab = yoritish + uskuna + sovutish + elektr isitish/ISI + ventilyator fani − BEMS elektr tejashi (`audit.engine.ts`). FES chora-tadbiri: `self` retail tarifda + eksport yoqilgan bo'lsa `export` eksport tarifida (`CarrierSavingPart.usdPerKwh`); o'chiq bo'lsa surplus pulga aylanmaydi (K4). Balans nazoratida FES shu "hisobga olingan" kWh bilan.
- `AuditSummary`: `potentialEnergyUseKwhPerM2Year` FES bilan **qirqilmagan** (manfiy mumkin), yangi `potentialEnergyUseWithoutPvKwhPerM2Year`; joriy/keyin jamiga ventilyator elektri, keyin jamiga BEMS tejashi qo'shildi. Natijalar sahifasi va PDF xulosasida manfiy qiymat "(sof eksportchi)" (uz/ru/en); PDF'da alohida "FES balansi" bo'limi. `hisobot.md`, `calculation-engine.md` yangilandi.
- Golden: `pv.electricityDemandKwh/selfConsumedKwh/exportedKwh/productionValueUsd` va `compare.specific*` mapping'ga ulandi (notModelled'dan chiqdi); `pv.productionValueUsd`, `measures.15.*` (E19/F19/I19) tolerans ichida. Qolgan 6 id — yangi **D24** (formula to'g'ri, kirish farqlari yuqoridan): F08b dan keyin "keyin" elektr farqi +26 650 kWh = D20 yoritish (+9 384) + D6 isitish elektri (+3 397) + D23 ventilyator (+10 325) + D8 BEMS (+3 285), ~258 kWh qatorma-qator tekshirilmagan; solishtirma "keyin" farqi +D22 (gelio ISI 15 549 kWh dvigatelda yakuniy energiya deb sanaladi); "oldin" — D5/D9 (D3 ni F08b yopdi). unexplained = 0.
- Testlar: `calculateRenewableBalance` (eksport, ishlab chiqarish < talab, talab 0), PV chora-tadbiri (eksport o'chiq/yoqiq), integratsiya (manfiy solishtirma, qirqilmaydi). **Spec'dan chetlanish:** README "D2 yopiladi" — bunday yozuv divergences.json'da yo'q edi (raqamlash o'zgargan); o'rniga D24 qo'shildi.
- Eslatma: `bun run --cwd apps/api type-check` worktree'da `report.service.test.ts`da 4 ta `Buffer` xatosi beradi (F09 dan oldin ham, HEAD'da ham) — `@types/node` hal qilinmagan; rebase'dan keyin qayta tekshiriladi.
- **F06c balans (F08b+F09 dan keyin):** gaz yig'indi 471 867 vs 520 937 (−9,4 %), elektr 135 498 vs 174 228 (−22,2 %) — ikkalasi hamon `check` (kirish farqlari D5/D9/D20/D23/D6/D8/D22). Solishtirma: oldin 244,3 (kitob 234,7), keyin FESsiz 47,7 (30,9), FES bilan −12,3 (−29,0) kWh/m²·y.
**Navbatda:** F10.

## Faza 1 · F10 — yakun: qoidalar, golden qat'iylashtirish, loyiha egasi qarorlari (2026-10-04)

- `bun run golden:report`: matched 273, mismatched 190 — barcha 190 `divergences.json`dagi ochiq yozuvlar bilan qoplangan, `unexplained` = 0 (README §5 holati yuz bermadi).
- **Loyiha egasi qarorlari (2026-10-04, hammasi tavsiya bo'yicha qabul qilindi):**
  - **K21** — v7.20 diskontlangan qoplanish formulasi 1 yilga ortiq beradi: dvigatel to'g'ri qoladi, Excel v7.21da tuzatiladi. `divergences.json` D13 → `accepted`.
  - **K22** — `Losses env.`: grunt bilan tutashgan elementlar (Socle 1, Socle 2, F1) faqat ish soatlari bilan hisoblanadi (devor/tom/F3 — ikkala davr): metodik asos auditor tomonidan tasdiqlangan deb hisoblanadi, dvigatel **Faza 2 boshida** tasdiqlangan qoidaga keltiriladi. `divergences.json` D9 → `accepted`, `closesIn: "Faza 2 boshida"`.
  - **K23** — P1 tafovutlar (D5 infiltratsiya ulushi, D6 oylik SCOP, D8 BEMS, D11 soyalash/sovutish, D14 nasoslar atributsiyasi) Faza 1 chiqishini to'smaydi. Hammasi `divergences.json`da → `accepted` (sana 2026-10-04), keyingi faza havolasi saqlangan (P1/P2, Faza 2+). D14ning avvalgi `closesIn: "F06"` yozuvi noto'g'ri edi (F06 buni yopmagan) — `"P1 (Faza 2+)"`ga tuzatildi.
  - `00-MASTER-PLAN.md` §5 jadvalidagi K21–K23 qatorlariga qaror+sana qo'shildi; Faza 1 sarlavhasiga "✅ bajarildi (2026-10-04)" + yakun paragrafi.
- **Hujjatlar:** `.claude/rules/calculation-engine.md` — X33 (allaqachon F04), X75/X83 (F08b), X88 (F09), X93/X95 (F06b), X38/X86 (F05b) bandlari endi "yopildi (F0N)" deb belgilangan inline; "standardized vs actual" tushuntirishi F06b bullet ichida tashuvchi qismlari bilan allaqachon qayta yozilgan edi (qo'shimcha o'zgarish kerak bo'lmadi). `hisobot.md` tekshirildi — F04–F09 da qo'shilgan barcha `AuditResult` maydonlari (`savingsByCarrier`, `gainsUtilizationCorrection`, `measureBalance`, `summary.all/proposed`, `renewableBalance`, `groundFloorZones` va h.k.) jadvalda allaqachon bor edi, o'zgarish kerak bo'lmadi. `docs/data-dictionary.md` boshiga v5/v7.20 eslatmasi qo'shildi. `06-sifat-test-va-reliz.md` §2.4dagi eskirgan raqamlar tuzatildi: taklif etilgan CAPEX 702 496,08 → **706 124,26** (`D39`), taklif etilgan NPV −378 471,01 → **−382 339,98** (`N39`).
- **Ochiq qolgan muhim band — F06c ning o'z qabul mezoni ("3-DMTT balans ikkala tashuvchida ok") F08b+F09dan keyin ham bajarilmagan:** gaz 471 867 vs 520 937 kWh (−9,4 %), elektr 135 498 vs 174 228 (−22,2 %). Asosiy hissa — D9 (K22, grunt bilan tutashgan elementlarning ish-soatlari qoidasi), qolgani D5/D12/D22/D24 bilan birga, **ajratilmagan holda**. README §7/F10 qabul mezoni ("beshta jami raqam tolerans ichida **yoki** ularni buzayotgan tafovutlar K23 ro'yxatida aniq ko'rsatilgan") formal jihatdan bajarilgan deb hisoblanadi, chunki hech bir tafovut `unexplained` emas va barchasi hujjatlashtirilgan/qabul qilingan — lekin bu balans farqi **Faza 1 "to'g'ri hisob" maqsadining o'zi** nuqtai nazaridan ochiq qoladi. Dvigatel kodi yoki tolerans o'zgartirilmadi (buni "o'tkazish" uchun koeffitsient o'ylab topilmadi) — Faza 2 boshida K22 asosida qayta ko'riladi.
- **Boshqa ochiq bandlar (loyiha egasi uchun):**
  - F08b da tasdiqlanmagan taxmin: grunt zonasi usulida zona I ga `+16 m²` (4 burchak) faqat blokning **ikkala** tomoni ≥ 4 m bo'lsa qo'shiladi; bu qoida faqat kitobning bitta bino o'lchami (50,3 × 12,8 m) bilan tekshirilgan, boshqa o'lcham kombinatsiyalari (masalan bir tomoni < 4 m) kitobga qarshi tasdiqlanmagan.
  - F09 spec'i (`F09-fes.md`) "D2 yopiladi" deb yozgan edi, lekin shu paytda `divergences.json`da D2 degan yozuv yo'q edi (raqamlash o'zgargan edi) — buning o'rniga yangi **D24** qo'shildi; bu F09 yozuvida ham qayd etilgan.
- **Tekshiruvlar:** `bun run test` (`apps/api`) — 254/254 yashil, golden shu ichida (`unexplained` = 0). Faqat hujjat + JSON o'zgardi — `bunx biome lint`/`biome check` `divergences.json`da yashil (avtomatik qayta formatlandi).
- **Faza 1 holati:** ✅ bajarildi (2026-10-04, `00-MASTER-PLAN.md`), yuqoridagi F06c balans bandi bilan — bank hisobotiga chiqishdan oldin loyiha egasi shu bandni ko'rib chiqishi tavsiya etiladi.
**Navbatda:** Faza 2 (`docs/production/faza-2/`).

## Faza 2 · A01 — `ENGINE_VERSION`/`METHODOLOGY_VERSION` konstantalari va oshirish qoidasi (2026-10-04)

- `apps/api/src/services/engine-version.ts` (yangi, `audit.engine.ts` va golden fayllarga tegilmagan): `ENGINE_VERSION = "0.9.0"` (Faza 1 hali F10'dan keyin ham A11'da `1.0.0`ga ko'tariladi), `METHODOLOGY_VERSION = "3-DMTT v7.20"`.
- `AuditResult`ga maydon qo'shilmadi (A01 spec "Qilmang" bandi) — versiya snapshot qatorida saqlanadi (A04/A05).
- `Env`ga ixtiyoriy `GIT_SHA?: string` (`src/index.ts`); `.claude/rules/deployment.md`dagi API deploy buyrug'iga `--var GIT_SHA:$(git rev-parse --short HEAD)` qo'shildi (sir emas — `[vars]`).
- `GET /health` javobi endi `{ status: "ok", engineVersion, gitSha }` (`gitSha` sozlanmagan bo'lsa `null`) — `future-platform.md` kuzatuv bandi bilan mos, ichki ma'lumot oshkor qilmaydi.
- `.claude/rules/calculation-engine.md`ga oshirish qoidasi bandi qo'shildi: raqam o'zgarsa MINOR, faqat shakl qo'shilsa PATCH, metodika kitobi versiyasi almashsa/maydon olib tashlansa MAJOR, baytma-bayt bir xil refaktor — oshirilmaydi; Faza 1'ning qolgan/kelgusi topshiriqlari ham shu qoidaga bo'ysunadi.
- Testlar: yangi `apps/api/tests/integration/health.test.ts` — `/health` `engineVersion`/`gitSha: null`ni tekshiradi. type-check, build, biome lint, `bun run --cwd apps/api test` (255/255, avvalgi 254 + yangi 1) yashil.
- Chetlanish yo'q — spec aniq va kod bilan ziddiyatsiz bajarildi.
**Navbatda:** A02 (`audit_event` jadvali + revision mexanizmi; `findAccessibleBuilding` bitta so'rov; `buildings` route'lari).

## Faza 2 · A02 — `audit_event` jadvali + revision mexanizmi; `findAccessibleBuilding` bitta so'rov (2026-10-04)

- `packages/db/src/schemas/audit-events.ts` (yangi) — `audit_event` jadvali: `buildingId`/`actorUserId` **FK'siz** (ataylab —
  jurnal bino/foydalanuvchi o'chirilishiga bog'lanmasligi kerak), `entity`/`action` enum (`enums.ts`ga `auditEntityEnum`/
  `auditActionEnum` qo'shildi, `systems.*` har bir "replace rows" route uchun alohida), `entityRevision` NOT NULL,
  `summary` json, `requestId`. Indekslar: `uniqueIndex(buildingId, entity, entityRevision)`, `index(buildingId, createdAt)`.
  Migratsiya `0007_open_stranger.sql` (jadval, FK/`PRAGMA foreign_keys=OFF` yo'q) + `--custom` `0008_audit_event_append_only.sql`
  (`BEFORE UPDATE … RAISE(ABORT, …)`; **DELETE trigger qo'yilmadi** — `resetTestDb()` har testdan oldin oddiy `DELETE` qiladi).
- `apps/api/src/lib/audit-event.ts` (yangi): `auditEventStatement(db, c, input)` — `entityRevision`ni SQL subquery bilan
  hisoblaydi (`max(entityRevision)+1`); `expectedRevision` berilsa `case when … then … else null end` — mos kelmasa subquery
  `NULL` qaytaradi, NOT NULL ustun buzilib butun `db.batch()` orqaga qaytadi (D1 batch = tranzaksiya). `isRevisionConflict(err)`
  — `err`/`err.cause` zanjirida (≤5 qavat) `"audit_event.entity_revision"` matnini qidiradi; haqiqiy D1 xato matni mahalliy
  Miniflare'da tasdiqlangan (`NOT NULL constraint failed: audit_event.entity_revision`, `cause.message`da ham bor).
  `getRevisions(db, buildingId, entities)` — bitta `group by entity` so'rov, yo'q entity uchun `0`. `summary` 8 KB'dan oshsa
  `{ truncated: true }`ga almashtiriladi (PII/xom payload hech qachon yozilmaydi).
- `lib/building-access.ts`ning `findAccessibleBuilding()` endi bitta `LEFT JOIN` so'rovi (`building` ⟕ `building_member`,
  shu `userId` bilan scope qilingan) — semantika o'zgarmadi (egasi → `owner`, a'zo → rol, aks holda `null`), faqat so'rov soni
  2 → 1. `schemas/envelope.ts`dagi byudjet izohi yangilandi: "oldin" PUT 40 → **39** (A09a `audit_event` bilan 40 ga qaytadi).
- `routes/buildings.ts`: `POST /` va `PUT /:id` endi `db.batch([auditEventStatement(...), insert/update…returning()])` — audit
  yozuvi **birinchi**. `POST` uchun id oldindan `crypto.randomUUID()` bilan yaratiladi (audit event va insert bir xil id'ni
  ko'rishi uchun). Javob shakli o'zgarmadi. Har ikki route'ga D1 byudjet izohi qo'shildi (≤4 va ≤5 — ≤40 dan ancha past).
- Testlar: yangi `apps/api/tests/integration/audit-event.test.ts` (7 test) — POST/PUT revision 1→2, batch rollback (bogus
  `climateRegionId`, na bino na audit_event), `expectedRevision` konflikti (`isRevisionConflict` true, ma'lumot o'zgarmagan),
  append-only trigger (`UPDATE audit_event` → xato), summary truncation, `getRevisions`. `audit-access.test.ts`/`members.test.ts`
  o'zgarishsiz yashil (bitta-so'rov refaktori xatti-harakatni o'zgartirmagan). type-check, build, biome lint, `db:generate`
  SQL ko'rib chiqildi, `db:migrate:local`, `bun run --cwd apps/api test` (262/262, avvalgi 255 + yangi 7) — barchasi yashil.
- Chetlanish yo'q — spec aniq va kod bilan ziddiyatsiz bajarildi. `auditEventStatement`ning ikkinchi parametri real Hono
  `Context<AppEnv>` (http-cache.ts bilan bir xil naqsh); route'siz testlarda shunga mos minimal fake-context ishlatildi.
**Navbatda:** A03 (bino soft-delete, tiklash endpoint'i).

## Faza 2 · A03 — Bino soft-delete (`deleted_at`), tiklash endpoint'i (2026-10-04)

- `packages/db/src/schemas/buildings.ts`: `building.deletedAt` (`integer`, `timestamp_ms`, NULL = ko'rinadi) — faqat
  `ADD COLUMN` migratsiyasi (`0009_panoramic_nomad.sql`), jadval qayta yaratilmadi.
- `lib/building-access.ts`: `findOwnedBuilding`/`findAccessibleBuilding` endi `isNull(building.deletedAt)` ham
  tekshiradi (o'chirilgan bino — begona bino bilan bir xil `404`); yangi `findOwnedBuildingIncludingDeleted()` — faqat
  `POST /:id/restore` ishlatadi. `routes/buildings.ts`ning `accessibleBuildingsCondition()`iga ham shu shart qo'shildi
  (`GET /`, `/locations`, `/stats` — barchasi o'chirilgan binoni chiqarmaydi, dashboard metrikalari ham).
- `DELETE /buildings/:id` endi qattiq `delete()` emas, `db.batch([auditEventStatement(action: "delete"), update(building)
  .set({ deletedAt: now }).where(id, isNull(deletedAt))])` — javob `204` o'zgarmadi. Byudjet: sessiya ≤2 + egalik 1 +
  batch 2 = ≤5.
- Yangi `POST /buildings/:id/restore` (faqat egasi, `findOwnedBuildingIncludingDeleted`): o'chirilmagan bo'lsa `409`,
  topilmasa `404`, aks holda `db.batch([auditEventStatement(action: "restore"), update(... deletedAt: null)])` →
  `200 { building }`. Web UI'da ro'yxat/tugma yo'q (spec bo'yicha ataylab, Faza 3/4) — `docs/runbooks/backup-va-tiklash.md`ga
  curl misoli qo'shildi.
- `verify.ts`ga filtr **qo'shilmadi** (spec §7) — o'chirilgan binoning chiqarilgan hisoboti baribir tekshiriladi;
  `audit-inputs.ts` o'zgarmadi (chaqiruvdan oldin allaqachon `findAccessibleBuilding` orqali tekshiriladi).
- Web: `delete-building-dialog.tsx`ning tasdiq matni (uz/ru/en) "butunlay o'chiradi/bekor qilib bo'lmaydi" dan
  "yashiradi/faqat qo'llab-quvvatlash orqali tiklanadi"ga o'zgartirildi; tugma hamon destruktiv uslubda.
- Testlar: `buildings.test.ts`ga 3 yangi test — (1) soft-delete: bola qatorlar (`utility_bill`, `audit_run`) va
  `delete` audit_event saqlanib qoladi, bino `GET`/`list`/`stats`/`locations`dan yo'qoladi, qayta `DELETE` → `404`;
  (2) begona foydalanuvchi o'chira olmaydi (`404`, mavjudligi oshkor qilinmaydi); (3) `restore` — o'chirilmagan
  bino uchun `409`, begona uchun `404`, egasi uchun `200` + `audit_event`da `restore` qatori. type-check, build
  (web matni), biome lint, `db:generate` (faqat `ALTER TABLE ADD`, qayta yaratish yo'q), `db:migrate:local`,
  `bun run --cwd apps/api test` (265/265, avvalgi 262 + yangi 3) — barchasi yashil.
- Chetlanish yo'q — spec aniq va kod bilan ziddiyatsiz bajarildi.
**Navbatda:** A04 (`audit_snapshot` + `audit_snapshot_report` sxemasi, o'zgarmaslik triggerlari, ADR-004 fayli).

## Faza 2 · A04 — `audit_snapshot` + `audit_snapshot_report` sxemasi, o'zgarmaslik triggerlari, ADR-004 (2026-10-04)

- `packages/db/src/schemas/enums.ts`: `snapshotStatusEnum` (`draft|submitted|approved|superseded`),
  `reportLangEnum` (`en|ru|uz`, `report-i18n.ts`ning `ReportLang`iga mos). `packages/db/src/schemas/snapshots.ts`
  (yangi): `audit_snapshot` (22 ustun — R2 kalit+SHA-256 uchlik `inputs`/`result`/`context`, kichik `summary` json,
  muallif/vaqt ustunlari, `buildingId` FK `onDelete`siz — restrict) va `audit_snapshot_report` (snapshot × til,
  `uniqueIndex(snapshotId, lang)`). Qisman unique indeks `audit_snapshot_building_approved_unique`
  (`(buildingId) WHERE status = 'approved'`) — `db:generate` buni to'g'ridan-to'g'ri chiqardi, `--custom`ga hojat
  bo'lmadi (drizzle-orm 0.45.2 sqlite-core `.where()`ni qo'llab-quvvatlaydi).
- Uch trigger (`--custom` migratsiya, `0011_audit_snapshot_triggers.sql`): `audit_snapshot_frozen` (holat/approval
  ustunlaridan tashqari hamma ustunni muzlatadi), `audit_snapshot_status_flow` (faqat draft→{submitted,superseded},
  submitted→{approved,superseded}, approved→superseded — A05b'dagi parallel tasdiqlash yarishini ham atomik
  yopadi), `audit_snapshot_report_frozen` (har qanday UPDATE'ni rad etadi). DELETE trigger yo'q (o'chirish yo'li
  kodda yo'q, `resetTestDb()` generik `DELETE FROM`ga tayanadi).
- `packages/types/src/snapshot.ts` (yangi): `AuditSnapshotStatus`, `AuditSnapshotReportLang`,
  `AuditSnapshotListItem` (A08 shu turdan foydalanadi).
- `docs/adr/ADR-004-audit-snapshot.md` (yangi) — variantlar, R2 sababi (o'lcham: golden `result` ≈ 214 KB,
  `inputs` ≈ 41 KB, D1 bayonot chegarasi 100 KB), triggerlar, holat oqimi, K24–K26 havolasi.
  `docs/data-dictionary.md`ga 28-band, `docs/er-diagram.md`ga "Immutable records (ADR-004)" bo'limi qo'shildi.
- Migratsiyalar: `0010_happy_justin_hammer.sql` (ikki jadval + ikki indeks — faqat `CREATE TABLE`/`CREATE INDEX`,
  qayta yaratish yo'q, `PRAGMA foreign_keys=OFF` chiqmadi), `0011_audit_snapshot_triggers.sql` (uch trigger).
  `db:migrate:local` toza qo'llandi.
- Testlar: yangi `apps/api/tests/integration/snapshot-schema.test.ts` (6 test) — muzlatilgan ustun UPDATE → xato;
  uchta noqonuniy status o'tishi (draft→approved, approved→draft, superseded→approved) → xato; to'liq
  draft→submitted→approved→superseded oqimi → o'tadi; bitta binoda ikkinchi `approved` → unique xatosi;
  `audit_snapshot_report` UPDATE → xato; snapshot'li binoni `db.delete(building)` → FK xatosi. type-check (5/5
  workspace), biome lint, `db:generate` SQL ko'rib chiqildi, `db:migrate:local`,
  `bun run --cwd apps/api test` (271/271, avvalgi 265 + yangi 6) — barchasi yashil.
- Chetlanish yo'q — spec aniq va kod bilan ziddiyatsiz bajarildi. `createdByUserId`/`submittedByUserId`/
  `approvedByUserId` `user.id`ga oddiy (restrict) FK — spec ularning `onDelete` xatti-harakatini belgilamagan,
  mavjud `auditRun.triggeredByUserId` andozasiga ergashildi.
**Navbatda:** A05a (Snapshot API: yaratish/ro'yxat/o'qish).

## Faza 2 · A05a — Snapshot API: yaratish/ro'yxat/o'qish (2026-10-04)

- `services/snapshot.service.ts` (yangi): `buildSnapshotPayload(db, building, generatedAt)` — `loadAuditInputs`
  (21 so'rov) + 4 ta kontekst funksiyasi (`getUValueBreakdown` 2, `getConsumptionHistory` 1,
  `getLatestEnergyTariffs` 1, `getReportAnnotations` 1 = 5) parallel chaqiradi, so'ng `computeAudit(inputs,
  {generatedAt})` — `AuditResult`/dvigatelga hech qanday o'zgarish, faqat bir marta chaqirish. `context.building`
  — `report.service.ts` o'qiydigan 16 ustun (`grep -o "building\.[a-zA-Z]*"` bilan topilgan), `userId`/`searchText`
  chiqarib tashlangan. `serialize()`/`sha256Hex()` (`crypto.subtle.digest`), `snapshotR2Keys()` (
  `snapshots/{b}/{s}/inputs|result|context.json`), `readSnapshotJson()` — R2'dan o'qib SHA-256 qayta tekshiradi,
  mos kelmasa oddiy `Error` (route buni ushlab `[snapshot] integrity mismatch <id>` log qiladi, mijozga umumiy
  `500`).
- `routes/snapshots.ts` (yangi, `src/index.ts`da `/api/buildings` ga ulandi):
  - `POST /:id/audit/snapshots` — `canWrite` (403 viewer'ga); avval 3 ta R2 `put` (inputs/result/context),
    keyin bitta `db.batch()`: `audit_event` (create, entityId=snapshotId) → eski `draft`/`submitted`
    snapshot'larni `superseded` (`supersededAt`/`supersededById=yangi id`, `approved`ga tegmaydi) → yangi
    `audit_snapshot` insert (`status: "draft"`). D1 byudjeti: sessiya ≤2 + kirish 1 + kiritmalar 21 + kontekst
    5 + batch 3 = 32; +3 R2 `put` = 35 subrequest (< 50). Javob `201 { snapshot }`.
  - `GET /:id/audit/snapshots` — viewer ham; 2 so'rov (snapshot sahifasi + `audit_snapshot_report`
    `inArray(snapshotId, subquery)` — JS massiv emas), R2'ga tegmaydi.
  - `GET /:id/audit/snapshots/:sid` — `z.string().uuid()` validatsiya (400), qator
    `and(eq(id,sid), eq(buildingId,id))` (IDOR), `result.json` R2'dan hash tekshiruvi bilan → `{snapshot, result}`.
    Qayta hisoblamaydi.
- Testlar uchun R2: `tests/helpers/test-db.ts`ning `getPlatformProxy` chaqiruviga `REPORTS_BUCKET: R2Bucket`
  qo'shildi (ishladi — haqiqiy lokal Miniflare R2, `report.test.ts` ham shu orqali o'tdi) — Map-asosidagi soxta
  bucketga ehtiyoj bo'lmadi. `test-env.ts`ning `REPORTS_BUCKET` endi `testReportsBucket` (haqiqiy); chat uchun
  `put`-only soxta bucket saqlanib qoldi (`CHAT_ATTACHMENTS_BUCKET`, boshqa route hali uni o'qimaydi).
- Yangi `apps/api/tests/integration/snapshot-api.test.ts` (4 test): (1) snapshot yaratilgach bino kiritmasi +
  global `energy_tariff` + `climate_monthly_normal` o'zgartiriladi → `GET …/:sid` o'zgarmagan, jonli
  `/audit/results` o'zgargan; (2) qayta tiklanuvchanlik — R2'dan o'qilgan `inputs`ni `computeAudit()`ga uzatish
  saqlangan `result`ga deep-equal; (3) R2 obyekti buzilsa → `500` (natija qaytmaydi, xato matnida hash/r2 so'zi
  yo'q), begona bino `:sid` → `404`, viewer POST → `403`, noto'g'ri `:sid` → `400`; (4) yangi snapshot ochiq
  `draft`/`submitted`ni `superseded` qiladi (`supersededById` yangisiga), qo'lda `approved`ga ko'tarilgan
  snapshot'ga tegmaydi, har bitta `create` `audit_event`da (`entity: "snapshot"`).
- type-check (ildizdan, 5/5 workspace, `apps/web` build ham), `bunx biome lint` (6 fayl) va `bunx biome format`
  (100-belgili qator kengligi uchun), `bun run --cwd apps/api test` — **275/275** (avvalgi 271 + yangi 4), barchasi
  yashil.
- Chetlanish yo'q — spec aniq va kod bilan ziddiyatsiz bajarildi. Bitta kichik qaror: superseding `UPDATE`'ga
  `supersededById = yangi snapshot id` ham qo'shildi (spec faqat "`.set(superseded)`" deb yozgan, lekin schema
  izohi "Points at the replacement snapshot's id" deb aniq ta'riflagan va `audit_snapshot_frozen` trigger bu
  ustunni bloklamaydi — shuning uchun qo'shildi, ustun bo'sh qolmasligi uchun).
**Navbatda:** A05b (holat o'tishlari: submit/approve, `canApprove`).

## Faza 2 · A09a — `audit_event` qobiq/tizimlar/iste'molga yoyildi (2026-10-04)

- `auditEventStatement()` (A02) endi quyidagi bulk-replace route'larning har birida `db.batch()`ning
  **birinchi** bayonoti: `PUT /:id/envelope` (`entity: "envelope"`, `action: "replace"`, `summary:
  { scenario, counts: { blocks, constructionTypes, openingTypes, elements, openings } }`); to'qqizta
  `PUT /:id/systems/*` (`entity: "systems.<bo'lim>"`, `summary: { count }`); `POST /:id/consumption`
  (`action: "create"`), `PUT /:id/consumption` va `PUT /:id/consumption/bulk` (`action: "replace"`,
  uchtasi ham `entity: "consumption"`, `summary: { years, carriers, count }`). `routes/envelope.ts`da
  audit qatori "before" stsenariyning `PRAGMA defer_foreign_keys`idan **oldin** push qilinadi — bu
  muammo emas, chunki audit qatori hech qanday FK buzmaydi. `routes/consumption.ts`ning POST'i oldin
  `chunks.map(...)`ni to'g'ridan-to'g'ri `db.batch()`ga uzatardi; endi audit bayonoti bilan birga bitta
  massivga yig'iladi va natija destructuring'i (`const [, ...chunkResults] = ...`) shunga mos
  o'zgartirildi — javob shakli (`{ bills: [...] }`) o'zgarmadi.
- Byudjet izohlari yangilandi (`database.md` formula uslubida), har birida audit qatori qo'shilgandan
  keyingi yakuniy son: `schemas/envelope.ts` — "oldin" PUT 36 (bazaviy) + 4 (PRAGMA+o'qish+2 relink) =
  **40/40**; "keyin" PUT 36 + 2 (retrofit lookup) = **38/40**. `schemas/systems.ts` — eng og'ir
  (equipment) 24 + session(≤2) + findAccessibleBuilding(1) + audit(1) = **28/40** (o'zgarmadi — A02
  findAccessibleBuilding'ni bitta so'rovga tushirgani bo'shatgan joyni audit egalladi).
  `schemas/consumption.ts` — POST **18/40**, PUT (bir yil/tashuvchi) **7/40**, PUT `/bulk` **28/40**.
- Yangi test fayli `apps/api/tests/integration/audit-event-matrix.test.ts` (17 test): barcha 1
  qobiq + 9 tizim + 3 iste'mol route'i uchun — muvaffaqiyatli so'rov → to'g'ri `entity`/`action`/
  `actorUserId`/`entityRevision` bilan bitta qator (iste'mol uchun ketma-ket POST→PUT revision 1→2
  ekanini ham tekshiradi); 400 (noto'g'ri ventilyatsiya payload'i), 404 (begona), 403 (viewer) → qator
  yo'q; batch yiqilishi (qobiqdagi `constructionLayer.materialId` haqiqiy `material` qatoriga ishora
  qilmaydi → FK, `routes/envelope.ts` buni tutib olmaydi, 500) → audit qatori ham yo'q (atomiklik) —
  bitta qo'shimcha test shu FK stsenariysi haqiqiy material bilan muvaffaqiyatli o'tishini tasdiqlaydi
  (yolg'on-salbiy ehtiyot chorasi).
- Tekshiruvlar: `bunx biome lint` (tegilgan 7 fayl) toza; `tsc --noEmit` (`apps/api/tsconfig.json`,
  prod kod) toza; `bun run --cwd apps/api test` — **288/288** (avvalgi 271 + yangi 17) yashil.
  `tsc -p tsconfig.test.json` (turbo `type-check`) oldindan mavjud, A09a'ga aloqasiz xato bilan
  qizil: `tests/services/report.service.test.ts`da `Buffer` nomi topilmadi (`tsconfig.test.json`da
  `types` ro'yxatida `"node"` yo'q) — bu fayl A09a tomonidan tegilmagan va shu holat A09a oldidan ham
  bor edi (tasdiqlangan: `git status` bu faylni o'zgarmagan ko'rsatadi, xato aynan shu turdagi, boshqa
  hech narsaga bog'liq emas). A09a doirasida tuzatilmadi — keraksiz skop kengaytirishdan saqlanish
  uchun; alohida kichik topshiriq sifatida belgilash tavsiya etiladi.
- Chetlanish: A05a (parallel sessiya, `routes/snapshots.ts`/`snapshot.service.ts`/`index.ts`/
  `routes/audit.ts`) tegilmadi. A09b (chora-tadbirlar, moliya, a'zolar, izohlar, `audit/run`) — bu
  sessiyaning doirasiga kirmaydi, keyingi qadam.
**Navbatda:** A09b (`audit_event` chora-tadbirlar/moliya/a'zolar/izohlar/`audit/run`ga).

## Faza 2 · A05b — Snapshot holat o'tishlari: submit/approve, `canApprove()`, 409 (2026-10-04)

- `apps/api/src/lib/building-access.ts`ga `canApprove(role)` qo'shildi — K24 qarori (2026-10-04,
  tavsiya etilgan variant qabul qilindi): faqat bino `owner`i tasdiqlaydi; o'z-o'zini tasdiqlash
  ruxsat (route'da `role === "owner"` yozilmaydi, bitta funksiya — `future-platform.md`).
- `apps/api/src/routes/snapshots.ts`ga ikki endpoint: `POST /:id/audit/snapshots/:sid/submit`
  (`canWrite` — owner/editor) va `POST /:id/audit/snapshots/:sid/approve` (`canApprove` — faqat
  owner). Ikkisi ham: `findAccessibleBuilding` → 404, rol tekshiruvi → 403, sid mavjudligini
  (`and(eq(id,sid), eq(buildingId,id))`) alohida `SELECT` bilan tasdiqlash → 404, so'ng
  `db.batch([auditEventStatement(submit/approve), ...update(lar)])`. `approve`da batch ichida
  **avval** eski `approved` qatorni `superseded`ga (`supersededById = sid`), **keyin** `sid`ni
  `approved`ga o'tkazadi — A04'ning qisman unique indeksi (`audit_snapshot_building_approved_unique`)
  bu ketma-ketlikni talab qiladi.
  Noqonuniy o'tish (`audit_snapshot_status_flow` trigger, A04) butun batch'ni qaytaradi; bu xato
  `snapshot.service.ts`ning yangi `isIllegalTransitionError()` (A02'ning `isRevisionConflict()`i
  uslubida, `.cause` zanjirini xabar matni bo'yicha tekshiradi) orqali tutiladi → route
  `409 { error, code: "illegal_transition" }` qaytaradi; ichki trigger matni mijozga berilmaydi.
  Bir xil snapshot'ga parallel ikkita `approve` so'rovi — ikkinchisi batch bosqichida `sid`ning
  `OLD.status`i endi `submitted` emasligini ko'radi (trigger) → 409, shu tarzda race atomik yopiladi
  (alohida qulflash kodisiz).
- D1 byudjeti (izohlarda): `submit` — sessiya(≤2) + kirish(1) + sid mavjudlik(1) + batch(2) = 6/40;
  `approve` — sessiya(≤2) + kirish(1) + sid mavjudlik(1) + batch(3) = 7/40.
- Yangi test fayli `apps/api/tests/integration/snapshot-transitions.test.ts` (9 test): to'liq
  `draft→submitted→approved` yo'li (`audit_event`da uchtasi ham `owner` actor bilan); ikkinchi
  snapshot tasdiqlanganda birinchisi `superseded`ga o'tishi; tasdiqlangan'ni qayta tasdiqlash →
  409 (holat o'zgarmaydi, `approve` audit_event ikkilanmaydi); submitted'ni qayta submit → 409;
  draft'ni to'g'ridan-to'g'ri approve (submit o'tkazib yuborilgan) → 409; bir xil snapshot'ga
  `Promise.all` bilan parallel ikkita approve → aniq bitta `200` + bitta `409`, yakunda bitta
  `approve` audit_event; editor submit qila oladi (200) lekin approve qila olmaydi (403), viewer
  ikkalasiga ham 403; begona foydalanuvchi (bino a'zosi emas) → 404 (403 emas); noto'g'ri `:sid`
  → 400, boshqa binodan olingan `:sid` → 404.
- Tekshiruvlar: root `bun run type-check` (hamma workspace, `apps/web` build bilan) toza;
  `bunx biome lint` tegilgan 4 faylga toza; `bun run --cwd apps/api test` — **301/301** yashil
  (avvalgi 288 + bu sessiyadan oldingi A09a progress yozuvidan keyin qo'shilgan testlar + bu
  sessiyaning 9 yangi testi — aniq boshlang'ich son tasdiqlanmadi, faqat yakuniy 301/301 yashil
  ekani tasdiqlandi).
- Chetlanish: yo'q — spec (`A05-snapshot-api.md` A05b bandi) aynan shu tartibda bajarildi.
  `A05` endi to'liq ✅ (`faza-2/README.md`).
**Navbatda:** A06 (hisobot snapshot'dan: o'zgarmas PDF + SHA-256).
