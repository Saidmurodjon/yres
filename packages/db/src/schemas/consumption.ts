import { relations } from "drizzle-orm";
import { integer, numeric, pgTable, unique, uuid } from "drizzle-orm/pg-core";
import { building } from "./buildings";
import { energyCarrierEnum } from "./enums";

export const utilityBill = pgTable(
  "utility_bill",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    buildingId: uuid("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    energyCarrier: energyCarrierEnum("energy_carrier").notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    consumptionNative: numeric("consumption_native", { mode: "number" }).notNull(),
    consumptionKwh: numeric("consumption_kwh", { mode: "number" }),
    expenseLocal: numeric("expense_local", { mode: "number" }),
    tariffLocal: numeric("tariff_local", { mode: "number" }),
  },
  // One bill per building/carrier/year/month — required for the consumption
  // grid's "save a whole year at once" endpoint to upsert (onConflictDoUpdate)
  // instead of silently accumulating duplicate rows every time it's saved.
  (table) => [
    unique("utility_bill_building_id_energy_carrier_year_month_unique").on(
      table.buildingId,
      table.energyCarrier,
      table.year,
      table.month,
    ),
  ],
);

export const utilityBillRelations = relations(utilityBill, ({ one }) => ({
  building: one(building, { fields: [utilityBill.buildingId], references: [building.id] }),
}));
