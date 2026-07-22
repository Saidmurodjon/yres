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
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@yres/ui";
import { Download, Plus, Receipt, Save, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConsumption, useReplaceConsumption } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnergyCarrier, MonthlyBillInput, UtilityBill } from "../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS, MONTH_LABELS, formatNumber } from "../../lib/labels";
import { type ParsedBillRow, downloadConsumptionTemplate, parseConsumptionWorkbook } from "./consumption-excel";

// Every carrier is entered in one normalized unit — kWh — matching the
// source spreadsheet's convention (`excelda yagona o'lchovga keltirilgan
// kWh`), so columns are directly comparable across carriers. There's no
// separate "native meter unit" field in this UI; the API's required
// consumptionNative is just set equal to consumptionKwh at save time.
interface MonthRow {
  consumptionKwh: string;
  expenseLocal: string;
  tariffLocal: string;
}

type YearGrid = Record<EnergyCarrier, MonthRow[]>;

function emptyMonthRow(): MonthRow {
  return { consumptionKwh: "", expenseLocal: "", tariffLocal: "" };
}

function emptyYearGrid(): YearGrid {
  return Object.fromEntries(
    ENERGY_CARRIERS.map((c) => [c, Array.from({ length: 12 }, emptyMonthRow)]),
  ) as YearGrid;
}

function gridsFromBills(bills: UtilityBill[], years: number[]): Record<number, YearGrid> {
  const grids: Record<number, YearGrid> = {};
  for (const year of years) grids[year] = emptyYearGrid();
  for (const bill of bills) {
    const yearGrid = grids[bill.year] ?? emptyYearGrid();
    grids[bill.year] = yearGrid;
    // Older rows saved before this redesign may only have consumptionNative
    // (no separate kWh figure) — fall back to it so existing data still
    // shows up instead of appearing blank.
    const kwh = bill.consumptionKwh ?? bill.consumptionNative;
    yearGrid[bill.energyCarrier][bill.month - 1] = {
      consumptionKwh: String(kwh),
      expenseLocal: bill.expenseLocal !== null ? String(bill.expenseLocal) : "",
      tariffLocal: bill.tariffLocal !== null ? String(bill.tariffLocal) : "",
    };
  }
  return grids;
}

function billRowToMonthRow(row: ParsedBillRow): MonthRow {
  return {
    consumptionKwh: String(row.consumptionKwh),
    expenseLocal: row.expenseLocal !== null ? String(row.expenseLocal) : "",
    tariffLocal: row.tariffLocal !== null ? String(row.tariffLocal) : "",
  };
}

function buildBillGroupsForYear(
  yearGrid: YearGrid,
): { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[] {
  const groups: { energyCarrier: EnergyCarrier; bills: MonthlyBillInput[] }[] = [];
  for (const carrier of ENERGY_CARRIERS) {
    const bills: MonthlyBillInput[] = [];
    for (const [idx, row] of yearGrid[carrier].entries()) {
      if (!row.consumptionKwh.trim()) continue;
      const consumptionKwh = Number(row.consumptionKwh);
      if (Number.isNaN(consumptionKwh)) continue;
      bills.push({
        month: idx + 1,
        consumptionNative: consumptionKwh,
        consumptionKwh,
        expenseLocal: row.expenseLocal.trim() ? Number(row.expenseLocal) : null,
        tariffLocal: row.tariffLocal.trim() ? Number(row.tariffLocal) : null,
      });
    }
    if (bills.length > 0) groups.push({ energyCarrier: carrier, bills });
  }
  return groups;
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
  const [showAdvancedColumns, setShowAdvancedColumns] = useState(false);
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

  function updateCell(year: number, carrier: EnergyCarrier, monthIdx: number, field: keyof MonthRow, value: string) {
    setGridsByYear((prev) => {
      const yearGrid = prev[year] ?? emptyYearGrid();
      const carrierRows = yearGrid[carrier].map((row, i) =>
        i === monthIdx ? { ...row, [field]: value } : row,
      );
      return { ...prev, [year]: { ...yearGrid, [carrier]: carrierRows } };
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

      setGridsByYear((prev) => {
        const next = { ...prev };
        for (const row of rows) {
          const existing = next[row.year];
          const yearGrid = existing ? { ...existing } : emptyYearGrid();
          const carrierRows = [...yearGrid[row.energyCarrier]];
          carrierRows[row.month - 1] = billRowToMonthRow(row);
          yearGrid[row.energyCarrier] = carrierRows;
          next[row.year] = yearGrid;
        }
        return next;
      });

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

  const sortedBills = [...bills].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.energyCarrier.localeCompare(b.energyCarrier);
  });

  return (
    <div className="space-y-6">
      {!readOnly && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">{t("enterMonthlyBills")}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{t("enterMonthlyBillsDescription")}</p>
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

            <div className="flex flex-wrap items-center justify-between gap-3">
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
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {ENERGY_CARRIERS.map((carrier) => (
                        <div key={carrier} className="overflow-x-auto rounded-md border border-border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead colSpan={showAdvancedColumns ? 4 : 2} className="text-center font-semibold">
                                  {ENERGY_CARRIER_LABELS[carrier]}
                                </TableHead>
                              </TableRow>
                              <TableRow>
                                <TableHead>{t("columnMonth")}</TableHead>
                                <TableHead>{t("columnConsumptionKwh")}</TableHead>
                                {showAdvancedColumns && (
                                  <>
                                    <TableHead>{t("columnExpense")}</TableHead>
                                    <TableHead>{t("columnTariff")}</TableHead>
                                  </>
                                )}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {MONTH_LABELS.map((label, idx) => {
                                const row = gridFor(y)[carrier][idx] ?? emptyMonthRow();
                                return (
                                  <TableRow key={label}>
                                    <TableCell className="font-medium">{label}</TableCell>
                                    <TableCell>
                                      <Input
                                        type="number"
                                        step="any"
                                        className="w-24"
                                        aria-label={t("ariaConsumption", {
                                          month: label,
                                          carrier: ENERGY_CARRIER_LABELS[carrier],
                                        })}
                                        value={row.consumptionKwh}
                                        onChange={(e) =>
                                          updateCell(y, carrier, idx, "consumptionKwh", e.target.value)
                                        }
                                      />
                                    </TableCell>
                                    {showAdvancedColumns && (
                                      <>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="any"
                                            className="w-24"
                                            value={row.expenseLocal}
                                            onChange={(e) =>
                                              updateCell(y, carrier, idx, "expenseLocal", e.target.value)
                                            }
                                          />
                                        </TableCell>
                                        <TableCell>
                                          <Input
                                            type="number"
                                            step="any"
                                            className="w-20"
                                            value={row.tariffLocal}
                                            onChange={(e) =>
                                              updateCell(y, carrier, idx, "tariffLocal", e.target.value)
                                            }
                                          />
                                        </TableCell>
                                      </>
                                    )}
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>

            <label className="flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-border accent-primary"
                checked={showAdvancedColumns}
                onChange={(e) => setShowAdvancedColumns(e.target.checked)}
              />
              {t("showAdvancedColumns")}
            </label>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("allUtilityBills")}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              {t("failedToLoad")}{" "}
              {error instanceof ApiError ? error.message : t("common:unknownError")}
            </p>
          ) : sortedBills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">{t("noBillsYet")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{t("noBillsDescription")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnCarrier")}</TableHead>
                  <TableHead>{t("columnYear")}</TableHead>
                  <TableHead>{t("columnMonth")}</TableHead>
                  <TableHead>{t("columnConsumptionKwh")}</TableHead>
                  <TableHead>{t("columnExpense")}</TableHead>
                  <TableHead>{t("columnTariff")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedBills.map((bill) => (
                  <TableRow key={bill.id}>
                    <TableCell>{ENERGY_CARRIER_LABELS[bill.energyCarrier]}</TableCell>
                    <TableCell>{bill.year}</TableCell>
                    <TableCell>{MONTH_LABELS[bill.month - 1]}</TableCell>
                    <TableCell>{formatNumber(bill.consumptionKwh ?? bill.consumptionNative)}</TableCell>
                    <TableCell>{formatNumber(bill.expenseLocal)}</TableCell>
                    <TableCell>{formatNumber(bill.tariffLocal, 3)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
