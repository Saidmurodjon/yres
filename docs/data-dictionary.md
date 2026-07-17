# Data Dictionary — "3-DMTT v5.xlsx" Building Energy Audit Tool

Source: full cell dump (formulas + cached values) of a 29-sheet Uzbek building
energy-audit Excel workbook. This document reverse-engineers the calculation
logic sheet by sheet so it can be reimplemented in TypeScript / PostgreSQL.

General conventions found across the workbook:
- Heating season = 7 months (Oct–Apr), represented by columns for Oct, Nov,
  Dec, Jan, Feb, Mar, Apr almost everywhere monthly calculations occur.
- Energy balance methodology follows a monthly quasi-steady-state heat-balance
  method consistent with **EN ISO 13790** (degree-hour losses through
  envelope + ventilation, solar/internal gains, gain-utilization factor).
- Most "before renovation" sheets/blocks have a parallel "after renovation"
  block with nearly identical formulas but pointing at post-retrofit
  U-values/areas/efficiencies; savings = before − after.
- Currency: USD is the primary financial unit; a UZS/USD exchange rate and
  local tariffs (so'm) are converted via `Measures_summary!O39` (12,024
  UZS/USD) and related cells.
- Many numeric-looking cells (e.g. `'12,4 '`, `'-0,1 '`) are stored as
  **text strings with commas as decimal separators and trailing spaces**
  (Uzbek/Russian locale export) even though they are used arithmetically
  downstream (Excel silently coerces). A TS/PG reimplementation must parse
  these as decimals explicitly.

---

## Intro (non-functional)
Title/legend page only. Explains the color-coding convention used in the
original workbook (yellow = input cells, green = calculated cells, grey =
"advised not to change") and a few disclaimers about scope (no water-savings
calculations, all energy expressed in kWh). No data or formulas of
consequence. **Skip in reimplementation** — at most reuse the legend text as
UI help copy.

## Sheet2 (non-functional)
Empty sheet (`dims=A1:A1`, no cells). Skip.

---

## Sheet1 — Regional monthly climate reference table (Tashkent oblast)
**Purpose:** Static lookup table of long-term average monthly temperatures
and extreme temperatures for settlements in Tashkent region, apparently a
reference/legacy table (Cyrillic/Uzbek labels), largely superseded by the
`Weather` sheet and by hard-coded values used directly in `Losses env.
before/after`.

**Structure (lookup table):**
- Row 1: header labels (Republic/region/place; monthly avg temp columns
  I–XII in Roman numerals; annual avg; min/max absolute temps; hottest-month
  avg max; coldest-month avg min).
- Rows 4–18: one row per settlement (`Тошкент`, `Янгийўл`, `Туябўғуз`, …,
  `Ойгаинг`), columns:
  - `B:M` = average temperature per month (Jan–Dec), stored as text with
    comma decimals (e.g. `'1,9 '`).
  - `N` = average annual temperature (text).
  - `O` = minimum absolute temperature **stored as a broken formula** —
    e.g. `=-29.5/1930` (this is actually "value/year recorded", written as
    "-29.5/1930" and Excel misparsed it as a division; cached value is a
    tiny negative fraction, not the intended -29.5°C). **This is a data
    entry artifact; when migrating, re-parse the original text or discard.**
  - `P` = maximum absolute temperature, correctly kept as text
    `"44.6/1997 "` (value/year).
  - `Q` = highest average max temp of hottest month.
  - `R` = lowest average min temp of coldest month.

**Cross-sheet dependencies:** No outgoing formula references found elsewhere
in the workbook (not referenced by cell address from other sheets) — appears
to be a reference/lookup sheet the auditor consults manually rather than one
wired into calculations. Low priority for replication; could become a
`climate_station_monthly_normals` reference table if kept for lookup UX.

---

## Building_data — Core building parameters (INPUT sheet)
**Purpose:** Single row of key building-level parameters used as constants
throughout the workbook.

**Input cells** (`D` column, `B`=label, `C`=unit):
| Cell | Label | Unit | Value | Notes |
|---|---|---|---|---|
| D6 | Total net cooled floor area | m² | 0 | input |
| D7 | Duration of heating season | days | 163 | input, per NCM M.01.02:2016 |
| D8 | Avg inside temp, non-operation hours | °C | 14 | input |
| D9 | Avg inside temp, operation hours | °C | 22 | input |
| D10 | Medium outside temp during heating season | °C | 3.9 | input |
| D11 | Coldest 5-day design temp | °C | -14 | input |
| D13 | Non-operation hours during heating season | h/y | 14 | input |
| D14 | Operation hours per day | h/d | 10 | input |
| D15 | Avg inside enthalpy (cooling, 24°C/50%RH) | kJ/kg | 48.4 | input |
| D16 | Avg outside enthalpy (cooling season) | kJ/kg | 59.5 | input |
| D17 | Outside enthalpy, hottest summer day | kJ/kg | 69.13 | input |

**Calculated cells:**
- `D4` = `Envelope!L95` — Total net heated floor area [m²] (2515.415).
- `D5` = `Envelope!M95` — Total net heated volume [m³] (7546.245).
- `D12` = `D14*D7` — Operation hours during heating season [h/y] = hours/day × heating days.
- `D18` = `=360+58` — Average number of people in building (418), a hard-coded sum (hospital staff+patients presumably).

**Cross-sheet dependencies:**
- Reads from: `Envelope` (D4, D5).
- Read by (very widely used as constants): `Losses env. before/after`,
  `Ventilation losses`, `Heat gains Mec Vent`, `gains`, `Heat distr.
  efficiency`, `DHW generation`, `Cooling`.

---

## Envelope — Building geometry & construction elements (INPUT sheet, core)
**Purpose:** Master geometric input table: one row per building
facade/element (wall segment, socle, per orientation/side), from which all
areas (walls, windows, doors, floors, roofs) by type and orientation are
derived; also holds the material/type legend and the aggregate floor
area/volume calculation.

**Main input block (rows 7–73, one row per building side/element):**
Columns (letters as in sheet):
- `B` Block name, `C` Orientation (N/S/E/W…), `D` Side-of-building code
  (e.g. `P1`, `P2`), `E` Element description (`W1`=wall type 1, `Socle 1.
  (unheated space)`, etc.)
- Walls: `F` length [m] (**input**), `G` height in contact with environment
  [m] (**input**, sometimes `=3.3*2` formula for 2 floors), `H` height in
  contact with ground [m] (**input**), `I=F*G` gross wall area, `J=F*H`
  ground-contact area, `K = I - Q - R - S - Z - AA - AB` **net wall area**
  (gross minus all window/door openings in that row).
- Windows: `L,M` window dimensions [m] (**input**), `N,O,P` window counts by
  type Win1/Win2/Win3 (**input**), `Q=L*M*N`, `R=L*M*O`, `S=L*M*P` areas per
  type, `T` = window-sill perimeter `=((L+M)*2)*(N+O+P)`.
- Doors: `U,V` door dimensions (**input**), `W,X,Y` door counts by type
  D1/D2/D3 (**input**), `Z=U*V*W`, `AA=U*V*X`, `AB=U*V*Y` areas per type,
  `AC` = door-sill perimeter.
- `AD = SUM(Q:S)` total window+door opening area for that row.
- `AE` orientation code for that row (**input**, e.g. `'S'`), `AF =
  SUMIF($C$7:$C$73, AE, $AD$7:$AD$73)` — total opening area for that
  orientation across the whole building (used by `gains` sheet for solar
  gain calc per orientation).

**Aggregation rows (74–79):** `SUMIF`/`SUM` totals of net wall area (`K`) by
element type (W1, W2 unheated, Socle 1 heated/unheated, Socle 2), and total
window/door areas/sill perimeters (`Q76=Q74+R74+S74`, `T78`, `AC78`).

**Floor-area/volume block (rows 87–95, one row per building block A/B/C):**
- `E = length*width` footprint, `F` number of floors (**input**), `G=E*F`
  gross floor area, `H` floor-to-floor height (**input**), `I` = building
  perimeter, `J` = perimeter-loss coefficient (**input**, 0.4), `K=(I*J)*F`
  perimeter deduction, `L=G-K` **net heated floor area**, `M=L*H` **net
  heated volume**.
- Row 95 `Total`: `L95=SUM(L87:L94)` → feeds `Building_data!D4`;
  `M95=SUM(M87:M94)` → feeds `Building_data!D5`.

**Window/door type legend (rows 86–99):**
- `AE/AF/AG/AH` columns list each window/door type name, description,
  short code (Win1..Win3, D1..D3) and **U-value [W/m²K] entered directly as
  a constant** (not computed via the `U-values` sheet's layer method) —
  e.g. Win1=2.56, Win2=2.78, Win3=2.94, D1=3.5, D2=4, D3=5.88.
- `AI` column links each type's total area back via formulas like `=Q74`,
  `=R74`, `=S74`, `=Z74`, etc.
- Rows 96–99 define the **after-renovation** replacement window/door types
  (Win4 U=1.5, D4 U=1.8) similarly as constants.

**Wall/floor/roof type legend (rows 101–123):** Free-text descriptions of
each construction type's layer build-up (matches the `U-values` sheet
calculations), with `AH` columns pulling the aggregated area for that type
(e.g. `AH104=K74` wall type W1 area; `AH115=L87+L89` floor type F1 area;
`AH122=L87+L89` roof type R1 area — floor and roof areas are asserted equal
here, i.e. roof area = ground-floor footprint area, a simplification).

**Cross-sheet dependencies:**
- Reads from: nothing (pure input sheet).
- Read by: `Building_data` (D4,D5), `Losses env. before/after` (element
  areas + type names), `gains` (window areas by orientation via `AF`
  column), `Cooling`/`Shading` (window areas by orientation via `SUMIF` on
  `C`/`Q:S`), `Ventilation losses` (`B7` building name), `PV` (roof area
  `E86:E94`), `Lighting`, `Equipment` (via `D8=Envelope!L95`).

---

## Consumption — Historical utility bills (INPUT sheet)
**Purpose:** 3 years (2023–2025) of monthly metered consumption + cost for
Gas, Electricity, and District (Thermal) Heat, used to compute a 3-year
average "Baseline" and to calibrate/validate the standardized calculation
against actual bills.

**Structure:** Three near-identical blocks (rows 4–19 Gas, 22–37 Electrical
Energy, 40–55 Thermal Energy "Energie Termică"), each with:
- Per month (rows 7–18/25–36/43–54), 3 year-columns (`D/G/J` = consumption,
  `E/H/K` = expenses in so'm, `F/I/L` = tariff) — **input cells** for
  consumption; expenses/tariff usually formulas (`=consum*tariff`, tariff
  often `=$U$8` fixed-cell reference).
- `M` = 3-year average consumption in **kWh** (baseline): gas
  `=(D+G+J)*9.5/3` (9.5 kWh/m³ calorific value assumption), electricity
  `=(D+G+J)/3` (already kWh), thermal `=(D+G+J)*1163/3` (Gcal→kWh, 1
  Gcal=1163 kWh).
- `N` = baseline expense = `M*tariff`.
- Row 19/37/55 `TOTAL` = `SUM` of the 12 months.
- `U5:U8` — tariff constants pulled from `Measures_summary!D45/D46/D47`
  (district heat, electricity, gas unit prices).

**Cross-sheet dependencies:**
- Reads from: `Measures_summary` (tariffs).
- Read by: `gains` (`W13:W19` = `Consumption!M7:M18`, measured monthly
  heating consumption used for calibration ratio `X = Calculated/Measured`),
  `Breakdown Baseline & Balance` (`F15=Consumption!M19+M55`,
  `F25=Consumption!M37`).

---

## Weather (hidden) — Normative climate data table
**Purpose:** Reference monthly climate data (ambient temp, solar radiation
by orientation N/E/S/W + global, dew point, sky temp, ground temp) plus 3
empty templates for "actual weather data" the auditor could fill in. Sheet
carries an explicit author note recommending its deletion because (a)
normative values live in a single external standard table (not here), (b)
actual weather is never used (no affordable data source), (c) this data is
fixed by standard, not user input.

**Structure:** Row-per-parameter (`Ambient temp`, `North/East/South/West/
Global` solar radiation, `Dew point`, `Sky temp`, `Ground temp`), 12
month-columns. Repeated 4× (1 "Normative Weather" + 3 blank "Actual weather
data of ___" placeholders, all empty).

**Cross-sheet dependencies:** None found — not referenced by any other
sheet's formulas (values that actually drive the model live directly inside
`Losses env. before/after`, `gains`, `Cooling`, `Ventilation losses`, etc.,
as hard-coded monthly temperature/solar tables). Safe to drop or keep purely
as optional reference data in the new system.

---

## U-values — Construction layer U-value calculator (core, lookup + calc)
**Purpose:** For each opaque envelope element type (external wall,
socle/basement wall heated & unheated & ground, roof ×2 types, floor ×2
types), computes the R-value from layer thicknesses/conductivities and
derives U = 1/ΣR, separately for "before renovation" (left block, columns
C–H) and "after renovation" (right block, columns J–O) construction
build-ups.

**Repeating block pattern** (7 blocks, each ~15–30 rows):
1. `Calculation of Uvalue for external wall before/after renovation (W1)` — rows 2–17
2. `... external socle before/after renovation (Socle1)(heated space)` — rows 33–46
3. `... external socle before renovation (Socle2)` — rows 63–76 (ground-contact socle)
4. `... external roof before/after renovation (R1)` — rows 78–91
5. `... external roof before/after renovation (R2)` — rows 94–107 (unused in this project instance — `#DIV/0!`, zero layers)
6. `... external floor before/after renovation (F1)` — rows 108–122
7. `... external floor before/after renovation (F2)` — rows 124–138 (unused, zero area)

**Per-block formulas (left="before" example, right="after" mirrors):**
- Layer rows: `C`=layer #, `D`=layer material name (**input**, matched
  against material lookup), `E`=thickness [m] (**input**), `F =
  IFERROR(VLOOKUP(D, $Y$7:$Z$46, 2, FALSE), "")` conductivity λ [W/mK]
  looked up by material name, `H = IFERROR(E/F, "")` thermal resistance
  R=thickness/λ [m²K/W].
- `Total` row: `E14=SUM(thicknesses)`, `H14=SUM(layer resistances)`.
- `Thermal resistance of interior surface` `H15 = T6` (Rint, looked up from
  the surface-resistance table by element-type category).
- `Thermal resistance of exterior surface` `H16 = U6` (Rext, same table).
- **U value** `H17 = 1/(H16+H15+H14)` [W/m²K].

**Lookup tables:**
1. **Material conductivity table** `Y7:Z46` — ~40 rows, columns `Material
   de construcție` (name) / `λ,W/(m·K)` (conductivity). Includes Internal
   plaster 0.7, External plaster 0.76, Concrete 1.92, Mineral wool MW
   0.038, EPS 0.038, XPS 0.035, Aerated concrete (YTONG) 0.41, Bricks 0.7,
   Expanded clay 0.17, etc. Keyed by material name (used as VLOOKUP key
   from the layer-input tables).
2. **Surface thermal resistance table** `Q6:U15` — keyed by element-type
   description (Uzbek text, e.g. "wall in contact with exterior", "wall in
   contact with heated space", "wall in contact with ground", "roof to
   exterior", "ceiling above unheated space", "floor above open area",
   "floor above heated area", "floor in contact with ground"), columns
   `T`=Rint, `U`=Rext [m²K/W] per SM SR EN ISO 6946.

**Calculated cells referenced by other sheets:** `H17` (wall U before),
`H46` (socle1 before), `H76` (socle2 before), `H91` (roof R1 before), `H107`
(roof R2 before — errors, unused), `H122` (floor F1 before); mirrored `O17,
O46, O76, O91, O122` for after-renovation. **Floor F2 (row ~138) is not
referenced elsewhere** — unused type in this project instance.

**Cross-sheet dependencies:**
- Reads from: nothing (self-contained input + lookup).
- Read by: `Losses env. before` (`F` column, before-U-values), `Losses env.
  after` (`F` column, after-U-values).

---

## Losses env. before — Annual/monthly envelope heat losses, pre-retrofit (core)
**Purpose:** Computes the annual and monthly heat loss [kWh] through each
opaque/glazed envelope element category (walls, roof, floor, windows &
doors) before renovation, using U-values from `U-values`, areas from
`Envelope`, and degree-hour method with separate operation/non-operation
hour Δt.

**Annual summary block (rows 6–32):** For each element row: `D` = element
type name (from `Envelope!AG…`), `E` = area (from `Envelope!AH…`), `F` =
U-value (from `U-values!H…`), `G` = `IF(D=matching-monthly-row, SUM of
that row's monthly losses, 0)` — links the annual total to the detailed
monthly calc below. Subtotals: `G13` walls, `G19` roof, `G23` floor, `G31`
windows+doors, `G32 = G31+G23+G19+G13` **total annual envelope heat loss**.

**Monthly detail block (rows 34–68):** Two header tables:
- `M34:T38` "operation hours" reference table: for 7 heating-season months
  (Oct→Apr), `Average temp [°C]` (hard-coded from local climate normals,
  matches `Sheet1`'s Tashkent row), `Duration [days]`.
- Per element, **two calculation rows** are generated: one for **operation
  hours** (`Δt = Building_data!D9 (22°C) − monthly avg temp`; `Duration[h]
  = days * Building_data!D14` operation hours/day) and one for
  **non-operation hours** (`Δt = Building_data!D8 (14°C) − monthly avg
  temp`; `Duration[h] = days * Building_data!D13` non-op hours/day).
- Monthly loss formula: `Q_month = (Area * Uvalue * Δt * Duration_h) / 1000`
  [kWh] — standard `Q = U·A·Δt·t` degree-hour method.
- Element total = sum of its operation-hour row + non-operation-hour row
  (`G7 = SUM(E43:K44)` pattern in the annual block).

**Cross-sheet dependencies:**
- Reads from: `Envelope` (areas, type names), `U-values` (U-values before),
  `Building_data` (temps, hours).
- Read by: `Losses env. after` (D/E columns reused for same before areas),
  `gains` (`H` column total heat losses per month feed the heat-balance),
  `Breakdown Baseline & Balance`, `Measures_summary` (savings per element).

---

## Losses env. after — Annual/monthly envelope heat losses, post-retrofit (core)
**Purpose:** Mirrors `Losses env. before` exactly, but pulls **after-
renovation U-values** (`U-values!O…`) and, for windows/doors, uses the
**consolidated new window/door types** (Win4, D4) whose area equals the sum
of all old window/door areas being replaced
(`E24 = 'Losses env. before'!E24+E25+E26`). Areas for opaque elements
(walls/roof/floor) are reused unchanged from the before-sheet (retrofit
assumed to add insulation, not change geometry).

Same annual/monthly structure and degree-hour formula as `Losses env.
before`. Total row `G27` = windows+doors after; overall structure otherwise
identical (subtotals at similar rows, offset because windows/doors are now
2 rows instead of 6).

**Cross-sheet dependencies:**
- Reads from: `Losses env. before` (areas, type names), `U-values`
  (after U-values).
- Read by: `gains` (after-renovation heat losses per month), `Overall
  gener. & distrib. eff.` (`J7` = total after-renovation heating needs
  input), `Breakdown Baseline & Balance`, `Measures_summary`.

---

## Ventilation losses — Natural + mechanical ventilation heat loss/gain (core)
**Purpose:** Two independent calculations:
1. **Natural ventilation/infiltration** heat loss before/after renovation,
   driven by an assumed air-change rate (ACH).
2. **Mechanical ventilation** (fresh-air supply for occupants) heat loss
   before/after, with optional heat-recovery.

**Natural ventilation (rows 2–33):**
- `D5 = Envelope!M95` net heated volume [m³]; `E5` = air exchange rate
  **input** (0.4 ACH before, 0.35 ACH after — reduced due to better
  window/door airtightness); `F5=D5*E5` air flow rate L [m³/h].
- Monthly loss: `Q_month = (Δt * duration_h * L * 0.288 * 1.163) / 1000`
  [kWh] — `0.288` = specific volumetric heat capacity of air [kcal/(m³·K)]
  (Soviet/SNiP convention), `1.163` = kcal→Wh conversion factor.
- `G9`/`G14` = annual totals before/after; `G15 = G9-G14` heat savings.
- Rows 5–8 also allow up to 3 additional infiltration components by
  opening type (wooden/bad-PVC/new-PVC infiltration coefficients in
  `I5:J7`), unused in this project instance (zero areas).

**Mechanical ventilation (rows 34–77):**
- Fresh-air flow `G = fresh_air_per_person [m³/h/person] (F, input, 20)
  × No_of_people (E = Building_data!D18)`.
- Before: existing exhaust fan, `H45=0` heat-recovery efficiency (none).
- After: `AHU's with heat recovery`, heat exchanger efficiency `H45=0.85`
  (input) reduces losses.
- Monthly loss uses same degree-hour formula (`I37=SUM(J58:P58)` links to
  a monthly sub-table below, same structure as natural ventilation).
- `I42/I49` annual heat loss before/after; `I43/I50` = electrical energy
  consumed by fans, pulled from `Equipment!K35` / `Equipment!K85+K86`.
- `I51 = I43-I50` electrical savings (can be negative — new AHU/fan may
  consume more power); `I52 = I42-I49` heat savings.

**Cross-sheet dependencies:**
- Reads from: `Envelope` (building name/volume), `Building_data`
  (people count), `Equipment` (fan electrical consumption), `Losses env.
  after` (monthly avg temps for the monthly sub-table, reused).
- Read by: `Heat gains Mec Vent`, `gains` (ventilation losses feed total
  monthly heat losses), `Overall gener. & distrib. eff.`, `Breakdown
  Baseline & Balance`, `Measures_summary` (mech-vent + natural-vent
  measures).

---

## Heat gains Mec Vent — Cooling-season enthalpy load from ventilation (core)
**Purpose:** Computes **cooling energy losses (heat gains to be removed)**
caused by mechanical ventilation fresh-air intake during the cooling
season, using an enthalpy-difference (sensible+latent) method rather than
simple ΔT.

**Formula (per source row, before & after):**
`M = ((G * H * I * J * K) / 1000) * (1 - L)` where:
- `G` = ventilation air flow [m³/h] (from `Ventilation losses`).
- `H` = air density ρ = 1.2 kg/m³ (constant).
- `I` = conversion coefficient 0.277778 = 1/3600 (kJ→kWh per second basis).
- `J` = ΔI = `Building_data!D16 - D15` = outside − inside enthalpy
  [kJ/kg] during cooling season (11.1 kJ/kg).
- `K` = operation hours during cooling season = `Equipment!H__ *
  Equipment!J__` (hours × utilization factor for the fan).
- `L` = heat exchanger (heat recovery) efficiency (0 before, 0.85 after,
  linked from `Ventilation losses!H44/H45`).
- Row 10/16 = totals before/after; `M17 = M10-M16` = **cooling energy
  savings from mechanical ventilation** (can be negative if new AHU
  increases fresh-air rate).

**Cross-sheet dependencies:**
- Reads from: `Ventilation losses`, `Building_data` (enthalpies),
  `Equipment` (operation hours).
- Read by: `Cooling` (`D37=Equipment!M49`-like patterns, and this sheet's
  totals feed cooling loads indirectly via `Equipment`/`Cooling`).

---

## gains — Monthly heat balance & energy need for space heating (core, EN ISO 13790 method)
**Purpose:** THE central heating-demand calculation. Implements the EN ISO
13790 monthly quasi-steady-state method: solar gains through windows +
internal gains vs. envelope+ventilation losses, combined via a
gain-utilization factor to yield **net energy need for space heating**,
separately before/after renovation, and cross-checked against metered
consumption.

**Solar gain calc per orientation (rows 3–10, before; 24–31, after):**
For each orientation group (South, North, East/West combined,
SE/SW combined, NE/NW combined, Horizontal):
- `B` = window area for that orientation group, pulled via `Envelope!AF…`
  (orientation totals) — before-renovation glazing; after-renovation reuses
  same area (`=B5` etc., only glazing properties change).
- `C` = g-value (solar energy transmittance) of the glazing — **input**,
  0.75 before / 0.7 after (better low-e glass reduces g slightly).
- `D` = frame factor `Fw` — **input**, 0.6 before / 0.9 after (larger glass
  ratio after replacing old small-pane windows).
- `E,F,G` = horizon/overhang/fin shading reduction factors `Fhor, Fov,
  Ffin` — **input**, orientation-dependent constants.
- `H = E*F*G` combined external shading factor `Fsh`.
- `I = (C*D)*(1-0.3)*B` **effective solar aperture area** `Asol` [m²] (the
  `0.3` = frame/shading correction margin baked into the standard formula).
- `J = H*I` = `Fsh*Asol` [m²], the per-orientation solar aperture used with
  monthly radiation.
- **Solar radiation lookup table** `N4:T11` (12 rows: months Jan–Dec minus
  heating-season months; only 7 months Jan/Feb/Mar/Apr/Oct/Nov/Dec are
  actually populated) — columns `South, North, East/West, SE/SW, NE/NW,
  Horizontal` [kWh/m²·month], hard-coded normative solar radiation table
  (cites "Table A.4, page 126").
- **Window g-value reference table** `N18:O23` — named glazing types (One
  glass pane 0.85, Double glass panes 0.75, Double w/ low-e 0.67, Triple
  0.7, Triple w/ double low-e 0.5) — informational reference, not wired via
  VLOOKUP (values are manually re-entered in `C5:C10`).

**Monthly heat-balance calc (rows 12–20 before; 33–41 after), per month:**
- `B` = heating days in month (**input**, matches `Losses env.` durations).
- `C` = outdoor air temp (linked to `'Losses env. after'!<col>33`, i.e.
  cross-references the monthly temperature table living in the losses
  sheet).
- `D = O15 * B * 24 / 1000` — specific internal heat gain per m² ×
  hours/1000; `O15 = 6 W/m²` internal gains constant (occupants +
  equipment, normative hospital value).
- `E = D * Building_data!D4` — **internal heat gains** [kWh] (specific ×
  total heated floor area).
- `F = Σ(J_orientation * monthly_radiation_orientation)` — **solar heat
  gains** [kWh], summing all 6 orientation apertures × that month's
  radiation.
- `G = E+F` — **total heat gains**.
- `H` — **total heat losses** = sum of that month's envelope loss (from
  `Losses env. before/after`) + natural ventilation loss + mechanical
  ventilation loss for that month (3-term cross-sheet sum, e.g.
  `='Losses env. before'!$H$68 + 'Ventilation losses'!$J$24 +
  'Ventilation losses'!$M$63'`).
- `I = G/H` — gain/loss ratio γ.
- `J` — **gain utilization factor** η = `(1-γ^a)/(1-γ^(a+1))`, the
  standard EN ISO 13790 formula, with **a = 4.2 before-renovation, a = 5
  after-renovation** (different building time-constant/thermal-mass class
  assumption pre vs. post retrofit — heavier/slower-responding building
  assumed after insulation is added).
- `K = H - J*G` — **net energy need for space heating** that month [kWh].
- Row `Total`: `K20`/`K41` = annual energy need for heating.
- `W` column (before section only) = `Consumption!M<row>` (metered monthly
  gas-equivalent kWh); `X = K/W` = **calibration ratio** (calculated vs.
  measured — used by the auditor to sanity-check the model; here
  calculated ≈ 1.3–2.0× measured, i.e. the standardized model
  over-predicts vs. actual bills, common when real occupant behavior/
  intermittent heating differs from standardized assumptions).

**Cross-sheet dependencies:**
- Reads from: `Envelope` (window areas), `Losses env. before/after`
  (monthly losses + monthly temps), `Ventilation losses` (monthly
  ventilation losses), `Building_data` (floor area), `Consumption`
  (measured baseline for calibration).
- Read by: `Overall gener. & distrib. eff.` (`D8`/`J8` total useful
  heating energy need), `EMS`, `Breakdown Baseline & Balance` (`D12`
  internal gains term), `Cooling` (D37, via Equipment — indirectly).

---

## Heat distr. efficiency — Heating pipe distribution losses (core)
**Purpose:** Heat lost through un-insulated/insulated heating-distribution
pipework routed through unheated spaces (e.g. basement), before/after
renovation, plus a small radiator-replacement sizing block and a CAPEX
reference-cost table.

**Pipe-loss calc (rows 6–19), per pipe segment:**
- `D` = nominal pipe diameter class (**input**, e.g. `15–25`, `32–50`,
  `65–100` mm), `E` = pipe length [m] (**input**), `F` = % insulated
  (**input**, 0 before / 1 after in the sample data), `G=E*F` insulated
  length, `H=E-G` non-insulated length.
- `I = VLOOKUP(D, non-insulated max heat-flux-density table, 2)` [W/m] —
  looked up by diameter class from `P17:Q19` (values 47/74/140 W/m).
- `J = VLOOKUP(D, insulated max heat-flux-density table, 3)` [W/m] — looked
  up from `P9:R11`/`P9:U11`, columns per assumed mean fluid temperature
  (≤50/60/70/80/≥90°C); this project uses the 60°C column (11/14/19 W/m for
  diam classes 15-25/32-50/65-100).
- `K = Building_data!D12` (operation hours during heating season, used as
  the pipe-operating-hours proxy).
- `L = (((G*J)+(H*I))*K)/1000` — annual pipe heat loss [kWh/y].
- `L12`/`L19` = totals before/after; `L20 = L12-L19` savings.

**Lookup tables:**
- `P9:U11` — max heat-flux density for **insulated** pipe in unheated
  space [W/m], rows = diameter class, columns = mean fluid temp (≤50, 60,
  70, 80, ≥90 °C).
- `P17:Q19` — max heat-flux density for **non-insulated** pipe [W/m], keyed
  by diameter class only (single temperature assumption).
- `Y6:AF16` — duplicate monthly temperature/duration/Δt reference table
  (same structure as `Losses env.` sheets) — appears partially broken
  (`Z15:AF15` reference `Building_data!#REF!`, a **dangling reference —
  likely a deleted row in Building_data**; flagged for manual review).

**Radiator block (rows 25–28):** `D`=radiator type (**input**, e.g.
`Chugun`/cast iron), `E`=quantity, `F`=unit area [m²] (**input**),
`G=E*F`, `H`=heat transfer coefficient K [W/m²K] (**input**). Appears to be
an incomplete/partial sizing calc (no `I` formula captured in this
instance).

**CAPEX reference tables (rows 23–38):** Unit costs [USD/m] for pipe,
fittings, insulation, labour by diameter class, and a hard-coded total
heating-system-replacement CAPEX of $18,000 (`R37`) referenced by
`Measures_summary!D9`.

**Cross-sheet dependencies:**
- Reads from: `Building_data`, `Heat gains Mec Vent`/`Ventilation losses`
  (building name), `Losses env. before` (monthly temps, broken ref).
- Read by: `Overall gener. & distrib. eff.` (`F7`/`L7` distribution
  losses), `Breakdown Baseline & Balance`, `Measures_summary` (heating
  system replacement measure, D9/E9).

---

## DHW generation — Domestic hot water energy need (core)
**Purpose:** Computes annual energy needed to heat domestic hot water for
building occupants, before/after "implementation" (source replacement),
split by energy carrier (electrical vs "other").

**Per DHW source row (up to 11 rows per block):**
- `B` = source name (**input**, e.g. `ARISTON` water heater), `C` = energy
  type (**input**: "Electrical energy" or "Other energy"), `D` = specific
  consumption [litres/person/day] (**input**, 15), `E` = number of persons
  (**input**, 13).
- `F = 60-5 = 55` — ΔT during heating season (cold water assumed 5°C in
  winter, target 60°C).
- `G = Building_data!D7` — working days during heating season (163).
- `H = 60-15 = 45` — ΔT outside heating season (cold water assumed 15°C in
  summer).
- `I = 365-G` — days outside heating season (202).
- `J = 1.163` — Wh per litre per °C conversion constant (specific heat of
  water, 4.186 kJ/kg·K ÷ 3.6).
- `K = D*E*((F*G)+(H*I))*J/1000` — **annual DHW energy need** [kWh/y] =
  volume/day/person × persons × [ΔT_winter×days_winter +
  ΔT_summer×days_summer] × 1.163 / 1000.
- Totals `K16/K17/K18` split electrical vs other vs combined (before);
  `K34/K35/K36` (after) — after-block is identical formula structure,
  typically same source unless a new DHW technology (solar, heat pump) is
  modeled elsewhere.

**Cross-sheet dependencies:**
- Reads from: `Building_data` (heating season days).
- Read by: `DHW distr. efficiency` (pipe temp table uses `'DHW
  generation'!$D$5` as the target hot-water temperature reference),
  `Overall gener. & distrib. eff.` (`D10=DHW generation!K17`,
  `D11=K16`), `Breakdown Baseline & Balance`.

---

## DHW distr. efficiency — DHW pipe distribution losses (core)
**Purpose:** Same methodology as `Heat distr. efficiency` but for the
domestic-hot-water circulation/distribution pipework (constant year-round
losses, not just heating season), with pipe-loss tables scaled to the DHW
target temperature (`'DHW generation'!$D$5`) rather than assuming 60°C.

**Key differences from Heat distr. efficiency:**
- Non-insulated heat-flux lookup table `R9:R11` (47/74/140 W/m at 75°C
  reference) is **rescaled** by `= W/75 * 'DHW generation'!$D$5` — i.e.
  the "75" appears to be a reference DHW supply temp baseline and the
  formula linearly scales the tabulated loss to the actual set temperature
  (only using `D5` which is actually litres/person/day, not a temperature —
  **this looks like a formula/cell-reference bug** carried over from a
  copy-paste of the heating-pipe sheet; flagged for manual verification
  against the original standard table).
- Total losses `L12`/`L19` before/after; `L20` = savings.
- Includes a full CAPEX table (`M31:Q38`) computing pipe replacement cost
  by diameter class with labour (+50%) and contingency (+20%) markups.

**Cross-sheet dependencies:**
- Reads from: `DHW generation` (target DHW temp/volume).
- Read by: `Overall gener. & distrib. eff.` (`F10`/`L10`), `Breakdown
  Baseline & Balance`.

---

## IHS — Individual Heat Substation modernization (light pass)
**Purpose:** CAPEX-only sizing block for replacing/adding an Individual
Heat Substation (IHS) with weather-compensation control — heat exchangers
for heating/DHW/ventilation, circulation pumps, accessories, automation,
labour.

**Input cells:** `C5/C6/C7` = heat exchanger capacities [kW] (heating,
DHW, ventilation) — appear to be **0 in this project instance** (not
modeled/selected), `C17`/`C19` = fixed costs (water treatment, automation),
manual constant `C21 = 22770` (Total, overriding the formula sum —
possibly a manually pinned final figure).

**Calculated cells:** `C11/C12/C13 = capacity*25` (USD/kW unit cost
proxy), `C14/C15/C16` = pump cost as % of heat-exchanger cost, `C18` =
accessories = 5% of heat exchangers sum, `C20` = labour = 10% of
sum(C11:C19).

**Cross-sheet dependencies:** Read by `Measures_summary!D10` ("Replacement
of gas boiler" measure investment cost = `IHS!C21`), `Overall gener. &
distrib. eff.` (`C5` heating savings subtraction), `EMS`.

---

## Lighting — Artificial lighting electricity consumption (light pass)
**Purpose:** Annual electricity for artificial lighting before/after LED
retrofit, by lamp-technology mix.

**Per building/row:** `D` = lit floor area [m²] (`=Envelope!L95`), `E,F,G,H`
= floor-area fraction lit by Incandescent/Fluorescent(x2 types)/LED
(**input** fractions summing to ~1), `I = Σ(fraction × W/m² for that
tech)` weighted average installed power density, looked up against a
**lamp power-density reference table** `Q7:R11` (Incandescent 25 W/m²,
Fluorescent electromagnetic ballast 17.8, Fluorescent electronic ballast
14.81, LED 600×600 37W ≈ 7.4 W/m²), `J = Building_data!D12` operation
hours, `K` = utilization factor (**input**, 0.3 before / 0.55 after —
reflects switching from always-on to presence/daylight-sensor control),
`L = (D*I*J*K)/1000` annual kWh.
Also includes a **room-type illuminance-share reference table** `V6:X13`
(hospital room types, lux level, % share) — informational, not wired via
formula.

**Cross-sheet dependencies:** Reads `Envelope`, `Building_data`,
`Ventilation losses` (building name). Read by `EMS` (`C8=Lighting!L16`),
`Breakdown Baseline & Balance` (`D16/G16`), `Measures_summary` (`D11=
Lighting!F22` CAPEX, `E11=Lighting!L17` savings).

---

## Equipment — Electrical appliances/devices inventory (light pass)
**Purpose:** Itemized inventory of electrical loads (TVs, kitchen
equipment, laundry, ventilation/AC units, computers, elevators) before and
after renovation, computing annual electricity consumption and also
cooling-season-only consumption (heat gain contribution to cooling load).

**Per device row:** `C` = device name (**input**), `D` = unit power [kW]
(**input**), `E` = number of units (**input**), `F=D*E` total power,
`G/H` = operation hours during heating/cooling season (**input**), `I/J` =
utilization coefficient during heating/cooling season (**input**),
`K = F*G*I + F*H*J` annual consumption [kWh/y], `M = F*H*J` cooling-season-
only consumption (used elsewhere as an internal heat gain for cooling-load
calc, e.g. `Cooling!D37=Equipment!M49`).

**Categories (before, rows 5–48):** Electrical technological devices (TV,
iron/`Dazmol`), Technological equipment/kitchen (thermos, electric stove,
meat grinder, refrigerators new/old), Laundry technological equipment
(washing machine), Ventilation and air conditioning units, Other
electrical devices (computers, printers, projector), Elevators.
Row 49 = `Total annual energy used by equipment before renovation`
(`K49`).

**After renovation (rows 51–100):** mirrors same categories with upgraded/
replaced equipment. Row 100 = total after (`K100`).

**CAPEX (rows 104–117):** Cost table for replacing inefficient equipment
(washing machine, iron, fridge A++, induction stove). Row 117 = total.

**Cross-sheet dependencies:** Read by `Ventilation losses` (fan power
`K35`, `K85/K86`), `Heat gains Mec Vent` (`H35*J35`, `H86*J86` operation
hours), `Cooling` (`M49`, `M100` cooling-season heat gains), `Breakdown
Baseline & Balance` (`D17=Equipment!K49`, `G17=Equipment!K100`),
`Measures_summary` (`D12=Equipment!H117`, `E12=Equipment!K102`).

---

## Cooling — Solar + internal heat gains and cooling energy demand (core)
**Purpose:** Computes cooling-season solar heat gains through glazing (by
orientation, using a summer solar-radiation table), combines with
equipment internal heat gains, and derives electrical energy for cooling
via a Seasonal Energy Efficiency Ratio (SEER), before/after renovation.
Also documents actually-installed AC systems and CAPEX for a new
centralized cooling system.

**Solar gain per window row (rows 6–13 before, 15–22 after):**
- `F` = orientation code (S, E, SE, SW, NE, NW) (**input**).
- `G = SUMIF(Envelope!C, orientation, Envelope!Q:S)` — total window area
  for that orientation, pulled directly from `Envelope`'s per-type window
  columns (independent of the `AD/AF` aggregation used by `gains`).
- `H` = g-value (**input**, 0.75 before), `I` = shading reduction factor
  (**input**, 0.8), lower after-renovation `H=0.5` (assumes better glazing
  or added shading reduces solar transmittance).
- `J:N` = summer-month (May*–Sep*, with `*` meaning only 15/30 days
  counted for partial months) solar radiation [kWh/m²], `VLOOKUP`'d by
  orientation from table `W27:AB35`.
- `O = (N+M+L+K+J) * G * H * I` — total solar heat gain for that
  orientation over the cooling season [kWh/y].
- `O14`/`O23` = total annual solar gains before/after; `O24 = O14-O23`(ish)
  savings from window replacement/shading.

**Cooling demand block (rows 34–41):**
- `D37 = Equipment!M49` (equipment cooling-season heat gain),
  `E37 = O14` (solar gains before), `F37 = D37+E37` total cooling need
  before, `G37 = 3.2` SEER before (**input**, typical old split AC), `H37
  = F37/G37` **electrical energy for cooling before** [kWh/y].
  After: `L37=Equipment!M100`, `M37=O23`, `N37=L37+M37`, `O37=8.5` SEER
  after (**input**, high-efficiency system), `P37=N37/O37`.

**Installed AC inventory & new system CAPEX (rows 45–61):** Existing split
systems (`C50` "Split systems", power/units/hours from `Equipment`), and a
proposed **centralized cooling system** sizing formula:
`U47 = (O37*(Building_data!E17-Building_data!E15)) / ('Heat gains Mec
Vent'!L5*K5)` (appears to reference a broken/empty `Building_data!E17`/`E15`
— **these cells were not found in `Building_data`'s documented range
B3:D18; likely a stale cross-sheet reference bug**, yields `#DIV/0!`). CAPEX
uses SEER≥8.5 heat-pump unit cost [$340/kW] plus 20% labour.

**Lookup table:** `W27:AB35` (and `W35:AB35` duplicated near row 35) —
summer solar radiation [kWh/m²] by orientation for months V*–IX*
(May–Sep, partial-month weighted).

**Cross-sheet dependencies:**
- Reads from: `Envelope` (window areas by orientation), `Equipment`
  (internal gains, existing AC), `Heat distr. efficiency` (building name),
  `Heat gains Mec Vent`/`Building_data` (broken ref).
- Read by: `Shading` (reuses `Cooling!D/E/F/G/H/I` window data as its
  baseline "after renovation" starting point), `Overall gener. & distrib.
  eff.` (`D18=Cooling!F41`), `Measures_summary` (cooling-related savings).

---

## PV — Rooftop photovoltaic system potential (light pass)
**Purpose:** Sizes a rooftop PV array from available roof area, estimates
monthly/annual electricity production (from an external tool, PVGIS —
`re.jrc.ec.europa.eu/pvg_tools`), and CAPEX.

**Inputs:** `C4 = SUM(Envelope!E86:E94)*0.4` — 40% of gross roof footprint
assumed usable for PV; `C5=10` m² needed per kW at 45° tilt (**input**);
`C6=10` kW proposed capacity (**input**); monthly production `C13:C24`
(**input**, hard-coded PVGIS output values, 910–1623 kWh/month); `C25 =
SUM` annual production (15,607 kWh/y). CAPEX: `E29 = C29(726.8 USD/kW) *
D29(10 kW)` = $7,268.

**Cross-sheet dependencies:** Read by `Breakdown Baseline & Balance`
(`H22=PV!C25`), `Measures_summary` (`D13=PV!E29`, `E13=PV!C25`).

---

## Solar DHW — Solar thermal collector for DHW preheating (light pass)
**Purpose:** Sizes rooftop solar thermal collectors for DHW preheating,
estimates thermal energy production, CAPEX.

**Inputs:** `C4=500` m² available roof area, `C5=4` m² per collector,
`C6=4` collectors proposed. Production: `I13 = ((C13*D13*E13*G13) +
(C13*D13*F13*H13)) * 0.6` — collectors × area × (warm-period generation
[kWh/m²]×warm hours + cold-period generation×cold hours) × 0.6 (system
efficiency/utilization factor) = 7,927.8 kWh/y. A validation flag `D6`
warns "Reduce number of Collectors!!!" if production exceeds 60% of total
DHW need (`'DHW generation'!K18*0.6`). CAPEX itemized (boiler, collectors,
automation, water treatment, pumps, piping) totaling ~$32,448 + labour.

**Cross-sheet dependencies:** Reads `DHW generation`. Read by `Overall
gener. & distrib. eff.` (`J12 = -'Solar DHW'!I13`, negative = free/
displaced energy), `Breakdown Baseline & Balance`, `Measures_summary`
(`D14`, `E14`).

---

## Shading — External shading devices for cooling reduction (light pass)
**Purpose:** Evaluates the additional cooling-season solar-gain reduction
from adding fixed external shading elements (e.g. horizontal louvers) on
top of the "after renovation" window configuration, using the same
solar-gain formula as `Cooling`.

**Structure:** Row 6+ pulls the after-renovation window data straight from
`Cooling!D18:I23` (same areas/g-values), but applies a further-reduced
shading factor for the "with shading elements installed" scenario (rows
12–17, `H` shading g-factor lower, i.e. additional external shading beyond
what `Cooling`'s after-renovation case already assumes). `O11` = total
solar gains after renovation (no extra shading); `O17` = total with
shading; `B18` savings = `O11-O17`(ish). Rows 21–26 compute electrical
cooling-energy savings via the same SEER-division logic as `Cooling`.
CAPEX table for shading-element installation (`C28:C35`).

**Cross-sheet dependencies:** Reads `Cooling`. Read by `Measures_summary`
(not explicitly seen as a separate row — shading may be folded into the
windows/cooling measures, or omitted from `Q5:Q29`'s "Yes/No" list — worth
checking against the original workbook since no dedicated
`Measures_summary` row referencing `Shading` was found in the dump).

---

## EMS — Energy Management System (light pass)
**Purpose:** Flat-rate estimate of savings from installing an EMS
(smart metering + remote control valves/controllers) — assumed to save a
flat **3%** of each end-use's standardized energy need.

**Formulas:** `C5 = 'Overall gener. & distrib. eff.'!N7 - IHS!C8` (heating
need after other measures, minus IHS heat-exchanger contribution), `D5 =
C5*3%`; same pattern for DHW (`C6`), Cooling (`C7`), and Lighting
(`C8=Lighting!L16`, `D8=C8*3%`). Totals: `D9 = D5+D6` (thermal),
`D10 = D7+D8` (electrical). No CAPEX value populated in this instance
(`B14` description present but no cost cell captured).

**Cross-sheet dependencies:** Reads `Overall gener. & distrib. eff.`,
`IHS`, `Lighting`. Read by `Overall gener. & distrib. eff.` (`N8` subtracts
`EMS!D5`), `Breakdown Baseline & Balance` (`H14/H24`), `Measures_summary`
(`D15=EMS!C14`, `E15=EMS!D9+D10`).

---

## Overall gener. & distrib. eff. — Master energy-generation/distribution roll-up (core)
**Purpose:** For each end-use (Heating, DHW, Cooling) and each energy
source/generator serving it (e.g. gas boiler, electrical boiler, solar
DHW), rolls up: useful energy need → % covered by that source →
distribution losses → generation efficiency → **final (delivered) energy
consumption**, before and after renovation. This is the sheet that
converts "useful heat demand" into "energy purchased," which downstream
feeds the financial/CO2 calculations.

**Per source row formula pattern:**
- `D`/`J` = useful energy need [kWh/y] (before/after) — pulled from the
  relevant needs sheet (`Losses env.`+`Ventilation losses` sum for
  heating; `DHW generation` for DHW; `Cooling!F41` for cooling).
- `E`/`K` = share of total need covered by this source (`=D/D$total`).
- `F`/`L` = distribution losses for that source (from `Heat distr.
  efficiency` / `DHW distr. efficiency`).
- `G`/`M` = **generation efficiency** (**input** per source, e.g. gas
  boiler 0.58 before → 0.97 after; electrical boiler = 1.0; solar DHW =
  1.0 but contributes negative "need" since it displaces purchased
  energy).
- `H`/`N` = **final energy consumption** = `((Need+DistrLoss) * (1-Eff)) +
  DistrLoss + Need`. ⚠ **Note:** algebraically this equals
  `(Need+DistrLoss) * (2-Eff)`, NOT the more conventional
  `(Need+DistrLoss)/Eff`. This is the literal formula used throughout the
  workbook (verified against cached values, e.g. gas boiler before:
  D7=401,153, F7=36,773, G7=0.58 → H7=621,855 = (401,153+36,773)×1.42,
  matching `(2-0.58)=1.42`, not `1/0.58=1.72`). **Replicate this exact
  (non-standard) formula for parity with the Excel tool; flag to the
  auditor/user that it understates fuel consumption vs. a textbook
  `/efficiency` approach.**
- `I`/`O` = specific final energy consumption `[kWh/m²·y]` = `H or N /
  Building_data!D4` (or `D6` for cooling, net cooled area).

**Totals:** `H8`/`N8` (heating, after also subtracts `IHS!C8` and
`EMS!D5`, adds `Breakdown Baseline & Balance!G12` gains term); `H13`/`N13`
(DHW); `H18`/`N18` (cooling, after subtracts `EMS!D7`). `H21=H13+H8`,
`N21=N13+N8`, `K21=H21-N21` = total thermal energy savings.

**Cross-sheet dependencies:**
- Reads from: `Losses env. before/after`, `Ventilation losses`, `DHW
  generation`, `DHW distr. efficiency`, `Heat distr. efficiency`,
  `Cooling`, `Solar DHW`, `IHS`, `EMS`, `Building_data`, `Breakdown
  Baseline & Balance`.
- Read by: `EMS`, `Breakdown Baseline & Balance` (D11/G11 generation-loss
  term), `Measures_summary` (`D10=IHS!C21` measure ties back here
  indirectly).

---

## Breakdown Baseline & Balance — Theoretical vs. actual energy reconciliation (core)
**Purpose:** Allocates the **actual metered baseline consumption**
(`Consumption` sheet) proportionally across each theoretical loss/gain
category (walls, roof, floor, windows, ventilation, DHW, distribution,
generation) using each category's share of total theoretical need, then
computes both "theoretical" and "actual" savings per category — this
reconciliation is what feeds `Measures_summary`'s two savings columns
("based on standardized conditions" vs "actual").

**Thermal energy block (rows 4–25):**
- Per category `C4:C14` (Walls, Roof, Floor, Windows and Doors,
  Ventilation, DHW needs+distribution, Heat Distribution, Generation
  Heating+DHW, Gains heating season, Solar DHW, EMS):
  - `D` = theoretical need before renovation (from the relevant core
    sheet).
  - `E = D/D$15` = category's share of total theoretical need.
  - `F = F$15 * E` = **actual (metered) energy allocated to this
    category** = total actual baseline × category's theoretical share.
  - `G` = theoretical need after renovation.
  - `H = D-G` = **theoretical savings**.
  - `I = F-G` = **actual savings** (metered baseline share minus
    after-renovation theoretical need — this is how "real-world" savings
    are estimated without needing post-retrofit metered data).
- `D15 = SUM(D4:D12)` theoretical total before; `F15 =
  Consumption!M19+Consumption!M55` (gas+thermal actual baseline, kWh);
  `G15 = SUM(G4:G14)` theoretical total after (includes PV/EMS/Solar-DHW
  negative offset rows); `H15/I15` = total theoretical/actual savings.
- Special rows: `Gains heating season` (D12 = negative of internal+solar
  gains, reduces the "needs" total since gains offset losses), `Solar
  DHW`/`EMS` rows appear only in the "after" columns as negative
  (savings-generating) contributions.

**Electrical energy block (rows 16–25):** Same
share-allocation/theoretical-vs-actual pattern for Lighting, Equipment,
Cooling, DHW (electric), Heating (electric, if any), Ventilation
(fan power), plus PV and EMS as negative "after" contributions.
`D25/F25/G25/H25/I25` = totals; `F25 = Consumption!M37` (actual
electricity baseline).

**Specific-consumption summary (rows 28–31):** kWh/m²·y for heating, DHW,
electricity — actual (from bills) vs. standardized before vs. standardized
after — the classic energy-audit "3-column" comparison table.

**Cross-sheet dependencies:** Reads nearly every core sheet (`Losses env.
before/after`, `Ventilation losses`, `DHW generation/distr.`, `Heat distr.
efficiency`, `Overall gener. & distrib. eff.`, `Lighting`, `Equipment`,
`Solar DHW`, `PV`, `EMS`, `gains`, `Consumption`). Read by
`Overall gener. & distrib. eff.` (`H8` adds `D12`), `Measures_summary`
(most `I` column "actual savings" figures per measure pull directly from
here, e.g. `I5='Breakdown Baseline & Balance'!I4`).

---

## Non-EE measures — Ancillary (non-energy-efficiency) renovation costs (light pass)
**Purpose:** Simple itemized cost table for renovation work required as a
side-effect of the EE measures but not itself energy-saving (e.g.
electrical cable replacement, wall replastering after insulation/window
work, demolition of old heating pipes). `H = F*G` (units × unit cost).

**Cross-sheet dependencies:** Read by `Measures_summary` (rows 17–29,
"Protective measures, other investments" section, `D17:D29 = 'Non-EE
measures'!H4:H16`) — these are added to total investment but **do not**
contribute to the energy-savings columns.

---

## Financial indicators — Per-measure 20-year cash-flow & investment appraisal (core)
**Purpose:** For each of the ~15 individual EE measures (plus one combined
"Total proposed for implementation" cash flow), builds a **20-year
(2023/2026–2043/2046, block-dependent start year) annual cash-flow table**
and computes NPV, IRR, and discounted payback period, both under
"standardized" (theoretical/normative) savings and "actual" (bill-
calibrated) savings assumptions.

**Repeating block structure** (24 rows per measure block; 17 blocks total
at rows 2, 26, 50, 74, 98, 122, 146, 170, 194, 218, 242, 266, 290, 314,
338, 362, 386 — **5 of these 17 blocks contain broken `#REF!` formulas**
(rows 74, 146, 242, 314, and the measure-name link in 362 resolves via
`C362` as a plain value, not formula) — **these correspond to
`Measures_summary` rows that were apparently deleted after the Financial
indicators sheet was built by copy-paste; flag for manual reconciliation
against the current `Measures_summary` row list** (11 valid measure
names were recovered: Thermal insulation of walls, Replacement of windows
and doors, Thermal insulation of the roof, Mechanical ventilation with
heat recovery, Heating system replacement, Replacement of gas boiler,
Installation of LED lighting…, Replacement of inefficient electrical
equipment, Installation of PV system, Installation of solar DHW system,
Implementation of EMS system, plus the final combined-total block).

**Per-block formulas (row offsets relative to block start row `r`):**
- `r`: `C = Measures_summary!C<n>` (measure name).
- `r+1`: year headers, 21 columns (D:X), sequential years (block-specific
  start year — e.g. walls block starts 2026, windows block starts 2023;
  **inconsistent start years across blocks**, worth normalizing to a
  single project timeline in the reimplementation).
- `r+3` (`1.1 Estimated initial investment`): `D = Measures_summary!D<n>`.
- `r+4` (`1.2 Maintenance costs`): flat annual cost = `X% * $D$5` (X varies
  by measure: 0.5% for walls, 4% for windows — **note: in the windows
  block this literally references the absolute cell `$D$5` from the FIRST
  block, not `$D$29` of its own block — a copy-paste formula bug; the
  cached value for maintenance is computed off the wrong investment base
  and should be corrected in reimplementation to reference the current
  block's own investment cell**).
- `r+6`/`r+7` (`2.1/2.2 Gross standard/actual savings`): first year (D) =
  0; year `E` = `Measures_summary!F<n>` (standardized) /
  `Measures_summary!J<n>` (actual); subsequent years escalate via
  `=$E<row> * (1.08 + 0.08*(year - $F$3))` pattern for the walls block, or
  `=$E<row> * (1.028 + 0.028*(year-$F$3))` for gas-linked measures
  (windows) — i.e. **linear (not compound) escalation**: value grows by a
  fixed additive increment each year equal to `base × escalation_rate`.
  The escalation rate differs by energy carrier: **~8%/2.8%/2%** seen in
  different blocks, corresponding to different assumed fuel-price
  inflation (gas 2.8%, electricity 2%, per the sheet's own footnote #4 —
  the 8% figure in the walls/heating block looks anomalously high vs. the
  footnoted 2.8%/2% rates and should be verified against the source
  Excel).
- `r+8`/`r+9` (`2.3/2.4 Net standard/actual savings`): `= GrossSavings -
  (Investment + Maintenance)` per year (investment only in year 1/D).
- `r+11`/`r+12` (`3.1/3.2 Actualized net savings`): `= Savings /
  (1.04)^(year - startYear)` — **4% discount rate**, per footnote #2.
- `r+13` (`3.3 Standardized NPV`): `= NPV(0.04, E:X actualized-range) +
  D<net savings row>`.
- `r+14` (`3.4 Actual NPV`): same for actual savings.
- `r+15`/`r+16` (`3.5/3.6 Accumulated discounted savings`): running
  cumulative sum of actualized net savings (used to find the payback
  year).
- `r+17`/`r+18` (`3.7/3.8 Discounted payback period`): **Excel array
  formula** — text not recoverable from this dump (`openpyxl
  ArrayFormula` object, cached result often `#N/A`); likely an
  interpolation like `MATCH(first-positive-year in accumulated row) +
  fractional-year interpolation`. **Flag: must inspect the original .xlsx
  directly (or via a library that resolves array-formula text) to
  replicate this exactly** — cannot be reliably inferred from cached
  values alone since most show `#N/A`.
- `r+19`/`r+20` (`3.9/3.10 IRR`): `=IRR(D:X net-savings range)` standard
  Excel IRR over the {-Investment, then annual net savings} series.
- Footer notes (`r+21` or `r+23`): fixed methodology notes (20-year
  lifetime, 4% discount rate, 0.5–4% maintenance %, 2.8%/2% fuel
  escalation, per SM SR EN 15459:2011 / EU Delegated Regulation 244/2012).

**Final combined block (row 386):** `C386 = Measures_summary!B31` ("Total
proposed for implementation"), `D389 = Measures_summary!D31` (total
investment of only the "Yes" measures), otherwise same NPV/IRR/payback
formulas over the combined cash flow.

**Cross-sheet dependencies:**
- Reads from: `Measures_summary` (investment + savings per measure).
- Read by: `Measures_summary` (H/L columns pull back `D19/D20` etc. payback
  periods and `D15/D16/D21/D22` NPV/IRR per measure — a **circular-looking
  but non-circular** reference: `Measures_summary` computes raw
  investment/savings, `Financial indicators` computes the time-value
  metrics from those, and `Measures_summary` re-displays the results).

---

## Measures_summary — Master EE-measures comparison table (core)
**Purpose:** One row per candidate energy-efficiency measure, pulling
investment cost and savings from each measure's home sheet, computing
simple payback, linking to `Financial indicators` for discounted payback/
NPV/IRR, computing CO2 emission reduction, and flagging which measures are
selected ("Proposed for implementation" Yes/No) — this is the executive
summary table and the top-level input to `Financial indicators`.

**Per-measure row (rows 5–15), columns:**
- `B` = index, `C` = measure name (formula pulling from the measure's home
  sheet, e.g. `='Losses env. after'!L73`).
- `D` = **Investment [USD]** (from the measure's CAPEX cell elsewhere,
  e.g. `='Losses env. after'!Q76`, `=IHS!C21`, `=PV!E29`).
- `E` = **Theoretical (standardized) annual savings [kWh/y]** (difference
  of before/after from the relevant core sheet, e.g.
  `='Losses env. before'!G13-'Losses env. after'!G13'`).
- `F = E * $D$41 (or $E$41)` — savings converted to **USD/y** using the
  relevant energy-carrier unit cost (`D41`=gas $/kWh, `E41`=electricity
  $/kWh, computed in the tariff block below).
- `G = D/F` — **simple payback period** [years] (Investment ÷ annual $
  savings).
- `H = 'Financial indicators'!D<row>` — **discounted payback period**
  (pulled from the corresponding block; often `#N/A` per the array-formula
  issue noted above).
- `I = 'Breakdown Baseline & Balance'!I<row>` — **Actual (bill-calibrated)
  savings [kWh/y]**.
- `J = I * tariff` — actual savings in USD/y.
- `K = D/J` — simple payback on actual savings.
- `L = 'Financial indicators'!D<row+1>` — discounted payback (actual).
- `M` = **Lifetime of measure [years]** — **input**, uniformly 20 for all
  measures.
- `N = 'Financial indicators'!D<NPV row>` — **NPV** for that measure.
- `O = 'Financial indicators'!D<IRR row>` — **IRR**.
- `P = E * emission_factor / 1000` — **CO2 emission reduction [tCO2/y]**
  = theoretical kWh savings × the relevant fuel's kg-CO2/kWh factor
  (`$D$39` gas 0.198, `$E$39` electricity 0.585, `$F$39` district heat
  0.05, `$G$39` coal 0.38) ÷ 1000.
- `Q` = **"Proposed for implementation" Yes/No** — **input** flag, drives
  the `SUMIF(Q..., "Yes", ...)` totals used for the combined cash flow.

**The 11 measures** (row 5–15): Thermal insulation of walls, Replacement
of windows and doors, Thermal insulation of the roof, Mechanical
ventilation with heat recovery, Heating system replacement, Replacement of
gas boiler, Installation of LED lighting, Replacement of inefficient
electrical equipment, Installation of PV system, Installation of solar DHW
system, Implementation of EMS system.

**Non-EE measures (rows 17–29):** Pulled from `Non-EE measures!C/H`
(cable replacement, wall replastering, pipe demolition, + several empty
placeholder rows) — added to total investment (`D30/D31`) but excluded
from the energy/CO2/NPV columns (no `E:P` formulas).

**Totals (rows 30–31):**
- Row 30 `Total`: sum of all measures regardless of selection.
- Row 31 `Total proposed for implementation`: `SUMIF(Q5:Q29, "Yes", ...)`
  — only measures flagged Yes are summed; this row feeds `Financial
  indicators`' combined 20-year cash flow (row 386 block) and is the
  headline "recommended package" investment/savings/NPV/IRR figure.

**Tariff & emission-factor block (rows 38–48) — key reference constants:**
| Row | Local heating (gas) | Electricity | District heating | Coal |
|---|---|---|---|---|
| `39` Emission factor [kgCO2/kWh] | 0.198 | 0.585 | 0.050 | 0.38 |
| `40` Primary energy factor | 1.36 | 2.789 | 1.36 | 1 |
| `41` Energy cost [USD/kWh] (computed) | 0.0219 | 0.0915 | 0.0501 | 0.0156 |
- Unit prices (`D45:D48`, so'm, **inputs** with source URLs cited):
  district heat 700,000 so'm/Gcal, electricity 1,100 so'm/kWh, gas 2,500
  so'm/m³, coal 1,200,000 so'm/tonne.
- `O39 = 12,024` — **UZS/USD exchange rate** (**input**, single source of
  truth for all USD conversions in the workbook).
- Gas cost/kWh derived via `9.5 kWh/m³` calorific value; district heat via
  `1163 kWh/Gcal`; coal via `5.5 kWh/kg... /1163` (odd combined divisor,
  worth double-checking against original coal energy-content assumption).

**Cross-sheet dependencies:** Reads from virtually every measure-specific
sheet (`Losses env. before/after`, `Ventilation losses`, `Heat distr.
efficiency`, `IHS`, `Lighting`, `Equipment`, `PV`, `Solar DHW`, `EMS`,
`Breakdown Baseline & Balance`, `Non-EE measures`). Read by `Financial
indicators` (investment & savings source for every block) and by
`Consumption` (tariff cells `D45:D47` feed back into `Consumption!U5:U8`).

---

## Entity Summary (for PostgreSQL schema design)

1. **Building** — top-level project/audit subject.
   Attributes: name, address/region, climate zone, heating-season duration
   (days), design outdoor temp, indoor temps (operation/non-operation),
   number of occupants, net heated floor area, net heated volume, net
   cooled floor area, cooling-design enthalpies.

2. **ClimateRegion / WeatherStation** — reference climate normals.
   Attributes: region/settlement name, monthly avg temps (12), annual avg
   temp, min/max absolute temps, hottest/coldest month stats, monthly solar
   radiation by orientation, dew point, sky temp, ground temp.

3. **BuildingElement (EnvelopeSegment)** — one row per wall/socle
   facade segment as drawn in `Envelope`.
   Attributes: building_id, block name, orientation, side code, element
   type (wall/socle/roof/floor), construction-type reference, length,
   height (env-contact / ground-contact), gross area, ground-contact area,
   net area, window/door dimensions and counts (up to 3 types each),
   window/door areas, sill perimeters.

4. **ConstructionType (WallType/RoofType/FloorType)** — named construction
   assembly (e.g. "W1", "R1", "F1", "Socle 2") with free-text layer
   description, aggregate area, and linkage to a `ULayerStack`.

5. **ULayerStack / ConstructionLayer** — ordered list of material layers
   for a construction type (before & after renovation variants).
   Attributes: construction_type_id, layer_order, material_id, thickness_m,
   (conductivity looked up from Material), computed R-value.
   Also: surface resistance category (Rint/Rext) reference.

6. **Material** — construction material reference table.
   Attributes: name, thermal_conductivity_w_per_mk.

7. **OpeningType (WindowType/DoorType)** — named window/door product
   (Win1..Win4, D1..D4) with a directly-specified U-value [W/m²K],
   description, before/after flag.

8. **UValueResult** — computed U-value per construction/opening type,
   before/after renovation (could be derived, not stored, but useful as a
   materialized calculation record for audit trail).

9. **MonthlyClimateData** — per-project, per-month working table:
   avg outdoor temp, heating-season duration (days), solar radiation by
   orientation, used across losses/gains calculations. (Could be a
   computed/derived table sourced from ClimateRegion + project heating
   season configuration.)

10. **EnvelopeHeatLoss** — computed monthly & annual heat loss per element
    category (walls/roof/floor/windows-doors), before/after, with
    operation/non-operation hour splits. Attributes: building_id, element
    category, month, before/after flag, area, u_value, delta_t, duration_h,
    kwh.

11. **VentilationLoss** — natural and mechanical ventilation heat loss/gain
    records, before/after, monthly + annual, with heat-recovery efficiency.

12. **HeatGainRecord** — monthly internal + solar heat gains (from `gains`
    and `Cooling`), used in the EN ISO 13790 balance and in cooling-load
    calc.

13. **HeatingEnergyBalance (monthly)** — the `gains` sheet's per-month
    output: heating days, outdoor temp, internal gains, solar gains, total
    gains, total losses, gain/loss ratio, utilization factor, energy need
    for heating. Before/after variants.

14. **DistributionSystem (Heating/DHW)** — pipe segments for heat/DHW
    distribution: diameter class, length, % insulated, mean fluid temp,
    computed heat-flux loss, annual kWh loss, before/after.

15. **PipeLossReferenceTable** — lookup table: diameter class × mean fluid
    temp → max heat-flux density [W/m], insulated/non-insulated variants.

16. **DHWDemand** — per-source DHW energy need record: source name, energy
    carrier, specific consumption (L/person/day), persons, ΔT
    winter/summer, annual kWh, before/after.

17. **GenerationSource (Heating/DHW/Cooling)** — energy generator/appliance
    serving an end-use: type (gas boiler, electric boiler, solar DHW,
    split AC, centralized AC…), efficiency/SEER, share of demand covered,
    before/after.

18. **EquipmentItem** — appliance/device inventory row: name, unit power,
    quantity, operation hours (heating/cooling season), utilization
    factors, before/after, computed annual + cooling-season kWh.

19. **LightingZone** — lighting calculation row: area, technology mix
    fractions, weighted power density, operation hours, utilization
    factor, before/after, computed annual kWh.

20. **RenewableSystem (PV / SolarDHW)** — capacity, available roof area,
    monthly/annual production, unit cost, CAPEX.

21. **ShadingElement** — additional shading device specification and
    resulting cooling-season solar-gain reduction.

22. **EnergyMeasure** — the core "measure" entity (one row per
    `Measures_summary` entry): name, category, investment cost,
    theoretical annual savings (kWh & USD), actual/calibrated annual
    savings, simple/discounted payback, lifetime (years), NPV, IRR, CO2
    reduction, proposed-for-implementation flag, links to its source
    calculation sheet/entity.

23. **EnergyMeasureCashflow** — per-measure, per-year row: year, investment,
    maintenance cost, gross standard savings, gross actual savings, net
    standard/actual savings, discounted (actualized) net savings,
    cumulative discounted savings. (Replaces the `Financial indicators`
    sheet's 21-year-wide table with a normalized long/tidy table.)

24. **UtilityBill (Consumption)** — historical metered bill: energy
    carrier (gas/electricity/district heat), year, month, consumption
    (native units), expense, tariff.

25. **EnergyTariff / EmissionFactor** — reference table: energy carrier →
    unit cost (local currency + USD), CO2 emission factor (kgCO2/kWh),
    primary energy factor, currency exchange rate, effective date/source.

26. **EnergyBalanceSummary (Breakdown Baseline & Balance)** — reconciled
    theoretical-vs-actual energy allocation per category, before/after,
    theoretical savings, actual savings — the audit-report headline table.

27. **NonEnergyMeasure** — ancillary renovation cost item (not
    energy-saving): description, unit, quantity, unit cost, total cost.

---

## Ambiguities / items requiring manual review of the original .xlsx

**Update:** all 10 items below were directly re-verified against the source
`.xlsx` (via `openpyxl`, reading actual formula text rather than cached
values) and cross-checked against the current `apps/api/src/services/`
implementation. 8 of 10 are resolved or moot; 2 real implementation gaps
were found as a result of this review. Full findings, the decoded array
formula for item 2, and recommended fixes: `docs/calculation-engine-audit.md`.
Per-item status is noted inline below.

1. **`Losses env. before/after`, `gains`, `Overall gener. & distrib. eff.`,
   `Ventilation losses` — cross-sheet references into specific single
   cells** (e.g. `'Losses env. before'!$H$68`) are structurally correct
   but were not individually traced cell-by-cell for every one of the 12
   monthly columns; the underlying formula *pattern* (degree-hour method)
   is confirmed and consistent, but a full 1:1 cell audit is recommended
   before final implementation, especially around row offsets in the
   "before" vs "after" monthly sub-tables (they are NOT at identical row
   numbers between the two sheets).
   **STATUS: moot.** The reimplementation doesn't read fixed cell
   addresses at all — `heatloss.service.ts`/`gain.service.ts`/
   `ventilation.service.ts` recompute the degree-hour method generically
   from stored inputs per month. Spot-checked against the documented
   formula pattern and confirmed matching. See `docs/
   calculation-engine-audit.md`.

2. **`Financial indicators` discounted-payback-period formulas (rows
   `3.7`/`3.8` in every block, e.g. `D19`, `D20`, `D403`, `D404`)** are
   Excel **array formulas** whose text could not be extracted from this
   dump (only an opaque object reference and the cached result, usually
   `#N/A`, were captured). **Needs direct inspection of the source
   workbook** (e.g. via `openpyxl`'s `.text` on the `ArrayFormula` object,
   or opening in Excel) to replicate exactly.
   **STATUS: resolved.** Direct inspection recovered the full formula:
   `=MATCH(TRUE,INDEX($E17:$X17>0,0),0)+(-LOOKUP(9.99...E307,
   IF($E17:$X17<0,$E17:$X17))/LOOKUP(9.99...E307,IF($E17:$X17<0,
   OFFSET($E13:$X13,0,1))))` — decodes to "last year with negative
   cumulative discounted cash flow, plus that year's remaining negative
   balance divided by the following year's discounted savings" (standard
   linear within-year interpolation). `financial.service.ts`'s
   `calculateDiscountedPaybackYears()` already implements exactly this.
   Full derivation in `docs/calculation-engine-audit.md`.

3. **`Financial indicators` — 5 of 17 measure blocks contain `#REF!`
   errors** (blocks starting at rows 74, 146, 242, 314, and partially 362)
   because they reference rows in `Measures_summary` that no longer exist
   (likely deleted after a measure was removed from the summary table
   post-hoc). The mapping of which *original* measure these orphaned
   blocks belonged to is not recoverable from the dump. Recommend
   reviewing the live Excel file's edit history or asking the domain
   expert which measures used to occupy those slots (candidates given the
   gaps: floor/socle insulation, DHW piping, and 1–2 others not otherwise
   modeled elsewhere in the workbook).
   **STATUS: moot.** The reimplementation builds financial indicators
   fresh per current measure rather than reading fixed row positions from
   a cloned sheet, so "which measure used to occupy this now-deleted row"
   has no equivalent question to answer.

4. **`Cooling!U47`** (centralized cooling system sizing formula) references
   `Building_data!E17` and `E15`, cells outside `Building_data`'s
   documented range (`B3:D18`) — this is a **dangling/broken reference**
   producing `#DIV/0!`. The intended source cells are unclear (possibly a
   stale reference from before the `Building_data` sheet was
   restructured); needs manual review.
   **STATUS: moot.** Confirmed via direct read of the source file. CAPEX
   for a proposed system is a stored auditor input in the reimplementation
   (not auto-derived from a sizing formula), so this broken sizing formula
   was never ported and doesn't need to be.

5. **`Heat distr. efficiency!Z15:AF15`** contain `Building_data!#REF!`
   errors (broken reference, likely a deleted `Building_data` row) — same
   class of issue as #4.
   **STATUS: moot.** Confirmed via direct read of the source file
   (the `#REF!` is baked into the stored formula text itself, unrecoverable
   from the source). `distribution.service.ts` uses an annual
   operating-hours aggregate rather than this monthly duplicate table, so
   it was never needed.

6. **`DHW distr. efficiency`'s pipe-loss rescaling formula**
   (`=W/75*'DHW generation'!$D$5`) divides by a literal `75` and multiplies
   by `'DHW generation'!D5`, which is the **litres/person/day** input
   (15), not a temperature — the intended engineering meaning (probably
   "scale the tabulated 75°C-reference loss to the actual DHW supply
   temperature") does not match the cell actually referenced. Needs
   verification against the original spreadsheet's intent — likely a
   copy/paste error where the temperature cell reference was not updated.
   **STATUS: confirmed bug, already fixed in reimplementation.** Direct
   read confirms the literal `=W9/75*'DHW generation'!$D$5` formula in the
   source. `dhw.service.ts` uses a correct fixed `DHW_TARGET_TEMP_C = 60`
   constant instead — the bug was not replicated.

7. **`Financial indicators` — the "Gross standard/actual savings"
   escalation rate varies by block** (observed 8% for the walls/heating-
   adjacent block vs. 2.8% for windows/gas-linked blocks vs. an implied 2%
   for electricity-linked blocks per the sheet's own footnote). The 8%
   figure does not match any rate documented in the sheet's footnotes
   (which only mention 2.8% gas / 2% electricity) and should be confirmed
   as intentional or corrected.
   **STATUS: confirmed anomaly, already fixed in reimplementation.** Direct
   read confirms the walls block literally uses `1.08+0.08*(...)` vs. the
   windows block's `1.028+0.028*(...)`. `financial.service.ts`'s
   `ENERGY_ESCALATION_RATES` uses the documented footnote rates uniformly;
   the 8% figure was not replicated.

8. **`Financial indicators` — maintenance-cost formula in later blocks
   references `$D$5` (first block's investment) instead of the current
   block's own investment cell** (e.g. windows block row 30 uses `=4%*$D$5`
   instead of `=4%*$D$29`) — apparent copy-paste bug affecting the
   maintenance-cost, and therefore net-savings/NPV/IRR, figures for every
   block after the first. Needs confirmation from the auditor whether this
   is a known issue or should be "fixed" during reimplementation (i.e.
   should the new system replicate the bug for parity with existing
   reports, or correct it?).
   **STATUS: confirmed bug, already fixed in reimplementation.** Direct
   read confirms block 2 (windows) literally uses `=4%*$D$5` (block 1's
   investment). `financial.service.ts` always uses the current measure's
   own `investmentCostUsd` — the bug was not replicated.

9. **`Shading` sheet does not appear to have a corresponding row in
   `Measures_summary`** — unclear whether shading-element installation is
   meant to be bundled into another measure's cost/savings (e.g. windows)
   or was simply omitted. Needs clarification from the auditor.
   **STATUS: carried forward, not a reimplementation gap.** The
   reimplementation likewise has no standalone "shading" measure category
   — consistent with the source's own incomplete state, not a new
   omission. Could become an optional future measure category if the
   auditor wants it modeled separately.

10. **`Sheet1`'s column `O` (minimum absolute temperature)** is stored as
    a broken formula (`=-29.5/1930` etc.) that Excel evaluates as a tiny
    fraction instead of the intended "-29.5°C recorded in 1930" text. Not
    used elsewhere in the workbook, so low risk, but flagged in case a
    future version wires it in.
    **STATUS: moot.** This entire reference sheet was not ported (superseded
    by the `climate_region`/`climate_monthly_normal` tables) — the broken
    cell was never a candidate for replication.

## Real gaps found (not in the original ambiguities list) — both fixed

Two genuine missing-calculation gaps were found while cross-checking service
coverage against this dictionary (not formula bugs carried over from Excel —
things the reimplementation simply hadn't built yet). Both have since been
fixed:
1. **Non-EE (ancillary) measure costs never reached the reported total
   investment** — `non_ee_measure` existed as a DB table but had no route and
   was never queried by `audit.engine.ts`. Fixed: CRUD routes added, engine
   now folds these costs into `AuditSummary.totalInvestmentUsd`.
2. **Mechanical ventilation's cooling-season enthalpy load
   (`Heat gains Mec Vent` sheet) was never computed** — the three required
   building-level enthalpy inputs were stored but unused, understating
   cooling energy for any building with mechanical ventilation. Fixed:
   `calculateMechanicalVentilationCoolingGainKwh()` added and wired into
   `CoolingResult`.

Full detail: `docs/calculation-engine-audit.md`.
