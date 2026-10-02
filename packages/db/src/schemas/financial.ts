import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { energyCarrierEnum } from "./enums";

export const energyTariff = sqliteTable("energy_tariff", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  energyCarrier: text("energy_carrier", { enum: energyCarrierEnum.enumValues }).notNull(),
  unitCostLocal: real("unit_cost_local").notNull(),
  unitCostUsd: real("unit_cost_usd").notNull(),
  emissionFactorKgCo2PerKwh: real("emission_factor_kg_co2_per_kwh").notNull(),
  primaryEnergyFactor: real("primary_energy_factor").notNull(),
  exchangeRateLocalPerUsd: real("exchange_rate_local_per_usd").notNull(),
  /** `YYYY-MM-DD`. */
  effectiveDate: text("effective_date").notNull(),
});

/**
 * v7.20 `Financial parameters` sheet, one row per building (PK = building_id). Only the real (input)
 * rates are stored; nominal discount/escalation are derived (Fisher) by the engine. No row = defaults
 * (`apps/api/src/lib/financial-defaults.ts`).
 */
export const buildingFinancialParameters = sqliteTable("building_financial_parameters", {
  buildingId: text("building_id")
    .primaryKey()
    .references(() => building.id, { onDelete: "cascade" }),
  baseYear: integer("base_year").notNull(),
  periodYears: integer("period_years").notNull(),
  inflationRate: real("inflation_rate").notNull(),
  realDiscountRate: real("real_discount_rate").notNull(),
  realEscalationGas: real("real_escalation_gas").notNull(),
  realEscalationElectricity: real("real_escalation_electricity").notNull(),
  /** District heat and coal. */
  realEscalationHeat: real("real_escalation_heat").notNull(),
  exchangeRateUzsPerUsd: real("exchange_rate_uzs_per_usd").notNull(),
  gasTariffUzsPerM3: real("gas_tariff_uzs_per_m3").notNull(),
  gasNcvKwhPerM3: real("gas_ncv_kwh_per_m3").notNull(),
  electricityTariffUzsPerKwh: real("electricity_tariff_uzs_per_kwh").notNull(),
  heatTariffUzsPerGcal: real("heat_tariff_uzs_per_gcal").notNull(),
  coalPriceUzsPerT: real("coal_price_uzs_per_t"),
  coalNcvKwhPerKg: real("coal_ncv_kwh_per_kg"),
  pvExportEnabled: integer("pv_export_enabled", { mode: "boolean" }).notNull().default(false),
  pvExportTariffUzsPerKwh: real("pv_export_tariff_uzs_per_kwh").notNull(),
  irrInitialGuess: real("irr_initial_guess").notNull(),
  tariffSource: text("tariff_source"),
  /** `YYYY-MM-DD`. */
  tariffEffectiveDate: text("tariff_effective_date"),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .$defaultFn(() => new Date()),
});
