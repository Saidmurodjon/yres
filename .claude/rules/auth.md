# Auth (Better Auth)

`apps/api/src/auth/index.ts` Better Auth'ni sozlaydi (email/parol + Google OAuth). Har biri bir
marta haqiqiy production bug'iga sabab bo'lgan to'rtta aniq bo'lmagan narsa — ularni orqaga
qaytarmang:

- **`crossSubDomainCookies`** veb-ilova va API bir xil registrable domenning qo'shni
  subdomenlarida bo'lganda kerak (masalan `yres.saidmurod.com` / `yres-api.saidmurod.com`). U
  faqat `WEB_URL` `saidmurod.com` bilan tugaganda shartli ravishda yoqiladi — `*.pages.dev`/
  `*.workers.dev` *turli* ommaviy suffikslar bo'lib, umumiy registrable domeni yo'q, shuning
  uchun cookie'lar ular orasida hech qanday atributlar bilan ham hech qachon ulasha olmaydi, va
  u yerda cross-subdomain cookie domenini majburlash shunchaki auth'ni buzardi. Domen satrini
  boshqa joyda qattiq kodlamang; uni xuddi shu kod qilganidek hosil qiling.
- **Frontend'dagi har bir `signIn.social(...)` chaqiruvi `errorCallbackURL` uzatishi shart.**
  Bunisiz, har qanday OAuth muvaffaqiyatsizligi (state mismatch, account-linking xatosi, va h.k.)
  foydalanuvchini Better Auth'ning *API*ning o'z manbasidagi yalang'och xato sahifasiga
  yo'naltiradi — ilovaga qaytish imkonisiz tor ko'cha. Uni haqiqiy xatoni va qayta urinish yo'lini
  ko'rsata oladigan veb-ilovadagi route'ga yo'naltiring (`apps/web/src/routes/login.tsx`
  namunaviy amalga oshirish).
- **`account.accountLinking.requireLocalEmailVerified` ataylab `false` qilib qo'yilgan.** Better
  Auth'ning standart holati unga yangi Google identifikatsiyasini ulashdan oldin *mavjud* lokal
  (email/parol) akkauntning `emailVerified`i allaqachon `true` bo'lishini talab qiladi — Google
  email'ni o'zi tasdiqlagani uchun, bu qo'shimcha lokal-tasdiqlash talabi haqiqiy foydalanuvchilarni
  server loglarida noaniq `account_not_linked` xatosi bilan `/login`ga sezdirmasdan qaytarib
  yuboradi, foydalanuvchiga esa hech narsa ko'rinmaydi. Buni himoya qilishi kerak bo'lgan holat
  uchun haqiqiy "tasdiqlashni qayta yuborish" oqimini qurmasdan qayta yoqmang.
  **Lekin bu sozlama hozirgi holatida xavfsizlik teshigi (S-1, kritik, Faza 0).** Email/parol
  ro'yxatdan o'tish email tasdiqlashni talab qilmaydi, shuning uchun hujumchi `victim@gmail.com`
  bilan parol-akkaunt ochib qo'yishi mumkin; haqiqiy egasi keyin "Google bilan kirish"ni bossa,
  Google shu akkauntga ulanadi va hujumchining paroli ishlashda davom etadi (akkauntni oldindan
  egallash). "Qayta yoqmang" qoidasi S-1 tuzatishini to'smaydi — u faqat sozlamani *yolg'iz*
  `true` qilishni taqiqlaydi. Ruxsat etilgan ikki yo'l (`docs/production/02-arxitektura-va-
  texnologiyalar.md` S-1): (a) `emailAndPassword.requireEmailVerification: true` + haqiqiy
  "tasdiqlashni qayta yuborish" oqimi, yoki (b) Google ulanayotganda lokal akkaunt tasdiqlanmagan
  bo'lsa, uning `credential` parolini bekor qilish va barcha eski sessiyalarni revoke qilish —
  (b) yuqoridagi UX'ni saqlaydi. **Qaror (2026-10-02): (b) tanlandi** — (a)ni qurmang.
  **Amalga oshirildi (2026-10-02):** `apps/api/src/auth/account-linking.ts` (`revokeUnverifiedCredentialOnSocialLink` +
  fail-closed `guardNewAccountLink`), `databaseHooks.account.create.after` orqali; sozlama va hook juft — biri ikkinchisisiz o'zgarmaydi.
- OAuth bug'i haqida xabar berilganda va muvaffaqiyatsizlik holati noaniq bo'lsa ("shunchaki
  login sahifasiga qaytib qolyapti"), foydalanuvchi uni jonli qayta hosil qilayotganda
  `wrangler tail --env production`ni ishga tushirish eng tez haqiqiy diagnostikadir — Better Auth
  aniq xato kodini (`account_not_linked`, `state_mismatch`, va h.k.) logga yozadi, buni curl
  orqali oqimni qayta hosil qilish odatda o'zi topa olmaydi.
- **`user.additionalFields`da `required: true` va `input: false`ni birga ishlatmang, agar
  `defaultValue` bo'lmasa.** Better Auth `required`ni client yuborgan xom `signUp` so'rovi
  ustida, `databaseHooks.user.create.before` ishga tushishidan **oldin** tekshiradi —
  `input: false` client'dan o'sha maydonni umuman yubormasligini bildiradi, shuning uchun
  `required: true` + defaultValue yo'q kombinatsiyasi har bir ro'yxatdan o'tishni hook
  email'ni backfill qilishga ulgurmasdan turib "X is required" xatosi bilan buzadi (aynan
  `username`da shunday bo'lgan). Yo `defaultValue` bering, yo `required: false` qiling va
  haqiqiy kafolatni hook + bazaning NOT NULL cheklovi orqali ta'minlang (`role`/`isActive`
  qanday qilinganidek).
