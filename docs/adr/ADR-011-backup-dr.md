# ADR-011 — Backup va halokatdan tiklash (DR)

- **Holat:** Taklif — loyiha egasi tasdig'i kutilmoqda
- **Manba:** `docs/production/02-arxitektura-va-texnologiyalar.md` §6, M-1 · baza: ADR-016

## Kontekst

Bank hisobotlari va audit ma'lumoti yo'qolsa tiklab bo'lmaydi. Baza — Cloudflare D1 (ADR-016); alohida PITR xizmati yo'q,
D1 o'zining Time Travel imkoniyatini beradi.

## Variantlar

| Variant | Izoh |
|---|---|
| (a) Faqat Time Travel (PITR) | Oddiy; saqlash muddati reja bilan cheklangan (Free 7 kun, Paid 30 kun) |
| (b) Time Travel + kunlik logik eksport R2'ga + choraklik tiklash mashqi | Muddatdan uzoq nusxa va tiklash amalda sinalgan |

## Qaror (taklif)

**(b)**. RPO ≤ 24 soat (Time Travel bilan — daqiqalar), RTO ≤ 4 soat. Hozir: Time Travel + qo'lda `wrangler d1 export` va
choraklik mashq (`docs/runbooks/backup-va-tiklash.md`). Kunlik avtomatik eksport R2'ga — Faza 4.

## Oqibatlar

- Tiklash mashqi bajarilmaguncha backup "ishlaydi" deb hisoblanmaydi (Faza 0 chiqish mezoni).
- Eksport fayllarida shaxsiy ma'lumot bor — repo'ga tushmaydi.
- Free rejada Time Travel atigi 7 kun — ADR-015/ADR-016 triggerlari.
