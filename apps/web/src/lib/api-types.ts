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
