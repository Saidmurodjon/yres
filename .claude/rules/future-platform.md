# Kelajak platforma qoidalari (tenancy, kuzatuv, asinxron ishlar, AI)

> **HOZIR AMAL QILMAYDI.** Bu qoidalar `docs/production/02-arxitektura-va-texnologiyalar.md` §5.3–5.6 dan
> olingan va tegishli faza boshlanganda alohida `.claude/rules/<nom>.md` fayliga ko'chiriladi. Ular bu yerda
> faqat bitta maqsadda: hozirgi kod kelajakdagi yo'nalishga **zid** qilib yozilmasin. Infratuzilmani oldindan qurmang.

## Multi-tenancy — Faza 4 (ADR-001/002) → `tenancy.md`
- Biznes so'rovlari `scopedDb(c)` orqali (`org_id` avtomatik). Ruxsat faqat `policy.ts` dagi `can(actor, action, resource)`.
- Global `user.role` faqat platforma boshqaruvi; biznes huquqlari — `org_membership.role` + `project_grant`.
- Bank/regulyator faqat `approved` snapshot'larni ko'radi.
- Yangi jadval: `org_id` (yoki aniq ota zanjiri), `(org_id, …)` indeks, cross-tenant test.
- **Hozirgi kodga ta'siri:** route ichida yangi `role === "..."` taqqoslash yozmang; authz'ni `lib/building-access.ts` dan tashqariga tarqatmang.

## Kuzatuv — Faza 4 → `observability.md`
- Har so'rovda `requestId` (`cf-ray`), `X-Request-Id` sarlavhasi, JSON loglar `{ level, msg, requestId, userId, route, durationMs }`.
- Uzoq ishlar (audit run, hisobot, AI) Analytics Engine'ga metrika; `/health` da `version` va `engineVersion`.
- **Hozirgi kodga ta'siri:** yangi `console.log` da shaxsiy ma'lumot yo'q (`security.md`); log matni mashina o'qiy oladigan prefiks bilan (`[chat]`, `[auth]` — mavjud uslub).

## Asinxron ishlar — Faza 5/6 (ADR-005, ADR-008) → `async-jobs.md`
- 1 s CPU'dan oshishi mumkin bo'lgan ish (PDF/DOCX, AI, katta import) so'rov ichida emas: `*_job` + Queue/Workflow, API 202 + `jobId`.
- Consumer idempotent (`entity_id, kind, params_hash`), DLQ va maks. urinishlar `wrangler.toml` da.
- Tashqi integratsiyalarga hodisalar faqat **outbox** orqali (mutatsiya bilan bir `db.batch()`).

## AI (Claude API) — Faza 6 (ADR-008) → `ai.md`
- AI hisoblamaydi. Chiqishi `ai_suggestion` ga `proposed` holatida, inson qabul qilgach `audit_event` bilan qo'llanadi.
- Har chiqish zod bilan validatsiya; manbada yo'q raqam = rad. Hisobot matnidagi raqamlar faqat `{{placeholder}}`.
- Har chaqiruv AI Gateway orqali, `ai_usage` ga yoziladi; tashkilot byudjeti chaqiruvdan **oldin** tekshiriladi (K9).
- Prompt'lar versiyalanadi; shaxsiy ma'lumot maskalanadi (K10); hujjat ichidagi matn — ma'lumot, ko'rsatma emas.
- Model tanlash: eng so'nggi Claude modellari (`claude-api` skill'idan tekshiring, xotiradan emas).
