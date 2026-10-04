import { z } from "zod";

const rate = z.number().finite().min(-0.5).max(1);
const tariff = z.number().finite().min(0).max(1e9);
const text = z.string().max(500);

export const financialParametersSchema = z.object({
  baseYear: z.number().int().min(2000).max(2100),
  periodYears: z.number().int().min(1).max(50),
  inflationRate: rate,
  realDiscountRate: rate,
  realEscalationGas: rate,
  realEscalationElectricity: rate,
  realEscalationHeat: rate,
  exchangeRateUzsPerUsd: z.number().finite().gt(0).max(1e6),
  gasTariffUzsPerM3: tariff,
  gasNcvKwhPerM3: z.number().finite().gt(0).max(100),
  electricityTariffUzsPerKwh: tariff,
  heatTariffUzsPerGcal: tariff,
  coalPriceUzsPerT: tariff.nullable(),
  coalNcvKwhPerKg: z.number().finite().gt(0).max(100).nullable(),
  pvExportEnabled: z.boolean(),
  pvExportTariffUzsPerKwh: tariff,
  irrInitialGuess: rate,
  tariffSource: text.nullable(),
  tariffEffectiveDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  // A10: the revision the caller last saw for this building's "financial" entity (from GET
  // /:id/financial-parameters). Omit for the pre-A10 guard-less behavior.
  expectedRevision: z.number().int().min(0).max(1_000_000).optional(),
});
export type FinancialParametersInput = z.infer<typeof financialParametersSchema>;
