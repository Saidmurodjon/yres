import { type Database, LAMP_TYPE_NAMES } from "@yres/db";
import type {
  AuditResult,
  AuditSummary,
  CashflowYear,
  CoolingResult,
  DhwDemandResult,
  DistributionLossResult,
  EndUseEnergyTotals,
  EnergyBalanceRow,
  EnergyCarrier,
  EnergyMeasureResult,
  EnvelopeHeatLossResult,
  EquipmentResult,
  GenerationSourceResult,
  HeatingEnergyBalanceResult,
  LampPowerDensityWPerM2,
  LightingResult,
  MeasureBalanceRow,
  MeasureCategory,
  MeasurePackageTotals,
  NonEeMeasureResult,
  RenewableProductionResult,
  Scenario,
  SpecificConsumptionRow,
  VentilationLossResult,
} from "@yres/types";
import { type AuditInputs, loadAuditInputs } from "./audit-inputs";
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
import { type EquipmentItemInput, calculateEquipmentResult } from "./equipment.service";
import {
  calculateCo2ReductionTonnesPerYear,
  calculateFinancialIndicators,
  calculateIrr,
  deriveFinancialAssumptions,
} from "./financial.service";
import {
  type SolarApertureInput,
  type SolarOrientationGroup,
  calculateHeatingEnergyBalance,
} from "./gain.service";
import {
  calculateFinalEnergyConsumptionKwh,
  calculateUnpipedDistributionLossKwh,
} from "./generation.service";
import {
  type HeatLossBuildingParams,
  type MonthlyClimateInput,
  calculateEnvelopeHeatLoss,
} from "./heatloss.service";
import { type LightingZoneInput, calculateLightingResult } from "./lighting.service";
import {
  type GenerationRow,
  type SavingsContext,
  calculateGainsUtilizationCorrection,
  deriveBaselineHeating,
  resolveMeasureSavings,
} from "./measure-savings.service";
import { type RenewableSystemInput, calculateRenewableProduction } from "./renewable.service";
import {
  calculateMechanicalAirFlowM3h,
  calculateMechanicalVentilationCoolingGainKwh,
  calculateMechanicalVentilationElectricalKwh,
  calculateNaturalAirFlowM3h,
  calculateVentilationLoss,
} from "./ventilation.service";

/** `EMS` sheet: flat 3% savings applied to each end-use's standardized need (`D5=C5*3%`, same pattern for DHW/Cooling/Lighting). */
const EMS_SAVINGS_RATE = 0.03;

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
  return computeAudit(await loadAuditInputs(db, buildingId), {
    generatedAt: new Date().toISOString(),
  });
}

/**
 * Pure, synchronous core of the audit: all calculation, no database. Takes the
 * already-loaded `AuditInputs` so the golden test can run it from a fixture.
 */
export function computeAudit(inputs: AuditInputs, options: { generatedAt: string }): AuditResult {
  const buildingRecord = {
    ...inputs.building,
    climateRegion: inputs.climateRegion,
    blocks: inputs.blocks,
  };
  const buildingId = inputs.building.id;
  const elementRows = inputs.envelopeElements;
  const constructionTypeRows = inputs.constructionTypes;
  const openingTypeRows = inputs.openingTypes;
  const surfaceResistanceRows = inputs.surfaceResistances;
  const ventilationSystemRows = inputs.ventilationSystems;
  const coolingWindowRows = inputs.coolingWindows;
  const coolingSystemRows = inputs.coolingSystems;
  const dhwSourceRows = inputs.dhwSources;
  const distributionSystemRows = inputs.distributionSystems;
  const pipeLossReferenceRows = inputs.pipeLossReferences;
  const generationSourceRows = inputs.generationSources;
  const lightingZoneRows = inputs.lightingZones;
  const lampTypeRows = inputs.lampTypes;
  const equipmentItemRows = inputs.equipmentItems;
  const renewableSystemRows = inputs.renewableSystems;
  const utilityBillRows = inputs.utilityBills;
  const measureRows = inputs.energyMeasures;
  const nonEeMeasureRows = inputs.nonEeMeasures;
  const tariffRows = inputs.tariffs;

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

  // v7.20 `Lighting!J8 = Building_data!D19 × D14`: lighting runs every working day of the year, not only
  // the heating season. Without working days the old heating-season figure is used and flagged.
  const warnings: string[] = [];
  const lightingOperationHours =
    buildingRecord.workingDaysPerYear != null
      ? buildingRecord.workingDaysPerYear * buildingRecord.operationHoursPerDay
      : operationHoursDuringHeatingSeason;
  if (buildingRecord.workingDaysPerYear == null) {
    warnings.push(
      "workingDaysPerYear is not set: lighting uses heating-season operating hours (understates annual lighting) and DHW demand uses calendar days instead of working days (overstates it).",
    );
  }

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
      code: ct.code,
      scenario: ct.scenario,
      retrofitOfId: ct.retrofitOfId,
      uValueWPerM2K: totalResistance > 0 ? 1 / totalResistance : 0,
    };
  });

  const openingTypeUValues: OpeningTypeUValueInput[] = openingTypeRows.map((ot) => ({
    id: ot.id,
    code: ot.code,
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

  // --- Distribution ---
  const pipeLossReferenceInputs: PipeLossReferenceRow[] = pipeLossReferenceRows.map((r) => ({
    diameterClass: r.diameterClass,
    insulated: r.insulated === "insulated",
    meanFluidTempC: r.meanFluidTempC,
    maxHeatFluxWPerM: r.maxHeatFluxWPerM,
  }));

  // --- Lighting ---
  const lampPowerDensityByName = new Map(lampTypeRows.map((l) => [l.name, l.powerDensityWPerM2]));
  const lampPowerDensity: LampPowerDensityWPerM2 = {
    incandescent: lampPowerDensityByName.get(LAMP_TYPE_NAMES.incandescent) ?? 0,
    fluorescentElectromagnetic:
      lampPowerDensityByName.get(LAMP_TYPE_NAMES.fluorescentElectromagnetic) ?? 0,
    fluorescentElectronic: lampPowerDensityByName.get(LAMP_TYPE_NAMES.fluorescentElectronic) ?? 0,
    led: lampPowerDensityByName.get(LAMP_TYPE_NAMES.led) ?? 0,
  };

  // --- Renewables (PV / Solar DHW) — not scenario-tagged: these represent a
  // proposed addition, so their production only ever offsets the "after"
  // scenario's totals (see buildAuditSummary).
  const renewableProduction = calculateRenewableProduction(
    renewableSystemRows.map(
      (r): RenewableSystemInput => ({
        systemType: r.systemType,
        monthlyProductionKwh: r.monthlyProduction.map((m) => m.productionKwh),
      }),
    ),
  );

  const envelopeHeatLoss: EnvelopeHeatLossResult[] = [];
  const ventilationLoss: VentilationLossResult[] = [];
  const heatingEnergyBalance: HeatingEnergyBalanceResult[] = [];
  const dhwDemand: DhwDemandResult[] = [];
  const distributionLoss: DistributionLossResult[] = [];
  const cooling: CoolingResult[] = [];
  const generation: GenerationSourceResult[] = [];
  const lighting: LightingResult[] = [];
  const equipment: EquipmentResult[] = [];

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
        buildingRecord.workingDaysPerYear,
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

    lighting.push(
      calculateLightingResult(
        scenario,
        lightingZoneRows
          .filter((z) => z.scenario === scenario)
          .map(
            (z): LightingZoneInput => ({
              areaM2: z.areaM2,
              technologyMix: z.technologyMix,
              utilizationFactor: z.utilizationFactor,
            }),
          ),
        lampPowerDensity,
        lightingOperationHours,
      ),
    );

    const equipmentResult = calculateEquipmentResult(
      scenario,
      equipmentItemRows
        .filter((e) => e.scenario === scenario)
        .map(
          (e): EquipmentItemInput => ({
            unitPowerKw: e.unitPowerKw,
            quantity: e.quantity,
            heatingSeasonHours: e.heatingSeasonHours,
            coolingSeasonHours: e.coolingSeasonHours,
            heatingUtilizationFactor: e.heatingUtilizationFactor,
            coolingUtilizationFactor: e.coolingUtilizationFactor,
          }),
        ),
    );
    equipment.push(equipmentResult);

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
    const coolingSystemRow = coolingSystemRows.find((c) => c.scenario === scenario);
    const coolingSeer = coolingSystemRow?.seer ?? 1;
    const mechVentCoolingGainKwh =
      mechanicalSystem?.coolingSeasonHours &&
      buildingRecord.coolingEnthalpyInsideKjKg != null &&
      buildingRecord.coolingEnthalpyOutsideKjKg != null
        ? calculateMechanicalVentilationCoolingGainKwh(
            mechanicalAirFlowM3h,
            buildingRecord.coolingEnthalpyInsideKjKg,
            buildingRecord.coolingEnthalpyOutsideKjKg,
            mechanicalSystem.coolingSeasonHours,
            heatRecoveryEfficiency,
          )
        : 0;
    cooling.push(
      calculateCoolingResult(
        scenario,
        coolingSolarGainsKwh,
        equipmentResult.coolingSeasonConsumptionKwh,
        mechVentCoolingGainKwh,
        coolingSeer,
        coolingSystemRow?.distributionEfficiency ?? 1,
      ),
    );

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
      // An end-use with pipe segments keeps the pipe calculation; otherwise the source's own
      // distribution efficiency applies (never both — that would double-count the loss).
      const hasPipeSegments = distributionSystemRows.some(
        (d) =>
          d.scenario === scenario &&
          d.systemType === (source.endUse === "heating" ? "heating" : "dhw"),
      );
      const distributionLossForEndUseKwh =
        source.endUse === "heating"
          ? heatingDistributionLossKwh
          : source.endUse === "dhw"
            ? dhwDistributionLossKwh
            : 0;
      if (source.endUse === "cooling") continue; // cooling's electricity is computed directly via SEER above

      const sourceUsefulNeedKwh = usefulNeedKwh * source.shareOfDemand;
      const sourceDistributionLossKwh = hasPipeSegments
        ? distributionLossForEndUseKwh * source.shareOfDemand
        : calculateUnpipedDistributionLossKwh(sourceUsefulNeedKwh, source.distributionEfficiency);
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

  // --- Energy balance breakdown ("Breakdown Baseline & Balance" sheet's
  // per-component rows): envelope/ventilation losses are the gross,
  // pre-generation thermal demand, kept separate from the final-energy rows
  // below (see EnergyBalanceSection's doc comment for why they don't sum
  // together into one total).
  const generationSourceById = new Map(generationSourceRows.map((s) => [s.id, s]));
  const energyBalanceBreakdown: EnergyBalanceRow[] = [];
  const envelopeCategories = new Set<string>();
  for (const scenario of SCENARIOS) {
    const byCategory =
      envelopeHeatLoss.find((e) => e.scenario === scenario)?.annualByCategory ?? {};
    for (const category of Object.keys(byCategory)) envelopeCategories.add(category);
  }
  for (const category of envelopeCategories) {
    energyBalanceBreakdown.push({
      category,
      section: "envelope_ventilation_loss",
      beforeKwh:
        envelopeHeatLoss.find((e) => e.scenario === "before")?.annualByCategory[category] ?? 0,
      afterKwh:
        envelopeHeatLoss.find((e) => e.scenario === "after")?.annualByCategory[category] ?? 0,
    });
  }
  energyBalanceBreakdown.push({
    category: "ventilation",
    section: "envelope_ventilation_loss",
    beforeKwh: sumVentilationThermalLossKwh(ventilationLoss, "before"),
    afterKwh: sumVentilationThermalLossKwh(ventilationLoss, "after"),
  });

  for (const [category, carrierFilter] of [
    ["thermal_generation", (c: string) => c !== "electricity"],
    ["electrical_generation", (c: string) => c === "electricity"],
  ] as const) {
    energyBalanceBreakdown.push({
      category,
      section: "final_energy",
      beforeKwh: sumGenerationByCarrier(generation, generationSourceById, "before", carrierFilter),
      afterKwh: sumGenerationByCarrier(generation, generationSourceById, "after", carrierFilter),
    });
  }
  energyBalanceBreakdown.push({
    category: "lighting",
    section: "final_energy",
    beforeKwh: lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0,
    afterKwh: lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? 0,
  });
  energyBalanceBreakdown.push({
    category: "equipment",
    section: "final_energy",
    beforeKwh: equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0,
    afterKwh: equipment.find((e) => e.scenario === "after")?.annualConsumptionKwh ?? 0,
  });
  energyBalanceBreakdown.push({
    category: "cooling",
    section: "final_energy",
    beforeKwh: cooling.find((c) => c.scenario === "before")?.electricalEnergyForCoolingKwh ?? 0,
    afterKwh: cooling.find((c) => c.scenario === "after")?.electricalEnergyForCoolingKwh ?? 0,
  });
  for (const production of renewableProduction) {
    energyBalanceBreakdown.push({
      category: `${production.systemType}_production`,
      section: "renewable_offset",
      beforeKwh: 0,
      afterKwh: production.annualProductionKwh,
    });
  }

  // --- Baseline calibration ("Breakdown Baseline & Balance" sheet's "ratio"
  // column): the standardized model is built from nameplate/nominal inputs
  // (design U-values, rated efficiencies, occupancy assumptions), which
  // rarely matches what the building actually purchased. Comparing the
  // "before" scenario's theoretical need against the metered baseline, per
  // carrier, gives a calibration factor applied to every measure's
  // standardized savings — the same theoretical kWh saved is worth more or
  // less depending on how the model over/under-shoots reality for that fuel.
  const theoreticalBeforeKwhByCarrier = new Map<string, number>();
  const addTheoretical = (carrier: string, kwh: number) => {
    theoreticalBeforeKwhByCarrier.set(
      carrier,
      (theoreticalBeforeKwhByCarrier.get(carrier) ?? 0) + kwh,
    );
  };
  for (const g of generation.filter((g) => g.scenario === "before")) {
    const sourceType = generationSourceById.get(g.sourceId)?.sourceType;
    const carrier = sourceType && carrierForGenerationSourceType(sourceType);
    if (carrier) addTheoretical(carrier, g.finalEnergyConsumptionKwh);
  }
  addTheoretical(
    "electricity",
    lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0,
  );
  addTheoretical(
    "electricity",
    equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0,
  );
  addTheoretical(
    "electricity",
    cooling.find((c) => c.scenario === "before")?.electricalEnergyForCoolingKwh ?? 0,
  );

  const actualKwhByCarrierYear = new Map<string, Map<number, number>>();
  for (const bill of utilityBillRows) {
    if (bill.consumptionKwh == null) continue;
    const byYear = actualKwhByCarrierYear.get(bill.energyCarrier) ?? new Map<number, number>();
    byYear.set(bill.year, (byYear.get(bill.year) ?? 0) + bill.consumptionKwh);
    actualKwhByCarrierYear.set(bill.energyCarrier, byYear);
  }

  const baselineRatioByCarrier = new Map<string, number>();
  for (const [carrier, byYear] of actualKwhByCarrierYear) {
    const years = [...byYear.values()];
    const actualAverageKwh = years.reduce((sum, v) => sum + v, 0) / years.length;
    const theoreticalKwh = theoreticalBeforeKwhByCarrier.get(carrier) ?? 0;
    // No standardized counterpart, or no bills at all for this carrier: leave
    // it uncalibrated (ratio 1) rather than dividing by zero or guessing.
    if (theoreticalKwh > 0) baselineRatioByCarrier.set(carrier, actualAverageKwh / theoreticalKwh);
  }

  // --- Specific consumption summary ("Breakdown Baseline & Balance" sheet's
  // rows 28-31): actual (bill-calibrated) vs. standardized-before vs.
  // standardized-after, kWh/m2/year, split heating/DHW/electricity. The
  // source sheet hardcodes heating=gas-metered/DHW=district-heat-metered for
  // its one specific building, which doesn't generalize — instead, "actual"
  // here calibrates each "before" generation source by its own carrier's
  // baseline ratio, so a mixed-carrier building (e.g. gas heating + electric
  // DHW) calibrates each end-use against the carrier it actually draws from.
  const specificConsumptionSummary: SpecificConsumptionRow[] = (["heating", "dhw"] as const).map(
    (endUse) => {
      const standardizedBeforeKwh =
        finalEnergyByEndUse.find((e) => e.endUse === endUse && e.scenario === "before")
          ?.finalEnergyConsumptionKwh ?? 0;
      const standardizedAfterKwh =
        finalEnergyByEndUse.find((e) => e.endUse === endUse && e.scenario === "after")
          ?.finalEnergyConsumptionKwh ?? 0;
      const actualKwh = generation
        .filter((g) => g.scenario === "before" && g.endUse === endUse)
        .reduce((sum, g) => {
          const sourceType = generationSourceById.get(g.sourceId)?.sourceType;
          const carrier = sourceType && carrierForGenerationSourceType(sourceType);
          const ratio = (carrier && baselineRatioByCarrier.get(carrier)) ?? 1;
          return sum + g.finalEnergyConsumptionKwh * ratio;
        }, 0);
      return {
        endUse,
        actualKwhPerM2Year: heatedFloorAreaM2 > 0 ? actualKwh / heatedFloorAreaM2 : 0,
        standardizedBeforeKwhPerM2Year:
          heatedFloorAreaM2 > 0 ? standardizedBeforeKwh / heatedFloorAreaM2 : 0,
        standardizedAfterKwhPerM2Year:
          heatedFloorAreaM2 > 0 ? standardizedAfterKwh / heatedFloorAreaM2 : 0,
      };
    },
  );
  const electricityStandardizedBeforeKwh =
    (lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0) +
    (equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0) +
    (cooling.find((c) => c.scenario === "before")?.electricalEnergyForCoolingKwh ?? 0);
  const electricityStandardizedAfterKwh =
    (lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? 0) +
    (equipment.find((e) => e.scenario === "after")?.annualConsumptionKwh ?? 0) +
    (cooling.find((c) => c.scenario === "after")?.electricalEnergyForCoolingKwh ?? 0);
  const electricityRatio = baselineRatioByCarrier.get("electricity") ?? 1;
  specificConsumptionSummary.push({
    endUse: "electricity",
    actualKwhPerM2Year:
      heatedFloorAreaM2 > 0
        ? (electricityStandardizedBeforeKwh * electricityRatio) / heatedFloorAreaM2
        : 0,
    standardizedBeforeKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? electricityStandardizedBeforeKwh / heatedFloorAreaM2 : 0,
    standardizedAfterKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? electricityStandardizedAfterKwh / heatedFloorAreaM2 : 0,
  });

  // --- Measures & financials ---
  // Non-EE (ancillary) measures: `Non-EE measures` sheet — costs that add to
  // total project investment (`Measures_summary!D30/D31`) but never
  // generate energy savings, so they get no financial-indicator treatment.
  const nonEeMeasures: NonEeMeasureResult[] = nonEeMeasureRows.map((row) => ({
    id: row.id,
    description: row.description,
    unit: row.unit,
    quantity: row.quantity,
    unitCostUsd: row.unitCostUsd,
    totalCostUsd: row.quantity * row.unitCostUsd,
    proposedForImplementation: row.proposedForImplementation,
  }));
  // CO2 factors still come from the reference tariff table; money comes from the building's
  // financial parameters (v7.20 `Financial parameters`).
  const latestTariffByCarrier = new Map<string, (typeof tariffRows)[number]>();
  for (const tariff of tariffRows) {
    if (!latestTariffByCarrier.has(tariff.energyCarrier)) {
      latestTariffByCarrier.set(tariff.energyCarrier, tariff);
    }
  }
  const financialAssumptions = deriveFinancialAssumptions(inputs.financialParameters);

  warnings.push(...collectMeasureTargetWarnings(measureRows, inputs));

  const generationRows: GenerationRow[] = generation.map((g) => {
    const sourceType = generationSourceById.get(g.sourceId)?.sourceType;
    return { ...g, carrier: (sourceType && carrierForGenerationSourceType(sourceType)) || null };
  });
  const baselineHeating = deriveBaselineHeating(generationRows);
  const gainsUtilizationCorrection = calculateGainsUtilizationCorrection(
    heatingEnergyBalance,
    envelopeHeatLoss,
    ventilationLoss,
  );
  const savingsContext: SavingsContext = {
    envelopeHeatLoss,
    ventilationLoss,
    distributionLoss,
    generation: generationRows,
    lighting,
    equipment,
    renewableProduction,
    heatingEnergyBalance,
    dhwDemand,
    cooling,
    baselineHeating,
    gainsUtilizationCorrection,
    emsSavingsRate: EMS_SAVINGS_RATE,
  };

  const measures: EnergyMeasureResult[] = measureRows.map((measure) => {
    const savings = resolveMeasureSavings(measure.category, measure.targets, savingsContext);
    if (
      !baselineHeating.derived &&
      savings.parts.length > 0 &&
      (ENVELOPE_MEASURE_CATEGORIES.has(measure.category) ||
        measure.category === "heating_system" ||
        measure.category === "mechanical_ventilation_heat_recovery")
    ) {
      warnings.push(
        `Measure "${measure.name}": no heating source with a billed carrier in the "before" state — useful heat was priced as gas at 100 % efficiency.`,
      );
    }

    const unpriced = new Set<string>();
    const priced = savings.parts.map((part) => {
      const usdPerKwh = financialAssumptions.usdPerKwh[part.carrier];
      if (usdPerKwh == null) unpriced.add(part.carrier);
      const ratio = baselineRatioByCarrier.get(part.carrier) ?? 1;
      const valuePerKwh = usdPerKwh ?? 0;
      return {
        carrier: part.carrier,
        standardizedKwh: part.kwh,
        standardizedUsd: part.kwh * valuePerKwh,
        actualKwh: part.kwh * ratio,
        actualUsd: part.kwh * ratio * valuePerKwh,
      };
    });
    for (const carrier of unpriced) {
      warnings.push(
        `Measure "${measure.name}": no ${carrier} tariff could be derived (missing price or calorific value) — its savings are not valued in USD.`,
      );
    }

    const cashflowInput = (usdOf: (p: (typeof priced)[number]) => number) => ({
      investmentCostUsd: measure.investmentCostUsd,
      maintenanceRate: measure.maintenanceCostPercent,
      savingsUsdByCarrier: priced.reduce<Partial<Record<EnergyCarrier, number>>>((acc, p) => {
        acc[p.carrier] = (acc[p.carrier] ?? 0) + usdOf(p);
        return acc;
      }, {}),
      escalationByCarrier: financialAssumptions.nominalEscalation,
      maintenanceEscalation: financialAssumptions.maintenanceEscalation,
      periodYears: financialAssumptions.periodYears,
      discountRate: financialAssumptions.nominalDiscountRate,
      irrInitialGuess: financialAssumptions.irrInitialGuess,
    });

    // NPV/IRR are not linear in savings: standardized and actual each get their own cashflow.
    const { indicators: standardized, cashflow: standardizedCashflow } =
      calculateFinancialIndicators(cashflowInput((p) => p.standardizedUsd));
    const { indicators: actual, cashflow: actualCashflow } = calculateFinancialIndicators(
      cashflowInput((p) => p.actualUsd),
    );

    const sum = (pick: (p: (typeof priced)[number]) => number) =>
      priced.reduce((total, p) => total + pick(p), 0);
    const co2Tonnes = priced.reduce((total, p) => {
      const factor = latestTariffByCarrier.get(p.carrier)?.emissionFactorKgCo2PerKwh ?? 0.3;
      return total + calculateCo2ReductionTonnesPerYear(p.standardizedKwh, factor);
    }, 0);

    return {
      measureId: measure.id,
      name: measure.name,
      category: measure.category,
      investmentCostUsd: measure.investmentCostUsd,
      usefulSavingsKwh: savings.usefulKwh,
      savingsByCarrier: priced,
      standardizedAnnualSavingsKwh: sum((p) => p.standardizedKwh),
      standardizedAnnualSavingsUsd: sum((p) => p.standardizedUsd),
      actualAnnualSavingsKwh: sum((p) => p.actualKwh),
      actualAnnualSavingsUsd: sum((p) => p.actualUsd),
      simplePaybackYears: standardized.simplePaybackYears,
      lifetimeYears: measure.lifetimeYears,
      co2ReductionTonnesPerYear: co2Tonnes,
      proposedForImplementation: measure.proposedForImplementation,
      standardized,
      actual,
      standardizedCashflow,
      actualCashflow,
    };
  });

  const summary = buildAuditSummary(
    measures,
    nonEeMeasures,
    heatedFloorAreaM2,
    finalEnergyByEndUse,
    lighting,
    equipment,
    renewableProduction,
  );

  return {
    buildingId,
    generatedAt: options.generatedAt,
    warnings,
    financialAssumptions,
    gainsUtilizationCorrection,
    summary,
    measureBalance: buildMeasureBalance(
      measures,
      measureRows,
      generationRows,
      lighting,
      equipment,
      cooling,
      renewableProduction,
      baselineHeating.shares,
    ),
    envelopeAreas,
    envelopeHeatLoss,
    ventilationLoss,
    heatingEnergyBalance,
    dhwDemand,
    distributionLoss,
    cooling,
    generation,
    lighting,
    equipment,
    renewableProduction,
    finalEnergyByEndUse,
    energyBalanceBreakdown,
    specificConsumptionSummary,
    measures,
    nonEeMeasures,
  };
}

/** Fallback for climate regions without a precise `heatingDaysInMonth` value. */
function daysInMonth(month: number): number {
  const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1] ?? 30;
}

/**
 * Maps a `generationSource` row's `sourceType` to the purchased-energy
 * carrier it's billed under, for baseline calibration against utility bills.
 * Returns `null` for source types that don't correspond to any of the four
 * billed carriers: "solar_dhw" here is an existing solar-thermal system
 * already meeting part of DHW demand — free collected energy, never
 * metered — and "other" is genuinely unknown, so guessing a carrier for it
 * would silently miscalibrate that carrier's ratio instead of leaving it at
 * the safe default of 1.
 */
function carrierForGenerationSourceType(
  sourceType: string,
): "gas" | "electricity" | "district_heat" | "coal" | null {
  switch (sourceType) {
    case "gas_boiler":
      return "gas";
    case "electric_boiler":
    case "heat_pump":
    case "split_ac":
    case "centralized_ac":
      return "electricity";
    case "district_heating":
      return "district_heat";
    default:
      return null;
  }
}

/** `VentilationLossResult.totalKwh` mixes in the mechanical fan's own electrical draw; this sums just the thermal (heat) loss for one scenario, for the energy balance breakdown's envelope+ventilation section. */
function sumVentilationThermalLossKwh(
  ventilationLoss: VentilationLossResult[],
  scenario: Scenario,
): number {
  const result = ventilationLoss.find((v) => v.scenario === scenario);
  if (!result) return 0;
  return result.naturalAnnualKwh + result.mechanicalAnnualKwh;
}

/** Sums `generation`'s final (purchased) energy for one scenario, restricted to sources whose carrier passes `carrierFilter` — used to split the same heating+DHW generation total into thermal-carrier vs electric-carrier rows. */
function sumGenerationByCarrier(
  generation: GenerationSourceResult[],
  generationSourceById: Map<string, { sourceType: string }>,
  scenario: Scenario,
  carrierFilter: (carrier: string) => boolean,
): number {
  return generation
    .filter((g) => g.scenario === scenario)
    .reduce((sum, g) => {
      const sourceType = generationSourceById.get(g.sourceId)?.sourceType;
      const carrier = sourceType && carrierForGenerationSourceType(sourceType);
      return carrier && carrierFilter(carrier) ? sum + g.finalEnergyConsumptionKwh : sum;
    }, 0);
}

function buildAuditSummary(
  measures: EnergyMeasureResult[],
  nonEeMeasures: NonEeMeasureResult[],
  heatedFloorAreaM2: number,
  finalEnergyByEndUse: EndUseEnergyTotals[],
  lighting: LightingResult[],
  equipment: EquipmentResult[],
  renewableProduction: RenewableProductionResult[],
): AuditSummary {
  // Lighting and equipment are direct final electricity consumption (no
  // generation/distribution conversion applies to them the way it does for
  // heating/DHW/cooling), so they're summed in here rather than folded into
  // `finalEnergyByEndUse` (whose `EndUse` type is specifically the three
  // end-uses that go through a `generationSource`).
  const lightingEquipmentKwh = (scenario: "before" | "after") =>
    (lighting.find((l) => l.scenario === scenario)?.annualConsumptionKwh ?? 0) +
    (equipment.find((e) => e.scenario === scenario)?.annualConsumptionKwh ?? 0);

  const currentTotalKwh =
    finalEnergyByEndUse
      .filter((e) => e.scenario === "before")
      .reduce((sum, e) => sum + e.finalEnergyConsumptionKwh, 0) + lightingEquipmentKwh("before");

  // PV/Solar DHW production only ever represents a proposed addition (no
  // "before" state — see renewable.service.ts), so it offsets the "after"
  // total only, clamped at 0 rather than going negative.
  const renewableOffsetKwh = renewableProduction.reduce((sum, r) => sum + r.annualProductionKwh, 0);
  const potentialTotalKwh = Math.max(
    0,
    finalEnergyByEndUse
      .filter((e) => e.scenario === "after")
      .reduce((sum, e) => sum + e.finalEnergyConsumptionKwh, 0) +
      lightingEquipmentKwh("after") -
      renewableOffsetKwh,
  );

  // `Measures_summary!38/39`: v7.20 `D39` sums only the "Yes" rows of the `Non-EE measures` "Q" column
  // (the column defaults to true for rows saved before F06).
  const all = buildPackageTotals(measures, nonEeMeasures);
  const proposed = buildPackageTotals(
    measures.filter((m) => m.proposedForImplementation),
    nonEeMeasures.filter((m) => m.proposedForImplementation),
  );

  return {
    currentEnergyUseKwhPerM2Year: heatedFloorAreaM2 > 0 ? currentTotalKwh / heatedFloorAreaM2 : 0,
    potentialEnergyUseKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? potentialTotalKwh / heatedFloorAreaM2 : 0,
    potentialSavingsKwhPerM2Year:
      heatedFloorAreaM2 > 0 ? (currentTotalKwh - potentialTotalKwh) / heatedFloorAreaM2 : 0,
    co2ReductionTonnesPerYear: proposed.co2ReductionTonnesPerYear,
    totalInvestmentUsd: proposed.investmentUsd,
    totalNonEeMeasureCostUsd: proposed.nonEeCostUsd,
    totalAnnualSavingsUsd: proposed.standardizedSavingsUsd,
    simplePaybackYears: proposed.simplePaybackStandardizedYears,
    all,
    proposed,
  };
}

/**
 * One totals row. Non-EE costs are year-0 outflows without savings, so the package NPV is Σ measure NPV − cost
 * (`Measures_summary!N38`), and the package IRR comes from the summed net flows with that cost added to year 0.
 * The IRR is not checked against the workbook (v7.20 has no package IRR in the golden fixture).
 */
function buildPackageTotals(
  measures: EnergyMeasureResult[],
  nonEeMeasures: NonEeMeasureResult[],
): MeasurePackageTotals {
  const sum = (pick: (m: EnergyMeasureResult) => number) =>
    measures.reduce((total, m) => total + pick(m), 0);
  const nonEeCostUsd = nonEeMeasures.reduce((total, m) => total + m.totalCostUsd, 0);
  const investmentUsd = sum((m) => m.investmentCostUsd) + nonEeCostUsd;
  const standardizedSavingsUsd = sum((m) => m.standardizedAnnualSavingsUsd);
  const actualSavingsUsd = sum((m) => m.actualAnnualSavingsUsd);

  const packageIrr = (pick: (m: EnergyMeasureResult) => CashflowYear[]): number | null => {
    const flows = measures.map(pick);
    const years = Math.max(0, ...flows.map((f) => f.length));
    if (years === 0 || investmentUsd <= 0) return null;
    const net = Array.from({ length: years }, (_, t) =>
      flows.reduce((total, f) => total + (f[t]?.netCashflow ?? 0), t === 0 ? -nonEeCostUsd : 0),
    );
    return calculateIrr(
      net.map((netCashflow, year) => ({
        year,
        capex: 0,
        grossSavings: 0,
        maintenanceCost: 0,
        netCashflow,
        discountedNetCashflow: 0,
        cumulativeDiscountedCashflow: 0,
      })),
    );
  };

  return {
    investmentUsd,
    nonEeCostUsd,
    standardizedSavingsKwh: sum((m) => m.standardizedAnnualSavingsKwh),
    standardizedSavingsUsd,
    actualSavingsKwh: sum((m) => m.actualAnnualSavingsKwh),
    actualSavingsUsd,
    simplePaybackStandardizedYears:
      standardizedSavingsUsd > 0 ? investmentUsd / standardizedSavingsUsd : null,
    simplePaybackActualYears: actualSavingsUsd > 0 ? investmentUsd / actualSavingsUsd : null,
    co2ReductionTonnesPerYear: sum((m) => m.co2ReductionTonnesPerYear),
    npvStandardizedUsd: sum((m) => m.standardized.npv) - nonEeCostUsd,
    npvActualUsd: sum((m) => m.actual.npv) - nonEeCostUsd,
    irrStandardized: packageIrr((m) => m.standardizedCashflow),
    irrActual: packageIrr((m) => m.actualCashflow),
  };
}

/**
 * v7.20 `D67:F68`: Σ over ALL measures (not only proposed) of the per-carrier savings vs the scenario's
 * before − after final energy. The scenario delta counts what the "after" state saves (generation, lighting,
 * equipment, cooling), plus PV/solar-DHW production and the EMS measures' own savings — neither is part of
 * the "after" end-use model. `ok` when |diff| < 1 %, or < 10 kWh for electricity (`F68`).
 */
function buildMeasureBalance(
  measures: EnergyMeasureResult[],
  measureRows: AuditInputs["energyMeasures"],
  generation: GenerationRow[],
  lighting: LightingResult[],
  equipment: EquipmentResult[],
  cooling: CoolingResult[],
  renewableProduction: RenewableProductionResult[],
  baselineShares: { carrier: EnergyCarrier; share: number }[],
): MeasureBalanceRow[] {
  const carriers: EnergyCarrier[] = ["gas", "electricity", "district_heat", "coal"];
  const delta = new Map<EnergyCarrier, number>();
  const add = (carrier: EnergyCarrier, kwh: number) =>
    delta.set(carrier, (delta.get(carrier) ?? 0) + kwh);

  for (const g of generation) {
    if (!g.carrier || g.endUse === "cooling") continue;
    add(g.carrier, (g.scenario === "before" ? 1 : -1) * g.finalEnergyConsumptionKwh);
  }
  const electric = (rows: { scenario: Scenario }[], pick: (row: never) => number) =>
    rows.reduce(
      (total, row) => total + (row.scenario === "before" ? 1 : -1) * pick(row as never),
      0,
    );
  add(
    "electricity",
    electric(lighting, (r: LightingResult) => r.annualConsumptionKwh),
  );
  add(
    "electricity",
    electric(equipment, (r: EquipmentResult) => r.annualConsumptionKwh),
  );
  add(
    "electricity",
    electric(cooling, (r: CoolingResult) => r.electricalEnergyForCoolingKwh),
  );
  for (const production of renewableProduction) {
    if (production.systemType === "pv") add("electricity", production.annualProductionKwh);
    else {
      const dhwBefore = generation.filter(
        (g) => g.scenario === "before" && g.endUse === "dhw" && g.carrier != null,
      );
      const total = dhwBefore.reduce((s, g) => s + g.finalEnergyConsumptionKwh, 0);
      if (total > 0) {
        for (const g of dhwBefore) {
          if (g.carrier)
            add(g.carrier, (production.annualProductionKwh * g.finalEnergyConsumptionKwh) / total);
        }
      } else {
        for (const s of baselineShares) add(s.carrier, production.annualProductionKwh * s.share);
      }
    }
  }
  measureRows.forEach((row, i) => {
    if (row.category !== "ems") return;
    for (const part of measures[i]?.savingsByCarrier ?? []) add(part.carrier, part.standardizedKwh);
  });

  return carriers.map((carrier) => {
    const sumOfMeasuresKwh = measures.reduce(
      (total, m) =>
        total +
        m.savingsByCarrier
          .filter((p) => p.carrier === carrier)
          .reduce((s, p) => s + p.standardizedKwh, 0),
      0,
    );
    const scenarioDeltaKwh = delta.get(carrier) ?? 0;
    const diff = sumOfMeasuresKwh - scenarioDeltaKwh;
    const diffPct = scenarioDeltaKwh !== 0 ? (diff / scenarioDeltaKwh) * 100 : diff === 0 ? 0 : 100;
    const ok = Math.abs(diffPct) < 1 || (carrier === "electricity" && Math.abs(diff) < 10);
    return {
      carrier,
      sumOfMeasuresKwh,
      scenarioDeltaKwh,
      diffPct,
      status: ok ? "ok" : "check",
    };
  });
}

const ENVELOPE_MEASURE_CATEGORIES: ReadonlySet<MeasureCategory> = new Set([
  "envelope_wall_insulation",
  "envelope_roof_insulation",
  "envelope_floor_insulation",
  "window_replacement",
]);

/**
 * F06a: envelope measures say which "before" construction/opening types they replace. A measure with no
 * targets (legacy data) still gets the whole category delta, so two of them in one category count that delta
 * twice — flag every one. A target code that no longer exists in the "before" state is flagged, never a silent 0.
 */
function collectMeasureTargetWarnings(
  measureRows: AuditInputs["energyMeasures"],
  inputs: AuditInputs,
): string[] {
  const out: string[] = [];
  const beforeCodes = {
    construction_type: new Set(
      inputs.constructionTypes.filter((t) => t.scenario === "before").map((t) => t.code),
    ),
    opening_type: new Set(
      inputs.openingTypes.filter((t) => t.scenario === "before").map((t) => t.code),
    ),
  };
  const untargetedPerCategory = new Map<string, number>();
  for (const m of measureRows) {
    if (ENVELOPE_MEASURE_CATEGORIES.has(m.category) && m.targets.length === 0) {
      untargetedPerCategory.set(m.category, (untargetedPerCategory.get(m.category) ?? 0) + 1);
    }
  }
  for (const m of measureRows) {
    if (!ENVELOPE_MEASURE_CATEGORIES.has(m.category)) continue;
    if (m.targets.length === 0) {
      const duplicates = (untargetedPerCategory.get(m.category) ?? 0) > 1;
      out.push(
        `Measure "${m.name}": no construction/opening types selected — the whole ${m.category} category was counted${duplicates ? ", and another measure in the same category has no targets either (double counting risk)" : ""}.`,
      );
      continue;
    }
    for (const t of m.targets) {
      if (!beforeCodes[t.kind].has(t.code)) {
        out.push(
          `Measure "${m.name}": target ${t.kind} "${t.code}" does not exist in the current ("before") envelope.`,
        );
      }
    }
  }
  return out;
}
