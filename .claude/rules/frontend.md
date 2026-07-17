# Frontend (React / TanStack Router / Tailwind v4 / `@yres/ui`)

## `packages/ui`ning Tailwind kontent-skanerlash nozik jihati

**Bu repo'dagi eng muhim frontend qoidasi.** Tailwind v4'ning avtomatik kontent skani, `apps/web`
uni `node_modules/@yres/ui` orqali (bun workspace symlink'i) hal qilgach, `packages/ui`ni vendor
kod deb hisoblaydi — shuning uchun `packages/ui`dagi umumiy komponent ichida **faqat** ishlatilgan
va `apps/web`ning o'z manba kodida so'zma-so'z takrorlanmagan har qanday utility klass, quriladigan
CSS'dan sezdirmasdan yo'qolib qoladi. Bu shunchaki dev-rejimidagi kesh artefakti emas — bu yangi
production build'da ham takrorlanadi.

Bu bir marta umumiy `Button`dagi `inline-flex`/`whitespace-nowrap`ni buzgan edi, bu esa
production'da ilovadagi barcha icon tugmalarni (icon label ustida to'planib) `display: block`
ko'rinishida chizdirgan — qancha vaqt davomida sezilmay qolgan edi. Tuzatish
`packages/ui/src/styles/globals.css`dagi `@source` direktivasi:
```css
@import "tailwindcss";
@source "../**/*.{ts,tsx}";
```
Agar `packages/ui`ga `apps/web`ning boshqa hech qayerida ishlatilmaydigan klasslarni kiritadigan
yangi komponent qo'shsangiz, **ular haqiqatan ham haqiqiy build'ning chiqish CSS'ida paydo
bo'lishini tekshiring** — `bun run build`dan keyin
`grep -o '\.your-class{[^}]*}' apps/web/dist/assets/*.css` — "u className satrida bor" degani
stylesheet'ga tushdi degani emas, bunga ishonmang. Dev-server'dagi vizual tekshiruv ham yetarli
dalil emas — quriladigan CSS'ni tekshiring.

## TanStack Router — deploy'dan keyingi eskirgan chunk'lar

Har bir route alohida kontent-xeshlangan JS chunk'i. Deploy paytida ochiq qolgan brauzer tab'i
*oldingi* deploy'ning xesh qiymatlariga route-manifest havolalarini saqlab qoladi, yangi deploy
ularni bermaydi — keyingi lazy-yuklanadigan route to'g'ridan-to'g'ri router'ning standart (xom,
texnik) xato ekraniga `Failed to fetch dynamically imported module` xatosini otadi.
`apps/web/src/routes/__root.tsx`ning `errorComponent`i buni allaqachon boshqaradi: u shu aniq
xatoni aniqlaydi va tab'ni bir marta qayta yuklaydi (*doimiy* muvaffaqiyatsizlik cheksiz qayta
yuklanmasligi uchun `sessionStorage` bayrog'i bilan himoyalangan), boshqa har qanday narsa uchun
oddiy "Nimadir xato ketdi" + Qayta yuklash tugmasiga qaytadi. Buni olib tashlamang yoki chetlab
o'tmang — bu "ilova shunchaki sezdirmasdan tiklanadi" bilan "har bir deploy'da tab'i ochiq bo'lgan
har kimga xom stack trace ko'rsatiladi" o'rtasidagi farq.

## Jadval va tab panellari — tor viewport'da overflow

- `packages/ui/src/components/table.tsx`ning `TableCell`/`TableHead`si `whitespace-nowrap`ni
  o'zida saqlaydi. Busiz, tabiiy kontent kengligidan tor jadval, `Table` o'ramining `overflow-auto`
  allaqachon ta'minlaydigan gorizontal scroll'dan foydalanish o'rniga katak matnini 2–3 qatorga
  o'raydi. Buni yangi jadval-chizuvchi komponentda saqlang; o'ralishni "tuzatish" uchun olib
  tashlamang — tuzatish scroll qilish, ustunlarni kichraytirish emas.
- `packages/ui/src/components/tabs.tsx`ning `TabsList`si xuddi shu sababdan `max-w-full
  overflow-x-auto`ni o'zida saqlaydi — bino-tafsilot sahifasida 6 ta tab bor, va busiz oxirgilari
  (Chora-tadbirlar, Ulashish) telefon-kengligidagi viewport'larda o'ng chetdan chiqib ketardi,
  ularga yetish imkonisiz.

## Mobil navigatsiya

`apps/web/src/components/app-shell.tsx`ning sidebar'i `hidden ... sm:flex` — `sm` breakpoint'idan
past butunlay yo'q. O'sha oralig' uchun alohida ixcham icon-only `<header>` bor (logotip, nav
icon'lari, chiqish). Yangi yuqori-darajali nav manzilini qo'shsangiz, ikkalasiga ham qo'shing —
umumiy `NAV_ITEMS` massivi desktop sidebar'ini ta'minlaydi, lekin mobil header o'sha massivdan
o'zining alohida markup'ini chizadi. Shell'ning boshqa hech qayerida `hidden ... sm:flex`
naqshini past-`sm` fallback'isiz qayta kiritmang — sidebar bug'i aynan shu tarzda sodir bo'lgan.

## Umumiy

- Ad hoc markup o'rniga mavjud `@yres/ui` primitivlarini (`Button`, `Card`, `Table`, `Tabs`,
  `Select`, `Dialog` va h.k. — `packages/ui/src/components/`ga qarang) afzal ko'ring. Hali
  `Sheet`/`Drawer` komponenti yo'q; mavjud deb taxmin qilmang.
- `apps/web/src/routes/` ostidagi route fayllari TanStack Router'ning fayl-asoslangan
  route'lari — fayl yo'li URL'ni belgilaydi. `_authenticated.tsx`ning `beforeLoad`i
  `_authenticated/` ostidagi har bir route'ni haqiqiy sessiyaga bog'laydi; bu tekshiruvni
  alohida route komponentlari ichida takrorlamang.
- `formatNumber`/`formatCurrency`/`formatDate`/label yordamchilari `apps/web/src/lib/labels.ts`da
  yashaydi — komponentda switch/ternary yozish o'rniga yangi enum-ga-label xaritalarini shu
  yerga qo'shing.
