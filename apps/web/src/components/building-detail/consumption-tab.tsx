import { consumptionAnnotationSectionKey } from "@yres/types";
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@yres/ui";
import type { TFunction } from "i18next";
import { Download, Plus, Save, Upload } from "lucide-react";
import type { ClipboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBulkReplaceConsumption, useConsumption } from "../../hooks";
import { ApiError } from "../../lib/api";
import type {
  BulkReplaceYearInput,
  EnergyCarrier,
  MonthlyBillInput,
  UtilityBill,
} from "../../lib/api-types";
import {
  ENERGY_CARRIERS,
  ENERGY_CARRIER_LABELS,
  MONTH_LABELS,
  formatNumber,
} from "../../lib/labels";
import {
  type NumberLocale,
  formatNumberForInput,
  parseLocaleNumber,
  toNumberLocale,
} from "../../lib/number";
import { AuditorNote } from "../auditor-note";
import { NumberInput } from "../number-input";
import { useRegisterDirty } from "../unsaved-changes";
import { MonthlyComparisonChart } from "./consumption-comparison-chart";
import {
  type ParsedBillRow,
  downloadConsumptionTemplate,
  parseConsumptionWorkbook,
} from "./consumption-excel";
import { ENERGY_CARRIER_NATIVE_UNIT_LABELS, previewConsumptionKwh } from "./consumption-units";

/** Matches the API (schemas/consumption.ts). */
/** The API accepts at most this many years per save (schemas/consumption.ts); more is never split silently. */
const MAX_YEARS_PER_SAVE = 5;
const MIN_YEAR = 1990;
const MAX_YEAR = 2100;

// One row per carrier (not per month) — 12 native-unit readings plus a
// single tariff that applies to the whole year, matching how these bills
// are actually billed in practice (the tariff rarely changes month to
// month; real data confirmed this — see PROGRESS.md).
interface CarrierYearRow {
  months: string[]; // length 12, index 0 = January
  tariffLocal: string;
}

type YearGrid = Record<EnergyCarrier, CarrierYearRow>;

function emptyCarrierRow(): CarrierYearRow {
  return { months: Array.from({ length: 12 }, () => ""), tariffLocal: "" };
}

function emptyYearGrid(): YearGrid {
  return Object.fromEntries(ENERGY_CARRIERS.map((c) => [c, emptyCarrierRow()])) as YearGrid;
}

function gridsFromBills(
  bills: UtilityBill[],
  years: number[],
  locale: NumberLocale,
): Record<number, YearGrid> {
  const grids: Record<number, YearGrid> = {};
  for (const year of years) grids[year] = emptyYearGrid();
  for (const bill of bills) {
    const yearGrid = grids[bill.year] ?? emptyYearGrid();
    grids[bill.year] = yearGrid;
    const row = yearGrid[bill.energyCarrier];
    row.months[bill.month - 1] = formatNumberForInput(bill.consumptionNative, locale);
    if (bill.tariffLocal !== null && !row.tariffLocal) {
      row.tariffLocal = formatNumberForInput(bill.tariffLocal, locale);
    }
  }
  return grids;
}

function mergeParsedRows(
  prev: Record<number, YearGrid>,
  rows: ParsedBillRow[],
  locale: NumberLocale,
): Record<number, YearGrid> {
  const next = { ...prev };
  for (const parsed of rows) {
    const existingYearGrid = next[parsed.year];
    const yearGrid = existingYearGrid ? { ...existingYearGrid } : emptyYearGrid();
    const existingRow = yearGrid[parsed.energyCarrier];
    const months = [...existingRow.months];
    months[parsed.month - 1] = formatNumberForInput(parsed.consumptionNative, locale);
    yearGrid[parsed.energyCarrier] = {
      months,
      tariffLocal:
        parsed.tariffLocal !== null
          ? formatNumberForInput(parsed.tariffLocal, locale)
          : existingRow.tariffLocal,
    };
    next[parsed.year] = yearGrid;
  }
  return next;
}

/**
 * Parses one year's grid for saving. A cell that has text but is not a number is reported in `invalid`
 * (with where it is) and the caller must NOT save — it is never skipped or turned into 0, which used to
 * drop a mistyped month silently. Empty cells are simply "no bill for that month".
 */
function buildBillGroupsForYear(
  yearGrid: YearGrid,
  locale: NumberLocale,
  t: TFunction,
): { groups: { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[]; invalid: string[] } {
  const groups: { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[] = [];
  const invalid: string[] = [];
  for (const carrier of ENERGY_CARRIERS) {
    const row = yearGrid[carrier];
    const carrierLabel = ENERGY_CARRIER_LABELS[carrier];

    let tariffLocal: number | null = null;
    const tariff = parseLocaleNumber(row.tariffLocal, locale);
    if (tariff.ok) tariffLocal = tariff.value;
    else if (tariff.reason === "invalid") invalid.push(`${carrierLabel} — ${t("columnTariff")}`);

    const bills: MonthlyBillInput[] = [];
    for (const [idx, raw] of row.months.entries()) {
      const parsed = parseLocaleNumber(raw, locale);
      if (!parsed.ok) {
        if (parsed.reason === "invalid") {
          invalid.push(
            `${carrierLabel} — ${MONTH_LABELS[idx] ?? t("monthFallback", { n: idx + 1 })}`,
          );
        }
        continue;
      }
      bills.push({ month: idx + 1, consumptionNative: parsed.value, tariffLocal });
    }
    // An emptied carrier is sent with `bills: []`: the server replaces the whole year, so this clears it.
    groups.push({ energyCarrier: carrier, bills });
  }
  return { groups, invalid };
}

/** Splits pasted Excel text into trimmed values — a copied row is tab-separated, a copied column is newline-separated. */
function splitPastedValues(text: string): string[] {
  const normalized = text.includes("\t") ? text.replace(/\r?\n/g, "\t") : text;
  const separator = normalized.includes("\t") ? "\t" : /\r?\n/;
  return normalized
    .split(separator)
    .map((v) => v.trim())
    .filter((v) => v !== "");
}

export function ConsumptionTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { t, i18n } = useTranslation("consumption");
  const locale = toNumberLocale(i18n.language);
  const { data, isLoading, isError, error } = useConsumption(buildingId, { pageSize: 500 });
  const bulkReplace = useBulkReplaceConsumption(buildingId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bills = useMemo(() => data?.bills ?? [], [data]);
  const currentYear = new Date().getFullYear();

  const [years, setYears] = useState<number[]>([currentYear, currentYear - 1, currentYear - 2]);
  const [activeYear, setActiveYear] = useState(String(currentYear));
  const [gridsByYear, setGridsByYear] = useState<Record<number, YearGrid>>({});
  const [initialized, setInitialized] = useState(false);
  const [newYearValue, setNewYearValue] = useState(String(currentYear + 1));
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importErrorDetails, setImportErrorDetails] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  // What the grids looked like when loaded / last saved; a (year, carrier) differing from it is unsaved.
  const [baseline, setBaseline] = useState<Record<number, YearGrid>>({});
  const dirtyByYear = useMemo(() => {
    const result = new Map<number, number>();
    for (const [yearKey, grid] of Object.entries(gridsByYear)) {
      const year = Number(yearKey);
      const base = baseline[year] ?? emptyYearGrid();
      const count = ENERGY_CARRIERS.filter(
        (c) => JSON.stringify(grid[c]) !== JSON.stringify(base[c]),
      ).length;
      if (count > 0) result.set(year, count);
    }
    return result;
  }, [gridsByYear, baseline]);
  // A cell with text that is not a number is flagged at once (red border, aria-invalid, message in the
  // title) - not only in the save error - so the offending cell is findable.
  const cellError = (raw: string) => {
    const parsed = parseLocaleNumber(raw, locale);
    return !parsed.ok && parsed.reason === "invalid" ? t("common:number.invalid") : undefined;
  };
  const dirtyGroupCount = [...dirtyByYear.values()].reduce((sum, n) => sum + n, 0);
  useRegisterDirty("consumption", dirtyGroupCount > 0);

  // Derive the initial grids from the server's saved bills exactly once,
  // when the first fetch lands — not on every refetch, so in-progress edits
  // across (possibly several open) year tabs are never clobbered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on load, see above.
  useEffect(() => {
    if (isLoading || initialized) return;
    const fromData = bills.map((b) => b.year);
    const initialYears = [...new Set([...fromData, ...years])].sort((a, b) => b - a);
    setYears(initialYears);
    const initialGrids = gridsFromBills(bills, initialYears, locale);
    setGridsByYear(initialGrids);
    setBaseline(structuredClone(initialGrids));
    setInitialized(true);
  }, [isLoading, initialized]);

  function gridFor(year: number): YearGrid {
    return gridsByYear[year] ?? emptyYearGrid();
  }

  function updateMonth(year: number, carrier: EnergyCarrier, monthIdx: number, value: string) {
    setGridsByYear((prev) => {
      const yearGrid = prev[year] ?? emptyYearGrid();
      const row = yearGrid[carrier];
      const months = row.months.map((m, i) => (i === monthIdx ? value : m));
      return { ...prev, [year]: { ...yearGrid, [carrier]: { ...row, months } } };
    });
    setSaved(false);
  }

  function updateTariff(year: number, carrier: EnergyCarrier, value: string) {
    setGridsByYear((prev) => {
      const yearGrid = prev[year] ?? emptyYearGrid();
      const row = yearGrid[carrier];
      return { ...prev, [year]: { ...yearGrid, [carrier]: { ...row, tariffLocal: value } } };
    });
    setSaved(false);
  }

  function handleMonthPaste(
    e: ClipboardEvent<HTMLInputElement>,
    year: number,
    carrier: EnergyCarrier,
    startIdx: number,
  ) {
    const values = splitPastedValues(e.clipboardData.getData("text"));
    if (values.length <= 1) return;
    e.preventDefault();
    setGridsByYear((prev) => {
      const yearGrid = prev[year] ?? emptyYearGrid();
      const row = yearGrid[carrier];
      const months = [...row.months];
      values.forEach((value, i) => {
        const idx = startIdx + i;
        if (idx > 11) return;
        months[idx] = value;
      });
      return { ...prev, [year]: { ...yearGrid, [carrier]: { ...row, months } } };
    });
    setSaved(false);
  }

  function addYear() {
    const parsedYear = parseLocaleNumber(newYearValue, locale, { integer: true });
    // An unreadable or out-of-range year adds nothing; the field itself shows why (NumberInput, on blur).
    if (!parsedYear.ok || parsedYear.value < MIN_YEAR || parsedYear.value > MAX_YEAR) return;
    const parsed = parsedYear.value;
    if (!years.includes(parsed)) {
      setYears((y) => [...y, parsed].sort((a, b) => b - a));
      setGridsByYear((prev) => ({ ...prev, [parsed]: prev[parsed] ?? emptyYearGrid() }));
    }
    setActiveYear(String(parsed));
  }

  /**
   * One atomic request for every edited year (all carriers of each — the server replaces whole years, so an
   * emptied carrier clears its old rows). Any unreadable cell stops the whole save; nothing is skipped.
   */
  async function handleSaveAll() {
    setSaveError(null);
    setSaved(false);
    const dirtyYears = [...dirtyByYear.keys()].sort((a, b) => b - a);
    if (dirtyYears.length > MAX_YEARS_PER_SAVE) {
      setSaveError(t("tooManyYears", { count: dirtyYears.length, max: MAX_YEARS_PER_SAVE }));
      return;
    }
    const invalid: string[] = [];
    const payload: BulkReplaceYearInput[] = [];
    for (const year of dirtyYears) {
      const result = buildBillGroupsForYear(gridFor(year), locale, t);
      invalid.push(...result.invalid.map((where) => `${year}: ${where}`));
      payload.push({ year, carriers: result.groups });
    }
    if (invalid.length > 0) {
      const shown = invalid.slice(0, 3).join("; ");
      const more =
        invalid.length > 3 ? ` ${t("invalidNumberAtMore", { count: invalid.length - 3 })}` : "";
      setSaveError(`${t("invalidNumberAt", { where: shown })}${more}`);
      return;
    }

    try {
      await bulkReplace.mutateAsync(payload);
      setSaved(true);
      setBaseline(structuredClone(gridsByYear));
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("saveFailed"));
    }
  }

  async function handleFileSelected(file: File) {
    setImporting(true);
    setImportMessage(null);
    setImportErrorDetails([]);
    try {
      const { rows, errors } = await parseConsumptionWorkbook(file, t, locale);

      setGridsByYear((prev) => mergeParsedRows(prev, rows, locale));

      const importedYears = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
      if (importedYears.length > 0) {
        setYears((prev) => [...new Set([...prev, ...importedYears])].sort((a, b) => b - a));
        setActiveYear(String(importedYears[0]));
      }

      const summary =
        rows.length > 0
          ? `${t("excel.importedSummary", { count: rows.length, years: importedYears.join(", ") })} ${t("excel.importedUnsaved")}`
          : t("excel.importedNothing");
      setImportMessage(
        errors.length > 0
          ? `${summary} ${t("excel.importedErrors", { count: errors.length })}`
          : summary,
      );
      setImportErrorDetails(errors);
      setSaved(false);
    } catch {
      setImportMessage(t("excel.errors.parseFailed"));
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("enterMonthlyBills")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("enterMonthlyBillsDescription")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => downloadConsumptionTemplate(t)}
              >
                <Download className="h-4 w-4" />
                {t("excel.downloadTemplate")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={importing}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {importing ? t("excel.importing") : t("excel.uploadButton")}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelected(file);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {importMessage && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{importMessage}</p>
                {importErrorDetails.length > 0 && (
                  <ul className="list-inside list-disc text-xs text-destructive">
                    {importErrorDetails.map((msg) => (
                      <li key={msg}>{msg}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Tabs
              value={activeYear}
              onValueChange={(v) => {
                setActiveYear(v);
                setSaved(false);
              }}
            >
              <div className="flex items-center gap-2">
                <TabsList>
                  {years.map((y) => (
                    <TabsTrigger key={y} value={String(y)}>
                      {y}
                      {dirtyByYear.has(y) && (
                        <span className="ml-1" role="img" aria-label={t("unsavedYearAria")}>
                          ●
                        </span>
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t("yearTabs.addYear")}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label htmlFor="new-year-input">{t("yearTabs.addYear")}</Label>
                      <div className="flex gap-2">
                        <NumberInput
                          integer
                          id="new-year-input"
                          min={MIN_YEAR}
                          max={MAX_YEAR}
                          value={newYearValue}
                          onValueChange={(raw) => setNewYearValue(raw)}
                        />
                        <Button type="button" size="sm" onClick={addYear}>
                          {t("yearTabs.add")}
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {years.map((y) => (
                <TabsContent key={y} value={String(y)}>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {ENERGY_CARRIERS.map((carrier) => {
                      const row = gridFor(y)[carrier];
                      // Display only: an unreadable cell contributes nothing to this preview; saving refuses it.
                      const totalKwh = row.months.reduce((sum, raw) => {
                        const parsed = parseLocaleNumber(raw, locale);
                        return parsed.ok ? sum + previewConsumptionKwh(carrier, parsed.value) : sum;
                      }, 0);
                      return (
                        <div
                          key={carrier}
                          className="overflow-hidden rounded-md border border-border"
                        >
                          <div className="border-b border-border px-2 py-1.5 text-sm font-medium">
                            {ENERGY_CARRIER_LABELS[carrier]}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({ENERGY_CARRIER_NATIVE_UNIT_LABELS[carrier]})
                            </span>
                          </div>
                          <Table>
                            <TableBody>
                              {row.months.map((value, idx) => {
                                const monthLabel =
                                  MONTH_LABELS[idx] ?? t("monthFallback", { n: idx + 1 });
                                return (
                                  <TableRow key={monthLabel}>
                                    <TableCell className="w-12 p-1 pl-2 text-xs text-muted-foreground">
                                      {monthLabel.slice(0, 3)}
                                    </TableCell>
                                    <TableCell className="p-1 pr-2">
                                      <NumberInput
                                        className="h-7 px-1.5 text-sm"
                                        showMessage={false}
                                        error={cellError(value)}
                                        aria-label={t("ariaConsumption", {
                                          month: monthLabel,
                                          carrier: ENERGY_CARRIER_LABELS[carrier],
                                        })}
                                        value={value}
                                        onValueChange={(raw) => updateMonth(y, carrier, idx, raw)}
                                        onPaste={(e) => handleMonthPaste(e, y, carrier, idx)}
                                      />
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                          <div className="flex items-center justify-between gap-2 border-t border-border px-2 py-1.5">
                            <Label className="shrink-0 text-xs text-muted-foreground">
                              {t("columnTariff")}
                            </Label>
                            <NumberInput
                              className="h-7 w-20 px-1.5 text-sm"
                              showMessage={false}
                              error={cellError(row.tariffLocal)}
                              value={row.tariffLocal}
                              onValueChange={(raw) => updateTariff(y, carrier, raw)}
                            />
                          </div>
                          <div className="border-t border-border bg-muted/30 px-2 py-1.5 text-xs text-muted-foreground">
                            {t("columnKwhTotal")}: {totalKwh > 0 ? formatNumber(totalKwh) : "—"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {saved && !saveError && (
              <p className="text-sm text-muted-foreground">{t("savedAllMessage")}</p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button
              onClick={handleSaveAll}
              disabled={bulkReplace.isPending || dirtyGroupCount === 0}
            >
              <Save className="h-4 w-4" />
              {bulkReplace.isPending ? t("saving") : t("saveAllButton", { count: dirtyGroupCount })}
            </Button>
          </CardFooter>
        </Card>
      )}

      {isLoading ? (
        <Skeleton className="h-80 w-full" />
      ) : isError ? (
        <p className="text-sm text-destructive">
          {t("failedToLoad")} {error instanceof ApiError ? error.message : t("common:unknownError")}
        </p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            {ENERGY_CARRIERS.map((carrier) => (
              <MonthlyComparisonChart
                key={carrier}
                title={ENERGY_CARRIER_LABELS[carrier]}
                bills={bills.filter((b) => b.energyCarrier === carrier)}
                valueForBill={(b) => b.consumptionNative}
                unitLabel={ENERGY_CARRIER_NATIVE_UNIT_LABELS[carrier]}
                noDataLabel={t("comparisonChart.noData")}
                height={220}
                footer={
                  <AuditorNote
                    buildingId={buildingId}
                    sectionKey={consumptionAnnotationSectionKey(carrier)}
                    readOnly={readOnly}
                  />
                }
              />
            ))}
          </div>
          <MonthlyComparisonChart
            title={t("comparisonChart.title")}
            description={t("comparisonChart.description")}
            bills={bills}
            valueForBill={(b) => b.consumptionKwh ?? 0}
            unitLabel="kVt·soat"
            noDataLabel={t("comparisonChart.noData")}
            height={280}
          />
        </>
      )}
    </div>
  );
}
