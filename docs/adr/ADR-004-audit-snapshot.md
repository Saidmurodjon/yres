# ADR-004 — Rasmiy audit natijasining o'zgarmas yozuvi (`audit_snapshot`)

- **Holat:** ✅ Qabul qilindi (loyiha egasi, master reja Faza 2) · 2026-10-04
- **Ijro:** `docs/production/faza-2/A04-snapshot-sxema.md` (A trek)

## Kontekst

`runFullAudit()` har chaqiruvda saqlangan kirishlardan natijani qayta hisoblaydi (`audit_run` faqat hayot
siklni, status/vaqt/hisobot havolasini saqlaydi — `calculation-engine.md`). Bu qoralama ko'rinish uchun
to'g'ri: kirishlar tahrirlansa, natija ham o'zgarishi kerak. Lekin bankka yuboriladigan rasmiy hisobot uchun
teskarisi kerak — bir yil o'tib ham xuddi shu baytlar, xuddi shu raqamlar qaytarilishi, va qaysi dvigatel
versiyasi/qaysi kirishlar bilan hisoblangani isbotlanishi shart (master reja Faza 2 maqsadi; 05 §5.2 R7).

## Variantlar

| Variant | Afzallik | Kamchilik |
|---|---|---|
| (a) Hech narsa saqlamay, PDF generatsiya vaqtini audit_run'ga yozish | Ish yo'q | Kirishlar keyin o'zgarsa, eski PDF'ni qayta hosil qilib bo'lmaydi — "isbot" yo'q |
| **(b) `audit_snapshot` + `audit_snapshot_report`: inputs/result/context JSON'ni muzlatib, DB trigger bilan o'zgarmas qilish** | Haqiqiy isbot: snapshot + undan chiqarilgan PDF boshqa hech narsaga (jonli kirishlarga) bog'liq emas | Yangi jadval, yangi R2 prefiks, saqlash hajmi o'sadi (cheklanmagan — K25) |
| (c) `audit_run`ga `result_json`/`inputs_json` ustunlari qo'shish (02 D-1 dagi dastlabki reja) | Yangi jadval kerak emas | O'lcham D1 bayonot chegarasidan katta (pastga qarang) — fizik jihatdan ishlamaydi |

## Qaror

**(b).** Ikki jadval:

- **`audit_snapshot`** — bitta muzlatilgan audit natijasi: `buildingId`, `status`
  (`draft→submitted→approved→superseded`), `engineVersion`/`methodologyVersion`, R2 kalit + SHA-256 uchlik
  (`inputs`/`result`/`context`), kichik `summary` (`AuditSummary`, ro'yxat uchun R2'siz), muallif/vaqt
  ustunlari (`createdBy`, `submittedBy`/`At`, `approvedBy`/`At`, `supersededAt`/`supersededById`).
- **`audit_snapshot_report`** — snapshot × til bo'yicha bitta chiqarilgan PDF: `r2Key`, `sha256`,
  `sizeBytes`, muallif/vaqt. Bir snapshot uchun bir tilda faqat bitta qator (`uniqueIndex(snapshotId, lang)`).

**O'lcham sababi (README §0.1):** 3-DMTT golden kiritmasida `JSON.stringify(computeAudit(...))` ≈ 214 KB
(`measures` qismi ≈ 176 KB), `inputs` ≈ 41 KB — D1 bayonoti ≤ 100 KB (`database.md`) ga sig'maydi. Gzip bilan
siqishga urinish shunchaki chegarani kechiktiradi (auditlar vaqt o'tishi bilan kattalashadi), shuning uchun
`REPORTS_BUCKET`da yangi prefiks: `snapshots/{buildingId}/{snapshotId}/{inputs|result|context}.json`,
`reports/{buildingId}/{snapshotId}/{lang}.pdf`. Yangi bucket ochilmaydi — mavjud `REPORTS_BUCKET` yetarli.

**O'zgarmaslik DB darajasida, kod intizomiga tayanmaydi:**

- `audit_snapshot_frozen` — har qanday "muzlatilgan" ustunni (`buildingId`...`createdAt`, holat/approval
  ustunlaridan tashqari hammasi) `UPDATE` qilishni rad etadi.
- `audit_snapshot_status_flow` — faqat to'rt o'tishga ruxsat beradi: draft→submitted, draft→superseded,
  submitted→approved, submitted→superseded, approved→superseded. Boshqa har qanday status o'zgarishi
  (jumladan orqaga, `approved→draft`) rad etiladi. Bu A05b'dagi parallel tasdiqlash yarishini ham yopadi —
  ikkinchi "approve" yozuvi `OLD.status`ni kutilganidek topa olmaydi.
- `audit_snapshot_report_frozen` — har qanday `UPDATE`ni rad etadi (qator faqat insert qilinadi).
- Qisman unique indeks `(buildingId) WHERE status = 'approved'` — bitta binoda bir vaqtda faqat bitta
  "amaldagi rasmiy" snapshot bo'lishini D1 darajasida ta'minlaydi.
- DELETE trigger yo'q: o'chirish yo'li kodda yo'q, va `buildingId`/`snapshotId` FK'lari `onDelete`siz
  (restrict) — ota qator (bino yoki snapshot) o'chirilsa, FK xatosi bilan to'xtaydi.

## Oqibatlar

**Soddalashadi:** bank/regulyator uchun "bu natija qachon, qaysi dvigatel bilan, qaysi kirishlar bilan
chiqarilgan" savoliga DB darajasida isbotlangan javob bor; PDF qayta generatsiyasi (A06) snapshot'dagi
muzlatilgan `result`dan, jonli `audit.engine.ts` chaqirig'isiz ishlaydi.

**Yangi cheklovlar:**
- Snapshot yaratish endi ikki bosqich: R2'ga uch fayl yozish, keyin D1 qatori — ikkisi orasida qisqa vaqt
  oynasi bor (A05a qaror qiladi: R2 yozilib D1 yozuvi muvaffaqiyatsiz bo'lsa, R2'dagi obyekt "egasiz" qoladi —
  bu qabul qilingan xato holati, chunki R2 obyekt o'zi hech narsani buzmaydi, faqat ishlatilmay qoladi).
- `building.userId`ni o'chirish yo'li hali yo'q (K-savollar), lekin endi `audit_snapshot` orqali ham bino
  o'chirilishi yanada qattiqroq to'silgan — kaskad o'chirish qarori (Faza 4) snapshot'larni alohida hisobga
  olishi kerak bo'ladi.
- K24 (kim `approved` qiladi), K25 (saqlash muddati/Object Lock), K26 (bank ko'radigan hisobot raqami) —
  README §7, A05b/A12 da hal qilinadi.

**Bekor bo'ladi:** 02 D-1 dagi "`inputs_json`/`result_json` `audit_run`ga ustun sifatida" dastlabki reja —
D1 bayonot chegarasi buni fizik jihatdan imkonsiz qiladi, o'rniga ushbu ADR.
