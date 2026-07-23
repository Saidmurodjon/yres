# Hisobot (PDF audit report) — qayta ko'rib chiqish taklifi

**Holat: TAKLIF, tasdiqlanmagan.** Bu fayl `.claude/rules/hisobot.md`ning o'rnini
bosmaydi — u hozircha amaldagi qoidalar (`AuditResult` maydon → bo'lim jadvali,
grafik chizish texnikasi) manbai bo'lib qoladi. Loyiha egasi ushbu taklifni ko'rib
chiqib tasdiqlagach yoki o'zgartirgach, tegishli qismlar `hisobot.md`ga ko'chiriladi
va shundan keyingina amalga oshirish boshlanadi. Hozircha kod o'zgartirilmagan.

Har bir band uchun: **nima so'ralgan → hozirgi holat (kodda tekshirilgan) → taklif
→ bu yangi sxema/infratuzilma talab qiladimi**. Oxirida bosqichma-bosqich amalga
oshirish tartibi va ochiq savollar bor.
~
---

## 1. Umumiy dizayn: shrift, tartib, professional ko'rinish

**So'ralgan**: Times New Roman, 14pt,(1,2 interval, 14pt katta bo'lsa 12pt ga ruhsat beriladi) izohlar kursiv (italic); barcha ma'lumotlar
aniq/ravshan/professional tartibda.

**Hozirgi holat**: `report.service.ts`da `StandardFonts.Helvetica`/`HelveticaBold`,
o'lchamlar bo'lim turiga qarab 6.5pt (grafik o'q yorlig'i) dan 20pt (sarlavha)
gacha — yagona standart yo'q, har bir chaqiruv o'z o'lchamini tanlagan.

**Taklif**:
- Asosiy shrift `Helvetica*` oilasidan `Times*` oilasiga o'tkaziladi: `StandardFonts.TimesRoman`
  / `TimesRomanBold` / `TimesRomanItalic` / `TimesRomanBoldItalic` — to'rttasi ham
  pdf-lib'da standart (o'rnatilgan) shrift, alohida embed qilish shart emas.
- **14pt faqat asosiy matn (paragraf/izoh) uchun ma'noli** — jadval katakchalarini
  ham 14pt qilsak, ko'p ustunli jadvallar (masalan Cashflow, 7 ustun) A4 kengligiga
  sig'maydi. Taklif: paragraf/izoh matni **10pt** (hozirgi 9.5pt o'rniga, "14"ga
  yaqinroq lekin sig'adigan), sarlavhalar 14pt (bold), jadval katakchalari 10pt (hozirgi
  8.5pt), grafik yorliqlari (12pt, chunki ular allaqachon eng kichik
  va bezaklanmagan qism). **Bu band — ochiq savol, pastdagi "Ochiq savollar"ga
  qarang**, chunki so'zma-so'z "14pt hamma joyda" jadvallarni buzadi.
- **Izohlar (auditor sharhi, eslatmalar) — `TimesRomanItalic`/`TimesRomanBoldItalic`**
  bilan chiziladi, oddiy matndan farqlanishi uchun (masalan `MUTED` rangda + kursiv).
- Bo'lim tartibi/ierarxiyasi §3'da qat'iy ro'yxat sifatida beriladi — bu "tartib
  qoida yo'q" degan shikoyatga javob.

**Yangi sxema/infratuzilma kerakmi**: Yo'q — faqat `report.service.ts` ichidagi
`ReportLayout` konstantalarini almashtirish.

---

## 2. Til: hisobot tizim (UI) tilida yozilsin

**So'ralgan**: Tizim (platforma) qaysi tilda bo'lsa, hisobot ham o'sha tilda yozilsin.

**Hozirgi holat** (tekshirilgan): UI tili `react-i18next` orqali to'liq ishlaydi
(uz/ru/en, 14 namespace), lekin **faqat client-side, `localStorage["yres-language"]`da**
saqlanadi (`apps/web/src/i18n/index.ts`) — serverda (`user`/`building` jadvalida)
til haqida hech qanday yozuv yo'q. `apps/web/src/lib/api.ts`ning `report()` chaqiruvi
hozir hech qanday til ma'lumotini yubormaydi, `apps/api/src/routes/audit.ts`da ham
`Accept-Language` yoki shunga o'xshash boshqaruv yo'q.

**Taklif**:
- Frontend `report()` chaqiruvida joriy `i18n.language`ni query-param sifatida
  yuboradi: `GET /:id/audit/report?lang=uz`.
- `report.service.ts`da butun matn (sarlavhalar, ustun nomlari, birlik/enum
  label'lari) uchun uch tilli **statik lug'at** kerak bo'ladi — `apps/web`dagi
  i18n JSON fayllaridan **qayta foydalanib bo'lmaydi** (ular frontend'ga xos,
  React-context'ga bog'liq), shuning uchun `apps/api/src/services/report-i18n.ts`
  kabi mustaqil, oddiy `Record<"uz"|"ru"|"en", Record<string,string>>` lug'at
  yoziladi — faqat hisobotda ishlatiladigan satrlar uchun (~80-120 ta kalit).
  **i18n-and-appearance.md'dagi ogohlantirish** ("maxsus energiya-audit
  terminologiyasini tarjima qilishda ehtiyot bo'ling — texnik atamalar tarjimasini
  loyiha egasi ko'rib chiqishi kerak") bu yerda ayniqsa muhim — bu lug'at
  loyiha egasi tomonidan tasdiqlanishi kerak, ayniqsa rus tilidagi atamalar.
- Sana/raqam formatlash (`toLocaleDateString`, `toLocaleString`) hozir qattiq
  `"en-US"`ga bog'langan (`report.service.ts`ning `fmt()`/sana chaqiruvi) — bu
  ham `lang` parametriga qarab almashtiriladi.

**Yangi sxema/infratuzilma kerakmi**: Yo'q (baza o'zgarmaydi), lekin **yangi fayl**
(`report-i18n.ts`, uch tilli lug'at) va uni loyiha egasi tomonidan **tarjima
tekshiruvi** kerak — bu vaqt talab qiladigan qism.

---

## 3. Hisobotning yozilish tartibi (bo'lim tartibi qoidasi)

Quyidagi tartib — "kamchiliklar, tartib qoida yo'q" degan shikoyatga to'g'ridan-to'g'ri
javob. Bu `hisobot.md`dagi mavjud A-H jadvalini o'zgartirmaydi, balki uni **qat'iy,
raqamlangan ketma-ketlik** sifatida qayta tasdiqlaydi va yangi bandlarni shu
ketma-ketlik ichiga joylashtiradi (yangi bo'limlar **bold** bilan belgilangan):

1. **Muqova** — sarlavha, bino nomi, manzil, hisobot sanasi, **QR kod + amal
   qilish/haqiqiylik bloki** (§8'ga qarang)
2. **Bino haqida umumiy ma'lumot** — nom/joylashuv/tur/yil/maydon/aholi,
   **koordinatalar + xarita rasmi** (§7'ga qarang, bo'limning eng boshida),
   keyin iqlim/harorat parametrlari
3. Qisqa xulosa jadvali (nazariy/haqiqiy to'lov muddati juftligi bilan)
4. Umumiy xulosa KPI'lari
5. Qobiq yuzalari
6. U-value hisob-kitoblari — **har bir construction type uchun auditor izohi
   (`description`) kursiv bilan** (§6'ga qarang)
7. **Energiya iste'moli — 3 yillik oylik taqqoslash, ustunli grafik shaklida,
   har bir tashuvchi (gaz/elektr/...) uchun alohida** (§4'ga qarang) — **jadvalsiz**,
   faqat grafik + ixtiyoriy auditor xulosasi (§5'ga qarang)
8. **Energiya balansi — Excel'dagi "Specific-consumption summary" tuzilishida**
   (haqiqiy/standartlashtirilgan-oldin/standartlashtirilgan-keyin, issitish/ISI/
   elektr bo'yicha alohida) (§4'ga qarang)
9. Generatsiya/taqsimot samaradorligi
10. Issitish energiya balansi (oldin/keyin)
11. Yakuniy energiya (end-use bo'yicha)
12. Qobiq/ventilyatsiya yo'qotish taqsimoti — **donut grafik, jadvalsiz**
    (chart-o'rniga-jadval qoidasi, §5)
13. Sotib olingan energiya taqsimoti — **donut grafik, jadvalsiz**
14. **Chora-tadbirlar jadvali — yakuniy asosiy qism sifatida alohida ajratilgan**
    (standartlashtirilgan/haqiqiy juftligi, investitsiya, NPV/IRR, CO2) — bu
    bo'lim allaqachon bor, lekin uni "alohida e'tibor" bilan vizual jihatdan
    ajratib ko'rsatish taklif qilinadi (masalan qalinroq ramka, sahifa boshidan
    boshlanishi)
15. GHG emissiyalari
16. Moliyaviy taxminlar
17. Cashflow tafsiloti
18. Yordamchi (non-EE) xarajatlar
19. Annex 2: batafsil hisob-kitoblar (jadval shaklida 12pt yoki 10 pt, profesionla, o'rtaga tekislangan)

**Grafik-jadval qoidasi (yangi, umumiy)**: Har qanday bo'limda grafik chizilsa,
o'sha bo'limda **xuddi shu ma'lumotning jadvali ixtiyoriy** — standart holatda
jadval olib tashlanadi, faqat grafik + tagida ixtiyoriy 1-2 qatorli auditor
xulosasi qoladi. Bu §7-8, 12-13 bandlariga taalluqli (hozir ular jadval+grafik
ikkalasini birga ko'rsatadi). Annex 2'dagi batafsil jadvallar bundan mustasno —
ular auditor o'z ishini tekshirishi uchun, grafiklari yo'q.

**Yangi sxema/infratuzilma kerakmi**: Yo'q, bu faqat `generateAuditReportPdf()`
ichidagi chaqiruvlar tartibini qayta tashkil qilish.

---

## 4. Energiya iste'moli va balansi — platforma/Excel bilan moslashtirish

### 4a. 3 yillik oylik taqqoslash, ustunli grafik, platformadagi kabi

**Hozirgi holat** (tekshirilgan): `apps/web/src/components/building-detail/
consumption-comparison-chart.tsx`ning `MonthlyComparisonChart`i (`recharts`) —
oxirgi 3 yilni oladi, **har bir oy ichida yil boshiga bitta ustun — 3 ta yonma-yon
ustun** (group bar chart), har bir yil o'z rangida. PDF'dagi `barChart` esa hozir
faqat bitta `{label, value}` qatorini oladi (hozir 3 yillik **o'rtachasini**
ko'rsatadi, 3 ta alohida ustun emas).

**Taklif**: `ReportLayout.barChart`ni **ko'p-seriyali (grouped bar)** rejimini
qo'llab-quvvatlaydigan qilib kengaytirish kerak — har bir oy uchun N ta (N=yillar
soni, odatda 3) kichik ustun yonma-yon, har biri o'z yiliga mos rangda (mavjud
`CHART_PALETTE`dan), ustida yil legend'i. Bu **haqiqiy kod o'zgarishi** (yangi
metod yoki `barChart`ning parametrlari kengaytiriladi), shunchaki kosmetika emas.
Har bir energiya tashuvchisi (gaz/elektr/markazlashgan issiqlik/ko'mir) uchun
alohida grafik chiziladi — bu allaqachon shunday (`extras.consumptionHistory`
tashuvchi bo'yicha sikllanadi), faqat grafik turi almashadi.

### 4b. Energiya balansi — Excel'dagi "Specific-consumption summary" jadvali

**Hozirgi holat** (tekshirilgan): Manba Excel'ning `Breakdown Baseline & Balance`
varag'i 28-31 qatorlarida **"Specific-consumption summary"** jadvali bor —
issitish/ISI/elektr bo'yicha **haqiqiy (hisob-fakturadan) vs standartlashtirilgan-
oldin vs standartlashtirilgan-keyin**, kWh/m²/yil birligida — klassik energiya-audit
3-ustunli jadval. Bu **hozir `AuditResult`da yo'q va hisobotda umuman ko'rsatilmaydi**
— aniqlangan haqiqiy kamchilik (energiya balansi "keltirilmagan" degan shikoyat
aynan shu jadvalga tegishli bo'lishi mumkin).

**Taklif**: `AuditSummary`ga (yoki alohida yangi tipga) uch ustunli specific-
consumption qatorlari qo'shiladi (issitish/ISI/elektr har biri uchun actual/
standardized-before/standardized-after), `audit.engine.ts`da hisoblanadi
(mavjud `heatingEnergyBalance`/`dhwDemand`/`finalEnergyByEndUse` va calibratsiya
nisbatidan chiqarilishi mumkin — `calculation-engine.md`dagi `standardized`
vs `actual` qoidasiga rioya qilingan holda), va hisobotda alohida jadval
sifatida chiziladi (bu holatda jadval kerak, chunki grafik emas, sonli
solishtirish jadvali).

**Yangi sxema/infratuzilma kerakmi**: `AuditSummary` tipiga yangi maydon(lar)
+ `audit.engine.ts`da hisoblash logikasi — bu hisoblash dvigateliga tegishli
o'zgarish, `calculation-engine.md` qoidalariga rioya qilib qilinishi kerak
(mock emas, manba Excel'ga mos).

---

## 5. Auditor izohlari (sharhlar)

**So'ralgan**: (a) qatlam ma'lumotlari qayerga tegishli ekanligi haqida auditor
izohi PDF'da aks etsin; (b) grafik ostida ixtiyoriy auditor xulosasi bo'lsin,
PDF'da aks etsin.

### 5a. Construction type izohi — **YANGI SXEMA KERAK EMAS**

**Hozirgi holat** (tekshirilgan): `constructionType.description: text("description")`
ustuni **allaqachon mavjud** (`packages/db/src/schemas/envelope.ts:21`) va
frontend'da allaqachon tahrirlanadi (`construction-types-step.tsx`). Muammo
faqat **ulanish uzilishi**: `report-data.service.ts`ning `getUValueBreakdown()`i
bu maydonni o'qimaydi, shuning uchun `ConstructionTypeUValueBreakdown` tipida
yo'q va PDF'da ko'rinmaydi.

**Taklif**: `getUValueBreakdown()`ga `description`ni qo'shish, `ReportExtras`
tipiga o'tkazish, va U-value bo'limida har bir construction type sarlavhasi
ostida **kursiv (`TimesRomanItalic`)** matn sifatida chizish — masalan:
> *"W1 — asosiy fasad devor konstruksiyasi, 1-3 qavatlarda qo'llaniladi"*

Bu **eng tez amalga oshiriladigan band** — faqat wiring, yangi migratsiya yo'q.

### 5b. Grafik ostida ixtiyoriy auditor xulosasi — **YANGI SXEMA KERAK**

**Hozirgi holat**: Hech qanday auditor-yozadigan erkin-matn maydoni yo'q (na
`measures`, na `auditRun`, na boshqa joyda) — `grep`da hech qanday moslik topilmadi.

**Taklif**: Yangi jadval yoki ustun kerak. Ikki variant:
- **(A) Bitta umumiy jadval**: `report_annotation` (yangi jadval): `id`,
  `auditRunId` yoki `buildingId`, `sectionKey` (masalan `"consumption_gas"`,
  `"envelope_loss_before"`, `"final_energy_after"` — qaysi bo'limga tegishli
  ekanligini belgilaydigan barqaror kalit), `note: text`, `createdByUserId`,
  `createdAt`. Har bir grafik chizilganda shu jadvaldan `sectionKey` bo'yicha
  izoh qidiriladi, bo'lsa kursiv bilan grafik ostida chiziladi.
- **(B) Auditga xos, `auditRun`ga bog'liq bo'lmagan** (chunki natija hech qachon
  saqlanmaydi, "recalculate on demand" qoidasi) — izoh **binoga**, `auditRun`ga
  emas, bog'lanishi kerak (aks holda har safar audit qayta ishga tushganda
  yo'qolib qoladi). **(A) variantida `buildingId`ga bog'lash tavsiya etiladi.**
- Frontend'da har bir grafik-ko'rsatiladigan sahifa (Consumption, Energy Balance)
  yonida kichik "Auditor izohi (ixtiyoriy)" matn maydoni qo'shiladi.

**Yangi sxema/infratuzilma kerakmi**: **Ha** — yangi jadval + migratsiya + CRUD
route + frontend UI maydoni + PDF'ga ulash. Bu eng katta yangi funksionallik
shu spec ichida.

---

## 6. Grafik-jadval qoidasi

Yuqorida §3'da kiritilgan — takrorlash: grafik bo'lgan joyda jadval **ixtiyoriy**
(standart holatda ko'rsatilmaydi). Bundan mustasno: Annex 2 (jadval-faqat, grafiksiz)
va §4b'dagi specific-consumption summary (jadval-faqat, grafiksiz, chunki bu aniq
sonli solishtirish, vizual taqsimot emas).

---

## 7. Bino koordinatalari va xarita

**So'ralgan**: Hisobot boshida bino haqida ma'lumotlarga koordinatalar va
xaritadan joylashuv nuqtasi, professional tarzda.

**Hozirgi holat** (tekshirilgan): `building.location` faqat erkin matn (masalan
"Toshkent") — **hech qanday lat/lng ustuni yo'q** (`packages/db/src/schemas/
buildings.ts:13`). `dashboard.md`da bu ataylab oddiy erkin-matn qilib qoldirilgani
qayd etilgan (region-guruhlash uchun ham) — koordinata qo'shish bu qarorni
buzmaydi, ustun sifatida **qo'shimcha** bo'ladi, `location`ning o'zi o'zgarmaydi.

**Taklif** (foydalanuvchi "to'liq xarita rasmi bilan" variantini tanladi):
- `building`ga ikkita yangi ixtiyoriy (nullable) ustun: `latitude numeric`,
  `longitude numeric` — migratsiya + frontend'da bino formasiga xarita-tanlagich
  yoki qo'lda lat/lng kiritish maydoni.
- PDF'da bino bo'limining **eng boshida**: koordinatalar matn sifatida
  (masalan `41.2995° N, 69.2401° E`) + **statik xarita rasmi** (marker bilan),
  tashqi statik-xarita API'sidan olib, Cloudflare Worker ichida `fetch()` orqali
  yuklab, `pdfDoc.embedPng()`/`embedJpg()` bilan hisobotga joylashtiriladi.
- **Ochiq savol (provayder)**: Google Static Maps API kalit va billing talab
  qiladi; Yandex Static Maps ham shunga o'xshash; ochiq-manba muqobil — OpenStreetMap
  asosidagi statik-xarita xizmatlari (masalan `staticmap.openstreetmap.de` yoki
  shunga o'xshash uchinchi-tomon instansiyasi) API kalitisiz ishlaydi, lekin
  ishonchlilik/SLA kafolati yo'q, va O'zbekiston hududida batafsillik darajasi
  Google/Yandex'dan past bo'lishi mumkin. **Loyiha egasi qaysi provayderni
  xohlashini va API kalitini qayerdan olishni hal qilishi kerak** — bu spec
  buni tanlab bo'lmaydi.(Bepul va ishonchlisidan foydalnamiz)
- Xarita rasmi muvaffaqiyatsiz yuklansa (tarmoq xatosi, kalit tugagan va h.k.),
  hisobot generatsiyasi **buzilmasligi kerak** — shunchaki koordinatalar matn
  sifatida qoladi, xarita rasmi bo'limi o'tkazib yuboriladi (fire-and-forget
  uslubida, `notify.ts`ning bildirishnoma-xatosini yutish qoidasiga o'xshash).

**Yangi sxema/infratuzilma kerakmi**: **Ha** — yangi ustunlar + migratsiya +
frontend maydon + tashqi API integratsiyasi (provayder tanlanishi kerak) +
Worker'dan tashqi `fetch()` (yangi tarmoq qaramligi, hozirgacha `report.service.ts`
hech qanday tashqi tarmoq chaqiruvi qilmagan).

---

## 8. QR kod va hisobotning haqiqiyligi/rasmiyligi

**So'ralgan**: PDF hisobotga rasmiy kuch berish uchun QR kod, platformada
yaratilganligi, amal qilish muddati, haqiqiyligi tasdiqlansin.

**Hozirgi holat** (tekshirilgan): Hech qanday QR kutubxona o'rnatilmagan
(`apps/api/package.json`da yo'q). `auditRun` jadvalida (`packages/db/src/schemas/
audits.ts:7-21`) faqat `id`, `buildingId`, `status`, `startedAt`, `completedAt`,
`reportR2Key`, `errorMessage`, `createdAt` bor — **hech qanday hash, tekshiruv
tokeni yoki amal qilish muddati maydoni yo'q**.

**Muhim tushuncha**: Natija hech qachon saqlanmaydi ("recalculate on demand"
qoidasi, `calculation-engine.md`) — shuning uchun "haqiqiylik" bu yerda "ma'lumot
hali ham dolzarb" degani emas, balki **"aynan shu PDF ushbu platforma tomonidan,
shu bino uchun, shu vaqtda yaratilgan"** degani. Bu farqni hisobotning o'zida
ham tushuntirish kerak (masalan kichik matn: "Ushbu hisobot yaratilgan sanadagi
kiritilgan ma'lumotlar asosida hisoblangan; keyingi o'zgarishlar natijani
o'zgartirishi mumkin").

**Taklif**:
- `auditRun`ga yangi ustun(lar): hech bo'lmaganda hisobot generatsiya vaqti
  allaqachon `result.generatedAt`da bor; qo'shimcha ravishda **tasdiqlash uchun
  ochiq (public) tekshiruv sahifasi** (foydalanuvchi tanlovi: "ochiq, public")
  kerak bo'ladi: `https://yres.saidmurod.com/verify/:auditRunId` — bu route
  autentifikatsiyasiz, faqat **oshkor qilish xavfsiz bo'lgan** maydonlarni
  ko'rsatadi (bino nomi, hisobot sanasi, "haqiqiy" belgisi) — **shaxsiy/moliyaviy
  tafsilotlarni EMAS** (bu route xavfsizlik jihatidan alohida ko'rib chiqilishi
  kerak, chunki `auditRunId` UUID bo'lsa ham, ochiq API orqali binoning
  moliyaviy/texnik tafsilotlarini oshkor qilib qo'ymaslik kerak).
- QR kod shu URL'ni kodlaydi (masalan `qrcode` npm paketi — **Workers muhitida
  ishlashini tasdiqlash kerak**, chunki ko'plab QR kutubxonalar Node'ning
  `Buffer`/`canvas`iga bog'liq; muqobil sifatida sof-JS, DOM'siz QR-matritsa
  generatorlari bor, masalan `qrcode-generator` — bu ancha yengil va Workers
  bilan mos ehtimoli yuqoriroq).
- Hisobotning muqova sahifasida: QR kod rasmi (matritsa to'g'ridan-to'g'ri
  `pdf-lib`ning `drawRectangle()` katakchalari bilan chizilishi mumkin — tashqi
  rasm kutubxonasi shart emas, faqat matritsa ma'lumoti kerak) + "Ushbu hisobot
  YRES platformasida yaratilgan" matni + generatsiya sanasi.

**Yangi sxema/infratuzilma kerakmi**: **Ha** — yangi public route (xavfsizlik
ko'rib chiqilishi bilan), QR-generatsiya kutubxonasi (Workers-mosligi
tasdiqlanishi kerak), va PDF'ga QR-matritsani chizish kodi.

---

## 9. Amalga oshirish bosqichlari (taklif qilingan tartib)

Yangi sxema kerak bo'lmagan, tez amalga oshiriladigan bandlardan boshlab,
eng ko'p yangi infratuzilma talab qiladigan bandlar bilan yakunlanadi:

| Bosqich | Band | Yangi sxema? | Taxminiy hajm |
|---|---|---|---|
| 1 | §1 Tipografiya (Times, o'lchamlar) | Yo'q | Kichik |
| 2 | §3 Bo'lim tartibini qayta tashkil qilish + §6 grafik-jadval qoidasi | Yo'q | O'rta |
| 3 | §5a Construction type izohini ulash | Yo'q | Kichik |
| 4 | §4a 3-yillik grouped bar chart | Yo'q (faqat kod) | O'rta |
| 5 | §2 Til (lang parametri + lug'at) | Yo'q (yangi fayl) | O'rta-katta (tarjima tasdig'i bilan) |
| 6 | §4b Specific-consumption summary jadvali | Ha (`AuditSummary`+engine) | O'rta |
| 7 | §5b Auditor izohlari (grafik ostida) | Ha (yangi jadval+route+UI) | Katta |
| 8 | §7 Koordinatalar + xarita | Ha (yangi ustunlar+tashqi API) | Katta (provayder tanlovi kutilmoqda) |
| 9 | §8 QR kod + tekshiruv sahifasi | Ha (yangi route+kutubxona) | Katta (xavfsizlik ko'rib chiqilishi bilan) |

Har bir bosqich alohida PR/commit sifatida, `testing-and-verification.md` va
`git-and-commits.md`dagi qoidalarga rioya qilib amalga oshiriladi (bitta
mantiqiy tuzatish — bitta commit).

---

## 10. Ochiq savollar (loyiha egasi hal qilishi kerak)

1. **Shrift o'lchami**: Jadval katakchalarini ham 14pt qilish kerakmi (bu holda
   ko'p ustunli jadvallar bir necha sahifaga bo'linadi yoki ustun sonini
   kamaytirish kerak bo'ladi), yoki §1'dagi taklif (paragraf 11pt, jadval 9pt,
   sarlavha 15-16pt) qabul qilinsinmi?(hajmga qarab, 12pt yoki 10pt, portraitga sig'masa albomniy qilib joylashtirilsin)
2. **Xarita provayderi**: Google Static Maps (kalit+billing), Yandex Static Maps,
   yoki ochiq-manba/uchinchi-tomon OSM-asoslangan xizmat? Qaysi API kalitlarga
   kirish huquqi bor?(bepul va ishonchlisidan foydalanamiz)
3. **Auditor izohi doirasi**: §5b faqat energiya iste'moli/balans grafiklariga
   tegishlimi, yoki chora-tadbirlar, U-value, boshqa bo'limlarga ham auditor
   o'z izohini qo'sha olishi kerakmi (bu jadval sxemasidagi `sectionKey`
   ro'yxatini kengaytiradi)?(faqat kerakli qismlarga, ixtiyoriy)
4. **Tarjima tekshiruvi**: §2'dagi uch tilli lug'atni kim tayyorlaydi/tasdiqlaydi
   — men qoralama tarjima taklif qilib, loyiha egasi tekshirib chiqadimi?(barchasini tarjima qil, xatolik bo'lsa keyingi versiyalarda tuzatamiz)
5. **QR tekshiruv sahifasida qaysi maydonlar oshkor qilinsin**: faqat
   "haqiqiy/soxta" belgisimi, yoki bino nomi+sana+auditor ismi ham ko'rsatilsinmi? eng maqbuli~

---

**Keyingi qadam**: Loyiha egasi ushbu faylni ko'rib chiqadi, kerakli joylarni
o'zgartiradi yoki tasdiqlaydi. Tasdiqlangandan so'ng, §9'dagi bosqichlar
`PROGRESS.md`ga alohida topshiriqlar sifatida qo'shiladi va CLAUDE.md'dagi
ko'p-bosqichli ish tartibiga (har bosqichdan keyin tekshirish + commit) muvofiq
bajariladi.
