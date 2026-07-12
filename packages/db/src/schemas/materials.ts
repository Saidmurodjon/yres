import { numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const material = pgTable("material", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  thermalConductivityWPerMk: numeric("thermal_conductivity_w_per_mk", {
    mode: "number",
  }).notNull(),
});

export const surfaceResistance = pgTable("surface_resistance", {
  id: uuid("id").primaryKey().defaultRandom(),
  elementCategory: text("element_category").notNull().unique(),
  interiorResistanceM2kPerW: numeric("interior_resistance_m2k_per_w", {
    mode: "number",
  }).notNull(),
  exteriorResistanceM2kPerW: numeric("exterior_resistance_m2k_per_w", {
    mode: "number",
  }).notNull(),
});

export const pipeLossReference = pgTable("pipe_loss_reference", {
  id: uuid("id").primaryKey().defaultRandom(),
  diameterClass: text("diameter_class").notNull(),
  insulated: text("insulated").notNull(), // 'insulated' | 'non_insulated'
  meanFluidTempC: numeric("mean_fluid_temp_c", { mode: "number" }),
  maxHeatFluxWPerM: numeric("max_heat_flux_w_per_m", { mode: "number" }).notNull(),
});

export const lampType = pgTable("lamp_type", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  powerDensityWPerM2: numeric("power_density_w_per_m2", { mode: "number" }).notNull(),
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
