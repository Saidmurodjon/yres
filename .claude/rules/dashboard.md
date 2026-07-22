# Dashboard (`apps/web/src/routes/_authenticated/dashboard.tsx`)

- **`useBuildings({ pageSize: 100 })` cheklovi bor** — `buildings/index.tsx` bilan bir xil
  andoza. 100 tadan ortiq binosi bor foydalanuvchida metrikalar, hudud grafigi va jadval
  jimgina to'liq bo'lmaydi (backend'da haqiqiy pagination/aggregatsiya yo'q, hammasi bitta
  sahifadagi ro'yxatdan client-side hisoblanadi). Real ko'p-bino stsenariysi paydo bo'lsa,
  aggregatsiyani serverga ko'chirish kerak bo'ladi — hozircha ataylab shunday qoldirilgan.
- **Filtrlar (qidiruv/tur/status/hudud) va hudud grafigi to'liq client-side** — server
  so'rovi o'zgarmaydi, `useMemo` bilan `buildings` massividan hisoblanadi. "Hudud" mavjud
  erkin-matn `building.location` maydonining o'zi (masalan "Toshkent") — alohida
  controlled-region maydoni yo'q, shuning uchun yozilishi turlicha bo'lgan bir xil hudud
  (masalan "Toshkent" vs "toshkent") alohida guruh sifatida ko'rinadi. Yangi bino
  qo'shayotganda `location`ni izchil yozishni talab qiladi — bu ataylab qilingan soddalik,
  validatsiya qo'shilmagan.
- **`status`/`deadline` — qo'lda boshqariladigan loyiha holati, audit_run'ning hisoblash
  holatidan (pending/running/completed/failed) butunlay mustaqil.** `buildingStatusEnum`
  (`packages/db/src/schemas/enums.ts`) to'rtta qiymatga ega: `not_started`/`in_progress`/
  `completed`/`on_hold`. Bu maydonlar faqat bino tahrirlash formasida (`building-form-fields.tsx`)
  qo'lda o'zgartiriladi — hech qanday avtomatik sinxronizatsiya audit ishga tushirilganda
  ularni yangilamaydi. Yangi "audit progress" ko'rsatkichi kerak bo'lsa, buni
  `auditRun.status`dan alohida hisoblang, `building.status`ni qayta ishlatmang.
- **`collaboratorCount` backend'da hisoblanadi** (`routes/buildings.ts`ning GET `/` handler'i),
  frontend'da emas — chunki `buildingMember` jadvali faqat joriy foydalanuvchining o'z
  a'zoligini emas, binoga ulashilgan **barcha** hamkorlarni bilishni talab qiladi, bu esa
  boshqa foydalanuvchilarning ma'lumoti, client allaqachon egasi bo'lmagan bino uchun buni
  ko'ra olmaydi. `+1` doim qo'shiladi, chunki bino egasi (`building.userId`) hech qachon
  `buildingMember` qatori bo'lmaydi (`collaboration.ts`ning izohiga qarang).
- **"Muddati o'tgan" belgisi** (`labels.ts`dagi `isBuildingOverdue()`) faqat `deadline` bor
  VA `status !== "completed"` VA sana o'tmishda bo'lsa chiqadi — `on_hold` (to'xtatilgan)
  holat ham "muddati o'tgan" deb hisoblanadi (ataylab: to'xtatilgan loyiha ham muddatni
  o'tkazib yuborishi mumkin), faqat `completed` istisno.
