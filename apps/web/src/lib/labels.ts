import type { BuildingType, EndUse, EnvelopeElementCategory, Orientation } from "@yres/types";
import type { EnergyCarrier, MeasureCategory } from "./api-types";

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
