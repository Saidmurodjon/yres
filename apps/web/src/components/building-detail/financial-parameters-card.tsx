import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Skeleton,
} from "@yres/ui";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFinancialParameters, useSaveFinancialParameters } from "../../hooks";
import { useRevisionConflict } from "../../hooks/use-revision-conflict";
import { useSyncedRows } from "../../hooks/use-synced-rows";
import { ApiError } from "../../lib/api";
import type { FinancialParameters } from "../../lib/api-types";
import {
  type NumberLocale,
  formatNumberForInput,
  parseLocaleNumber,
  toNumberLocale,
} from "../../lib/number";
import { fractionToPercentText, parsePercentAsFraction } from "../../lib/percent";
import { NumberInput } from "../number-input";
import { RevisionConflictDialog } from "../revision-conflict-dialog";
import { useRegisterDirty } from "../unsaved-changes";

type NumberKey =
  | "baseYear"
  | "periodYears"
  | "inflationRate"
  | "realDiscountRate"
  | "realEscalationGas"
  | "realEscalationElectricity"
  | "realEscalationHeat"
  | "exchangeRateUzsPerUsd"
  | "gasTariffUzsPerM3"
  | "gasNcvKwhPerM3"
  | "electricityTariffUzsPerKwh"
  | "heatTariffUzsPerGcal"
  | "coalPriceUzsPerT"
  | "coalNcvKwhPerKg"
  | "pvExportTariffUzsPerKwh"
  | "irrInitialGuess";

interface FieldSpec {
  key: NumberKey;
  kind: "integer" | "percent" | "number";
  /** Empty means `null` (only where the backend schema is `.nullable()`); otherwise empty is an error. */
  nullable?: boolean;
  /** Bounds as the user sees them (percent fields in %), mirroring `schemas/financial.ts`. */
  min: number;
  max: number;
  exclusiveMin?: boolean;
  unit?: string;
}

const TARIFF_MAX = 1e9;

const GROUPS: { id: "period" | "rates" | "tariffs"; fields: FieldSpec[] }[] = [
  {
    id: "period",
    fields: [
      { key: "baseYear", kind: "integer", min: 2000, max: 2100 },
      { key: "periodYears", kind: "integer", min: 1, max: 50 },
    ],
  },
  {
    id: "rates",
    fields: [
      { key: "inflationRate", kind: "percent", min: -50, max: 100, unit: "%" },
      { key: "realDiscountRate", kind: "percent", min: -50, max: 100, unit: "%" },
      { key: "realEscalationGas", kind: "percent", min: -50, max: 100, unit: "%" },
      { key: "realEscalationElectricity", kind: "percent", min: -50, max: 100, unit: "%" },
      { key: "realEscalationHeat", kind: "percent", min: -50, max: 100, unit: "%" },
      { key: "irrInitialGuess", kind: "percent", min: -50, max: 100, unit: "%" },
    ],
  },
  {
    id: "tariffs",
    fields: [
      {
        key: "exchangeRateUzsPerUsd",
        kind: "number",
        min: 0,
        max: 1e6,
        exclusiveMin: true,
        unit: "UZS/USD",
      },
      { key: "gasTariffUzsPerM3", kind: "number", min: 0, max: TARIFF_MAX },
      { key: "gasNcvKwhPerM3", kind: "number", min: 0, max: 100, exclusiveMin: true },
      { key: "electricityTariffUzsPerKwh", kind: "number", min: 0, max: TARIFF_MAX },
      { key: "heatTariffUzsPerGcal", kind: "number", min: 0, max: TARIFF_MAX },
      { key: "coalPriceUzsPerT", kind: "number", nullable: true, min: 0, max: TARIFF_MAX },
      {
        key: "coalNcvKwhPerKg",
        kind: "number",
        nullable: true,
        min: 0,
        max: 100,
        exclusiveMin: true,
      },
      { key: "pvExportTariffUzsPerKwh", kind: "number", min: 0, max: TARIFF_MAX },
    ],
  },
];

const FIELDS = GROUPS.flatMap((group) => group.fields);

type Row = Record<NumberKey, string> & {
  pvExportEnabled: boolean;
  tariffSource: string;
  tariffEffectiveDate: string;
};

function toRow(p: FinancialParameters, locale: NumberLocale): Row {
  const row = {
    pvExportEnabled: p.pvExportEnabled,
    tariffSource: p.tariffSource ?? "",
    tariffEffectiveDate: p.tariffEffectiveDate ?? "",
  } as Row;
  for (const field of FIELDS) {
    const value = p[field.key];
    row[field.key] =
      field.kind === "percent"
        ? fractionToPercentText(value, locale)
        : formatNumberForInput(value, locale);
  }
  return row;
}

/** Parses the form into the PUT body; `errors` names every invalid field (never a silent default). */
function toPayload(
  row: Row,
  locale: NumberLocale,
): { payload: FinancialParameters | null; errors: Set<NumberKey>; dateInvalid: boolean } {
  const errors = new Set<NumberKey>();
  const values: Partial<Record<NumberKey, number | null>> = {};
  for (const field of FIELDS) {
    const raw = row[field.key];
    if (raw.trim() === "") {
      if (field.nullable) values[field.key] = null;
      else errors.add(field.key);
      continue;
    }
    const parsed =
      field.kind === "percent"
        ? parsePercentAsFraction(raw, locale)
        : parseLocaleNumber(raw, locale, { integer: field.kind === "integer" });
    const shown =
      parsed.ok && field.kind === "percent" ? Number((parsed.value * 100).toFixed(10)) : null;
    const inRange = (n: number) =>
      (field.exclusiveMin ? n > field.min : n >= field.min) && n <= field.max;
    if (!parsed.ok || !inRange(shown ?? parsed.value)) errors.add(field.key);
    else values[field.key] = parsed.value;
  }
  const date = row.tariffEffectiveDate.trim();
  const dateInvalid = date !== "" && !/^\d{4}-\d{2}-\d{2}$/.test(date);
  if (errors.size > 0 || dateInvalid) return { payload: null, errors, dateInvalid };
  return {
    errors,
    dateInvalid,
    payload: {
      ...(values as Record<NumberKey, number>),
      coalPriceUzsPerT: values.coalPriceUzsPerT ?? null,
      coalNcvKwhPerKg: values.coalNcvKwhPerKg ?? null,
      pvExportEnabled: row.pvExportEnabled,
      tariffSource: row.tariffSource.trim() === "" ? null : row.tariffSource.trim(),
      tariffEffectiveDate: date === "" ? null : date,
    },
  };
}

export function FinancialParametersCard({
  buildingId,
  readOnly = false,
}: { buildingId: string; readOnly?: boolean }) {
  const { t, i18n } = useTranslation("measures");
  const locale = toNumberLocale(i18n.language);
  const { data, isLoading, isError, error, refetch } = useFinancialParameters(buildingId);
  const save = useSaveFinancialParameters(buildingId);
  const revisionConflict = useRevisionConflict();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [invalid, setInvalid] = useState<ReadonlySet<NumberKey>>(new Set());
  const [dateInvalid, setDateInvalid] = useState(false);
  const [saved, setSaved] = useState(false);

  // One-row "table": refetches never overwrite what is typed (forms-and-numbers.md, useSyncedRows).
  const { rows, setRows, dirty, markClean } = useSyncedRows<Row>(
    data ? [toRow(data.parameters, locale)] : [],
    locale,
  );
  useRegisterDirty("measures.financial", dirty);
  const row = rows[0];

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (isError || !data || !row) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="p-6 text-sm text-destructive">
          {t("financial.failedToLoad")}{" "}
          {error instanceof ApiError ? error.message : t("common:unknownError")}
        </CardContent>
      </Card>
    );
  }

  function edit<K extends keyof Row>(key: K, value: Row[K]) {
    setSaved(false);
    setRows((prev) => prev.map((r) => ({ ...r, [key]: value })));
  }

  async function handleSave(expectedRevisionOverride?: number) {
    if (!row || !data) return;
    setSaveError(null);
    setSaved(false);
    const result = toPayload(row, locale);
    if (!result.payload) {
      setInvalid(result.errors);
      setDateInvalid(result.dateInvalid);
      setSaveError(t("financial.invalidFields"));
      return;
    }
    setInvalid(new Set());
    setDateInvalid(false);
    try {
      await save.mutateAsync({
        ...result.payload,
        expectedRevision: expectedRevisionOverride ?? data.revision,
      });
      revisionConflict.clear();
      markClean();
      setSaved(true);
    } catch (err) {
      if (revisionConflict.check(err)) return;
      setSaveError(err instanceof ApiError ? err.message : t("financial.failedToSave"));
    }
  }

  // "Load their version": discard the local edit and show whatever the refetch returns.
  async function handleReloadFromConflict() {
    revisionConflict.clear();
    const result = await refetch();
    if (result.data) {
      setRows([toRow(result.data.parameters, locale)]);
      markClean();
    }
  }

  const a = data.assumptions;
  const pct = (fraction: number) =>
    `${formatNumberForInput(Number((fraction * 100).toFixed(4)), locale)} %`;
  const usd = (value: number | null) =>
    value === null ? "—" : formatNumberForInput(Number(value.toFixed(5)), locale);

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="text-base">{t("financial.title")}</CardTitle>
          {data.isDefault && <Badge variant="warning">⚠ {t("financial.defaultBadge")}</Badge>}
          {dirty && (
            <span className="text-xs text-muted-foreground">● {t("financial.unsaved")}</span>
          )}
        </div>
        <CardDescription>
          {readOnly ? t("financial.descriptionReadOnly") : t("financial.description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {GROUPS.map((group) => (
          <fieldset key={group.id} className="space-y-3">
            <legend className="text-sm font-semibold">{t(`financial.groups.${group.id}`)}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {group.fields.map((field) => (
                <Field key={field.key} label={t(`financial.fields.${field.key}`)} id={field.key}>
                  <NumberInput
                    id={field.key}
                    value={row[field.key]}
                    onValueChange={(raw) => edit(field.key, raw)}
                    integer={field.kind === "integer"}
                    min={field.exclusiveMin ? undefined : field.min}
                    max={field.max}
                    unit={field.unit}
                    disabled={readOnly}
                    error={invalid.has(field.key) ? t("financial.fieldInvalid") : undefined}
                  />
                </Field>
              ))}
              {group.id === "tariffs" && (
                <>
                  <Field label={t("financial.fields.pvExportEnabled")} id="pvExportEnabled">
                    <label className="flex min-h-9 items-center gap-2 text-sm">
                      <input
                        id="pvExportEnabled"
                        type="checkbox"
                        className="size-4"
                        checked={row.pvExportEnabled}
                        disabled={readOnly}
                        onChange={(event) => edit("pvExportEnabled", event.target.checked)}
                      />
                      {t("financial.pvExportHint")}
                    </label>
                  </Field>
                  <Field label={t("financial.fields.tariffSource")} id="tariffSource">
                    <Input
                      id="tariffSource"
                      value={row.tariffSource}
                      maxLength={500}
                      disabled={readOnly}
                      onChange={(event) => edit("tariffSource", event.target.value)}
                    />
                  </Field>
                  <Field label={t("financial.fields.tariffEffectiveDate")} id="tariffEffectiveDate">
                    <Input
                      id="tariffEffectiveDate"
                      type="date"
                      value={row.tariffEffectiveDate}
                      disabled={readOnly}
                      aria-invalid={dateInvalid || undefined}
                      onChange={(event) => edit("tariffEffectiveDate", event.target.value)}
                    />
                  </Field>
                </>
              )}
            </div>
          </fieldset>
        ))}

        <div className="space-y-2 rounded-md border bg-muted/30 p-3">
          <p className="text-sm font-semibold">{t("financial.derived.title")}</p>
          <p className="text-xs text-muted-foreground">{t("financial.derived.hint")}</p>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            <Derived
              label={t("financial.derived.nominalDiscount")}
              value={pct(a.nominalDiscountRate)}
            />
            <Derived
              label={t("financial.derived.nominalGas")}
              value={pct(a.nominalEscalation.gas)}
            />
            <Derived
              label={t("financial.derived.nominalElectricity")}
              value={pct(a.nominalEscalation.electricity)}
            />
            <Derived
              label={t("financial.derived.nominalHeat")}
              value={pct(a.nominalEscalation.district_heat)}
            />
            <Derived
              label={t("financial.derived.maintenanceEscalation")}
              value={pct(a.maintenanceEscalation)}
            />
            <Derived label={t("financial.derived.usdGas")} value={usd(a.usdPerKwh.gas)} />
            <Derived
              label={t("financial.derived.usdElectricity")}
              value={usd(a.usdPerKwh.electricity)}
            />
            <Derived
              label={t("financial.derived.usdHeat")}
              value={usd(a.usdPerKwh.district_heat)}
            />
            <Derived label={t("financial.derived.usdCoal")} value={usd(a.usdPerKwh.coal)} />
          </dl>
        </div>

        {saveError && (
          <p role="alert" className="text-sm text-destructive">
            ⚠ {saveError}
          </p>
        )}
        {saved && !dirty && <p className="text-sm text-success">✓ {t("financial.saved")}</p>}
        {!readOnly && (
          <Button onClick={() => handleSave()} disabled={save.isPending || !dirty}>
            {save.isPending ? t("ee.saving") : t("financial.save")}
          </Button>
        )}
      </CardContent>
      <RevisionConflictDialog
        open={revisionConflict.conflict !== null}
        pending={save.isPending}
        onOverwrite={() => handleSave(revisionConflict.conflict?.currentRevision)}
        onReload={handleReloadFromConflict}
      />
    </Card>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Derived({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="shrink-0 font-medium tabular-nums">{value}</dd>
    </div>
  );
}
