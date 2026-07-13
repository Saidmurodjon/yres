import { energyCarrierEnum } from "@yres/db";
import { z } from "zod";

const utilityBillInputSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  consumptionNative: z.number(),
  consumptionKwh: z.number().nullable().optional(),
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
  consumptionKwh: z.number().nullable().optional(),
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
