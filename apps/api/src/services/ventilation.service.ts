import type { Scenario, VentilationLossMonth, VentilationLossResult } from "@yres/types";
import type { HeatLossBuildingParams, MonthlyClimateInput } from "./heatloss.service";

/** Specific volumetric heat capacity of air [kcal/(m³·K)], SNiP convention. */
const AIR_VOLUMETRIC_HEAT_CAPACITY_KCAL_PER_M3K = 0.288;
/** kcal → Wh conversion factor. */
const KCAL_TO_WH = 1.163;

export function calculateNaturalAirFlowM3h(
  heatedVolumeM3: number,
  airChangeRatePerHour: number,
): number {
  return heatedVolumeM3 * airChangeRatePerHour;
}

export function calculateMechanicalAirFlowM3h(
  freshAirPerPersonM3h: number,
  occupantCount: number,
): number {
  return freshAirPerPersonM3h * occupantCount;
}

/**
 * Ventilation heat loss via the same degree-hour method as
 * `HeatLossService`, with airflow × specific heat capacity standing in for
 * area × U-value (`Ventilation losses` sheet's `0.288 * 1.163` constants).
 * Mechanical loss is reduced by `heatRecoveryEfficiency` (0 before retrofit,
 * up to ~0.85 after, per the workbook).
 */
export function calculateVentilationLoss(
  scenario: Scenario,
  naturalAirFlowM3h: number,
  mechanicalAirFlowM3h: number,
  heatRecoveryEfficiency: number,
  monthlyClimate: MonthlyClimateInput[],
  buildingParams: HeatLossBuildingParams,
): VentilationLossResult {
  const monthly: VentilationLossMonth[] = [];
  let naturalAnnualKwh = 0;
  let mechanicalAnnualKwh = 0;

  for (const climate of monthlyClimate) {
    const deltaTOperation = Math.max(
      0,
      buildingParams.indoorTempOperationC - climate.avgOutdoorTempC,
    );
    const deltaTNonOperation = Math.max(
      0,
      buildingParams.indoorTempNonOperationC - climate.avgOutdoorTempC,
    );

    const degreeHours =
      deltaTOperation * climate.heatingDays * buildingParams.operationHoursPerDay +
      deltaTNonOperation * climate.heatingDays * buildingParams.nonOperationHoursPerDay;

    const naturalLossKwh =
      (naturalAirFlowM3h * degreeHours * AIR_VOLUMETRIC_HEAT_CAPACITY_KCAL_PER_M3K * KCAL_TO_WH) /
      1000;

    const mechanicalLossKwh =
      (mechanicalAirFlowM3h *
        degreeHours *
        AIR_VOLUMETRIC_HEAT_CAPACITY_KCAL_PER_M3K *
        KCAL_TO_WH *
        (1 - heatRecoveryEfficiency)) /
      1000;

    naturalAnnualKwh += naturalLossKwh;
    mechanicalAnnualKwh += mechanicalLossKwh;

    monthly.push({
      month: climate.month,
      naturalLossKwh,
      mechanicalLossKwh,
      totalKwh: naturalLossKwh + mechanicalLossKwh,
    });
  }

  return {
    scenario,
    monthly,
    naturalAnnualKwh,
    mechanicalAnnualKwh,
    mechanicalElectricalKwh: 0,
    totalKwh: naturalAnnualKwh + mechanicalAnnualKwh,
  };
}

/** Air density [kg/m³], used by the enthalpy-based cooling-gain calc below. */
const AIR_DENSITY_KG_PER_M3 = 1.2;
/** `Heat gains Mec Vent` sheet's own conversion coefficient; combined with the `/1000` in the
 * formula below it reduces to the standard kJ→kWh factor (1/3600). Kept as a separate named
 * constant, matching the sheet's own layout, so the formula stays traceable against
 * `docs/data-dictionary.md`'s "Heat gains Mec Vent" section. */
const KJ_TO_KWH_INTERMEDIATE_COEFFICIENT = 0.277778;

/**
 * `Heat gains Mec Vent` sheet: cooling-season heat gain (to be removed by
 * the cooling system) from mechanical ventilation's fresh-air intake, via an
 * enthalpy-difference method rather than a simple ΔT — outside air during
 * the cooling season carries more latent heat (humidity) than a dry-bulb
 * temperature difference alone would capture. `M = ((G*H*I*J*K)/1000)*(1-L)`:
 * G = air flow, H = air density, I = the coefficient above, J = outside −
 * inside enthalpy, K = cooling-season operating hours, L = heat-recovery
 * efficiency (reduces the gain the same way it reduces heating-season loss).
 *
 * Previously never computed at all — the three enthalpy inputs
 * (`building.coolingEnthalpy*`) were stored but unused, so cooling energy
 * was understated for any building with mechanical ventilation (see
 * docs/calculation-engine-audit.md, gap #2).
 */
export function calculateMechanicalVentilationCoolingGainKwh(
  mechanicalAirFlowM3h: number,
  insideEnthalpyKjPerKg: number,
  outsideEnthalpyKjPerKg: number,
  coolingSeasonOperationHours: number,
  heatRecoveryEfficiency: number,
): number {
  const deltaEnthalpyKjPerKg = Math.max(0, outsideEnthalpyKjPerKg - insideEnthalpyKjPerKg);
  const grossGainKwh =
    (mechanicalAirFlowM3h *
      AIR_DENSITY_KG_PER_M3 *
      KJ_TO_KWH_INTERMEDIATE_COEFFICIENT *
      deltaEnthalpyKjPerKg *
      coolingSeasonOperationHours) /
    1000;
  return grossGainKwh * (1 - heatRecoveryEfficiency);
}

/** Electrical energy consumed by mechanical-ventilation fans over the heating season. */
export function calculateMechanicalVentilationElectricalKwh(
  fanElectricalPowerKw: number,
  monthlyClimate: MonthlyClimateInput[],
  buildingParams: HeatLossBuildingParams,
): number {
  const totalHours = monthlyClimate.reduce(
    (sum, c) =>
      sum +
      c.heatingDays *
        (buildingParams.operationHoursPerDay + buildingParams.nonOperationHoursPerDay),
    0,
  );
  return fanElectricalPowerKw * totalHours;
}
