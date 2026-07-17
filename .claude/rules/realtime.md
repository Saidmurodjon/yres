# Real-time (Cloudflare Durable Objects — bildirishnoma bell'i va chat)

To'liq dizayn `docs/social-features.md`da (sxema, API sirti, qurish tartibi). Bu fayl faqat
`ConversationRoom`/`UserNotificationChannel`ni qurishda haqiqatan duch kelingan, kod ichidagi
izohlardan oldindan bilib bo'lmaydigan nozik jihatlarni qamrab oladi.

- **DO'da session/cookie konteksti yo'q.** Worker route'i (`routes/chat.ts`ning
  `/conversations/:id/ws`i) a'zolikni tekshiradi va WebSocket upgrade so'rovini `?userId=`
  query-param bilan `ConversationRoom`ga uzatadi. `UserNotificationChannel` uchun ham xuddi shu
  sabab — DO instansiyasi o'ziga ulanayotgan foydalanuvchini mustaqil bila olmaydi.
- **`userId` `serializeAttachment()` orqali socket'ga biriktiriladi, xotiradagi `Map`ga emas** —
  Hibernation API socket'ni faol so'rov orasida "uxlatib qo'yishi" mumkin, oddiy in-memory holat
  shu vaqt ichida yo'qoladi; `serializeAttachment`/`deserializeAttachment()` saqlanib qoladi.
  Yangi ulanish-holatini qo'shsangiz (masalan online-holat), xuddi shu naqshga ergashing.
- **Broadcast `this.ctx.getWebSockets()` orqali** (Hibernation API), qo'lda saqlanadigan ulanish
  ro'yxati orqali emas — bu ham hibernatsiyadan keyin ishlaydigan yagona usul.
- **`WebSocketPair` massiv emas, `{0, 1}` xossali obyekt** — `new WebSocketPair()`ni
  `Object.values()` orqali emas, `pair[0]`/`pair[1]` bilan to'g'ridan-to'g'ri indekslang.
  Aks holda `noUncheckedIndexedAccess` (`stack.md`ga qarang) uni `WebSocket | undefined` deb
  belgilaydi va soxta xatoga olib keladi — bu shu tarzda bir marta haqiqiy tuzatishni talab
  qilgan (`user-notification-channel.ts`ga qarang).
- **`UserNotificationChannel.pushNotification()` mijozga ochiq endpoint emas, RPC metod** —
  `env.USER_CHANNEL.get(id).pushNotification(payload)` sifatida to'g'ridan-to'g'ri chaqiriladi
  (Cloudflare'ning zamonaviy `DurableObject` bazaviy klassi buni ichki `fetch` route'isiz
  qo'llab-quvvatlaydi). Yangi server-tomonidan-DO'ga chaqiruv qo'shsangiz, shu andozaga ergashing
  — alohida ichki HTTP route yozmang.
- **Bildirishnoma push'i har doim fire-and-forget.** `lib/notify.ts`ning `notifyUser()`i avval
  `notification` qatorini kiritadi (bu doim muvaffaqiyatli bo'lishi shart — bell ro'yxati/
  o'qilmagan-son shundan o'qiydi), keyin DO RPC chaqiruvini `try/catch`ga o'raydi va xatoni
  logga yozib yutadi. **DO xatosi yoki ulangan socket yo'qligi hech qachon chaqiruvchi haqiqiy
  amalni (masalan bino a'zosini taklif qilish) buzmasligi kerak** — yangi bildirishnoma
  manbasini ulaganda ham xuddi shu tartibga rioya qiling.
- **Postgres — yagona haqiqat manbai, DO faqat tarqatish nuqtasi.** `ConversationRoom`ning
  `webSocketMessage()`i har bir mutatsiyani (`message` insert/edit/delete, `conversationMember`
  o'qildi-belgisi) avval `@yres/db` orqali Postgres'ga yozadi, keyin barcha ulangan socket'larga
  translatsiya qiladi. DO'ning o'zi hech qanday qayta tiklab bo'lmaydigan holatni saqlamaydi —
  Neon'ning HTTP drayveri DO ichidan ham oddiy Workers bajarilish kontekstidagi kabi ishlaydi
  (`database.md`dagi HTTP-drayver cheklovi bu yerda ham amal qiladi).
- **Ulanmagan a'zolar** (`notifyOfflineMembers()`) hozirda ulangan socket'lardagi
  `deserializeAttachment()`dan yig'ilgan `userId` to'plamiga qarab aniqlanadi — bu shunchaki
  `conversationMember`ning barcha a'zolaridan xabar yuboruvchini va hozir ulangan a'zolarni
  ayirib tashlaydi, alohida "online" holat jadvali kerak emas.
- **`wrangler.toml`dagi `new_sqlite_classes` migratsiya bloki** (`new_classes` emas) SQLite-
  asoslangan saqlash backend'idan foydalanadi — bu Workers Free rejasida ham ishlashi kerak,
  lekin haqiqiy akkauntga nisbatan tasdiqlanmagan (`wrangler.toml`ning shu qatoridagi izohga
  qarang). Deploy'dan oldin tekshiring.
- **Vitest `cloudflare:workers`ni Node ostida hal qila olmaydi.** `src/index.ts` DO klasslarini
  import/re-export qilgani uchun (Cloudflare `class_name`ni Worker'ning kirish moduli
  eksportlariga bog'laydi — alohida fayllarni o'zi kashf qilmaydi), butun test to'plami shu
  modulni yuklamoqchi bo'lganda `Failed to load url cloudflare:workers` bilan yiqiladi. Tuzatish
  `apps/api/vitest.config.ts`dagi `resolve.alias` — `cloudflare:workers`ni arzimas shim klassiga
  (`tests/helpers/cloudflare-workers-shim.ts`) yo'naltiradi. Bu haqiqiy DO'ni hech qachon ishga
  tushirmaydi (bu sandbox'da imkonsiz — `social-features.md`ga qarang), faqat modul grafigi
  yuklanishini ta'minlaydi, shundan keyin integratsiya testlari hujjatlashtirilgan
  `ECONNREFUSED` bilan (lokal Postgres yo'qligi sababli) muvaffaqiyatsiz bo'ladi
  (`testing-and-verification.md`ga qarang) — bu haqiqiy regressiya emas. Yangi DO klassi
  qo'shsangiz va u `src/index.ts`dan eksportlansa, shim'ga qo'shimcha narsa qo'shish shart emas
  (shim faqat `cloudflare:workers`ning o'zini, `DurableObject` bazaviy klassini taqlid qiladi).
- **Bu sandbox'da haqiqiy WebSocket/DO xatti-harakatini hech qachon tekshirib bo'lmaydi**
  (Cloudflare runtime yo'q). Faqat type-check/build/lint orqali tekshirilgan; xabar yuborish/
  qabul qilish/tahrirlash/o'chirish/yozayotganlik/o'qildi va online/oxirgi-ko'rilgan (hali
  ulanmagan — `user.lastSeenAt` yozish joyi `user-notification-channel.ts`ning
  `webSocketClose()`ida izoh sifatida belgilangan, lekin amalga oshirilmagan) haqiqiy
  `wrangler deploy`dan keyin qo'lda tasdiqlanishi kerak.
