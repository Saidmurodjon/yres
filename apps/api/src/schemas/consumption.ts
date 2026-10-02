import { energyCarrierEnum } from "@yres/db";
import { z } from "zod";

// consumptionKwh is deliberately NOT accepted from the client — it's always
// derived server-side from consumptionNative via
// `consumption.service.ts`'s CARRIER_KWH_PER_NATIVE_UNIT, since
// audit.engine.ts's calibration step silently skips any bill missing it and
// a client-supplied value could drift from the authoritative conversion.
// Calendar years the app can sensibly hold bills for; amounts cannot be negative or non-finite.
const yearSchema = z.number().finite().int().min(1990).max(2100);
const amountSchema = z.number().finite().nonnegative();

const utilityBillInputSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: yearSchema,
  month: z.number().finite().int().min(1).max(12),
  consumptionNative: amountSchema,
  expenseLocal: amountSchema.nullable().optional(),
  tariffLocal: amountSchema.nullable().optional(),
});

export const createUtilityBillsSchema = z.object({
  // 4 carriers × 12 months × 3 years = 144 rows; 9 columns → 11 rows/stmt → 14 chunks (≤ 40 budget).
  bills: z.array(utilityBillInputSchema).min(1).max(144),
});

export type CreateUtilityBillsInput = z.infer<typeof createUtilityBillsSchema>;

const monthlyBillInputSchema = z.object({
  month: z.number().finite().int().min(1).max(12),
  consumptionNative: amountSchema,
  expenseLocal: amountSchema.nullable().optional(),
  tariffLocal: amountSchema.nullable().optional(),
});

// One full year of a single carrier's bills — matches the source workbook's
// layout (one table per energy carrier, a row per month) so the frontend can
// offer that as a grid instead of one add-a-bill form per month.
export const replaceUtilityBillsSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: yearSchema,
  bills: z.array(monthlyBillInputSchema).max(12),
});
export type ReplaceUtilityBillsInput = z.infer<typeof replaceUtilityBillsSchema>;
