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
import { useTranslation } from "react-i18next";
import {
  useCreateMeasure,
  useCreateNonEeMeasure,
  useDeleteMeasure,
  useDeleteNonEeMeasure,
  useMeasures,
  useNonEeMeasures,
  useSelectMeasures,
} from "../../hooks";
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

interface NewNonEeMeasureForm {
  description: string;
  unit: string;
  quantity: string;
  unitCostUsd: string;
}

function emptyNonEeForm(): NewNonEeMeasureForm {
  return { description: "", unit: "", quantity: "1", unitCostUsd: "" };
}

export function MeasuresTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { t } = useTranslation("measures");
  const { data, isLoading, isError, error } = useMeasures(buildingId, { pageSize: 200 });
  const selectMeasures = useSelectMeasures(buildingId);
  const createMeasure = useCreateMeasure(buildingId);
  const deleteMeasure = useDeleteMeasure(buildingId);

  const { data: nonEeData } = useNonEeMeasures(buildingId);
  const createNonEeMeasure = useCreateNonEeMeasure(buildingId);
  const deleteNonEeMeasure = useDeleteNonEeMeasure(buildingId);
  const [nonEeForm, setNonEeForm] = useState<NewNonEeMeasureForm>(emptyNonEeForm());
  const [nonEeFormError, setNonEeFormError] = useState<string | null>(null);
  const [nonEeDeleteError, setNonEeDeleteError] = useState<string | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<NewMeasureForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const measures = data?.measures ?? [];
  const nonEeMeasures = nonEeData?.nonEeMeasures ?? [];

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
      setSaveError(err instanceof ApiError ? err.message : t("ee.failedToSaveSelection"));
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    const investmentCostUsd = Number(form.investmentCostUsd);
    if (!form.name.trim()) {
      setFormError(t("ee.nameRequired"));
      return;
    }
    if (!form.investmentCostUsd.trim() || Number.isNaN(investmentCostUsd) || investmentCostUsd < 0) {
      setFormError(t("ee.investmentInvalid"));
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
      setFormError(err instanceof ApiError ? err.message : t("ee.failedToAdd"));
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null);
    try {
      await deleteMeasure.mutateAsync(id);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("ee.failedToDelete"));
    }
  }

  function setNonEe<K extends keyof NewNonEeMeasureForm>(key: K, value: NewNonEeMeasureForm[K]) {
    setNonEeForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreateNonEeMeasure(event: FormEvent) {
    event.preventDefault();
    setNonEeFormError(null);

    const unitCostUsd = Number(nonEeForm.unitCostUsd);
    const quantity = Number(nonEeForm.quantity);
    if (!nonEeForm.description.trim()) {
      setNonEeFormError(t("ancillary.descriptionRequired"));
      return;
    }
    if (!nonEeForm.unitCostUsd.trim() || Number.isNaN(unitCostUsd) || unitCostUsd < 0) {
      setNonEeFormError(t("ancillary.unitCostInvalid"));
      return;
    }
    if (Number.isNaN(quantity) || quantity <= 0) {
      setNonEeFormError(t("ancillary.quantityInvalid"));
      return;
    }

    try {
      await createNonEeMeasure.mutateAsync({
        description: nonEeForm.description.trim(),
        unit: nonEeForm.unit.trim() || null,
        quantity,
        unitCostUsd,
      });
      setNonEeForm(emptyNonEeForm());
    } catch (err) {
      setNonEeFormError(err instanceof ApiError ? err.message : t("ancillary.failedToAdd"));
    }
  }

  async function handleDeleteNonEeMeasure(id: string) {
    setNonEeDeleteError(null);
    try {
      await deleteNonEeMeasure.mutateAsync(id);
    } catch (err) {
      setNonEeDeleteError(err instanceof ApiError ? err.message : t("ancillary.failedToDelete"));
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
          {t("ee.failedToLoad")}{" "}
          {error instanceof ApiError ? error.message : t("common:unknownError")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{t("ee.title")}</CardTitle>
          {measures.length > 0 && !readOnly && (
            <Button size="sm" onClick={handleSave} disabled={selectMeasures.isPending}>
              {selectMeasures.isPending ? t("ee.saving") : t("ee.saveSelection")}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {measures.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Wrench className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">{t("ee.emptyTitle")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                {readOnly ? t("ee.emptyReadOnly") : t("ee.emptyHint")}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">{t("ee.columnProposed")}</TableHead>
                    <TableHead>{t("ee.columnName")}</TableHead>
                    <TableHead>{t("ee.columnCategory")}</TableHead>
                    <TableHead>{t("ee.columnInvestment")}</TableHead>
                    <TableHead>{t("ee.columnLifetime")}</TableHead>
                    <TableHead>{t("ee.columnMaintenance")}</TableHead>
                    {!readOnly && <TableHead />}
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
                          disabled={readOnly}
                          aria-label={t("ee.proposeAria", { name: measure.name })}
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
                      {!readOnly && (
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(measure.id)}
                            disabled={deleteMeasure.isPending}
                            aria-label={t("ee.deleteAria", { name: measure.name })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {saveError && <p className="mt-4 text-sm text-destructive">{saveError}</p>}
              {saved && !saveError && (
                <p className="mt-4 text-sm text-success">{t("ee.selectionSaved")}</p>
              )}
              {deleteError && <p className="mt-4 text-sm text-destructive">{deleteError}</p>}
            </>
          )}
        </CardContent>
      </Card>

      {!readOnly && (
      <form onSubmit={handleCreate}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("ee.addTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5 lg:col-span-2">
                <Label htmlFor="measure-name">{t("ee.name")}</Label>
                <Input
                  id="measure-name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("ee.category")}</Label>
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
                <Label htmlFor="measure-investment">{t("ee.investment")}</Label>
                <Input
                  id="measure-investment"
                  type="number"
                  step="any"
                  value={form.investmentCostUsd}
                  onChange={(e) => set("investmentCostUsd", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measure-lifetime">{t("ee.lifetime")}</Label>
                <Input
                  id="measure-lifetime"
                  type="number"
                  value={form.lifetimeYears}
                  onChange={(e) => set("lifetimeYears", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="measure-maintenance">{t("ee.maintenance")}</Label>
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
              {createMeasure.isPending ? t("ee.adding") : t("ee.addButton")}
            </Button>
          </CardFooter>
        </Card>
      </form>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("ancillary.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">{t("ancillary.description")}</p>
          {nonEeMeasures.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("ancillary.emptyTitle")}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ancillary.columnDescription")}</TableHead>
                  <TableHead>{t("ancillary.columnQuantity")}</TableHead>
                  <TableHead>{t("ancillary.columnUnitCost")}</TableHead>
                  <TableHead>{t("ancillary.columnTotal")}</TableHead>
                  {!readOnly && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {nonEeMeasures.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.description}</TableCell>
                    <TableCell>
                      {formatNumber(m.quantity, 1)}
                      {m.unit ? ` ${m.unit}` : ""}
                    </TableCell>
                    <TableCell>{formatNumber(m.unitCostUsd, 0)}</TableCell>
                    <TableCell>{formatNumber(m.quantity * m.unitCostUsd, 0)}</TableCell>
                    {!readOnly && (
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNonEeMeasure(m.id)}
                          disabled={deleteNonEeMeasure.isPending}
                          aria-label={t("ancillary.deleteAria", { description: m.description })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {nonEeDeleteError && <p className="mt-4 text-sm text-destructive">{nonEeDeleteError}</p>}
        </CardContent>
      </Card>

      {!readOnly && (
        <form onSubmit={handleCreateNonEeMeasure}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("ancillary.addTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1.5 lg:col-span-2">
                  <Label htmlFor="non-ee-description">{t("ancillary.descriptionLabel")}</Label>
                  <Input
                    id="non-ee-description"
                    value={nonEeForm.description}
                    onChange={(e) => setNonEe("description", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="non-ee-quantity">{t("ancillary.quantityLabel")}</Label>
                  <Input
                    id="non-ee-quantity"
                    type="number"
                    step="any"
                    value={nonEeForm.quantity}
                    onChange={(e) => setNonEe("quantity", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="non-ee-unit">{t("ancillary.unitLabel")}</Label>
                  <Input
                    id="non-ee-unit"
                    placeholder={t("ancillary.unitPlaceholder")}
                    value={nonEeForm.unit}
                    onChange={(e) => setNonEe("unit", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="non-ee-unit-cost">{t("ancillary.unitCostLabel")}</Label>
                  <Input
                    id="non-ee-unit-cost"
                    type="number"
                    step="any"
                    value={nonEeForm.unitCostUsd}
                    onChange={(e) => setNonEe("unitCostUsd", e.target.value)}
                  />
                </div>
              </div>
              {nonEeFormError && <p className="mt-4 text-sm text-destructive">{nonEeFormError}</p>}
            </CardContent>
            <CardFooter className="justify-end">
              <Button type="submit" disabled={createNonEeMeasure.isPending}>
                <Plus className="h-4 w-4" />
                {createNonEeMeasure.isPending ? t("ancillary.adding") : t("ancillary.addButton")}
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  );
}
