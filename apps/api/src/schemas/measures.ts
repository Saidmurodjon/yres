import { measureCategoryEnum } from "@yres/db";
import { z } from "zod";

export const selectMeasuresSchema = z.object({
  measureIds: z.array(z.string().uuid()).max(500),
});

export type SelectMeasuresInput = z.infer<typeof selectMeasuresSchema>;

export const createMeasureSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.enum(measureCategoryEnum.enumValues),
  investmentCostUsd: z.number().finite().nonnegative(),
  lifetimeYears: z.number().finite().int().positive().max(100).default(20),
  maintenanceCostPercent: z.number().finite().min(0).max(1).default(0),
});

export type CreateMeasureInput = z.infer<typeof createMeasureSchema>;

export const createNonEeMeasureSchema = z.object({
  description: z.string().min(1).max(10_000),
  unit: z.string().min(1).max(50).nullable().optional(),
  quantity: z.number().finite().positive().default(1),
  unitCostUsd: z.number().finite().nonnegative(),
});

export type CreateNonEeMeasureInput = z.infer<typeof createNonEeMeasureSchema>;
