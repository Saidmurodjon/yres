# Calculation engine (`apps/api/src/services/`, orchestrated by `audit.engine.ts`)

- **The engine reimplements a specific Excel workbook** (`3-DMTT v5.xlsx`,
  EN ISO 13790-based) — `docs/data-dictionary.md` is the sheet-by-sheet source of truth for what
  each calculation should do and which cells/formulas it corresponds to. When a calculation looks
  wrong, check the corresponding sheet before assuming the code is wrong or "improving" the
  formula — the goal is fidelity to the workbook, not a generically "more correct" model.
- **`runFullAudit()` recomputes everything from stored inputs on every call — nothing is
  persisted** beyond the `audit_run` status row. Don't add caching/memoization inside it without
  understanding this is intentional (buildings' inputs change constantly during editing; a stale
  cached result would be worse than recomputing).
- **`standardized` vs `actual` on `EnergyMeasureResult`**: `standardized` is the theoretical model
  output (nameplate U-values, rated efficiencies). `actual` is that same figure calibrated against
  the building's real utility bills, via a per-energy-carrier ratio (metered baseline average ÷
  theoretical "before" need for that carrier — computed once per audit run, applied to every
  measure of that carrier). Ratio defaults to `1` (i.e. `actual == standardized`) when a carrier
  has no bills yet or no theoretical counterpart — never guess a value or divide by zero. If you
  add a new measure category, make sure `inferCarrierForMeasure()` maps it to a real carrier so it
  actually gets calibrated instead of silently defaulting.
- **`carrierForGenerationSourceType()`** maps a `generationSource.sourceType` to the purchased
  energy carrier it's billed under (gas/electricity/district_heat/coal), returning `null` for
  types that aren't billed at all (`solar_dhw` — free collected energy, never metered) or are
  genuinely ambiguous (`other`). Extend this switch, don't add carrier-guessing logic elsewhere —
  it's the single place this mapping should live, and both the baseline-calibration ratio and the
  energy-balance breakdown depend on it agreeing with itself.
- **`EnergyBalanceRow.section` distinguishes two different stages of the same energy flow — don't
  sum across them expecting one grand total.** `envelope_ventilation_loss` rows are gross,
  pre-generation thermal demand (what the fabric/ventilation loses before any equipment is
  involved). `final_energy` rows are what's actually purchased per carrier, after
  generation/distribution efficiency — comparable to a bill. `renewable_offset` only ever has an
  "after" value (no "before" state — see `renewable.service.ts`'s doc comment for why). If you add
  a new breakdown category, decide which section it honestly belongs to rather than defaulting to
  whichever makes a total line up.
- Financial indicators (NPV/IRR/payback) come from `financial.service.ts`'s
  `calculateFinancialIndicators()` — call it twice (once with standardized savings, once with
  calibrated actual savings) rather than deriving `actual` by scaling `standardized`'s output
  numbers directly; NPV/IRR aren't linear in the savings input in a way that would make that valid.
