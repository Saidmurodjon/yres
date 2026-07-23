/**
 * Stable keys identifying which report chart/section an auditor note
 * attaches to (docs/report-redesign-proposal.md §5b) — a fixed, known set
 * even though the `report_annotation.section_key` column itself is plain
 * text (see that schema's doc comment for why it isn't an enum/FK). Kept
 * here, not in `@yres/db`, so both the frontend UI and the PDF renderer
 * agree on exactly which sections can carry a note without depending on
 * the database package.
 */
export const REPORT_ANNOTATION_SECTION_KEYS = [
  "consumption_gas",
  "consumption_electricity",
  "consumption_district_heat",
  "consumption_coal",
  "envelope_ventilation_loss",
  "final_energy",
  "renewable_offset",
] as const;

export type ReportAnnotationSectionKey = (typeof REPORT_ANNOTATION_SECTION_KEYS)[number];

export function consumptionAnnotationSectionKey(
  carrier: "gas" | "electricity" | "district_heat" | "coal",
): ReportAnnotationSectionKey {
  return `consumption_${carrier}` as ReportAnnotationSectionKey;
}
