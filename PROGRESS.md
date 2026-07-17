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

**Navbatda**: mexanik ventilyatsiya sovutish-entalpiya kamchiligini tuzatish, keyin
`docs/social-features.md`/`ui-guidelines.md`/`i18n-and-appearance.md`dagi "Qurish tartibi"
bosqichlariga o'tish (har bir bosqich — tekshiruv + alohida commit).

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
