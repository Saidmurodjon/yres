import type {
  EnvelopeHeatLossMonth,
  EnvelopeHeatLossResult,
  HeatLossGroup,
  Scenario,
} from "@yres/types";

export interface MonthlyClimateInput {
  month: number;
  avgOutdoorTempC: number;
  heatingDays: number;
}

export interface HeatLossBuildingParams {
  indoorTempOperationC: number;
  indoorTempNonOperationC: number;
  operationHoursPerDay: number;
  nonOperationHoursPerDay: number;
}

/**
 * Degree-hour method (`Q = U·A·Δt·t`), applied separately for operation and
 * non-operation indoor set-points, matching `Losses env. before/after`'s
 * two-row-per-element-per-month structure. Negative Δt (outdoor warmer than
 * the relevant indoor set-point) contributes zero loss for that period.
 */
export function calculateEnvelopeHeatLoss(
  scenario: Scenario,
  groups: HeatLossGroup[],
  monthlyClimate: MonthlyClimateInput[],
  buildingParams: HeatLossBuildingParams,
): EnvelopeHeatLossResult {
  const monthly: EnvelopeHeatLossMonth[] = [];
  const annualByCategory: Record<string, number> = {};

  for (const climate of monthlyClimate) {
    const deltaTOperation = Math.max(
      0,
      buildingParams.indoorTempOperationC - climate.avgOutdoorTempC,
    );
    const deltaTNonOperation = Math.max(
      0,
      buildingParams.indoorTempNonOperationC - climate.avgOutdoorTempC,
    );

    for (const group of groups) {
      const operationHoursLossKwh =
        (group.areaM2 *
          group.uValueWPerM2K *
          deltaTOperation *
          climate.heatingDays *
          buildingParams.operationHoursPerDay) /
        1000;

      const nonOperationHoursLossKwh =
        (group.areaM2 *
          group.uValueWPerM2K *
          deltaTNonOperation *
          climate.heatingDays *
          buildingParams.nonOperationHoursPerDay) /
        1000;

      const totalKwh = operationHoursLossKwh + nonOperationHoursLossKwh;

      monthly.push({
        month: climate.month,
        category: group.category,
        operationHoursLossKwh,
        nonOperationHoursLossKwh,
        totalKwh,
      });

      annualByCategory[group.category] = (annualByCategory[group.category] ?? 0) + totalKwh;
    }
  }

  const annualTotalKwh = Object.values(annualByCategory).reduce((sum, v) => sum + v, 0);

  return { scenario, monthly, annualByCategory, annualTotalKwh };
}
