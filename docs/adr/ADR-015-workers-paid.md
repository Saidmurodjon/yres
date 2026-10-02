# ADR-015 — Workers rejasi va limitlar (Free vs Paid)

- **Holat:** Kechiktirilgan — Free bilan boshlanadi (loyiha egasi, 2026-10-02); o'tish ADR-016 dagi triggerlar bo'yicha
- **Manba:** `docs/production/02-arxitektura-va-texnologiyalar.md` §6, P-1

## Kontekst

Master reja Paid'ni majburiy deb belgilagan edi. Hozir loyiha egasi Free bilan boshlashni tanladi.
Free cheklovlari: PDF generatsiyasi CPU limitidan oshishi mumkin (P-1); Queues/Workflows faqat Paid'da;
D1 Free'da 50 so'rov/chaqiruv va 500 MB/baza; Time Travel 7 kun.

## Variantlar

| Variant | Izoh |
|---|---|
| (a) Free | Xarajat yo'q; yuqoridagi cheklovlar, kod 40-so'rov byudjetiga sig'ishi shart (`database.md`) |
| (b) Paid | CPU, DO, Queues, Workflows, 1000 so'rov/chaqiruv, 10 GB, Time Travel 30 kun |

## Qaror

Hozircha **(a) Free**. Paid'ga o'tish triggerlari (ADR-016): `1102`/CPU xatolari, so'rov byudjeti (40) yetmasligi,
bazaning ~400 MB ga yetishi, Time Travel 30 kun kerak bo'lishi. Asinxron ishlar (Faza 5/6) Paid'ni talab qiladi.

## Oqibatlar

- Yangi kod 50 so'rov/chaqiruv chegarasiga sig'ishi kerak; byudjetni "chetlab o'tish" taqiqlangan.
- Paid'ga o'tish — loyiha egasining Cloudflare'dagi amali, kod o'zgarishi shart emas.
