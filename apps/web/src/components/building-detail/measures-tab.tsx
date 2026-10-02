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
import { type FormEvent, useEffect, useRef, useState } from "react";
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
import { parseLocaleNumber, toNumberLocale } from "../../lib/number";
import { ConfirmDialog } from "../confirm-dialog";
import { NumberInput } from "../number-input";
import { useRegisterDirty } from "../unsaved-changes";

const MEASURE_CATEGORIES = Object.keys(MEASURE_CATEGORY_LABELS) as MeasureCategory[];

interface NewMeasureForm {
  name: string;
  category: MeasureCategory;
  investmentCostUsd: string;
  lifetimeYears: string;
  maintenanceCostPercent: string;
}

/** Applied only when the lifetime field is left empty (a business rule, not a fallback for bad input). */
const DEFAULT_LIFETIME_YEARS = 20;

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
  const { t, i18n } = useTranslation("measures");
  const locale = toNumberLocale(i18n.language);
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

  // Deleting a server object cannot be undone: it is confirmed first (ConfirmDialog, destructive).
  const [pendingDelete, setPendingDelete] = useState<{
    kind: "measure" | "nonEe";
    id: string;
    name: string;
  } | null>(null);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState<NewMeasureForm>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const measures = data?.measures ?? [];
  const nonEeMeasures = nonEeData?.nonEeMeasures ?? [];

  // Unsaved edits: ticked/unticked boxes since the last save, and the two "add" forms once typed into.
  const [selectionTouched, setSelectionTouched] = useState(false);
  const selectionTouchedRef = useRef(false);
  selectionTouchedRef.current = selectionTouched;
  useRegisterDirty("measures.selection", selectionTouched);
  useRegisterDirty(
    "measures.newForms",
    JSON.stringify(form) !== JSON.stringify(emptyForm()) ||
      JSON.stringify(nonEeForm) !== JSON.stringify(emptyNonEeForm()),
  );

  // Follows the server's selection only while the user has not touched the boxes, so a refetch
  // (another save, another tab) never resets ticks that are still unsaved.
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally re-syncs local checkbox state only when the server data object changes (e.g. after a fresh fetch or a save), not on every render.
  useEffect(() => {
    if (selectionTouchedRef.current) return;
    setSelected(new Set(measures.filter((m) => m.proposedForImplementation).map((m) => m.id)));
  }, [data]);

  function toggle(id: string) {
    setSaved(false);
    setSelectionTouched(true);
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
      setSelectionTouched(false);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("ee.failedToSaveSelection"));
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!form.name.trim()) {
      setFormError(t("ee.nameRequired"));
      return;
    }
    const investment = parseLocaleNumber(form.investmentCostUsd, locale);
    if (!investment.ok || investment.value < 0) {
      setFormError(t("ee.investmentInvalid"));
      return;
    }
    const investmentCostUsd = investment.value;
    // The defaults (20 years, 0 maintenance) are business rules for an EMPTY field only; a value that is
    // typed but unreadable is an error, never silently replaced by the default.
    const lifetime = parseLocaleNumber(form.lifetimeYears, locale, { integer: true });
    if (!lifetime.ok && lifetime.reason === "invalid") {
      setFormError(t("ee.lifetimeInvalid"));
      return;
    }
    if (lifetime.ok && lifetime.value <= 0) {
      setFormError(t("ee.lifetimeInvalid"));
      return;
    }
    const maintenance = parseLocaleNumber(form.maintenanceCostPercent, locale);
    if (
      (!maintenance.ok && maintenance.reason === "invalid") ||
      (maintenance.ok && maintenance.value < 0)
    ) {
      setFormError(t("ee.maintenanceInvalid"));
      return;
    }

    try {
      await createMeasure.mutateAsync({
        name: form.name.trim(),
        category: form.category,
        investmentCostUsd,
        lifetimeYears: lifetime.ok ? lifetime.value : DEFAULT_LIFETIME_YEARS,
        maintenanceCostPercent: maintenance.ok ? maintenance.value : 0,
      });
      setForm(emptyForm());
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : t("ee.failedToAdd"));
    }
  }

  async function handleDelete(id: string): Promise<boolean> {
    setDeleteError(null);
    try {
      await deleteMeasure.mutateAsync(id);
      return true;
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : t("ee.failedToDelete"));
      return false;
    }
  }

  function setNonEe<K extends keyof NewNonEeMeasureForm>(key: K, value: NewNonEeMeasureForm[K]) {
    setNonEeForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCreateNonEeMeasure(event: FormEvent) {
    event.preventDefault();
    setNonEeFormError(null);

    if (!nonEeForm.description.trim()) {
      setNonEeFormError(t("ancillary.descriptionRequired"));
      return;
    }
    const unitCost = parseLocaleNumber(nonEeForm.unitCostUsd, locale);
    if (!unitCost.ok || unitCost.value < 0) {
      setNonEeFormError(t("ancillary.unitCostInvalid"));
      return;
    }
    const quantityResult = parseLocaleNumber(nonEeForm.quantity, locale);
    if (!quantityResult.ok || quantityResult.value <= 0) {
      setNonEeFormError(t("ancillary.quantityInvalid"));
      return;
    }
    const unitCostUsd = unitCost.value;
    const quantity = quantityResult.value;

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

  async function handleDeleteNonEeMeasure(id: string): Promise<boolean> {
    setNonEeDeleteError(null);
    try {
      await deleteNonEeMeasure.mutateAsync(id);
      return true;
    } catch (err) {
      setNonEeDeleteError(err instanceof ApiError ? err.message : t("ancillary.failedToDelete"));
      return false;
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
                            onClick={() =>
                              setPendingDelete({
                                kind: "measure",
                                id: measure.id,
                                name: measure.name,
                              })
                            }
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
                  <Select
                    value={form.category}
                    onValueChange={(v) => set("category", v as MeasureCategory)}
                  >
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
                  <NumberInput
                    id="measure-investment"
                    value={form.investmentCostUsd}
                    onValueChange={(raw) => set("investmentCostUsd", raw)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="measure-lifetime">{t("ee.lifetime")}</Label>
                  <NumberInput
                    integer
                    id="measure-lifetime"
                    value={form.lifetimeYears}
                    onValueChange={(raw) => set("lifetimeYears", raw)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="measure-maintenance">{t("ee.maintenance")}</Label>
                  <NumberInput
                    id="measure-maintenance"
                    value={form.maintenanceCostPercent}
                    onValueChange={(raw) => set("maintenanceCostPercent", raw)}
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
                          onClick={() =>
                            setPendingDelete({ kind: "nonEe", id: m.id, name: m.description })
                          }
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
                  <NumberInput
                    id="non-ee-quantity"
                    value={nonEeForm.quantity}
                    onValueChange={(raw) => setNonEe("quantity", raw)}
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
                  <NumberInput
                    id="non-ee-unit-cost"
                    value={nonEeForm.unitCostUsd}
                    onValueChange={(raw) => setNonEe("unitCostUsd", raw)}
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
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("common:confirmDelete.title")}
        description={t("common:confirmDelete.named", { name: pendingDelete?.name ?? "" })}
        confirmLabel={t("common:confirmDelete.confirm")}
        destructive
        pending={deleteMeasure.isPending || deleteNonEeMeasure.isPending}
        error={pendingDelete?.kind === "nonEe" ? nonEeDeleteError : deleteError}
        onConfirm={async () => {
          if (!pendingDelete) return;
          const deleted =
            pendingDelete.kind === "measure"
              ? await handleDelete(pendingDelete.id)
              : await handleDeleteNonEeMeasure(pendingDelete.id);
          // On failure the dialog stays open and shows the error.
          if (deleted) setPendingDelete(null);
        }}
        onCancel={() => {
          setDeleteError(null);
          setNonEeDeleteError(null);
          setPendingDelete(null);
        }}
      />
    </div>
  );
}
