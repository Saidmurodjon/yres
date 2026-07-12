import {
  type Database,
  building,
  constructionType,
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  energyMeasure,
  energyTariff,
  envelopeElement,
  generationSource,
  openingType,
  pipeLossReference,
  surfaceResistance,
  ventilationSystem,
} from "@yres/db";
import type {
  AuditResult,
  AuditSummary,
  CoolingResult,
  DhwDemandResult,
  DistributionLossResult,
  EndUseEnergyTotals,
  EnergyMeasureResult,
  EnvelopeHeatLossResult,
  GenerationSourceResult,
  HeatingEnergyBalanceResult,
  Scenario,
  VentilationLossResult,
} from "@yres/types";
import { desc, eq } from "drizzle-orm";
import {
  type CoolingWindowInput,
  calculateCoolingResult,
  calculateCoolingSolarGainsKwh,
} from "./cooling.service";
import { calculateDhwDemand } from "./dhw.service";
import {
  type PipeLossReferenceRow,
  type PipeSegmentInput,
  calculateDistributionLoss,
} from "./distribution.service";
import {
  type BuildingBlockInput,
  type ConstructionTypeUValueInput,
  type EnvelopeElementInput,
  type OpeningTypeUValueInput,
  calculateBuildingBlockAreas,
  calculateEnvelopeAreas,
  getEffectiveOpeningType,
  resolveHeatLossGroups,
} from "./envelope.service";
import {
  ENERGY_ESCALATION_RATES,
  calculateCo2ReductionTonnesPerYear,
  calculateFinancialIndicators,
} from "./financial.service";
import {
  type SolarApertureInput,
  type SolarOrientationGroup,
  calculateHeatingEnergyBalance,
} from "./gain.service";
import { calculateFinalEnergyConsumptionKwh } from "./generation.service";
import {
  type HeatLossBuildingParams,
  type MonthlyClimateInput,
  calculateEnvelopeHeatLoss,
} from "./heatloss.service";
import {
  calculateMechanicalAirFlowM3h,
  calculateMechanicalVentilationElectricalKwh,
  calculateNaturalAirFlowM3h,
  calculateVentilationLoss,
} from "./ventilation.service";

const SCENARIOS: Scenario[] = ["before", "after"];

const ORIENTATION_GROUP_BY_ENUM: Record<string, SolarOrientationGroup> = {
  south: "south",
  north: "north",
  east: "east_west",
  west: "east_west",
  southeast: "se_sw",
  southwest: "se_sw",
  northeast: "ne_nw",
  northwest: "ne_nw",
  horizontal: "horizontal",
};

/**
 * Orchestrates the full audit calculation in the documented order (climate
 * → envelope areas → U-values → heat losses → ventilation losses → gains →
 * energy balance → distribution/generation → measures → financials),
 * mirroring the workbook's overall calculation flow. Nothing computed here
 * is persisted — every run recomputes from the building's stored inputs.
 */
export async function runFullAudit(db: Database, buildingId: string): Promise<AuditResult> {
  const buildingRecord = await db.query.building.findFirst({
    where: eq(building.id, buildingId),
    with: { climateRegion: { with: { monthlyNormals: true } }, blocks: true },
  });
  if (!buildingRecord) throw new Error(`Building ${buildingId} not found`);

  const buildingParams: HeatLossBuildingParams = {
    indoorTempOperationC: buildingRecord.indoorTempOperationC,
    indoorTempNonOperationC: buildingRecord.indoorTempNonOperationC,
    operationHoursPerDay: buildingRecord.operationHoursPerDay,
    nonOperationHoursPerDay: buildingRecord.nonOperationHoursPerDay,
  };

  const blockAreas = buildingRecord.blocks.map((block: BuildingBlockInput) =>
    calculateBuildingBlockAreas(block),
  );
  const heatedFloorAreaM2 = blockAreas.reduce((sum, b) => sum + b.netFloorAreaM2, 0);
  const heatedVolumeM3 = blockAreas.reduce((sum, b) => sum + b.netVolumeM3, 0);
  const operationHoursDuringHeatingSeason =
    buildingRecord.operationHoursPerDay * buildingRecord.heatingSeasonDurationDays;

  const monthlyClimate: MonthlyClimateInput[] = buildingRecord.climateRegion.monthlyNormals
    .filter((m) => m.isHeatingSeasonMonth)
    .map((m) => ({
      month: m.month,
      avgOutdoorTempC: m.avgOutdoorTempC,
      heatingDays: m.heatingDaysInMonth ?? daysInMonth(m.month),
    }));

  const monthlySolarRadiation = buildingRecord.climateRegion.monthlyNormals
    .filter((m) => m.isHeatingSeasonMonth)
    .map((m) => ({
      month: m.month,
      radiationKwhM2ByOrientation: {
        south: m.solarRadiationSouthKwhM2 ?? 0,
        north: m.solarRadiationNorthKwhM2 ?? 0,
        east_west: m.solarRadiationEastWestKwhM2 ?? 0,
        se_sw: m.solarRadiationSeSwKwhM2 ?? 0,
        ne_nw: m.solarRadiationNeNwKwhM2 ?? 0,
        horizontal: m.solarRadiationHorizontalKwhM2 ?? 0,
      } satisfies Record<SolarOrientationGroup, number>,
    }));

  // --- Envelope ---
  const [elementRows, constructionTypeRows, openingTypeRows] = await Promise.all([
    db.query.envelopeElement.findMany({
      where: eq(envelopeElement.buildingId, buildingId),
      with: { openings: { with: { openingType: true } } },
    }),
    db.query.constructionType.findMany({
      where: eq(constructionType.buildingId, buildingId),
      with: { layers: { with: { material: true } } },
    }),
    db.query.openingType.findMany({ where: eq(openingType.buildingId, buildingId) }),
  ]);

  const surfaceResistanceRows = await db.select().from(surfaceResistance);
  const surfaceResistanceByCategory = new Map(
    surfaceResistanceRows.map((r) => [
      r.elementCategory,
      {
        interiorResistanceM2kPerW: r.interiorResistanceM2kPerW,
        exteriorResistanceM2kPerW: r.exteriorResistanceM2kPerW,
      },
    ]),
  );

  const constructionTypeUValues: ConstructionTypeUValueInput[] = constructionTypeRows.map((ct) => {
    const resistance = surfaceResistanceByCategory.get(ct.elementCategory) ?? {
      interiorResistanceM2kPerW: 0.13,
      exteriorResistanceM2kPerW: 0.04,
    };
    const layerResistance = ct.layers.reduce(
      (sum, layer) => sum + layer.thicknessM / (layer.material.thermalConductivityWPerMk || 1),
      0,
    );
    const totalResistance =
      layerResistance + resistance.interiorResistanceM2kPerW + resistance.exteriorResistanceM2kPerW;
    return {
      id: ct.id,
      scenario: ct.scenario,
      retrofitOfId: ct.retrofitOfId,
      uValueWPerM2K: totalResistance > 0 ? 1 / totalResistance : 0,
    };
  });

  const openingTypeUValues: OpeningTypeUValueInput[] = openingTypeRows.map((ot) => ({
    id: ot.id,
    category: ot.category,
    scenario: ot.scenario,
    uValueWPerM2K: ot.uValueWm2k,
    gValue: ot.gValue,
    frameFactor: ot.frameFactor,
    shadingFactor: ot.shadingFactor,
  }));

  const envelopeElementInputs: EnvelopeElementInput[] = elementRows.map((el) => ({
    id: el.id,
    constructionTypeId: el.constructionTypeId,
    elementCategory:
      constructionTypeRows.find((ct) => ct.id === el.constructionTypeId)?.elementCategory ??
      "external_wall",
    orientation: el.orientation,
    lengthM: el.lengthM,
    heightEnvContactM: el.heightEnvContactM ?? 0,
    heightGroundContactM: el.heightGroundContactM ?? 0,
    openings: el.openings.map((o) => ({
      openingTypeId: o.openingTypeId,
      openingCategory: o.openingType.category,
      widthM: o.openingType.widthM ?? 0,
      heightM: o.openingType.heightM ?? 0,
      count: o.count,
    })),
  }));

  const envelopeAreas = calculateEnvelopeAreas(envelopeElementInputs);

  // --- Ventilation ---
  const ventilationSystemRows = await db.query.ventilationSystem.findMany({
    where: eq(ventilationSystem.buildingId, buildingId),
  });

  // --- Cooling ---
  const [coolingWindowRows, coolingSystemRows] = await Promise.all([
    db.query.coolingWindow.findMany({ where: eq(coolingWindow.buildingId, buildingId) }),
    db.query.coolingSystem.findMany({ where: eq(coolingSystem.buildingId, buildingId) }),
  ]);

  // --- DHW ---
  const dhwSourceRows = await db.query.dhwSource.findMany({
    where: eq(dhwSource.buildingId, buildingId),
  });

  // --- Distribution ---
  const distributionSystemRows = await db.query.distributionSystem.findMany({
    where: eq(distributionSystem.buildingId, buildingId),
  });
  const pipeLossReferenceRows = await db.select().from(pipeLossReference);
  const pipeLossReferenceInputs: PipeLossReferenceRow[] = pipeLossReferenceRows.map((r) => ({
    diameterClass: r.diameterClass,
    insulated: r.insulated === "insulated",
    meanFluidTempC: r.meanFluidTempC,
    maxHeatFluxWPerM: r.maxHeatFluxWPerM,
  }));

  // --- Generation ---
  const generationSourceRows = await db.query.generationSource.findMany({
    where: eq(generationSource.buildingId, buildingId),
  });

  const envelopeHeatLoss: EnvelopeHeatLossResult[] = [];
  const ventilationLoss: VentilationLossResult[] = [];
  const heatingEnergyBalance: HeatingEnergyBalanceResult[] = [];
  const dhwDemand: DhwDemandResult[] = [];
  const distributionLoss: DistributionLossResult[] = [];
  const cooling: CoolingResult[] = [];
  const generation: GenerationSourceResult[] = [];

  for (const scenario of SCENARIOS) {
    const heatLossGroups = resolveHeatLossGroups(
      envelopeElementInputs,
      constructionTypeUValues,
      openingTypeUValues,
      scenario,
    );
    const heatLossResult = calculateEnvelopeHeatLoss(
      scenario,
      heatLossGroups,
      monthlyClimate,
      buildingParams,
    );
    envelopeHeatLoss.push(heatLossResult);

    const naturalSystem = ventilationSystemRows.find(
      (v) => v.scenario === scenario && v.systemType === "natural",
    );
    const mechanicalSystem = ventilationSystemRows.find(
      (v) => v.scenario === scenario && v.systemType === "mechanical",
    );
    const naturalAirFlowM3h = naturalSystem
      ? calculateNaturalAirFlowM3h(heatedVolumeM3, naturalSystem.airChangeRatePerHour ?? 0)
      : 0;
    const mechanicalAirFlowM3h = mechanicalSystem
      ? calculateMechanicalAirFlowM3h(
          mechanicalSystem.freshAirPerPersonM3h ?? 0,
          buildingRecord.occupantCount,
        )
      : 0;
    const heatRecoveryEfficiency = mechanicalSystem?.heatRecoveryEfficiency ?? 0;

    const ventilationResult = calculateVentilationLoss(
      scenario,
      naturalAirFlowM3h,
      mechanicalAirFlowM3h,
      heatRecoveryEfficiency,
      monthlyClimate,
      buildingParams,
    );
    if (mechanicalSystem?.fanElectricalPowerKw) {
      ventilationResult.mechanicalElectricalKwh = calculateMechanicalVentilationElectricalKwh(
        mechanicalSystem.fanElectricalPowerKw,
        monthlyClimate,
        buildingParams,
      );
    }
    ventilationLoss.push(ventilationResult);

    const monthlyLossesKwh = new Map<number, number>();
    for (const monthLoss of heatLossResult.monthly) {
      monthlyLossesKwh.set(
        monthLoss.month,
        (monthlyLossesKwh.get(monthLoss.month) ?? 0) + monthLoss.totalKwh,
      );
    }
    for (const monthLoss of ventilationResult.monthly) {
      monthlyLossesKwh.set(
        monthLoss.month,
        (monthlyLossesKwh.get(monthLoss.month) ?? 0) + monthLoss.totalKwh,
      );
    }

    const apertures: SolarApertureInput[] = envelopeElementInputs.flatMap((el) => {
      const orientationGroup = ORIENTATION_GROUP_BY_ENUM[el.orientation] ?? "south";
      return el.openings
        .filter((o) => o.openingCategory === "window")
        .map((o) => {
          const effectiveType = getEffectiveOpeningType(
            o.openingTypeId,
            openingTypeUValues,
            "window",
            scenario,
          );
          return {
            orientationGroup,
            windowAreaM2: o.widthM * o.heightM * o.count,
            gValue: effectiveType?.gValue ?? 0.75,
            frameFactor: effectiveType?.frameFactor ?? 0.6,
            shadingFactor: effectiveType?.shadingFactor ?? 1,
          };
        });
    });

    heatingEnergyBalance.push(
      calculateHeatingEnergyBalance({
        scenario,
        apertures,
        monthlyClimate,
        monthlySolarRadiation,
        heatedFloorAreaM2,
        internalGainSpecificWPerM2: 6,
        monthlyLossesKwh,
        thermalInertiaParamA: scenario === "before" ? 4.2 : 5,
      }),
    );

    dhwDemand.push(
      calculateDhwDemand(
        scenario,
        dhwSourceRows.filter((s) => s.scenario === scenario),
        buildingRecord.heatingSeasonDurationDays,
      ),
    );

    for (const systemType of ["heating", "dhw"] as const) {
      distributionLoss.push(
        calculateDistributionLoss(
          scenario,
          systemType,
          distributionSystemRows
            .filter((d) => d.scenario === scenario && d.systemType === systemType)
            .map(
              (d): PipeSegmentInput => ({
                pipeDiameterClass: d.pipeDiameterClass,
                lengthM: d.lengthM,
                insulatedFraction: d.insulatedFraction,
                meanFluidTempC: d.meanFluidTempC,
              }),
            ),
          pipeLossReferenceInputs,
          operationHoursDuringHeatingSeason,
        ),
      );
    }

    const coolingWindowInputs: CoolingWindowInput[] = coolingWindowRows
      .filter((w) => w.scenario === scenario)
      .map((w) => ({
        orientation: w.orientation,
        areaM2: w.areaM2,
        gValue: w.gValue,
        shadingFactor: w.shadingFactor,
      }));
    const coolingRadiationByOrientation = new Map<string, number>();
    for (const window of coolingWindowInputs) {
      const group = ORIENTATION_GROUP_BY_ENUM[window.orientation] ?? "south";
      const seasonRadiation = buildingRecord.climateRegion.monthlyNormals
        .filter((m) => !m.isHeatingSeasonMonth)
        .reduce((sum, m) => {
          const value =
            group === "south"
              ? (m.solarRadiationSouthKwhM2 ?? 0)
              : group === "north"
                ? (m.solarRadiationNorthKwhM2 ?? 0)
                : group === "east_west"
                  ? (m.solarRadiationEastWestKwhM2 ?? 0)
                  : group === "se_sw"
                    ? (m.solarRadiationSeSwKwhM2 ?? 0)
                    : group === "ne_nw"
                      ? (m.solarRadiationNeNwKwhM2 ?? 0)
                      : (m.solarRadiationHorizontalKwhM2 ?? 0);
          return sum + value;
        }, 0);
      coolingRadiationByOrientation.set(window.orientation, seasonRadiation);
    }
    const coolingSolarGainsKwh = calculateCoolingSolarGainsKwh(
      coolingWindowInputs,
      coolingRadiationByOrientation,
    );
    const coolingSeer = coolingSystemRows.find((c) => c.scenario === scenario)?.seer ?? 1;
    cooling.push(calculateCoolingResult(scenario, coolingSolarGainsKwh, 0, coolingSeer));

    const heatingAnnualNeedKwh =
      heatingEnergyBalance[heatingEnergyBalance.length - 1]?.annualNetEnergyNeedKwh ?? 0;
    const heatingDistributionLossKwh =
      distributionLoss.find((d) => d.scenario === scenario && d.systemType === "heating")
        ?.annualLossKwh ?? 0;
    const dhwAnnualNeedKwh = dhwDemand[dhwDemand.length - 1]?.totalKwh ?? 0;
    const dhwDistributionLossKwh =
      distributionLoss.find((d) => d.scenario === scenario && d.systemType === "dhw")
        ?.annualLossKwh ?? 0;

    for (const source of generationSourceRows.filter((g) => g.scenario === scenario)) {
      const usefulNeedKwh =
        source.endUse === "heating"
          ? heatingAnnualNeedKwh
          : source.endUse === "dhw"
            ? dhwAnnualNeedKwh
            : 0;
      const distributionLossForEndUseKwh =
        source.endUse === "heating"
          ? heatingDistributionLossKwh
          : source.endUse === "dhw"
            ? dhwDistributionLossKwh
            : 0;
      if (source.endUse === "cooling") continue; // cooling's electricity is computed directly via SEER above, not this (2-Eff) transform

      const sourceUsefulNeedKwh = usefulNeedKwh * source.shareOfDemand;
      const sourceDistributionLossKwh = distributionLossForEndUseKwh * source.shareOfDemand;
      const finalEnergyConsumptionKwh = calculateFinalEnergyConsumptionKwh(
        sourceUsefulNeedKwh,
        sourceDistributionLossKwh,
        source.efficiencyOrSeer,
      );

      generation.push({
        sourceId: source.id,
        endUse: source.endUse,
        scenario,
        usefulEnergyNeedKwh: sourceUsefulNeedKwh,
        shareOfDemand: source.shareOfDemand,
        distributionLossKwh: sourceDistributionLossKwh,
        efficiencyOrSeer: source.efficiencyOrSeer,
        finalEnergyConsumptionKwh,
        specificFinalEnergyKwhPerM2:
          heatedFloorAreaM2 > 0 ? finalEnergyConsumptionKwh / heatedFloorAreaM2 : 0,
      });
    }
  }

  const finalEnergyByEndUse: EndUseEnergyTotals[] = (["heating", "dhw"] as const).flatMap(
    (endUse) =>
      SCENARIOS.map((scenario) => ({
        endUse,
        scenario,
        finalEnergyConsumptionKwh: generation
          .filter((g) => g.endUse === endUse && g.scenario === scenario)
          .reduce((sum, g) => sum + g.finalEnergyConsumptionKwh, 0),
      })),
  );
  for (const scenario of SCENARIOS) {
    finalEnergyByEndUse.push({
      endUse: "cooling",
      scenario,
      finalEnergyConsumptionKwh:
        cooling.find((c) => c.scenario === scenario)?.electricalEnergyForCoolingKwh ?? 0,
    });
  }

  // --- Measures & financials ---
  const measureRows = await db.query.energyMeasure.findMany({
    where: eq(energyMeasure.buildingId, buildingId),
  });
  const tariffRows = await db.select().from(energyTariff).orderBy(desc(energyTariff.effectiveDate));
  const latestTariffByCarrier = new Map<string, (typeof tariffRows)[number]>();
  for (const tariff of tariffRows) {
    if (!latestTariffByCarrier.has(tariff.energyCarrier)) {
      latestTariffByCarrier.set(tariff.energyCarrier, tariff);
    }
  }

  const measures: EnergyMeasureResult[] = measureRows.map((measure) => {
    const savingsKwh = resolveMeasureStandardizedSavingsKwh(measure.category, {
      envelopeHeatLoss,
      ventilationLoss,
      distributionLoss,
      generation,
    });

    // TODO: lighting/equipment/PV/solar-DHW/EMS measures aren't modeled by this
    // pass of the audit engine (see docs/data-dictionary.md's "light pass"
    // sheets) — their savings default to 0 until LightingService/EquipmentService/
    // RenewableService are implemented.
    const tariff = latestTariffByCarrier.get(inferCarrierForMeasure(measure.category)) ?? {
      unitCostUsd: 0.05,
      emissionFactorKgCo2PerKwh: 0.3,
    };

    const { indicators: standardized } = calculateFinancialIndicators({
      investmentCostUsd: measure.investmentCostUsd,
      maintenanceCostPercent: measure.maintenanceCostPercent,
      firstYearAnnualSavingsUsd: savingsKwh * tariff.unitCostUsd,
      annualEscalationRate:
        ENERGY_ESCALATION_RATES[inferCarrierForMeasure(measure.category)] ?? 0.02,
      lifetimeYears: measure.lifetimeYears,
      discountRate: 0.04,
    });

    return {
      measureId: measure.id,
      name: measure.name,
      category: measure.category,
      investmentCostUsd: measure.investmentCostUsd,
      standardizedAnnualSavingsKwh: savingsKwh,
      standardizedAnnualSavingsUsd: savingsKwh * tariff.unitCostUsd,
      actualAnnualSavingsKwh: savingsKwh,
      actualAnnualSavingsUsd: savingsKwh * tariff.unitCostUsd,
      simplePaybackYears: standardized.simplePaybackYears,
      lifetimeYears: measure.lifetimeYears,
      co2ReductionTonnesPerYear: calculateCo2ReductionTonnesPerYear(
        savingsKwh,
        tariff.emissionFactorKgCo2PerKwh,
      ),
      proposedForImplementation: measure.proposedForImplementation,
      standardized,
      actual: standardized,
    };
  });

  const summary = buildAuditSummary(measures, heatedFloorAreaM2, finalEnergyByEndUse);

  return {
    buildingId,
    generatedAt: new Date().toISOString(),
    summary,
    envelopeAreas,
    envelopeHeatLoss,
    ventilationLoss,
    heatingEnergyBalance,
    dhwDemand,
    distributionLoss,
    cooling,
    generation,
    finalEnergyByEndUse,
    measures,
  };
}

/** Fallback for climate regions without a precise `heatingDaysInMonth` value. */
function daysInMonth(month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 30;
}

function inferCarrierForMeasure(
  category: string,
): "gas" | "electricity" | "district_heat" | "coal" {
  if (category === "gas_boiler_replacement" || category === "heating_system") return "gas";
  if (category === "lighting" || category === "equipment_replacement" || category === "pv")
    return "electricity";
  return "gas";
}

function resolveMeasureStandardizedSavingsKwh(
  category: string,
  context: {
    envelopeHeatLoss: EnvelopeHeatLossResult[];
    ventilationLoss: VentilationLossResult[];
    distributionLoss: DistributionLossResult[];
    generation: GenerationSourceResult[];
  },
): number {
  const before = context.envelopeHeatLoss.find((r) => r.scenario === "before");
  const after = context.envelopeHeatLoss.find((r) => r.scenario === "after");
  const categoryDelta = (key: string) =>
    (before?.annualByCategory[key] ?? 0) - (after?.annualByCategory[key] ?? 0);

  switch (category) {
    case "envelope_wall_insulation":
      return (
        categoryDelta("external_wall") +
        categoryDelta("socle_heated") +
        categoryDelta("socle_unheated") +
        categoryDelta("socle_ground")
      );
    case "envelope_roof_insulation":
      return categoryDelta("roof");
    case "envelope_floor_insulation":
      return categoryDelta("floor");
    case "window_replacement":
      return categoryDelta("window") + categoryDelta("door");
    case "mechanical_ventilation_heat_recovery": {
      const beforeVent = context.ventilationLoss.find((r) => r.scenario === "before");
      const afterVent = context.ventilationLoss.find((r) => r.scenario === "after");
      return (beforeVent?.mechanicalAnnualKwh ?? 0) - (afterVent?.mechanicalAnnualKwh ?? 0);
    }
    case "heating_system": {
      const beforeDist = context.distributionLoss.find(
        (r) => r.scenario === "before" && r.systemType === "heating",
      );
      const afterDist = context.distributionLoss.find(
        (r) => r.scenario === "after" && r.systemType === "heating",
      );
      return (beforeDist?.annualLossKwh ?? 0) - (afterDist?.annualLossKwh ?? 0);
    }
    case "gas_boiler_replacement": {
      const beforeGen = context.generation.filter(
        (g) => g.scenario === "before" && g.endUse === "heating",
      );
      const afterGen = context.generation.filter(
        (g) => g.scenario === "after" && g.endUse === "heating",
      );
      const sum = (rows: GenerationSourceResult[]) =>
        rows.reduce((s, r) => s + r.finalEnergyConsumptionKwh, 0);
      return sum(beforeGen) - sum(afterGen);
    }
    default:
      return 0;
  }
}

function buildAuditSummary(
  measures: EnergyMeasureResult[],
  heatedFloorAreaM2: number,
  finalEnergyByEndUse: EndUseEnergyTotals[],
): AuditSummary {
  const currentTotalKwh = finalEnergyByEndUse
    .filter((e) => e.scenario === "before")
    .reduce((sum, e) => sum + e.finalEnergyConsumptionKwh, 0);
  const potentialTotalKwh = finalEnergyByEndUse
    .filter((e) => e.scenario === "after")
    .reduce((sum, e) => sum + e.finalEnergyConsumptionKwh, 0);

  const totalInvestmentUsd = measures
    .filter((m) => m.proposedForImplementation)
    .reduce((sum, m) => sum + m.investmentCostUsd, 0);
  const totalAnnualSavingsUsd = measures
    .filter((m) => m.proposedForImplementation)
    .reduce((sum, m) => sum + m.standardizedAnnualSavingsUsd, 0);
  const co2ReductionTonnesPerYear = measures
    .filter((m) => m.proposedForImplementation)
    .reduce((sum, m) => sum + m.co2ReductionTonnesPerYear, 0);

  return {
    currentEnergyUseKwhPerM2Year: heatedFloorAreaM2 > 0 ? currentTotalKwh / heatedFloorAreaM2 : 0,
    potentialEnergyUseKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? potentialTotalKwh / heatedFloorAreaM2 : 0,
    potentialSavingsKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? (currentTotalKwh - potentialTotalKwh) / heatedFloorAreaM2 : 0,
    co2ReductionTonnesPerYear,
    totalInvestmentUsd,
    totalAnnualSavingsUsd,
    simplePaybackYears:
      totalAnnualSavingsUsd > 0 ? totalInvestmentUsd / totalAnnualSavingsUsd : null,
  };
}
