import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
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
} from "@yres/ui";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useBuilding,
  useCreateConsumption,
  useEnvelope,
  useMaterials,
  useReplaceEnvelope,
  useRunAudit,
} from "../../../../hooks";
import { ApiError } from "../../../../lib/api";
import type { ReplaceEnvelopePayload } from "../../../../lib/api-types";
import { ENERGY_CARRIERS, ENERGY_CARRIER_LABELS, formatNumber } from "../../../../lib/labels";

export const Route = createFileRoute("/_authenticated/buildings/$buildingId/audit")({
  component: AuditWizardPage,
});

type WizardStep = "envelope" | "consumption" | "run";
const STEP_IDS: WizardStep[] = ["envelope", "consumption", "run"];

function AuditWizardPage() {
  const { t } = useTranslation("audit");
  const { buildingId } = Route.useParams();
  const navigate = useNavigate();
  const { data: buildingData, isLoading: buildingLoading } = useBuilding(buildingId);
  const { data: envelopeData, isLoading: envelopeLoading } = useEnvelope(buildingId);

  const [step, setStep] = useState<WizardStep>("envelope");

  const hasEnvelope = (envelopeData?.envelopeElements.length ?? 0) > 0;

  const STEPS: { id: WizardStep; label: string }[] = STEP_IDS.map((id) => ({
    id,
    label: t(`wizard.steps.${id}`),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buildings/$buildingId" params={{ buildingId }}>
            <ArrowLeft className="h-4 w-4" />
            {t("wizard.backTo", {
              name: buildingLoading
                ? t("wizard.genericBuilding")
                : (buildingData?.building.name ?? t("wizard.genericBuilding")),
            })}
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("wizard.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("wizard.subtitle")}</p>
      </div>

      <ol className="flex items-center gap-2 text-sm">
        {STEPS.map((s, i) => (
          <li key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep(s.id)}
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
                step === s.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground"
              }`}
            >
              {i + 1}
            </button>
            <span className={step === s.id ? "font-medium" : "text-muted-foreground"}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
          </li>
        ))}
      </ol>

      {envelopeLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : step === "envelope" ? (
        <EnvelopeStep
          buildingId={buildingId}
          hasEnvelope={hasEnvelope}
          onDone={() => setStep("consumption")}
        />
      ) : step === "consumption" ? (
        <ConsumptionStep
          buildingId={buildingId}
          onDone={() => setStep("run")}
          onBack={() => setStep("envelope")}
        />
      ) : (
        <RunStep
          buildingId={buildingId}
          onBack={() => setStep("consumption")}
          onComplete={() =>
            navigate({ to: "/buildings/$buildingId/results", params: { buildingId } })
          }
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: quick envelope setup
// ---------------------------------------------------------------------------

interface QuickEnvelopeValues {
  footprintLengthM: string;
  footprintWidthM: string;
  numberOfFloors: string;
  floorToFloorHeightM: string;
  wallAreaM2: string;
  wallMaterialId: string;
  wallThicknessM: string;
  roofAreaM2: string;
  roofMaterialId: string;
  roofThicknessM: string;
  floorAreaM2: string;
  floorMaterialId: string;
  floorThicknessM: string;
  windowCount: string;
  windowWidthM: string;
  windowHeightM: string;
  windowUValue: string;
}

const DEFAULT_QUICK_ENVELOPE: QuickEnvelopeValues = {
  footprintLengthM: "30",
  footprintWidthM: "15",
  numberOfFloors: "3",
  floorToFloorHeightM: "3.3",
  wallAreaM2: "800",
  wallMaterialId: "",
  wallThicknessM: "0.38",
  roofAreaM2: "450",
  roofMaterialId: "",
  roofThicknessM: "0.1",
  floorAreaM2: "450",
  floorMaterialId: "",
  floorThicknessM: "0.1",
  windowCount: "40",
  windowWidthM: "1.5",
  windowHeightM: "1.5",
  windowUValue: "2.6",
};

function buildQuickEnvelopePayload(v: QuickEnvelopeValues): ReplaceEnvelopePayload {
  const num = (s: string) => Number.parseFloat(s) || 0;
  const footprintLengthM = num(v.footprintLengthM);
  const footprintWidthM = num(v.footprintWidthM);
  const windowAreaM2 = num(v.windowWidthM) * num(v.windowHeightM) * num(v.windowCount);

  const constructionTypes: ReplaceEnvelopePayload["constructionTypes"] = [];
  const envelopeElements: ReplaceEnvelopePayload["envelopeElements"] = [];
  const openingTypes: ReplaceEnvelopePayload["openingTypes"] = [];

  const wallAreaM2 = num(v.wallAreaM2);
  if (wallAreaM2 > 0 && v.wallMaterialId) {
    constructionTypes.push({
      code: "wall",
      elementCategory: "external_wall",
      layers: [{ layerOrder: 1, materialId: v.wallMaterialId, thicknessM: num(v.wallThicknessM) }],
    });
    const windowCount = Math.round(num(v.windowCount));
    if (windowCount > 0) {
      openingTypes.push({
        code: "window",
        category: "window",
        uValueWm2k: num(v.windowUValue),
        widthM: num(v.windowWidthM),
        heightM: num(v.windowHeightM),
        gValue: 0.75,
        frameFactor: 0.6,
        shadingFactor: 1,
      });
    }
    envelopeElements.push({
      blockName: "Main block",
      orientation: "south",
      constructionTypeCode: "wall",
      // gross area = requested net wall area + window area, since the
      // backend subtracts opening area from gross to get net area.
      lengthM: wallAreaM2 + windowAreaM2,
      heightEnvContactM: 1,
      openings: windowCount > 0 ? [{ openingTypeCode: "window", count: windowCount }] : [],
    });
  }

  const roofAreaM2 = num(v.roofAreaM2);
  if (roofAreaM2 > 0 && v.roofMaterialId) {
    constructionTypes.push({
      code: "roof",
      elementCategory: "roof",
      layers: [{ layerOrder: 1, materialId: v.roofMaterialId, thicknessM: num(v.roofThicknessM) }],
    });
    envelopeElements.push({
      blockName: "Main block",
      orientation: "horizontal",
      constructionTypeCode: "roof",
      lengthM: roofAreaM2,
      heightEnvContactM: 1,
      openings: [],
    });
  }

  const floorAreaM2 = num(v.floorAreaM2);
  if (floorAreaM2 > 0 && v.floorMaterialId) {
    constructionTypes.push({
      code: "floor",
      elementCategory: "floor",
      layers: [
        { layerOrder: 1, materialId: v.floorMaterialId, thicknessM: num(v.floorThicknessM) },
      ],
    });
    envelopeElements.push({
      blockName: "Main block",
      orientation: "horizontal",
      constructionTypeCode: "floor",
      lengthM: floorAreaM2,
      heightEnvContactM: 1,
      openings: [],
    });
  }

  return {
    scenario: "before",
    buildingBlocks: [
      {
        name: "Main block",
        footprintLengthM,
        footprintWidthM,
        numberOfFloors: Math.round(num(v.numberOfFloors)) || 1,
        floorToFloorHeightM: num(v.floorToFloorHeightM),
        perimeterM: 2 * (footprintLengthM + footprintWidthM),
        perimeterLossCoefficient: 0.4,
      },
    ],
    constructionTypes,
    openingTypes,
    envelopeElements,
  };
}

function EnvelopeStep({
  buildingId,
  hasEnvelope,
  onDone,
}: {
  buildingId: string;
  hasEnvelope: boolean;
  onDone: () => void;
}) {
  const { t } = useTranslation("audit");
  const { data: materialsData, isLoading: materialsLoading } = useMaterials();
  const replaceEnvelope = useReplaceEnvelope(buildingId);
  const [values, setValues] = useState(DEFAULT_QUICK_ENVELOPE);
  const [error, setError] = useState<string | null>(null);
  const materials = materialsData?.materials ?? [];

  function set<K extends keyof QuickEnvelopeValues>(key: K, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      await replaceEnvelope.mutateAsync(buildQuickEnvelopePayload(values));
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("wizard.envelope.saveFailed"));
    }
  }

  if (materialsLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("wizard.envelope.noMaterialsTitle")}</CardTitle>
          <CardDescription>{t("wizard.envelope.noMaterialsDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onDone}>{t("wizard.envelope.skipSetup")}</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {hasEnvelope && (
        <div className="rounded-md border border-warning/50 bg-warning/10 p-3 text-sm text-warning-foreground">
          {t("wizard.envelope.replaceWarning")}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("wizard.envelope.footprintTitle")}</CardTitle>
          <CardDescription>{t("wizard.envelope.footprintDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label={t("wizard.envelope.footprintLength")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.footprintLengthM}
              onChange={(e) => set("footprintLengthM", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.footprintWidth")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.footprintWidthM}
              onChange={(e) => set("footprintWidthM", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.numberOfFloors")}>
            <Input
              type="number"
              min={1}
              step="1"
              value={values.numberOfFloors}
              onChange={(e) => set("numberOfFloors", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.floorToFloorHeight")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.floorToFloorHeightM}
              onChange={(e) => set("floorToFloorHeightM", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      <QuickCategoryCard
        title={t("wizard.envelope.externalWalls")}
        areaLabel={t("wizard.envelope.netWallArea")}
        areaValue={values.wallAreaM2}
        onAreaChange={(v) => set("wallAreaM2", v)}
        materialId={values.wallMaterialId}
        onMaterialChange={(v) => set("wallMaterialId", v)}
        thicknessValue={values.wallThicknessM}
        onThicknessChange={(v) => set("wallThicknessM", v)}
        materials={materials}
      />

      <QuickCategoryCard
        title={t("wizard.envelope.roof")}
        areaLabel={t("wizard.envelope.roofArea")}
        areaValue={values.roofAreaM2}
        onAreaChange={(v) => set("roofAreaM2", v)}
        materialId={values.roofMaterialId}
        onMaterialChange={(v) => set("roofMaterialId", v)}
        thicknessValue={values.roofThicknessM}
        onThicknessChange={(v) => set("roofThicknessM", v)}
        materials={materials}
      />

      <QuickCategoryCard
        title={t("wizard.envelope.groundFloor")}
        areaLabel={t("wizard.envelope.floorArea")}
        areaValue={values.floorAreaM2}
        onAreaChange={(v) => set("floorAreaM2", v)}
        materialId={values.floorMaterialId}
        onMaterialChange={(v) => set("floorMaterialId", v)}
        thicknessValue={values.floorThicknessM}
        onThicknessChange={(v) => set("floorThicknessM", v)}
        materials={materials}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t("wizard.envelope.windowsTitle")}</CardTitle>
          <CardDescription>{t("wizard.envelope.windowsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <Field label={t("wizard.envelope.count")}>
            <Input
              type="number"
              min={0}
              step="1"
              value={values.windowCount}
              onChange={(e) => set("windowCount", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.width")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.windowWidthM}
              onChange={(e) => set("windowWidthM", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.height")}>
            <Input
              type="number"
              min={0}
              step="0.1"
              value={values.windowHeightM}
              onChange={(e) => set("windowHeightM", e.target.value)}
            />
          </Field>
          <Field label={t("wizard.envelope.uValue")}>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={values.windowUValue}
              onChange={(e) => set("windowUValue", e.target.value)}
            />
          </Field>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={replaceEnvelope.isPending}>
          {replaceEnvelope.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("common:saving")}
            </>
          ) : (
            <>
              {t("wizard.envelope.saveAndContinue")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function QuickCategoryCard({
  title,
  areaLabel,
  areaValue,
  onAreaChange,
  materialId,
  onMaterialChange,
  thicknessValue,
  onThicknessChange,
  materials,
}: {
  title: string;
  areaLabel: string;
  areaValue: string;
  onAreaChange: (v: string) => void;
  materialId: string;
  onMaterialChange: (v: string) => void;
  thicknessValue: string;
  onThicknessChange: (v: string) => void;
  materials: { id: string; name: string; thermalConductivityWPerMk: number }[];
}) {
  const { t } = useTranslation("audit");
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <Field label={areaLabel} className="sm:col-span-1">
          <Input
            type="number"
            min={0}
            step="0.1"
            value={areaValue}
            onChange={(e) => onAreaChange(e.target.value)}
          />
        </Field>
        <Field label={t("wizard.envelope.material")}>
          <Select value={materialId} onValueChange={onMaterialChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("wizard.envelope.selectMaterial")} />
            </SelectTrigger>
            <SelectContent>
              {materials.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name} (λ={m.thermalConductivityWPerMk})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label={t("wizard.envelope.thickness")}>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={thicknessValue}
            onChange={(e) => onThicknessChange(e.target.value)}
          />
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  className,
  children,
}: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: consumption (optional)
// ---------------------------------------------------------------------------

function ConsumptionStep({
  buildingId,
  onDone,
  onBack,
}: {
  buildingId: string;
  onDone: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation("audit");
  const createConsumption = useCreateConsumption(buildingId);
  const currentYear = new Date().getFullYear();
  const [carrier, setCarrier] = useState<(typeof ENERGY_CARRIERS)[number]>("gas");
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState("1");
  const [consumption, setConsumption] = useState("");
  const [added, setAdded] = useState<
    { carrier: string; year: number; month: number; value: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  function addRow() {
    const value = Number.parseFloat(consumption);
    if (!value || value <= 0) {
      setError(t("wizard.consumption.positiveValueRequired"));
      return;
    }
    setAdded((prev) => [...prev, { carrier, year: Number(year), month: Number(month), value }]);
    setConsumption("");
    setError(null);
  }

  async function handleSaveAndContinue() {
    if (added.length === 0) {
      onDone();
      return;
    }
    try {
      await createConsumption.mutateAsync(
        added.map((row) => ({
          energyCarrier: row.carrier as (typeof ENERGY_CARRIERS)[number],
          year: row.year,
          month: row.month,
          consumptionNative: row.value,
        })),
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("wizard.consumption.saveFailed"));
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("wizard.consumption.title")}</CardTitle>
          <CardDescription>{t("wizard.consumption.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label={t("wizard.consumption.energyCarrier")}>
              <Select value={carrier} onValueChange={(v) => setCarrier(v as typeof carrier)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENERGY_CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {ENERGY_CARRIER_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label={t("wizard.consumption.year")}>
              <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} />
            </Field>
            <Field label={t("wizard.consumption.month")}>
              <Input
                type="number"
                min={1}
                max={12}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </Field>
            <Field label={t("wizard.consumption.consumptionAmount")}>
              <Input
                type="number"
                min={0}
                value={consumption}
                onChange={(e) => setConsumption(e.target.value)}
              />
            </Field>
          </div>
          <Button type="button" variant="outline" onClick={addRow}>
            {t("wizard.consumption.addBill")}
          </Button>

          {added.length > 0 && (
            <ul className="divide-y divide-border rounded-md border border-border">
              {added.map((row, i) => (
                <li
                  key={`${row.carrier}-${row.year}-${row.month}-${i}`}
                  className="flex items-center justify-between px-4 py-2 text-sm"
                >
                  <span>
                    {ENERGY_CARRIER_LABELS[row.carrier as (typeof ENERGY_CARRIERS)[number]]} —{" "}
                    {row.month}/{row.year}
                  </span>
                  <span className="font-medium">{formatNumber(row.value)}</span>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t("wizard.consumption.back")}
        </Button>
        <Button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={createConsumption.isPending}
        >
          {createConsumption.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("common:saving")}
            </>
          ) : added.length === 0 ? (
            <>
              {t("wizard.consumption.skip")} <ArrowRight className="h-4 w-4" />
            </>
          ) : (
            <>
              {t("wizard.consumption.saveAndContinue")} <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: run
// ---------------------------------------------------------------------------

function RunStep({
  buildingId,
  onBack,
  onComplete,
}: {
  buildingId: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const { t } = useTranslation("audit");
  const runAudit = useRunAudit(buildingId);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setError(null);
    try {
      const response = await runAudit.mutateAsync();
      if (response.error) {
        setError(response.error);
        return;
      }
      onComplete();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("wizard.run.runFailed"));
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("wizard.run.title")}</CardTitle>
        <CardDescription>{t("wizard.run.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4" />
          {t("wizard.run.readyNote")}
        </div>
        {error && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </CardContent>
      <CardContent className="flex justify-between pt-0">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" /> {t("wizard.run.back")}
        </Button>
        <Button type="button" onClick={handleRun} disabled={runAudit.isPending}>
          {runAudit.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> {t("wizard.run.running")}
            </>
          ) : (
            t("wizard.run.runAudit")
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
