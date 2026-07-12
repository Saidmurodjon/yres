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
