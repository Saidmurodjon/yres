import type { BuildingType, Orientation, Scenario } from "@yres/types";

export interface Building {
  id: string;
  userId: string;
  name: string;
  location: string;
  climateRegionId: string;
  buildingType: BuildingType;
  yearBuilt: number | null;
  netCooledFloorAreaM2: number | null;
  heatingSeasonDurationDays: number;
  indoorTempNonOperationC: number;
  indoorTempOperationC: number;
  outdoorAvgHeatingSeasonTempC: number;
  outdoorDesignTempC: number;
  nonOperationHoursPerDay: number;
  operationHoursPerDay: number;
  occupantCount: number;
  coolingEnthalpyInsideKjKg: number | null;
  coolingEnthalpyOutsideKjKg: number | null;
  coolingEnthalpyHottestDayKjKg: number | null;
  createdAt: string;
  updatedAt: string;
}

export type CreateBuildingInput = Omit<Building, "id" | "userId" | "createdAt" | "updatedAt">;
export type UpdateBuildingInput = Partial<CreateBuildingInput>;

export interface BuildingBlock {
  id: string;
  buildingId: string;
  name: string;
  footprintLengthM: number;
  footprintWidthM: number;
  numberOfFloors: number;
  floorToFloorHeightM: number;
  perimeterM: number;
  perimeterLossCoefficient: number;
}

export interface Material {
  id: string;
  name: string;
  thermalConductivityWPerMk: number;
}

export interface ConstructionLayer {
  id: string;
  constructionTypeId: string;
  layerOrder: number;
  materialId: string;
  thicknessM: number;
  material?: Material;
}

export interface ConstructionType {
  id: string;
  buildingId: string;
  code: string;
  elementCategory: string;
  scenario: Scenario;
  retrofitOfId: string | null;
  description: string | null;
  layers: ConstructionLayer[];
}

export interface OpeningType {
  id: string;
  buildingId: string;
  code: string;
  category: "window" | "door";
  scenario: Scenario;
  retrofitOfId: string | null;
  uValueWm2k: number;
  widthM: number | null;
  heightM: number | null;
  gValue: number | null;
  frameFactor: number | null;
  shadingFactor: number;
  description: string | null;
}

export interface EnvelopeOpening {
  id: string;
  envelopeElementId: string;
  openingTypeId: string;
  count: number;
  openingType?: OpeningType;
}

export interface EnvelopeElement {
  id: string;
  buildingId: string;
  blockName: string;
  orientation: Orientation;
  sideCode: string | null;
  description: string | null;
  constructionTypeId: string;
  lengthM: number;
  heightEnvContactM: number | null;
  heightGroundContactM: number | null;
  constructionType?: ConstructionType;
  openings: EnvelopeOpening[];
}

export interface EnvelopeData {
  blocks: BuildingBlock[];
  constructionTypes: ConstructionType[];
  openingTypes: OpeningType[];
  envelopeElements: EnvelopeElement[];
}

export interface ReplaceEnvelopePayload {
  scenario: Scenario;
  /** Omit to leave existing building blocks untouched; pass an array (including []) to replace all of them. Blocks aren't scenario-specific. */
  buildingBlocks?: {
    name: string;
    footprintLengthM: number;
    footprintWidthM: number;
    numberOfFloors: number;
    floorToFloorHeightM: number;
    perimeterM: number;
    perimeterLossCoefficient?: number;
  }[];
  constructionTypes: {
    code: string;
    elementCategory: string;
    description?: string | null;
    layers: { layerOrder: number; materialId: string; thicknessM: number }[];
  }[];
  openingTypes: {
    code: string;
    category: "window" | "door";
    uValueWm2k: number;
    widthM?: number | null;
    heightM?: number | null;
    gValue?: number | null;
    frameFactor?: number | null;
    shadingFactor?: number;
    description?: string | null;
  }[];
  envelopeElements: {
    blockName: string;
    orientation: Orientation;
    sideCode?: string | null;
    description?: string | null;
    constructionTypeCode: string;
    lengthM: number;
    heightEnvContactM?: number;
    heightGroundContactM?: number;
    openings: { openingTypeCode: string; count: number }[];
  }[];
}

export type MeasureCategory =
  | "envelope_wall_insulation"
  | "envelope_roof_insulation"
  | "envelope_floor_insulation"
  | "window_replacement"
  | "heating_system"
  | "gas_boiler_replacement"
  | "mechanical_ventilation_heat_recovery"
  | "lighting"
  | "equipment_replacement"
  | "pv"
  | "solar_dhw"
  | "ems"
  | "other";

export interface EnergyMeasure {
  id: string;
  buildingId: string;
  name: string;
  category: MeasureCategory;
  investmentCostUsd: number;
  lifetimeYears: number;
  maintenanceCostPercent: number;
  proposedForImplementation: boolean;
  sourceSheetRef: string | null;
  createdAt: string;
}

export interface CreateMeasureInput {
  name: string;
  category: MeasureCategory;
  investmentCostUsd: number;
  lifetimeYears?: number;
  maintenanceCostPercent?: number;
}

export type EnergyCarrier = "gas" | "electricity" | "district_heat" | "coal";

export interface UtilityBill {
  id: string;
  buildingId: string;
  energyCarrier: EnergyCarrier;
  year: number;
  month: number;
  consumptionNative: number;
  consumptionKwh: number | null;
  expenseLocal: number | null;
  tariffLocal: number | null;
}

export interface CreateUtilityBillInput {
  energyCarrier: EnergyCarrier;
  year: number;
  month: number;
  consumptionNative: number;
  consumptionKwh?: number | null;
  expenseLocal?: number | null;
  tariffLocal?: number | null;
}

export interface ClimateMonthlyNormal {
  id: string;
  climateRegionId: string;
  month: number;
  avgOutdoorTempC: number;
  solarRadiationSouthKwhM2: number | null;
  solarRadiationNorthKwhM2: number | null;
  solarRadiationEastWestKwhM2: number | null;
  solarRadiationSeSwKwhM2: number | null;
  solarRadiationNeNwKwhM2: number | null;
  solarRadiationHorizontalKwhM2: number | null;
  isHeatingSeasonMonth: boolean;
}

export interface ClimateRegion {
  id: string;
  name: string;
  designOutdoorTempC: number;
  avgAnnualTempC: number | null;
  minAbsoluteTempC: number | null;
  maxAbsoluteTempC: number | null;
}

export interface ClimateRegionWithNormals extends ClimateRegion {
  monthlyNormals: ClimateMonthlyNormal[];
}

export type VentilationSystemType = "natural" | "mechanical";

export interface VentilationSystem {
  id: string;
  buildingId: string;
  scenario: Scenario;
  systemType: VentilationSystemType;
  airChangeRatePerHour: number | null;
  freshAirPerPersonM3h: number | null;
  heatRecoveryEfficiency: number | null;
  fanElectricalPowerKw: number | null;
}

export interface DhwSource {
  id: string;
  buildingId: string;
  scenario: Scenario;
  sourceName: string;
  energyCarrier: EnergyCarrier;
  specificConsumptionLPersonDay: number;
  personsServed: number;
}

export type DistributionSystemType = "heating" | "dhw";

export interface DistributionSystem {
  id: string;
  buildingId: string;
  systemType: DistributionSystemType;
  scenario: Scenario;
  pipeDiameterClass: string;
  lengthM: number;
  insulatedFraction: number;
  meanFluidTempC: number;
}

export type GenerationSourceType =
  | "gas_boiler"
  | "electric_boiler"
  | "district_heating"
  | "solar_dhw"
  | "split_ac"
  | "centralized_ac"
  | "heat_pump"
  | "other";

export interface GenerationSource {
  id: string;
  buildingId: string;
  endUse: "heating" | "dhw" | "cooling";
  scenario: Scenario;
  sourceType: GenerationSourceType;
  efficiencyOrSeer: number;
  shareOfDemand: number;
}

export interface CoolingWindow {
  id: string;
  buildingId: string;
  scenario: Scenario;
  orientation: Orientation;
  areaM2: number;
  gValue: number;
  shadingFactor: number;
}

export interface CoolingSystem {
  id: string;
  buildingId: string;
  scenario: Scenario;
  description: string | null;
  seer: number;
}

export interface LightingTechnologyMix {
  incandescentFraction: number;
  fluorescentElectromagneticFraction: number;
  fluorescentElectronicFraction: number;
  ledFraction: number;
}

export interface LightingZone {
  id: string;
  buildingId: string;
  scenario: Scenario;
  name: string;
  areaM2: number;
  technologyMix: LightingTechnologyMix;
  utilizationFactor: number;
}

export interface EquipmentItem {
  id: string;
  buildingId: string;
  scenario: Scenario;
  name: string;
  category: string | null;
  unitPowerKw: number;
  quantity: number;
  heatingSeasonHours: number;
  coolingSeasonHours: number;
  heatingUtilizationFactor: number;
  coolingUtilizationFactor: number;
}

export type RenewableSystemType = "pv" | "solar_dhw";

export interface RenewableProductionMonth {
  id: string;
  renewableSystemId: string;
  month: number;
  productionKwh: number;
}

export interface RenewableSystem {
  id: string;
  buildingId: string;
  systemType: RenewableSystemType;
  capacityKw: number | null;
  collectorCount: number | null;
  availableAreaM2: number;
  unitCostUsd: number;
  monthlyProduction: RenewableProductionMonth[];
}

export interface LampType {
  id: string;
  name: string;
  powerDensityWPerM2: number;
}

export interface SystemsData {
  ventilationSystems: VentilationSystem[];
  dhwSources: DhwSource[];
  distributionSystems: DistributionSystem[];
  generationSources: GenerationSource[];
  coolingWindows: CoolingWindow[];
  coolingSystems: CoolingSystem[];
  lightingZones: LightingZone[];
  equipmentItems: EquipmentItem[];
  renewableSystems: RenewableSystem[];
}

export interface ReplaceVentilationPayload {
  scenario: Scenario;
  systems: {
    systemType: VentilationSystemType;
    airChangeRatePerHour?: number | null;
    freshAirPerPersonM3h?: number | null;
    heatRecoveryEfficiency?: number | null;
    fanElectricalPowerKw?: number | null;
  }[];
}

export interface ReplaceDhwPayload {
  scenario: Scenario;
  sources: {
    sourceName: string;
    energyCarrier: EnergyCarrier;
    specificConsumptionLPersonDay: number;
    personsServed: number;
  }[];
}

export interface ReplaceDistributionPayload {
  scenario: Scenario;
  systems: {
    systemType: DistributionSystemType;
    pipeDiameterClass: string;
    lengthM: number;
    insulatedFraction?: number;
    meanFluidTempC: number;
  }[];
}

export interface ReplaceGenerationPayload {
  scenario: Scenario;
  sources: {
    endUse: "heating" | "dhw" | "cooling";
    sourceType: GenerationSourceType;
    efficiencyOrSeer: number;
    shareOfDemand?: number;
  }[];
}

export interface ReplaceCoolingWindowsPayload {
  scenario: Scenario;
  windows: {
    orientation: Orientation;
    areaM2: number;
    gValue: number;
    shadingFactor?: number;
  }[];
}

export interface ReplaceCoolingSystemsPayload {
  scenario: Scenario;
  systems: {
    description?: string | null;
    seer: number;
  }[];
}

export interface ReplaceLightingPayload {
  scenario: Scenario;
  zones: {
    name: string;
    areaM2: number;
    technologyMix: LightingTechnologyMix;
    utilizationFactor: number;
  }[];
}

export interface ReplaceEquipmentPayload {
  scenario: Scenario;
  items: {
    name: string;
    category?: string | null;
    unitPowerKw: number;
    quantity?: number;
    heatingSeasonHours?: number;
    coolingSeasonHours?: number;
    heatingUtilizationFactor?: number;
    coolingUtilizationFactor?: number;
  }[];
}

export interface ReplaceRenewablesPayload {
  systems: {
    systemType: RenewableSystemType;
    capacityKw?: number | null;
    collectorCount?: number | null;
    availableAreaM2: number;
    unitCostUsd: number;
    monthlyProductionKwh: number[];
  }[];
}

export type AuditRunStatus = "pending" | "running" | "completed" | "failed";

export interface AuditRun {
  id: string;
  buildingId: string;
  triggeredByUserId: string;
  status: AuditRunStatus;
  startedAt: string | null;
  completedAt: string | null;
  reportR2Key: string | null;
  errorMessage: string | null;
  createdAt: string;
}

export interface Paginated<T> {
  page: number;
  pageSize: number;
}

export interface ApiErrorBody {
  error: string;
  details?: unknown;
}
