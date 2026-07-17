# Ko'p tillilik (uz/ru/en) va kun/tun rejimi

To'liq dizayn `docs/i18n-and-appearance.md`da — shu yerda takrorlanmaydi.
Eng muhim, unutilsa qimmatga tushadigan jihatlar:

- **`react-i18next` ishlatiladi, maxsus yechim emas** — ayniqsa rus
  tilining `_one`/`_few`/`_many`/`_other` ko'plik shakllarini qo'lda
  yozishga urinmang, `i18next`ning o'rnatilgan tizimidan foydalaning.
- **Kun/tun uchun CSS allaqachon tayyor** (`packages/ui/src/styles/
  globals.css`dagi `data-theme` va `prefers-color-scheme`) — yangi CSS
  qoidasi qo'shmang, faqat `document.documentElement.dataset.theme`ni
  o'rnatuvchi/olib tashlovchi toggle kerak. Tema holati `docs/
  ui-guidelines.md`dagi qoidaga ko'ra Zustand'da (sof-mijoz holat).
- **Til/tema localStorage'da, baza ustunida emas** — ataylab shunday,
  qurilmalar orasida sinxronlanmaydi. Buni "to'g'irlash" uchun sezdirmasdan
  baza ustuni qo'shmang — bu ataylab qilingan ko'lam qarori.
- **Maxsus energiya-audit terminologiyasini tarjima qilishda ehtiyot
  bo'ling** — mexanik tarjima aniqlik xavfi keltiradi (bankka tayyor
  hisobot matni). Texnik atamalar tarjimasini loyiha egasi ko'rib chiqishi
  kerak, ayniqsa rus tilida.
- **Email shablonlari tarjima qilinmaydi** (hozircha) — bitta belgilangan
  tilda qoladi, bu ataylab qilingan ko'lam chegarasi.

To'liq kontekst uchun `docs/i18n-and-appearance.md`ni o'qing.
