import { Button, Input, Label } from "@yres/ui";
import { Plus } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { NumberInput } from "../../number-input";
import { RowCard } from "./row-card";
import { type BuildingBlockRow, emptyBuildingBlock } from "./state";

export function BuildingBlocksStep({
  rows,
  onChange,
}: {
  rows: BuildingBlockRow[];
  onChange: (rows: BuildingBlockRow[]) => void;
}) {
  const { t } = useTranslation("envelope");
  const formId = useId();

  function updateRow(rowId: string, patch: Partial<BuildingBlockRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{t("editor.buildingBlocks.title")}</h3>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...rows, emptyBuildingBlock()])}
        >
          <Plus className="h-4 w-4" />
          {t("editor.buildingBlocks.add")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("editor.buildingBlocks.stepDescription")}</p>

      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("editor.buildingBlocks.empty")}</p>
      )}

      {rows.map((row) => (
        <RowCard
          key={row.rowId}
          onRemove={() => onChange(rows.filter((r) => r.rowId !== row.rowId))}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-name`}>
                {t("editor.buildingBlocks.name")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-name`}
                placeholder={t("editor.buildingBlocks.namePlaceholder")}
                value={row.name}
                onChange={(e) => updateRow(row.rowId, { name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-length`}>
                {t("editor.buildingBlocks.footprintLength")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-length`}
                value={row.footprintLengthM}
                onValueChange={(raw) => updateRow(row.rowId, { footprintLengthM: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-width`}>
                {t("editor.buildingBlocks.footprintWidth")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-width`}
                value={row.footprintWidthM}
                onValueChange={(raw) => updateRow(row.rowId, { footprintWidthM: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-floors`}>
                {t("editor.buildingBlocks.numberOfFloors")}
              </Label>
              <NumberInput
                integer
                id={`${formId}-${row.rowId}-floors`}
                min={1}
                value={row.numberOfFloors}
                onValueChange={(raw) => updateRow(row.rowId, { numberOfFloors: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-floorheight`}>
                {t("editor.buildingBlocks.floorToFloorHeight")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-floorheight`}
                value={row.floorToFloorHeightM}
                onValueChange={(raw) => updateRow(row.rowId, { floorToFloorHeightM: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-perimeter`}>
                {t("editor.buildingBlocks.perimeter")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-perimeter`}
                value={row.perimeterM}
                onValueChange={(raw) => updateRow(row.rowId, { perimeterM: raw })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-lossco`}>
                {t("editor.buildingBlocks.perimeterLossCoefficient")}
              </Label>
              <NumberInput
                id={`${formId}-${row.rowId}-lossco`}
                min={0}
                max={1}
                value={row.perimeterLossCoefficient}
                onValueChange={(raw) => updateRow(row.rowId, { perimeterLossCoefficient: raw })}
              />
            </div>
          </div>
        </RowCard>
      ))}
    </section>
  );
}
