import { measureCategoryEnum } from "@yres/db";
import { z } from "zod";

export const selectMeasuresSchema = z.object({
  measureIds: z.array(z.string().uuid()),
});

export type SelectMeasuresInput = z.infer<typeof selectMeasuresSchema>;

export const createMeasureSchema = z.object({
  name: z.string().min(1),
  category: z.enum(measureCategoryEnum.enumValues),
  investmentCostUsd: z.number().nonnegative(),
  lifetimeYears: z.number().int().positive().default(20),
  maintenanceCostPercent: z.number().min(0).max(1).default(0),
});

export type CreateMeasureInput = z.infer<typeof createMeasureSchema>;
