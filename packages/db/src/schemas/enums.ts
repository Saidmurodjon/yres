/**
 * SQLite/D1 has no enum type — columns are plain `text({ enum })`, and the
 * value set is enforced only by zod (database.md). Each `xEnum` keeps the
 * `{ enumValues }` shape the old pg-core enums had, so callers'
 * `z.enum(xEnum.enumValues)` and `(typeof xEnum.enumValues)[number]` keep
 * working unchanged. Adding a value here and to the zod schema is one commit.
 */
function defineEnum<const T extends readonly [string, ...string[]]>(values: T) {
  return { enumValues: values };
}

export const scenarioEnum = defineEnum(["before", "after"]);

export const buildingTypeEnum = defineEnum([
  "residential_mfh",
  "residential_sfh",
  "office",
  "school",
  "kindergarten",
  "hospital",
  "administrative",
  "other",
]);

/**
 * Manually-set project-tracking status for a building's audit work —
 * independent of `auditRunStatusEnum` below, which tracks a single
 * calculation run's pending/running/completed/failed lifecycle, not the
 * building's overall progress.
 */
export const buildingStatusEnum = defineEnum([
  "not_started",
  "in_progress",
  "completed",
  "on_hold",
]);

export const orientationEnum = defineEnum([
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

export const envelopeElementCategoryEnum = defineEnum([
  "external_wall",
  "socle_heated",
  "socle_unheated",
  "socle_ground",
  "roof",
  "floor",
  // F08: floor kinds the v7.20 book calculates differently; plain "floor" stays for legacy data.
  "floor_ground",
  "floor_over_unheated",
]);

export const openingCategoryEnum = defineEnum(["window", "door"]);

export const energyCarrierEnum = defineEnum(["gas", "electricity", "district_heat", "coal"]);

export const endUseEnum = defineEnum(["heating", "dhw", "cooling"]);

export const generationSourceTypeEnum = defineEnum([
  "gas_boiler",
  "electric_boiler",
  "district_heating",
  "solar_dhw",
  "split_ac",
  "centralized_ac",
  "heat_pump",
  "other",
]);

export const distributionSystemTypeEnum = defineEnum(["heating", "dhw"]);

export const renewableSystemTypeEnum = defineEnum(["pv", "solar_dhw"]);

export const measureCategoryEnum = defineEnum([
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

export const auditRunStatusEnum = defineEnum(["pending", "running", "completed", "failed"]);

/**
 * Per-building collaborator access level (separate from the global
 * `userRoleEnum` below). The building's creator (`building.userId`) is
 * always an implicit "owner" and never appears as a `buildingMember` row —
 * this enum only covers people *invited* to a building they don't own.
 */
export const buildingMemberRoleEnum = defineEnum(["editor", "viewer"]);

/**
 * Global user role — separate from `buildingMemberRoleEnum` above, which is
 * scoped to a single building's sharing permissions. `admin` unlocks
 * site-wide user management (`/admin/users`); `auditor` is the normal
 * working role; `viewer` is a read-only global tier layered on top of
 * whatever buildings are explicitly shared with the user. See
 * `docs/social-features.md` for the full design.
 */
export const userRoleEnum = defineEnum(["admin", "auditor", "viewer"]);

export const conversationTypeEnum = defineEnum(["direct", "group"]);

/** "owner" can rename/add/remove members in a group; meaningless for "direct" conversations. */
export const conversationMemberRoleEnum = defineEnum(["owner", "member"]);
