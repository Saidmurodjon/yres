import {
  LAMP_TYPE_NAMES,
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
  equipmentItem,
  generationSource,
  lampType,
  lightingZone,
  nonEeMeasure,
  openingType,
  pipeLossReference,
  renewableSystem,
  surfaceResistance,
  utilityBill,
  ventilationSystem,
} from "@yres/db";
import type {
  AuditResult,
  AuditSummary,
  CoolingResult,
  DhwDemandResult,
  DistributionLossResult,
  EndUseEnergyTotals,
  EnergyBalanceRow,
  EnergyMeasureResult,
  EnvelopeHeatLossResult,
  EquipmentResult,
  GenerationSourceResult,
  HeatingEnergyBalanceResult,
  LampPowerDensityWPerM2,
  LightingResult,
  NonEeMeasureResult,
  RenewableProductionResult,
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
import { type EquipmentItemInput, calculateEquipmentResult } from "./equipment.service";
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
import { type LightingZoneInput, calculateLightingResult } from "./lighting.service";
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

  // --- Lighting ---
  const lightingZoneRows = await db.query.lightingZone.findMany({
    where: eq(lightingZone.buildingId, buildingId),
  });
  const lampTypeRows = await db.select().from(lampType);
  const lampPowerDensityByName = new Map(lampTypeRows.map((l) => [l.name, l.powerDensityWPerM2]));
  const lampPowerDensity: LampPowerDensityWPerM2 = {
    incandescent: lampPowerDensityByName.get(LAMP_TYPE_NAMES.incandescent) ?? 0,
    fluorescentElectromagnetic:
      lampPowerDensityByName.get(LAMP_TYPE_NAMES.fluorescentElectromagnetic) ?? 0,
    fluorescentElectronic: lampPowerDensityByName.get(LAMP_TYPE_NAMES.fluorescentElectronic) ?? 0,
    led: lampPowerDensityByName.get(LAMP_TYPE_NAMES.led) ?? 0,
  };

  // --- Equipment ---
  const equipmentItemRows = await db.query.equipmentItem.findMany({
    where: eq(equipmentItem.buildingId, buildingId),
  });

  // --- Renewables (PV / Solar DHW) — not scenario-tagged: these represent a
  // proposed addition, so their production only ever offsets the "after"
  // scenario's totals (see buildAuditSummary).
  const renewableSystemRows = await db.query.renewableSystem.findMany({
    where: eq(renewableSystem.buildingId, buildingId),
    with: { monthlyProduction: true },
  });
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
        operationHoursDuringHeatingSeason,
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
    const coolingSeer = coolingSystemRows.find((c) => c.scenario === scenario)?.seer ?? 1;
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
      beforeKwh: envelopeHeatLoss.find((e) => e.scenario === "before")?.annualByCategory[category] ?? 0,
      afterKwh: envelopeHeatLoss.find((e) => e.scenario === "after")?.annualByCategory[category] ?? 0,
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
    theoreticalBeforeKwhByCarrier.set(carrier, (theoreticalBeforeKwhByCarrier.get(carrier) ?? 0) + kwh);
  };
  for (const g of generation.filter((g) => g.scenario === "before")) {
    const sourceType = generationSourceById.get(g.sourceId)?.sourceType;
    const carrier = sourceType && carrierForGenerationSourceType(sourceType);
    if (carrier) addTheoretical(carrier, g.finalEnergyConsumptionKwh);
  }
  addTheoretical("electricity", lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0);
  addTheoretical(
    "electricity",
    equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0,
  );
  addTheoretical(
    "electricity",
    cooling.find((c) => c.scenario === "before")?.electricalEnergyForCoolingKwh ?? 0,
  );

  const utilityBillRows = await db.select().from(utilityBill).where(eq(utilityBill.buildingId, buildingId));
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

  // --- Measures & financials ---
  const measureRows = await db.query.energyMeasure.findMany({
    where: eq(energyMeasure.buildingId, buildingId),
  });

  // Non-EE (ancillary) measures: `Non-EE measures` sheet — costs that add to
  // total project investment (`Measures_summary!D30/D31`) but never
  // generate energy savings, so they get no financial-indicator treatment.
  const nonEeMeasureRows = await db.query.nonEeMeasure.findMany({
    where: eq(nonEeMeasure.buildingId, buildingId),
  });
  const nonEeMeasures: NonEeMeasureResult[] = nonEeMeasureRows.map((row) => ({
    id: row.id,
    description: row.description,
    unit: row.unit,
    quantity: row.quantity,
    unitCostUsd: row.unitCostUsd,
    totalCostUsd: row.quantity * row.unitCostUsd,
  }));
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
      lighting,
      equipment,
      renewableProduction,
      heatingEnergyBalance,
      dhwDemand,
      cooling,
    });

    const carrier = inferCarrierForMeasure(measure.category);
    const tariff = latestTariffByCarrier.get(carrier) ?? {
      unitCostUsd: 0.05,
      emissionFactorKgCo2PerKwh: 0.3,
    };

    const { indicators: standardized } = calculateFinancialIndicators({
      investmentCostUsd: measure.investmentCostUsd,
      maintenanceCostPercent: measure.maintenanceCostPercent,
      firstYearAnnualSavingsUsd: savingsKwh * tariff.unitCostUsd,
      annualEscalationRate: ENERGY_ESCALATION_RATES[carrier] ?? 0.02,
      lifetimeYears: measure.lifetimeYears,
      discountRate: 0.04,
    });

    const baselineRatio = baselineRatioByCarrier.get(carrier) ?? 1;
    const actualSavingsKwh = savingsKwh * baselineRatio;
    const { indicators: actual } = calculateFinancialIndicators({
      investmentCostUsd: measure.investmentCostUsd,
      maintenanceCostPercent: measure.maintenanceCostPercent,
      firstYearAnnualSavingsUsd: actualSavingsKwh * tariff.unitCostUsd,
      annualEscalationRate: ENERGY_ESCALATION_RATES[carrier] ?? 0.02,
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
      actualAnnualSavingsKwh: actualSavingsKwh,
      actualAnnualSavingsUsd: actualSavingsKwh * tariff.unitCostUsd,
      simplePaybackYears: standardized.simplePaybackYears,
      lifetimeYears: measure.lifetimeYears,
      co2ReductionTonnesPerYear: calculateCo2ReductionTonnesPerYear(
        savingsKwh,
        tariff.emissionFactorKgCo2PerKwh,
      ),
      proposedForImplementation: measure.proposedForImplementation,
      standardized,
      actual,
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
    lighting,
    equipment,
    renewableProduction,
    finalEnergyByEndUse,
    energyBalanceBreakdown,
    measures,
    nonEeMeasures,
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
  // "solar_dhw" and "ems" default to "gas": Solar DHW displaces whatever
  // heats the building's water (usually gas in this workbook's examples),
  // and EMS savings are genuinely a thermal+electrical mix (see the EMS
  // sheet's separate D9/D10 totals) that this single-tariff-per-measure
  // model can't represent precisely — "gas" is the same approximation
  // already used for every other unlisted category here.
  return "gas";
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

function resolveMeasureStandardizedSavingsKwh(
  category: string,
  context: {
    envelopeHeatLoss: EnvelopeHeatLossResult[];
    ventilationLoss: VentilationLossResult[];
    distributionLoss: DistributionLossResult[];
    generation: GenerationSourceResult[];
    lighting: LightingResult[];
    equipment: EquipmentResult[];
    renewableProduction: RenewableProductionResult[];
    heatingEnergyBalance: HeatingEnergyBalanceResult[];
    dhwDemand: DhwDemandResult[];
    cooling: CoolingResult[];
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
    // `Lighting` sheet: `Measures_summary!E11=Lighting!L17` — the before/after
    // delta of the sheet's own total, same pattern as every envelope/
    // generation category above.
    case "lighting": {
      const beforeL = context.lighting.find((l) => l.scenario === "before")?.annualConsumptionKwh ?? 0;
      const afterL = context.lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? 0;
      return beforeL - afterL;
    }
    // `Equipment` sheet: `Measures_summary!E12=Equipment!K102` (before/after total delta).
    case "equipment_replacement": {
      const beforeE = context.equipment.find((e) => e.scenario === "before")?.annualConsumptionKwh ?? 0;
      const afterE = context.equipment.find((e) => e.scenario === "after")?.annualConsumptionKwh ?? 0;
      return beforeE - afterE;
    }
    // `PV`/`Solar DHW` sheets: there's no "before" state — installing the
    // system simply displaces that much purchased energy, so annual
    // production itself *is* the standardized saving (`Measures_summary!E13
    // =PV!C25`, `E14`-equivalent for Solar DHW).
    case "pv":
      return context.renewableProduction.find((r) => r.systemType === "pv")?.annualProductionKwh ?? 0;
    case "solar_dhw":
      return (
        context.renewableProduction.find((r) => r.systemType === "solar_dhw")?.annualProductionKwh ?? 0
      );
    // `EMS` sheet: flat 3% of each "after" (i.e. after every other proposed
    // measure) end-use need — heating, DHW, cooling, and lighting.
    case "ems": {
      const afterHeatingKwh =
        context.heatingEnergyBalance.find((h) => h.scenario === "after")?.annualNetEnergyNeedKwh ?? 0;
      const afterDhwKwh = context.dhwDemand.find((d) => d.scenario === "after")?.totalKwh ?? 0;
      const afterCoolingKwh =
        context.cooling.find((c) => c.scenario === "after")?.electricalEnergyForCoolingKwh ?? 0;
      const afterLightingKwh =
        context.lighting.find((l) => l.scenario === "after")?.annualConsumptionKwh ?? 0;
      return (afterHeatingKwh + afterDhwKwh + afterCoolingKwh + afterLightingKwh) * EMS_SAVINGS_RATE;
    }
    default:
      return 0;
  }
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

  // `Measures_summary!D31`: total investment for the proposed package
  // includes every non-EE (ancillary) cost unconditionally — those rows have
  // no "proposed for implementation" flag in the source sheet, they're
  // simply necessary side-effect work, not an optional energy-saving choice.
  const totalNonEeMeasureCostUsd = nonEeMeasures.reduce((sum, m) => sum + m.totalCostUsd, 0);
  const totalInvestmentUsd =
    measures
      .filter((m) => m.proposedForImplementation)
      .reduce((sum, m) => sum + m.investmentCostUsd, 0) + totalNonEeMeasureCostUsd;
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
    totalNonEeMeasureCostUsd,
    totalAnnualSavingsUsd,
    simplePaybackYears:
      totalAnnualSavingsUsd > 0 ? totalInvestmentUsd / totalAnnualSavingsUsd : null,
  };
}
