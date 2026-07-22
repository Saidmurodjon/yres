import { energyCarrierEnum } from "@yres/db";
import { z } from "zod";

// consumptionKwh is deliberately NOT accepted from the client — it's always
// derived server-side from consumptionNative via
// `consumption.service.ts`'s CARRIER_KWH_PER_NATIVE_UNIT, since
// audit.engine.ts's calibration step silently skips any bill missing it and
// a client-supplied value could drift from the authoritative conversion.
const utilityBillInputSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  consumptionNative: z.number(),
  expenseLocal: z.number().nullable().optional(),
  tariffLocal: z.number().nullable().optional(),
});

export const createUtilityBillsSchema = z.object({
  bills: z.array(utilityBillInputSchema).min(1),
});

export type CreateUtilityBillsInput = z.infer<typeof createUtilityBillsSchema>;

const monthlyBillInputSchema = z.object({
  month: z.number().int().min(1).max(12),
  consumptionNative: z.number(),
  expenseLocal: z.number().nullable().optional(),
  tariffLocal: z.number().nullable().optional(),
});

// One full year of a single carrier's bills — matches the source workbook's
// layout (one table per energy carrier, a row per month) so the frontend can
// offer that as a grid instead of one add-a-bill form per month.
export const replaceUtilityBillsSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: z.number().int(),
  bills: z.array(monthlyBillInputSchema).max(12),
});
export type ReplaceUtilityBillsInput = z.infer<typeof replaceUtilityBillsSchema>;
