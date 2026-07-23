import { REPORT_ANNOTATION_SECTION_KEYS } from "@yres/types";
import { z } from "zod";

export const upsertReportAnnotationSchema = z.object({
  note: z.string().max(2000),
});

export type UpsertReportAnnotationInput = z.infer<typeof upsertReportAnnotationSchema>;

export const reportAnnotationSectionKeySchema = z.enum(REPORT_ANNOTATION_SECTION_KEYS);
