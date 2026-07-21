import type { TFunction } from "i18next";
import type { EnergyCarrier } from "../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS } from "../../lib/labels";

export interface ParsedBillRow {
  year: number;
  month: number;
  energyCarrier: EnergyCarrier;
  consumptionNative: number;
  consumptionKwh: number | null;
  expenseLocal: number | null;
  tariffLocal: number | null;
}

/**
 * Header text recognized when parsing an uploaded workbook, in every locale
 * the app can generate a template in — so a file downloaded in one language
 * still parses correctly if uploaded during a session in another. Matched
 * case-insensitively, trimmed. Keep in sync with the header row written by
 * `downloadConsumptionTemplate` below (uz/en/ru versions of the same six
 * columns), not with `consumption.json`'s other (unrelated) UI strings.
 */
const HEADER_ALIASES: Record<
  "year" | "month" | "carrier" | "consumptionNative" | "consumptionKwh" | "expenseLocal" | "tariffLocal",
  string[]
> = {
  year: ["yil", "year", "год"],
  month: ["oy", "month", "месяц"],
  carrier: ["tashuvchi", "carrier", "energy carrier", "носитель", "энергоноситель"],
  consumptionNative: ["miqdor", "amount", "consumption", "количество", "потребление"],
  consumptionKwh: [
    "miqdor (kvt·soat)",
    "miqdor (kvt soat)",
    "amount (kwh)",
    "consumption (kwh)",
    "количество (квт·ч)",
  ],
  expenseLocal: ["xarajat", "expense", "cost", "расход", "затраты"],
  tariffLocal: ["tarif", "tariff", "тариф"],
};

/** Carrier text recognized in the "Tashuvchi" column: the raw enum key, or any locale's label. */
function matchCarrier(raw: string): EnergyCarrier | null {
  const normalized = raw.trim().toLowerCase();
  for (const carrier of ENERGY_CARRIERS) {
    if (carrier === normalized) return carrier;
    if (ENERGY_CARRIER_LABELS[carrier].toLowerCase() === normalized) return carrier;
  }
  return null;
}

function normalizeHeader(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase();
}

function findColumn(headerRow: unknown[], aliases: string[]): number {
  return headerRow.findIndex((cell) => aliases.includes(normalizeHeader(cell)));
}

export async function parseConsumptionWorkbook(
  file: File,
  t: TFunction,
): Promise<{ rows: ParsedBillRow[]; errors: string[] }> {
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    return { rows: [], errors: [t("excel.errors.emptyFile")] };
  }
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) {
    return { rows: [], errors: [t("excel.errors.emptyFile")] };
  }
  const table: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  const headerRow = table[0] ?? [];
  const columnIndex = {
    year: findColumn(headerRow, HEADER_ALIASES.year),
    month: findColumn(headerRow, HEADER_ALIASES.month),
    carrier: findColumn(headerRow, HEADER_ALIASES.carrier),
    consumptionNative: findColumn(headerRow, HEADER_ALIASES.consumptionNative),
    consumptionKwh: findColumn(headerRow, HEADER_ALIASES.consumptionKwh),
    expenseLocal: findColumn(headerRow, HEADER_ALIASES.expenseLocal),
    tariffLocal: findColumn(headerRow, HEADER_ALIASES.tariffLocal),
  };

  if (columnIndex.year === -1 || columnIndex.month === -1 || columnIndex.carrier === -1) {
    return { rows: [], errors: [t("excel.errors.missingColumns")] };
  }

  const rows: ParsedBillRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < table.length; i++) {
    const dataRow = table[i];
    if (!dataRow || dataRow.length === 0) continue;
    const rowNumber = i + 1;

    const year = Number(dataRow[columnIndex.year]);
    const month = Number(dataRow[columnIndex.month]);
    const carrier = matchCarrier(String(dataRow[columnIndex.carrier] ?? ""));
    const consumptionNative =
      columnIndex.consumptionNative !== -1 ? Number(dataRow[columnIndex.consumptionNative]) : Number.NaN;

    if (!Number.isFinite(year)) {
      errors.push(t("excel.errors.invalidYear", { row: rowNumber }));
      continue;
    }
    if (!Number.isFinite(month) || month < 1 || month > 12) {
      errors.push(t("excel.errors.invalidMonth", { row: rowNumber }));
      continue;
    }
    if (!carrier) {
      errors.push(t("excel.errors.invalidCarrier", { row: rowNumber }));
      continue;
    }
    if (!Number.isFinite(consumptionNative)) {
      errors.push(t("excel.errors.invalidConsumption", { row: rowNumber }));
      continue;
    }

    const readOptionalNumber = (colIdx: number): number | null => {
      if (colIdx === -1) return null;
      const raw = dataRow[colIdx];
      if (raw === undefined || raw === null || raw === "") return null;
      const value = Number(raw);
      return Number.isFinite(value) ? value : null;
    };

    rows.push({
      year,
      month,
      energyCarrier: carrier,
      consumptionNative,
      consumptionKwh: readOptionalNumber(columnIndex.consumptionKwh),
      expenseLocal: readOptionalNumber(columnIndex.expenseLocal),
      tariffLocal: readOptionalNumber(columnIndex.tariffLocal),
    });
  }

  return { rows, errors };
}

export async function downloadConsumptionTemplate(t: TFunction): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = [
    t("excel.template.columnYear"),
    t("excel.template.columnMonth"),
    t("excel.template.columnCarrier"),
    t("excel.template.columnConsumption"),
    t("excel.template.columnConsumptionKwh"),
    t("excel.template.columnExpense"),
    t("excel.template.columnTariff"),
  ];
  const exampleYear = new Date().getFullYear();
  const exampleRow = [exampleYear, 1, ENERGY_CARRIER_LABELS.gas, 1234, 11722, 3085000, 2500];

  const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, t("excel.template.sheetName"));

  const readMeRows = [
    [t("excel.template.readMeTitle")],
    [t("excel.template.readMeInstructions")],
    [t("excel.template.readMeCarriersLabel")],
    ...ENERGY_CARRIERS.map((c) => [ENERGY_CARRIER_LABELS[c]]),
  ];
  const readMeSheet = XLSX.utils.aoa_to_sheet(readMeRows);
  XLSX.utils.book_append_sheet(workbook, readMeSheet, t("excel.template.readMeSheetName"));

  const arrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = t("excel.template.fileName");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
