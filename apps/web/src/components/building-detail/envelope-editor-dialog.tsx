import type { EnvelopeElementCategory, Orientation, Scenario } from "@yres/types";
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
} from "@yres/ui";
import { Plus, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useState } from "react";
import { useMaterials, useReplaceEnvelope } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnvelopeData, ReplaceEnvelopePayload } from "../../lib/api-types";
import {
  ENVELOPE_ELEMENT_CATEGORIES,
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
  OPENING_CATEGORY_LABELS,
  ORIENTATIONS,
  ORIENTATION_LABELS,
} from "../../lib/labels";

const EDIT_SCENARIO: Scenario = "before";

let uidCounter = 0;
function uid() {
  uidCounter += 1;
  return `row-${uidCounter}`;
}

interface LayerRow {
  rowId: string;
  layerOrder: number;
  materialId: string;
  thicknessM: string;
}

interface ConstructionTypeRow {
  rowId: string;
  code: string;
  elementCategory: EnvelopeElementCategory;
  description: string;
  layers: LayerRow[];
}

interface OpeningTypeRow {
  rowId: string;
  code: string;
  category: "window" | "door";
  uValueWm2k: string;
  widthM: string;
  heightM: string;
  gValue: string;
  frameFactor: string;
  shadingFactor: string;
  description: string;
}

interface OpeningRefRow {
  rowId: string;
  openingTypeCode: string;
  count: string;
}

interface EnvelopeElementRow {
  rowId: string;
  blockName: string;
  orientation: Orientation;
  sideCode: string;
  description: string;
  constructionTypeCode: string;
  lengthM: string;
  heightEnvContactM: string;
  heightGroundContactM: string;
  openings: OpeningRefRow[];
}

interface EditorState {
  constructionTypes: ConstructionTypeRow[];
  openingTypes: OpeningTypeRow[];
  envelopeElements: EnvelopeElementRow[];
}

function emptyConstructionType(): ConstructionTypeRow {
  return {
    rowId: uid(),
    code: "",
    elementCategory: "external_wall",
    description: "",
    layers: [],
  };
}

function emptyOpeningType(): OpeningTypeRow {
  return {
    rowId: uid(),
    code: "",
    category: "window",
    uValueWm2k: "",
    widthM: "",
    heightM: "",
    gValue: "",
    frameFactor: "",
    shadingFactor: "1",
    description: "",
  };
}

function emptyEnvelopeElement(): EnvelopeElementRow {
  return {
    rowId: uid(),
    blockName: "",
    orientation: "south",
    sideCode: "",
    description: "",
    constructionTypeCode: "",
    lengthM: "",
    heightEnvContactM: "",
    heightGroundContactM: "",
    openings: [],
  };
}

function toEditorState(data: EnvelopeData): EditorState {
  const constructionTypes = data.constructionTypes
    .filter((ct) => ct.scenario === EDIT_SCENARIO)
    .map((ct) => ({
      rowId: uid(),
      code: ct.code,
      elementCategory: ct.elementCategory as EnvelopeElementCategory,
      description: ct.description ?? "",
      layers: [...ct.layers]
        .sort((a, b) => a.layerOrder - b.layerOrder)
        .map((l) => ({
          rowId: uid(),
          layerOrder: l.layerOrder,
          materialId: l.materialId,
          thicknessM: String(l.thicknessM),
        })),
    }));

  const openingTypes = data.openingTypes
    .filter((ot) => ot.scenario === EDIT_SCENARIO)
    .map((ot) => ({
      rowId: uid(),
      code: ot.code,
      category: ot.category,
      uValueWm2k: String(ot.uValueWm2k),
      widthM: ot.widthM !== null ? String(ot.widthM) : "",
      heightM: ot.heightM !== null ? String(ot.heightM) : "",
      gValue: ot.gValue !== null ? String(ot.gValue) : "",
      frameFactor: ot.frameFactor !== null ? String(ot.frameFactor) : "",
      shadingFactor: String(ot.shadingFactor),
      description: ot.description ?? "",
    }));

  const envelopeElements = data.envelopeElements
    .filter((el) => (el.constructionType?.scenario ?? EDIT_SCENARIO) === EDIT_SCENARIO)
    .map((el) => ({
      rowId: uid(),
      blockName: el.blockName,
      orientation: el.orientation,
      sideCode: el.sideCode ?? "",
      description: el.description ?? "",
      constructionTypeCode: el.constructionType?.code ?? "",
      lengthM: String(el.lengthM),
      heightEnvContactM: el.heightEnvContactM !== null ? String(el.heightEnvContactM) : "",
      heightGroundContactM: el.heightGroundContactM !== null ? String(el.heightGroundContactM) : "",
      openings: el.openings.map((o) => ({
        rowId: uid(),
        openingTypeCode: o.openingType?.code ?? "",
        count: String(o.count),
      })),
    }));

  return { constructionTypes, openingTypes, envelopeElements };
}

function parseEditorState(state: EditorState): {
  payload: ReplaceEnvelopePayload | null;
  errors: string[];
} {
  const errors: string[] = [];
  const ctCodes = new Set<string>();

  for (const ct of state.constructionTypes) {
    if (!ct.code.trim()) errors.push("Every construction type needs a code.");
    else if (ctCodes.has(ct.code.trim()))
      errors.push(`Construction type code "${ct.code}" is duplicated.`);
    else ctCodes.add(ct.code.trim());
    for (const layer of ct.layers) {
      if (!layer.materialId)
        errors.push(`Construction type "${ct.code || "?"}" has a layer with no material selected.`);
      if (
        !layer.thicknessM ||
        Number.isNaN(Number(layer.thicknessM)) ||
        Number(layer.thicknessM) <= 0
      ) {
        errors.push(`Construction type "${ct.code || "?"}" has a layer with an invalid thickness.`);
      }
    }
  }

  const otCodes = new Set<string>();
  for (const ot of state.openingTypes) {
    if (!ot.code.trim()) errors.push("Every opening type needs a code.");
    else if (otCodes.has(ot.code.trim()))
      errors.push(`Opening type code "${ot.code}" is duplicated.`);
    else otCodes.add(ot.code.trim());
    if (!ot.uValueWm2k || Number.isNaN(Number(ot.uValueWm2k)) || Number(ot.uValueWm2k) <= 0) {
      errors.push(`Opening type "${ot.code || "?"}" needs a positive U-value.`);
    }
  }

  for (const el of state.envelopeElements) {
    if (!el.blockName.trim()) errors.push("Every envelope element needs a block name.");
    if (!el.constructionTypeCode)
      errors.push(`Envelope element "${el.blockName || "?"}" must reference a construction type.`);
    else if (!ctCodes.has(el.constructionTypeCode)) {
      errors.push(
        `Envelope element "${el.blockName || "?"}" references unknown construction type "${el.constructionTypeCode}".`,
      );
    }
    if (!el.lengthM || Number.isNaN(Number(el.lengthM)) || Number(el.lengthM) <= 0) {
      errors.push(`Envelope element "${el.blockName || "?"}" needs a positive length.`);
    }
    for (const o of el.openings) {
      if (!o.openingTypeCode)
        errors.push(
          `Envelope element "${el.blockName || "?"}" has an opening with no type selected.`,
        );
      else if (!otCodes.has(o.openingTypeCode)) {
        errors.push(
          `Envelope element "${el.blockName || "?"}" references unknown opening type "${o.openingTypeCode}".`,
        );
      }
      if (!o.count || Number.isNaN(Number(o.count)) || Number(o.count) <= 0) {
        errors.push(
          `Envelope element "${el.blockName || "?"}" has an opening with an invalid count.`,
        );
      }
    }
  }

  if (errors.length > 0) return { payload: null, errors };

  return {
    payload: {
      scenario: EDIT_SCENARIO,
      constructionTypes: state.constructionTypes.map((ct) => ({
        code: ct.code.trim(),
        elementCategory: ct.elementCategory,
        description: ct.description.trim() || null,
        layers: ct.layers.map((l, idx) => ({
          layerOrder: idx,
          materialId: l.materialId,
          thicknessM: Number(l.thicknessM),
        })),
      })),
      openingTypes: state.openingTypes.map((ot) => ({
        code: ot.code.trim(),
        category: ot.category,
        uValueWm2k: Number(ot.uValueWm2k),
        widthM: ot.widthM.trim() ? Number(ot.widthM) : null,
        heightM: ot.heightM.trim() ? Number(ot.heightM) : null,
        gValue: ot.gValue.trim() ? Number(ot.gValue) : null,
        frameFactor: ot.frameFactor.trim() ? Number(ot.frameFactor) : null,
        shadingFactor: ot.shadingFactor.trim() ? Number(ot.shadingFactor) : undefined,
        description: ot.description.trim() || null,
      })),
      envelopeElements: state.envelopeElements.map((el) => ({
        blockName: el.blockName.trim(),
        orientation: el.orientation,
        sideCode: el.sideCode.trim() || null,
        description: el.description.trim() || null,
        constructionTypeCode: el.constructionTypeCode,
        lengthM: Number(el.lengthM),
        heightEnvContactM: el.heightEnvContactM.trim() ? Number(el.heightEnvContactM) : undefined,
        heightGroundContactM: el.heightGroundContactM.trim()
          ? Number(el.heightGroundContactM)
          : undefined,
        openings: el.openings.map((o) => ({
          openingTypeCode: o.openingTypeCode,
          count: Number(o.count),
        })),
      })),
    },
    errors: [],
  };
}

interface EnvelopeEditorDialogProps {
  buildingId: string;
  envelope: EnvelopeData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnvelopeEditorDialog({
  buildingId,
  envelope,
  open,
  onOpenChange,
}: EnvelopeEditorDialogProps) {
  const { data: materialsData, isLoading: materialsLoading } = useMaterials();
  const replaceEnvelope = useReplaceEnvelope(buildingId);
  const materials = materialsData?.materials ?? [];

  const [state, setState] = useState<EditorState>(() => toEditorState(envelope));
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-sync from server data when the dialog transitions to open, not on every envelope refetch while it's open (that would clobber in-progress edits).
  useEffect(() => {
    if (open) {
      setState(toEditorState(envelope));
      setErrors([]);
      setApiError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setApiError(null);
    const { payload, errors: validationErrors } = parseEditorState(state);
    setErrors(validationErrors);
    if (!payload) return;

    try {
      await replaceEnvelope.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : "Failed to save envelope.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit envelope — "Before" scenario</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Saving replaces all "before" scenario construction types, opening types, and envelope
          elements for this building. Construction and opening types are referenced by the code you
          give them below — element rows and openings pick their type from those codes.
        </p>

        <div className="space-y-8">
          <ConstructionTypesSection
            rows={state.constructionTypes}
            materials={materials}
            materialsLoading={materialsLoading}
            onChange={(constructionTypes) => setState((s) => ({ ...s, constructionTypes }))}
          />
          <Separator />
          <OpeningTypesSection
            rows={state.openingTypes}
            onChange={(openingTypes) => setState((s) => ({ ...s, openingTypes }))}
          />
          <Separator />
          <EnvelopeElementsSection
            rows={state.envelopeElements}
            constructionTypeCodes={state.constructionTypes.map((c) => c.code).filter(Boolean)}
            openingTypeCodes={state.openingTypes.map((o) => o.code).filter(Boolean)}
            onChange={(envelopeElements) => setState((s) => ({ ...s, envelopeElements }))}
          />
        </div>

        {errors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">Please fix the following:</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={replaceEnvelope.isPending}>
            {replaceEnvelope.isPending ? "Saving..." : "Save envelope"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RowCard({ children, onRemove }: { children: ReactNode; onRemove: () => void }) {
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      </div>
      {children}
    </div>
  );
}

function ConstructionTypesSection({
  rows,
  materials,
  materialsLoading,
  onChange,
}: {
  rows: ConstructionTypeRow[];
  materials: { id: string; name: string }[];
  materialsLoading: boolean;
  onChange: (rows: ConstructionTypeRow[]) => void;
}) {
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<ConstructionTypeRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function updateLayer(rowId: string, layerId: string, patch: Partial<LayerRow>) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId
          ? { ...r, layers: r.layers.map((l) => (l.rowId === layerId ? { ...l, ...patch } : l)) }
          : r,
      ),
    );
  }

  function addLayer(rowId: string) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              layers: [
                ...r.layers,
                { rowId: uid(), layerOrder: r.layers.length, materialId: "", thicknessM: "" },
              ],
            }
          : r,
      ),
    );
  }

  function removeLayer(rowId: string, layerId: string) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId ? { ...r, layers: r.layers.filter((l) => l.rowId !== layerId) } : r,
      ),
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Construction types</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyConstructionType()])}
        >
          <Plus className="h-4 w-4" />
          Add construction type
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No construction types yet.</p>
      )}

      {rows.map((row) => (
        <RowCard
          key={row.rowId}
          onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-code`}>Code *</Label>
              <Input
                id={`${formId}-${row.rowId}-code`}
                placeholder="e.g. W1"
                value={row.code}
                onChange={(e) => updateRow(row.rowId, { code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Element category *</Label>
              <Select
                value={row.elementCategory}
                onValueChange={(v) =>
                  updateRow(row.rowId, { elementCategory: v as EnvelopeElementCategory })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENVELOPE_ELEMENT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {ENVELOPE_ELEMENT_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-desc`}>Description</Label>
              <Input
                id={`${formId}-${row.rowId}-desc`}
                value={row.description}
                onChange={(e) => updateRow(row.rowId, { description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Layers (outside → inside)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => addLayer(row.rowId)}>
                <Plus className="h-3.5 w-3.5" />
                Add layer
              </Button>
            </div>
            {row.layers.length === 0 && (
              <p className="text-xs text-muted-foreground">No layers yet.</p>
            )}
            {row.layers.map((layer) => (
              <div key={layer.rowId} className="flex items-center gap-2">
                <Select
                  value={layer.materialId || undefined}
                  onValueChange={(v) => updateLayer(row.rowId, layer.rowId, { materialId: v })}
                  disabled={materialsLoading}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={materialsLoading ? "Loading materials..." : "Select material"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {materials.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-32"
                  type="number"
                  step="any"
                  placeholder="Thickness (m)"
                  value={layer.thicknessM}
                  onChange={(e) =>
                    updateLayer(row.rowId, layer.rowId, { thicknessM: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeLayer(row.rowId, layer.rowId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {materials.length === 0 && !materialsLoading && (
              <p className="text-xs text-muted-foreground">
                No materials in the reference catalog yet — layers can't be added until materials
                are seeded.
              </p>
            )}
          </div>
        </RowCard>
      ))}
    </section>
  );
}

function OpeningTypesSection({
  rows,
  onChange,
}: {
  rows: OpeningTypeRow[];
  onChange: (rows: OpeningTypeRow[]) => void;
}) {
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<OpeningTypeRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Opening types</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyOpeningType()])}
        >
          <Plus className="h-4 w-4" />
          Add opening type
        </Button>
      </div>

      {rows.length === 0 && <p className="text-sm text-muted-foreground">No opening types yet.</p>}

      {rows.map((row) => (
        <RowCard
          key={row.rowId}
          onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-code`}>Code *</Label>
              <Input
                id={`${formId}-${row.rowId}-code`}
                placeholder="e.g. Win1"
                value={row.code}
                onChange={(e) => updateRow(row.rowId, { code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Category *</Label>
              <Select
                value={row.category}
                onValueChange={(v) => updateRow(row.rowId, { category: v as "window" | "door" })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(OPENING_CATEGORY_LABELS) as ("window" | "door")[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {OPENING_CATEGORY_LABELS[cat]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-u`}>U-value (W/m²K) *</Label>
              <Input
                id={`${formId}-${row.rowId}-u`}
                type="number"
                step="any"
                value={row.uValueWm2k}
                onChange={(e) => updateRow(row.rowId, { uValueWm2k: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-shading`}>Shading factor</Label>
              <Input
                id={`${formId}-${row.rowId}-shading`}
                type="number"
                step="any"
                value={row.shadingFactor}
                onChange={(e) => updateRow(row.rowId, { shadingFactor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-width`}>Width (m)</Label>
              <Input
                id={`${formId}-${row.rowId}-width`}
                type="number"
                step="any"
                value={row.widthM}
                onChange={(e) => updateRow(row.rowId, { widthM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-height`}>Height (m)</Label>
              <Input
                id={`${formId}-${row.rowId}-height`}
                type="number"
                step="any"
                value={row.heightM}
                onChange={(e) => updateRow(row.rowId, { heightM: e.target.value })}
              />
            </div>
            {row.category === "window" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-${row.rowId}-g`}>g-value</Label>
                  <Input
                    id={`${formId}-${row.rowId}-g`}
                    type="number"
                    step="any"
                    value={row.gValue}
                    onChange={(e) => updateRow(row.rowId, { gValue: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-${row.rowId}-frame`}>Frame factor</Label>
                  <Input
                    id={`${formId}-${row.rowId}-frame`}
                    type="number"
                    step="any"
                    value={row.frameFactor}
                    onChange={(e) => updateRow(row.rowId, { frameFactor: e.target.value })}
                  />
                </div>
              </>
            )}
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${formId}-${row.rowId}-desc`}>Description</Label>
              <Input
                id={`${formId}-${row.rowId}-desc`}
                value={row.description}
                onChange={(e) => updateRow(row.rowId, { description: e.target.value })}
              />
            </div>
          </div>
        </RowCard>
      ))}
    </section>
  );
}

function EnvelopeElementsSection({
  rows,
  constructionTypeCodes,
  openingTypeCodes,
  onChange,
}: {
  rows: EnvelopeElementRow[];
  constructionTypeCodes: string[];
  openingTypeCodes: string[];
  onChange: (rows: EnvelopeElementRow[]) => void;
}) {
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<EnvelopeElementRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function updateOpening(rowId: string, openingId: string, patch: Partial<OpeningRefRow>) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId
          ? {
              ...r,
              openings: r.openings.map((o) => (o.rowId === openingId ? { ...o, ...patch } : o)),
            }
          : r,
      ),
    );
  }

  function addOpening(rowId: string) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId
          ? { ...r, openings: [...r.openings, { rowId: uid(), openingTypeCode: "", count: "1" }] }
          : r,
      ),
    );
  }

  function removeOpening(rowId: string, openingId: string) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId ? { ...r, openings: r.openings.filter((o) => o.rowId !== openingId) } : r,
      ),
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Envelope elements</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyEnvelopeElement()])}
        >
          <Plus className="h-4 w-4" />
          Add element
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No envelope elements yet.</p>
      )}

      {rows.map((row) => (
        <RowCard
          key={row.rowId}
          onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-block`}>Block name *</Label>
              <Input
                id={`${formId}-${row.rowId}-block`}
                value={row.blockName}
                onChange={(e) => updateRow(row.rowId, { blockName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Orientation *</Label>
              <Select
                value={row.orientation}
                onValueChange={(v) => updateRow(row.rowId, { orientation: v as Orientation })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ORIENTATIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {ORIENTATION_LABELS[o]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-side`}>Side code</Label>
              <Input
                id={`${formId}-${row.rowId}-side`}
                value={row.sideCode}
                onChange={(e) => updateRow(row.rowId, { sideCode: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Construction type *</Label>
              <Select
                value={row.constructionTypeCode || undefined}
                onValueChange={(v) => updateRow(row.rowId, { constructionTypeCode: v })}
                disabled={constructionTypeCodes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      constructionTypeCodes.length === 0
                        ? "Add a construction type first"
                        : "Select"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {constructionTypeCodes.map((code) => (
                    <SelectItem key={code} value={code}>
                      {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-length`}>Length (m) *</Label>
              <Input
                id={`${formId}-${row.rowId}-length`}
                type="number"
                step="any"
                value={row.lengthM}
                onChange={(e) => updateRow(row.rowId, { lengthM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-heightEnv`}>
                Height, envelope contact (m)
              </Label>
              <Input
                id={`${formId}-${row.rowId}-heightEnv`}
                type="number"
                step="any"
                value={row.heightEnvContactM}
                onChange={(e) => updateRow(row.rowId, { heightEnvContactM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-heightGround`}>
                Height, ground contact (m)
              </Label>
              <Input
                id={`${formId}-${row.rowId}-heightGround`}
                type="number"
                step="any"
                value={row.heightGroundContactM}
                onChange={(e) => updateRow(row.rowId, { heightGroundContactM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor={`${formId}-${row.rowId}-desc`}>Description</Label>
              <Input
                id={`${formId}-${row.rowId}-desc`}
                value={row.description}
                onChange={(e) => updateRow(row.rowId, { description: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">Openings (windows/doors)</Label>
              <Button type="button" size="sm" variant="ghost" onClick={() => addOpening(row.rowId)}>
                <Plus className="h-3.5 w-3.5" />
                Add opening
              </Button>
            </div>
            {row.openings.length === 0 && (
              <p className="text-xs text-muted-foreground">No openings on this element.</p>
            )}
            {row.openings.map((opening) => (
              <div key={opening.rowId} className="flex items-center gap-2">
                <Select
                  value={opening.openingTypeCode || undefined}
                  onValueChange={(v) =>
                    updateOpening(row.rowId, opening.rowId, { openingTypeCode: v })
                  }
                  disabled={openingTypeCodes.length === 0}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue
                      placeholder={
                        openingTypeCodes.length === 0
                          ? "Add an opening type first"
                          : "Select opening type"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {openingTypeCodes.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className="w-24"
                  type="number"
                  placeholder="Count"
                  value={opening.count}
                  onChange={(e) =>
                    updateOpening(row.rowId, opening.rowId, { count: e.target.value })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOpening(row.rowId, opening.rowId)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </RowCard>
      ))}
    </section>
  );
}
