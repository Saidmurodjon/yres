import type { EndUse, GenerationSourceResult, Scenario } from "@yres/types";

export interface GenerationSourceInput {
  sourceId: string;
  endUse: Extract<EndUse, "heating" | "dhw">;
  scenario: Scenario;
  efficiencyOrSeer: number;
  shareOfDemand: number;
}

/**
 * `Overall gener. & distrib. eff.!H7 = IFERROR((D7+F7)/G7, 0)` (v7.20): final energy = (useful need +
 * distribution loss) ÷ η. η is a boiler efficiency or a heat-pump COP/SCOP — the same formula for both.
 * The v5 transform `(Q+Qd)·(2−η)` understated gas by ~17 % and went negative for COP > 2 (X33).
 */
export function calculateFinalEnergyConsumptionKwh(
  usefulEnergyNeedKwh: number,
  distributionLossKwh: number,
  generationEfficiency: number,
): number {
  if (!Number.isFinite(generationEfficiency) || generationEfficiency <= 0) {
    throw new RangeError(
      `generation efficiency must be a positive number, got ${generationEfficiency}`,
    );
  }
  return (usefulEnergyNeedKwh + distributionLossKwh) / generationEfficiency;
}

/**
 * Loss in a distribution network without pipe segments (`Overall gener. & distrib. eff.!F11 = D11·(1−η)`):
 * `need × (1 − η)`. η = null/1 → no loss.
 */
export function calculateUnpipedDistributionLossKwh(
  usefulEnergyNeedKwh: number,
  distributionEfficiency: number | null,
): number {
  if (distributionEfficiency == null) return 0;
  return usefulEnergyNeedKwh * (1 - distributionEfficiency);
}

/** Only applies to heating/DHW generation sources — cooling's electrical demand is computed directly by `CoolingService` via SEER. */
export function calculateGenerationSourceResult(
  source: GenerationSourceInput,
  totalUsefulEnergyNeedKwh: number,
  totalDistributionLossKwh: number,
  referenceFloorAreaM2: number,
): GenerationSourceResult {
  const usefulEnergyNeedKwh = totalUsefulEnergyNeedKwh * source.shareOfDemand;
  const distributionLossKwh = totalDistributionLossKwh * source.shareOfDemand;
  const finalEnergyConsumptionKwh = calculateFinalEnergyConsumptionKwh(
    usefulEnergyNeedKwh,
    distributionLossKwh,
    source.efficiencyOrSeer,
  );

  return {
    sourceId: source.sourceId,
    endUse: source.endUse,
    scenario: source.scenario,
    usefulEnergyNeedKwh,
    shareOfDemand: source.shareOfDemand,
    distributionLossKwh,
    efficiencyOrSeer: source.efficiencyOrSeer,
    finalEnergyConsumptionKwh,
    specificFinalEnergyKwhPerM2:
      referenceFloorAreaM2 > 0 ? finalEnergyConsumptionKwh / referenceFloorAreaM2 : 0,
  };
}
