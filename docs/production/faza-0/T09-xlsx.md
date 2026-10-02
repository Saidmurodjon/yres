# T09 — `xlsx@0.18.5` zaifligini yopish

**Manba:** 02 §2.3 V-4 · Jiddiylik: 🟡 O'rta (foydalanuvchi yuklagan faylni parse qiladi). **Commit:** bitta.
**Fayllar:** `apps/web/package.json`, `bun.lock`, kerak bo'lsa `components/building-detail/consumption-excel.ts`.

## Holat (kodda tasdiqlangan)

- `apps/web/package.json`: `"xlsx": "^0.18.5"` — npm'dagi oxirgi SheetJS versiyasi; SheetJS npm'ga yangilanish
  chiqarmay qo'ygan. Ma'lum zaifliklar: CVE-2023-30533 (prototype pollution, 0.19.3 da tuzatilgan),
  CVE-2024-22363 (ReDoS, 0.20.2 da tuzatilgan).
- Yagona iste'molchi: `consumption-excel.ts` — dinamik `await import("xlsx")` (~71, ~152), API'dan faqat
  `XLSX.read`, `XLSX.utils.*`, `XLSX.write` ishlatiladi.

## Bajarish

1. SheetJS rasmiy CDN tarball'iga o'ting (API bir xil, kod o'zgarishi kutilmaydi):
   `bun remove xlsx --cwd apps/web` va `bun add https://cdn.sheetjs.com/xlsx-<VERSION>/xlsx-<VERSION>.tgz --cwd apps/web`.
   `<VERSION>` — https://cdn.sheetjs.com/ dagi eng so'nggi barqaror versiya (kamida **0.20.3**); WebFetch bilan
   tekshiring, taxmin qilmang. `package.json` dagi yozuv tarball URL bo'lib qolishi kerak (semver diapazon emas).
2. `bun install --frozen-lockfile` keyin toza o'tishini tekshiring (CI shunday ishlaydi); `bun.lock` ni commit qiling.
3. `bun run build` — TypeScript turlari tarball ichida keladi; xato bo'lsa `consumption-excel.ts` dagi importni moslang.
4. Funksional tekshiruv: eksport → hosil bo'lgan fayl → qayta import (aylanma) — `consumption-excel.ts` dagi
   shablon/eksport funksiyasidan foydalaning. Preview bo'lmasa — PROGRESS.md da loyiha egasi uchun: "Excel shablonini
   yuklab oling, 2 yil to'ldiring, import qiling — qiymatlar to'g'ri tushadi".
5. Ixtiyoriy (tavsiya, lekin shu commit'da emas): parse'ni Web Worker'ga ko'chirish — 02 V-4; PROGRESS.md da "ochiq".

## Qabul mezonlari

- [ ] `grep '"xlsx"' apps/web/package.json` → `cdn.sheetjs.com` URL, versiya ≥ 0.20.3.
- [ ] `bun install --frozen-lockfile`, `bun run build`, lint yashil.

## Qilmang

- `exceljs` ga o'tmang (katta bundle, boshqa API — asossiz ko'lam).
