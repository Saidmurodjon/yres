import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yres/ui";
import { Plus } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { OPENING_CATEGORY_LABELS } from "../../../lib/labels";
import { NumberInput } from "../../number-input";
import { KeptTypes, RetrofitOfSelect } from "./retrofit-select";
import { RowCard } from "./row-card";
import { type BeforeTypeOption, type OpeningTypeRow, emptyOpeningType } from "./state";

export function OpeningTypesStep({
  rows,
  retrofitOptions,
  onChange,
}: {
  rows: OpeningTypeRow[];
  /** Set in the "after" editor: the "before" types a row can replace. */
  retrofitOptions?: BeforeTypeOption[];
  onChange: (rows: OpeningTypeRow[]) => void;
}) {
  const { t } = useTranslation("envelope");
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<OpeningTypeRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  const chosenCodes = new Set(rows.map((r) => r.retrofitOfCode).filter(Boolean));

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
            {retrofitOptions && (
              <RetrofitOfSelect
                id={`${formId}-${row.rowId}-retrofit`}
                value={row.retrofitOfCode}
                category={row.category}
                options={retrofitOptions}
                takenCodes={chosenCodes}
                onChange={(retrofitOfCode) => updateRow(row.rowId, { retrofitOfCode })}
              />
            )}
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
              <NumberInput
                id={`${formId}-${row.rowId}-u`}
                value={row.uValueWm2k}
                onValueChange={(raw) => updateRow(row.rowId, { uValueWm2k: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-shading`}>
                {t("editor.openingTypes.shadingFactor")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-shading`}
                value={row.shadingFactor}
                onValueChange={(raw) => updateRow(row.rowId, { shadingFactor: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-width`}>
                {t("editor.openingTypes.width")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-width`}
                value={row.widthM}
                onValueChange={(raw) => updateRow(row.rowId, { widthM: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-height`}>
                {t("editor.openingTypes.height")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-height`}
                value={row.heightM}
                onValueChange={(raw) => updateRow(row.rowId, { heightM: raw })}
              />
            </div>
            {row.category === "window" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-${row.rowId}-g`}>
                    {t("editor.openingTypes.gValue")}
                  </Label>
                  <NumberInput
                    id={`${formId}-${row.rowId}-g`}
                    value={row.gValue}
                    onValueChange={(raw) => updateRow(row.rowId, { gValue: raw })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`${formId}-${row.rowId}-frame`}>
                    {t("editor.openingTypes.frameFactor")}
                  </Label>
                  <NumberInput
                    id={`${formId}-${row.rowId}-frame`}
                    value={row.frameFactor}
                    onValueChange={(raw) => updateRow(row.rowId, { frameFactor: raw })}
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
      {retrofitOptions && (
        <KeptTypes
          codes={retrofitOptions
            .map((o) => o.code)
            .filter((code) => !rows.some((r) => r.retrofitOfCode === code))}
        />
      )}
    </section>
  );
}
