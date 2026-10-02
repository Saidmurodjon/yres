# Formalar, raqam kiritish va saqlanmagan tahrirlar

Manba: `docs/production/03-ux-va-malumot-kiritish.md` §1.1 (U1–U7), §2.3, §6.3–6.4. Bu fayldagi qoidalar
**ma'lumot yo'qolishi va noto'g'ri raqam** xavfini yopadi — energiya auditida jimgina `0` bankka ketadigan
hisobotdagi xato raqam degani.

- **Raqam kiritish faqat `NumberInput` orqali** (`apps/web/src/components/number-input.tsx`). `<Input type="number">`
  yangi kodda taqiqlangan: u uz/ru foydalanuvchining `12,5` ini brauzerga qarab `""` yoki `12` qiladi.
- **Raqamni parse qilish faqat `parseLocaleNumber()`** (`apps/web/src/lib/number.ts`). `Number()`, `parseFloat()`,
  `parseInt()` foydalanuvchi kiritgan matnga qo'llanmaydi (`parseFloat("12abc") === 12`).
- **Noto'g'ri qiymat hech qachon jimgina default'ga aylanmaydi.** `|| 0`, `?? 0`, `|| 20`, NaN'ni tashlab yuborish —
  taqiqlangan. `invalid` → maydon ostida inline xato + saqlash to'xtaydi. Bo'sh maydon → agar backend sxemasi
  `.nullable()` bo'lsa `null`, aks holda xato. Biznes default'i (masalan umr 20 yil) faqat **bo'sh** qiymatga qo'llanadi,
  noto'g'ri qiymatga emas.
- **Lokal ilova tilidan** (`i18n.language` → `toNumberLocale()`), brauzerdan emas. Server qiymatini forma holatiga
  yuklash — `formatNumberForInput()`, `String(value)` emas.
- **Hech bir forma saqlanmagan tahrirni jimgina tashlamaydi.** Iflos holat `useRegisterDirty()` bilan
  `UnsavedChangesProvider` ga ro'yxatdan o'tadi; tab almashtirish, scenario almashtirish, route'dan chiqish,
  sahifani yopish, dialogni yopish — tasdiq so'raydi (`useConfirmDiscard`, router `useBlocker`).
- **Server ma'lumotidan sinxronlanadigan tahrir holati** `useSyncedRows()` orqali: refetch iflos holatni ustidan
  yozmaydi. `useEffect(() => setRows(server), [server])` andozasi taqiqlangan — aynan u tizimlar kartalarida
  qo'shni kartani saqlaganda tahrirlarni o'chirgan (U2).
- **"Qatorlarni almashtirish" saqlashlari:** foydalanuvchi qatorni bo'shatgan bo'lsa, bo'sh guruh ham yuboriladi
  (`bills: []`) — aks holda server eski qiymatlarni saqlab qoladi (U5). Bir amaldagi ko'p guruh — bitta
  backend so'rov, bitta `db.batch()` (yarim saqlanish yo'q).
- **Server obyektini o'chirish (qaytarib bo'lmaydigan) — `ConfirmDialog`** (`destructive`, fokus "Bekor"da).
  Hali saqlanmagan lokal qatorni o'chirish tasdiq talab qilmaydi.
- **Destruktiv standart yo'l bo'lmaydi:** mavjud ma'lumotni almashtiradigan amal (masalan tezkor qobiq) asosiy
  tugma bo'lmaydi va tasdiq talab qiladi (U4).
- **Holat faqat rang bilan bildirilmaydi** — belgi + matn (`●` saqlanmagan, `⚠` taxmin, xato matni).
- **Har yangi forma 375 px kenglikda** gorizontal scroll'siz, inline xato matni sig'adi (`ui-guidelines.md`).
- Uz/ru/en'da regressiya holatlari: `12,5`, `12.5`, `1 234,5`, `12abc` (xato), bo'sh.
