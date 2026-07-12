import { z } from "zod";

export const selectMeasuresSchema = z.object({
  measureIds: z.array(z.string().uuid()),
});

export type SelectMeasuresInput = z.infer<typeof selectMeasuresSchema>;
