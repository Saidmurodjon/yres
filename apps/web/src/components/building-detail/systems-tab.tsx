import type { Scenario } from "@yres/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
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
  VentilationSystem,
  VentilationSystemType,
} from "../../lib/api-types";
import {
  DISTRIBUTION_SYSTEM_TYPE_LABELS,
  ENERGY_CARRIER_LABELS,
  ENERGY_CARRIERS,
  END_USE_LABELS,
  END_USES,
  GENERATION_SOURCE_TYPE_LABELS,
  GENERATION_SOURCE_TYPES,
  ORIENTATIONS,
  ORIENTATION_LABELS,
  RENEWABLE_SYSTEM_TYPE_LABELS,
  RENEWABLE_SYSTEM_TYPES,
  VENTILATION_SYSTEM_TYPE_LABELS,
} from "../../lib/labels";

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
  step?: string;
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
  readOnly?: boolean;
}) {
  function updateCell(rowId: string, key: string, value: string) {
    onRowsChange(rows.map((r) => (r.id === rowId ? { ...r, [key]: value } : r)));
  }

  function removeRow(rowId: string) {
    onRowsChange(rows.filter((r) => r.id !== rowId));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">None defined for this scenario.</p>
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
                        <Input
                          type={col.type}
                          step={col.step ?? "any"}
                          value={row[col.key] ?? ""}
                          onChange={(e) => updateCell(row.id, col.key, e.target.value)}
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
                        aria-label="Remove row"
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
            Add row
          </Button>
          <Button type="button" size="sm" onClick={onSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
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

function num(row: Row, key: string): number {
  const n = Number.parseFloat(row[key] ?? "");
  return Number.isNaN(n) ? 0 : n;
}

function numOrNull(row: Row, key: string): number | null {
  const raw = (row[key] ?? "").trim();
  if (raw === "") return null;
  const n = Number.parseFloat(raw);
  return Number.isNaN(n) ? null : n;
}

export function SystemsTab({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { data, isLoading, isError, error } = useSystems(buildingId);
  const [scenario, setScenario] = useState<Scenario>("before");

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
          Failed to load systems data: {error instanceof ApiError ? error.message : "Unknown error"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Ventilation, DHW, distribution, generation, and cooling systems that AuditEngine reads to
          compute purchased energy. Configure "before" (baseline) and, once retrofit measures are
          decided, "after" (proposed) — without at least one heating generation source, purchased
          energy will read as zero on the Results page.
        </p>
      </div>

      <Tabs value={scenario} onValueChange={(v) => setScenario(v as Scenario)}>
        <TabsList>
          <TabsTrigger value="before">Before (baseline)</TabsTrigger>
          <TabsTrigger value="after">After (proposed)</TabsTrigger>
        </TabsList>
      </Tabs>

      <VentilationSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.ventilationSystems}
        readOnly={readOnly}
      />
      <DhwSection
        buildingId={buildingId}
        scenario={scenario}
        sources={data.dhwSources}
        readOnly={readOnly}
      />
      <DistributionSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.distributionSystems}
        readOnly={readOnly}
      />
      <GenerationSection
        buildingId={buildingId}
        scenario={scenario}
        sources={data.generationSources}
        readOnly={readOnly}
      />
      <CoolingWindowsSection
        buildingId={buildingId}
        scenario={scenario}
        windows={data.coolingWindows}
        readOnly={readOnly}
      />
      <CoolingSystemsSection
        buildingId={buildingId}
        scenario={scenario}
        systems={data.coolingSystems}
        readOnly={readOnly}
      />
      <LightingSection
        buildingId={buildingId}
        scenario={scenario}
        zones={data.lightingZones}
        readOnly={readOnly}
      />
      <EquipmentSection
        buildingId={buildingId}
        scenario={scenario}
        items={data.equipmentItems}
        readOnly={readOnly}
      />

      <div className="border-t border-border pt-6">
        <p className="mb-4 text-sm text-muted-foreground">
          Renewables (solar PV / solar DHW) aren't tied to a scenario — they represent a proposed
          addition with no "before" state, so this list applies regardless of the tab above.
        </p>
        <RenewablesSection
          buildingId={buildingId}
          systems={data.renewableSystems}
          readOnly={readOnly}
        />
      </div>
    </div>
  );
}

function VentilationSection({
  buildingId,
  scenario,
  systems,
  readOnly,
}: { buildingId: string; scenario: Scenario; systems: VentilationSystem[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceVentilation(buildingId);

  useEffect(() => {
    setRows(
      toRows(systems, scenario, (s) => ({
        id: s.id,
        systemType: s.systemType,
        airChangeRatePerHour: s.airChangeRatePerHour?.toString() ?? "",
        freshAirPerPersonM3h: s.freshAirPerPersonM3h?.toString() ?? "",
        heatRecoveryEfficiency: s.heatRecoveryEfficiency?.toString() ?? "",
        fanElectricalPowerKw: s.fanElectricalPowerKw?.toString() ?? "",
      })),
    );
    setError(null);
  }, [systems, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        systems: rows.map((r) => ({
          systemType: (r.systemType || "natural") as VentilationSystemType,
          airChangeRatePerHour: numOrNull(r, "airChangeRatePerHour"),
          freshAirPerPersonM3h: numOrNull(r, "freshAirPerPersonM3h"),
          heatRecoveryEfficiency: numOrNull(r, "heatRecoveryEfficiency"),
          fanElectricalPowerKw: numOrNull(r, "fanElectricalPowerKw"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save ventilation systems.");
    }
  }

  return (
    <EditableRowsCard
      title="Ventilation"
      description="At most one natural and one mechanical system are used per scenario."
      columns={[
        {
          key: "systemType",
          label: "Type",
          type: "select",
          options: Object.entries(VENTILATION_SYSTEM_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        { key: "airChangeRatePerHour", label: "Air change rate (1/h)", type: "number" },
        { key: "freshAirPerPersonM3h", label: "Fresh air/person (m³/h)", type: "number" },
        { key: "heatRecoveryEfficiency", label: "Heat recovery eff. (0-1)", type: "number" },
        { key: "fanElectricalPowerKw", label: "Fan power (kW)", type: "number" },
      ]}
      rows={rows}
      onRowsChange={setRows}
      onAddRow={() => ({ id: newLocalId(), systemType: "natural" })}
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function DhwSection({
  buildingId,
  scenario,
  sources,
  readOnly,
}: { buildingId: string; scenario: Scenario; sources: DhwSource[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceDhw(buildingId);

  useEffect(() => {
    setRows(
      toRows(sources, scenario, (s) => ({
        id: s.id,
        sourceName: s.sourceName,
        energyCarrier: s.energyCarrier,
        specificConsumptionLPersonDay: s.specificConsumptionLPersonDay.toString(),
        personsServed: s.personsServed.toString(),
      })),
    );
    setError(null);
  }, [sources, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        sources: rows.map((r) => ({
          sourceName: r.sourceName || "DHW source",
          energyCarrier: (r.energyCarrier || "gas") as EnergyCarrier,
          specificConsumptionLPersonDay: num(r, "specificConsumptionLPersonDay"),
          personsServed: Math.round(num(r, "personsServed")),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save DHW sources.");
    }
  }

  return (
    <EditableRowsCard
      title="Domestic hot water (DHW)"
      description="Sources feeding the building's hot water demand."
      columns={[
        { key: "sourceName", label: "Name", type: "text" },
        {
          key: "energyCarrier",
          label: "Carrier",
          type: "select",
          options: ENERGY_CARRIERS.map((c) => ({ value: c, label: ENERGY_CARRIER_LABELS[c] })),
        },
        { key: "specificConsumptionLPersonDay", label: "L/person/day", type: "number" },
        { key: "personsServed", label: "Persons served", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function DistributionSection({
  buildingId,
  scenario,
  systems,
  readOnly,
}: { buildingId: string; scenario: Scenario; systems: DistributionSystem[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceDistribution(buildingId);

  useEffect(() => {
    setRows(
      toRows(systems, scenario, (s) => ({
        id: s.id,
        systemType: s.systemType,
        pipeDiameterClass: s.pipeDiameterClass,
        lengthM: s.lengthM.toString(),
        insulatedFraction: s.insulatedFraction.toString(),
        meanFluidTempC: s.meanFluidTempC.toString(),
      })),
    );
    setError(null);
  }, [systems, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        systems: rows.map((r) => ({
          systemType: (r.systemType || "heating") as DistributionSystemType,
          pipeDiameterClass: r.pipeDiameterClass || "32-50",
          lengthM: num(r, "lengthM"),
          insulatedFraction: num(r, "insulatedFraction"),
          meanFluidTempC: num(r, "meanFluidTempC"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save distribution systems.");
    }
  }

  return (
    <EditableRowsCard
      title="Distribution (pipework)"
      description="Heating and DHW pipe runs, used to compute distribution losses. Diameter class must match a seeded pipe-loss reference (e.g. 15-25, 32-50, 65-100)."
      columns={[
        {
          key: "systemType",
          label: "Serves",
          type: "select",
          options: Object.entries(DISTRIBUTION_SYSTEM_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          })),
        },
        { key: "pipeDiameterClass", label: "Diameter class", type: "text" },
        { key: "lengthM", label: "Length (m)", type: "number" },
        { key: "insulatedFraction", label: "Insulated fraction (0-1)", type: "number" },
        { key: "meanFluidTempC", label: "Mean fluid temp (°C)", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function GenerationSection({
  buildingId,
  scenario,
  sources,
  readOnly,
}: { buildingId: string; scenario: Scenario; sources: GenerationSource[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceGeneration(buildingId);

  useEffect(() => {
    setRows(
      toRows(sources, scenario, (s) => ({
        id: s.id,
        endUse: s.endUse,
        sourceType: s.sourceType,
        efficiencyOrSeer: s.efficiencyOrSeer.toString(),
        shareOfDemand: s.shareOfDemand.toString(),
      })),
    );
    setError(null);
  }, [sources, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        sources: rows.map((r) => ({
          endUse: (r.endUse || "heating") as "heating" | "dhw" | "cooling",
          sourceType: (r.sourceType || "gas_boiler") as GenerationSourceType,
          efficiencyOrSeer: num(r, "efficiencyOrSeer"),
          shareOfDemand: num(r, "shareOfDemand"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save generation sources.");
    }
  }

  return (
    <EditableRowsCard
      title="Generation sources"
      description="What converts distributed heating/DHW need into purchased final energy — without at least one 'heating' row here, the Results page's purchased-energy KPIs stay at zero. Cooling's electricity is computed directly from the cooling system's SEER below, so cooling-endUse rows here are ignored by the engine."
      columns={[
        {
          key: "endUse",
          label: "End use",
          type: "select",
          options: END_USES.map((v) => ({ value: v, label: END_USE_LABELS[v] })),
        },
        {
          key: "sourceType",
          label: "Source type",
          type: "select",
          options: GENERATION_SOURCE_TYPES.map((v) => ({
            value: v,
            label: GENERATION_SOURCE_TYPE_LABELS[v],
          })),
        },
        { key: "efficiencyOrSeer", label: "Efficiency (0-1) or SEER", type: "number" },
        { key: "shareOfDemand", label: "Share of demand (0-1)", type: "number" },
      ]}
      rows={rows}
      onRowsChange={setRows}
      onAddRow={() => ({
        id: newLocalId(),
        endUse: "heating",
        sourceType: "gas_boiler",
        efficiencyOrSeer: "0.85",
        shareOfDemand: "1",
      })}
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function CoolingWindowsSection({
  buildingId,
  scenario,
  windows,
  readOnly,
}: { buildingId: string; scenario: Scenario; windows: CoolingWindow[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceCoolingWindows(buildingId);

  useEffect(() => {
    setRows(
      toRows(windows, scenario, (w) => ({
        id: w.id,
        orientation: w.orientation,
        areaM2: w.areaM2.toString(),
        gValue: w.gValue.toString(),
        shadingFactor: w.shadingFactor.toString(),
      })),
    );
    setError(null);
  }, [windows, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        windows: rows.map((r) => ({
          orientation: (r.orientation || "south") as (typeof ORIENTATIONS)[number],
          areaM2: num(r, "areaM2"),
          gValue: num(r, "gValue"),
          shadingFactor: num(r, "shadingFactor"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save cooling windows.");
    }
  }

  return (
    <EditableRowsCard
      title="Cooling — solar-gain windows"
      description="Windows contributing solar gains to the cooling-season load, by orientation."
      columns={[
        {
          key: "orientation",
          label: "Orientation",
          type: "select",
          options: ORIENTATIONS.map((v) => ({ value: v, label: ORIENTATION_LABELS[v] })),
        },
        { key: "areaM2", label: "Area (m²)", type: "number" },
        { key: "gValue", label: "g-value (0-1)", type: "number" },
        { key: "shadingFactor", label: "Shading factor (0-1)", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function CoolingSystemsSection({
  buildingId,
  scenario,
  systems,
  readOnly,
}: { buildingId: string; scenario: Scenario; systems: CoolingSystem[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceCoolingSystems(buildingId);

  useEffect(() => {
    setRows(
      toRows(systems, scenario, (s) => ({
        id: s.id,
        description: s.description ?? "",
        seer: s.seer.toString(),
      })),
    );
    setError(null);
  }, [systems, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        systems: rows.map((r) => ({
          description: r.description || null,
          seer: num(r, "seer"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save cooling systems.");
    }
  }

  return (
    <EditableRowsCard
      title="Cooling systems"
      description="AC/chiller equipment; only the first row per scenario is used to convert cooling load into electrical energy via its SEER."
      columns={[
        { key: "description", label: "Description", type: "text" },
        { key: "seer", label: "SEER", type: "number" },
      ]}
      rows={rows}
      onRowsChange={setRows}
      onAddRow={() => ({ id: newLocalId(), description: "", seer: "3" })}
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function LightingSection({
  buildingId,
  scenario,
  zones,
  readOnly,
}: { buildingId: string; scenario: Scenario; zones: LightingZone[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceLighting(buildingId);

  useEffect(() => {
    setRows(
      toRows(zones, scenario, (z) => ({
        id: z.id,
        name: z.name,
        areaM2: z.areaM2.toString(),
        incandescentFraction: z.technologyMix.incandescentFraction.toString(),
        fluorescentElectromagneticFraction:
          z.technologyMix.fluorescentElectromagneticFraction.toString(),
        fluorescentElectronicFraction: z.technologyMix.fluorescentElectronicFraction.toString(),
        ledFraction: z.technologyMix.ledFraction.toString(),
        utilizationFactor: z.utilizationFactor.toString(),
      })),
    );
    setError(null);
  }, [zones, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        zones: rows.map((r) => ({
          name: r.name || "Zone",
          areaM2: num(r, "areaM2"),
          technologyMix: {
            incandescentFraction: num(r, "incandescentFraction"),
            fluorescentElectromagneticFraction: num(r, "fluorescentElectromagneticFraction"),
            fluorescentElectronicFraction: num(r, "fluorescentElectronicFraction"),
            ledFraction: num(r, "ledFraction"),
          },
          utilizationFactor: num(r, "utilizationFactor"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save lighting zones.");
    }
  }

  return (
    <EditableRowsCard
      title="Lighting"
      description="Technology-mix fractions should sum to ~1 per zone. Utilization factor reflects control strategy (e.g. 0.3 always-on, 0.55 with presence/daylight sensors)."
      columns={[
        { key: "name", label: "Zone", type: "text" },
        { key: "areaM2", label: "Area (m²)", type: "number" },
        { key: "incandescentFraction", label: "Incandescent (0-1)", type: "number" },
        {
          key: "fluorescentElectromagneticFraction",
          label: "Fluor. magnetic (0-1)",
          type: "number",
        },
        { key: "fluorescentElectronicFraction", label: "Fluor. electronic (0-1)", type: "number" },
        { key: "ledFraction", label: "LED (0-1)", type: "number" },
        { key: "utilizationFactor", label: "Utilization factor (0-1)", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function EquipmentSection({
  buildingId,
  scenario,
  items,
  readOnly,
}: { buildingId: string; scenario: Scenario; items: EquipmentItem[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceEquipment(buildingId);

  useEffect(() => {
    setRows(
      toRows(items, scenario, (i) => ({
        id: i.id,
        name: i.name,
        category: i.category ?? "",
        unitPowerKw: i.unitPowerKw.toString(),
        quantity: i.quantity.toString(),
        heatingSeasonHours: i.heatingSeasonHours.toString(),
        coolingSeasonHours: i.coolingSeasonHours.toString(),
        heatingUtilizationFactor: i.heatingUtilizationFactor.toString(),
        coolingUtilizationFactor: i.coolingUtilizationFactor.toString(),
      })),
    );
    setError(null);
  }, [items, scenario]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        scenario,
        items: rows.map((r) => ({
          name: r.name || "Equipment",
          category: r.category || null,
          unitPowerKw: num(r, "unitPowerKw"),
          quantity: Math.round(num(r, "quantity")),
          heatingSeasonHours: num(r, "heatingSeasonHours"),
          coolingSeasonHours: num(r, "coolingSeasonHours"),
          heatingUtilizationFactor: num(r, "heatingUtilizationFactor"),
          coolingUtilizationFactor: num(r, "coolingUtilizationFactor"),
        })),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save equipment items.");
    }
  }

  return (
    <EditableRowsCard
      title="Equipment"
      description="Electrical appliances/devices. Cooling-season consumption also feeds the cooling load below as an internal heat gain."
      columns={[
        { key: "name", label: "Name", type: "text" },
        { key: "category", label: "Category", type: "text" },
        { key: "unitPowerKw", label: "Unit power (kW)", type: "number" },
        { key: "quantity", label: "Qty", type: "number" },
        { key: "heatingSeasonHours", label: "Heating-season hours", type: "number" },
        { key: "coolingSeasonHours", label: "Cooling-season hours", type: "number" },
        { key: "heatingUtilizationFactor", label: "Heating util. (0-1)", type: "number" },
        { key: "coolingUtilizationFactor", label: "Cooling util. (0-1)", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}

function RenewablesSection({
  buildingId,
  systems,
  readOnly,
}: { buildingId: string; systems: RenewableSystem[]; readOnly: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const replace = useReplaceRenewables(buildingId);

  useEffect(() => {
    setRows(
      systems.map((s) => ({
        id: s.id,
        systemType: s.systemType,
        capacityKw: s.capacityKw?.toString() ?? "",
        collectorCount: s.collectorCount?.toString() ?? "",
        availableAreaM2: s.availableAreaM2.toString(),
        unitCostUsd: s.unitCostUsd.toString(),
        annualProductionKwh: s.monthlyProduction
          .reduce((sum, m) => sum + m.productionKwh, 0)
          .toString(),
      })),
    );
    setError(null);
  }, [systems]);

  async function handleSave() {
    setError(null);
    try {
      await replace.mutateAsync({
        systems: rows.map((r) => {
          const collectorCount = numOrNull(r, "collectorCount");
          // Entered as a single annual total (matching this tab's other
          // fields) rather than a 12-value PVGIS-style table — spread
          // evenly across months for storage. See EditableRowsCard's
          // description text on this section for why.
          const monthlyProductionKwh = Array<number>(12).fill(num(r, "annualProductionKwh") / 12);
          return {
            systemType: (r.systemType || "pv") as RenewableSystemType,
            capacityKw: numOrNull(r, "capacityKw"),
            collectorCount: collectorCount !== null ? Math.round(collectorCount) : null,
            availableAreaM2: num(r, "availableAreaM2"),
            unitCostUsd: num(r, "unitCostUsd"),
            monthlyProductionKwh,
          };
        }),
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save renewable systems.");
    }
  }

  return (
    <EditableRowsCard
      title="Renewables — solar PV & solar DHW"
      description="Production is entered as an annual total (spread evenly across months for storage) rather than a month-by-month PVGIS table. It displaces purchased electricity (PV) or DHW energy (Solar DHW) — see the Results page's 'Potential energy use' KPI."
      columns={[
        {
          key: "systemType",
          label: "Type",
          type: "select",
          options: RENEWABLE_SYSTEM_TYPES.map((v) => ({
            value: v,
            label: RENEWABLE_SYSTEM_TYPE_LABELS[v],
          })),
        },
        { key: "capacityKw", label: "Capacity (kW, PV)", type: "number" },
        { key: "collectorCount", label: "Collectors (Solar DHW)", type: "number" },
        { key: "availableAreaM2", label: "Available roof area (m²)", type: "number" },
        { key: "unitCostUsd", label: "Cost (USD)", type: "number" },
        { key: "annualProductionKwh", label: "Annual production (kWh/y)", type: "number" },
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
      onSave={handleSave}
      saving={replace.isPending}
      error={error}
      readOnly={readOnly}
    />
  );
}
