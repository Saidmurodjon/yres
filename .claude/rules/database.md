# Baza (Neon + Drizzle)

- **Ilova Neon'ning HTTP drayveridan foydalanadi** (`@neondatabase/serverless` orqali
  `drizzle-orm/neon-http`, `packages/db/src/index.ts`ga qarang), **TCP ulanish pool'idan emas.**
  Bunda bitta katta oqibat bor: **interaktiv tranzaksiyalar yo'q.** Atomik bo'lishi kerak bo'lgan
  har qanday ko'p-bayonotli yozuv o'rniga `db.batch([...])` ishlatadi (`apps/api/src/routes/
  envelope.ts`ning izohiga, va `systems.ts`/`consumption.ts`dagi PUT route'lariga qarang). Yangi
  "shu stsenariyning qatorlarini almashtirish" endpoint'ini qo'shayotganda, mavjud andozaga
  ergashing: bitta `delete().where(...)` bayonoti + bitta shartli `insert().values(rows)`
  bayonoti, ikkalasi birga `db.batch()`ga uzatiladi.
- **Lokal Postgres Neon'ning o'rnini bosa olmaydi.** `packages/db/src/seed.ts`ning boshidagi izoh
  va `README.md` buning sababini tushuntiradi — ilovaning drayveri haqiqiy Neon HTTP endpoint'ini
  talab qiladi. Lokal dev va ushbu sandboxda, agar sessiya uchun haqiqiy `DATABASE_URL`
  berilmagan bo'lsa, baza yo'q.
- **Sxema o'zgarishlari**: `packages/db/src/schemas/`ni tahrirlang, keyin `packages/db/drizzle/`
  ostida migratsiya hosil qilish uchun `bun run db:generate` (`drizzle-kit generate`)ni ishga
  tushiring. Sxema o'zgarishini va hosil qilingan `.sql`ni birga commit qiling.
  `drizzle-kit generate`ga faqat `DATABASE_URL` env o'zgaruvchisi *o'rnatilgan* bo'lishi kerak
  (istalgan qiymat) — u `generate` ishga tushirish uchun ulanmaydi, faqat `migrate`/`push` uchun
  introspeksiya qiladi.
- **`drizzle-kit migrate` ushbu sandboxdan loyihaning Neon instansiyasiga qarshi osilib qolgan
  yoki sezdirmasdan muvaffaqiyatsiz bo'lgan**, verbose/CI rejimida ham foydali xato chiqishi
  bo'lmagan, sababi hech qachon aniqlanmagan (xuddi shu bazaga to'g'ridan-to'g'ri `pg` `Client`
  ulanishi yaxshi ishlaydi). Agar u osilib qolsa yoki xabarsiz 1 bilan chiqsa:
  1. Migratsiyaning `.sql`ini `pg` paketining `Client`i yordamida bir martalik skript bilan
     to'g'ridan-to'g'ri qo'llang (workspace'ning Neon-http `createDb`si emas — u TCP ulanishga
     qarshi shu tarzda ixtiyoriy DDL ishga tushira olmaydi). Buning uchun ulanish satrining
     "-pooler" bo'lmagan host'idan foydalaning.
  2. Buni Drizzle'ning o'z kuzatuv jadvaliga yozib qo'ying, shunda kelajakdagi `drizzle-kit
     migrate` ishga tushirishlari uni qayta qo'llashga urinmaydi: `insert into
     drizzle.__drizzle_migrations (hash, created_at) values ($1, $2)`, bu yerda `hash` —
     migratsiya faylining `sha256sum`i, `created_at` esa `packages/db/drizzle/meta/
     _journal.json`dagi shu migratsiya yozuvidan millisekund vaqt belgisi.
  3. Bir martalik skriptni keyin o'chiring — unda ulanish satri qatorga yozilgan yoki uning
     muhitida bo'ladi.
- **Mavjud jadvalga yangi unique constraint qo'shishdan oldin avval oldindan mavjud
  qoidabuzarliklarni tekshiring** (`select ... group by ... having count(*) > 1`). Bu bizni bir
  marta chalg'itdi: oldingi qo'lda testlashdan qolgan haqiqiy takroriy juftlik production'da
  mavjud edi va hal qilinmaguncha constraint'ni bloklab turdi. Yechimni taxmin qilmang —
  ziddiyatli qatorlarni tekshiring va ataylab tanlang (masalan to'liqroq qatorni saqlang), va
  nima olib tashlangani va nima uchunligini ochiq ayting.
- **Ma'lumotnoma/seed ma'lumoti ko'chirilishi kerak, o'ylab topilmasligi kerak.**
  `packages/db/src/seed.ts`ning boshidagi izohi buni aniq bayon qiladi: har bir qiymat asl Excel
  jadvalidan (`3-DMTT v5.xlsx`, `docs/data-dictionary.md`ga qarang) olingan. Agar bir varaq
  seed'ga faqat qisman kirgan bo'lsa, bo'shliqlarni ishonarli ko'rinadigan raqamlar bilan
  to'ldirish o'rniga buni izohda ayting. Deyarli-takroriy qatorlarni birlashtirganda (masalan
  bir xil koeffitsientli, ikki tilda nomlangan bir xil material), birlashtirish qarorini izohda
  hujjatlashtiring — ma'lumotni sezdirmasdan tashlab yubormang.
- `bun run db:seed` (`seedReferenceDataWithDb`) **agar ma'lumotnoma ma'lumoti allaqachon seed
  qilingandek ko'rinsa, erta chiqib ketadi** (mavjud iqlim mintaqasini tekshiradi). Allaqachon
  seed qilingan bazaga qarshi uni qayta ishga tushirish hech narsa qilmaydi — u `seed.ts`ga yangi
  qo'shilgan qatorlarni *olmaydi*. Allaqachon seed qilingan muhitga yangi seed qatorlarini
  to'ldirish uchun, faqat o'sha yangi qatorlarni to'g'ridan-to'g'ri kiriting
  (`.onConflictDoNothing({ target: table.uniqueColumn })` buni qayta ishga tushirish uchun
  xavfsiz qiladi).
- **Integratsiya test to'plamining `resetTestDb`/`TRUNCATE TABLE ... CASCADE`ini hech qachon
  haqiqiy (production yoki umumiy) bazaga qarshi ishga tushirmang.** U tegadigan har bir
  jadvalni tozalab tashlaydi. Integratsiya testlari amalda qanday ishga tushirilishi kerakligi
  haqida testing.md'ga qarang.
