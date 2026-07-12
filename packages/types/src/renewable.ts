export type RenewableSystemType = "pv" | "solar_dhw";

export interface RenewableProductionResult {
  systemType: RenewableSystemType;
  /** Sum of that type's renewable_production_monthly rows across all systems. */
  annualProductionKwh: number;
}
