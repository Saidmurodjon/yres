import type { energyCarrierEnum } from "@yres/db";

type EnergyCarrier = (typeof energyCarrierEnum.enumValues)[number];

/**
 * kWh per one native billing unit, per carrier — from the source workbook's
 * own `Consumption` sheet formulas (`docs/data-dictionary.md:188-191,
 * 1103-1105`), not invented here:
 * - gas: `=(...)*9.5/3` — 9.5 kWh/m³ calorific value assumption.
 * - electricity: `=(...)/3` — already kWh, identity factor.
 * - district_heat: `=(...)*1163/3` — 1 Gcal = 1163 kWh.
 * - coal: the source Excel itself flags its own coal formula as an "odd
 *   combined divisor" worth double-checking; 5.5 kWh/kg is the calorific
 *   value it derives from, used here as an approximation pending a better
 *   source (coal billing is uncommon on this platform so far).
 */
export const CARRIER_KWH_PER_NATIVE_UNIT: Record<EnergyCarrier, number> = {
  gas: 9.5,
  electricity: 1,
  district_heat: 1163,
  coal: 5.5,
};

/**
 * `audit.engine.ts`'s calibration step reads `consumptionKwh` only and
 * silently skips any bill where it's null — so this conversion must always
 * run at save time, never left to the client. See PROGRESS.md for the
 * incident that prompted this (kWh was previously a manually-entered,
 * easy-to-get-wrong field).
 */
export function computeConsumptionKwh(carrier: EnergyCarrier, nativeAmount: number): number {
  return nativeAmount * CARRIER_KWH_PER_NATIVE_UNIT[carrier];
}
