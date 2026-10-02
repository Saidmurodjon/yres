# Deployment

To'liq birinchi marta sozlash (Cloudflare/D1 provisioning, sirlar, GitHub Actions)
`docs/deployment.md`da — bu fayl faqat kundalik amalda ishlatiladigan qo'lda deploy yo'lini va
qayta kashf qilishga arzimaydigan faktlarni qamrab oladi.

## Production manzillari

- Web: `https://yres.saidmurod.com` (Cloudflare Pages loyihasi `yres-web`)
- API: `https://yres-api.saidmurod.com` (Cloudflare Worker `yres-api-production`, maxsus domen —
  `apps/api/wrangler.toml`ning `[env.production]`iga qarang)

Ikkalasi ham `saidmurod.com`ning qo'shni subdomenlarida, `*.pages.dev`/`*.workers.dev`da emas —
bu auth cookie'lari uchun yuk ko'taruvchi (auth.md'ga qarang). Agar ikkala maxsus domen
routing'i qayta sozlanishi kerak bo'lsa, shu munosabatni saqlang.

## Qo'lda deploy

```bash
# API — avval migratsiya (faqat qo'shuvchi — data-integrity.md), keyin kod
cd apps/api
npx wrangler d1 migrations apply DB --remote --env production   # = bun run db:migrate:prod
npx wrangler deploy --env production

# Web — VITE_API_URL *build* vaqtida o'rnatilishi shart (Vite env o'zgaruvchilarini inline qiladi), shunchaki deploy vaqtida emas
cd apps/web
VITE_API_URL=https://yres-api.saidmurod.com bun run build
npx wrangler pages deploy dist --project-name=yres-web --branch=main --commit-dirty=true
```

`--commit-dirty=true` kerak, chunki bu workflow'da (avval deploy, tekshirgandan keyin commit)
ishchi daraxtda deploy vaqtida odatda commit qilinmagan o'zgarishlar bo'ladi — buni tashlab
qo'ysangiz, Wrangler interaktiv so'raydi, bu esa interaktiv bo'lmagan sessiyani osilib qoldiradi.

GitHub Actions pipeline'i ham mavjud (`.github/workflows/deploy.yml`, CI + muhit-himoya
sirlariga bog'liq, `docs/deployment.md`ga qarang), lekin bu hozirgacha haqiqiy ishlatilgan deploy
yo'li bo'lmagan — o'sha pipeline'ning sirlari sozlangani tasdiqlanmaguncha branch'ga push qilish
biror narsani deploy qiladi deb taxmin qilmang.

## Veb-ilovani deploy qilgandan so'ng, deploy qilingan asset xeshlari haqiqatan o'zgarganini tekshiring

`wrangler pages deploy` har bir faylni kontent-xeshlaydi; kerakli manba o'zgarishini ilg'amagan
build yangi-ko'rinishdagi xeshlar bilan eskirgan-ko'rinishdagi asset'larni sezdirmasdan deploy
qiladi. Tekshirish uchun
`curl -s https://yres.saidmurod.com/ | grep -o 'assets/index-[A-Za-z0-9_-]*\.js'` ishlating va
qurilgan bundle haqiqatan o'zgargan narsani o'z ichiga olishini tasdiqlang, masalan CSS-klass
tuzatishi uchun `grep -o '\.inline-flex{[^}]*}' apps/web/dist/assets/*.css`.

## Sirlar (Secrets)

`apps/api/`dan `wrangler secret put <NAME> --env production` orqali o'rnatiladi, hech qachon
commit qilinmaydi. Joriy to'plam: `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`. `SENTRY_DSN` ixtiyoriy (bo'sh bo'lsa xato hisoboti
hech narsa qilmaydi — `apps/api/src/index.ts`dagi `withSentry` o'ramiga qarang).
`YANDEX_STATIC_MAPS_API_KEY` ham ixtiyoriy — bo'sh bo'lsa PDF hisobotdagi bino-joylashuvi
xaritasi rasmi shunchaki o'tkazib yuboriladi, koordinatalar matn sifatida qoladi
(`report.service.ts`ning `fetchYandexStaticMapPng()`i har qanday xatoda `null` qaytaradi).
Wrangler
sirlari faqat-yozish uchun — CLI orqali sir qiymatini qaytarib o'qishning iloji yo'q. Baza uchun sir
yo'q: D1 `wrangler.toml`dagi `DB` binding'i orqali ulanadi. Production D1'ga yozish (`--remote`) — faqat
loyiha egasi buyrug'i bilan (`database.md`).

## Backup va tiklash

`docs/runbooks/backup-va-tiklash.md` — D1 Time Travel va choraklik tiklash mashqi; buyruqlarni faqat loyiha egasi ishga tushiradi.
