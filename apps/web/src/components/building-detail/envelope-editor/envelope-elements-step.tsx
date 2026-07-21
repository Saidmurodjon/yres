import type { Orientation } from "@yres/types";
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
import { useId, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  ENVELOPE_ELEMENT_CATEGORY_LABELS,
  ORIENTATIONS,
  ORIENTATION_LABELS,
  OPENING_CATEGORY_LABELS,
  formatNumber,
} from "../../../lib/labels";
import { computeElementAreaTotals, elementNetAreaM2 } from "./calculations";
import { RowCard } from "./row-card";
import {
  type ConstructionTypeRow,
  type EnvelopeElementRow,
  type OpeningTypeRow,
  emptyEnvelopeElement,
  uid,
} from "./state";

interface Group {
  key: string;
  label: string;
  rows: EnvelopeElementRow[];
}

export function EnvelopeElementsStep({
  rows,
  constructionTypes,
  openingTypes,
  blockNames,
  onChange,
}: {
  rows: EnvelopeElementRow[];
  constructionTypes: ConstructionTypeRow[];
  openingTypes: OpeningTypeRow[];
  blockNames: string[];
  onChange: (rows: EnvelopeElementRow[]) => void;
}) {
  const { t } = useTranslation("envelope");
  const formId = useId();

  const constructionTypeCodes = useMemo(
    () => constructionTypes.map((c) => c.code).filter(Boolean),
    [constructionTypes],
  );
  const openingTypeCodes = useMemo(
    () => openingTypes.map((o) => o.code).filter(Boolean),
    [openingTypes],
  );
  const constructionTypesByCode = useMemo(
    () => new Map(constructionTypes.filter((c) => c.code).map((c) => [c.code, c])),
    [constructionTypes],
  );
  const openingTypesByCode = useMemo(
    () => new Map(openingTypes.filter((o) => o.code).map((o) => [o.code, o])),
    [openingTypes],
  );

  const totals = useMemo(
    () => computeElementAreaTotals(rows, constructionTypesByCode, openingTypesByCode),
    [rows, constructionTypesByCode, openingTypesByCode],
  );

  const groups = useMemo<Group[]>(() => {
    const sideMap = new Map<string, Group>();
    const horizontal: EnvelopeElementRow[] = [];
    for (const el of rows) {
      if (el.orientation === "horizontal") {
        horizontal.push(el);
        continue;
      }
      const trimmed = el.sideCode.trim();
      const key = trimmed ? `side:${trimmed}` : `single:${el.rowId}`;
      let group = sideMap.get(key);
      if (!group) {
        group = { key, label: trimmed || t("editor.elements.unnamedSide"), rows: [] };
        sideMap.set(key, group);
      }
      group.rows.push(el);
    }
    const result = Array.from(sideMap.values());
    if (horizontal.length > 0) {
      result.push({ key: "horizontal", label: t("editor.elements.roofAndFloor"), rows: horizontal });
    }
    return result;
  }, [rows, t]);

  function updateRow(rowId: string, patch: Partial<EnvelopeElementRow>) {
    onChange(rows.map((r) => (r.rowId === rowId ? { ...r, ...patch } : r)));
  }

  function removeRow(rowId: string) {
    onChange(rows.filter((r) => r.rowId !== rowId));
  }

  function addSide() {
    onChange([...rows, emptyEnvelopeElement()]);
  }

  function addElementToGroup(group: Group) {
    const first = group.rows[0];
    onChange([
      ...rows,
      emptyEnvelopeElement(
        group.key === "horizontal"
          ? { orientation: "horizontal" }
          : { blockName: first?.blockName, orientation: first?.orientation, sideCode: first?.sideCode },
      ),
    ]);
  }

  function updateOpening(rowId: string, openingId: string, patch: Partial<EnvelopeElementRow["openings"][number]>) {
    onChange(
      rows.map((r) =>
        r.rowId === rowId
          ? { ...r, openings: r.openings.map((o) => (o.rowId === openingId ? { ...o, ...patch } : o)) }
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
        <h3 className="text-sm font-semibold">{t("editor.elements.title")}</h3>
        <Button type="button" size="sm" variant="outline" onClick={addSide}>
          <Plus className="h-4 w-4" />
          {t("editor.elements.addSide")}
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">{t("editor.elements.stepDescription")}</p>

      <div className="sticky top-0 z-10 space-y-1.5 rounded-md border border-border bg-background p-3 shadow-sm">
        <p className="text-xs font-medium text-muted-foreground">
          {t("editor.elements.totalsBar.title")}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {Object.entries(totals.byCategory).map(([category, area]) => (
            <span key={category}>
              <span className="text-muted-foreground">
                {ENVELOPE_ELEMENT_CATEGORY_LABELS[category as keyof typeof ENVELOPE_ELEMENT_CATEGORY_LABELS] ??
                  category}
                :{" "}
              </span>
              <span className="font-medium">{formatNumber(area)} m²</span>
            </span>
          ))}
          <span>
            <span className="text-muted-foreground">{OPENING_CATEGORY_LABELS.window}: </span>
            <span className="font-medium">{formatNumber(totals.windowAreaM2)} m²</span>
          </span>
          <span>
            <span className="text-muted-foreground">{OPENING_CATEGORY_LABELS.door}: </span>
            <span className="font-medium">{formatNumber(totals.doorAreaM2)} m²</span>
          </span>
        </div>
      </div>

      {groups.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("editor.elements.empty")}</p>
      )}

      {groups.map((group) => {
        const groupAreaM2 = group.rows.reduce(
          (sum, el) => sum + elementNetAreaM2(el, openingTypesByCode),
          0,
        );
        return (
          <details key={group.key} className="rounded-md border border-border">
            <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium">
              <span>
                {group.label}{" "}
                <span className="font-normal text-muted-foreground">
                  {t("editor.elements.groupElementCount", { count: group.rows.length })}
                </span>
              </span>
              <span className="text-muted-foreground">{formatNumber(groupAreaM2)} m²</span>
            </summary>

            <div className="space-y-3 border-t border-border p-4">
              {group.rows.map((row) => (
                <RowCard
                  key={row.rowId}
                  onRemove={() => removeRow(row.rowId)}
                  headerExtra={
                    <Badge variant="secondary">
                      {formatNumber(elementNetAreaM2(row, openingTypesByCode))} m²
                    </Badge>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label>{t("editor.elements.blockName")}</Label>
                      <Select
                        value={row.blockName || undefined}
                        onValueChange={(v) => updateRow(row.rowId, { blockName: v })}
                        disabled={blockNames.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              blockNames.length === 0
                                ? t("editor.elements.addBuildingBlockFirst")
                                : t("editor.elements.select")
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {blockNames.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("editor.elements.orientation")}</Label>
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
                      <Label htmlFor={`${formId}-${row.rowId}-side`}>
                        {t("editor.elements.sideCode")}
                      </Label>
                      <Input
                        id={`${formId}-${row.rowId}-side`}
                        value={row.sideCode}
                        onChange={(e) => updateRow(row.rowId, { sideCode: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("editor.elements.constructionType")}</Label>
                      <Select
                        value={row.constructionTypeCode || undefined}
                        onValueChange={(v) => updateRow(row.rowId, { constructionTypeCode: v })}
                        disabled={constructionTypeCodes.length === 0}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              constructionTypeCodes.length === 0
                                ? t("editor.elements.addConstructionTypeFirst")
                                : t("editor.elements.select")
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
                      <Label htmlFor={`${formId}-${row.rowId}-length`}>
                        {t("editor.elements.length")}
                      </Label>
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
                        {t("editor.elements.heightEnvContact")}
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
                        {t("editor.elements.heightGroundContact")}
                      </Label>
                      <Input
                        id={`${formId}-${row.rowId}-heightGround`}
                        type="number"
                        step="any"
                        value={row.heightGroundContactM}
                        onChange={(e) =>
                          updateRow(row.rowId, { heightGroundContactM: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor={`${formId}-${row.rowId}-desc`}>
                        {t("editor.elements.description")}
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
                        {t("editor.elements.openingsLabel")}
                      </Label>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => addOpening(row.rowId)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t("editor.elements.addOpening")}
                      </Button>
                    </div>
                    {row.openings.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        {t("editor.elements.noOpenings")}
                      </p>
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
                                  ? t("editor.elements.addOpeningTypeFirst")
                                  : t("editor.elements.selectOpeningType")
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
                          placeholder={t("editor.elements.countPlaceholder")}
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

              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => addElementToGroup(group)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t("editor.elements.addElement")}
              </Button>
            </div>
          </details>
        );
      })}
    </section>
  );
}
