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
import { Download, Plus, Save, Upload } from "lucide-react";
import type { ClipboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConsumption, useReplaceConsumption } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnergyCarrier, MonthlyBillInput, UtilityBill } from "../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS, MONTH_LABELS, formatNumber } from "../../lib/labels";
import { MonthlyComparisonChart } from "./consumption-comparison-chart";
import { type ParsedBillRow, downloadConsumptionTemplate, parseConsumptionWorkbook } from "./consumption-excel";
import { ENERGY_CARRIER_NATIVE_UNIT_LABELS, previewConsumptionKwh } from "./consumption-units";

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

function gridsFromBills(bills: UtilityBill[], years: number[]): Record<number, YearGrid> {
  const grids: Record<number, YearGrid> = {};
  for (const year of years) grids[year] = emptyYearGrid();
  for (const bill of bills) {
    const yearGrid = grids[bill.year] ?? emptyYearGrid();
    grids[bill.year] = yearGrid;
    const row = yearGrid[bill.energyCarrier];
    row.months[bill.month - 1] = String(bill.consumptionNative);
    if (bill.tariffLocal !== null && !row.tariffLocal) row.tariffLocal = String(bill.tariffLocal);
  }
  return grids;
}

function mergeParsedRows(prev: Record<number, YearGrid>, rows: ParsedBillRow[]): Record<number, YearGrid> {
  const next = { ...prev };
  for (const parsed of rows) {
    const existingYearGrid = next[parsed.year];
    const yearGrid = existingYearGrid ? { ...existingYearGrid } : emptyYearGrid();
    const existingRow = yearGrid[parsed.energyCarrier];
    const months = [...existingRow.months];
    months[parsed.month - 1] = String(parsed.consumptionNative);
    yearGrid[parsed.energyCarrier] = {
      months,
      tariffLocal: parsed.tariffLocal !== null ? String(parsed.tariffLocal) : existingRow.tariffLocal,
    };
    next[parsed.year] = yearGrid;
  }
  return next;
}

function buildBillGroupsForYear(
  yearGrid: YearGrid,
): { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[] {
  const groups: { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[] = [];
  for (const carrier of ENERGY_CARRIERS) {
    const row = yearGrid[carrier];
    const tariffLocal = row.tariffLocal.trim() ? Number(row.tariffLocal) : null;
    const bills: MonthlyBillInput[] = [];
    for (const [idx, raw] of row.months.entries()) {
      if (!raw.trim()) continue;
      const consumptionNative = Number(raw);
      if (Number.isNaN(consumptionNative)) continue;
      bills.push({ month: idx + 1, consumptionNative, tariffLocal });
    }
    if (bills.length > 0) groups.push({ energyCarrier: carrier, bills });
  }
  return groups;
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
  const { t } = useTranslation("consumption");
  const { data, isLoading, isError, error } = useConsumption(buildingId, { pageSize: 500 });
  const replaceConsumption = useReplaceConsumption(buildingId);
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

  // Derive the initial grids from the server's saved bills exactly once,
  // when the first fetch lands — not on every refetch, so in-progress edits
  // across (possibly several open) year tabs are never clobbered.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally runs once on load, see above.
  useEffect(() => {
    if (isLoading || initialized) return;
    const fromData = bills.map((b) => b.year);
    const initialYears = [...new Set([...fromData, ...years])].sort((a, b) => b - a);
    setYears(initialYears);
    setGridsByYear(gridsFromBills(bills, initialYears));
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

  function handleMonthPaste(e: ClipboardEvent<HTMLInputElement>, year: number, carrier: EnergyCarrier, startIdx: number) {
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
    const parsed = Number(newYearValue);
    if (!Number.isInteger(parsed)) return;
    if (!years.includes(parsed)) {
      setYears((y) => [...y, parsed].sort((a, b) => b - a));
      setGridsByYear((prev) => ({ ...prev, [parsed]: prev[parsed] ?? emptyYearGrid() }));
    }
    setActiveYear(String(parsed));
  }

  async function handleSaveActiveYear() {
    setSaveError(null);
    setSaved(false);
    const year = Number(activeYear);
    const groups = buildBillGroupsForYear(gridFor(year));

    try {
      for (const group of groups) {
        await replaceConsumption.mutateAsync({
          energyCarrier: group.energyCarrier,
          year,
          bills: group.bills,
        });
      }
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("saveFailed"));
    }
  }

  async function handleFileSelected(file: File) {
    setImporting(true);
    setImportMessage(null);
    setImportErrorDetails([]);
    try {
      const { rows, errors } = await parseConsumptionWorkbook(file, t);

      setGridsByYear((prev) => mergeParsedRows(prev, rows));

      const importedYears = [...new Set(rows.map((r) => r.year))].sort((a, b) => b - a);
      if (importedYears.length > 0) {
        setYears((prev) => [...new Set([...prev, ...importedYears])].sort((a, b) => b - a));
        setActiveYear(String(importedYears[0]));
      }

      const summary =
        rows.length > 0
          ? t("excel.importedSummary", { count: rows.length, years: importedYears.join(", ") })
          : t("excel.importedNothing");
      setImportMessage(
        errors.length > 0 ? `${summary} ${t("excel.importedErrors", { count: errors.length })}` : summary,
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
              <p className="mt-1 text-sm text-muted-foreground">{t("enterMonthlyBillsDescription")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => downloadConsumptionTemplate(t)}>
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
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("yearTabs.addYear")}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56">
                    <div className="space-y-2">
                      <Label htmlFor="new-year-input">{t("yearTabs.addYear")}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="new-year-input"
                          type="number"
                          value={newYearValue}
                          onChange={(e) => setNewYearValue(e.target.value)}
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
                      const totalKwh = row.months.reduce((sum, raw) => {
                        const value = Number(raw);
                        return raw.trim() && !Number.isNaN(value)
                          ? sum + previewConsumptionKwh(carrier, value)
                          : sum;
                      }, 0);
                      return (
                        <div key={carrier} className="overflow-hidden rounded-md border border-border">
                          <div className="border-b border-border px-2 py-1.5 text-sm font-medium">
                            {ENERGY_CARRIER_LABELS[carrier]}{" "}
                            <span className="text-xs font-normal text-muted-foreground">
                              ({ENERGY_CARRIER_NATIVE_UNIT_LABELS[carrier]})
                            </span>
                          </div>
                          <Table>
                            <TableBody>
                              {row.months.map((value, idx) => {
                                const monthLabel = MONTH_LABELS[idx] ?? t("monthFallback", { n: idx + 1 });
                                return (
                                <TableRow key={monthLabel}>
                                  <TableCell className="w-12 p-1 pl-2 text-xs text-muted-foreground">
                                    {monthLabel.slice(0, 3)}
                                  </TableCell>
                                  <TableCell className="p-1 pr-2">
                                    <Input
                                      type="number"
                                      step="any"
                                      className="h-7 px-1.5 text-sm"
                                      aria-label={t("ariaConsumption", {
                                        month: monthLabel,
                                        carrier: ENERGY_CARRIER_LABELS[carrier],
                                      })}
                                      value={value}
                                      onChange={(e) => updateMonth(y, carrier, idx, e.target.value)}
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
                            <Input
                              type="number"
                              step="any"
                              className="h-7 w-20 px-1.5 text-sm"
                              value={row.tariffLocal}
                              onChange={(e) => updateTariff(y, carrier, e.target.value)}
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
              <p className="text-sm text-muted-foreground">{t("savedMessage", { year: activeYear })}</p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleSaveActiveYear} disabled={replaceConsumption.isPending}>
              <Save className="h-4 w-4" />
              {replaceConsumption.isPending ? t("saving") : t("saveButton", { year: activeYear })}
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ENERGY_CARRIERS.map((carrier) => (
              <MonthlyComparisonChart
                key={carrier}
                title={ENERGY_CARRIER_LABELS[carrier]}
                bills={bills.filter((b) => b.energyCarrier === carrier)}
                valueForBill={(b) => b.consumptionNative}
                unitLabel={ENERGY_CARRIER_NATIVE_UNIT_LABELS[carrier]}
                noDataLabel={t("comparisonChart.noData")}
                height={200}
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
