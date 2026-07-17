# Platforma UI qoidalari

Butun ilova (mavjud sahifalar + `docs/social-features.md`dagi yangi navbar/
profil/chat/bildirishnoma qatlami) uchun umumiy dizayn va unumdorlik
qoidalari. Mavjud `.claude/rules/frontend.md`ni takrorlamaydi — undagi
Tailwind `@source` nozik jihati, mobil navigatsiya andozasi va jadval/tab
overflow qoidalari shu yerda ham amal qiladi, qayta yozilmaydi.

## Dizayn tamoyillari

1. **Zamonaviy va ixcham** — ortiqcha bo'sh joy yo'q, lekin bosim ham yo'q.
   Ma'lumot-zich ekranlar (jadvallar, chat, bildirishnoma ro'yxati) uchun
   torroq bo'shliq (`gap-2`/`p-3`–`p-4`), kartalar/forma bo'limlari uchun
   mavjud shadcn-uslubidagi kenglik (`CardHeader`/`CardContent`da
   `p-6` — `packages/ui/src/components/card.tsx`) o'zgarishsiz qoladi.
   Yangi zich komponent (masalan chat pufakchasi, bildirishnoma qatori)
   qo'shganda, mavjud `Card`ning `p-6`sidan emas, torroq shkaladan
   boshlang.
2. **Bitta manba — `packages/ui`.** Yangi vizual naqsh kerak bo'lsa, avval
   mavjud primitivlarni (`Button`, `Card`, `Table`, `Tabs`, `Select`,
   `Dialog`, va `docs/social-features.md`da rejalashtirilgan
   `DropdownMenu`/`Popover`/`Avatar`) tekshiring. Yangi Radix-asoslangan
   primitiv qo'shilsa, `dialog.tsx`dagi yupqa o'ram + `cn()` andozasiga
   ergashing — maxsus, bir martalik uslublashtirish yozmang.
3. **Rang/tema — yangi token oxirgi chora.** `packages/ui/src/styles/
   globals.css`da allaqachon to'liq shadcn-uslubidagi token to'plami bor
   (`primary`, `secondary`, `muted`, `destructive`, `success`, `warning` —
   har biri ham light, ham dark uchun). Yangi holat (masalan "info" turidagi
   bildirishnoma) uchun avval shulardan mos kelishini ko'ring (`accent`
   yoki `muted` ko'pincha yetarli); faqat haqiqatan alohida ma'nosi bo'lgan
   holatlar uchun yangi `--color-*` token qo'shing, va uni ikkala tema
   uchun ham to'ldiring — bittasi uchun qoldirilgan token light/dark
   almashtirishda ko'rinmay qoladi.
4. **Tipografiya — mavjud Tailwind shkalasi.** Yangi font-o'lcham
   ixtiro qilmang; `text-sm` (yordamchi matn/label), `text-base`
   (asosiy matn), `text-lg`/`font-semibold` (sarlavha, `CardTitle`dagi
   kabi) yetarli. Chat/bildirishnoma kabi zich ro'yxatlarda asosiy matn
   `text-sm` bo'lsin (`text-base` emas) — zichlikni saqlash uchun.

## Responsive strategiya

Loyiha Tailwind'ning standart breakpoint'laridan foydalanadi — yangi
maxsus breakpoint kiritilmaydi:

| Breakpoint | Kenglik | Qurilma |
|---|---|---|
| (standart) | < 640px | Telefon |
| `sm` | ≥ 640px | Planshet (portret) / katta telefon |
| `md` | ≥ 768px | Planshet (albom) / kichik noutbuk |
| `lg` | ≥ 1024px | Desktop |
| `xl` | ≥ 1280px | Keng desktop |

Navbar allaqachon ikki rejimli: `sm`dan past — ixcham icon-only mobil
header; `sm` va undan yuqori — to'liq yorliqli sidebar
(`apps/web/src/components/app-shell.tsx`, `.claude/rules/frontend.md`da
hujjatlashtirilgan). **Bu ikki-rejimli tuzilma planshet uchun ham
yetarli** — `sm`dan boshlab kenglik sidebar uchun joy beradi, shuning
uchun uchinchi (planshet-maxsus) layout rejimi qo'shish ortiqcha
murakkablik bo'lardi. Yangi sahifa qo'shganda, uni faqat `lg+`da emas,
`sm+`da ham (planshetda) haqiqiy qurilma kengligida tekshiring — ayniqsa
jadval/forma bo'limlari yon-yonlashishi kerak bo'lgan joylarda (`grid
sm:grid-cols-2 lg:grid-cols-3` uslubidagi bosqichma-bosqich kengayish,
faqat bitta `lg:grid-cols-N` sakrashi emas).

## State boshqaruvi: Zustand — faqat haqiqiy global-mijoz holati uchun

Ilovada bugun global client-state kutubxonasi yo'q — server ma'lumoti
TanStack Query orqali keshlanadi, qolgani lokal `useState`. Yangi
real-time xususiyatlar (chat, bildirishnoma) uchun **Zustand** qo'shiladi
(loyiha egasi bilan tasdiqlangan — Redux'ga qaraganda ancha kam
boilerplate, kichik bundle).

**Muhim chegara — ikkalasini aralashtirmang:**
- **TanStack Query** — server'dan kelgan, bazada saqlanadigan hamma narsa:
  xabarlar ro'yxati, bildirishnomalar ro'yxati, foydalanuvchi profili.
  WebSocket orqali yangi xabar kelganda, uni Zustand'ga nusxalab
  qo'ymang — `queryClient.setQueryData(...)` yoki `invalidateQueries(...)`
  chaqirib, react-query keshini yangilang. Bitta ma'lumot ikki joyda
  (kesh + store) saqlansa, ular sinxrondan chiqib, "chatda xabar
  ko'rinadi lekin sahifa yangilanganda yo'qoladi" uslubidagi buglarga olib
  keladi.
- **Zustand** — faqat bazaga umuman yozilmaydigan, sof-mijoz, vaqtinchalik
  holat uchun: WebSocket ulanish holati (`connecting`/`open`/`closed`),
  kim hozir yozayotgani (`typing` xaritasi, `conversationId → userId[]`),
  qaysi suhbat oynasi hozir ochiq (fokusni bilish uchun — bildirishnoma
  yuborish kerakmi yo'qmi shuni aniqlaydi). Bu holat sahifa yangilansa
  yo'qolishi tabiiy va kutilgan.

## Unumdorlik (ma'lumot kechikishi va sekinlikni oldini olish)

- **Uzun ro'yxatlarni virtuallashtiring.** Chat xabar tarixi, bildirishnoma
  ro'yxati, admin foydalanuvchilar ro'yxati — 50+ elementga yetganda,
  `@tanstack/react-virtual` bilan (allaqachon ishlatilayotgan TanStack
  oilasidan, yangi konseptual bog'liqlik emas) faqat ko'rinadigan
  qatorlarni render qiling. Yuzlab DOM tugunini bir vaqtda chizish —
  sekinlashtirishning eng oson yo'li.
- **Yuqori chastotali hodisalarni debounce/throttle qiling.** Yozayotganlik
  indikatori har bosilgan tugmada emas, ~300–500ms debounce bilan
  yuborilsin. WebSocket qayta ulanish — eksponensial backoff bilan (uzilib
  qolgan ulanish serverni har soniyada urib turmasin).
- **React Query'ni to'g'ri sozlang.** Kamdan-kam o'zgaradigan ma'lumot
  (iqlim/ma'lumotnoma jadvallari) uchun uzun `staleTime`; chat/bildirishnoma
  esa WebSocket push orqali yangilanadi — ularga qisqa interval bilan
  polling qo'shmang (ikkalasi qo'shilsa ortiqcha so'rov + potensial poydan
  keladigan ma'lumot). Socket uzilib qolgan holatlar uchungina past
  chastotali (masalan 30s) zaxira polling qo'ying, asosiy yangilanish
  yo'li sifatida emas.
- **Xabar ro'yxati elementlarini memoize qiling.** Ko'p xabarli suhbatda
  yangi xabar kelganda faqat oxirgisi qo'shilishi kerak, butun ro'yxat
  qayta render bo'lmasligi kerak — har bir xabar-komponentini `React.memo`
  bilan, `id` bo'yicha o'ralgan holda saqlang. Boshqa joyda oldindan
  memoizatsiya qilishga urinmang — faqat o'lchangan/kutilgan qayta-render
  xarajati bor joyda.
- **Parallel so'rovlar, ketma-ket emas.** Bir sahifa bir nechta mustaqil
  ma'lumotga muhtoj bo'lsa (masalan suhbatlar ro'yxati + foydalanuvchi
  profili), ularni react-query'ning parallel so'rov andozasi bilan bir
  vaqtda so'rang, birini kutib keyin ikkinchisini boshlamang (waterfall).
- **Rasm/fayl biriktirmalarni "lazy" yuklang** (`loading="lazy"`,
  cheklangan preview o'lchami) — to'liq o'lchamli faylni oldindan
  yuklamang.
- **Icon import'lari — bittalab, butun paket emas.** `lucide-react`dan
  har doim kerakli icon'ni alohida import qiling (mavjud andoza), yangi
  icon qo'shganda ham shu tarzda — butun kutubxonani import qilish bundle
  hajmini keraksiz oshiradi.

## Tekshirish

Yangi UI komponenti/sahifa qo'shilganda, `.claude/rules/
testing-and-verification.md`dagi mavjud jarayon (mock-API-server orqali
brauzer preview'ida tekshirish) qo'llanadi — bu yerda qayta yozilmaydi.
Qo'shimcha ravishda: yangi sahifani kamida ikkita eni bilan tekshiring —
telefon eni (< 640px) va planshet/desktop eni (≥ 1024px) — faqat bittasida
emas, ikkalasida ham joylashuvni ko'zdan kechiring.
