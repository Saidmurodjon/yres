# T05 — O'nlik vergul: `parseLocaleNumber` + `NumberInput` (2 commit: T05a, T05b)

**Manba:** 03 §1.1 U1, §6.2, §6.4 · Jiddiylik: 🔴 Kritik (ma'lumot). Qoida: `.claude/rules/forms-and-numbers.md`.
**Chiqish mezoni (Faza 0):** `12,5` uchala tilda (uz/ru/en) to'g'ri saqlanadi; noto'g'ri qiymat hech qachon
jimgina `0`/`null`/kesilgan songa aylanmaydi.

## Muammo (kodda tasdiqlangan, `2821960`)

`type="number"` — 54 joyda, 9 faylda. uz/ru foydalanuvchi `12,5` yozadi → brauzerga qarab `""` yoki `12`.
Keyin parse:

| Fayl | Joy | Xatti-harakat |
|---|---|---|
| `components/building-detail/systems-tab.tsx` | `num()` ~231, `numOrNull()` ~236 | `parseFloat`; NaN → **jimgina 0** / null; `"12abc"` → 12 |
| `components/buildings/building-form-fields.tsx` | `parseRequiredNumber` ~108, `parseOptionalNumber` ~122 | `Number()`; tushunarsiz "raqam bo'lishi kerak" |
| `components/building-detail/consumption-tab.tsx` | ~92, ~96, ~193, ~205, ~350 | `Number()`; NaN katak **jimgina tashlanadi** |
| `components/building-detail/consumption-excel.ts` | ~106–142 | Excel katagi satr bo'lsa (`"12,5"`) → NaN |
| `components/building-detail/measures-tab.tsx` | ~132–174 | `Number(x) \|\| 20` — noto'g'ri qiymat default'ga |
| `components/building-detail/envelope-editor/state.ts` | ~221–300 (validatsiya) | `Number()` |
| `components/building-detail/envelope-editor/calculations.ts` | ~24–60 | `Number(x) \|\| 0` |
| `routes/_authenticated/buildings/$buildingId/audit.tsx` | `num` ~167, ~573 | `parseFloat(s) \|\| 0` |
| `routes/_authenticated/buildings/$buildingId/financial.tsx` | `type="number"` input(lar) | grep bilan toping |

To'liq ro'yxat uchun: `grep -rn 'type="number"' apps/web/src` va
`grep -rn "Number(\|parseFloat\|parseInt" apps/web/src | grep -v "formatNumber\|formatCurrency"`.

---

## T05a — `parseLocaleNumber` + testlar + `NumberInput` komponenti (iste'molchilarsiz)

### Joylashuv qarori
`apps/web/src/lib/number.ts` va `apps/web/src/components/number-input.tsx` — **`packages/ui` emas**:
(1) lokal `i18n.language` dan olinadi, `packages/ui` i18n'ga bog'lanmasligi kerak; (2) `frontend.md`dagi
`@source` tuzog'idan qochish. 03 §6.2 dagi "packages/ui" taklifidan ataylab chetlanish — PROGRESS.md da ayting.

### `lib/number.ts` — shartnoma
```ts
export type NumberLocale = "uz" | "ru" | "en";
export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: "empty" | "invalid" };

export function parseLocaleNumber(raw: string, locale: NumberLocale, opts?: { integer?: boolean }): ParseResult;
export function formatNumberForInput(value: number | null | undefined, locale: NumberLocale): string;
export function toNumberLocale(language: string | undefined): NumberLocale; // "ru-RU" → "ru", noma'lum → "uz"
```

### Parse algoritmi (aniq, shu tartibda)
1. `trim()`. Bo'sh → `{ ok: false, reason: "empty" }`.
2. Olib tashlash: oddiy bo'shliq, ` `, ` `, ` `, `'` (mingliklar). `−` (−) → `-`.
3. Agar `,` va `.` ikkalasi bo'lsa: **oxirgisi** o'nlik ajratgich, ikkinchisi minglik (olib tashlanadi).
4. Faqat `,` bo'lsa:
   - bir nechta `,` → minglik (`1,234,567` → `1234567`) — faqat har guruh aniq 3 raqam bo'lsa; aks holda invalid;
   - bitta `,`: `en` va undan keyin **aniq 3 raqam** (`1,234`) → minglik; boshqa barcha holatda o'nlik.
5. Faqat `.` bo'lsa:
   - bir nechta `.` → minglik (`1.234.567`), har guruh 3 raqam bo'lsa; aks holda invalid;
   - bitta `.` → o'nlik (uchala lokalda — telefon klaviaturasi ko'pincha `.` beradi).
6. O'nlik ajratgichni `.` ga almashtiring; natija **qat'iy** regex'ga mos bo'lishi shart:
   `^-?(\d+(\.\d*)?|\.\d+)$`. Mos kelmasa → invalid (`"12abc"`, `"1e3"`, `"--1"`, `"12,5,3"`).
7. `Number()`; `Number.isFinite` emas → invalid.
8. `opts.integer` va butun son emas → invalid.

Bu 03 §6.4 dagi qoidaga mos: "bitta ajratgich + aniq 3 raqam — uz/ru'da o'nlik, en'da minglik".

### `formatNumberForInput`
Tahrirlash uchun: guruhlashsiz, lokal o'nlik ajratgich bilan (`uz`/`ru`: `12,5`; `en`: `12.5`), keraksiz
nollarsiz (`12.50` → `12,5`), `null`/`undefined` → `""`. Mavjud server qiymatlarini forma holatiga
yuklashda `String(value)` o'rniga shu ishlatiladi (aks holda uz foydalanuvchi `12.5` ni ko'radi va tahrirlaganda aralashadi).

### Testlar
`apps/web` da test runner yo'q — qo'shing: `vitest` devDependency (`apps/api` bilan bir xil major versiya,
`^2.1.8`), `"test": "vitest run"` skripti (turbo `test` vazifasi uni avtomatik oladi), minimal
`vitest.config.ts` (`environment: "node"`, `include: ["src/**/*.test.ts"]`). `bun.lock` yangilanadi — commit'ga kiriting.

`src/lib/number.test.ts` — kamida shu jadval (table-driven `it.each`):

| Kirish | Lokal | Kutilgan |
|---|---|---|
| `12,5` | uz, ru, en | 12.5 |
| `12.5` | uz, ru, en | 12.5 |
| `1 234,5` / `1 234,5` | uz, ru | 1234.5 |
| `1,234.5` | en | 1234.5 |
| `1.234,5` | ru | 1234.5 |
| `1,234` | en | 1234 |
| `1,234` | uz, ru | 1.234 |
| `1.234` | uz, ru, en | 1.234 |
| `1,234,567` | en | 1234567 |
| `−29,02` | ru | −29.02 |
| `-0,5` / `,5` / `.5` | uz | −0.5 / 0.5 / 0.5 |
| `""` / `"  "` | * | empty |
| `12abc`, `1e3`, `12,5,3`, `--1`, `1,23,4`, `abc`, `Infinity` | * | invalid |
| `12,5` + `{ integer: true }` | uz | invalid |
| `2024` + `{ integer: true }` | uz | 2024 |

`formatNumberForInput`: `12.5` uz → `12,5`; en → `12.5`; `1234.5` uz → `1234,5`; `null` → `""`; `-0.5` ru → `-0,5`.

### `components/number-input.tsx`
- `@yres/ui` `Input` ustida o'ram: `type="text"`, `inputMode={integer ? "numeric" : "decimal"}`, `autoComplete="off"`,
  `enterKeyHint="next"`.
- Props: `value: string` (forma holati satr bo'lib qoladi — mavjud formalar shunday ishlaydi, migratsiya
  minimal bo'ladi), `onValueChange(raw: string)`, ixtiyoriy `integer`, `min`, `max`, `unit` (o'ng tomonda suffiks),
  `error?: string` (tashqi validatsiya xabari), qolgan `InputHTMLAttributes`.
- Lokal: `useTranslation()` → `toNumberLocale(i18n.language)`.
- `onBlur` da ichki parse: `invalid` yoki `min/max` dan tashqari bo'lsa maydon ostida inline xato
  (`aria-invalid`, `aria-describedby`), matn i18n'dan: yangi kalitlar `common.json` da
  `number.invalid` ("Raqam kiriting, masalan 12,5" — en'da "12.5"), `number.min`, `number.max`, `number.integer`.
  uz/ru/en uchala faylga; ruscha matnni loyiha egasi ko'rib chiqadi (`i18n-and-appearance.md`).
- Qiymatni o'zi o'zgartirmaydi (blur'da formatlash yo'q) — foydalanuvchi yozgani saqlanadi.
- Raqamli jadval katakchalarida `className` orqali `text-right tabular-nums` berish mumkin bo'lsin.

T05a da hech qanday mavjud forma o'zgartirilmaydi — faqat lib, test, komponent, i18n kalitlari.

---

## T05b — barcha iste'molchilarni o'tkazish

Har bir faylda:
1. `<Input type="number" ...>` → `<NumberInput ...>` (`step` atributi olib tashlanadi; butun sonli maydonlar —
   yil, qavatlar soni, `count`, `lifetimeYears`, `quantity` agar butun bo'lsa — `integer`).
2. Parse joylari → `parseLocaleNumber(raw, locale)`. **Qoida:** `invalid` natija saqlashni to'xtatadi va
   foydalanuvchiga ko'rinadigan xato beradi; hech qachon `|| 0`, `?? 0`, default'ga tushish yo'q.
   - `systems-tab.tsx`: `num()`/`numOrNull()` → natija + xato yig'ish; karta "Saqlash"da xato bo'lsa
     `setError(...)` va so'rov yuborilmaydi. Majburiy maydon bo'sh bo'lsa ham xato (hozirgi jimgina 0 o'rniga) —
     qaysi maydon majburiyligini backend zod sxemasidan (`apps/api/src/schemas/systems.ts`) aniqlang: `.nullable()`
     bo'lsa ixtiyoriy.
   - `building-form-fields.tsx`: `parseRequiredNumber`/`parseOptionalNumber` ichini `parseLocaleNumber` ga almashtiring,
     imzosi o'zgarmasin.
   - `consumption-tab.tsx`: noto'g'ri katak endi tashlanmaydi — T07 da to'liq hal qilinadi; bu commit'da
     `Number(raw)` → `parseLocaleNumber`, invalid katak saqlashni to'xtatsin va xato ko'rsatsin.
   - `consumption-excel.ts`: katak `number` bo'lsa o'zi; `string` bo'lsa `parseLocaleNumber` (fayl lokali noma'lum —
     ilova lokalini ishlating).
   - `measures-tab.tsx`: `Number(x) || 20` → bo'sh bo'lsa default (bu biznes qoidasi, saqlang), invalid bo'lsa xato.
   - `envelope-editor/state.ts` validatsiyasi va `calculations.ts` (jonli ko'rinish hisobi) — parse'ni
     `parseLocaleNumber` orqali; `calculations.ts` da invalid → `0` **faqat ko'rsatish uchun** qabul qilinadi
     (saqlanmaydi; saqlashdan oldin `state.ts` validatsiyasi to'xtatadi) — izoh bilan.
   - `audit.tsx`, `financial.tsx`: xuddi shu qoida.
3. Server qiymatini forma holatiga yuklash (`String(value)`) → `formatNumberForInput(value, locale)`.

## Qabul mezonlari (T05b)

- [ ] `grep -rn 'type="number"' apps/web/src` → 0 natija.
- [ ] `grep -rn "parseFloat\|Number(" apps/web/src` faqat ko'rsatish/format joylarida qolgan (har qolgan joy izohsiz
      tushunarli bo'lsin yoki PROGRESS.md da sanab o'ting).
- [ ] `bun run build`, `bun run --cwd apps/web test`, type-check, lint yashil.
- [ ] Preview mavjud bo'lsa: uz/ru/en'da bino formasi, tizimlar kartasi, iste'mol katakchasi — `12,5`, `12.5`,
      `1 234,5`, `12abc` (xato ko'rinadi, saqlanmaydi). Yo'q bo'lsa — shu ro'yxat loyiha egasi uchun PROGRESS.md da.
- [ ] Mobil (< 640 px) va `sm+` kenglikda inline xato matni joyidan chiqmaydi.
