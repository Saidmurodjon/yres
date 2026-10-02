import type { TFunction } from "i18next";
import type { EnergyCarrier } from "../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS } from "../../lib/labels";
import { type NumberLocale, parseLocaleNumber } from "../../lib/number";
import { ENERGY_CARRIER_NATIVE_UNIT_LABELS } from "./consumption-units";

export interface ParsedBillRow {
  year: number;
  month: number;
  energyCarrier: EnergyCarrier;
  consumptionNative: number;
  tariffLocal: number | null;
}

/**
 * Header text recognized when parsing an uploaded workbook, in every locale
 * the app can generate a template in — so a file downloaded in one language
 * still parses correctly if uploaded during a session in another. Matched
 * case-insensitively, trimmed. Keep in sync with the header row written by
 * `downloadConsumptionTemplate` below, not with `consumption.json`'s other
 * (unrelated) UI strings.
 *
 * `consumptionKwhLegacy` isn't written into the current template — it's
 * recognized only so a file downloaded before the native-unit-first
 * redesign (a "Miqdor (kVt·soat)" column) still parses; its value is
 * treated as a native reading only for electricity, where kWh IS the
 * native unit, since for other carriers a pre-converted kWh figure can't
 * be un-converted back to a native reading.
 */
const HEADER_ALIASES: Record<
  "year" | "month" | "carrier" | "consumptionNative" | "consumptionKwhLegacy" | "tariffLocal",
  string[]
> = {
  year: ["yil", "year", "год"],
  month: ["oy", "month", "месяц"],
  carrier: ["tashuvchi", "carrier", "energy carrier", "носитель", "энергоноситель"],
  consumptionNative: [
    "miqdor (asl birlik)",
    "amount (native unit)",
    "количество (в своей единице)",
    "miqdor",
    "amount",
    "количество",
  ],
  consumptionKwhLegacy: [
    "miqdor (kvt·soat)",
    "miqdor (kvt soat)",
    "amount (kwh)",
    "consumption (kwh)",
    "количество (квт·ч)",
  ],
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

type CellNumber = { ok: true; value: number } | { ok: false; reason: "empty" | "invalid" };

/**
 * A spreadsheet cell as a number: real numeric cells as-is, text cells ("12,5") through
 * `parseLocaleNumber` in the app's language (the file's own locale is unknown). Nothing is guessed — an
 * unreadable cell is "invalid", never 0 and never skipped silently.
 */
function readNumberCell(cell: unknown, locale: NumberLocale, integer = false): CellNumber {
  if (cell === undefined || cell === null || cell === "") return { ok: false, reason: "empty" };
  if (typeof cell === "number") {
    return Number.isFinite(cell) && (!integer || Number.isInteger(cell))
      ? { ok: true, value: cell }
      : { ok: false, reason: "invalid" };
  }
  if (typeof cell === "string") return parseLocaleNumber(cell, locale, { integer });
  return { ok: false, reason: "invalid" };
}

export async function parseConsumptionWorkbook(
  file: File,
  t: TFunction,
  locale: NumberLocale,
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
    consumptionKwhLegacy: findColumn(headerRow, HEADER_ALIASES.consumptionKwhLegacy),
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

    const yearCell = readNumberCell(dataRow[columnIndex.year], locale, true);
    const monthCell = readNumberCell(dataRow[columnIndex.month], locale, true);
    const carrier = matchCarrier(String(dataRow[columnIndex.carrier] ?? ""));

    if (!yearCell.ok) {
      errors.push(t("excel.errors.invalidYear", { row: rowNumber }));
      continue;
    }
    if (!monthCell.ok || monthCell.value < 1 || monthCell.value > 12) {
      errors.push(t("excel.errors.invalidMonth", { row: rowNumber }));
      continue;
    }
    const year = yearCell.value;
    const month = monthCell.value;
    if (!carrier) {
      errors.push(t("excel.errors.invalidCarrier", { row: rowNumber }));
      continue;
    }

    const nativeCell =
      columnIndex.consumptionNative !== -1
        ? readNumberCell(dataRow[columnIndex.consumptionNative], locale)
        : ({ ok: false, reason: "empty" } as const);
    // A legacy "kWh" column is only usable as-is for electricity (native
    // unit = kWh already); for other carriers a pre-converted figure can't
    // be reversed back to a native reading, so it's ignored for them.
    const legacyCell =
      carrier === "electricity" && columnIndex.consumptionKwhLegacy !== -1
        ? readNumberCell(dataRow[columnIndex.consumptionKwhLegacy], locale)
        : ({ ok: false, reason: "empty" } as const);
    // The legacy column only fills in an EMPTY amount cell; an unreadable amount is an error, not a reason to
    // fall back to another column.
    const consumptionCell =
      nativeCell.ok || nativeCell.reason === "invalid" ? nativeCell : legacyCell;

    if (!consumptionCell.ok) {
      errors.push(t("excel.errors.invalidConsumption", { row: rowNumber }));
      continue;
    }
    const consumptionNative = consumptionCell.value;

    const tariffCell =
      columnIndex.tariffLocal !== -1
        ? readNumberCell(dataRow[columnIndex.tariffLocal], locale)
        : ({ ok: false, reason: "empty" } as const);
    if (!tariffCell.ok && tariffCell.reason === "invalid") {
      // A tariff that cannot be read must not silently become "no tariff".
      errors.push(t("excel.errors.invalidTariff", { row: rowNumber }));
      continue;
    }
    const tariffLocal = tariffCell.ok ? tariffCell.value : null;

    rows.push({ year, month, energyCarrier: carrier, consumptionNative, tariffLocal });
  }

  return { rows, errors };
}

export async function downloadConsumptionTemplate(t: TFunction): Promise<void> {
  const XLSX = await import("xlsx");

  const headers = [
    t("excel.template.columnYear"),
    t("excel.template.columnMonth"),
    t("excel.template.columnCarrier"),
    t("excel.template.columnConsumptionNative"),
    t("excel.template.columnTariff"),
  ];
  const exampleYear = new Date().getFullYear();
  const exampleRow = [exampleYear, 1, ENERGY_CARRIER_LABELS.gas, 7274, 2500];

  const sheet = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, t("excel.template.sheetName"));

  const readMeRows = [
    [t("excel.template.readMeTitle")],
    [t("excel.template.readMeInstructions")],
    [t("excel.template.readMeCarriersLabel")],
    ...ENERGY_CARRIERS.map((c) => [
      `${ENERGY_CARRIER_LABELS[c]} — ${ENERGY_CARRIER_NATIVE_UNIT_LABELS[c]}`,
    ]),
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
