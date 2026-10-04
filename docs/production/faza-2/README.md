# Faza 2 (A trek) — "Bankka tayyor yadro": ijro paketi

> **Kim uchun:** Faza 2 kodini yozadigan Claude Code sessiyasi (Sonnet).
> **Kim tayyorlagan:** loyiha boshqaruvchisi sessiyasi (Opus), 2026-10-04, repo holati `bfc9813` (F08a dan keyin).
> **Maqsad (master reja §3 Faza 2):** chiqarilgan hisobot huquqiy jihatdan himoyalangan bo'lsin — qaysi kiritma va qaysi dvigatel
> versiyasidan chiqqani isbotlanadi, har o'zgarishning muallifi ma'lum. **Nima uchun** — `00-MASTER-PLAN.md` §3–§4,
> `02-arxitektura-va-texnologiyalar.md` D-1…D-6 va ADR-004, `05-professional-hisobot.md` §5.2 (R7), `.claude/rules/data-integrity.md`.
> Fayl:qator havolalari `bfc9813` holatida — siljigan bo'lsa grep bilan toping. `audit-inputs.ts`, `audit.engine.ts`,
> `report-data.service.ts` hozir Faza 1 sessiyasi tomonidan tahrirlanmoqda — ular atrofidagi raqamlar siljishi kutiladi.

## 0. Faza 2 "A trek" nima va nima emas — o'qing

- Master reja Faza 2 ni bitta blok sifatida beradi. Bu paket faqat **A trek**: snapshot (ADR-004), `ENGINE_VERSION`, `audit_event`,
  soft-delete, `expectedRevision`. **B trek** (nazorat dvigateli A/C/S, VM 277, EE toifa, ZEB, "qabul qilingan FAIL", maydon
  meta-ma'lumoti) K5/K6/K17 qarorlari va Faza 1 yakuniga bog'liq — alohida paket bo'ladi (§6).
- **Kod bilan tekshirib topilgan, rejada yo'q yoki rejaga zid narsalar (boshqaruvchi qarorlari):**
  1. **`result_json` D1'ga sig'maydi.** 3-DMTT golden kiritmasida `JSON.stringify(computeAudit(...))` = **214 460 bayt**
     (shundan `measures` 175 568), `inputs` = 40 875 bayt (2026-10-04 o'lchov). D1 bayonoti ≤ 100 KB (`database.md`) →
     02 D-1 dagi `inputs_json`/`result_json` **ustunlari o'rniga** JSON'lar R2'da (o'zgarmas kalit), D1'da faqat kalit + SHA-256.
  2. **Byudjet:** "oldin" qobiq `PUT` hozir aniq **40/40** (`schemas/envelope.ts:100-112`). Har mutatsiyaga `audit_event` qo'shish
     +1 bayonot. Shuning uchun A02 `findAccessibleBuilding` ni bitta so'rovga keltiradi (−1), `expectedRevision` esa **alohida
     bayonot qo'shmaydi** — u `audit_event` qatorining o'zida tekshiriladi (A02 §revision mexanizmi).
  3. **Soft-delete faqat `building` uchun.** Bola jadvallar "qatorlarni almashtirish" (`delete + insert`) andozasida — ularni
     `deleted_at` ga o'tkazish butun API'ni qayta yozish degani. Bola qatorlar tarixi `audit_event` + snapshot bilan saqlanadi.
     `data-integrity.md` dagi "biznes jadvallari qattiq o'chirilmaydi" bandi A12 da shunga moslab yoziladi.
  4. **`building.userId` `onDelete: cascade` (02 D-4) o'zgartirilmaydi:** kodda foydalanuvchini o'chirish yo'li yo'q
     (`grep "delete(user)"` — bo'sh), FK'ni o'zgartirish esa ~20 bola jadvali bor `building` ni qayta yaratish — Faza 4 (tashkilot).
  5. **Snapshot ↔ `report_issue` (05 §5.2):** ikki hujjat bir narsaning ikki modelini beradi. Faza 2 da ADR-004 `audit_snapshot` +
     har til uchun bitta o'zgarmas PDF quriladi; versiya raqami (1.0/1.1), `withdrawn`, DOCX — Faza 5 (K26).

## 1. Sessiya boshida (har safar, context siqilgandan keyin ham)

1. `CLAUDE.md` → `.claude/rules/` (ayniqsa `data-integrity.md`, `database.md`, `security.md`, `hisobot.md`,
   `forms-and-numbers.md`, `testing-and-verification.md`, `git-and-commits.md`, `future-platform.md`).
2. Shu `README.md`. 3. `PROGRESS.md` oxirgi bo'limi va §4 jadval. 4. Faqat navbatdagi bitta `A*.md` faylini o'qing.

## 2. Har topshiriq sikli

Faza 0 README §2 bilan bir xil: spec → kod → qabul mezonlari → tekshiruvlar → PROGRESS.md + §4 jadvalda ✅ → **bitta commit**
(`git-and-commits.md` uslubi, attribution qatorlari) → push joriy branch'ga. Deploy yo'q, production D1/R2 ga tegilmaydi.
Faza 1 sessiyasi parallel ishlayotgan bo'lsa: commit'dan oldin `git pull --rebase`, faqat o'z fayllaringizni `git add` qiling.

## 3. Tekshiruvlar

| Tegilgan joy | Buyruq / talab |
|---|---|
| Har doim | `bun run type-check` · `bunx biome lint <fayllar>` |
| `apps/api` | `bun run --cwd apps/api test` to'liq yashil (integratsiya — lokal Miniflare D1/R2) |
| `apps/web`, `packages/ui` | `bun run build`; UI — Preview MCP + mock API yoki PROGRESS.md da "brauzerda tekshirilmadi" + qo'lda ro'yxat |
| `packages/db` sxemasi | `db:generate` → SQL'ni ko'zdan kechirish (faqat qo'shuvchi, `PRAGMA foreign_keys=OFF` yo'q) → `db:migrate:local` |
| Trigger / qisman indeks | `--custom` migratsiya; testda **buzish urinishi** (UPDATE → xato) bilan isbotlanadi |
| Yangi/o'zgargan mutatsiya route'i | Route izohida D1 byudjeti formula bilan (≤ 40); `audit_event` qatori **o'sha** `db.batch()` da |
| Yangi zod sxema | `.max()`/`.uuid()`/`.finite()` chegaralari (`security.md`) |

## 4. Holat jadvali

"Qachon": **hozir** — Faza 1 bilan parallel boshlash mumkin (`audit.engine.ts` va golden fixture'larga tegmaydi);
**F10 dan keyin** — golden infratuzilmasiga tegadi, Faza 1 yakunlanmaguncha boshlanmaydi.

| # | Topshiriq | Fayl | Commit | Qachon | Holat |
|---|---|---|---|---|---|
| A01 | `ENGINE_VERSION` konstantasi, `METHODOLOGY_VERSION`, oshirish qoidasi | `A01-engine-version.md` | 1 | hozir | ✅ |
| A02 | `audit_event` jadvali + yordamchi + revision mexanizmi; `findAccessibleBuilding` bitta so'rov; `buildings` route'lari | `A02-audit-event.md` | 1 | hozir | ✅ |
| A03 | Bino soft-delete (`deleted_at`), tiklash endpoint'i | `A03-soft-delete.md` | 1 | hozir | ✅ |
| A04 | `audit_snapshot` + `audit_snapshot_report` sxemasi, o'zgarmaslik triggerlari, ADR-004 fayli | `A04-snapshot-sxema.md` | 1 | hozir | ✅ |
| A05 | Snapshot API: yaratish/ro'yxat/o'qish (a); holat o'tishlari (b) | `A05-snapshot-api.md` | 2 (a, b) | hozir | ⬜ |
| A06 | Hisobot snapshot'dan: o'zgarmas PDF + SHA-256; jonli PDF = QORALAMA | `A06-hisobot-snapshotdan.md` | 1 | hozir | ⬜ |
| A07 | Verify: snapshot holati, versiya, hash; brauzerda fayl tekshiruvi | `A07-verify.md` | 1 | hozir | ⬜ |
| A08 | UI: natijalar sahifasida "Rasmiy versiyalar" paneli | `A08-snapshot-ui.md` | 1 | hozir | ⬜ |
| A09 | `audit_event` barcha bino mutatsiyalariga (a: qobiq/tizimlar/iste'mol; b: qolganlari) | `A09-audit-event-yoyish.md` | 2 (a, b) | hozir | ⬜ |
| A10 | `expectedRevision` → 409: API (a), web (b) | `A10-expected-revision.md` | 2 (a, b) | hozir | ⬜ |
| A11 | `ENGINE_VERSION` qulfi: golden natija o'zgarsa versiya oshirilishi shart | `A11-engine-version-qulf.md` | 1 | **F10 dan keyin** | ⬜ |
| A12 | Yakun: qoidalar, hisobot.md, master reja, PROGRESS | `A12-yakun.md` | 1 | oxirida (F10 dan keyin) | ⬜ |

**Tartib:** A01 → A02 → A03 → A04 → A05a → A05b → A06 → A07 → A08 → A09a → A09b → A10a → A10b → (F10) → A11 → A12.
A03 A04 dan oldin majburiy: snapshot FK'si binoni qattiq o'chirishni to'sadi (ataylab), shuning uchun `DELETE /buildings/:id`
avval soft-delete bo'lishi kerak. A02 hamma narsadan oldin: keyingi har mutatsiya `audit_event` ni o'sha batch'ga qo'shadi.

## 5. Qachon TO'XTASH va so'rash kerak

Faza 0 README §5 dagi barcha holatlar, qo'shimcha:
- D1/Miniflare trigger'ni (`CREATE TRIGGER … RAISE(ABORT, …)`) yoki qisman unique indeksni qabul qilmasa (lokal yoki
  `wrangler d1 migrations apply` da) — o'zgarmaslikni "faqat kod bilan" ta'minlashga o'tmang, so'rang.
- Byudjet hisobi biror endpoint'da 40 dan oshsa va uni faqat zod chegarasini real ma'lumotdan (3-DMTT: 19 element, 31 ochiq joy,
  72 hisob-faktura) torroq qilish bilan tushirish mumkin bo'lsa.
- R2 lokal (Miniflare `getPlatformProxy`) testlarda ishlamasa va Map-asosidagi soxta bucket ham `get/put/head` ni bera olmasa.
- K24 (kim tasdiqlaydi) javobsiz qolsa — A05b tavsiya etilgan variant bilan quriladi (yagona `canApprove()` funksiyasi),
  PROGRESS.md da **"K24 tasdiqlanmagan"** deb yoziladi; loyiha egasi boshqacha javob bersa — faqat shu funksiya o'zgaradi.
- Snapshot uchun dvigatelga (`audit.engine.ts`) yoki `AuditResult` shakliga o'zgarish kerakdek tuyulsa — bu A trek emas, so'rang.

## 6. Faza 2 A trekda QILINMAYDIGAN narsalar

- **B trek:** `Checks` dvigateli (A1–A13, VM 277 C1–C20, S1–S9), EE toifa (K5), ZEB, "qabul qilingan FAIL" asos matni (K6),
  sanity oraliqlari (K17), maydon meta-ma'lumoti (bo'sh/standart/⚠ taxmin/manbali/dala/tasdiqlangan + manba havolasi).
- **Qaror jurnali (X-log, 01 §4.2)** — master reja uni Faza 2 ro'yxatiga qo'ygan, lekin u metodik qarorlar (auditor/maydon
  darajasi) obyekti va B trekdagi "qabul qilingan FAIL"/maydon meta bilan bir modelda quriladi → B trekka. A trekning `audit_event` i
  *kim nimani o'zgartirdi* ni beradi, *nega* (metodik asos) ni emas.
- Bola jadvallarda soft-delete; `building.userId` kaskadini o'zgartirish (Faza 4); `audit_run` "stale running" TTL (D-5).
- `report_issue` versiya raqamlash (1.0/1.1), `withdrawn`, DOCX/XLSX, ReportDocument AST, QC paneli, imzo/E-IMZO — Faza 5 (R7 ning
  qolgani, R10, R12). Hisobotni Queue/Workflow'ga ko'chirish (ADR-005, P-1) — Faza 5.
- `org_id`, `buildingScope` middleware, `can()` policy (Faza 4) — `audit_event` da `org_id` ustuni **ochilmaydi** (Faza 4 expand).
- Admin route'lari (`admin-users.ts` rol/holat) uchun `audit_event` — Faza 4 kuzatuv bilan; R2 Object Lock/lifecycle (K25).
- `packages/db/data-migrations/` papkasi (data-integrity.md Faza 2 bandi) — ma'lumotnoma hozir versiyalangan SQL migratsiya bilan
  (`database.md`); ehtiyoj tug'ilganda alohida.

## 7. Yangi K-savollar (master reja §5 ga A12 da qo'shiladi)

| ID | Savol | Tavsiya | Bloklaydi |
|---|---|---|---|
| K24 | Snapshot'ni kim `approved` qiladi? O'zi yuborganini o'zi tasdiqlay oladimi? | Bino egasi (`owner`); o'zini tasdiqlash ruxsat, lekin `audit_event` da qayd etiladi; "to'rt ko'z" (QC-M7) — Faza 5 | A05b (yumshoq) |
| K25 | Rasmiy snapshot/PDF'lar qancha saqlanadi (WB: ≥ 5–10 y)? R2 Object Lock yoqiladimi? | `snapshots/` va `reports/*/*/` prefikslariga lifecycle qoidasi **qo'yilmaydi** (cheksiz); Object Lock — Faza 4 | — (A12 da qayd) |
| K26 | Bank ko'radigan hisobot identifikatori: snapshot id + til (Faza 2) yetarlimi yoki `YRES-2026-0003 v1.0` raqamlash kerakmi? | Faza 2: snapshot id; raqamlash va `withdrawn` — Faza 5 (05 §5.2) snapshot ustiga | Faza 5 |

## 8. Chiqish mezoni (master reja: "bir snapshot'dan olingan PDF bir yildan keyin ham baytma-bayt bir xil; har o'zgarishning muallifi ma'lum")

- Integratsiya testi: snapshot → PDF chiqarish → bino kiritmalari, global tarif va iqlim jadvali o'zgartiriladi → snapshot natijasi va
  PDF baytlari (SHA-256) o'zgarmaydi; ikki yuklab olish bir xil bayt.
- Snapshot va PDF qatorlarining muzlatilgan ustunlarini UPDATE qilish DB darajasida rad etiladi; `approved` → `draft` o'tishi rad etiladi.
- Har bino mutatsiya route'i uchun test matritsasi: muvaffaqiyatli so'rov → `audit_event` (actor, entity, action, vaqt); batch yiqilsa
  → `audit_event` ham yo'q. Eskirgan `expectedRevision` → 409, ma'lumot o'zgarmaydi; web 409 da tahrirlarni yo'qotmaydi.
- O'chirilgan bino ro'yxatda/route'larda 404, lekin uning snapshot verify sahifasi ishlaydi.
- PROGRESS.md da yakun; `00-MASTER-PLAN.md` §3 Faza 2 ga "A trek ✅ (sana)".

## 9. Sonnet sessiyasi uchun tayyor prompt

```
docs/production/faza-2/README.md ni o'qing va unga qat'iy amal qiling. PROGRESS.md va README §4
jadvaliga qarab navbatdagi bajarilmagan topshiriqni aniqlang ("F10 dan keyin" belgilanganlarni Faza 1
yakunlanmaguncha olmang), faqat o'shani bajaring: spec → kod → qabul mezonlari → tekshiruvlar →
PROGRESS.md → bitta commit → push. Spec bilan kod mos kelmasa yoki README §5 holati yuz bersa — to'xtang va so'rang.
```
