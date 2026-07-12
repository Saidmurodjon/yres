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
