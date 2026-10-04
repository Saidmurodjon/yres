import type { Scenario } from "@yres/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@yres/ui";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useReplaceCoolingSystems,
  useReplaceCoolingWindows,
  useReplaceDhw,
  useReplaceDistribution,
  useReplaceEquipment,
  useReplaceGeneration,
  useReplaceLighting,
  useReplaceRenewables,
  useReplaceVentilation,
  useSystems,
} from "../../hooks";
import { useRevisionConflict } from "../../hooks/use-revision-conflict";
import { useSyncedRows } from "../../hooks/use-synced-rows";
import { ApiError } from "../../lib/api";
import type {
  CoolingSystem,
  CoolingWindow,
  DhwSource,
  DistributionSystem,
  DistributionSystemType,
  EnergyCarrier,
  EquipmentItem,
  GenerationSource,
  GenerationSourceType,
  LightingZone,
  RenewableSystem,
  RenewableSystemType,
  SystemsData,
  VentilationSystem,
  VentilationSystemType,
} from "../../lib/api-types";
import {
  DISTRIBUTION_SYSTEM_TYPE_LABELS,
  END_USES,
  END_USE_LABELS,
  ENERGY_CARRIERS,
  ENERGY_CARRIER_LABELS,
  GENERATION_SOURCE_TYPES,
  GENERATION_SOURCE_TYPE_LABELS,
  ORIENTATIONS,
  ORIENTATION_LABELS,
  RENEWABLE_SYSTEM_TYPES,
  RENEWABLE_SYSTEM_TYPE_LABELS,
  VENTILATION_SYSTEM_TYPE_LABELS,
} from "../../lib/labels";
import {
  type NumberLocale,
  formatNumberForInput,
  parseLocaleNumber,
  toNumberLocale,
} from "../../lib/number";
import { NumberInput } from "../number-input";
import { RevisionConflictDialog } from "../revision-conflict-dialog";
import { useConfirmDiscard, useRegisterDirty } from "../unsaved-changes";

// Local editable rows always carry an `id` — real DB ids for rows loaded
// from the server, transient `local-*` ones for rows newly added client
// side, only used as a React key. Every other field is kept as a plain
// string while editing (matching the rest of this app's form convention:
// audit.tsx's QuickEnvelopeValues) and parsed to numbers on save.
type Row = { id: string } & Record<string, string>;

let nextLocalId = 0;
function newLocalId() {
  nextLocalId += 1;
  return `local-${nextLocalId}`;
}

interface Column {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  /** Whole numbers only (counts). */
  integer?: boolean;
}

function EditableRowsCard({
  title,
  description,
  columns,
  rows,
  onRowsChange,
  onAddRow,
  onSave,
  saving,
  error,
  invalidCells = NO_INVALID_CELLS,
  readOnly = false,
}: {
  title: string;
  description: string;
  columns: Column[];
  rows: Row[];
  onRowsChange: (rows: Row[]) => void;
  onAddRow: () => Row;
  onSave: () => void;
  saving: boolean;
  error: string | null;
  /** `${rowId}:${columnKey}` of cells the last save attempt could not read as numbers. */
  invalidCells?: ReadonlySet<string>;
  readOnly?: boolean;
}) {
  function updateCell(rowId: string, key: string, value: string) {
    onRowsChange(rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));
  }

  function removeRow(rowId: string) {
    onRowsChange(rows.filter((r) => r.id !== rowId));
  }

  const { t } = useTranslation("systems");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("common.noneDefined")}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((col) => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                {!readOnly && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {columns.map((col) => (
                    <TableCell key={col.key}>
                      {col.type === "select" ? (
                        <Select
                          value={row[col.key] ?? ""}
                          onValueChange={(v) => updateCell(row.id, col.key, v)}
                          disabled={readOnly}
                        >
                          <SelectTrigger className="h-9 w-full min-w-[9rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {col.options?.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <NumberInput
                          value={row[col.key] ?? ""}
                          onValueChange={(raw) => updateCell(row.id, col.key, raw)}
                          integer={col.integer}
                          // Cramped table cell: flagged red with the message in `title`; the card's error line
                          // says what to fix (a text line under every cell would break the layout).
                          showMessage={false}
                          error={
                            invalidCells.has(`${row.id}:${col.key}`)
                              ? t("common.invalidCell")
                              : undefined
                          }
                          disabled={readOnly}
                          className="h-9 min-w-[6rem] px-2 py-1"
                        />
                      )}
                    </TableCell>
                  ))}
                  {!readOnly && (
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRow(row.id)}
                        aria-label={t("common.removeRow")}
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
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
      {!readOnly && (
        <CardFooter className="justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onRowsChange([...rows, onAddRow()])}
          >
            <Plus className="h-4 w-4" />
            {t("common.addRow")}
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? t("common:saving") : t("common:save")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function toRows<T extends { id: string }>(
  items: T[],
  scenario: Scenario,
  map: (item: T) => Row,
): Row[] {
  return items
    .filter((item) => (item as unknown as { scenario?: Scenario }).scenario === scenario)
    .map(map);
}

const NO_INVALID_CELLS: ReadonlySet<string> = new Set();

/**
 * Turns the text cells of a section into numbers for the save payload. A cell that cannot be read is
 * recorded in `invalid` (by `${rowId}:${key}`) and the caller must not send anything — nothing is turned
 * into 0 or dropped silently. `num` is for fields the backend requires (empty is an error too);
 * `numOrNull` for nullable ones (empty means "not given"). The 0 returned for a bad cell is only a
 * placeholder for building the payload object that is then thrown away.
 */
class RowParser {
  readonly invalid = new Set<string>();

  constructor(private readonly locale: NumberLocale) {}

  get ok(): boolean {
    return this.invalid.size === 0;
  }

  num(row: Row, key: string, opts?: { integer?: boolean }): number {
    const parsed = parseLocaleNumber(row[key] ?? "", this.locale, opts);
    if (parsed.ok) return parsed.value;
    this.invalid.add(`${row.id}:${key}`);
    return 0;
  }

  /** Distribution efficiency η ∈ (0, 1]; out of range is an inline error, never silently clamped. */
  efficiency(row: Row, key: string): number {
    const value = this.num(row, key);
    if (value <= 0 || value > 1) this.invalid.add(`${row.id}:${key}`);
    return value;
  }

  /** Optional η: empty → null (no distribution loss). */
  efficiencyOrNull(row: Row, key: string): number | null {
    const value = this.numOrNull(row, key);
    if (value != null && (value <= 0 || value > 1)) this.invalid.add(`${row.id}:${key}`);
    return value;
  }

  numOrNull(row: Row, key: string, opts?: { integer?: boolean }): number | null {
    const parsed = parseLocaleNumber(row[key] ?? "", this.locale, opts);
    if (parsed.ok) return parsed.value;
    if (parsed.reason === "invalid") this.invalid.add(`${row.id}:${key}`);
    return null;
  }
}

export function SystemsTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { data, isLoading, isError, error, refetch } = useSystems(buildingId);
  const [scenario, setScenario] = useState<Scenario>("before");
  const confirmDiscard = useConfirmDiscard();
  const { t } = useTranslation("systems");
  // A10: each section re-fetches through this (instead of its own `useSystems` subscription) so
  // "load their version" always resolves against the latest server data, not a stale closure.
  const refetchSystems = async () => (await refetch()).data;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-sm text-destructive">
          {t("loadError", {
            message: error instanceof ApiError ? error.message : t("common:unknownError"),
          })}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs
        value={scenario}
        onValueChange={(v) => confirmDiscard(() => setScenario(v as Scenario))}
      >
        <TabsList>
          <TabsTrigger value="before">{t("scenarioBefore")}</TabsTrigger>
          <TabsTrigger value="after">{t("scenarioAfter")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <VentilationSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.ventilationSystems}
        revision={data.revisions.ventilation}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <DhwSection
        buildingId={buildingId}
        scenario={scenario}
        sources={data.dhwSources}
        revision={data.revisions.dhw}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <DistributionSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.distributionSystems}
        revision={data.revisions.distribution}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <GenerationSection
        buildingId={buildingId}
        scenario={scenario}
        sources={data.generationSources}
        revision={data.revisions.generation}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <CoolingWindowsSection
        buildingId={buildingId}
        scenario={scenario}
        windows={data.coolingWindows}
        revision={data.revisions.coolingWindows}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <CoolingSystemsSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.coolingSystems}
        revision={data.revisions.coolingSystems}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <LightingSection
        buildingId={buildingId}
        scenario={scenario}
        zones={data.lightingZones}
        revision={data.revisions.lighting}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />
      <EquipmentSection
        buildingId={buildingId}
        scenario={scenario}
        items={data.equipmentItems}
        revision={data.revisions.equipment}
        refetchSystems={refetchSystems}
        readOnly={readOnly}
      />

      <div className="border-t border-border pt-6">
        <p className="mb-4 text-sm text-muted-foreground">{t("renewables.intro")}</p>
        <RenewablesSection
          buildingId={buildingId}
          systems={data.renewableSystems}
          revision={data.revisions.renewables}
          refetchSystems={refetchSystems}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

/** What each section needs to resolve "load their version" (A10) without its own `useSystems` subscription. */
type RefetchSystems = () => Promise<
  Pick<
    SystemsData,
    | "ventilationSystems"
    | "dhwSources"
    | "distributionSystems"
    | "generationSources"
    | "coolingWindows"
    | "coolingSystems"
    | "lightingZones"
    | "equipmentItems"
    | "renewableSystems"
    | "revisions"
  >
  | undefined
>;

function mapVentilationRow(s: VentilationSystem, locale: NumberLocale): Row {
  return {
    id: s.id,
    systemType: s.systemType,
    airChangeRatePerHour: formatNumberForInput(s.airChangeRatePerHour, locale),
    freshAirPerPersonM3h: formatNumberForInput(s.freshAirPerPersonM3h, locale),
    heatRecoveryEfficiency: formatNumberForInput(s.heatRecoveryEfficiency, locale),
    fanElectricalPowerKw: formatNumberForInput(s.fanElectricalPowerKw, locale),
    coolingSeasonHours: formatNumberForInput(s.coolingSeasonHours, locale),
  };
}

function VentilationSection({
  buildingId,
  scenario,
  systems,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  systems: VentilationSystem[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceVentilation(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(systems, scenario, (s) => mapVentilationRow(s, locale)),
    scenario,
  );
  useRegisterDirty("systems.ventilation", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      systems: rows.map((r) => ({
        systemType: (r.systemType || "natural") as VentilationSystemType,
        airChangeRatePerHour: parser.numOrNull(r, "airChangeRatePerHour"),
        freshAirPerPersonM3h: parser.numOrNull(r, "freshAirPerPersonM3h"),
        heatRecoveryEfficiency: parser.numOrNull(r, "heatRecoveryEfficiency"),
        fanElectricalPowerKw: parser.numOrNull(r, "fanElectricalPowerKw"),
        coolingSeasonHours: parser.numOrNull(r, "coolingSeasonHours"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("ventilation.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.ventilationSystems, scenario, (s) => mapVentilationRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("ventilation.title")}
        description={t("ventilation.description")}
        columns={[
          {
            key: "systemType",
            label: t("ventilation.columnType"),
            type: "select",
            options: Object.entries(VENTILATION_SYSTEM_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          {
            key: "airChangeRatePerHour",
            label: t("ventilation.columnAirChangeRate"),
            type: "number",
          },
          {
            key: "freshAirPerPersonM3h",
            label: t("ventilation.columnFreshAirPerPerson"),
            type: "number",
          },
          {
            key: "heatRecoveryEfficiency",
            label: t("ventilation.columnHeatRecoveryEff"),
            type: "number",
          },
          { key: "fanElectricalPowerKw", label: t("ventilation.columnFanPower"), type: "number" },
          {
            key: "coolingSeasonHours",
            label: t("ventilation.columnCoolingSeasonHours"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({ id: newLocalId(), systemType: "natural" })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapDhwRow(s: DhwSource, locale: NumberLocale): Row {
  return {
    id: s.id,
    sourceName: s.sourceName,
    energyCarrier: s.energyCarrier,
    specificConsumptionLPersonDay: formatNumberForInput(s.specificConsumptionLPersonDay, locale),
    personsServed: formatNumberForInput(s.personsServed, locale),
  };
}

function DhwSection({
  buildingId,
  scenario,
  sources,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  sources: DhwSource[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceDhw(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(sources, scenario, (s) => mapDhwRow(s, locale)),
    scenario,
  );
  useRegisterDirty("systems.dhw", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      sources: rows.map((r) => ({
        sourceName: r.sourceName || t("dhw.defaultName"),
        energyCarrier: (r.energyCarrier || "gas") as EnergyCarrier,
        specificConsumptionLPersonDay: parser.num(r, "specificConsumptionLPersonDay"),
        personsServed: parser.num(r, "personsServed", { integer: true }),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("dhw.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.dhwSources, scenario, (s) => mapDhwRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("dhw.title")}
        description={t("dhw.description")}
        columns={[
          { key: "sourceName", label: t("dhw.columnName"), type: "text" },
          {
            key: "energyCarrier",
            label: t("dhw.columnCarrier"),
            type: "select",
            options: ENERGY_CARRIERS.map((c) => ({ value: c, label: ENERGY_CARRIER_LABELS[c] })),
          },
          {
            key: "specificConsumptionLPersonDay",
            label: t("dhw.columnConsumption"),
            type: "number",
          },
          {
            key: "personsServed",
            label: t("dhw.columnPersonsServed"),
            type: "number",
            integer: true,
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          sourceName: "",
          energyCarrier: "gas",
          specificConsumptionLPersonDay: "30",
          personsServed: "0",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapDistributionRow(s: DistributionSystem, locale: NumberLocale): Row {
  return {
    id: s.id,
    systemType: s.systemType,
    pipeDiameterClass: s.pipeDiameterClass,
    lengthM: formatNumberForInput(s.lengthM, locale),
    insulatedFraction: formatNumberForInput(s.insulatedFraction, locale),
    meanFluidTempC: formatNumberForInput(s.meanFluidTempC, locale),
  };
}

function DistributionSection({
  buildingId,
  scenario,
  systems,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  systems: DistributionSystem[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceDistribution(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(systems, scenario, (s) => mapDistributionRow(s, locale)),
    scenario,
  );
  useRegisterDirty("systems.distribution", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      systems: rows.map((r) => ({
        systemType: (r.systemType || "heating") as DistributionSystemType,
        pipeDiameterClass: r.pipeDiameterClass || "32-50",
        lengthM: parser.num(r, "lengthM"),
        insulatedFraction: parser.num(r, "insulatedFraction"),
        meanFluidTempC: parser.num(r, "meanFluidTempC"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("distribution.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.distributionSystems, scenario, (s) => mapDistributionRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("distribution.title")}
        description={t("distribution.description")}
        columns={[
          {
            key: "systemType",
            label: t("distribution.columnServes"),
            type: "select",
            options: Object.entries(DISTRIBUTION_SYSTEM_TYPE_LABELS).map(([value, label]) => ({
              value,
              label,
            })),
          },
          { key: "pipeDiameterClass", label: t("distribution.columnDiameterClass"), type: "text" },
          { key: "lengthM", label: t("distribution.columnLength"), type: "number" },
          {
            key: "insulatedFraction",
            label: t("distribution.columnInsulatedFraction"),
            type: "number",
          },
          { key: "meanFluidTempC", label: t("distribution.columnMeanFluidTemp"), type: "number" },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          systemType: "heating",
          pipeDiameterClass: "32-50",
          lengthM: "0",
          insulatedFraction: "0",
          meanFluidTempC: "70",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapGenerationRow(s: GenerationSource, locale: NumberLocale): Row {
  return {
    id: s.id,
    endUse: s.endUse,
    sourceType: s.sourceType,
    efficiencyOrSeer: formatNumberForInput(s.efficiencyOrSeer, locale),
    shareOfDemand: formatNumberForInput(s.shareOfDemand, locale),
    distributionEfficiency:
      s.distributionEfficiency == null ? "" : formatNumberForInput(s.distributionEfficiency, locale),
  };
}

function GenerationSection({
  buildingId,
  scenario,
  sources,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  sources: GenerationSource[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceGeneration(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(sources, scenario, (s) => mapGenerationRow(s, locale)),
    scenario,
  );
  useRegisterDirty("systems.generation", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      sources: rows.map((r) => ({
        endUse: (r.endUse || "heating") as "heating" | "dhw" | "cooling",
        sourceType: (r.sourceType || "gas_boiler") as GenerationSourceType,
        efficiencyOrSeer: parser.num(r, "efficiencyOrSeer"),
        shareOfDemand: parser.num(r, "shareOfDemand"),
        distributionEfficiency: parser.efficiencyOrNull(r, "distributionEfficiency"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("generation.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.generationSources, scenario, (s) => mapGenerationRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("generation.title")}
        description={t("generation.description")}
        columns={[
          {
            key: "endUse",
            label: t("generation.columnEndUse"),
            type: "select",
            options: END_USES.map((v) => ({ value: v, label: END_USE_LABELS[v] })),
          },
          {
            key: "sourceType",
            label: t("generation.columnSourceType"),
            type: "select",
            options: GENERATION_SOURCE_TYPES.map((v) => ({
              value: v,
              label: GENERATION_SOURCE_TYPE_LABELS[v],
            })),
          },
          { key: "efficiencyOrSeer", label: t("generation.columnEfficiency"), type: "number" },
          { key: "shareOfDemand", label: t("generation.columnShareOfDemand"), type: "number" },
          {
            key: "distributionEfficiency",
            label: t("generation.columnDistributionEfficiency"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          endUse: "heating",
          sourceType: "gas_boiler",
          efficiencyOrSeer: "0.85",
          shareOfDemand: "1",
          distributionEfficiency: "",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapCoolingWindowRow(w: CoolingWindow, locale: NumberLocale): Row {
  return {
    id: w.id,
    orientation: w.orientation,
    areaM2: formatNumberForInput(w.areaM2, locale),
    gValue: formatNumberForInput(w.gValue, locale),
    shadingFactor: formatNumberForInput(w.shadingFactor, locale),
  };
}

function CoolingWindowsSection({
  buildingId,
  scenario,
  windows,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  windows: CoolingWindow[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceCoolingWindows(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(windows, scenario, (w) => mapCoolingWindowRow(w, locale)),
    scenario,
  );
  useRegisterDirty("systems.coolingWindows", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      windows: rows.map((r) => ({
        orientation: (r.orientation || "south") as (typeof ORIENTATIONS)[number],
        areaM2: parser.num(r, "areaM2"),
        gValue: parser.num(r, "gValue"),
        shadingFactor: parser.num(r, "shadingFactor"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("coolingWindows.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.coolingWindows, scenario, (w) => mapCoolingWindowRow(w, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("coolingWindows.title")}
        description={t("coolingWindows.description")}
        columns={[
          {
            key: "orientation",
            label: t("coolingWindows.columnOrientation"),
            type: "select",
            options: ORIENTATIONS.map((v) => ({ value: v, label: ORIENTATION_LABELS[v] })),
          },
          { key: "areaM2", label: t("coolingWindows.columnArea"), type: "number" },
          { key: "gValue", label: t("coolingWindows.columnGValue"), type: "number" },
          { key: "shadingFactor", label: t("coolingWindows.columnShadingFactor"), type: "number" },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          orientation: "south",
          areaM2: "0",
          gValue: "0.75",
          shadingFactor: "1",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapCoolingSystemRow(s: CoolingSystem, locale: NumberLocale): Row {
  return {
    id: s.id,
    description: s.description ?? "",
    seer: formatNumberForInput(s.seer, locale),
    distributionEfficiency: formatNumberForInput(s.distributionEfficiency, locale),
  };
}

function CoolingSystemsSection({
  buildingId,
  scenario,
  systems,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  systems: CoolingSystem[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceCoolingSystems(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(systems, scenario, (s) => mapCoolingSystemRow(s, locale)),
    scenario,
  );
  useRegisterDirty("systems.coolingSystems", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      systems: rows.map((r) => ({
        description: r.description || null,
        seer: parser.num(r, "seer"),
        distributionEfficiency: parser.efficiency(r, "distributionEfficiency"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("coolingSystems.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.coolingSystems, scenario, (s) => mapCoolingSystemRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("coolingSystems.title")}
        description={t("coolingSystems.description")}
        columns={[
          { key: "description", label: t("coolingSystems.columnDescription"), type: "text" },
          { key: "seer", label: t("coolingSystems.columnSeer"), type: "number" },
          {
            key: "distributionEfficiency",
            label: t("coolingSystems.columnDistributionEfficiency"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          description: "",
          seer: "3",
          distributionEfficiency: "1",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapLightingRow(z: LightingZone, locale: NumberLocale): Row {
  return {
    id: z.id,
    name: z.name,
    areaM2: formatNumberForInput(z.areaM2, locale),
    incandescentFraction: formatNumberForInput(z.technologyMix.incandescentFraction, locale),
    fluorescentElectromagneticFraction: formatNumberForInput(
      z.technologyMix.fluorescentElectromagneticFraction,
      locale,
    ),
    fluorescentElectronicFraction: formatNumberForInput(
      z.technologyMix.fluorescentElectronicFraction,
      locale,
    ),
    ledFraction: formatNumberForInput(z.technologyMix.ledFraction, locale),
    utilizationFactor: formatNumberForInput(z.utilizationFactor, locale),
  };
}

function LightingSection({
  buildingId,
  scenario,
  zones,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  zones: LightingZone[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceLighting(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(zones, scenario, (z) => mapLightingRow(z, locale)),
    scenario,
  );
  useRegisterDirty("systems.lighting", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      zones: rows.map((r) => ({
        name: r.name || t("lighting.defaultName"),
        areaM2: parser.num(r, "areaM2"),
        technologyMix: {
          incandescentFraction: parser.num(r, "incandescentFraction"),
          fluorescentElectromagneticFraction: parser.num(r, "fluorescentElectromagneticFraction"),
          fluorescentElectronicFraction: parser.num(r, "fluorescentElectronicFraction"),
          ledFraction: parser.num(r, "ledFraction"),
        },
        utilizationFactor: parser.num(r, "utilizationFactor"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("lighting.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.lightingZones, scenario, (z) => mapLightingRow(z, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("lighting.title")}
        description={t("lighting.description")}
        columns={[
          { key: "name", label: t("lighting.columnZone"), type: "text" },
          { key: "areaM2", label: t("lighting.columnArea"), type: "number" },
          { key: "incandescentFraction", label: t("lighting.columnIncandescent"), type: "number" },
          {
            key: "fluorescentElectromagneticFraction",
            label: t("lighting.columnFluorMagnetic"),
            type: "number",
          },
          {
            key: "fluorescentElectronicFraction",
            label: t("lighting.columnFluorElectronic"),
            type: "number",
          },
          { key: "ledFraction", label: t("lighting.columnLed"), type: "number" },
          {
            key: "utilizationFactor",
            label: t("lighting.columnUtilizationFactor"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          name: "",
          areaM2: "0",
          incandescentFraction: "0",
          fluorescentElectromagneticFraction: "0",
          fluorescentElectronicFraction: "0",
          ledFraction: "1",
          utilizationFactor: "0.4",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapEquipmentRow(i: EquipmentItem, locale: NumberLocale): Row {
  return {
    id: i.id,
    name: i.name,
    category: i.category ?? "",
    unitPowerKw: formatNumberForInput(i.unitPowerKw, locale),
    quantity: formatNumberForInput(i.quantity, locale),
    heatingSeasonHours: formatNumberForInput(i.heatingSeasonHours, locale),
    coolingSeasonHours: formatNumberForInput(i.coolingSeasonHours, locale),
    heatingUtilizationFactor: formatNumberForInput(i.heatingUtilizationFactor, locale),
    coolingUtilizationFactor: formatNumberForInput(i.coolingUtilizationFactor, locale),
  };
}

function EquipmentSection({
  buildingId,
  scenario,
  items,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  scenario: Scenario;
  items: EquipmentItem[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceEquipment(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    toRows(items, scenario, (i) => mapEquipmentRow(i, locale)),
    scenario,
  );
  useRegisterDirty("systems.equipment", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      scenario,
      items: rows.map((r) => ({
        name: r.name || t("equipment.defaultName"),
        category: r.category || null,
        unitPowerKw: parser.num(r, "unitPowerKw"),
        quantity: parser.num(r, "quantity", { integer: true }),
        heatingSeasonHours: parser.num(r, "heatingSeasonHours"),
        coolingSeasonHours: parser.num(r, "coolingSeasonHours"),
        heatingUtilizationFactor: parser.num(r, "heatingUtilizationFactor"),
        coolingUtilizationFactor: parser.num(r, "coolingUtilizationFactor"),
      })),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("equipment.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(toRows(fresh.equipmentItems, scenario, (i) => mapEquipmentRow(i, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("equipment.title")}
        description={t("equipment.description")}
        columns={[
          { key: "name", label: t("equipment.columnName"), type: "text" },
          { key: "category", label: t("equipment.columnCategory"), type: "text" },
          { key: "unitPowerKw", label: t("equipment.columnUnitPower"), type: "number" },
          { key: "quantity", label: t("equipment.columnQuantity"), type: "number", integer: true },
          {
            key: "heatingSeasonHours",
            label: t("equipment.columnHeatingSeasonHours"),
            type: "number",
          },
          {
            key: "coolingSeasonHours",
            label: t("equipment.columnCoolingSeasonHours"),
            type: "number",
          },
          {
            key: "heatingUtilizationFactor",
            label: t("equipment.columnHeatingUtil"),
            type: "number",
          },
          {
            key: "coolingUtilizationFactor",
            label: t("equipment.columnCoolingUtil"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          name: "",
          category: "",
          unitPowerKw: "0.2",
          quantity: "1",
          heatingSeasonHours: "0",
          coolingSeasonHours: "0",
          heatingUtilizationFactor: "1",
          coolingUtilizationFactor: "1",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}

function mapRenewableRow(s: RenewableSystem, locale: NumberLocale): Row {
  return {
    id: s.id,
    systemType: s.systemType,
    capacityKw: formatNumberForInput(s.capacityKw, locale),
    collectorCount: formatNumberForInput(s.collectorCount, locale),
    availableAreaM2: formatNumberForInput(s.availableAreaM2, locale),
    unitCostUsd: formatNumberForInput(s.unitCostUsd, locale),
    annualProductionKwh: formatNumberForInput(
      s.monthlyProduction.reduce((sum, m) => sum + m.productionKwh, 0),
      locale,
    ),
  };
}

function RenewablesSection({
  buildingId,
  systems,
  revision,
  refetchSystems,
  readOnly,
}: {
  buildingId: string;
  systems: RenewableSystem[];
  revision: number;
  refetchSystems: RefetchSystems;
  readOnly: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceRenewables(buildingId);
  const revisionConflict = useRevisionConflict();
  const { t, i18n } = useTranslation("systems");
  const locale = toNumberLocale(i18n.language);
  const [invalidCells, setInvalidCells] = useState<ReadonlySet<string>>(NO_INVALID_CELLS);

  // Rows follow the server only while they are clean, so saving another card never wipes what is typed here.
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    systems.map((s) => mapRenewableRow(s, locale)),
    "all",
  );
  useRegisterDirty("systems.renewables", dirty);

  async function handleSave(expectedRevisionOverride?: number) {
    setError(null);
    const parser = new RowParser(locale);
    const payload = {
      systems: rows.map((r) => {
        const collectorCount = parser.numOrNull(r, "collectorCount", { integer: true });
        // Entered as a single annual total (matching this tab's other
        // fields) rather than a 12-value PVGIS-style table — spread
        // evenly across months for storage. See EditableRowsCard's
        // description text on this section for why.
        const monthlyProductionKwh = Array<number>(12).fill(
          parser.num(r, "annualProductionKwh") / 12,
        );
        return {
          systemType: (r.systemType || "pv") as RenewableSystemType,
          capacityKw: parser.numOrNull(r, "capacityKw"),
          collectorCount,
          availableAreaM2: parser.num(r, "availableAreaM2"),
          unitCostUsd: parser.num(r, "unitCostUsd"),
          monthlyProductionKwh,
        };
      }),
      expectedRevision: expectedRevisionOverride ?? revision,
    };
    if (!parser.ok) {
      setInvalidCells(parser.invalid);
      setError(t("common.invalidNumbers"));
      return;
    }
    setInvalidCells(NO_INVALID_CELLS);
    try {
      await replace.mutateAsync(payload);
      revisionConflict.clear();
      markClean();
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setError(err instanceof ApiError ? err.message : t("renewables.saveError"));
    }
  }

  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const fresh = await refetchSystems();
    if (fresh) {
      setRows(fresh.renewableSystems.map((s) => mapRenewableRow(s, locale)));
      markClean();
    }
  }

  return (
    <>
      <EditableRowsCard
        title={t("renewables.title")}
        description={t("renewables.description")}
        columns={[
          {
            key: "systemType",
            label: t("renewables.columnType"),
            type: "select",
            options: RENEWABLE_SYSTEM_TYPES.map((v) => ({
              value: v,
              label: RENEWABLE_SYSTEM_TYPE_LABELS[v],
            })),
          },
          { key: "capacityKw", label: t("renewables.columnCapacity"), type: "number" },
          {
            key: "collectorCount",
            label: t("renewables.columnCollectors"),
            type: "number",
            integer: true,
          },
          { key: "availableAreaM2", label: t("renewables.columnAvailableArea"), type: "number" },
          { key: "unitCostUsd", label: t("renewables.columnCost"), type: "number" },
          {
            key: "annualProductionKwh",
            label: t("renewables.columnAnnualProduction"),
            type: "number",
          },
        ]}
        rows={rows}
        onRowsChange={setRows}
        onAddRow={() => ({
          id: newLocalId(),
          systemType: "pv",
          capacityKw: "10",
          collectorCount: "",
          availableAreaM2: "100",
          unitCostUsd: "7268",
          annualProductionKwh: "15607",
        })}
        onSave={() => handleSave()}
        saving={replace.isPending}
        error={error}
        invalidCells={invalidCells}
        readOnly={readOnly}
      />
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={replace.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </>
  );
}
