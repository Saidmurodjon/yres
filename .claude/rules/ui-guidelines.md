# Platforma UI qoidalari

To'liq qoidalar `docs/ui-guidelines.md`da (dizayn tamoyillari, responsive
breakpoint jadvali, state boshqaruvi chegarasi, unumdorlik qoidalari) — shu
yerda takrorlanmaydi. Eng muhim, unutilsa qimmatga tushadigan ikkita jihat:

- **Zustand faqat sof-mijoz, bazaga yozilmaydigan holat uchun** (WebSocket
  ulanish holati, yozayotganlik xaritasi). Bazadan kelgan har qanday narsa
  (xabarlar, bildirishnomalar) TanStack Query keshida qoladi — WebSocket
  push kelganda `queryClient.setQueryData`/`invalidateQueries` chaqiring,
  Zustand'ga nusxalamang. Ikkalasida saqlash ularni sinxrondan chiqaradi.
- **Yangi maxsus breakpoint yoki uchinchi (planshet-maxsus) navbar rejimi
  qo'shmang** — mavjud ikki-rejimli tuzilma (`sm`dan past: icon-only mobil
  header; `sm`+: to'liq sidebar, `.claude/rules/frontend.md`) planshetni
  ham qamrab oladi. Yangi sahifani `sm+`da (planshet kengligida) ham,
  faqat `lg+`da emas, tekshiring.

To'liq kontekst uchun `docs/ui-guidelines.md`ni o'qing.
