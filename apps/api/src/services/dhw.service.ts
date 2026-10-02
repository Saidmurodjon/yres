import type { DhwDemandResult, Scenario } from "@yres/types";

export interface DhwSourceInput {
  specificConsumptionLPersonDay: number;
  personsServed: number;
  energyCarrier: "gas" | "electricity" | "district_heat" | "coal";
}

/** Wh per litre per °C — specific heat of water (4.186 kJ/kg·K ÷ 3.6). */
const WH_PER_LITRE_PER_DEGREE = 1.163;
const DHW_TARGET_TEMP_C = 60;
const COLD_WATER_WINTER_TEMP_C = 5;
const COLD_WATER_SUMMER_TEMP_C = 15;

/**
 * `DHW generation` sheet's `K = D*E*((F*G)+(H*I))*J/1000`: volume/day/person × persons ×
 * [ΔT_winter × winter days + ΔT_summer × summer days] × specific heat.
 *
 * v7.20 counts working days: `G = ROUND(heatingSeasonDays × workingDays / 365)` winter days and
 * `I = workingDays − G` summer days (`DHW generation!G5/I5`). Without working days the old
 * calendar split (`heatingSeasonDays` / `365 − heatingSeasonDays`) is used.
 */
export function calculateDhwSourceAnnualKwh(
  source: Pick<DhwSourceInput, "specificConsumptionLPersonDay" | "personsServed">,
  heatingSeasonDays: number,
  workingDaysPerYear: number | null = null,
): number {
  const deltaTWinterC = DHW_TARGET_TEMP_C - COLD_WATER_WINTER_TEMP_C;
  const deltaTSummerC = DHW_TARGET_TEMP_C - COLD_WATER_SUMMER_TEMP_C;
  const winterDays =
    workingDaysPerYear == null
      ? heatingSeasonDays
      : Math.round((heatingSeasonDays * workingDaysPerYear) / 365);
  const summerDays =
    workingDaysPerYear == null ? 365 - heatingSeasonDays : workingDaysPerYear - winterDays;

  return (
    (source.specificConsumptionLPersonDay *
      source.personsServed *
      (deltaTWinterC * winterDays + deltaTSummerC * summerDays) *
      WH_PER_LITRE_PER_DEGREE) /
    1000
  );
}

export function calculateDhwDemand(
  scenario: Scenario,
  sources: DhwSourceInput[],
  heatingSeasonDays: number,
  workingDaysPerYear: number | null = null,
): DhwDemandResult {
  let electricalKwh = 0;
  let otherKwh = 0;

  for (const source of sources) {
    const kwh = calculateDhwSourceAnnualKwh(source, heatingSeasonDays, workingDaysPerYear);
    if (source.energyCarrier === "electricity") {
      electricalKwh += kwh;
    } else {
      otherKwh += kwh;
    }
  }

  return { scenario, electricalKwh, otherKwh, totalKwh: electricalKwh + otherKwh };
}
