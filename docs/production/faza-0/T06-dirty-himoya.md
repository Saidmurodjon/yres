# T06 — Saqlanmagan tahrirlar yo'qolmasin + o'chirishga tasdiq (3 commit: T06a–T06c)

**Manba:** 03 §1.1 U2, U3, U7; §2.3 oxirgi band · Jiddiylik: 🔴 Kritik (ma'lumot).
Qoida: `.claude/rules/forms-and-numbers.md` ("hech bir forma saqlanmagan tahrirni jimgina tashlamaydi").
**Bog'liqlik:** T05 tugagan bo'lishi kerak (bir xil fayllarga tegadi).

## Muammolar (kodda tasdiqlangan)

1. **U2 — tizimlar kartalari** (`components/building-detail/systems-tab.tsx`): 9 ta `*Section`
   (Ventilation ~346, Dhw ~434, ... ) har biri `useEffect(() => setRows(toRows(...)), [systems, scenario])`.
   Bitta kartani saqlash → `invalidateQueries` → barcha kartalar yangi massiv oladi → **boshqa kartalardagi
   saqlanmagan qatorlar o'chadi**. "Oldin/Keyin" tab'i (`scenario`, ~278) ham shunday.
2. **Bino sahifasi tab'lari** (`routes/_authenticated/buildings/$buildingId/index.tsx` ~91):
   `<Tabs defaultValue="overview">` — Radix nofaol `TabsContent`ni unmount qiladi → "Tizimlar"dan
   "Iste'mol"ga o'tish ham saqlanmagan tahrirni yo'qotadi.
3. **U3 — qobiq muharriri** (`components/building-detail/envelope-editor-dialog.tsx`): 4 bosqichli holat
   dialog ichida; Esc / tashqariga bosish / "Bekor" → hammasi tasdiqsiz yo'qoladi.
4. **Route'dan chiqish** — `useBlocker`/`beforeunload` ilovada umuman yo'q.
5. **U7 — o'chirish** tasdiqsiz: `measures-tab.tsx` ~159 (`deleteMeasure`), ~204 (`deleteNonEeMeasure`),
   `sharing-tab.tsx` ~74 (`removeMember`). (`delete-building-dialog.tsx` da tasdiq allaqachon bor — andoza sifatida o'qing.)

TanStack Router versiyasi **1.170.17** — `useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })`
API mavjud (`node_modules/@tanstack/react-router/dist/esm/useBlocker.d.ts`). Eski (legacy) imzoni ishlatmang.

---

## T06a — umumiy infratuzilma: `ConfirmDialog` + `UnsavedChanges` konteksti + blocker

**Yangi fayllar (hammasi `apps/web` ichida — `packages/ui` emas, `@source` tuzog'i sababli):**

1. `components/confirm-dialog.tsx` — `@yres/ui` `Dialog` ustida:
   ```ts
   interface ConfirmDialogProps {
     open: boolean;
     title: string;
     description?: string;
     confirmLabel: string;
     cancelLabel?: string;          // default: t("common:cancel")
     destructive?: boolean;         // confirm tugmasi variant="destructive"
     pending?: boolean;             // confirm disabled + spinner
     onConfirm: () => void | Promise<void>;
     onCancel: () => void;
   }
   ```
   Fokus dastlab **Bekor** tugmasida (xavfsiz default), Esc = bekor. `delete-building-dialog.tsx` uslubiga moslang.
2. `components/unsaved-changes.tsx`:
   - `UnsavedChangesProvider` — `Map<string, boolean>` holat (React state, sahifa bilan birga o'ladi);
     `register(key, dirty)`; `isDirty` (birortasi `true`); `clearAll()`.
   - `useRegisterDirty(key: string, dirty: boolean)` — effect bilan ro'yxatdan o'tkazadi, unmount'da o'chiradi.
   - `useConfirmDiscard()` → `(action: () => void) => void`: toza bo'lsa darhol `action()`, iflos bo'lsa
     `ConfirmDialog` ochadi ("Saqlanmagan o'zgarishlar yo'qoladi. Davom etasizmi?"), tasdiqda `clearAll()` + `action()`.
   - Provider ichida router blocker:
     ```ts
     const blocker = useBlocker({
       shouldBlockFn: () => isDirtyRef.current,
       enableBeforeUnload: () => isDirtyRef.current,
       withResolver: true,
     });
     ```
     `blocker.status === "blocked"` bo'lsa o'sha `ConfirmDialog` → `proceed()` / `reset()`. Ref ishlating —
     `shouldBlockFn` ichida eskirgan closure bo'lmasin.
   - **Nega Zustand emas:** holat bitta sahifa nusxasiga tegishli va u bilan birga yo'qolishi kerak; global store
     boshqa binoga o'tganda eskirgan "iflos" bayroqni olib o'tishi mumkin. `ui-guidelines.md` chegarasi buzilmaydi
     (bazadan kelgan ma'lumot emas, ephemeral UI holat). Shu izohni faylga yozing.
3. `hooks/use-synced-rows.ts` — server ma'lumotidan sinxronlanadigan tahrir holati:
   ```ts
   function useSyncedRows<T>(serverRows: T[], resetKey: string): {
     rows: T[];
     setRows: (updater: T[] | ((prev: T[]) => T[])) => void; // dirty = true qiladi
     dirty: boolean;
     markClean: () => void;   // muvaffaqiyatli saqlashdan keyin
   }
   ```
   Qoida: `serverRows` o'zgarganda — **faqat `dirty === false` bo'lsa** qayta sinxronlanadi. `resetKey`
   (masalan scenario) o'zgarganda — har doim qayta sinxronlanadi va `dirty = false` (chaqiruvchi bunga faqat
   tasdiqdan keyin yo'l qo'yadi). `serverRows` har render'da yangi massiv bo'lishi mumkin — chuqur taqqoslash emas,
   `JSON.stringify` yoki chaqiruvchi tomondagi `useMemo` bilan barqarorlashtiring; tanlovni izohda asoslang.
4. i18n: `common.json` (uz/ru/en) — `unsaved.title`, `unsaved.description`, `unsaved.discard`, `unsaved.stay`,
   `confirmDelete.title`, `confirmDelete.description`, `confirmDelete.confirm`.

T06a da mavjud sahifalar o'zgarmaydi (faqat infratuzilma) — lekin `bun run build` yashil bo'lishi shart.

---

## T06b — tizimlar, bino tab'lari, qobiq dialogi

1. `$buildingId/index.tsx`: sahifa kontentini `UnsavedChangesProvider` ga o'rang; `Tabs` ni controlled qiling
   (`value` + `onValueChange={(v) => confirmDiscard(() => setTab(v))}`).
2. `systems-tab.tsx`:
   - har `*Section` da `useState<Row[]>` + `useEffect` → `useSyncedRows(memoizedServerRows, scenario)`;
     `useRegisterDirty(\`systems.${sectionKey}\`, dirty)`; saqlash muvaffaqiyatli bo'lgach `markClean()`.
   - Scenario tab'i: `onValueChange={(v) => confirmDiscard(() => setScenario(v as Scenario))}`.
   - 9 ta bo'lim takrorlanuvchi — umumiy hook bilan har birida 3–4 qator o'zgarishi kerak; bo'limlarni qayta
     tuzish/faylni bo'lish **bu topshiriqda emas** (02 §3 P3 texnik qarz).
3. Iste'mol tab'i (`consumption-tab.tsx`): mavjud `saved`/`setSaved` holatidan iflos bayroqni chiqarib
   `useRegisterDirty("consumption", dirty)`. To'liq ko'p-yilli dirty — T07 da.
4. `envelope-editor-dialog.tsx`:
   - `dirty` = joriy `state` ochilishdagi boshlang'ich holatdan farq qiladimi (ochilishda boshlang'ichni ref'da
     saqlang; taqqoslash `JSON.stringify`).
   - Dialog `onOpenChange(false)` (Esc, tashqariga bosish, X, "Bekor") → iflos bo'lsa `ConfirmDialog`; muvaffaqiyatli
     saqlashdan keyingi yopish tasdiqsiz.
   - Dialog ochiq va iflos bo'lsa `useRegisterDirty("envelope.editor", dirty)` — tab almashtirish/route'dan chiqish ham himoyalanadi.
5. Boshqa formalar: `buildings/new` va bino tahrirlash formasi, `financial.tsx` — agar ular saqlash tugmali forma
   bo'lsa, `UnsavedChangesProvider` + `useRegisterDirty` bilan route blocker qo'shing. Ro'yxatni grep bilan
   aniqlang (`useState` + submit), PROGRESS.md da qamrab olinganlarni sanang.

---

## T06c — server obyektlarini o'chirishga tasdiq

- `measures-tab.tsx`: chora-tadbir va non-EE o'chirish → `ConfirmDialog` (`destructive`, nomi tavsifda,
  `pending` = mutation pending).
- `sharing-tab.tsx`: a'zoni olib tashlash → `ConfirmDialog` (a'zo nomi/email tavsifda).
- `grep -rn "useDelete\|useRemove\|\.mutateAsync(" apps/web/src` bilan boshqa qaytarib bo'lmaydigan
  server amallarini toping (chat xabarini o'chirish va h.k.) — har biriga tasdiq yoki PROGRESS.md da asos bilan istisno.
- Lokal (hali saqlanmagan) jadval qatorini o'chirish — tasdiq **kerak emas** (u dirty-himoya ostida, saqlanmaguncha
  qaytarish mumkin). 03 §1.1 dagi "5 soniyalik undo toast" — Faza 3.

## Qabul mezonlari (har commit uchun tegishlisi)

- [ ] `bun run build`, type-check, lint yashil; yangi klasslar faqat `apps/web` da (packages/ui tegilmagan) — `@source` tekshiruvi shart emas, lekin `packages/ui` ga tegsangiz — shart.
- [ ] Qo'lda (preview yoki loyiha egasi): ventilyatsiya kartasida qator qo'shing (saqlamang) → DHW kartasini saqlang →
      ventilyatsiya qatori **joyida qoladi**.
- [ ] Iflos holatda "Keyin" tab'iga o'tish → dialog; "Qolish" → o'zgarish saqlanib turadi.
- [ ] Iflos holatda boshqa bino tab'iga, boshqa route'ga o'tish, sahifani yopish/yangilash → ogohlantirish.
- [ ] Qobiq muharririda o'zgarish → Esc → dialog.
- [ ] Chora-tadbirni o'chirish → tasdiq dialogi; "Bekor" → o'chmaydi.
- [ ] Toza holatda hech qanday ortiqcha dialog chiqmaydi (regressiya: har tab almashtirishda so'ramasin).
