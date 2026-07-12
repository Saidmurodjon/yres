import type { LampPowerDensityWPerM2, LightingResult, LightingTechnologyMix, Scenario } from "@yres/types";

export interface LightingZoneInput {
  areaM2: number;
  technologyMix: LightingTechnologyMix;
  utilizationFactor: number;
}

/**
 * `Lighting` sheet: `I = Σ(fraction × W/m² for that tech)` weighted average
 * installed power density against the lamp power-density reference table
 * (Q7:R11).
 */
function weightedPowerDensityWPerM2(
  mix: LightingTechnologyMix,
  reference: LampPowerDensityWPerM2,
): number {
  return (
    mix.incandescentFraction * reference.incandescent +
    mix.fluorescentElectromagneticFraction * reference.fluorescentElectromagnetic +
    mix.fluorescentElectronicFraction * reference.fluorescentElectronic +
    mix.ledFraction * reference.led
  );
}

/**
 * `Lighting` sheet: `L = (D*I*J*K)/1000` per zone — lit area × weighted
 * power density × annual operation hours × utilization factor, summed
 * across zones. `J` (`Building_data!D12`) is operation hours *during the
 * heating season* (`operationHoursPerDay * heatingSeasonDurationDays`), the
 * same "annual" convention used throughout this audit tool, not a full
 * 8760-hour year — see `distribution.service.ts`'s equivalent constant.
 */
export function calculateLightingResult(
  scenario: Scenario,
  zones: LightingZoneInput[],
  lampPowerDensity: LampPowerDensityWPerM2,
  operationHoursDuringHeatingSeason: number,
): LightingResult {
  let annualConsumptionKwh = 0;
  for (const zone of zones) {
    const powerDensity = weightedPowerDensityWPerM2(zone.technologyMix, lampPowerDensity);
    annualConsumptionKwh +=
      (zone.areaM2 * powerDensity * operationHoursDuringHeatingSeason * zone.utilizationFactor) /
      1000;
  }
  return { scenario, annualConsumptionKwh };
}
