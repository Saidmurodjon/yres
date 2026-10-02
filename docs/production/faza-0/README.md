# Faza 0 — "Qon to'xtatish": ijro paketi

> **Kim uchun:** Faza 0 kodini yozadigan Claude Code sessiyasi (Sonnet modeli).
> **Kim tayyorlagan:** loyiha boshqaruvchisi sessiyasi (Opus), 2026-10-02, repo holati `2821960`.
> Bu papka — **qanday qurish** bo'yicha yagona manba. **Nima uchun** degan savolga
> `00-MASTER-PLAN.md` §3 Faza 0 va 02/03/06 hujjatlari javob beradi. Har topshiriq fayli
> kodga qarshi tekshirilgan (fayl:qator havolalari `2821960` holatiga tegishli — siljigan bo'lsa,
> grep bilan qayta toping, mazmuni o'zgarmagan bo'lishi kerak).

## 1. Sessiya boshida (har safar, context siqilgandan keyin ham)

1. `CLAUDE.md` → `.claude/rules/` dagi **barcha** fayllar (ayniqsa `security.md`, `forms-and-numbers.md`,
   `frontend.md`, `database.md`, `testing-and-verification.md`, `git-and-commits.md`).
2. Shu `README.md`.
3. `PROGRESS.md` ning oxirgi bo'limi — qaysi topshiriq tugaganini **shu fayldan** bilasiz, xotiradan emas.
   Pastdagi §4 holat jadvali ham yangilab boriladi.
4. Faqat navbatdagi bitta topshiriq faylini (`T0N-*.md`) o'qing va bajaring.

Bog'liqliklar o'rnatilmagan bo'lsa: repo ildizida `bun install --frozen-lockfile`.

## 2. Har topshiriq sikli (buzilmaydi)

```
o'qish → kodni topish (spec'dagi fayl:qator) → amalga oshirish → spec'dagi "Qabul mezonlari"
→ tekshiruvlar (§3) → PROGRESS.md yozuvi + §4 jadvalda ✅ → bitta commit → git push
```

- **Bitta topshiriq (yoki spec'da alohida belgilangan kichik band, masalan T04a) = bitta commit.**
  Commit xabari `git-and-commits.md` uslubida: birinchi qator buyruq maylida, matnda *alomat →
  mexanizm → tuzatish*. Oxirida system-reminder'dagi attribution qatorlari.
- Push: joriy branch `claude/yres-platform-development-svx6nn` ga (`main` yo'q — branch strategiyasi
  hali hal qilinmagan, yangi branch ochmang).
- **Deploy qilmang.** Production deploy faqat loyiha egasi buyrug'i bilan (`deployment.md`).
- **Production bazaga ulanmang**, `DATABASE_URL` so'ramang — Faza 0 da bunga ehtiyoj yo'q.

## 3. Tekshiruvlar (har commit oldidan)

| Tegilgan joy | Buyruq |
|---|---|
| Har doim | `bun run type-check` (ildizdan) · `bunx biome lint <tegilgan fayllar>` |
| `apps/web` yoki `packages/ui` | `bun run build` (haqiqiy Vite build) |
| `apps/api` | `bun run --cwd apps/api test` — servis unit testlari yashil bo'lishi shart; integratsiya testlari lokal Postgres yo'qligi sababli `ECONNREFUSED` bilan yiqiladi, bu **kutilgan** (`testing-and-verification.md`) |
| `apps/web/src/lib` (T05 dan keyin) | `bun run --cwd apps/web test` |
| UI o'zgarishi | Imkon bo'lsa Preview MCP + mock API (`testing-and-verification.md`). Vosita yo'q bo'lsa — PROGRESS.md da **"brauzerda tekshirilmadi"** deb ochiq yozing va loyiha egasi uchun qo'lda tekshirish ro'yxatini qoldiring |

Integratsiya testi yozilgan bo'lsa (CI'da Postgres bilan ishlaydi), lokal yiqilishini "o'tdi" deb
da'vo qilmang — "yozildi, CI'da tasdiqlanadi" deb yozing.

## 4. Holat jadvali

| # | Topshiriq | Fayl | Commit(lar) | Holat |
|---|---|---|---|---|
| T01 | CI: barcha migratsiyalar, `ON_ERROR_STOP`, branch trigger, `test-db.ts` himoyasi, artefaktlar | `T01-ci-migratsiyalar.md` | 1 | ⬜ |
| T02 | S-1 akkauntni oldindan egallash — yo'l (b) | `T02-s1-akkaunt-egallash.md` | 1 | ⬜ |
| T03 | V-1 chat biriktirmalari XSS | `T03-v1-chat-xss.md` | 1 | ⬜ |
| T04 | Xavfsizlik gigiyenasi: S-4, A-2, V-3, V-5, V-2 | `T04-xavfsizlik-gigiyenasi.md` | 5 (a–e) | ⬜ |
| T05 | `parseLocaleNumber` + `NumberInput` + barcha raqam maydonlari | `T05-number-input.md` | 2 (a, b) | ⬜ |
| T06 | Dirty-himoya, chiqishda blocker, o'chirishga tasdiq | `T06-dirty-himoya.md` | 3 (a–c) | ⬜ |
| T07 | Iste'mol: bo'sh tashuvchini o'chirish + ko'p yilni atomik saqlash | `T07-istemol-saqlash.md` | 2 (a, b) | ⬜ |
| T08 | "Auditni ishga tushirish" mavjud qobiqni almashtirmasin | `T08-audit-tugmasi.md` | 1 | ⬜ |
| T09 | `xlsx@0.18.5` zaifligi | `T09-xlsx.md` | 1 | ⬜ |
| T10 | Backup/PITR runbook + ADR-011/ADR-015 (faqat hujjat) va loyiha egasi ro'yxati | `T10-ops-hujjatlar.md` | 1 | ⬜ |

Tartib — yuqoridan pastga. T05 → T06 → T07 → T08 ketma-ketligi majburiy (keyingilari `NumberInput` va
`ConfirmDialog`ga tayanadi). T09/T10 istalgan paytda, lekin T01 dan keyin.

## 5. Qachon TO'XTASH va loyiha egasidan so'rash kerak

- Spec'dagi kod tavsifi haqiqiy kodga mos kelmasa (funksiya yo'q, boshqacha ishlaydi) — taxmin qilib
  "moslashtirmang"; PROGRESS.md ga farqni yozing va so'rang.
- Topshiriq spec'da yozilmagan sxema o'zgarishini (yangi jadval/ustun) talab qilsa.
- Better Auth yoki boshqa kutubxona xatti-harakati spec'dagidan farq qilsa (versiya `bun.lock` da).
- Biror tekshiruv 2 urinishdan keyin ham yiqilsa va sabab topshiriq doirasidan tashqarida bo'lsa.
- Spec "loyiha egasi" deb belgilagan har qanday amal (deploy, sir o'rnatish, Neon/Cloudflare reja).

## 6. Faza 0 da QILINMAYDIGAN narsalar (ko'lamdan tashqari)

Bular rejada bor, lekin keyingi fazalarda — hozir boshlamang, "yo'l-yo'lakay" ham qilmang:
dvigatel formulalari (X33 va h.k. — Faza 1, golden test bilan); `audit_snapshot`, `audit_event`,
soft-delete (Faza 2); `buildingScope` middleware va tashkilot modeli (Faza 4); avtosaqlash,
bosqichli ish maydoni, `FieldMeta` (Faza 3); hisobotni POST'ga ajratish (Faza 2/5); staging va
`deploy.yml` (Faza 4); rate-limit binding'larini ajratish (S-3); username default'ini o'zgartirish (A-4).

## 7. Chiqish mezoni (master reja)

CI 3/3 yashil (to'liq sxema bilan) · `12,5` uchala tilda to'g'ri saqlanadi · tiklash mashqi
bajarilgan (T10 — loyiha egasi). Faza tugagach PROGRESS.md ga yakuniy xulosa va
`00-MASTER-PLAN.md` §3 Faza 0 sarlavhasiga "✅ bajarildi (sana)" belgisi.

## 8. Sonnet sessiyasi uchun tayyor prompt

```
docs/production/faza-0/README.md ni o'qing va unga qat'iy amal qiling. PROGRESS.md va README §4
jadvaliga qarab navbatdagi bajarilmagan topshiriqni aniqlang, faqat o'shani bajaring:
spec → kod → qabul mezonlari → tekshiruvlar → PROGRESS.md → bitta commit → push.
Keyin keyingisiga o'ting. Spec bilan kod mos kelmasa yoki README §5 holati yuz bersa — to'xtang va so'rang.
```
