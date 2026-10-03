import {
  type Database,
  building,
  type buildingBlock,
  buildingFinancialParameters,
  type climateMonthlyNormal,
  type constructionLayer,
  constructionType,
  coolingSystem,
  coolingWindow,
  dhwSource,
  distributionSystem,
  energyMeasure,
  type energyMeasureTarget,
  energyTariff,
  envelopeElement,
  type envelopeOpening,
  equipmentItem,
  generationSource,
  lampType,
  lightingZone,
  type material,
  nonEeMeasure,
  openingType,
  pipeLossReference,
  type renewableProductionMonthly,
  renewableSystem,
  surfaceResistance,
  utilityBill,
  ventilationSystem,
} from "@yres/db";
import { desc, eq } from "drizzle-orm";
import {
  type FinancialParametersValues,
  defaultFinancialParameters,
} from "../lib/financial-defaults";

function readRaw(db: Database, buildingId: string) {
  return Promise.all([
    db.query.building.findFirst({
      where: eq(building.id, buildingId),
      with: { climateRegion: { with: { monthlyNormals: true } }, blocks: true },
    }),
    db.query.envelopeElement.findMany({
      where: eq(envelopeElement.buildingId, buildingId),
      with: { openings: { with: { openingType: true } } },
    }),
    db.query.constructionType.findMany({
      where: eq(constructionType.buildingId, buildingId),
      with: { layers: { with: { material: true } } },
    }),
    db.query.openingType.findMany({ where: eq(openingType.buildingId, buildingId) }),
    db.select().from(surfaceResistance),
    db.query.ventilationSystem.findMany({ where: eq(ventilationSystem.buildingId, buildingId) }),
    db.query.coolingWindow.findMany({ where: eq(coolingWindow.buildingId, buildingId) }),
    db.query.coolingSystem.findMany({ where: eq(coolingSystem.buildingId, buildingId) }),
    db.query.dhwSource.findMany({ where: eq(dhwSource.buildingId, buildingId) }),
    db.query.distributionSystem.findMany({
      where: eq(distributionSystem.buildingId, buildingId),
    }),
    db.select().from(pipeLossReference),
    db.query.generationSource.findMany({ where: eq(generationSource.buildingId, buildingId) }),
    db.query.lightingZone.findMany({ where: eq(lightingZone.buildingId, buildingId) }),
    db.select().from(lampType),
    db.query.equipmentItem.findMany({ where: eq(equipmentItem.buildingId, buildingId) }),
    db.query.renewableSystem.findMany({
      where: eq(renewableSystem.buildingId, buildingId),
      with: { monthlyProduction: true },
    }),
    db.select().from(utilityBill).where(eq(utilityBill.buildingId, buildingId)),
    // `with: { targets }` is one SQL statement (drizzle folds relations into json subqueries), so the
    // D1 query count stays at 21.
    db.query.energyMeasure.findMany({
      where: eq(energyMeasure.buildingId, buildingId),
      with: { targets: true },
    }),
    db.query.nonEeMeasure.findMany({ where: eq(nonEeMeasure.buildingId, buildingId) }),
    db.select().from(energyTariff).orderBy(desc(energyTariff.effectiveDate)),
    db
      .select()
      .from(buildingFinancialParameters)
      .where(eq(buildingFinancialParameters.buildingId, buildingId)),
  ]);
}
type Row<T extends { $inferSelect: unknown }, K extends keyof T["$inferSelect"]> = Pick<
  T["$inferSelect"],
  K
>;

/**
 * Everything `computeAudit` reads — one building's stored state plus the global reference
 * tables — narrowed to the columns the engine actually uses. Plain JSON-serializable data
 * (no `Date`s, no names/addresses), so the golden test (F03) can feed it from a fixture
 * without a database. Add a column here only when the engine starts reading it.
 */
export interface AuditInputs {
  building: Row<
    typeof building,
    | "id"
    | "heatingSeasonDurationDays"
    | "indoorTempNonOperationC"
    | "indoorTempOperationC"
    | "nonOperationHoursPerDay"
    | "operationHoursPerDay"
    | "occupantCount"
    | "workingDaysPerYear"
    | "coolingEnthalpyInsideKjKg"
    | "coolingEnthalpyOutsideKjKg"
  >;
  climateRegion: {
    monthlyNormals: Row<
      typeof climateMonthlyNormal,
      | "month"
      | "avgOutdoorTempC"
      | "heatingDaysInMonth"
      | "solarRadiationSouthKwhM2"
      | "solarRadiationNorthKwhM2"
      | "solarRadiationEastWestKwhM2"
      | "solarRadiationSeSwKwhM2"
      | "solarRadiationNeNwKwhM2"
      | "solarRadiationHorizontalKwhM2"
      | "isHeatingSeasonMonth"
    >[];
  };
  blocks: Row<
    typeof buildingBlock,
    | "footprintLengthM"
    | "footprintWidthM"
    | "numberOfFloors"
    | "floorToFloorHeightM"
    | "perimeterM"
    | "perimeterLossCoefficient"
  >[];
  envelopeElements: (Row<
    typeof envelopeElement,
    | "id"
    | "constructionTypeId"
    | "orientation"
    | "lengthM"
    | "heightEnvContactM"
    | "heightGroundContactM"
  > & {
    openings: (Row<typeof envelopeOpening, "openingTypeId" | "count"> & {
      openingType: Row<typeof openingType, "category" | "widthM" | "heightM">;
    })[];
  })[];
  constructionTypes: (Row<
    typeof constructionType,
    "id" | "code" | "scenario" | "retrofitOfId" | "elementCategory"
  > & {
    layers: (Row<typeof constructionLayer, "thicknessM"> & {
      material: Row<typeof material, "thermalConductivityWPerMk">;
    })[];
  })[];
  openingTypes: Row<
    typeof openingType,
    | "id"
    | "code"
    | "retrofitOfId"
    | "category"
    | "scenario"
    | "uValueWm2k"
    | "gValue"
    | "frameFactor"
    | "shadingFactor"
  >[];
  surfaceResistances: Row<
    typeof surfaceResistance,
    "elementCategory" | "interiorResistanceM2kPerW" | "exteriorResistanceM2kPerW"
  >[];
  ventilationSystems: Row<
    typeof ventilationSystem,
    | "scenario"
    | "systemType"
    | "airChangeRatePerHour"
    | "freshAirPerPersonM3h"
    | "heatRecoveryEfficiency"
    | "fanElectricalPowerKw"
    | "coolingSeasonHours"
  >[];
  coolingWindows: Row<
    typeof coolingWindow,
    "scenario" | "orientation" | "areaM2" | "gValue" | "shadingFactor"
  >[];
  coolingSystems: Row<typeof coolingSystem, "scenario" | "seer" | "distributionEfficiency">[];
  dhwSources: Row<
    typeof dhwSource,
    "scenario" | "specificConsumptionLPersonDay" | "personsServed" | "energyCarrier"
  >[];
  distributionSystems: Row<
    typeof distributionSystem,
    | "scenario"
    | "systemType"
    | "pipeDiameterClass"
    | "lengthM"
    | "insulatedFraction"
    | "meanFluidTempC"
  >[];
  pipeLossReferences: Row<
    typeof pipeLossReference,
    "diameterClass" | "insulated" | "meanFluidTempC" | "maxHeatFluxWPerM"
  >[];
  generationSources: Row<
    typeof generationSource,
    | "id"
    | "scenario"
    | "endUse"
    | "sourceType"
    | "efficiencyOrSeer"
    | "shareOfDemand"
    | "distributionEfficiency"
  >[];
  lightingZones: Row<
    typeof lightingZone,
    "scenario" | "areaM2" | "technologyMix" | "utilizationFactor"
  >[];
  lampTypes: Row<typeof lampType, "name" | "powerDensityWPerM2">[];
  equipmentItems: Row<
    typeof equipmentItem,
    | "scenario"
    | "unitPowerKw"
    | "quantity"
    | "heatingSeasonHours"
    | "coolingSeasonHours"
    | "heatingUtilizationFactor"
    | "coolingUtilizationFactor"
  >[];
  renewableSystems: (Row<typeof renewableSystem, "systemType"> & {
    monthlyProduction: Row<typeof renewableProductionMonthly, "productionKwh">[];
  })[];
  utilityBills: Row<typeof utilityBill, "energyCarrier" | "year" | "consumptionKwh">[];
  energyMeasures: (Row<
    typeof energyMeasure,
    | "id"
    | "name"
    | "category"
    | "investmentCostUsd"
    | "lifetimeYears"
    | "maintenanceCostPercent"
    | "proposedForImplementation"
  > & {
    /** Construction/opening types (by code) this measure replaces; empty = legacy whole-category measure. */
    targets: Row<typeof energyMeasureTarget, "kind" | "code">[];
  })[];
  nonEeMeasures: Row<
    typeof nonEeMeasure,
    "id" | "description" | "unit" | "quantity" | "unitCostUsd" | "proposedForImplementation"
  >[];
  /** Newest `effectiveDate` first (the engine takes the first tariff per carrier). */
  tariffs: Row<
    typeof energyTariff,
    "energyCarrier" | "unitCostUsd" | "emissionFactorKgCo2PerKwh"
  >[];
  /** Saved parameters or the v7.20 defaults (F05); `unitCostUsd` of `tariffs` is no longer used for money. */
  financialParameters: FinancialParametersValues;
}

/**
 * All of the audit's database reads in one `Promise.all` (21 queries — within the
 * `database.md` budget). Throws if the building does not exist.
 */
export async function loadAuditInputs(db: Database, buildingId: string): Promise<AuditInputs> {
  const raw = await readRaw(db, buildingId);
  const [buildingRecord] = raw;
  if (!buildingRecord) throw new Error(`Building ${buildingId} not found`);

  return {
    building: buildingRecord,
    climateRegion: buildingRecord.climateRegion,
    blocks: buildingRecord.blocks,
    envelopeElements: raw[1],
    constructionTypes: raw[2],
    openingTypes: raw[3],
    surfaceResistances: raw[4],
    ventilationSystems: raw[5],
    coolingWindows: raw[6],
    coolingSystems: raw[7],
    dhwSources: raw[8],
    distributionSystems: raw[9],
    pipeLossReferences: raw[10],
    generationSources: raw[11],
    lightingZones: raw[12],
    lampTypes: raw[13],
    equipmentItems: raw[14],
    renewableSystems: raw[15],
    utilityBills: raw[16],
    energyMeasures: raw[17],
    nonEeMeasures: raw[18],
    tariffs: raw[19],
    financialParameters: raw[20][0] ?? defaultFinancialParameters(),
  };
}
