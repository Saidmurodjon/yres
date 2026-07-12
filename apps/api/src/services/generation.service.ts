import type { EndUse, GenerationSourceResult, Scenario } from "@yres/types";

export interface GenerationSourceInput {
  sourceId: string;
  endUse: Extract<EndUse, "heating" | "dhw">;
  scenario: Scenario;
  efficiencyOrSeer: number;
  shareOfDemand: number;
}

/**
 * `Overall gener. & distrib. eff.` sheet's `H = ((Need+Loss)*(1-Eff)) +
 * Loss + Need`, replicated verbatim for parity with the Excel tool.
 *
 * This algebraically simplifies to `(Need+Loss)*(2-Eff)`, NOT the standard
 * `(Need+Loss)/Eff` — verified against the workbook's own cached values
 * (see docs/data-dictionary.md, "Overall gener. & distrib. eff." section).
 * It understates fuel consumption vs. a textbook `/efficiency` model and
 * should be revisited with the domain expert before being presented as
 * authoritative; kept as-is here so audit numbers match the existing tool.
 */
export function calculateFinalEnergyConsumptionKwh(
  usefulEnergyNeedKwh: number,
  distributionLossKwh: number,
  generationEfficiency: number,
): number {
  const needPlusLoss = usefulEnergyNeedKwh + distributionLossKwh;
  return needPlusLoss * (1 - generationEfficiency) + distributionLossKwh + usefulEnergyNeedKwh;
}

/** Only applies to heating/DHW generation sources — cooling's electrical demand is computed directly by `CoolingService` via SEER, not this (2-Eff) transform. */
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
