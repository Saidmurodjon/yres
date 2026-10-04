import type { RenewableBalance, RenewableProductionResult, RenewableSystemType } from "@yres/types";

export interface RenewableSystemInput {
  systemType: RenewableSystemType;
  monthlyProductionKwh: number[];
}

/**
 * `PV`/`Solar DHW` sheets: annual production is the sum of 12 monthly
 * figures (an external-tool input, e.g. PVGIS for PV — see `PV!C25`,
 * `Solar DHW!I13`), not derived from capacity here. Grouped by system type
 * since a building can have more than one PV array or collector bank; both
 * "pv" and "solar_dhw" are always present in the result (0 kWh if the
 * building has no system of that type) so callers don't need existence
 * checks.
 */
export function calculateRenewableProduction(
  systems: RenewableSystemInput[],
): RenewableProductionResult[] {
  const types: RenewableSystemType[] = ["pv", "solar_dhw"];
  return types.map((systemType) => ({
    systemType,
    annualProductionKwh: systems
      .filter((s) => s.systemType === systemType)
      .reduce((sum, s) => sum + s.monthlyProductionKwh.reduce((a, b) => a + b, 0), 0),
  }));
}

/**
 * `PV!C34:C36` + `Breakdown Baseline & Balance!H82`: yearly self-consumption `MIN(production, demand)` and
 * export (the rest). Yearly, as in v7.20 — no monthly or hourly matching, no battery.
 *
 * Solar DHW (X11) deliberately does not use this: its production above the DHW need is not cut off here
 * (P1). When that is added it follows the same `MIN(production, need)` pattern.
 */
export function calculateRenewableBalance(
  productionKwh: number,
  demandAfterWithoutPvKwh: number,
): RenewableBalance {
  const selfConsumedKwh = Math.max(0, Math.min(productionKwh, demandAfterWithoutPvKwh));
  return {
    productionKwh,
    demandAfterWithoutPvKwh,
    selfConsumedKwh,
    exportedKwh: productionKwh - selfConsumedKwh,
    coverageRatio: demandAfterWithoutPvKwh > 0 ? productionKwh / demandAfterWithoutPvKwh : null,
  };
}
