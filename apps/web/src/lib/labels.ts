import type {
  BuildingStatus,
  BuildingType,
  EndUse,
  EnvelopeElementCategory,
  Orientation,
} from "@yres/types";
import type {
  Building,
  DistributionSystemType,
  EnergyCarrier,
  GenerationSourceType,
  MeasureCategory,
  RenewableSystemType,
  VentilationSystemType,
} from "./api-types";
import type { UserRole } from "./auth-types";

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  auditor: "Auditor",
  viewer: "Viewer",
};

export const BUILDING_TYPE_LABELS: Record<BuildingType, string> = {
  residential_mfh: "Residential (multi-family)",
  residential_sfh: "Residential (single-family)",
  office: "Office",
  school: "School",
  kindergarten: "Kindergarten",
  hospital: "Hospital",
  administrative: "Administrative",
  other: "Other",
};

export const BUILDING_TYPES = Object.keys(BUILDING_TYPE_LABELS) as BuildingType[];

// Unlike BUILDING_TYPE_LABELS above, status text is localized via t("buildings:status.*")
// rather than hardcoded here — this is a new field with no legacy baggage to match.
export const BUILDING_STATUSES: BuildingStatus[] = [
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
];

// Maps the snake_case enum value to the camelCase key used under the
// "buildings:status.*" i18next namespace (e.g. "in_progress" -> "inProgress").
export const BUILDING_STATUS_TRANSLATION_KEYS: Record<BuildingStatus, string> = {
  not_started: "notStarted",
  in_progress: "inProgress",
  completed: "completed",
  on_hold: "onHold",
};

export function isBuildingOverdue(building: Pick<Building, "status" | "deadline">): boolean {
  if (!building.deadline || building.status === "completed") return false;
  return new Date(building.deadline) < new Date();
}

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  north: "North",
  south: "South",
  east: "East",
  west: "West",
  northeast: "Northeast",
  northwest: "Northwest",
  southeast: "Southeast",
  southwest: "Southwest",
  horizontal: "Horizontal",
};

export const ORIENTATIONS = Object.keys(ORIENTATION_LABELS) as Orientation[];

export const ENVELOPE_ELEMENT_CATEGORY_LABELS: Record<EnvelopeElementCategory, string> = {
  external_wall: "External wall",
  socle_heated: "Socle (heated)",
  socle_unheated: "Socle (unheated)",
  socle_ground: "Socle (ground)",
  roof: "Roof",
  floor: "Floor",
};

export const ENVELOPE_ELEMENT_CATEGORIES = Object.keys(
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
) as EnvelopeElementCategory[];

/**
 * Labels for `AuditResult.energyBalanceBreakdown` rows. Keys are either an
 * `EnvelopeElementCategory`, "window"/"door", or one of the fixed
 * final-energy/offset categories the audit engine emits — see
 * `EnergyBalanceSection` in `@yres/types` for what each row represents.
 */
export const ENERGY_BALANCE_CATEGORY_LABELS: Record<string, string> = {
  ...ENVELOPE_ELEMENT_CATEGORY_LABELS,
  window: "Windows",
  door: "Doors",
  ventilation: "Ventilation",
  thermal_generation: "Heating & DHW generation (thermal fuels)",
  electrical_generation: "Heating & DHW generation (electric)",
  lighting: "Lighting",
  equipment: "Equipment",
  cooling: "Cooling",
  pv_production: "Solar PV production",
  solar_dhw_production: "Solar DHW production",
};

export const OPENING_CATEGORY_LABELS: Record<"window" | "door", string> = {
  window: "Window",
  door: "Door",
};

export const ENERGY_CARRIER_LABELS: Record<EnergyCarrier, string> = {
  gas: "Gas",
  electricity: "Electricity",
  district_heat: "District heat",
  coal: "Coal",
};

export const ENERGY_CARRIERS = Object.keys(ENERGY_CARRIER_LABELS) as EnergyCarrier[];

export const END_USE_LABELS: Record<EndUse, string> = {
  heating: "Heating",
  dhw: "Domestic hot water",
  cooling: "Cooling",
};

export const END_USES = Object.keys(END_USE_LABELS) as EndUse[];

export const MEASURE_CATEGORY_LABELS: Record<MeasureCategory, string> = {
  envelope_wall_insulation: "Wall insulation",
  envelope_roof_insulation: "Roof insulation",
  envelope_floor_insulation: "Floor insulation",
  window_replacement: "Window replacement",
  heating_system: "Heating system",
  gas_boiler_replacement: "Gas boiler replacement",
  mechanical_ventilation_heat_recovery: "Mechanical ventilation w/ heat recovery",
  lighting: "Lighting",
  equipment_replacement: "Equipment replacement",
  pv: "Solar PV",
  solar_dhw: "Solar DHW",
  ems: "Energy management system",
  other: "Other",
};

export const VENTILATION_SYSTEM_TYPE_LABELS: Record<VentilationSystemType, string> = {
  natural: "Natural",
  mechanical: "Mechanical",
};

export const DISTRIBUTION_SYSTEM_TYPE_LABELS: Record<DistributionSystemType, string> = {
  heating: "Heating",
  dhw: "DHW",
};

export const GENERATION_SOURCE_TYPE_LABELS: Record<GenerationSourceType, string> = {
  gas_boiler: "Gas boiler",
  electric_boiler: "Electric boiler",
  district_heating: "District heating",
  solar_dhw: "Solar DHW",
  split_ac: "Split AC",
  centralized_ac: "Centralized AC",
  heat_pump: "Heat pump",
  other: "Other",
};

export const GENERATION_SOURCE_TYPES = Object.keys(
  GENERATION_SOURCE_TYPE_LABELS,
) as GenerationSourceType[];

export const RENEWABLE_SYSTEM_TYPE_LABELS: Record<RenewableSystemType, string> = {
  pv: "Solar PV",
  solar_dhw: "Solar DHW",
};

export const RENEWABLE_SYSTEM_TYPES = Object.keys(
  RENEWABLE_SYSTEM_TYPE_LABELS,
) as RenewableSystemType[];

export const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function formatNumber(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** USD currency, no decimals by default — these figures are estimates, not invoices. */
export function formatCurrency(value: number | null | undefined, fractionDigits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

/** `value` is a fraction (e.g. 0.08 -> "8.0%"), matching discountRate/irr's representation. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  })}%`;
}

export function formatYears(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${formatNumber(value, fractionDigits)} yr`;
}
