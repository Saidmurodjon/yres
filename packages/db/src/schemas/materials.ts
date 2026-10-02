import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const material = sqliteTable("material", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  thermalConductivityWPerMk: real("thermal_conductivity_w_per_mk").notNull(),
});

export const surfaceResistance = sqliteTable("surface_resistance", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  elementCategory: text("element_category").notNull().unique(),
  interiorResistanceM2kPerW: real("interior_resistance_m2k_per_w").notNull(),
  exteriorResistanceM2kPerW: real("exterior_resistance_m2k_per_w").notNull(),
});

export const pipeLossReference = sqliteTable("pipe_loss_reference", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  diameterClass: text("diameter_class").notNull(),
  insulated: text("insulated").notNull(), // 'insulated' | 'non_insulated'
  meanFluidTempC: real("mean_fluid_temp_c"),
  maxHeatFluxWPerM: real("max_heat_flux_w_per_m").notNull(),
});

export const lampType = sqliteTable("lamp_type", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  powerDensityWPerM2: real("power_density_w_per_m2").notNull(),
});

/**
 * The four fixed lamp-technology names (Lighting sheet, Q7:R11) that
 * `lightingZone.technologyMix`'s fraction keys correspond to 1:1. Shared
 * between seed.ts (which inserts exactly these rows) and
 * LightingService (which looks them up by name) so the two can't drift.
 */
export const LAMP_TYPE_NAMES = {
  incandescent: "Incandescent",
  fluorescentElectromagnetic: "Fluorescent (electromagnetic ballast)",
  fluorescentElectronic: "Fluorescent (electronic ballast)",
  led: "LED 600×600 37W",
} as const;
