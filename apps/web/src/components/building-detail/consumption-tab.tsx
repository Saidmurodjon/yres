import {
  Button,
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yres/ui";
import { Receipt, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useConsumption, useReplaceConsumption } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnergyCarrier, MonthlyBillInput, UtilityBill } from "../../lib/api-types";
import {
  ENERGY_CARRIERS,
  ENERGY_CARRIER_LABELS,
  MONTH_LABELS,
  formatNumber,
} from "../../lib/labels";

interface MonthRow {
  consumptionNative: string;
  consumptionKwh: string;
  expenseLocal: string;
  tariffLocal: string;
}

function emptyMonthRow(): MonthRow {
  return { consumptionNative: "", consumptionKwh: "", expenseLocal: "", tariffLocal: "" };
}

function emptyGrid(): MonthRow[] {
  return MONTH_LABELS.map(() => emptyMonthRow());
}

function gridFromBills(bills: UtilityBill[], carrier: EnergyCarrier, year: number): MonthRow[] {
  const grid = emptyGrid();
  for (const bill of bills) {
    if (bill.energyCarrier !== carrier || bill.year !== year) continue;
    grid[bill.month - 1] = {
      consumptionNative: String(bill.consumptionNative),
      consumptionKwh: bill.consumptionKwh !== null ? String(bill.consumptionKwh) : "",
      expenseLocal: bill.expenseLocal !== null ? String(bill.expenseLocal) : "",
      tariffLocal: bill.tariffLocal !== null ? String(bill.tariffLocal) : "",
    };
  }
  return grid;
}

export function ConsumptionTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { t } = useTranslation("consumption");
  const { data, isLoading, isError, error } = useConsumption(buildingId, { pageSize: 500 });
  const replaceConsumption = useReplaceConsumption(buildingId);

  const bills = useMemo(() => data?.bills ?? [], [data]);
  const currentYear = new Date().getFullYear();

  const [carrier, setCarrier] = useState<EnergyCarrier>("electricity");
  const [year, setYear] = useState(currentYear);
  const [grid, setGrid] = useState<MonthRow[]>(emptyGrid);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-fill the grid from saved data whenever the carrier/year picker changes
  // or a fresh fetch lands — but not on every keystroke, since this same
  // `bills` array is what the grid is editing towards.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally excludes `bills` — see above.
  useEffect(() => {
    setGrid(gridFromBills(bills, carrier, year));
    setSaved(false);
  }, [carrier, year, isLoading]);

  const years = useMemo(() => {
    const fromData = bills.map((b) => b.year);
    const set = new Set([...fromData, currentYear, currentYear - 1, currentYear - 2]);
    return [...set].sort((a, b) => b - a);
  }, [bills, currentYear]);

  function updateCell(monthIdx: number, field: keyof MonthRow, value: string) {
    setGrid((g) => g.map((row, i) => (i === monthIdx ? { ...row, [field]: value } : row)));
    setSaved(false);
  }

  async function handleSave() {
    setSaveError(null);
    setSaved(false);

    const monthlyBills: MonthlyBillInput[] = [];
    for (const [idx, row] of grid.entries()) {
      if (!row.consumptionNative.trim()) continue;
      const consumptionNative = Number(row.consumptionNative);
      if (Number.isNaN(consumptionNative)) {
        setSaveError(t("consumptionMustBeNumber", { month: MONTH_LABELS[idx] }));
        return;
      }
      monthlyBills.push({
        month: idx + 1,
        consumptionNative,
        consumptionKwh: row.consumptionKwh.trim() ? Number(row.consumptionKwh) : null,
        expenseLocal: row.expenseLocal.trim() ? Number(row.expenseLocal) : null,
        tariffLocal: row.tariffLocal.trim() ? Number(row.tariffLocal) : null,
      });
    }

    try {
      await replaceConsumption.mutateAsync({ energyCarrier: carrier, year, bills: monthlyBills });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("saveFailed"));
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
          <CardHeader>
            <CardTitle className="text-base">{t("enterMonthlyBills")}</CardTitle>
            <p className="text-sm text-muted-foreground">{t("enterMonthlyBillsDescription")}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 sm:max-w-md">
              <div className="space-y-1.5">
                <Label>{t("energyCarrier")}</Label>
                <Select value={carrier} onValueChange={(v) => setCarrier(v as EnergyCarrier)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_CARRIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ENERGY_CARRIER_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("year")}</Label>
                <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("columnMonth")}</TableHead>
                    <TableHead>{t("columnConsumption")}</TableHead>
                    <TableHead>{t("columnConsumptionKwh")}</TableHead>
                    <TableHead>{t("columnExpense")}</TableHead>
                    <TableHead>{t("columnTariff")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grid.map((row, idx) => {
                    const label = MONTH_LABELS[idx] ?? t("monthFallback", { n: idx + 1 });
                    return (
                      <TableRow key={label}>
                        <TableCell className="font-medium">{label}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-32"
                            aria-label={t("ariaConsumption", { month: label })}
                            value={row.consumptionNative}
                            onChange={(e) => updateCell(idx, "consumptionNative", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-32"
                            aria-label={t("ariaConsumptionKwh", { month: label })}
                            value={row.consumptionKwh}
                            onChange={(e) => updateCell(idx, "consumptionKwh", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-32"
                            aria-label={t("ariaExpense", { month: label })}
                            value={row.expenseLocal}
                            onChange={(e) => updateCell(idx, "expenseLocal", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            step="any"
                            className="w-32"
                            aria-label={t("ariaTariff", { month: label })}
                            value={row.tariffLocal}
                            onChange={(e) => updateCell(idx, "tariffLocal", e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {saveError && <p className="text-sm text-destructive">{saveError}</p>}
            {saved && !saveError && (
              <p className="text-sm text-muted-foreground">
                {t("savedMessage", {
                  carrier: ENERGY_CARRIER_LABELS[carrier].toLowerCase(),
                  year,
                })}
              </p>
            )}
          </CardContent>
          <CardFooter className="justify-end">
            <Button onClick={handleSave} disabled={replaceConsumption.isPending}>
              <Save className="h-4 w-4" />
              {replaceConsumption.isPending
                ? t("saving")
                : t("saveButton", { carrier: ENERGY_CARRIER_LABELS[carrier].toLowerCase(), year })}
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
                  <TableHead>{t("columnConsumption")}</TableHead>
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
                    <TableCell>{formatNumber(bill.consumptionNative)}</TableCell>
                    <TableCell>{formatNumber(bill.consumptionKwh)}</TableCell>
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
