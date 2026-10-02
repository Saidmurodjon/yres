import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { building } from "./buildings";
import { energyCarrierEnum } from "./enums";

export const utilityBill = sqliteTable(
  "utility_bill",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    buildingId: text("building_id")
      .notNull()
      .references(() => building.id, { onDelete: "cascade" }),
    energyCarrier: text("energy_carrier", { enum: energyCarrierEnum.enumValues }).notNull(),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    consumptionNative: real("consumption_native").notNull(),
    consumptionKwh: real("consumption_kwh"),
    expenseLocal: real("expense_local"),
    tariffLocal: real("tariff_local"),
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
