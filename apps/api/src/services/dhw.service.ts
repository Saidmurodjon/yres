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
 * `DHW generation` sheet's `K = D*E*((F*G)+(H*I))*J/1000`: volume/day/person
 * × persons × [ΔT_winter×heating-season-days + ΔT_summer×remaining-days] ×
 * specific heat, assuming colder incoming mains water in winter.
 */
export function calculateDhwSourceAnnualKwh(
  source: Pick<DhwSourceInput, "specificConsumptionLPersonDay" | "personsServed">,
  heatingSeasonDays: number,
): number {
  const deltaTWinterC = DHW_TARGET_TEMP_C - COLD_WATER_WINTER_TEMP_C;
  const deltaTSummerC = DHW_TARGET_TEMP_C - COLD_WATER_SUMMER_TEMP_C;
  const daysOutsideHeatingSeason = 365 - heatingSeasonDays;

  return (
    (source.specificConsumptionLPersonDay *
      source.personsServed *
      (deltaTWinterC * heatingSeasonDays + deltaTSummerC * daysOutsideHeatingSeason) *
      WH_PER_LITRE_PER_DEGREE) /
    1000
  );
}

export function calculateDhwDemand(
  scenario: Scenario,
  sources: DhwSourceInput[],
  heatingSeasonDays: number,
): DhwDemandResult {
  let electricalKwh = 0;
  let otherKwh = 0;

  for (const source of sources) {
    const kwh = calculateDhwSourceAnnualKwh(source, heatingSeasonDays);
    if (source.energyCarrier === "electricity") {
      electricalKwh += kwh;
    } else {
      otherKwh += kwh;
    }
  }

  return { scenario, electricalKwh, otherKwh, totalKwh: electricalKwh + otherKwh };
}
