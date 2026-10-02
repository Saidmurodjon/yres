import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";
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
