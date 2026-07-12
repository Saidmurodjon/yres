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
