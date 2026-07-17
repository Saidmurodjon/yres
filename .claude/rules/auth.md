# Auth (Better Auth)

`apps/api/src/auth/index.ts` Better Auth'ni sozlaydi (email/parol + Google OAuth). Har biri bir
marta haqiqiy production bug'iga sabab bo'lgan uchta aniq bo'lmagan narsa — ularni orqaga
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
- OAuth bug'i haqida xabar berilganda va muvaffaqiyatsizlik holati noaniq bo'lsa ("shunchaki
  login sahifasiga qaytib qolyapti"), foydalanuvchi uni jonli qayta hosil qilayotganda
  `wrangler tail --env production`ni ishga tushirish eng tez haqiqiy diagnostikadir — Better Auth
  aniq xato kodini (`account_not_linked`, `state_mismatch`, va h.k.) logga yozadi, buni curl
  orqali oqimni qayta hosil qilish odatda o'zi topa olmaydi.
