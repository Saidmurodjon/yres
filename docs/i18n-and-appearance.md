# Ko'p tillilik (uz/ru/en) va kun/tun rejimi — dizayn hujjati

Holati: **taklif qilingan, tasdiqlanishi kutilmoqda** — hech narsa hali
qurilmagan. `docs/social-features.md` va `docs/ui-guidelines.md` bilan bir
xil tasdiqlash jarayonidan o'tadi.

## Maqsad

- Platforma sozlamalarida til tanlash: **O'zbek / Русский / English**.
- Platforma sozlamalarida ko'rinish (tema) tanlash: **kun / tun / tizim**.
- Bu **butun mavjud ilovaga** qo'llanadi (dashboard, binolar, envelope,
  tizimlar, iste'mol, chora-tadbirlar, audit natijalari, moliyaviy
  hisob-kitoblar), yangi navbar/profil/chat/bildirishnoma sahifalari bilan
  birga — loyiha egasi bilan tasdiqlangan ko'lam.

## Joriy holat (nima uchun bu katta ish)

Ilovada hozircha **hech qanday i18n infratuzilmasi yo'q** — barcha matn
qattiq kodlangan, va **faqat inglizcha** (`apps/web/src/lib/labels.ts`dagi
label xaritalari, va JSX ichidagi bevosita matnlar). Taxminan 30 ta
`.tsx` fayl bor (`routes/` ostida 14, `components/` ostida 15) — bularning
deyarli barchasida foydalanuvchiga ko'rinadigan qattiq kodlangan matn bor,
hammasi kalitlarga o'tkazilishi kerak.

Kun/tun rejimi uchun esa CSS tomoni **allaqachon tayyor**:
`packages/ui/src/styles/globals.css`da `:root[data-theme="dark"]` override'i
va `@media (prefers-color-scheme: dark)` fallback'i mavjud — faqat
foydalanuvchi tomonidan boshqariladigan almashtirgich (toggle) yo'q.

## Kutubxona: `react-i18next`

Loyiha egasi bilan tasdiqlangan (yengil maxsus yechimga nisbatan). Sabab:
**rus tilining ko'plik qoidalari murakkab** (1 → bitta shakl, 2–4 → boshqa
shakl, 5+ → yana boshqa shakl — masalan "1 bino" / "2 bino" / "5 bino"ning
rus ekvivalentlari uchinchi holatda butunlay boshqacha so'z shaklini
talab qiladi). `i18next`ning o'rnatilgan `_one`/`_few`/`_many`/`_other`
suffiks tizimi buni sinovdan o'tgan holda hal qiladi — buni qo'lda yozish
xato qilish ehtimoli yuqori joy edi.

Yangi bog'liqliklar (`apps/web/package.json`): `i18next`, `react-i18next`,
`i18next-browser-languagedetector` (brauzer tilini avtomatik aniqlash).

## Fayl strukturasi

```
apps/web/src/i18n/
  index.ts                 # i18next.init(...), til ro'yxati, fallback
  locales/
    uz/
      common.json           # umumiy tugmalar/label (Saqlash, Bekor qilish, ...)
      nav.json               # navbar/sidebar band nomlari
      auth.json               # login/register/parol
      buildings.json
      envelope.json
      systems.json
      consumption.json
      measures.json
      audit.json
      financial.json
      admin.json              # rollar/foydalanuvchilar (social-features.md)
      chat.json                # (social-features.md)
      notifications.json        # (social-features.md)
      settings.json              # til/tema sozlamalari sahifasining o'zi
    ru/ ...   (bir xil namespace to'plami)
    en/ ...   (bir xil namespace to'plami)
```

Namespace nomlari mavjud `apps/web/src/routes/_authenticated/` va
`components/` papka strukturasiga mos keladi — yangi fayl/sahifa qaysi
sohaga tegishli bo'lsa, matnlari o'sha namespace'ga qo'shiladi, yangi
tuzilma o'ylab topilmaydi.

**Standart til**: `i18next-browser-languagedetector` brauzer tilini
aniqlaydi; qo'llab-quvvatlanmagan yoki aniqlanmagan bo'lsa, **o'zbek**
tiliga tushadi (loyihaning asosiy tili, `CLAUDE.md`ga muvofiq). Tanlov
`/settings` sahifasida o'zgartiriladi va **localStorage**da saqlanadi —
baza ustuni qo'shilmaydi (qurilmalar orasida sinxronlanmaydi; bu ataylab
soddalik uchun tanlangan qaror, keyin kerak bo'lsa `user.locale` ustuni
qo'shish oson bo'ladi, hozircha ortiqcha murakkablik bo'lardi).

## Kun/tun rejimi

Yangi `useTheme` hook — `docs/ui-guidelines.md`dagi qoidaga muvofiq,
Zustand'da saqlanadi (sof-mijoz holat, bazaga yozilmaydi). Uch qiymat:
`light` / `dark` / `system`.
- `light`/`dark` — `document.documentElement.dataset.theme` shu qiymatga
  o'rnatiladi, mavjud CSS `:root[data-theme="..."]` qoidalari ishlaydi.
- `system` — `data-theme` atributi olib tashlanadi, mavjud
  `@media (prefers-color-scheme: dark)` CSS qoidasi o'zi hal qiladi
  (qurilma sozlamasiga ergashadi).
Tanlov localStorage'da saqlanadi, sahifa yuklanishida `<html>`ga
flash-of-wrong-theme bo'lmasligi uchun **birinchi render'dan oldin**
qo'llaniladi (inline script yoki `index.html`dagi bloklovchi skript —
`apps/web/src/routes/__root.tsx`da amalga oshiriladi).

## Yangi `/settings` sahifasi

`apps/web/src/routes/_authenticated/settings.tsx` — ikki bo'lim:
- **Til**: uchta variantli selektor (O'zbek / Русский / English),
  tanlanganda `i18n.changeLanguage(...)` chaqiriladi + localStorage'ga
  yoziladi.
- **Ko'rinish**: kun/tun/tizim — yuqoridagi `useTheme` bilan bog'langan.

`ProfileMenu`dan (`docs/social-features.md`) "Sozlamalar" havolasi qo'shiladi.

## Ochiq xatarlar / qurishdan oldin aqlga sig'diriladigan qarorlar

- **Maxsus energiya-audit terminologiyasini mexanik tarjima qilish aniqlik
  xavfini olib keladi.** So'zlar (U-qiymat, issiqlik yo'qotish,
  ventilyatsiya, DHW, generatsiya manbai va h.k.) professional registrda,
  mavjud muhandislik konvensiyalariga asoslanib tarjima qilinadi, lekin
  bu **bankka tayyor** hisobot matni bo'lgani uchun (`CLAUDE.md`), loyiha
  egasi (domain ekspertizasi bilan) texnik lug'atni ishga tushirishdan
  oldin ko'rib chiqishi qattiq tavsiya etiladi — ayniqsa rus tilidagi
  atamalar uchun.
- **Email shablonlari (xush kelibsiz, parolni tiklash) hozircha tarjima
  qilinmaydi** — alohida so'ralmagan, bitta belgilangan tilda (o'zbek)
  qoladi. Bu ochiq belgilab qo'yilmoqda, sezdirmasdan tashlab
  yuborilmasin degan maqsadda; kerak bo'lsa keyingi bosqich sifatida
  qo'shiladi.
- **Til/tema localStorage'da, baza ustunida emas** — qurilmalar orasida
  sinxronlanmaydi. Ataylab soddalik uchun tanlangan; kerak bo'lsa
  `user.locale`/`user.themePreference` ustunlari qo'shib, keyinroq
  serverga ko'chirish mumkin.
- **~30 ta faylni kalitlarga o'tkazish mexanik, katta hajmli ish** — har
  bir namespace alohida commit sifatida qilinadi (bitta katta commit
  emas), `.claude/rules/git-and-commits.md`dagi granulyarlik qoidasiga
  muvofiq.

## Qurish tartibi

1. **i18n infratuzilmasi** — kutubxonalar, `apps/web/src/i18n/index.ts`,
   `__root.tsx`da bloklovchi tema-skript, bo'sh/minimal `common.json` uch
   tilda. Type-check, build, commit.
2. **`useTheme` + `/settings` sahifasi (ko'rinish qismi)** — Zustand store,
   toggle UI. Build, commit.
3. **Til selektori `/settings`da** — `common`/`settings` namespace'lari uch
   tilda to'liq, `ProfileMenu`ga havola. Build, commit.
4. **Mavjud sahifalarni namespace bo'yicha ko'chirish** — har bir namespace
   (`nav`, `auth`, `buildings`, `envelope`, `systems`, `consumption`,
   `measures`, `audit`, `financial`, `admin`) uchun alohida commit: matnni
   `useTranslation()` kalitlariga o'tkazish + uch tilga tarjima qilish.
   Har birida type-check + build + biome lint + brauzer preview'ida
   ko'zdan kechirish (uchala tilda ham).
5. **Yangi sahifalar (chat, notifications, settings)** — `docs/
   social-features.md`dagi tegishli bosqichlar bilan birga, boshidanoq
   tarjima kalitlari bilan yoziladi (keyinroq alohida ko'chirish kerak
   bo'lmaydi).
6. **Yakunlash** — barcha namespace'lar uchala tilda to'liqligini
   tekshirish (yetishmayotgan kalit — build vaqtida yoki runtime'da ko'rinadigan
   xato bo'lishi kerak, sukut bo'yicha jimgina inglizcha qolib ketmasin),
   `PROGRESS.md` yangilash.
