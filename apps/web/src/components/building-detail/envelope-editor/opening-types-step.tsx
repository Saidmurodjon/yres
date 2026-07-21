import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@yres/ui";
import { Plus } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { OPENING_CATEGORY_LABELS } from "../../../lib/labels";
import { RowCard } from "./row-card";
import { type OpeningTypeRow, emptyOpeningType } from "./state";

export function OpeningTypesStep({
  rows,
  onChange,
}: {
  rows: OpeningTypeRow[];
  onChange: (rows: OpeningTypeRow[]) => void;
}) {
  const { t } = useTranslation("envelope");
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<OpeningTypeRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("editor.openingTypes.title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyOpeningType()])}
        >
          <Plus className="h-4 w-4" />
          {t("editor.openingTypes.add")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("editor.openingTypes.stepDescription")}</p>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("editor.openingTypes.empty")}</p>
      )}

      {rows.map((row) => (
        <RowCard
          key={row.rowId}
          onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
        >
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-code`}>{t("editor.openingTypes.code")}</Label>
              <Input
                id={`${formId}-${row.rowId}-code`}
                placeholder={t("editor.openingTypes.codePlaceholder")}
                value={row.code}
                onChange={(e) => updateRow(row.rowId, { code: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("editor.openingTypes.category")}</Label>
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
              <Label htmlFor={`${formId}-${row.rowId}-u`}>{t("editor.openingTypes.uValue")}</Label>
              <Input
                id={`${formId}-${row.rowId}-u`}
                type="number"
                step="any"
                value={row.uValueWm2k}
                onChange={(e) => updateRow(row.rowId, { uValueWm2k: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-shading`}>
                {t("editor.openingTypes.shadingFactor")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-shading`}
                type="number"
                step="any"
                value={row.shadingFactor}
                onChange={(e) => updateRow(row.rowId, { shadingFactor: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-width`}>
                {t("editor.openingTypes.width")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-width`}
                type="number"
                step="any"
                value={row.widthM}
                onChange={(e) => updateRow(row.rowId, { widthM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-height`}>
                {t("editor.openingTypes.height")}
              </Label>
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
                  <Label htmlFor={`${formId}-${row.rowId}-g`}>
                    {t("editor.openingTypes.gValue")}
                  </Label>
                  <Input
                    id={`${formId}-${row.rowId}-g`}
                    type="number"
                    step="any"
                    value={row.gValue}
                    onChange={(e) => updateRow(row.rowId, { gValue: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-${row.rowId}-frame`}>
                    {t("editor.openingTypes.frameFactor")}
                  </Label>
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
              <Label htmlFor={`${formId}-${row.rowId}-desc`}>
                {t("editor.openingTypes.description")}
              </Label>
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
