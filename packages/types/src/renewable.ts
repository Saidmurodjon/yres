export type RenewableSystemType = "pv" | "solar_dhw";

export interface RenewableProductionResult {
  systemType: RenewableSystemType;
  /** Sum of that type's renewable_production_monthly rows across all systems. */
  annualProductionKwh: number;
}

/**
 * v7.20 `PV!C25:C38` + `Breakdown Baseline & Balance!H71:H82`: the PV array's yearly balance against the "after"
 * electricity demand. Annual, not monthly (the workbook nets the year). A production above the demand is
 * exported; whether that export earns money is a project parameter (`financialAssumptions.pvExportEnabled`).
 */
export interface RenewableBalance {
  /** `C25`. */
  productionKwh: number;
  /**
   * `C34`: the "after" electricity demand without PV — lighting, equipment, cooling, electric heating/DHW
   * generation, the mechanical ventilation fan, minus the BEMS electricity saving.
   */
  demandAfterWithoutPvKwh: number;
  /** `C35 = MIN(production, demand)`. */
  selfConsumedKwh: number;
  /** `C36 = production − self-consumed`. */
  exportedKwh: number;
  /** `H82 = production / demand`; null when there is no demand. Ready for the Phase 2 ZEB label. */
  coverageRatio: number | null;
}
