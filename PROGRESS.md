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
