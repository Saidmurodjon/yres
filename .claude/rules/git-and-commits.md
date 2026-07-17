# Ushbu repo'dagi git konventsiyalari

- **Har bir commit'da bitta mantiqiy tuzatish.** Bu tarix kichik, mustaqil-ravishda
  qaytarilishi mumkin bo'lgan commit'lardan iborat (`git log --oneline` changelog kabi
  o'qiladi) — masalan Tailwind `@source` tuzatishi, jadval `whitespace-nowrap` tuzatishi va
  mobil nav bar bitta ko'rib chiqish o'tishida topilgan bo'lsa ham, uchta alohida commit
  sifatida qo'shildi, chunki ular uchta mustaqil bug. Bir nechta bog'liq bo'lmagan tuzatishlarni
  qulaylik uchun bitta commit'ga birlashtirmang. Bitta commit bir nechta faylga tegishi
  mumkin, agar ular haqiqatan bitta o'zgarish bo'lsa (bir tur + uning bitta iste'molchisi +
  uning bitta testi).
- **Commit xabari matni haqiqiy ildiz sababga mos ravishda *nima uchun*ni tushuntiradi** —
  qaysi fayllar o'zgargani ro'yxati emas. Mavjud uslubga ergashing: birinchi qator — buyruq
  maylidagi qisqacha xulosa; matn foydalanuvchi ko'rgan bo'lardigan alomatni, unga sabab bo'lgan
  haqiqiy mexanizmni (kerak bo'lsa fayl/qator havolasi bilan), va tuzatish nimani boshqacha
  qilishini nomlaydi. Bu repo yozadigan registr uchun `git log --oneline`dagi istalgan commit'ga
  qarang.
- Windows checkout: `git status`/`git commit`ning
  `warning: ... LF will be replaced by CRLF ...` chiqarishi normal (Windows checkout'da
  `core.autocrlf`) va tuzatishga arzimaydi.
- Faqat so'ralganda, yoki foydalanuvchi ochiq ravishda "shularni tuzat va har birini commit
  qil" deb belgilagan topshiriqning aniq keyingi qadami bo'lganda commit qiling (bu repo
  tarixi kelib chiqqan dizayn-ko'rib-chiqish o'tishida sodir bo'lganidek). Shubha bo'lsa,
  o'zgarishni tugallang, tekshiring, va so'rang.
