import type { EnvelopeElementCategory } from "@yres/types";
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yres/ui";
import { Plus, Trash2 } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import type { Material, SurfaceResistance } from "../../../lib/api-types";
import {
  ENVELOPE_ELEMENT_CATEGORIES,
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
  formatNumber,
} from "../../../lib/labels";
import { computeUValuePreview } from "./calculations";
import { RowCard } from "./row-card";
import { type ConstructionTypeRow, emptyConstructionType, uid } from "./state";

export function ConstructionTypesStep({
  rows,
  materials,
  materialsLoading,
  surfaceResistances,
  onChange,
}: {
  rows: ConstructionTypeRow[];
  materials: Material[];
  materialsLoading: boolean;
  surfaceResistances: SurfaceResistance[];
  onChange: (rows: ConstructionTypeRow[]) => void;
}) {
  const { t } = useTranslation("envelope");
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<ConstructionTypeRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function updateLayer(rowId: string, layerId: string, patch: Partial<ConstructionTypeRow["layers"][number]>) {
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
        <h3 className="text-sm font-semibold">{t("editor.constructionTypes.title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyConstructionType()])}
        >
          <Plus className="h-4 w-4" />
          {t("editor.constructionTypes.add")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("editor.constructionTypes.stepDescription")}</p>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("editor.constructionTypes.empty")}</p>
      )}

      {rows.map((row) => {
        const uValue = computeUValuePreview(row, materials, surfaceResistances);
        return (
          <RowCard
            key={row.rowId}
            onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
            headerExtra={
              <Badge variant={uValue !== null ? "default" : "secondary"}>
                {uValue !== null
                  ? t("editor.constructionTypes.uValuePreview", { value: formatNumber(uValue, 2) })
                  : t("editor.constructionTypes.uValueUnavailable")}
              </Badge>
            }
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${formId}-${row.rowId}-code`}>
                  {t("editor.constructionTypes.code")}
                </Label>
                <Input
                  id={`${formId}-${row.rowId}-code`}
                  placeholder={t("editor.constructionTypes.codePlaceholder")}
                  value={row.code}
                  onChange={(e) => updateRow(row.rowId, { code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t("editor.constructionTypes.elementCategory")}</Label>
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
                <Label htmlFor={`${formId}-${row.rowId}-desc`}>
                  {t("editor.constructionTypes.description")}
                </Label>
                <Input
                  id={`${formId}-${row.rowId}-desc`}
                  value={row.description}
                  onChange={(e) => updateRow(row.rowId, { description: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">
                  {t("editor.constructionTypes.layersLabel")}
                </Label>
                <Button type="button" size="sm" variant="ghost" onClick={() => addLayer(row.rowId)}>
                  <Plus className="h-3.5 w-3.5" />
                  {t("editor.constructionTypes.addLayer")}
                </Button>
              </div>
              {row.layers.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  {t("editor.constructionTypes.noLayers")}
                </p>
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
                        placeholder={
                          materialsLoading
                            ? t("editor.constructionTypes.loadingMaterials")
                            : t("editor.constructionTypes.selectMaterial")
                        }
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
                    placeholder={t("editor.constructionTypes.thicknessPlaceholder")}
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
                  {t("editor.constructionTypes.noMaterials")}
                </p>
              )}
            </div>
          </RowCard>
        );
      })}
    </section>
  );
}
