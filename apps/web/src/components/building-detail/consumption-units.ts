import type { EnergyCarrier } from "../../lib/api-types";

/**
 * Mirrors `apps/api/src/services/consumption.service.ts`'s
 * `CARRIER_KWH_PER_NATIVE_UNIT` exactly — used here only to show a live
 * preview as the user types. The server is the authoritative source; it
 * recomputes this itself at save time rather than trusting whatever the
 * client sends (see that file's comment for why).
 */
export const CARRIER_KWH_PER_NATIVE_UNIT: Record<EnergyCarrier, number> = {
  gas: 9.5,
  electricity: 1,
  district_heat: 1163,
  coal: 5.5,
};

export const ENERGY_CARRIER_NATIVE_UNIT_LABELS: Record<EnergyCarrier, string> = {
  gas: "m³",
  electricity: "kVt·soat",
  district_heat: "Gcal",
  coal: "kg",
};

export function previewConsumptionKwh(carrier: EnergyCarrier, nativeAmount: number): number {
  return nativeAmount * CARRIER_KWH_PER_NATIVE_UNIT[carrier];
}
