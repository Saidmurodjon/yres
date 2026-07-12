import { date, numeric, pgTable, uuid } from "drizzle-orm/pg-core";
import { energyCarrierEnum } from "./enums";

export const energyTariff = pgTable("energy_tariff", {
  id: uuid("id").primaryKey().defaultRandom(),
  energyCarrier: energyCarrierEnum("energy_carrier").notNull(),
  unitCostLocal: numeric("unit_cost_local", { mode: "number" }).notNull(),
  unitCostUsd: numeric("unit_cost_usd", { mode: "number" }).notNull(),
  emissionFactorKgCo2PerKwh: numeric("emission_factor_kg_co2_per_kwh", {
    mode: "number",
  }).notNull(),
  primaryEnergyFactor: numeric("primary_energy_factor", { mode: "number" }).notNull(),
  exchangeRateLocalPerUsd: numeric("exchange_rate_local_per_usd", { mode: "number" }).notNull(),
  effectiveDate: date("effective_date").notNull(),
});
