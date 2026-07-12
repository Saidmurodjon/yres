import {
  Badge,
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
import { Plus, Trash2, Wrench } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useCreateMeasure, useDeleteMeasure, useMeasures, useSelectMeasures } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { MeasureCategory } from "../../lib/api-types";
import { MEASURE_CATEGORY_LABELS, formatNumber } from "../../lib/labels";

const MEASURE_CATEGORIES = Object.keys(MEASURE_CATEGORY_LABELS) as MeasureCategory[];

interface NewMeasureForm {
  name: string;
  category: MeasureCategory;
  investmentCostUsd: string;
  lifetimeYears: string;
  maintenanceCostPercent: string;
}

function emptyForm(): NewMeasureForm {
  return {
    name: "",
    category: "other",
    investmentCostUsd: "",
    lifetimeYears: "20",
    maintenanceCostPercent: "0",
  };
}

export function MeasuresTab({ buildingId }: { buildingId: string }) {
  const { data, isLoading, isError, error } = useMeasures(buildingId, { pageSize: 200 });
  const selectMeasures = useSelectMeasures(buildingId);
  const createMeasure = useCreateMeasure(buildingId);
  const deleteMeasure = useDeleteMeasure(buildingId);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<NewMeasureForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const measures = data?.measures ?? [];

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-syncs local checkbox state only when the server data object changes (e.g. after a fresh fetch or a save), not on every render.
  useEffect(() => {
    setSelected(new Set(measures.filter((m) => m.proposedForImplementation).map((m) => m.id)));
  }, [data]);

  function toggle(id: string) {
    setSaved(false);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function set<K extends keyof NewMeasureForm>(key: K, value: NewMeasureForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setSaveError(null);
    setSaved(false);
    try {
      await selectMeasures.mutateAsync([...selected]);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Failed to save measure selection.");
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const investmentCostUsd = Number(form.investmentCostUsd);
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.investmentCostUsd.trim() || Number.isNaN(investmentCostUsd) || investmentCostUsd < 0) {
      setFormError("Investment cost must be a non-negative number.");
      return;
    }

    try {
      await createMeasure.mutateAsync({
        name: form.name.trim(),
        category: form.category,
        investmentCostUsd,
        lifetimeYears: Number(form.lifetimeYears) || 20,
        maintenanceCostPercent: Number(form.maintenanceCostPercent) || 0,
      });
      setForm(emptyForm());
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to add measure.");
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteMeasure.mutateAsync(id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Failed to delete measure.");
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-sm text-destructive">
          Failed to load measures: {error instanceof ApiError ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Energy measures</CardTitle>
          {measures.length > 0 && (
            <Button size="sm" onClick={handleSave} disabled={selectMeasures.isPending}>
              {selectMeasures.isPending ? "Saving..." : "Save selection"}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {measures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No measures added yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add candidate energy-saving measures below, then mark the ones you're proposing for
                implementation — their standardized savings are computed from this building's
                envelope, systems, and (for lighting/equipment) before/after data on the Systems tab.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">Proposed</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Investment (USD)</TableHead>
                    <TableHead>Lifetime (yrs)</TableHead>
                    <TableHead>Maintenance (%)</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {measures.map((measure) => (
                    <TableRow key={measure.id}>
                      <TableCell>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={selected.has(measure.id)}
                          onChange={() => toggle(measure.id)}
                          aria-label={`Propose ${measure.name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{measure.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {MEASURE_CATEGORY_LABELS[measure.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(measure.investmentCostUsd, 0)}</TableCell>
                      <TableCell>{measure.lifetimeYears}</TableCell>
                      <TableCell>{formatNumber(measure.maintenanceCostPercent, 2)}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(measure.id)}
                          disabled={deleteMeasure.isPending}
                          aria-label={`Delete ${measure.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}
              {saved && !saveError && (
                <p className="mt-4 text-sm text-success">Measure selection saved.</p>
              )}
              {deleteError && <p className="mt-4 text-sm text-destructive">{deleteError}</p>}
            </>
          )}
        </CardContent>
      </Card>

      <form onSubmit={handleCreate}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add a measure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="measure-name">Name</Label>
                <Input
                  id="measure-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => set("category", v as MeasureCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASURE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {MEASURE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measure-investment">Investment (USD)</Label>
                <Input
                  id="measure-investment"
                  type="number"
                  step="any"
                  value={form.investmentCostUsd}
                  onChange={(e) => set("investmentCostUsd", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measure-lifetime">Lifetime (years)</Label>
                <Input
                  id="measure-lifetime"
                  type="number"
                  value={form.lifetimeYears}
                  onChange={(e) => set("lifetimeYears", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measure-maintenance">Maintenance cost (fraction, e.g. 0.01)</Label>
                <Input
                  id="measure-maintenance"
                  type="number"
                  step="any"
                  value={form.maintenanceCostPercent}
                  onChange={(e) => set("maintenanceCostPercent", e.target.value)}
                />
              </div>
            </div>
            {formError && <p className="mt-4 text-sm text-destructive">{formError}</p>}
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" disabled={createMeasure.isPending}>
              <Plus className="h-4 w-4" />
              {createMeasure.isPending ? "Adding..." : "Add measure"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
