# F10 — Faza 1 yakuni: qoidalar, tafovutlar ro'yxati, loyiha egasi qarorlari

**Commit:** bitta (faqat hujjat + `divergences.json` holatlari). **Bog'liqlik:** F01–F09.

## Bajarish

1. **`golden:report`** ni ishga tushiring; har ochiq `divergences.json` yozuvi uchun: hozirgi farq (raqam), sababi (kitob katagi),
   qaysi fazada yopiladi. `unexplained` qolmasligi kerak — qolsa, README §5.
2. **`.claude/rules/calculation-engine.md`**: X33, X38/X86, X93/X95, X88, X75/X83 bandlarini "yopildi (F0N)" ga; yangi qoidalar —
   bazaviy η va D71 (F06), tashuvchi qismlari (F06), moliyaviy parametrlar manbasi (F05), golden tartibi (F03: dvigatel o'zgarishi =
   golden + `divergences.json` diff). "standardized vs actual" bandini tashuvchi qismlari bilan qayta yozing.
3. **`.claude/rules/hisobot.md`**: F04–F09 da qo'shilgan `AuditResult` maydonlari jadvalda (holat ❌/⚠ — hisobot Faza 5 da).
4. **`docs/data-dictionary.md`** boshiga: "v5 bo'yicha; v7.20 farqlari — `01-audit-metodologiya.md` va `faza-1/`" (to'liq qayta yozish emas).
5. **`00-MASTER-PLAN.md`**: §5 qarorlar jadvaliga K21–K23 (pastda) qatorlari (agar boshqaruvchi hali qo'shmagan bo'lsa), Faza 1 sarlavhasiga
   holat; 06 §2.4 dagi eskirgan raqamlarni (`D39` 706 124,26, `N39` −382 339,98) tuzating.
6. **PROGRESS.md**: Faza 1 yakuniy xulosa — yopilgan X-raqamlar, ochiq tafovutlar jadvali, loyiha egasi uchun ro'yxat.

## Loyiha egasi uchun qarorlar (PROGRESS.md ga ko'chiring)

| ID | Savol | Tavsiya |
|---|---|---|
| **K21** | v7.20 diskontlangan qoplanish formulasi (`Financial indicators!D19`, massiv) 1 yilga ortiq beradi (№15: 5,18 o'rniga 4,18) | Dvigatel to'g'ri qoladi; v7.21 da Excel tuzatiladi; golden'da `accepted` |
| **K22** | `Losses env.`: grunt bilan tutashgan elementlar (Socle 1, Socle 2, F1) faqat ish soatlari bilan, devor/tom/F3 — ikkala davr; noish davri Δt manfiy bo'lsa ham qo'shiladi (`K44` = −397 kWh) | Metodik asosni auditor tasdiqlasin; dvigatel tasdiqlangan qoidaga keltiriladi (Faza 2 boshida) |
| **K23** | `divergences.json` dagi P1 tafovutlar (D5 infiltratsiya ulushi, D6 oylik SCOP, D8 BEMS, D11 soyalash/sovutish, D14 nasoslar atributsiyasi) — Faza 1 chiqishini to'smaydimi | Ha, to'smaydi; har biri `accepted` + keyingi faza havolasi |

## Qabul mezonlari

- [ ] `bun run test` yashil, golden ichida; `divergences.json` da `unexplained` yo'q.
- [ ] README §7 chiqish mezonidagi beshta jami raqam tolerans ichida **yoki** ularni buzayotgan tafovutlar K23 ro'yxatida aniq ko'rsatilgan.
- [ ] Faqat hujjat/JSON o'zgargan — lint (markdown emas, JSON) yashil.
