import { Button, Input, Label } from "@yres/ui";
import { Plus } from "lucide-react";
import { useId } from "react";
import { useTranslation } from "react-i18next";
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
              <Input
                id={`${formId}-${row.rowId}-length`}
                type="number"
                step="any"
                value={row.footprintLengthM}
                onChange={(e) => updateRow(row.rowId, { footprintLengthM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-width`}>
                {t("editor.buildingBlocks.footprintWidth")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-width`}
                type="number"
                step="any"
                value={row.footprintWidthM}
                onChange={(e) => updateRow(row.rowId, { footprintWidthM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-floors`}>
                {t("editor.buildingBlocks.numberOfFloors")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-floors`}
                type="number"
                step="1"
                min={1}
                value={row.numberOfFloors}
                onChange={(e) => updateRow(row.rowId, { numberOfFloors: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-floorheight`}>
                {t("editor.buildingBlocks.floorToFloorHeight")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-floorheight`}
                type="number"
                step="any"
                value={row.floorToFloorHeightM}
                onChange={(e) => updateRow(row.rowId, { floorToFloorHeightM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-perimeter`}>
                {t("editor.buildingBlocks.perimeter")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-perimeter`}
                type="number"
                step="any"
                value={row.perimeterM}
                onChange={(e) => updateRow(row.rowId, { perimeterM: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`${formId}-${row.rowId}-lossco`}>
                {t("editor.buildingBlocks.perimeterLossCoefficient")}
              </Label>
              <Input
                id={`${formId}-${row.rowId}-lossco`}
                type="number"
                step="any"
                min={0}
                max={1}
                value={row.perimeterLossCoefficient}
                onChange={(e) => updateRow(row.rowId, { perimeterLossCoefficient: e.target.value })}
              />
            </div>
          </div>
        </RowCard>
      ))}
    </section>
  );
}
