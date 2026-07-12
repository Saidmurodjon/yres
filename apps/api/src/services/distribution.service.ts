import type { DistributionLossResult, DistributionSystemKind, Scenario } from "@yres/types";

export interface PipeSegmentInput {
  pipeDiameterClass: string;
  lengthM: number;
  insulatedFraction: number;
  meanFluidTempC: number;
}

export interface PipeLossReferenceRow {
  diameterClass: string;
  insulated: boolean;
  /** Reference mean fluid temperature this row's flux was measured at; null for the single-temperature non-insulated table. */
  meanFluidTempC: number | null;
  maxHeatFluxWPerM: number;
}

function lookupHeatFluxWPerM(
  reference: PipeLossReferenceRow[],
  diameterClass: string,
  insulated: boolean,
  meanFluidTempC: number,
): number {
  const candidates = reference.filter(
    (r) => r.diameterClass === diameterClass && r.insulated === insulated,
  );

  let best: PipeLossReferenceRow | undefined;
  for (const candidate of candidates) {
    if (!insulated) return candidate.maxHeatFluxWPerM;
    if (
      !best ||
      Math.abs((candidate.meanFluidTempC ?? 0) - meanFluidTempC) <
        Math.abs((best.meanFluidTempC ?? 0) - meanFluidTempC)
    ) {
      best = candidate;
    }
  }

  return best?.maxHeatFluxWPerM ?? 0;
}

/**
 * `Heat distr. efficiency` / `DHW distr. efficiency` sheets' pipe-loss
 * calc: `L = (((insulatedLength*insulatedFlux)+(nonInsulatedLength*nonInsulatedFlux))*operatingHours)/1000`.
 */
export function calculateDistributionLoss(
  scenario: Scenario,
  systemType: DistributionSystemKind,
  segments: PipeSegmentInput[],
  reference: PipeLossReferenceRow[],
  operationHoursDuringHeatingSeason: number,
): DistributionLossResult {
  let annualLossKwh = 0;

  for (const segment of segments) {
    const insulatedLengthM = segment.lengthM * segment.insulatedFraction;
    const nonInsulatedLengthM = segment.lengthM * (1 - segment.insulatedFraction);
    const insulatedFluxWPerM = lookupHeatFluxWPerM(
      reference,
      segment.pipeDiameterClass,
      true,
      segment.meanFluidTempC,
    );
    const nonInsulatedFluxWPerM = lookupHeatFluxWPerM(
      reference,
      segment.pipeDiameterClass,
      false,
      segment.meanFluidTempC,
    );

    annualLossKwh +=
      ((insulatedLengthM * insulatedFluxWPerM + nonInsulatedLengthM * nonInsulatedFluxWPerM) *
        operationHoursDuringHeatingSeason) /
      1000;
  }

  return { scenario, systemType, annualLossKwh };
}
