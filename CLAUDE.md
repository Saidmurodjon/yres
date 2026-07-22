# CLAUDE.md

Claude Code uchun ushbu repozitoriyada ishlash bo'yicha ko'rsatmalar. Avval shuni o'qing; u
batafsil qoidalar va joriy holatga havola qiladi, ularni takrorlamaydi.

## Bu nima

YRES (Yagona Raqamli Energiya Samaradorligi Tizimi) — bino energiya auditini (hozirda katta Excel
hisob-kitob jadvalida (`3-DMTT v5.xlsx`) bajariladigan) bankka tayyor veb-ilovaga aylantiruvchi
SaaS platforma. Arxitektura jadvali va repo tuzilishi uchun `README.md`ga, nima qurilgani va
navbatda nima turgani uchun `PROGRESS.md`ga qarang.

## O'zgarish kiritishdan oldin `.claude/rules/` dagi tegishli fayllarni o'qing

Har biri bitta sohani, aniq va qimmatga tushgan nozik jihatlarni qamrab oladi — ko'pchiligi
bir marta haqiqiy production bug'iga sabab bo'lgan va kodni sovuq holda o'qishdan aniq bilinmaydi:

| Fayl | Nimani qamrab oladi |
|---|---|
| `stack.md` | Paket menejeri (bun), monorepo tuzilishi, TypeScript/Biome konventsiyalari |
| `database.md` | Neon'ning HTTP drayverida tranzaksiya yo'q, `db.batch()` andozasi, migratsiya CLI'sidagi nozik jihat, seed-ma'lumot ishonchliligi |
| `auth.md` | Better Auth cross-subdomain cookie'lari, `errorCallbackURL`, account-linking sozlamasi |
| `frontend.md` | **`packages/ui` uchun Tailwind `@source` nozik jihati** (faqat `apps/web`ga tegsangiz ham buni o'qing), deploy'dan keyingi eskirgan-chunk holatini boshqarish, jadval/tab'lar overflow'i, mobil navigatsiya |
| `calculation-engine.md` | `audit.engine.ts`ning standartlashtirilgan-vs-haqiqiy kalibrlashi, tashuvchi (carrier) moslashtirish, energiya balansi bo'limlari, **manba Excel'ga nisbatan audit topilmalari** (to'liq: `docs/calculation-engine-audit.md`) |
| `testing-and-verification.md` | Unit vs integratsiya testlari, lokal bazasiz UI'ni tekshirish |
| `deployment.md` | Qo'lda deploy buyruqlari, production manzillari, sirlar (secrets) |
| `git-and-commits.md` | Ushbu repo tarixi ergashadigan commit granulyarligi va xabar uslubi |
| `social-features.md` | Navbar/rollar/profil/bildirishnoma/chat tashabbusi — `user.role`ning endi haqiqiy ekanligi, username backfill, Durable Objects arxitekturasi (to'liq dizayn: `docs/social-features.md`) |
| `realtime.md` | Durable Objects/WebSocket nozik jihatlari — `serializeAttachment` vs xotiradagi holat, `getWebSockets()` orqali broadcast, RPC metodlar, Vitest'ning `cloudflare:workers` shim'i |
| `ui-guidelines.md` | Platforma bo'ylab dizayn/responsive/state-boshqaruv/unumdorlik qoidalari — Zustand vs TanStack Query chegarasi (to'liq qoidalar: `docs/ui-guidelines.md`) |
| `dashboard.md` | Dashboard sahifasi — `pageSize: 100` cheklovi, client-side filtr/grafik, `building.status`/`deadline`ning `audit_run`dan mustaqilligi, `collaboratorCount` qayerdan kelishi |
| `i18n-and-appearance.md` | uz/ru/en ko'p tillilik (`react-i18next`) va kun/tun rejimi — rus ko'plik shakllari, localStorage-asoslangan sozlamalar (to'liq dizayn: `docs/i18n-and-appearance.md`) |

## Til

Loyiha egasi o'zbek tilida muloqot qiladi (ba'zan inglizcha texnik atamalar bilan aralashtirib).

U qaysi tilda yozsa, o'sha tilda javob bering.

## Yodda tutish kerak bo'lgan eng muhim nozik jihat

`packages/ui` komponenti ichida **faqat** ishlatiladigan — `apps/web`ning o'z manba kodida so'zma-so'z
takrorlanmagan — har qanday Tailwind utility klassi, agar `packages/ui/src/styles/globals.css`dagi
`@source` direktivasi uni qamrab olmasa, quriladigan CSS'dan sezdirmasdan yo'qolib qoladi. Bu bir marta
production'da ilovadagi barcha icon tugmalarni buzgan edi (umumiy `Button`dagi `inline-flex`/
`whitespace-nowrap`). To'liq tushuntirish va tuzatish haqiqatan ham quriladigan CSS'ga tushganini
(shunchaki komponentning `className` satrida emas) qanday tekshirish uchun `frontend.md`ga qarang.

## O'zgarishni tugallangan deb hisoblashdan oldin tekshirish

Tegilgan har qanday narsaga `bun run type-check` va `bun run build` (bu `apps/web` uchun haqiqiy
Vite build'ni ham ishga tushiradi — yuqoridagi kabi ba'zi buglar faqat quriladigan natijada
ko'rinadi) va `bunx biome lint`. UI o'zgarishlari uchun lokal bazasiz ilovani brauzer preview'ida
qanday boshqarish haqida `testing-and-verification.md`ga qarang. Tekshirish imkoni bo'lgan holatda
tuzatish ishlayotganini faqat diff'ni o'qib da'vo qilmang.

## Ko'p bosqichli yoki uzoq davom etadigan topshiriqlarda ishlash tartibi

Token/context limiti tugab, suhbat siqilganda (context compaction), avvalgi bosqichlarda nima
qilingani unutilishi yoki noto'g'ri taxmin qilinishi mumkin. Buning oldini olish uchun quyidagi
tartibga qat'iy rioya qiling:

1. **Har bir mustaqil topshiriq/bosqich tugagach, keyingisiga o'tishdan oldin** — nima qilingani,
   qanday tekshirilgani va navbatda nima turgani haqida qisqa yozuvni `PROGRESS.md`ga qo'shing
   (fayldagi mavjud bo'limlar uslubida, xronologik tartibda). Context siqilgandan keyin yoki
   yangi sessiyada davom etilganda shu fayl — xotiradagi taxmin emas — haqiqat manbai bo'ladi.
2. **Har bir topshiriqdan so'ng, keyingisiga o'tishdan oldin sinab ko'ring**: tegilgan
   workspace(lar)da `bun run type-check`, `apps/web`ga tegilgan bo'lsa `bun run build`,
   `bunx biome lint <tegilgan fayllar>`, hisob-kitob dvigateliga tegilgan bo'lsa `bun run test`
   (`testing-and-verification.md`ga qarang). Xatolik chiqsa, keyingi topshiriqqa o'tmasdan oldin
   shu yerda tuzating — buzilgan holatni ortda qoldirmang.
3. **Tekshiruvlar xatosiz o'tgandan so'ng**, o'sha topshiriq bo'yicha o'zgarishlarni commit qilib
   GitHub'ga push qiling (`git-and-commits.md`dagi commit granulyarligi va xabar uslubiga rioya
   qilgan holda — bitta topshiriq, bitta commit). Ko'p bosqichli ishlarda ushbu qoida
   `git-and-commits.md`dagi "faqat so'ralganda commit qiling" standart qoidasidan ustun turadi:
   maqsad — har bir tekshirilgan, ishlayotgan bosqichni darhol saqlab qo'yish, keyinroq hammasini
   birlashtirib commit qilish emas.
