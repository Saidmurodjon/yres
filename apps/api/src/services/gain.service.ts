import type { HeatingBalanceMonth, HeatingEnergyBalanceResult, Scenario } from "@yres/types";
import type { MonthlyClimateInput } from "./heatloss.service";

export type SolarOrientationGroup =
  | "south"
  | "north"
  | "east_west"
  | "se_sw"
  | "ne_nw"
  | "horizontal";

export interface SolarApertureInput {
  orientationGroup: SolarOrientationGroup;
  windowAreaM2: number;
  /** Solar energy transmittance of the glazing. */
  gValue: number;
  /** Frame factor `Fw` — fraction of the opening that is glazed, not frame. */
  frameFactor: number;
  /** Combined horizon × overhang × fin external shading reduction factor. */
  shadingFactor: number;
}

export interface MonthlySolarRadiationInput {
  month: number;
  radiationKwhM2ByOrientation: Record<SolarOrientationGroup, number>;
}

export interface HeatingEnergyBalanceInput {
  scenario: Scenario;
  apertures: SolarApertureInput[];
  monthlyClimate: MonthlyClimateInput[];
  monthlySolarRadiation: MonthlySolarRadiationInput[];
  heatedFloorAreaM2: number;
  /** Internal heat gain intensity [W/m²] (occupants + equipment), typically ~6 for this building type. */
  internalGainSpecificWPerM2: number;
  /** Total envelope + ventilation heat loss for the month [kWh], keyed by month number. */
  monthlyLossesKwh: Map<number, number>;
  /** Building time-constant/thermal-mass class parameter `a` (EN ISO 13790 §12.2.1.1): ~4.2 before renovation, ~5 after (heavier/slower-responding once insulated). */
  thermalInertiaParamA: number;
}

/**
 * η = (1-γ^a) / (1-γ^(a+1)), the EN ISO 13790 gain-utilization factor. As
 * γ → 1 the closed form is 0/0; the limit a/(a+1) is used instead.
 */
export function calculateGainUtilizationFactor(gainToLossRatio: number, a: number): number {
  const numerator = 1 - gainToLossRatio ** a;
  const denominator = 1 - gainToLossRatio ** (a + 1);
  if (denominator === 0) return a / (a + 1);
  return Math.min(1, Math.max(0, numerator / denominator));
}

/**
 * The `gains` sheet's central monthly quasi-steady-state heat balance:
 * solar + internal gains vs. envelope + ventilation losses, combined via the
 * gain-utilization factor into net energy need for space heating.
 */
export function calculateHeatingEnergyBalance(
  input: HeatingEnergyBalanceInput,
): HeatingEnergyBalanceResult {
  const monthly: HeatingBalanceMonth[] = [];
  let annualNetEnergyNeedKwh = 0;

  const solarByMonth = new Map(input.monthlySolarRadiation.map((r) => [r.month, r]));

  for (const climate of input.monthlyClimate) {
    const radiation = solarByMonth.get(climate.month);

    let solarGainsKwh = 0;
    if (radiation) {
      for (const aperture of input.apertures) {
        const effectiveSolarApertureM2 =
          aperture.gValue * aperture.frameFactor * (1 - 0.3) * aperture.windowAreaM2;
        const shadedApertureM2 = aperture.shadingFactor * effectiveSolarApertureM2;
        const monthRadiationKwhM2 =
          radiation.radiationKwhM2ByOrientation[aperture.orientationGroup] ?? 0;
        solarGainsKwh += shadedApertureM2 * monthRadiationKwhM2;
      }
    }

    const internalGainsKwh =
      (input.internalGainSpecificWPerM2 * climate.heatingDays * 24 * input.heatedFloorAreaM2) /
      1000;

    const totalGainsKwh = internalGainsKwh + solarGainsKwh;
    const totalLossesKwh = input.monthlyLossesKwh.get(climate.month) ?? 0;

    const gainToLossRatio = totalLossesKwh > 0 ? totalGainsKwh / totalLossesKwh : 1;
    const utilizationFactor = calculateGainUtilizationFactor(
      gainToLossRatio,
      input.thermalInertiaParamA,
    );

    const netEnergyNeedKwh = Math.max(0, totalLossesKwh - utilizationFactor * totalGainsKwh);
    annualNetEnergyNeedKwh += netEnergyNeedKwh;

    monthly.push({
      month: climate.month,
      heatingDays: climate.heatingDays,
      outdoorTempC: climate.avgOutdoorTempC,
      internalGainsKwh,
      solarGainsKwh,
      totalGainsKwh,
      totalLossesKwh,
      gainToLossRatio,
      utilizationFactor,
      netEnergyNeedKwh,
    });
  }

  return { scenario: input.scenario, monthly, annualNetEnergyNeedKwh };
}
