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
  // 4 carriers × 12 months × 3 years = 144 rows; 9 columns → 11 rows/stmt → 14 chunks + session
  // (≤ 2) + findAccessibleBuilding (1) + audit_event (1, A09a) = 18 ≤ 40 budget.
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
// 12 rows, 9 columns → 1 delete + 2 insert chunks (11 rows/stmt) + session (≤ 2) +
// findAccessibleBuilding (1) + audit_event (1, A09a) = 7 ≤ 40 budget. A10's `expectedRevision`
// adds no batch statement; the unguarded path spends 1 extra query (getRevisions) to report the
// new revision, 8 ≤ 40.
export const replaceUtilityBillsSchema = z.object({
  energyCarrier: z.enum(energyCarrierEnum.enumValues),
  year: yearSchema,
  bills: z.array(monthlyBillInputSchema).max(12),
  // A10: the revision the caller last saw for this building's "consumption" entity (from GET
  // /:id/consumption). Omit for the pre-A10 guard-less behavior.
  expectedRevision: z.number().int().min(0).max(1_000_000).optional(),
});
export type ReplaceUtilityBillsInput = z.infer<typeof replaceUtilityBillsSchema>;

// Several years × carriers replaced in ONE request (atomic). Query budget (database.md, ≤ 40): per year the
// whole year is replaced by one delete; worst case 5 years × 4 carriers × 12 months = 240 rows, 9 columns →
// 11 rows per statement → 22 inserts + 1 delete = 23 (+ ≤ 4 for session/findAccessibleBuilding +
// 1 audit_event, A09a) = 28. A10's `expectedRevision` adds no batch statement; unguarded, +1
// query (getRevisions) to report the new revision = 29 ≤ 40.
export const bulkReplaceUtilityBillsSchema = z
  .object({
    years: z
      .array(
        z.object({
          year: yearSchema,
          carriers: z
            .array(
              z.object({
                energyCarrier: z.enum(energyCarrierEnum.enumValues),
                bills: z.array(monthlyBillInputSchema).max(12),
              }),
            )
            .max(energyCarrierEnum.enumValues.length),
        }),
      )
      .min(1)
      .max(5),
    // A10: see replaceUtilityBillsSchema's comment.
    expectedRevision: z.number().int().min(0).max(1_000_000).optional(),
  })
  .superRefine((value, ctx) => {
    const years = new Set<number>();
    for (const [i, entry] of value.years.entries()) {
      if (years.has(entry.year)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["years", i, "year"],
          message: "Duplicate year",
        });
      }
      years.add(entry.year);
      const carriers = new Set<string>();
      for (const [j, c] of entry.carriers.entries()) {
        if (carriers.has(c.energyCarrier)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["years", i, "carriers", j, "energyCarrier"],
            message: "Duplicate carrier within a year",
          });
        }
        carriers.add(c.energyCarrier);
      }
    }
  });
export type BulkReplaceUtilityBillsInput = z.infer<typeof bulkReplaceUtilityBillsSchema>;
