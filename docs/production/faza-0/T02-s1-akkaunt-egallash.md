# T02 — S-1: akkauntni oldindan egallashni yopish (yo'l "b")

**Manba:** 02 §2.1 S-1 · `auth.md` (qaror 2026-10-02: **(b) yo'l**, (a)ni qurmang) · Jiddiylik: 🔴 Kritik.
**Commit:** bitta. **Tegiladigan fayllar:** `apps/api/src/auth/index.ts`, yangi
`apps/api/src/auth/account-linking.ts`, yangi `apps/api/tests/integration/account-linking.test.ts`,
`.claude/rules/auth.md` (bir jumla — "amalga oshirildi" holati).

## Hujum ssenariysi

1. Hujumchi `victim@gmail.com` bilan email/parol orqali ro'yxatdan o'tadi (email tasdiqlash talab qilinmaydi,
   `emailVerified = false`).
2. Haqiqiy egasi keyin "Google bilan kirish"ni bosadi. `requireLocalEmailVerified: false` sababli
   Better Auth Google identifikatsiyasini **hujumchi yaratgan** user'ga ulaydi.
3. Hujumchining paroli ishlashda davom etadi → jabrlanuvchi yaratgan binolarni ko'radi.

## Better Auth 1.6.23 xatti-harakati (manbada tasdiqlangan — taxmin emas)

`node_modules/better-auth/dist/oauth2/link-account.mjs`, `handleOAuthUserInfo()`:
1. email bo'yicha mavjud user topiladi, Google akkaunti hali ulanmagan;
2. `internalAdapter.linkAccount(...)` → `createWithHooks(..., "account")` — ya'ni
   **`databaseHooks.account.create.after` shu yerda ishga tushadi**, bu paytda `user.emailVerified`
   hali **eski qiymatda (`false`)**;
3. faqat shundan keyin `updateUser(id, { emailVerified: true })`;
4. eng oxirida `createSession(user.id)` — Google bilan kirgan haqiqiy egasining yangi sessiyasi.

Demak `account.create.after` ichida: "yangi akkaunt `credential` emas VA user hali tasdiqlanmagan" ⇒
bu tasdiqlanmagan lokal akkauntga implicit linking. Shu nuqtada parolni va barcha **eski** sessiyalarni
o'chirsak, 4-qadamdagi yangi sessiya saqlanib qoladi.

`bun.lock` dagi versiya 1.6.23 dan boshqa bo'lsa — yuqoridagi tartibni o'sha versiya manbasida qayta
tekshiring; farq qilsa, to'xtang (README §5).

## Bajarish

1. `apps/api/src/auth/account-linking.ts`:
   ```ts
   /**
    * Pre-account-takeover guard (02-arxitektura S-1, auth.md). Called from
    * databaseHooks.account.create.after — Better Auth runs it *before* it flips
    * emailVerified to true on implicit OAuth linking, so an unverified user here means
    * a social identity is being attached to a local account nobody proved they own.
    * Drop that account's password and every existing session; the OAuth flow creates
    * the rightful owner's fresh session right after this returns.
    */
   export async function revokeUnverifiedCredentialOnSocialLink(
     db: Database,
     linked: { userId: string; providerId: string },
   ): Promise<{ revoked: boolean }>
   ```
   - `providerId === "credential"` → `{ revoked: false }` (oddiy ro'yxatdan o'tish ham shu hook'dan o'tadi).
   - user'ni o'qing; topilmasa yoki `emailVerified === true` → `{ revoked: false }`.
   - `db.batch([...])` (`database.md`: tranzaksiya yo'q, atomiklik faqat batch):
     `delete(account).where(and(eq(account.userId, id), eq(account.providerId, "credential")))` va
     `delete(session).where(eq(session.userId, id))`.
   - `console.warn` bilan **email'siz** log: `[auth] revoked unverified credential on social link userId=…`.
   - `{ revoked: true }`.
2. `auth/index.ts` → `databaseHooks` ga:
   ```ts
   account: {
     create: {
       after: async (account) => {
         await revokeUnverifiedCredentialOnSocialLink(db, account);
       },
     },
   },
   ```
   `requireLocalEmailVerified: false` **o'zgarmaydi**; uning ustidagi izohga bitta jumla qo'shing:
   bu sozlama endi `revokeUnverifiedCredentialOnSocialLink` bilan birga xavfsiz, biri ikkinchisisiz emas.
3. Integratsiya testi (`tests/integration/account-linking.test.ts`, mavjud fayllar andozasida —
   `resetTestDb()` va `testDb`):
   - **A:** unverified user + `credential` akkaunt + 2 sessiya → funksiyani `providerId: "google"` bilan
     chaqirish → credential akkaunt yo'q, sessiyalar 0, `revoked: true`.
   - **B:** verified user → hech narsa o'chmaydi.
   - **C:** `providerId: "credential"` → hech narsa o'chmaydi.
   - **D:** boshqa user'ning sessiyalari tegilmaydi.
4. `auth.md` dagi S-1 bandining oxiriga: "Amalga oshirildi: `auth/account-linking.ts` (sana)".

## Qabul mezonlari

- [ ] Type-check, lint yashil; servis unit testlari yashil.
- [ ] Integratsiya testi yozildi (lokal ECONNREFUSED — kutilgan; CI'da tasdiqlanadi).
- [ ] Oddiy email/parol ro'yxatdan o'tish oqimi o'zgarmagan (hook `credential` uchun no-op).
- [ ] PROGRESS.md da loyiha egasi uchun qo'lda tekshirish: (1) yangi email bilan parol akkaunt oching,
      tasdiqlamang; (2) o'sha Gmail bilan "Google bilan kirish"; (3) eski parol bilan kirish **ishlamasligi**,
      Google bilan kirish ishlashi; (4) parol kerak bo'lsa — "Parolni unutdim" oqimi (`social-features.md`:
      u o'zgarmaydi) yangi parol beradi.

## Qilmang

- `requireEmailVerification: true` yoki "tasdiqlashni qayta yuborish" oqimini qurmang — bu (a) yo'l, rad etilgan.
- Hook ichida email yubormang, bildirishnoma qo'shmang — ko'lamdan tashqari.
- Mavjud production user'larini retroaktiv "tozalash" skripti yozmang (production bazaga tegish yo'q).
