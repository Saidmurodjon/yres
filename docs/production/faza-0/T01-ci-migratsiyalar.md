# T01 — CI: to'liq sxema, ishonchli yashil/qizil signal

**Manba:** 06 §1.5 (Q1), §5.5 · 02 M-2, C-3 · Jiddiylik: 🔴 Kritik — "CI o'tdi" hozir hech narsani kafolatlamaydi.
**Commit:** bitta. **Tegiladigan fayllar:** `.github/workflows/ci.yml`, `apps/api/tests/helpers/test-db.ts`.

## Muammo (kodda tasdiqlangan)

1. `.github/workflows/ci.yml` "Apply migrations to test database" qadami:
   `psql "$TEST_DATABASE_URL" -f packages/db/drizzle/*.sql` — shell glob 10 faylga yoyiladi, `psql -f`
   faqat birinchisini (`0000_typical_zodiak.sql`) oladi, qolganlari noto'g'ri pozitsion argument.
   `-v ON_ERROR_STOP=1` ham yo'q — SQL xatosi qadamni to'xtatmaydi.
2. `on: push: branches: [main]` — repo'da `main` yo'q, ish `claude/yres-platform-development-svx6nn`
   da. Ya'ni push'da CI **umuman ishga tushmaydi** (faqat PR'da).
3. `apps/api/tests/helpers/test-db.ts` — `TEST_DATABASE_URL` istalgan URL bo'lishi mumkin; agar kimdir
   Neon URL'ini qo'ysa, `resetTestDb()` production jadvallarini `TRUNCATE ... CASCADE` qiladi.
   Qo'lda yozilgan `TABLES_IN_FK_ORDER` ro'yxati sxemadan orqada qolgan (masalan `report_annotation`,
   `shading_element` va keyingi migratsiyalardagi jadvallarni tekshiring).
4. Playwright xatoda trace yoziladi (`retain-on-failure`), lekin artefakt sifatida yuklanmaydi.

## Bajarish

1. **Migratsiya qadami** — fayllarni nom tartibida (drizzle `NNNN_` prefiksi tartibni beradi) birma-bir:
   ```yaml
   - name: Apply migrations to test database
     run: |
       sudo apt-get update -qq && sudo apt-get install -qq -y postgresql-client
       for f in packages/db/drizzle/*.sql; do
         echo "Applying $f"
         psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
       done
   ```
   Eslatma: drizzle `.sql` fayllari `--> statement-breakpoint` izohlarini o'z ichiga oladi — bular SQL
   izohi (`--`), psql uchun xavfsiz. Agar biror migratsiya psql'da yiqilsa — bu haqiqiy topilma,
   uni yashirmang, PROGRESS.md ga yozing va to'xtang.
2. **Trigger:** `push: branches: [main, "claude/**"]` (PR trigger qoladi). `concurrency` bloki o'zgarmaydi.
3. **Seed:** integratsiya/E2E testlari ma'lumotnoma ma'lumotiga tayanadimi — `tests/e2e/server.ts`
   va `tests/setup.ts` ni o'qing. Agar ular seed'ni o'zi qilsa, CI'ga qo'shimcha qadam kerak emas.
   Kerak bo'lsa — alohida qadam, lekin taxmin qilmang.
4. **`test-db.ts` himoyasi** — modul yuklanishida, `Pool` yaratilishidan oldin:
   ```ts
   function assertLocalTestDatabase(url: string): void {
     const host = new URL(url).hostname;
     const isLocal = host === "localhost" || host === "127.0.0.1" || host === "postgres";
     if (!isLocal || url.includes("neon.tech") || url.includes("-pooler")) {
       throw new Error(`Refusing to run destructive test helpers against non-local database host "${host}".`);
     }
   }
   ```
   Izohda nima uchunligini yozing (`database.md`: TRUNCATE production'ni tozalab yuboradi).
5. **Jadval ro'yxati** — qo'lda ro'yxat o'rniga `resetTestDb()` ichida dinamik:
   ```sql
   select tablename from pg_tables
   where schemaname = 'public' and tablename <> '__drizzle_migrations'
   ```
   va bitta `TRUNCATE TABLE "a", "b", ... RESTART IDENTITY CASCADE` (bitta bayonot — FK tartibi
   ahamiyatsiz bo'ladi). Ma'lumotnoma jadvallari (`climate_region`, `material` va h.k.) ham
   tozalanadimi — joriy xatti-harakatni saqlang: hozirgi ro'yxat ularni **tozalaydi**, demak testlar
   o'zi seed qiladi. Buni o'zgartirmang.
6. **Artefakt:** E2E qadamidan keyin
   ```yaml
   - name: Upload Playwright traces
     if: failure()
     uses: actions/upload-artifact@v4
     with:
       name: playwright-traces
       path: apps/web/test-results/
       retention-days: 7
   ```

## Qabul mezonlari

- [ ] `ci.yml` YAML jihatdan to'g'ri (`bunx js-yaml .github/workflows/ci.yml >/dev/null` yoki shunga o'xshash tekshiruv).
- [ ] Lokal: `TEST_DATABASE_URL=postgresql://u:p@ep-x-pooler.neon.tech/db bun run --cwd apps/api test`
      integratsiya fayllarida himoya xatosi bilan yiqiladi (ECONNREFUSED emas) — bu himoya ishlayotganining dalili.
- [ ] Servis unit testlari yashil.
- [ ] PROGRESS.md: push'dan keyin CI natijasini **loyiha egasi** GitHub Actions sahifasida tekshirishi
      kerakligini yozing (bu sessiyada `gh` CLI yo'q). Birinchi haqiqiy to'liq-sxemali ishga tushishda
      ilgari yashirin bo'lgan integratsiya xatolari chiqishi **kutiladi** — ular alohida topshiriq bo'ladi.

## Qilmang

- `drizzle-kit migrate` ga o'tmang (`database.md`: osilib qolish tarixi).
- Yiqilgan testlarni `skip` qilib CI'ni "yashil" qilmang.
