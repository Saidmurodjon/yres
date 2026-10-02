# T01 — CI gigiyenasi: branch trigger, artefaktlar

**Manba:** 06 §1.5 · 02 C-3. **Commit:** bitta. **Tegiladigan fayl:** `.github/workflows/ci.yml`.
**Bog'liqlik:** D03 (Postgres service va psql migratsiya qadami D03 da allaqachon olib tashlangan).

> Avvalgi T01 mazmuni (psql migratsiya sikli, `ON_ERROR_STOP`, `test-db.ts` Neon himoyasi) K20/ADR-016 bilan
> **eskirdi**: baza D1, testlar migratsiyalarni lokal Miniflare D1'ga o'zi qo'llaydi (D03).

## Muammo (kodda tasdiqlangan)

1. `on: push: branches: [main]` — repo'da `main` yo'q, ish `claude/yres-platform-development-svx6nn` da. Push'da CI
   **umuman ishga tushmaydi** (faqat PR'da).
2. Playwright xatoda trace yoziladi (`retain-on-failure`), lekin artefakt sifatida yuklanmaydi.

## Bajarish

1. `push: branches: [main, "claude/**"]` (PR trigger qoladi, `concurrency` o'zgarmaydi).
2. E2E qadamidan keyin:
   ```yaml
   - name: Upload Playwright traces
     if: failure()
     uses: actions/upload-artifact@v4
     with:
       name: playwright-traces
       path: apps/web/test-results/
       retention-days: 7
   ```
3. Miniflare (D03) CI'da qo'shimcha narsa talab qiladimi — `ubuntu-latest` da `workerd` binari `wrangler` bilan keladi;
   birinchi CI ishga tushishida yiqilsa, xatoni PROGRESS.md ga yozing.
4. `apps/web` `test` skripti (T05a) qo'shilgach turbo uni avtomatik ishga tushiradi — CI'ga alohida qadam kerak emas.

## Qabul mezonlari

- [ ] `ci.yml` YAML jihatdan to'g'ri.
- [ ] Push'dan keyin CI natijasini **loyiha egasi** GitHub Actions sahifasida tekshiradi (bu sessiyada `gh` yo'q) —
      PROGRESS.md da so'rang.

## Qilmang

- Yiqilgan testlarni `skip` qilib CI'ni "yashil" qilmang.
