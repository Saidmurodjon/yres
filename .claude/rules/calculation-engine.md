# Hisoblash dvigateli (`apps/api/src/services/`, `audit.engine.ts` tomonidan boshqariladi)

- **Dvigatel muayyan Excel jadvalini qayta amalga oshiradi** (`3-DMTT v5.xlsx`,
  EN ISO 13790'ga asoslangan) — `docs/data-dictionary.md` har bir hisoblash nima qilishi va
  qaysi katak/formulaga mos kelishi bo'yicha varaq-varaq haqiqat manbaidir. Hisoblash noto'g'ri
  ko'rinsa, kod xato deb yoki formulani "yaxshilash" kerak deb o'ylashdan oldin tegishli varaqni
  tekshiring — maqsad umuman "to'g'riroq" model emas, jadvalga sodiqlik.
- **`runFullAudit()` har chaqiruvda saqlangan kirishlardan hammasini qayta hisoblaydi — `audit_run`
  holat qatoridan tashqari hech narsa saqlanmaydi.** Buni tushunmasdan ichiga keshlash/memoizatsiya
  qo'shmang (binolarning kirishlari tahrirlash paytida doimo o'zgaradi; eskirgan keshlangan natija
  qayta hisoblashdan yomonroq bo'lardi).
- **`EnergyMeasureResult`dagi `standardized` va `actual`**: `standardized` — nazariy model natijasi
  (nominal U-qiymatlar, reytingli samaradorliklar). `actual` — o'sha raqamning binoning haqiqiy
  kommunal to'lovlariga nisbatan kalibrlangan holati, har bir energiya-tashuvchi bo'yicha nisbat
  orqali (o'lchangan bazaviy o'rtacha ÷ o'sha tashuvchi uchun nazariy "oldingi" ehtiyoj — audit
  bir marta hisoblanadi, o'sha tashuvchining har bir chora-tadbiriga qo'llaniladi). Tashuvchida hali
  hisob-fakturalar yo'q yoki nazariy hamkori yo'q bo'lsa, nisbat sukut bo'yicha `1` bo'ladi (ya'ni
  `actual == standardized`) — hech qachon qiymatni taxmin qilmang yoki nolga bo'lmang. Yangi
  chora-tadbir toifasi qo'shsangiz, `inferCarrierForMeasure()` uni haqiqiy tashuvchiga moslashtirsin,
  shunda u sezdirmasdan sukut holatga tushib qolmasdan haqiqatan ham kalibrlanadi.
- **`carrierForGenerationSourceType()`** `generationSource.sourceType`ni u qaysi sotib olingan
  energiya tashuvchisi bo'yicha hisob-fakturalanishiga moslaydi (gaz/elektr/markazlashgan
  issiqlik/ko'mir), umuman hisob-fakturalanmaydigan turlar uchun `null` qaytaradi (`solar_dhw` —
  bepul to'plangan energiya, hech qachon o'lchanmaydi) yoki haqiqatan noaniq bo'lganlar uchun
  (`other`). Shu switch'ni kengaytiring, boshqa joyda tashuvchi-taxmin qilish logikasi qo'shmang —
  bu moslashtirish yashaydigan yagona joy, va ham bazaviy-kalibrlash nisbati, ham energiya-balans
  taqsimoti buning o'z-o'zi bilan mos kelishiga bog'liq.
- **`EnergyBalanceRow.section` bir xil energiya oqimining ikki xil bosqichini ajratadi — ularni
  bitta umumiy summa kutib yig'indilamang.** `envelope_ventilation_loss` qatorlari — yalpi,
  generatsiyagacha bo'lgan issiqlik ehtiyoji (hech qanday uskuna aralashmasdan oldin qobiq/
  ventilyatsiya nima yo'qotadi). `final_energy` qatorlari — generatsiya/taqsimot samaradorligidan
  keyin haqiqatan sotib olingan narsa, tashuvchi bo'yicha — hisob-fakturaga taqqoslanadigan.
  `renewable_offset`da faqat "keyingi" qiymat bor (hech qanday "oldingi" holat yo'q — buning sababi
  uchun `renewable.service.ts`ning izohiga qarang). Yangi taqsimot toifasi qo'shsangiz, qaysi
  bo'limga halol tegishli ekanligini hal qiling, summani to'g'ri chiqaradigan bo'limni tanlamang.
- Moliyaviy ko'rsatkichlar (NPV/IRR/qoplanish muddati) `financial.service.ts`ning
  `calculateFinancialIndicators()`idan keladi — uni ikki marta chaqiring (bir marta
  standartlashtirilgan tejamkorlik bilan, bir marta kalibrlangan haqiqiy tejamkorlik bilan),
  `actual`ni `standardized`ning natija raqamlarini masshtablash orqali chiqarmang; NPV/IRR
  tejamkorlik kirishiga nisbatan chiziqli emas, bu buni yaroqsiz qilardi.

## Audit topilmalari (2026-yil tekshiruvi)

`docs/data-dictionary.md`ning "Ambiguities" bo'limidagi barcha 10 band manba `.xlsx` fayliga
qarshi bevosita tekshirildi va joriy kod bilan solishtirildi — to'liq natija
`docs/calculation-engine-audit.md`da. Qisqacha:
- **8 tasi allaqachon to'g'ri hal qilingan** (yo ataylab Excel bilan bir xil qoldirilgan aniq
  izoh bilan, yo to'g'ri tuzatilgan aniq izoh bilan) — qayta ko'rib chiqishga hojat yo'q.
- **2 ta haqiqiy kamchilik topildi va hali tuzatilmagan**: (1) `non_ee_measure` jadvali sxemada
  bor, lekin hech qanday route/servis uni ishlatmaydi — yordamchi (energiya-tejamkor bo'lmagan)
  chora-tadbir xarajatlari umumiy investitsiya raqamiga qo'shilmayapti; (2) mexanik ventilyatsiyaning
  sovutish-mavsumi entalpiya yuki (`Heat gains Mec Vent` varag'i) hech qayerda hisoblanmaydi —
  kerakli uchta kirish qiymati (`building.ts`dagi `coolingEnthalpy*` ustunlari) saqlanadi, lekin
  ishlatilmaydi, shuning uchun mexanik ventilyatsiyasi bor binolar uchun sovutish yuki kam
  baholanadi. Ikkalasi ham `docs/calculation-engine-audit.md`da tuzatish tavsiyasi bilan
  hujjatlashtirilgan — tuzatishdan oldin loyiha egasining tasdig'i kutilmoqda.
