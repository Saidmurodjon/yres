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
import { Plus, Receipt } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useConsumption, useCreateConsumption } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnergyCarrier } from "../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS, MONTH_LABELS, formatNumber } from "../../lib/labels";

interface NewBillForm {
  energyCarrier: EnergyCarrier;
  year: string;
  month: string;
  consumptionNative: string;
  consumptionKwh: string;
  expenseLocal: string;
  tariffLocal: string;
}

function emptyForm(): NewBillForm {
  const now = new Date();
  return {
    energyCarrier: "electricity",
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    consumptionNative: "",
    consumptionKwh: "",
    expenseLocal: "",
    tariffLocal: "",
  };
}

export function ConsumptionTab({ buildingId }: { buildingId: string }) {
  const { data, isLoading, isError, error } = useConsumption(buildingId, { pageSize: 200 });
  const createConsumption = useCreateConsumption(buildingId);

  const [form, setForm] = useState<NewBillForm>(emptyForm());
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  function set<K extends keyof NewBillForm>(key: K, value: NewBillForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setValidationError(null);
    setApiError(null);

    const year = Number(form.year);
    const month = Number(form.month);
    const consumptionNative = Number(form.consumptionNative);

    if (!form.year.trim() || Number.isNaN(year)) {
      setValidationError("Year is required.");
      return;
    }
    if (!form.month.trim() || Number.isNaN(month) || month < 1 || month > 12) {
      setValidationError("Month must be between 1 and 12.");
      return;
    }
    if (!form.consumptionNative.trim() || Number.isNaN(consumptionNative)) {
      setValidationError("Consumption is required.");
      return;
    }

    try {
      await createConsumption.mutateAsync([
        {
          energyCarrier: form.energyCarrier,
          year,
          month,
          consumptionNative,
          consumptionKwh: form.consumptionKwh.trim() ? Number(form.consumptionKwh) : null,
          expenseLocal: form.expenseLocal.trim() ? Number(form.expenseLocal) : null,
          tariffLocal: form.tariffLocal.trim() ? Number(form.tariffLocal) : null,
        },
      ]);
      setForm(emptyForm());
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to add utility bill.");
    }
  }

  const bills = data?.bills ?? [];
  const sortedBills = [...bills].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    if (a.month !== b.month) return b.month - a.month;
    return a.energyCarrier.localeCompare(b.energyCarrier);
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Utility bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Failed to load consumption data:{" "}
              {error instanceof ApiError ? error.message : "Unknown error"}
            </p>
          ) : sortedBills.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Receipt className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No utility bills recorded yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add monthly bills below to track historical energy consumption.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Carrier</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Consumption</TableHead>
                  <TableHead>Consumption (kWh)</TableHead>
                  <TableHead>Expense</TableHead>
                  <TableHead>Tariff</TableHead>
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

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a bill</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Energy carrier</Label>
                <Select
                  value={form.energyCarrier}
                  onValueChange={(v) => set("energyCarrier", v as EnergyCarrier)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENERGY_CARRIERS.map((carrier) => (
                      <SelectItem key={carrier} value={carrier}>
                        {ENERGY_CARRIER_LABELS[carrier]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-year">Year</Label>
                <Input
                  id="bill-year"
                  type="number"
                  value={form.year}
                  onChange={(e) => set("year", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Month</Label>
                <Select value={form.month} onValueChange={(v) => set("month", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_LABELS.map((label, idx) => (
                      <SelectItem key={label} value={String(idx + 1)}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-consumption">Consumption (native units)</Label>
                <Input
                  id="bill-consumption"
                  type="number"
                  step="any"
                  value={form.consumptionNative}
                  onChange={(e) => set("consumptionNative", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-kwh">Consumption (kWh)</Label>
                <Input
                  id="bill-kwh"
                  type="number"
                  step="any"
                  value={form.consumptionKwh}
                  onChange={(e) => set("consumptionKwh", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-expense">Expense (local currency)</Label>
                <Input
                  id="bill-expense"
                  type="number"
                  step="any"
                  value={form.expenseLocal}
                  onChange={(e) => set("expenseLocal", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bill-tariff">Tariff (local currency)</Label>
                <Input
                  id="bill-tariff"
                  type="number"
                  step="any"
                  value={form.tariffLocal}
                  onChange={(e) => set("tariffLocal", e.target.value)}
                />
              </div>
            </div>

            {validationError && <p className="mt-4 text-sm text-destructive">{validationError}</p>}
            {apiError && <p className="mt-4 text-sm text-destructive">{apiError}</p>}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={createConsumption.isPending}>
              <Plus className="h-4 w-4" />
              {createConsumption.isPending ? "Adding..." : "Add bill"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
