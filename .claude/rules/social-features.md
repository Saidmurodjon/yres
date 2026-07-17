# Navbar, rollar, profil, bildirishnomalar va chat

To'liq dizayn `docs/social-features.md`da — sxema, Durable Objects arxitekturasi,
API sirti, qurish tartibi shu yerda takrorlanmaydi. Bu fayl faqat bir marta
kutilmagan bo'lishi mumkin bo'lgan, oldindan bilib qo'yish kerak bo'lgan
nozik jihatlarni qamrab oladi:

- **`user.role` endi haqiqiy, o'lik ustun emas.** Avval `enums.ts`da "unused
  Better Auth scaffolding" deb hujjatlashtirilgan edi — endi `userRoleEnum`
  (`admin | auditor | viewer`) bilan tiplangan haqiqiy global rol. Buni
  bino-bo'yicha `buildingMember` roli (`owner | editor | viewer`) bilan
  aralashtirmang — ikkalasi mustaqil tizim, faqat nomi o'xshash.
- **`user.username`ning birlamchi qiymati — `email`.** Ro'yxatdan o'tishda
  (`user.create.before` hook) va mavjud qatorlar uchun backfill'da username
  avtomatik email'ga tenglashtiriladi — email allaqachon `NOT NULL UNIQUE`
  bo'lgani uchun to'qnashuv fizik jihatdan mumkin emas, alohida slug/
  raqamli-qo'shimcha logikasi kerak emas. Foydalanuvchi keyin profilida
  o'zgartirishi mumkin (o'sha paytda 409 to'qnashuv tekshiruvi bilan).
- **Real-time (bildirishnoma bell'i va chat) Cloudflare Durable Objects'ga
  tayanadi** — bu loyiha uchun butunlay yangi infratuzilma turi (avval faqat
  R2 + rate-limiter bor edi). `ConversationRoom` (suhbat-bo'yicha) va
  `UserNotificationChannel` (foydalanuvchi-bo'yicha) DO'lari Postgres'ni
  yagona haqiqat manbai sifatida saqlaydi — DO faqat ulangan socket'larga
  tarqatish nuqtasi, holat saqlovchi emas.
- **Chat "Telegramdek qulay" bo'lishi kerak** — bu shunchaki UI bezagi emas,
  aniq tasdiqlangan to'rtta backend imkoniyatini o'z ichiga oladi: yozayotganlik
  + online/oxirgi ko'rilgan (ephemeral, yangi jadval kerak emas — faqat
  `user.lastSeenAt`), o'qilganlik ✓✓ (`conversationMember.lastReadAt`ga
  tayanadi), reply+tahrirlash/o'chirish (`message.replyToId`/`deletedAt`), va
  rasm/fayl biriktirma (yangi `CHAT_ATTACHMENTS_BUCKET` R2 binding'i,
  `REPORTS_BUCKET`dan alohida). Boshqa Telegram imkoniyatlari (reaksiya,
  qidiruv, qo'ng'iroq va h.k.) ataylab **maqsad emas** deb belgilangan —
  ularni qo'shishdan oldin loyiha egasidan aniq so'rov kutilsin.
- **Bu sandbox'da DO/WebSocket xatti-harakatini integratsion tekshirib
  bo'lmaydi** (Cloudflare runtime yo'q, lokal Postgres yo'q). Haqiqiy
  WebSocket/broadcast xatti-harakati faqat haqiqiy `wrangler deploy`dan
  keyin qo'lda tekshiriladi.
- **Kirishda (login) hech qanday email yuborilmaydi — umuman.** Faqat
  ro'yxatdan o'tganda xush kelibsiz emaili yuboriladi. Bu qaror ikki marta
  o'zgargan (avval "har safar", keyin "faqat yangi qurilmada", endi
  "umuman yo'q") — `userKnownDevice` jadvali va fingerprint-kuzatuv shu
  sababli sxemadan butunlay olib tashlangan; qayta qo'shmang.
- **Parolni tiklash (forgot-password) allaqachon ishlaydi va o'zgartirilmaydi**
  — `apps/api/src/auth/index.ts`dagi `sendResetPassword` hook'i + frontend'dagi
  `forgot-password.tsx`/`reset-password.tsx`. Link-asosidagi bu oqim ataylab
  eng optimal deb tanlangan (bir martalik kod emas) — profildagi "parolni
  almashtirish" (`authClient.changePassword`, tizimga kirgan holda) bilan
  aralashtirmang, ikkalasi mustaqil oqim.

To'liq kontekst, jadval sxemalari, ER-diagramma va bosqichlar uchun
`docs/social-features.md`ni o'qing.
