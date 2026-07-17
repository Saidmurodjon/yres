# Testlash va tekshirish

## Test to'plamining bo'linishi

`apps/api` Vitest'dan foydalanadi (`bun run test`, repo ildizidan yoki `apps/api`dan).

- **`apps/api/tests/services/*.test.ts`** — alohida hisoblash funksiyalarining (issiqlik
  yo'qotish, ventilyatsiya, moliya, generatsiya va h.k.) sof unit testlari. Baza kerak emas.
  Bular doim o'tishi kerak; bu yerdagi muvaffaqiyatsizlik haqiqiy regressiya.
- **`apps/api/tests/integration/*.test.ts`** — `tests/helpers/test-db.ts`ning har testlar orasida
  har bir jadvalni `TRUNCATE` qiladigan `resetTestDb()`i orqali haqiqiy Postgres'ga qarshi to'liq
  HTTP-route testlari. Ularga `127.0.0.1:5432`da tinglayotgan lokal Postgres kerak. **Bu sandbox'da
  lokal Postgres yo'q**, shuning uchun bu yerda har bir integratsiya testi `ECONNREFUSED` bilan
  muvaffaqiyatsiz bo'ladi — bu kutilgan holat, haqiqiy regressiya belgisi emas. Buni
  `DATABASE_URL`ni haqiqiy Neon bazasiga yo'naltirib "tuzatishga" urinmang; bu production
  ma'lumotlarini `TRUNCATE` qilib yuboradi (database.md'ga qarang).
- `apps/api/src/services/`da hisoblash logikasini o'zgartirganda, baribir `bun run test`ni ishga
  tushiring — servis darajasidagi unit testlar integratsiya to'plami bu yerda ishlay olmasa ham
  haqiqiy buzilishni tutib qoladi. Agar unit test bera olmaydigan end-to-end ishonch kerak bo'lsa
  (masalan faqat to'liq HTTP route + baza orqali ko'rinadigan o'zgarish), to'liq qamrov haqida
  da'vo qilish o'rniga buni ochiq aytish halol yo'l.

## Har qanday o'zgarishni tugallangan deb hisoblashdan oldin

1. Tegilgan workspace(lar)da `bun run type-check` (yoki keng qamrovli o'zgarish uchun ildizdan).
2. `apps/web` uchun `bun run build` — u `vite build && tsc --noEmit`ni ishga tushiradi, va haqiqiy
   Vite build faqat quriladigan CSS chiqishida ko'rinadigan narsalarni (frontend.md'dagi Tailwind
   `@source` nozik jihatiga qarang) yalang'och `tsc` o'tishi tutib bermaydigan holda tutib oladi.
3. Tegilgan fayllarga `bunx biome lint <fayllar>`.
4. Backend hisoblash o'zgarishlari uchun: `bun run test` (servis unit testlari).

## Lokal bazasiz UI o'zgarishlarini tekshirish

Odatda bu sandbox'da baza mavjud emas, bu autentifikatsiyalangan ilovaning (dashboard, binolar,
natijalar va h.k.) oddiy dev-server orqali haqiqiy ma'lumotni ko'rsatishiga to'sqinlik qiladi.
O'rnatilgan yechim:

1. `.claude/launch.json` ikkita dev-server konfiguratsiyasini belgilaydi: `web` (`vite` dev-server,
   5173-port) va `web-preview` (production `dist/` build'ga qarshi `vite preview`, 4173-port —
   buni maxsus faqat production-build'ga xos xatti-harakatni, masalan eskirgan-chunk xato
   chegarasini, sinash uchun ishlating).
2. Birini xom `Bash` emas, Preview MCP vositasining `preview_start`i bilan ishga tushiring —
   vosita tavsifi buni ochiq aytadi, va bu sizga `preview_screenshot`/`preview_eval`/va h.k.ni
   beradi.
3. Ilovani haqiqiy API o'rniga bir martalik lokal mock API'ga yo'naltiring: kichik `Bun.serve()`
   skripti yozing (repo'dan *tashqarida* joylashgan scratch fayl, masalan `~/mock-api-server.mjs`
   — commit qilmang) — u `/api/auth/get-session`, `/api/buildings/...` va sinovdagi sahifaga
   kerak bo'lgan boshqa narsalarga `http://localhost:5173`ga ruxsat beruvchi CORS sarlavhalari
   (`Access-Control-Allow-Credentials: true`) bilan javob beradi. `apps/web/.env.local`ni
   (gitignore qilingan) `VITE_API_URL=http://localhost:4001`ga (yoki qaysi port bo'lsa) o'rnating,
   Vite yangi env o'zgaruvchisini ilg'ashi uchun dev-server'ni qayta ishga tushiring, va tugagach
   ham mock server'ni, ham `.env.local`ni o'chiring.
4. Mock ma'lumot yolg'on topilmalarni keltirib chiqarmasligi uchun haqiqiy shaklga yetarlicha
   yaqin bo'lishi kerak — masalan mock ma'lumotdagi yaroqsiz enum qiymati (haqiqiy union'da
   yo'q `buildingType`) haqiqiy UI bug'i shu yerda bordek ko'rsatishi mumkin, aslida bu shunchaki
   yomon fixture ma'lumoti. Nima chizilganiga ishonishdan oldin mock'ni `apps/web/src/lib/
   api-types.ts` / `packages/types`ga qarshi qayta tekshiring.
5. `preview_screenshot` sahifa navigatsiyasidan keyin ilovaga bog'liq bo'lmagan sabablarga ko'ra
   ba'zan osilib qoladi/vaqti tugaydi. Ketma-ket ikki marta vaqti tugasa, xuddi shu chaqiruvni
   qayta urinishda davom etish o'rniga preview server'ni to'xtatib qayta ishga tushiring
   (`preview_stop`, keyin `preview_start`).
6. Tozalash: mock server jarayonini o'ldiring, tekshiruv tugagach scratch mock-server faylini va
   `apps/web/.env.local`ni o'chiring — ularni keyingi sessiya uchun qoldirmang.
