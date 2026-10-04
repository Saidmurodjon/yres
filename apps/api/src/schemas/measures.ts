import { measureCategoryEnum } from "@yres/db";
import { z } from "zod";

export const selectMeasuresSchema = z.object({
  measureIds: z.array(z.string().uuid()).max(500),
  // A10: the revision the caller last saw for this building's "measures" entity (from GET
  // /:id/measures). Omit for the pre-A10 guard-less behavior.
  expectedRevision: z.number().int().min(0).max(1_000_000).optional(),
});

export type SelectMeasuresInput = z.infer<typeof selectMeasuresSchema>;

export const measureTargetSchema = z.object({
  kind: z.enum(["construction_type", "opening_type"]),
  code: z.string().min(1).max(100),
});

export const createMeasureSchema = z.object({
  name: z.string().min(1).max(300),
  category: z.enum(measureCategoryEnum.enumValues),
  investmentCostUsd: z.number().finite().nonnegative(),
  lifetimeYears: z.number().finite().int().positive().max(100).default(20),
  maintenanceCostPercent: z.number().finite().min(0).max(1).default(0),
  // Envelope measures: which "before" construction/opening types they replace (by code). Max 40 keeps the
  // POST/PUT batch at 1 insert + 1 delete + ceil(40 / floor(100/4)) = 3 statements.
  targets: z.array(measureTargetSchema).max(40).default([]),
});

export type CreateMeasureInput = z.infer<typeof createMeasureSchema>;

export const createNonEeMeasureSchema = z.object({
  description: z.string().min(1).max(10_000),
  unit: z.string().min(1).max(50).nullable().optional(),
  quantity: z.number().finite().positive().default(1),
  unitCostUsd: z.number().finite().nonnegative(),
  proposedForImplementation: z.boolean().default(true),
});

export type CreateNonEeMeasureInput = z.infer<typeof createNonEeMeasureSchema>;
