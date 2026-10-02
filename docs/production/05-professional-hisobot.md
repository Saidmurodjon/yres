# 05 — Professional energoaudit hisoboti: tuzilma, gap-tahlil, formatlar, sifat nazorati

**Holat:** TAHLIL VA TAKLIF (kod o'zgartirilmagan). Sana: 2026-09-27.
**Muallif roli:** energoaudit hisobotlari bo'yicha mutaxassis / texnik muharrir (YRES production jamoasi).
**Munosabat:** `.claude/rules/hisobot.md` (amaldagi A–H jadvali) va `docs/report-redesign-proposal.md`
(tasdiqlangan qayta dizayn, asosan bajarilgan) ning davomi. Bu hujjat ularni bekor qilmaydi — ularni
**to'liq, bankka tayyor hisobot** darajasiga olib chiqish uchun maqsadli tuzilma va yo'l xaritasini beradi.

## 0. Manbalar (nimaga tayanildi)

| Manba | Nima olindi | Izoh |
|---|---|---|
| `3-MTM/пример отчёта Мд.docx` | CEBU/WB namunaviy hisobot shabloni: 9 bob + 3 ilova, 41 jadval, ko'rsatma matnlari | Fayl nomi ruscha, lekin **matni inglizcha**; Moldova loyihasidan moslashtirilgan (valyuta `MDL`, me'yorlar ro'yxati Moldovaniki — SM EN/NCM) |
| `3-MTM/CEBU detailed EA.pptx` (may 2026, ruscha) | "Detal energoaudit kamida nimani o'z ichiga olishi kerak" + metodika (bazaviy chiziq, balans) | **Muhim qoida:** CEBU'da bazaviy chiziq = *normallashtirilgan nazariy iste'mol*; hisob-fakturalar "to'liqlik uchun" keltiriladi (obyektlarning >70 % ida hisoblagich yo'q) |
| `3-MTM/m.docx` | Excel shablonining 27 varag'i tavsifi (uzbekcha) | Annex 2 jadvallarining manbasi |
| `3-MTM/3-DMTT v7.20.xlsx` | Natija varaqlari; `Checks` (A1–A13, C1–C20, S1–S9) | QC ro'yxati uchun namuna |
| `3-MTM/docs/277_QAROR_VA_LOYIHA.md` | VM 277: 6-ilova minimal talablar, 4-ilova ZEB, "C"dan past bo'lmagan EE toifa | Muvofiqlik bo'limi |
| `3-MTM/TA_YC_KG_03_EN.pdf` | **Texnik topshiriq EMAS** — bu binoning texnik holati ko'rigi o'lchov chizmalari (43 varaq: rejalar, fasadlar, kesimlar, karkas/tom sxemalari) | Annex (bino rejalari) manbasi sifatida foydali. **Asl ToR/TOR fayli papkada topilmadi — so'rash kerak** (§9, 1-savol) |
| `yres/apps/api/src/services/report.service.ts` (1 436 q.), `report-data.service.ts`, `report-i18n.ts`, `routes/audit.ts`, `routes/verify.ts`, `packages/types/src/audit.ts`, `report-annotations.ts` | Joriy PDF hisobot haqiqatda nima chizadi | Gap-tahlil (§2) kod bo'yicha tekshirilgan |

---

## 1. Maqsadli professional hisobot tuzilmasi

### 1.0 Belgilar

- **Manba** — YRES'dagi maydon/jadval (`AuditResult.*` = `packages/types/src/audit.ts`; `building.*` va boshqalar = `packages/db/src/schemas/*`). *YANGI* = hozir sxemada yo'q.
- **Ko'rinish** — J = jadval, G = grafik, KV = kalit-qiymat bloki, M = matn, R = rasm.
- **Matn manbai:**
  - **SH** — statik shablon (bir marta yoziladi, tarjima qilinadi, auditor o'zgartirmaydi);
  - **AI** — AI qoralama yozishi mumkin (faqat YRES raqamlariga tayanib, har bir raqam tokenlangan — §1.12), auditor tasdiqlaydi;
  - **AUD** — faqat auditor yozadi (dala kuzatuvi, kasbiy xulosa, huquqiy mas'uliyat) — AI faqat tahrir/grammatika bilan yordam beradi;
  - **AVTO** — to'liq ma'lumotdan generatsiya (jadval/grafik, matn yo'q).

Raqamlash: boblar 1…N, jadvallar `Jadval 3.2` (bob.tartib), rasmlar `Rasm 3.2`, formulalar `(3.1)`. Ilovalar harf bilan: A, B, C…
(namunada "Annex 3" ikki marta takrorlangan — Building Plans va Regulatory framework — bu xatoni qaytarmaymiz).

### 1.1 Titul va old qism (raqamlanmaydi yoki rim raqamlari bilan)

| # | Bo'lim | Majburiy mazmun | Manba (YRES) | Ko'rinish | Matn |
|---|---|---|---|---|---|
| T.1 | Titul varaq | Hisobot nomi ("Binoning batafsil energiya auditi hisoboti"), obyekt nomi, manzil, kadastr raqami, dastur (CEBU / WB / IMV), buyurtmachi, auditor tashkiloti, **hisobot raqami, versiya (v1.0), holat (QORALAMA/YAKUNIY)**, sana, QR + verify URL | `building.name/location/latitude/longitude`; *YANGI*: `building.cadastralNumber`, `project.program`, `reportVersion`, `reportStatus` | KV + QR | SH |
| T.2 | Mas'uliyatni cheklash (Disclaimer) | Namunadagi matn: mazmun uchun mas'uliyat mualliflarda; maxfiy ma'lumot bo'lishi mumkin; hisobot kiritilgan ma'lumotlar holatiga (sana) asoslangan | statik | M | SH |
| T.3 | Tomonlar va tasdiq (namunaning 3 jadvali) | **Benefitsiar** (muassasa, mas'ul shaxs, lavozim, tel, email, imzo+muhr); **Energoauditor** (kompaniya, manzil, veb, bosh auditor F.I.Sh., auditor attestat raqami, vakolatli organ qarori sanasi/raqami, imzo+muhr); **Buyurtmachi/dastur** (tashkilot, loyiha nomi, kontakt) | *YANGI*: `auditorOrganization`, `auditorProfile` (user'ga bog'liq), `beneficiary` (bino'ga bog'liq) | J (3 ta) | AVTO + qo'lda imzo |
| T.4 | Mundarija | Bob/bo'lim sarlavhalari + sahifa raqamlari (3 daraja) | layout | — | AVTO (ikki bosqichli render, §6.4) |
| T.5 | Jadvallar va rasmlar ro'yxati | Namunada bor (41 jadval) | layout | — | AVTO |
| T.6 | Qisqartmalar va atamalar | EE, ZEB, NZEB, IN (issiqlik nasosi), FES, ISI, BEMS, NPV, IRR, U, R₀, SCOP, CAPEX; "nazariy/haqiqiy/kalibrlangan tejash" ta'rifi | statik glossariy (uz/ru/en) | J | SH |

### 1.2 Bob 1 — Kirish

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 1.1 | Auditning maqsadi va asosi | Dastur (CEBU, WB + IMV), qaror asoslari (VM 277 — hisobot loyiha hujjatlari uchun **huquqiy asos**), audit turi (batafsil, EN 16247-2 darajasi), qamrov (bino, tizimlar) | *YANGI*: `project` yozuvi (dastur, shartnoma raqami/sanasi) | M | SH + AUD |
| 1.2 | Auditning o'tkazilish tartibi | Bosqichlar: ma'lumot yig'ish → dala tekshiruvi (sana) → modellash → chora-tadbirlar → moliya → hisobot; jamoa tarkibi | *YANGI*: `fieldVisit` sanalari | M | AI (shablon bo'yicha) + AUD |
| 1.3 | Foydalanilgan hujjatlar | Chizmalar, smeta, kadastr, hisob-fakturalar, texnik ko'rik xulosasi (masalan `TA_YC_KG_03`) — ro'yxat, sana, manba | *YANGI*: `sourceDocument` (fayl + tur + sana) | J | AVTO |

### 1.3 Bob 2 — Qisqacha xulosa (Executive summary) — **bank eng avval shuni o'qiydi**

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 2.1 | Asosiy ko'rsatkichlar | Maydon, hajm; solishtirma sarf oldin/keyin (FESsiz va FES bilan); **EE toifa oldin → keyin**; **ZEB darajasi**; jami tejash (kWh/y, USD/y); CO₂ kamayishi; CAPEX (EE / non-EE / jami **alohida**); qoplanish (nazariy va haqiqiy); NPV/IRR | `AuditSummary.*`, `specificConsumptionSummary`; *YANGI*: `energyClassBefore/After`, `zebLevel`, EE-only payback | KV (8–12 karta) | AVTO |
| 2.2 | Qisqa xulosa jadvali (namunaning Table 1) | № · chora-tadbir · investitsiya · qoplanish nazariy (oddiy/diskontlangan) · qoplanish haqiqiy · CO₂ · tavsiya (Ha/Yo'q) — EE/QTE va himoya chora-tadbirlari **ikki guruhda** | `measures[]`, `nonEeMeasures[]` | J | AVTO |
| 2.3 | Xulosa matni | 5–8 jumla: bino holati, asosiy yo'qotish manbalari (%), tavsiya etilgan paket, iqtisodiy natija, normativ muvofiqlik (VM 277: X/20 bajarildi), asosiy xavf | yuqoridagi raqamlar | M | **AI** (raqamlar tokenlangan) → AUD tasdiqlaydi |
| 2.4 | Tushuntirish izohi | Nazariy / haqiqiy / kalibrlangan tejash ta'riflari (namunadagi "Explanatory note") va CEBU bazaviy chiziq qoidasi | statik | M | SH |

### 1.4 Bob 3 — Obyekt tavsifi

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 3.1 | Umumiy ma'lumot | Qurilgan yil, qavatlar, bloklar, vazifasi, sig'imi (bola/xodim), ish rejimi (kun/soat), rekonstruksiya tarixi; joylashuv xaritasi | `building.*`, `latitude/longitude`, Yandex xaritasi | KV + R | AUD (+AI tahrir) |
| 3.2 | Hisobiy parametrlar (namunaning Table 2) | Isitiladigan maydon/hajm, sovutiladigan maydon, isitish mavsumi (kun), ichki harorat (ish/ish emas), tashqi o'rtacha va hisobiy harorat, ish/ishsiz soatlar, entalpiyalar | `building.heatingSeasonDurationDays`, `indoorTemp*`, `outdoor*`, `coolingEnthalpy*`, `occupantCount` | J | AVTO |
| 3.3 | Iqlim ma'lumotlari | Oylik tashqi harorat, quyosh radiatsiyasi, GSOP (graduso-sutka), manba (ShNQ klimatologiya / PVGIS) | `climate*` jadvallari | J + G (oylik chiziq) | AVTO |
| 3.4 | Bino rejasi va fasadlar sxemasi | Fasadlar (P1–P4) kaliti, bloklar belgisi (**A/Б/В ↔ A/B/Б nomlash xaritasi**) | *YANGI*: biriktirma (R) | R | AUD |

### 1.5 Bob 4 — Metodologiya va me'yoriy asos

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 4.1 | Hisoblash usuli | EN ISO 13790 oylik usul (dvigatel asosi), EN ISO 52016-1, energiya balansi tuzilmasi (foydali ehtiyoj → taqsimot → generatsiya → yakuniy), standartlashtirilgan vs haqiqiy shart | statik + `docs/data-dictionary.md` | M + sxema R | SH |
| 4.2 | Bazaviy chiziq va kalibrlash | CEBU qoidasi (nazariy bazaviy chiziq), hisob-faktura o'rtachasi (3 yil), kalibrlash koeffitsienti har bir tashuvchi bo'yicha, **koeffitsient qiymatlari** | *YANGI*: dvigateldagi tashuvchi kalibrlash nisbatlarini `AuditResult`ga chiqarish | J + M | SH + AVTO |
| 4.3 | Konstantalar va konversiyalar | Gaz 9,5 kWh/m³; 1 Gkal = 1 163 kWh; ko'mir 5,5 Gkal/t; emissiya koeffitsientlari (manba bilan) | `energyTariff.emissionFactorKgCo2PerKwh`, ma'lumotnoma | J | AVTO |
| 4.4 | Me'yoriy hujjatlar | VM 277 (03.06.2026), VM 243 (tariflar), VM 690 (EE toifa), PQ-106, 161-son qaror, ShNQ 2.01.04 "Qurilish issiqlik texnikasi", IQN 03-19, ShNQ 2.08.02-09, ShNQ 2.04.16-23, EN 16247-2, EN ISO 13790/52016-1, EN 15232 / EN ISO 52120-1, EN 13187 (termografiya), EN 12464-1 (yoritish) — **auditor yakuniy ro'yxatni tasdiqlaydi**; Moldova ro'yxati (namunadagi SM EN/NCM) **ishlatilmaydi** | statik ro'yxat + loyiha bo'yicha tanlov | J | SH |
| 4.5 | Cheklovlar va taxminlar | Ma'lumot yo'q joylarda qabul qilingan qiymatlar (⚠ taxminiy) ro'yxati — **yashirilmaydi** | *YANGI*: har bir kiritma uchun `isAssumption` + `source` belgisi | J | AVTO + AUD |

### 1.6 Bob 5 — Dala tekshiruvi va o'lchovlar

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 5.1 | Tashrif(lar) | Sana, vaqt, ishtirokchilar, ob-havo (harorat, bulutlilik, shamol, namlik — termografiya uchun **majburiy**) | *YANGI*: `fieldVisit` | J | AUD |
| 5.2 | O'lchov asboblari | Asbob, model, seriya №, kalibrlash sanasi (teplovizor, luksmetr, anemometr, termo-gigrometr, lazer masofa o'lchagich, tok qisqichi) | *YANGI*: `instrument` | J | AUD |
| 5.3 | O'lchov natijalari (umumlashma) | Masalan: "tabiiy ventilyatsiya kanallarining ~80 % ishlamaydi", "sinflarda o'rtacha yoritilganlik 180 lk (me'yor 400)" | *YANGI*: `measurement` (joy, parametr, qiymat, me'yor) | J + M | AUD (AI umumlashtiradi) |
| 5.4 | Termografik tekshiruv | Termogrammalar (IR + ko'rinadigan juftlik), aniqlangan nuqsonlar (ko'prik, infiltratsiya, namlik), ΔT sharti | biriktirmalar (§4) | R + J | AUD |
| 5.5 | Vizual holat va nuqsonlar | Konstruksiya/tizim bo'yicha nuqson dalolatnomasi qisqachasi (texnik ko'rik xulosasiga havola) | biriktirma + matn | R + M | AUD |

### 1.7 Bob 6 — Bino qobig'i (mavjud holat)

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 6.1 | Qobiq yuzalari | Devor/sokl/tom/pol/deraza/eshik maydoni, A/V nisbati | `envelopeAreas` | J | AVTO |
| 6.2 | Devorlar, tom, pol (har tur) | Tavsif + ≥1 foto har tur; qatlamlar (δ, λ, R), R_si/R_se, **U va R₀**; me'yor bilan solishtirish (ShNQ 2.01.04 / VM 277) | `constructionType` + `constructionLayer` + `description` | J (qatlamlar) + R | AVTO + AUD (tavsif) |
| 6.3 | Derazalar va eshiklar | Tur kodi (Win1…, D1…), rom, oyna paketi, U, g, rom ulushi, soyalash, soni/maydoni, holati | `openingType` (`uValueWm2k`, `gValue`, `frameFactor`, `shadingFactor`) | J + R | AVTO + AUD |
| 6.4 | Qobiq orqali issiqlik yo'qotishlari | Element bo'yicha yillik yo'qotish (kWh/y, %) | `envelopeHeatLoss` (before) | J + G (ustunli, element bo'yicha) | AVTO + AI (1–2 jumla talqin) |
| 6.5 | Sovutish davridagi quyosh kirimi | Oynalar orqali (agar sovutish bo'lsa) | `cooling[]` (before) | J | AVTO |

### 1.8 Bob 7 — Muhandislik tizimlari (mavjud holat)

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 7.1 | Isitish: generatsiya | Manba turi, quvvat, yil, FIK (nominal/amaldagi), yoqilg'i, holati, foto | `generationSource`, `generation[]` | J + R | AVTO + AUD |
| 7.2 | Isitish: taqsimot va emissiya | Quvurlar (izolyatsiya %), nasoslar, radiatorlar, rostlash; taqsimot yo'qotishi | `distributionLoss[]` | J | AVTO + AUD |
| 7.3 | Issiq suv (ISI) | Tayyorlash usuli, sarf (l/kishi·kun), energiya ehtiyoji, taqsimot yo'qotishi | `dhwDemand[]` | J | AVTO + AUD |
| 7.4 | Ventilyatsiya va konditsionerlash | Tabiiy/mexanik, havo almashinuvi (1/soat, m³/soat), infiltratsiya, rekuperatsiya, sovutish qurilmalari (SEER) | `ventilationLoss[]`, `cooling[]` | J | AVTO + AUD |
| 7.5 | Yoritish | Lampa turlari, quvvat, soni, soat, yoritilganlik (o'lchangan vs me'yor), yillik kWh | `lighting[]` | J | AVTO + AUD |
| 7.6 | Boshqa elektr uskunalar | Guruh bo'yicha quvvat, soat, foydalanish koeffitsienti, kWh/y; issiqlik kirimi | `equipment[]` | J | AVTO |
| 7.7 | Qayta tiklanuvchi manbalar (mavjud bo'lsa) | FES/gelio mavjudligi | `renewableProduction[]` | J | AVTO |
| 7.8 | Hisob va boshqaruv | Hisoblagichlar (qaysi tashuvchi, qaysi joyda, aniqligi), avtomatika darajasi (EN 15232 sinfi) | *YANGI* | J + M | AUD |

### 1.9 Bob 8 — Energiya iste'moli tahlili va kalibrlash

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 8.1 | Hisob-faktura ma'lumotlari (har tashuvchi) | Oylik 3 yil + o'rtacha; asl birlikda va kWh'da; xarajat (so'm va USD); hisob usuli (hisoblagich/me'yor bo'yicha), hisoblagich fotosi | `utilityBill` (`consumptionNative`, `consumptionKwh`, `expenseLocal`) | G (guruhli ustun, 3 yil) + J (namunaning Table 20–22 — **ilovada**) | AVTO + AI (g'ayrioddiy tebranishlarni belgilash) + AUD (sabab: ta'til, ta'mir) |
| 8.2 | Iqlim bo'yicha normallashtirish | Isitish iste'moli / GSOP (agar bajarilsa) | *YANGI* | J | AVTO |
| 8.3 | Generatsiya/taqsimot samaradorligi (oldin) | Namunaning Table 23: foydali ehtiyoj, qoplash %, taqsimot yo'qotishi, FIK, yakuniy, solishtirma | `generation[]` (before) | J | AVTO |
| 8.4 | Energiya balansi (oldin) | Issiqlik: devor/tom/pol/derazalar/ventilyatsiya/ISI (kWh, %); Elektr: yoritish/uskunalar/sovutish (kWh, %); **qobiq-yo'qotish va yakuniy energiya bo'limlari aralashtirilmaydi** | `energyBalanceBreakdown[]` (`section`) | G (donut) + J (ilovada) | AVTO + AI talqin |
| 8.5 | Solishtirma iste'mol va kalibrlash | Haqiqiy (hisob) / nazariy-oldin / nazariy-keyin, kWh/m²·y, issitish/ISI/elektr; kalibrlash koeffitsienti; farq sabablari | `specificConsumptionSummary[]` + kalibrlash nisbati (*YANGI* chiqish) | J | AVTO + AUD (farqni tushuntirish) |

### 1.10 Bob 9 — Energiya tejash chora-tadbirlari

Har bir chora-tadbir uchun **bir xil "karta"** (namuna: "Proper description of applied measure…"):

| Karta maydoni | Manba | Matn |
|---|---|---|
| Nomi, kodi, toifasi (qobiq / tizim / QTE / boshqaruv) | `measures[].name`, `category` | AVTO |
| Texnik yechim (material, qalinlik, λ, uskuna modeli, quvvat, SCOP/COP) | measure kiritmalari + smeta havolasi | AUD (+AI tahrir) |
| Oldingi va keyingi holat (U oldin→keyin, FIK oldin→keyin) | `constructionType` before/after, `generation` | AVTO |
| Narx tarkibi (nima kiradi: demontaj, material, ish, QQS?), birlik narxi (USD/m², USD/kWt), smeta manbasi (pozitsiya №) | `investmentCostUsd` + *YANGI* `costBreakdown`, `costSource` | J + AUD |
| Xizmat muddati (yil) | `lifetimeYears` | AVTO |
| Tejash: kWh/y (tashuvchi bo'yicha), USD/y — **nazariy va haqiqiy yonma-yon** | `standardized`, `actual` | J |
| Qoplanish (oddiy/diskontlangan), NPV, IRR — ikkala stsenariy | `FinancialIndicators` | J |
| CO₂ kamayishi | `co2ReductionTonnesPerYear` | AVTO |
| Me'yoriy asos (VM 277 bandi, majburiymi yoki ixtiyoriy) | *YANGI* `regulatoryRef` | AVTO + AUD |
| Tavsiya (Ha/Yo'q) va sababi (masalan: iqtisodiy samarasiz, lekin normativ-majburiy; havo sifati uchun) | `proposedForImplementation` + *YANGI* `rationale` | AUD |

Bo'limlar: 9.1 Qobiq (devor, tom, pol, deraza/eshik, soyalash) · 9.2 Tizimlar (isitish, ISI, ventilyatsiya/AC, yoritish, uskunalar) · 9.3 QTE (FES, gelio) · 9.4 Boshqaruv (BEMS, VFD) · 9.5 Himoya (non-EE) chora-tadbirlari (soyabon, yomg'ir suvi, perimetr trotuari, demontaj chiqindisi) · 9.6 **Chora-tadbirlar paketi va o'zaro ta'sir** (ketma-ket hisob, qo'sh hisob yo'qligi — `Checks!A10`) · 9.7 Rad etilgan chora-tadbirlar va sababi · 9.8 **Keyingi holat balansi** (namunaning Table 40–41: generatsiya samaradorligi va energiya balansi "keyin").

### 1.11 Bob 10–15

| # | Bo'lim | Majburiy mazmun | Manba | Ko'rinish | Matn |
|---|---|---|---|---|---|
| 10 | Issiqxona gazlari emissiyasi | Tashuvchi bo'yicha koeffitsientlar (manba/me'yor bilan), oldin/keyin tCO₂/y, chora-tadbir bo'yicha kamayish | `energyTariff.emissionFactorKgCo2PerKwh`, `measures[].co2*` | J + G (ustun) | AVTO + SH |
| 11.1 | Moliyaviy taxminlar | Tahlil gorizonti, real diskont, inflyatsiya, nominal stavka, tarif (VM 243, sana), tarif o'sishi (gaz/elektr), **valyuta kursi (UZS/USD, manba, sana)**, FES eksport tarifi, soliq (agar bo'lsa), texnik xizmat xarajati | `financial.service.ts` konstantalari → *YANGI* loyiha bo'yicha `financialParameters` jadvali (Excel `Financial parameters` varag'i kabi) | J | AVTO |
| 11.2 | Chora-tadbirlar bo'yicha moliyaviy tahlil | Har biri uchun namunaning Table 39 (yillik pul oqimi: investitsiya, xizmat, yalpi/sof tejash, diskontlangan, jamlangan — nazariy va haqiqiy) | `measures[].standardized/actual` + cashflow | J (landshaft) | AVTO |
| 11.3 | Paket bo'yicha moliya | **EE-only** va **EE + non-EE** alohida: CAPEX, yillik tejash, qoplanish, NPV, IRR; sezgirlik (tarif ±20 %, CAPEX ±20 %, diskont 4/6/8 %) | *YANGI* agregat + sezgirlik | J + G (tornado yoki kumulyativ DCF chizig'i) | AVTO + AI talqin |
| 12 | VM 277 muvofiqligi | 6-ilova va 4-ilova talablari jadvali: talab · chegara · loyiha qiymati · holat (✅/❌/—) · izoh (masalan: C9 derazalar ta'mirlanadi — buyurtmachi qarori 27.09) | *YANGI* `complianceChecks[]` (Excel `Checks` B bo'limi C1–C20 analogi) | J | AVTO + AUD (❌ uchun asoslash majburiy) |
| 13 | EE toifasi va ZEB darajasi | Oldin/keyin toifa (VM 690 shkalasi, manba), solishtirma sarf shkalasi grafigi; ZEB/NZEB/ZEB Ready (QTEM ulushi %); "C"dan past emas sharti | *YANGI* `energyClass`, `zebLevel`, `renewableShare` | G (EE shkala "strelka" diagrammasi) + KV | AVTO |
| 14 | Xavflar va noaniqliklar | Ma'lumot sifati (hisoblagich yo'q, hisob me'yor bo'yicha), ⚠ taxminiy qiymatlar ro'yxati, texnik xavflar (masalan shamollatiladigan fasad metall karkasining issiqlik ko'prigi 5–15 %), bajarish xavflari, foydalanuvchi xulqi (rebound), tarif xavfi | 4.5 bo'limdagi taxminlar + *YANGI* `riskRegister` | J (xavf · ehtimol · ta'sir · yumshatish) | AUD (+AI qoralama) |
| 15 | Xulosalar va tavsiyalar | Tavsiya etilgan paket, bajarish tartibi (bosqichlar), M&V tavsiyasi (hisoblagichlar, BEMS), ochiq savollar/cheklovlar | yuqoridagilar | M | AI qoralama → AUD |
| — | Imzolar | Bosh auditor va tashkilot rahbari: F.I.Sh., lavozim, attestat №, sana, imzo, muhr | *YANGI* | J | AVTO + qo'lda/elektron imzo |

### 1.12 Ilovalar

| Ilova | Mazmun | Manba | Holat maqsadi |
|---|---|---|---|
| A | Jamlanma natijalar jadvali (namunaning Annex 1/Table 3): № · chora-tadbir · investitsiya · nazariy tejash kWh/USD · nazariy qoplanish · haqiqiy tejash · haqiqiy qoplanish · xizmat muddati · NPV¹/IRR¹ · NPV²/IRR² · CO₂ · tavsiya | `measures[]`, `nonEeMeasures[]` | Bitta landshaft jadval |
| B | Hisob-kitob jadvallari (namunaning Table 4–41, "oldin" va "keyin" juftlikda): qobiq o'lchamlari (fasad bo'yicha), maydon/hajm, qobiq yo'qotishlari, U-qatlamlar, derazalar, quyosh kirimi, taqsimot, ISI, tabiiy/mexanik ventilyatsiya, yoritish, uskunalar, uskunalar issiqlik kirimi, bazaviy iste'mol, generatsiya samaradorligi, balans | `AuditResult` barcha massivlari | Kichik shrift, landshaft ruxsat |
| C | Fotosuratlar jurnali | biriktirmalar | Raqamlangan, joyi bilan |
| D | Termografiya hisoboti | biriktirmalar + parametrlar | §4.3 |
| E | O'lchov bayonnomalari | `measurement` + asbob | Jadval |
| F | Bino rejalari va fasadlar | chizmalar (masalan `TA_YC_KG_03_EN.pdf` varaqlari) | PDF sahifalarini vektor ko'rinishda qo'shish |
| G | Me'yoriy hujjatlar ro'yxati | statik | — |
| H | Smeta ko'chirmasi (chora-tadbir ↔ smeta pozitsiyasi xaritasi) | *YANGI* `costSource` | Jadval |
| I | Hisob-fakturalar nusxalari (ixtiyoriy) | biriktirmalar | — |
| J | Auditor attestati nusxasi (agar ToR talab qilsa) | biriktirma | — |

### 1.13 AI matn yozish qoidasi (qisqa)

1. AI faqat **tokenlangan raqamlar** bilan yozadi: `{{summary.totalAnnualSavingsUsd}}` — render paytida haqiqiy formatlangan qiymat qo'yiladi; AI o'zi raqam "yozmaydi". Validator: matndagi har bir raqam token yoki matn ichidagi aniq iqtibos bo'lishi shart, aks holda bloklanadi.
2. AI matni bloki **holat** bilan saqlanadi: `ai_draft` → `auditor_approved`. `YAKUNIY` versiyada `ai_draft` blok qolsa — chiqarish taqiqlanadi (§5, QC-M7).
3. AI **yozmaydi**: dala kuzatuvi, o'lchov natijalari, nuqsonlar, huquqiy xulosa ("muvofiq"), imzo bloklari, rad etish sababining kasbiy asosi.
4. Terminologiya — tasdiqlangan glossariy (uz/ru/en) orqali; AI tarjima qilgan texnik atamalar auditor ko'rigisiz yakuniy hujjatga kirmaydi (`i18n-and-appearance.md` qoidasi).

---

## 2. Joriy YRES PDF hisoboti vs maqsadli tuzilma (gap-tahlil)

Tekshirilgan kod: `generateAuditReportPdf()` (`report.service.ts:876–1435`), `routes/audit.ts:130–190`,
`routes/verify.ts`. Holat: ✅ bor · ⚠️ qisman · ❌ yo'q.

### 2.1 Bo'limlar bo'yicha

| Maqsadli bo'lim | Holat | Joriy holat (kod bo'yicha) | Kerakli ish |
|---|---|---|---|
| T.1 Titul | ⚠️ | Sarlavha, sana, QR + "platformada yaratilgan" matni bor (`:886–911`) | Hisobot raqami, versiya, QORALAMA/YAKUNIY holati, dastur, buyurtmachi, auditor tashkiloti, kadastr № |
| T.2 Disclaimer | ❌ | — | Statik matn (3 til) |
| T.3 Tomonlar + imzo/muhr jadvallari | ❌ | Sxemada auditor tashkiloti / benefitsiar maydonlari yo'q (`buildings.ts`, `auth.ts`) | Yangi sxema + UI |
| T.4–T.5 Mundarija, jadval/rasm ro'yxati | ❌ | Sahifa raqami ham yo'q | Ikki bosqichli render (§6.4) |
| T.6 Qisqartmalar | ❌ | — | Glossariy |
| 1 Kirish | ❌ | — | Shablon + `project` ma'lumoti |
| 2.1 KPI | ✅/⚠️ | `AuditSummary` 8 ta qiymat (`:1003–1034`) | EE toifa, ZEB, EE-only qoplanish, FES bilan/siz solishtirma sarf yo'q; jami qoplanish non-EE CAPEX'ni ham o'z ichiga oladi (TARIX: "EE-only qoplanishni alohida ko'rsatish") |
| 2.2 Qisqa xulosa jadvali | ✅ | Nazariy/haqiqiy qoplanish, CO₂, tavsiya (`:976–1001`) | Guruhlash (EE / himoya), diskontlangan qoplanish ustuni; hozir **tavsiya qilinmaganlar ham** aralash chiqadi |
| 2.3 Xulosa matni | ❌ | — | AI qoralama + tasdiq |
| 2.4 Tushuntirish izohi | ⚠️ | `specificConsumptionSummaryNote` bor, lekin 3 stsenariy ta'rifi yo'q | Statik matn |
| 3.1–3.2 Bino + hisobiy parametrlar | ✅ | Bino KV, koordinata + Yandex xarita, iqlim/harorat/entalpiya parametrlari (`:913–970`) | — |
| 3.3 Iqlim oylik jadvali | ❌ | — | Jadval/grafik |
| 3.4 Reja/fasad sxemasi | ❌ | Biriktirma tizimi yo'q | §4 |
| 4 Metodologiya, me'yorlar, taxminlar | ❌ | Faqat moliyaviy taxminlar paragrafi | Shablon + taxminlar registri |
| 5 Dala tekshiruvi, asboblar, termografiya | ❌ | Sxemada yo'q | Yangi sxema + biriktirmalar |
| 6.1 Qobiq yuzalari | ✅ | `:1036–1050` | — |
| 6.2 U-qiymat (qatlamlar) | ✅ | Qatlamlar jadvali + auditor `description` kursivda (`:1052–1087`) | Me'yor (R₀ talab) bilan solishtirish ustuni, foto |
| 6.3 Derazalar/eshiklar | ❌ | `openingType` hisobotga chiqmaydi | Jadval |
| 6.4 Qobiq yo'qotishlari | ⚠️ | Donut (`:1185–1203`) + Annex'da oylik jadval | Element bo'yicha yillik jadval (namunaning Table 6/25) |
| 6.5 Quyosh kirimi (sovutish) | ❌ | `cooling[]` chiqmaydi | Jadval |
| 7.1–7.2 Generatsiya/taqsimot | ⚠️ | Agregat samaradorlik jadvali (`:1114–1138`) | Uskuna tavsifi (model, yil, holat), taqsimot yo'qotishi alohida |
| 7.3 ISI | ❌ | `dhwDemand[]` hisoblanadi, hisobotda yo'q | Jadval |
| 7.4 Ventilyatsiya | ⚠️ | Faqat Annex'da oylik yo'qotish (`:1392–1407`) | Tizim tavsifi, havo almashinuvi, rekuperatsiya |
| 7.5 Yoritish | ❌ | `lighting[]` chiqmaydi | Jadval |
| 7.6 Uskunalar | ❌ | `equipment[]` chiqmaydi | Jadval |
| 7.7 QTE | ❌ | `renewableProduction[]` alohida chiqmaydi (faqat balans donut'ida `renewable_offset`) | FES oylik ishlab chiqarish jadvali/grafigi |
| 8.1 Hisob-fakturalar | ✅/⚠️ | Tashuvchi bo'yicha 3 yillik guruhli ustun + auditor izohi (`:1089–1111`) | Jadval (ilovada), xarajat (so'm), hisob usuli |
| 8.3 Generatsiya samaradorligi | ✅ | oldin/keyin | — |
| 8.4 Energiya balansi | ✅ | 4 ta donut (oldin/keyin × yo'qotish/yakuniy) + issitish balansi + end-use jadvali | Elektr balansi (yoritish/uskuna/sovutish %) alohida emas |
| 8.5 Solishtirma iste'mol + kalibrlash | ⚠️ | 3 ustunli jadval bor (`:1164–1183`) | Kalibrlash koeffitsientlari ko'rsatilmaydi |
| 9 Chora-tadbir kartalari | ⚠️ | Ikki jadval: nazariy va haqiqiy (tejash, qoplanish, NPV, IRR) (`:1220–1268`) | Texnik tavsif, narx tarkibi, U oldin→keyin, smeta havolasi, me'yoriy asos, rad etish sababi — **yo'q** |
| 9.5 Himoya (non-EE) | ✅ | `:1348–1360` | Tavsif |
| 9.8 Keyingi holat balansi | ⚠️ | donut + jadvallarda "after" bor | Namunaning Table 40–41 shakli |
| 10 GHG | ⚠️ | Jami + chora-tadbir bo'yicha (`:1270–1294`) | Koeffitsient manbasi (me'yor), oldin/keyin jami emissiya |
| 11.1 Moliyaviy taxminlar | ⚠️ | Diskont + eskalatsiya + tariflar jadvali (`:1296–1316`) | Inflyatsiya/nominal stavka, kurs, gorizont, FES eksport, texnik xizmat; **qiymatlar kodda qattiq** (`financial.service.ts: DEFAULT_DISCOUNT_RATE = 0.04`) — Excel v7.16+ `Financial parameters` (real 4 % + inflyatsiya 2 %, nominal 6,08 %; o'sish gaz 2,8 % / elektr 2 %) bilan **muvofiqligini tekshirish kerak** |
| 11.2 Pul oqimi | ✅ | Faqat tavsiya etilganlar uchun, 7 ustun (`:1318–1346`) | Investitsiya/xizmat/yalpi tejash satrlari (namunaning Table 39 shakli) |
| 11.3 Paket moliyasi, sezgirlik | ❌ | — | Yangi agregat |
| 12 VM 277 muvofiqligi | ❌ | Dvigatelda yo'q | `complianceChecks` (Excel `Checks` C1–C20 analogi) |
| 13 EE toifa / ZEB | ❌ | `AuditResult`da yo'q | Hisoblash + grafik |
| 14 Xavflar | ❌ | — | Registr |
| 15 Xulosalar | ❌ | — | AI qoralama + tasdiq |
| Imzolar | ❌ | — | §3.4 |
| Ilova A jamlanma | ⚠️ | 2.2 va 9 jadvallariga bo'lingan | Bitta to'liq landshaft jadval |
| Ilova B hisob-kitoblar | ⚠️ | Faqat 3 guruh: qobiq, ventilyatsiya, issitish balansi oylik (`:1362–1433`) | Qolgan ~30 jadval (namunaning Table 4–41) |
| Ilova C–J | ❌ | Biriktirma infratuzilmasi yo'q | §4 |

**Qamrov bahosi:** namunaviy tuzilmaning taxminan **35–40 %** i avtomatik chiqadi (asosan hisoblash
natijalari); tavsifiy, dala, normativ va tasdiq qismlari (bank va ekspertiza aynan shularni tekshiradi)
deyarli yo'q.

### 2.2 Sifat muammolari (kod bo'yicha aniqlangan)

| # | Muammo | Dalil | Oqibat | Taklif |
|---|---|---|---|---|
| Q1 | **Hisobot muzlatilmagan.** Har so'rovda `runFullAudit()` joriy kiritmalardan qayta hisoblanadi, R2'ga `reports/{buildingId}/latest.pdf` ustidan yoziladi | `routes/audit.ts:136–185` | Bir xil QR/verify URL (auditRun id) turli raqamli PDF'larga mos kelishi mumkin; bankka topshirilgan nusxani qayta tiklab bo'lmaydi | §5.2 snapshot |
| Q2 | **Verify sahifasi faqat "run mavjud va completed" ekanini tasdiqlaydi** — PDF mazmunini emas (hash yo'q, versiya yo'q) | `routes/verify.ts:21–45` | Soxtalashtirilgan raqamli PDF ham "haqiqiy" ko'rinadi | SHA-256 + versiya + (ixtiyoriy) fayl yuklab solishtirish |
| Q3 | "Imzolangan PDF" — **raqamli imzo yo'q** (PAdES/E-IMZO), faqat QR | `report.service.ts` da `sign` yo'q | Rasmiy topshiriqda imzo+muhr qo'lda qo'yiladi | §3.4 |
| Q4 | Sahifa raqami, kolontitul, mundarija, jadval/rasm raqamlari va sarlavhalari yo'q | `grep` natijasi | Matnda "Jadval 3.2 ga qarang" deb havola qilib bo'lmaydi | §6 |
| Q5 | Kasr xonalari ustun ichida beqaror: `fmt()` `minimumFractionDigits: 0` → "3,6" va "4" bir ustunda | `report.service.ts:816–822` | Professional ko'rinmaydi, ustun tekislanmaydi | Ustun bo'yicha qat'iy aniqlik (§5.1) |
| Q6 | Valyuta faqat USD (`$` prefiks); so'm va kurs ko'rsatilmaydi | `fmtUsd()` | Mahalliy ekspertiza va byudjet so'mda ishlaydi | Ikki valyuta rejimi + kurs manbasi |
| Q7 | Jami qoplanish non-EE CAPEX'ni ham o'z ichiga oladi, EE-only alohida emas | `AuditSummary.totalInvestmentUsd` izohi | Bank noto'g'ri qoplanishni ko'radi (masalan 3-DMTT: 41,0 y) | Ikkalasini ko'rsatish |
| Q8 | Taxminiy (⚠) qiymatlar hisobotda belgilanmaydi | kiritmalarda `isAssumption` yo'q | Shaffoflik talabi buziladi (masalan BEMS 37 783 USD ⚠, MTB narxi ⚠) | 4.5 taxminlar registri |
| Q9 | Auditor izohlari `buildingId`ga bog'langan, versiyaga emas | `report-annotations` / `routes/audit.ts:217` | Yakuniy hisobotdan keyin izoh o'zgarsa, eski versiyani qayta hosil qilib bo'lmaydi | Snapshot'ga kiritish |
| Q10 | `hisobot.md` holat ustuni eskirgan (masalan "cashflow `AuditResult`da yo'q" — aslida `standardizedCashflow/actualCashflow` bor, `packages/types/src/measures.ts:50–53`; U-value, iste'mol grafigi ✅ bo'lgan) | fayllarni solishtirish | Keyingi sessiyalar noto'g'ri ish rejalashtiradi | `hisobot.md`ni yangilash (alohida commit) |
| Q11 | Namunaviy shablon Moldovaniki: valyuta `MDL`, me'yorlar ro'yxati SM EN/NCM, "Auditor No issued by the EEA" | `пример отчёта Мд.docx` | To'g'ridan-to'g'ri ko'chirilsa — xato | O'zbekiston analoglari bilan almashtirish (4.4) |
| Q12 | Report testlari juda kam: `report.service.test.ts` — 3 ta `it()` | `tests/services` | Bo'lim yo'qolishi/tartib buzilishi sezilmaydi | Tuzilma "snapshot" testi (bo'lim sarlavhalari ketma-ketligi, jadval soni) |

---

## 3. Formatlar

### 3.1 Tavsiya etilgan arxitektura: bitta hisobot modeli → uchta renderer

```
AuditResult + ReportExtras + attachments + approved texts
            │
            ▼
   buildReportDocument()  →  ReportDocument (JSON AST: section → block[])
            │                 block = heading | paragraph | note | table | figure | kv | pageBreak | signature
            ├──► PDF renderer   (pdf-lib, mavjud ReportLayout)
            ├──► DOCX renderer  (Word uslublari: Heading 1–3, Caption, Table Grid)
            └──► XLSX renderer  (Ilova A–B jadvallari, har jadval — alohida varaq)
```

Hozir `generateAuditReportPdf()` ma'lumotni to'g'ridan-to'g'ri `layout.*` chaqiruvlariga aylantiradi —
DOCX qo'shilsa **ikkinchi nusxa** mantiq paydo bo'ladi va ular ajralib ketadi. Oraliq AST bir marta
yoziladi, bo'lim tartibi/raqamlash/tarjima bir joyda bo'ladi; snapshot (§5.2) aynan shu AST'ni saqlaydi.

### 3.2 PDF (mavjud) — "rasmiy nusxa"

- Faqat **YAKUNIY** holatda bank/ekspertizaga yuboriladi; QORALAMA'da har sahifada "QORALAMA / DRAFT" suv belgisi.
- PDF/A-2b ga yaqinlashtirish: shriftlar embed (PT Serif allaqachon embed), metadata (Title, Author, Subject, Keywords, CreationDate), XMP — pdf-lib `setTitle/setAuthor/...` bilan.
- Raqamli imzo: pdf-lib o'zi PAdES imzolay olmaydi. Variantlar: (a) **E-IMZO** (O'zbekiston milliy ERI) — mijoz tomonda imzolash, alohida `.p7s` yoki PAdES; (b) skanerlangan imzo+muhr bilan qog'oz nusxa; (c) platforma imzosi (server kaliti bilan SHA-256 + verify sahifasi). **Minimal production:** (c) + (b); (a) — ToR/buyurtmachi talab qilsa.

### 3.3 DOCX — tahrirlanadigan nusxa (**majburiy deb hisoblash tavsiya etiladi**)

Sabablar: namunaviy shablon Word; auditorlar yakuniy tavsif matnini Word'da tuzatadi; buyurtmachi izohlari
"Track changes" orqali keladi; CEBU topshiriqlarida odatda Word + PDF talab qilinadi.

- **Shablon asosida** generatsiya: loyiha uslublari (Heading 1–3, Caption, Normal, Table) oldindan belgilangan `.dotx`/`.docx` shablon; Word'da `Mundarija` va `Jadvallar ro'yxati` maydonlari (TOC field) — ochilganda "Update field" bilan yangilanadi.
- Kutubxona: sof-JS `docx` (npm) — Workers muhitida ishlashi **tasdiqlanishi kerak** (JSZip ga tayanadi, Node `fs` talab qilmaydi; `qrcode-generator` kabi tekshiruv qilinsin). Muqobil: `docxtemplater` + `pizzip` (shablon bilan to'ldirish).
- Grafiklar: DOCX'ga **PNG** sifatida (Workers'da canvas yo'q → grafikni SVG sifatida yasab, `resvg-wasm` bilan PNG ga o'tkazish yoki DOCX'ga nativ Word chart XML — murakkab). Minimal: PNG (300 dpi ekvivalent).
- **Muhim cheklov:** DOCX tahrir qilingandan keyin undagi raqamlar YRES bilan sinxron emas. Qoida: *raqamlarni Word'da o'zgartirish taqiqlanadi* — raqam xato bo'lsa YRES'da tuzatiladi va qayta eksport qilinadi; Word'da faqat matn. Yakuniy imzolanadigan nusxa — YRES'dan olingan PDF (yoki tahrirlangan DOCX'dan olingan PDF bo'lsa, uning hash'i YRES'ga yuklanib ro'yxatga olinadi).

### 3.4 Excel ilova

- Ilova A (jamlanma) va Ilova B (hisob-kitoblar) — har jadval alohida varaqda, **formulasiz qiymatlar** + birlik satri; ustun nomlari hisobot tilida.
- Maqsad: bank tahlilchisi raqamlarni o'z modeliga ko'chiradi; auditor Excel modeli (`3-DMTT v7.xx`) bilan solishtiradi.
- Kutubxona: SheetJS (`xlsx`) yoki `exceljs` — Workers mosligi tekshirilsin.

### 3.5 Ko'p tillilik (uz/ru/en)

| Masala | Taklif |
|---|---|
| Qaysi til rasmiy? | Namuna — inglizcha, CEBU taqdimoti — ruscha, VM 277 bo'yicha loyiha hujjatlari va ekspertiza — o'zbekcha. **Hisobot tili loyiha darajasida tanlanadi** (`project.reportLanguages`), UI tilidan mustaqil (hozir `?lang=` UI tilidan olinadi) |
| Ikki tilli hisobot | WB loyihalarida ko'p holatda: asosiy matn ru/uz + Executive summary en. Qo'llab-quvvatlash: bo'lim darajasida `lang` override |
| Statik matnlar | `report-i18n.ts` (hozir ~180 kalit × 3 til) — kengaytiriladi; **terminologiya glossariysi** (EE toifa, bazaviy chiziq, kalibrlash, qoplanish, ISI/ГВС/DHW…) loyiha egasi tomonidan tasdiqlanadi |
| Auditor/AI matnlari | Har blok uchun til bo'yicha alohida versiya; tarjima AI qoralama → auditor tasdiqi; tasdiqlanmagan tarjima yakuniy versiyaga kirmaydi |
| Raqam/sana formati | uz/ru: `1 234,5`, sana `27.09.2026`; en: `1,234.5`, `27 Sep 2026`. Birliklar: uz `kVt·soat`, ru `кВт·ч`, en `kWh` (yoki hamma tilda SI `kWh` — tanlov bir marta, izchil) |
| Iqtiboslar | Smeta/chizma iqtiboslari **asl tilida** (ruscha) qoladi, tarjima qilinmaydi |

---

## 4. Rasm va hujjat ilovalari

### 4.1 Ma'lumot modeli (yangi, taklif)

`report_attachment`: `id`, `buildingId`, `sectionKey` (masalan `envelope.wall.W1`, `field.thermography`, `annex.plans`),
`kind` (`photo | thermogram | thermogram_visual_pair | drawing | external_chart | pdf_pages | document`),
`r2Key`, `mime`, `pageRange` (PDF uchun), `caption` (uz/ru/en), `source` (masalan "Chizma A-BLOK, лист 1", "SUIN eksporti, 2026-09-10"),
`author`, `capturedAt`, `location` (xona/fasad), `includeInReport` (bool), `order`, `metadata` (JSON — termogramma parametrlari).
R2: `CHAT_ATTACHMENTS_BUCKET` emas — alohida prefiks yoki bucket (`REPORTS_BUCKET/attachments/...`).

### 4.2 Umumiy joylashtirish qoidalari

1. **Raqamlash:** `Rasm {bob}.{n}` — rasm **ostida**; `Jadval {bob}.{n}` — jadval **ustida**. Ilovalarda `Rasm C.12`.
2. **Sarlavha (caption) majburiy:** nima, qayer (blok/fasad/xona), qachon. Bo'sh sarlavhali rasm YAKUNIY versiyaga kirmaydi (QC).
3. **Manba satri** (kichik, kursiv): "Manba: auditor surati, 12.08.2026" / "Manba: loyiha chizmasi A-BLOK, лист 3" / "Manba: SUIN tizimi eksporti".
4. **Matnda havola:** har rasm/jadvalga matnda kamida bitta havola ("Rasm 6.3 da ko'rinib turibdiki…"); havolasiz ilova — ogohlantirish.
5. **O'lcham:** kenglik = matn kengligi (to'liq) yoki ½ (juft rasm, yonma-yon). Fotolar ≤ 1 600 px uzun tomon, JPEG sifat 80–85; chizmalar PNG (palitra) yoki PDF-vektor. Joriy loyihadagi tajriba: ≤1 300 px, chizmalar 128 rangli PNG (10–120 KB).
6. **Maxfiylik:** odamlar yuzi, bolalar (bog'cha!), avtomobil raqamlari — xiralashtiriladi yoki suratga olinmaydi; bu QC bandi.
7. **Orientatsiya:** EXIF bo'yicha avtomatik to'g'rilash (telefon suratlari).

### 4.3 Teplovizor (termografiya)

- Har termogramma **juft** bo'ladi: IR tasvir + ko'rinadigan foto (bir xil ko'rinish), yonma-yon, bitta raqam ("Rasm D.4 a/b").
- Majburiy metama'lumot (jadval shaklida, termogramma ostida yoki ilova jadvalida): sana/vaqt, kamera (model, seriya, kalibrlash), emissivlik ε, aks etgan harorat, masofa, ichki va tashqi harorat, **ΔT (odatda ≥ 10–15 K talab etiladi, EN 13187 / ISO 6781 amaliyoti)**, shamol, oldingi 12–24 soatda quyosh ta'siri yo'qligi, harorat shkalasi (min/max), belgilangan nuqtalar (Sp1, Sp2…) qiymatlari.
- Termogramma radiometrik faylidan (FLIR `.jpg` radiometrik) avtomatik o'qish — keyingi bosqich; hozircha auditor qo'lda kiritadi.
- Har termogramma uchun xulosa: nuqson turi (issiqlik ko'prigi / infiltratsiya / namlik / izolyatsiya yetishmasligi), taxminiy ta'siri, tegishli chora-tadbir kodi (masalan W1 izolyatsiyasi).

### 4.4 Tashqi tizim eksportlaridagi grafiklar (masalan SUIN Word eksporti) va PDF qismlari

- **Word'dan olingan grafiklar:** DOCX ichidagi rasmlar (`word/media/*`) ajratib olinadi; **EMF/WMF formati pdf-lib'da qo'llab-quvvatlanmaydi** → yuklashda PNG ga o'tkazish (auditor PNG yuklaydi yoki server tomonda konvertatsiya — Workers'da mumkin emas, alohida xizmat kerak). Sarlavhada tizim nomi va eksport sanasi majburiy; raqamlari YRES bilan farq qilsa — izohda sabab.
- **PDF sahifalari (chizmalar, dalolatnomalar, texnik ko'rik):** pdf-lib `embedPdf`/`copyPages` bilan sahifa **vektor ko'rinishida** qo'shiladi (rasterlash shart emas) — ilovada, har sahifa ustiga kolontitul (ilova harfi, sahifa raqami, manba). A2/A3 chizmalar — A4'ga masshtablanadi yoki A3 buklama sahifa sifatida qoldiriladi (PDF'da sahifa o'lchami aralash bo'lishi mumkin); masshtab "M 1:100 emas" deb belgilanadi.
- Skanerlangan hujjatlar: 200–300 dpi, oq-qora/kulrang, OCR ixtiyoriy.
- Hujjatlar ro'yxati jadvali (Ilova F/I boshida): №, nomi, manba, sana, sahifalar soni.

---

## 5. Sifat nazorati, versiyalash, muzlatilgan snapshot

### 5.1 Hisobot chiqarishdan oldingi tekshiruv ro'yxati

**Avtomatik (tizim bloklaydi — YAKUNIY holatga o'tishdan oldin):**

| # | Tekshiruv | Qoida |
|---|---|---|
| QC-A1 | Balans yopilishi | Energiya ulushlari yig'indisi = 100 % (issiqlik, elektr) — Excel `Checks!A3–A4` analogi |
| QC-A2 | Chora-tadbirlar yig'indisi | Σ tejash (chora-tadbirlar) = balans farqi (oldin − keyin) ± 0,5 % — qo'sh hisob yo'q (`A10`, TARIX X93–X95) |
| QC-A3 | Investitsiya yig'indisi | Σ CAPEX (EE + non-EE) = jami; EE-only alohida (`A11`) |
| QC-A4 | Xato/NaN/∞ | Hisobotda `—` o'rnida bo'lmasligi kerak bo'lgan maydonlarda null/NaN yo'q (`A13`) |
| QC-A5 | Belgilar va diapazonlar | Manfiy tejash yoki investitsiya yo'q (`S8–S9`); manfiy **sof pul tejashi** bo'lsa (masalan ventilyatsiya −185 USD/y) — auditor asoslashi majburiy |
| QC-A6 | Sanity diapazonlar | Solishtirma sarf, USD/m², qoplanish, IN quvvati W/m², havo almashinuvi — `Checks S1–S7` diapazonlari; chetga chiqsa — ogohlantirish + auditor izohi |
| QC-A7 | VM 277 jadvali to'liq | Har ❌ uchun asoslash matni mavjud |
| QC-A8 | Standardized/actual juftligi | Har ko'rsatilgan tejash/qoplanish/NPV/IRR ikkala stsenariyda (hisobot.md 2-qoidasi) |
| QC-A9 | Kalibrlash sifati | Tashuvchi bo'yicha actual/nazariy nisbat 0,5–1,5 oralig'idan chiqsa — ogohlantirish (hisob-faktura sifati yoki model xatosi) |
| QC-A10 | Birliklar | Har ustun sarlavhasida birlik; kWh/MWh, USD/so'm aralashmasligi; SI yozuvi (`kWh/m²·y`, `W/m²K`) |
| QC-A11 | Yaxlitlash | Ustun bo'yicha qat'iy aniqlik: energiya kWh — 0 kasr; kWh/m²·y — 1; U — 2–3; USD — 0; qoplanish yil — 1; IRR % — 1; tCO₂ — 1. Jami satr **yaxlitlanmagan qiymatlardan** hisoblanadi (farq ±1 bo'lsa izoh: "yaxlitlash sababli") |
| QC-A12 | Rasm/jadval | Har rasmda sarlavha + manba; har rasm/jadvalga matnda havola; raqamlash uzluksiz |
| QC-A13 | Matn holati | `ai_draft` holatidagi blok qolmagan; har tildagi majburiy bo'lim to'ldirilgan |
| QC-A14 | Taxminlar ochiq | `isAssumption=true` bo'lgan har kiritma 4.5 jadvalida manba/sababi bilan chiqadi |
| QC-A15 | Model versiyasi | Hisobotdagi asosiy raqamlar tashqi Excel modeli (agar mavjud, masalan `3-DMTT v7.20`) bilan solishtiriladi: maydon, jami tejash, CAPEX, qoplanish — farq > 1 % bo'lsa ogohlantirish |

**Qo'lda (auditor/tekshiruvchi imzolaydigan ro'yxat):**

| # | Tekshiruv |
|---|---|
| QC-M1 | Obyekt identifikatsiyasi: nom, manzil, kadastr, bloklar nomlash xaritasi (A/Б/В ↔ A/B/Б) izchil |
| QC-M2 | Sana va versiya: titul, kolontitul, imzo sanasi, snapshot sanasi bir xil; tariflar va kurs sanasi ko'rsatilgan |
| QC-M3 | Tavsif matni raqamlarga zid emas (masalan "derazalar almashtiriladi" — lekin qaror "ta'mirlanadi") — TARIX'dagi v7.19 holati kabi xato |
| QC-M4 | Rad etilgan chora-tadbirlar va buyurtmachi qarorlari (sana bilan) hujjatlashtirilgan |
| QC-M5 | Terminologiya va tarjima tasdiqlangan (ayniqsa ru) |
| QC-M6 | Rasmlarda shaxsiy ma'lumot yo'q (bolalar yuzi va h.k.) |
| QC-M7 | Ikkinchi shaxs tekshiruvi ("to'rt ko'z" prinsipi): tekshiruvchi F.I.Sh. va sana snapshot'ga yoziladi |
| QC-M8 | Imzo va muhr bloklari to'ldirilgan (auditor + benefitsiar tasdiqi, agar talab qilinsa) |

### 5.2 Versiyalash va muzlatilgan snapshot (taklif)

Muammo: `calculation-engine.md` "natija saqlanmaydi, har safar qayta hisoblanadi" qoidasi **ish jarayoni uchun
to'g'ri**, lekin **topshirilgan hisobot** uchun noto'g'ri — bank qo'lidagi PDF'ni har doim aynan qayta
ko'rsata olish kerak. Yechim — ikki rejim:

| Rejim | Qachon | Nima |
|---|---|---|
| **Jonli (draft)** | Tahrirlash davomida | Hozirgidek: qayta hisoblash, "QORALAMA" suv belgisi, verify sahifasi "qoralama — rasmiy emas" deydi |
| **Muzlatilgan (issued)** | "Hisobotni chiqarish" tugmasi (QC-A o'tgach, QC-M tasdiqlangach) | Yangi `report_issue` yozuvi |

`report_issue` (yangi jadval): `id` (verify URL shu id'ga ishora qiladi), `buildingId`, `auditRunId`, `version` (`1.0`, `1.1`, `2.0` —
kichik: matn tuzatish; katta: raqamlar o'zgargan), `status` (`issued | superseded | withdrawn`), `supersedesId`, `language(s)`,
`inputSnapshotR2Key` (barcha kiritmalar JSON), `resultSnapshotR2Key` (`AuditResult` JSON), `documentAstR2Key` (§3.1 AST — tasdiqlangan
matnlar va izohlar bilan), `pdfR2Key`/`docxR2Key`/`xlsxR2Key` (**o'zgarmas kalitlar**: `reports/{buildingId}/{issueId}/v1.0.pdf` — hech qachon
ustidan yozilmaydi), `pdfSha256`, `engineVersion` (git commit), `referenceDataVersion` (tariflar, iqlim), `issuedByUserId`, `reviewedByUserId`,
`issuedAt`, `qcReport` (JSON — qaysi tekshiruv o'tdi/ogohlantirish).

- Verify sahifasi ko'rsatadi: bino nomi, hisobot raqami, versiya, holat (**amalda / yangi versiya bilan almashtirilgan / bekor qilingan**), chiqarilgan sana, SHA-256 (qisqa), va "PDF faylni yuklab tekshirish" (brauzer ichida hash hisoblanadi — fayl serverga yuborilmaydi). Moliyaviy/texnik tafsilot oshkor qilinmaydi (mavjud qoida saqlanadi).
- Muzlatilgan hisobotni qayta yuklab olish **saqlangan bayt**larni qaytaradi, qayta hisoblamaydi.
- Kolontitulda: `Hisobot № YRES-2026-0003 · v1.0 · 27.09.2026 · Bet 12 / 84`.
- O'zgarishlar jurnali (v1.1+ uchun) — hisobot oxirida "Versiyalar tarixi" jadvali: versiya, sana, nima o'zgardi, kim.

---

## 6. Tipografiya va dizayn standartlari

### 6.1 Sahifa

| Parametr | Qiymat |
|---|---|
| Format | A4 portret; keng jadvallar — A4 landshaft sahifa (mavjud `table()` avto-landshaft mexanizmi saqlanadi) |
| Hoshiyalar | chap 25 mm (bog'lash uchun; qog'oz nusxada 30 mm), o'ng 15 mm, yuqori 20 mm, pastki 20 mm |
| Kolontitul (yuqori) | Chapda: obyekt qisqa nomi; o'ngda: hisobot raqami · versiya. Titul sahifada yo'q |
| Kolontitul (pastki) | Markazda "Bet X / Y" (uz), "Стр. X из Y" (ru), "Page X of Y" (en); chapda holat (QORALAMA/YAKUNIY) |
| Bob boshi | Har bob (Heading 1) yangi sahifadan |

### 6.2 Shriftlar

| Element | Shrift | O'lcham | Uslub |
|---|---|---|---|
| Asosiy matn | PT Serif (mavjud, kirill + lotin o'zbek belgilari o'ʻ gʻ ni qo'llaydi — tekshirish) — Word'da Times New Roman bilan almashinadi | 12 pt (PDF), 1,15 interval; DOCX'da 12–14 pt (buyurtmachi talabiga ko'ra) | oddiy |
| Heading 1 / 2 / 3 | PT Serif Bold | 16 / 14 / 12 pt | raqamlangan (1., 1.1., 1.1.1.) |
| Jadval matni | PT Serif (yoki PT Sans — zich jadvallar uchun) | 9–10 pt; Ilova B — 8–9 pt | sarlavha satri qalin |
| Izohlar, manba satri, auditor izohi | PT Serif Italic | 10 pt | kursiv, `MUTED` |
| Caption | PT Serif Bold (raqam) + Regular (matn) | 10 pt | |

`docs/report-redesign-proposal.md` §1'dagi "Times New Roman 14 pt" talabi DOCX'da bajariladi; PDF'da 12 pt tavsiya (14 pt jadvallar va landshaft sahifalar sonini keskin oshiradi) — **loyiha egasi tasdiqlashi kerak**.

### 6.3 Jadvallar

- Uslub: gorizontal chiziqlar (sarlavha ostida qalin, satrlar orasida ingichka `RULE`), vertikal chiziqlar yo'q yoki minimal; sarlavha foni och kulrang; zebra ixtiyoriy.
- Raqamlar **o'ngga**, matn chapga tekislanadi; birlik sarlavhada `[kWh/y]`, katakda emas.
- "Jami" satri qalin, yuqorisida ikki chiziq.
- Sahifaga bo'linsa — sarlavha satri har sahifada takrorlanadi, "(davomi)" belgisi.
- Oldin/keyin juft ustunlari yonma-yon; nazariy/haqiqiy juftligi — ikki darajali sarlavha (namunaning Table 1/3 kabi).

### 6.4 Mundarija va raqamlash (texnik)

pdf-lib'da oldindan sahifa raqamini bilib bo'lmaydi → **ikki bosqichli render**: 1-o'tish — hujjatni chizib, har sarlavha/jadval/rasm uchun sahifa raqamini yig'ish; 2-o'tish — mundarija sahifalari sonini hisobga olib qayta chizish (yoki mundarijaga oldindan belgilangan sahifa soni ajratish). Kolontitul "Y" (jami sahifa) ham shu tarzda. PDF bookmark'lar (outline) — pdf-lib past darajali API orqali qo'shiladi (navigatsiya uchun muhim, 80+ sahifali hujjat).

### 6.5 Grafiklar

| Qoida | Tafsilot |
|---|---|
| Ranglar izchil | Har tashuvchi va har balans elementi **butun hisobotda bir rang**: masalan gaz — to'q sariq, elektr — ko'k, markaziy issiqlik — qizil, ko'mir — to'q kulrang, FES — sariq; oldin — kulrang, keyin — `ACCENT` yashil |
| Palitra | Rang ko'rligiga chidamli (6–8 rang), bosma oq-qorada ham farqlanadigan (to'q/och + naqsh ixtiyoriy) |
| Turi | Oylik iste'mol — guruhli ustun (mavjud); ulushlar — donut, ≤ 7 segment, qolgani "Boshqa"; oldin/keyin — yonma-yon ustun yoki "waterfall" (tejash chora-tadbir bo'yicha); moliya — kumulyativ diskontlangan pul oqimi chizig'i (nazariy va haqiqiy); EE toifa — A…G shkala strelkasi |
| Taqiqlar | 3D, soya, gradient, ikki Y o'qi (zarurat bo'lmasa) |
| Yorliqlar | O'q nomi + birlik; qiymat yorlig'i ustun ustida (≤ 12 ustun bo'lsa) |
| Jadval bilan takrorlash | Mavjud "grafik bo'lsa jadval ixtiyoriy" qoidasi saqlanadi, lekin **jadval Ilova B'da doim bor** (bank/ekspertiza raqamni ko'rishi kerak) |

---

## 7. Yo'l xaritasi (tavsiya etilgan tartib)

| Bosqich | Ish | Sxema? | Hajm |
|---|---|---|---|
| R1 | `hisobot.md` holat ustunini yangilash (Q10) | Yo'q | Kichik |
| R2 | Kolontitul, sahifa raqami, jadval/rasm raqamlash va caption, `fmt()` ustun aniqligi (Q4, Q5) | Yo'q | O'rta |
| R3 | Statik bo'limlar: disclaimer, kirish, metodologiya, me'yorlar, tushuntirish izohi, glossariy (3 til) | Yo'q | O'rta (tarjima tasdig'i) |
| R4 | Hisoblangan-lekin-chiqmagan ma'lumotlar: derazalar, ISI, yoritish, uskunalar, sovutish, QTE, elektr balansi, kalibrlash koeffitsientlari, Ilova A jamlanma, Ilova B qolgan jadvallari | Yo'q (`AuditResult`da bor) | Katta |
| R5 | EE-only vs jami moliya; so'm + kurs; moliyaviy parametrlarni loyiha bo'yicha jadvalga ko'chirish (Excel `Financial parameters` bilan muvofiqlash) | Ha | O'rta |
| R6 | VM 277 muvofiqlik, EE toifa, ZEB darajasi | Ha (engine) | O'rta–katta |
| R7 | **Snapshot + versiya + hash + verify yangilash** (Q1, Q2, Q9) | Ha | Katta — **bankka birinchi topshiriqdan oldin majburiy** |
| R8 | Tomonlar/auditor/benefitsiar, dala tashrifi, asboblar, o'lchovlar, taxminlar registri, xavflar | Ha | Katta |
| R9 | Biriktirmalar (foto, termogramma, PDF sahifalar) | Ha + R2 | Katta |
| R10 | ReportDocument AST refaktori → DOCX renderer → XLSX ilova | Yo'q (yangi kutubxona) | Katta |
| R11 | AI matn bloklari (token validator, draft/approved holati) | Ha | O'rta–katta |
| R12 | QC paneli (avtomatik + qo'lda ro'yxat, "Chiqarish" tugmasi bloklash) | Ha | O'rta |

Minimal "bankka tayyor" to'plam: **R1–R5, R7, R8 (tomonlar + imzo + taxminlar), R12** — qolganlari keyingi relizlarda.

---

## 8. Ochiq savollar (loyiha egasi / buyurtmachi)

1. **Asl texnik topshiriq (ToR)** qayerda? `TA_YC_KG_03_EN.pdf` — o'lchov chizmalari, ToR emas. Hisobot tarkibi, tili, nusxalar soni, format (Word/PDF), imzo talablari aynan ToR'dan tasdiqlanishi kerak.
2. Hisobot **rasmiy tili** (CEBU: en? ru? ekspertiza: uz?) va ikki tilli talab bormi?
3. DOCX yetkazib berish majburiymi (tavsiya: ha)? Imzo usuli: qog'oz + muhr, E-IMZO yoki ikkalasi?
4. Valyuta: USD asosiy + so'm ma'lumot uchunmi, yoki aksincha? Kurs manbasi — shartnoma kursi (3-DMTT: 12 140,91) yoki MB kursi (sana)?
5. EE toifa shkalasi (VM 690 2-ilova matni yo'q — `3-MTM` S17 ochiq savol) — qaysi shkala bilan hisoblanadi?
6. PDF shrift o'lchami: 12 pt (tavsiya) yoki 14 pt (redesign taklifidagi talab)?
7. Auditor attestati/litsenziya raqami — O'zbekistonda qaysi organ beradi, hisobotda qaysi rekvizit majburiy?

---

**Loyiha boshqaruvchisi uchun qisqa xulosa** — ushbu faylning 1–8 bo'limlari; bajarish uchun `PROGRESS.md`ga
R-bosqichlar alohida topshiriq sifatida qo'shilishi va har biri `CLAUDE.md` tartibida (tekshirish + commit) bajarilishi kerak.
