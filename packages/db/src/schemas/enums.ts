import { pgEnum } from "drizzle-orm/pg-core";

export const scenarioEnum = pgEnum("scenario", ["before", "after"]);

export const buildingTypeEnum = pgEnum("building_type", [
  "residential_mfh",
  "residential_sfh",
  "office",
  "school",
  "kindergarten",
  "hospital",
  "administrative",
  "other",
]);

export const orientationEnum = pgEnum("orientation", [
  "north",
  "south",
  "east",
  "west",
  "northeast",
  "northwest",
  "southeast",
  "southwest",
  "horizontal",
]);

export const envelopeElementCategoryEnum = pgEnum("envelope_element_category", [
  "external_wall",
  "socle_heated",
  "socle_unheated",
  "socle_ground",
  "roof",
  "floor",
]);

export const openingCategoryEnum = pgEnum("opening_category", ["window", "door"]);

export const energyCarrierEnum = pgEnum("energy_carrier", [
  "gas",
  "electricity",
  "district_heat",
  "coal",
]);

export const endUseEnum = pgEnum("end_use", ["heating", "dhw", "cooling"]);

export const generationSourceTypeEnum = pgEnum("generation_source_type", [
  "gas_boiler",
  "electric_boiler",
  "district_heating",
  "solar_dhw",
  "split_ac",
  "centralized_ac",
  "heat_pump",
  "other",
]);

export const distributionSystemTypeEnum = pgEnum("distribution_system_type", ["heating", "dhw"]);

export const renewableSystemTypeEnum = pgEnum("renewable_system_type", ["pv", "solar_dhw"]);

export const measureCategoryEnum = pgEnum("measure_category", [
  "envelope_wall_insulation",
  "envelope_roof_insulation",
  "envelope_floor_insulation",
  "window_replacement",
  "heating_system",
  "gas_boiler_replacement",
  "mechanical_ventilation_heat_recovery",
  "lighting",
  "equipment_replacement",
  "pv",
  "solar_dhw",
  "ems",
  "other",
]);

export const auditRunStatusEnum = pgEnum("audit_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);

/**
 * Per-building collaborator access level (separate from the global
 * `userRoleEnum` below). The building's creator (`building.userId`) is
 * always an implicit "owner" and never appears as a `buildingMember` row —
 * this enum only covers people *invited* to a building they don't own.
 */
export const buildingMemberRoleEnum = pgEnum("building_member_role", ["editor", "viewer"]);

/**
 * Global user role — separate from `buildingMemberRoleEnum` above, which is
 * scoped to a single building's sharing permissions. `admin` unlocks
 * site-wide user management (`/admin/users`); `auditor` is the normal
 * working role; `viewer` is a read-only global tier layered on top of
 * whatever buildings are explicitly shared with the user. See
 * `docs/social-features.md` for the full design.
 */
export const userRoleEnum = pgEnum("user_role", ["admin", "auditor", "viewer"]);
