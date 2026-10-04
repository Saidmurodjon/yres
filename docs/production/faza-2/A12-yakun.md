# A12 — Yakun: qoidalar, hisobot.md, master reja, PROGRESS

**Manba:** `CLAUDE.md` (har bosqich PROGRESS.md ga), master reja §5–§6 · **Commit:** bitta (faqat hujjat/qoida) · **Qachon:** A01–A11 dan keyin
**Bog'liqlik:** hammasi.

## Bajarish

1. `.claude/rules/data-integrity.md`:
   - "Faza 2 dan amal qiladi" bo'limidagi qurilgan bandlar → **"Hozir amal qiladi"** ga ko'chiriladi va haqiqiy nomlar bilan yoziladi:
     snapshot o'zgarmas (triggerlar `audit_snapshot_frozen`, `audit_snapshot_status_flow`, `audit_snapshot_report_frozen`); JSON'lar R2'da
     (`snapshots/…`, sabab — o'lcham); rasmiy PDF faqat snapshot'dan, saqlangan baytlar qaytariladi; `ENGINE_VERSION` + lock (A11);
     `audit_event` har bino mutatsiyasi bilan bir batch'da, **birinchi** bayonot, FK'siz, append-only trigger; revision = `audit_event`,
     `expectedRevision` hozircha ixtiyoriy (contract — keyingi reliz).
   - Soft-delete bandi aniqlashtiriladi: **faqat `building`**; bola jadvallar "qatorlarni almashtirish" andozasida qattiq o'chiriladi, tarix —
     `audit_event` + snapshot (README §0.3). Snapshot/hisobot qatorlari va R2 obyektlarini o'chiruvchi kod yo'li yo'q.
   - Qolgan Faza 2+ bandlar (konkurent tahrir majburiyligi, `data-migrations/`) — holati bilan.
2. `.claude/rules/calculation-engine.md`: "natija keshlanmaydi" bandiga — "jonli (draft) ko'rinish uchun; rasmiy natija — `audit_snapshot`
   (ADR-004), u kesh emas". A01/A11 qoidasi borligini tekshiring.
3. `.claude/rules/hisobot.md`: A bo'limiga qatorlar — "Snapshot meta (id, dvigatel/metodika versiyasi, sana) muqovada ✅",
   "Qoralama suv belgisi (jonli PDF) ✅", "Rasmiy PDF — faqat snapshot'dan, o'zgarmas R2 kaliti + SHA-256 ✅".
4. `.claude/rules/security.md`: verify oq ro'yxati (A07) va "GET yozmaydi — jonli hisobot ham" (A06) qisqa band sifatida.
5. `CLAUDE.md` jadvaliga yangi qoida fayli **qo'shilmaydi** (mavjud fayllar yetarli); faqat "Joriy faza" bo'limi yangilanadi.
6. `00-MASTER-PLAN.md`: §3 Faza 2 → "A trek ✅ bajarildi (sana); B trek — paket tayyorlanmoqda"; §5 ga K24–K26 (README §7) — javob
   olinganlari "Qaror:" bilan; `docs/adr/ADR-004-audit-snapshot.md` holati "qabul qilingan".
7. `README.md` (repo ildizi) arxitektura jadvalida "natija saqlanmaydi" degan joy bo'lsa — snapshot bilan yangilang (coder tekshiradi: grep).
8. `PROGRESS.md`: Faza 2 A trek yakuniy xulosa — nima qurildi, byudjet o'lchovlari (qobiq "oldin" PUT 40/40 holati), loyiha egasi uchun:
   (a) production R2 `yres-reports` bucket'ida `snapshots/` va `reports/*/*/` prefikslariga lifecycle qoidasi yo'qligini tasdiqlash (K25);
   (b) deploy'da `--var GIT_SHA` (A01); (c) qo'lda tekshirish ro'yxatlari (A07, A08, A10b — brauzerda tekshirilmagan bo'lsa).
9. `docs/production/faza-2/README.md` §4 jadvalda hammasi ✅.

## Qabul mezonlari

- [ ] Qoidalar fayllari kod bilan mos (har nom grep bilan topiladi).
- [ ] Master rejada Faza 2 holati va K24–K26.
- [ ] PROGRESS.md da yakun va loyiha egasi ro'yxati.

## Tekshiruvlar

Faqat hujjat — `bunx biome lint` shart emas; `bun run test` o'zgarmagan holda yashil ekanini bir marta tasdiqlang.
