import type { BuildingStatus, BuildingType } from "@yres/types";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yres/ui";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import type { Building, ClimateRegion, CreateBuildingInput } from "../../lib/api-types";
import {
  BUILDING_STATUSES,
  BUILDING_STATUS_TRANSLATION_KEYS,
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
} from "../../lib/labels";
import {
  type NumberLocale,
  formatNumberForInput,
  parseLocaleNumber,
  toNumberLocale,
} from "../../lib/number";
import { NumberInput } from "../number-input";

export interface BuildingFormValues {
  name: string;
  location: string;
  climateRegionId: string;
  buildingType: BuildingType;
  yearBuilt: string;
  status: BuildingStatus;
  deadline: string;
  latitude: string;
  longitude: string;
  netCooledFloorAreaM2: string;
  heatingSeasonDurationDays: string;
  indoorTempNonOperationC: string;
  indoorTempOperationC: string;
  outdoorAvgHeatingSeasonTempC: string;
  outdoorDesignTempC: string;
  nonOperationHoursPerDay: string;
  operationHoursPerDay: string;
  occupantCount: string;
  workingDaysPerYear: string;
  coolingEnthalpyInsideKjKg: string;
  coolingEnthalpyOutsideKjKg: string;
  coolingEnthalpyHottestDayKjKg: string;
}

/**
 * Defaults sourced from the source Excel audit tool's typical assumptions
 * (indoor comfort temps, ~163-day heating season) so a first-time user isn't
 * blocked by unfamiliar engineering inputs. Everything remains editable.
 */
export const DEFAULT_BUILDING_FORM_VALUES: BuildingFormValues = {
  name: "",
  location: "",
  climateRegionId: "",
  buildingType: "other",
  yearBuilt: "",
  status: "not_started",
  deadline: "",
  latitude: "",
  longitude: "",
  netCooledFloorAreaM2: "",
  heatingSeasonDurationDays: "163",
  indoorTempNonOperationC: "14",
  indoorTempOperationC: "22",
  outdoorAvgHeatingSeasonTempC: "2",
  outdoorDesignTempC: "-15",
  nonOperationHoursPerDay: "14",
  operationHoursPerDay: "10",
  occupantCount: "",
  workingDaysPerYear: "",
  coolingEnthalpyInsideKjKg: "",
  coolingEnthalpyOutsideKjKg: "",
  coolingEnthalpyHottestDayKjKg: "",
};

export function buildingToFormValues(building: Building, locale: NumberLocale): BuildingFormValues {
  return {
    name: building.name,
    location: building.location,
    climateRegionId: building.climateRegionId,
    buildingType: building.buildingType,
    yearBuilt: formatNumberForInput(building.yearBuilt, locale),
    status: building.status,
    deadline: building.deadline ?? "",
    latitude: formatNumberForInput(building.latitude, locale),
    longitude: formatNumberForInput(building.longitude, locale),
    netCooledFloorAreaM2: formatNumberForInput(building.netCooledFloorAreaM2, locale),
    heatingSeasonDurationDays: formatNumberForInput(building.heatingSeasonDurationDays, locale),
    indoorTempNonOperationC: formatNumberForInput(building.indoorTempNonOperationC, locale),
    indoorTempOperationC: formatNumberForInput(building.indoorTempOperationC, locale),
    outdoorAvgHeatingSeasonTempC: formatNumberForInput(
      building.outdoorAvgHeatingSeasonTempC,
      locale,
    ),
    outdoorDesignTempC: formatNumberForInput(building.outdoorDesignTempC, locale),
    nonOperationHoursPerDay: formatNumberForInput(building.nonOperationHoursPerDay, locale),
    operationHoursPerDay: formatNumberForInput(building.operationHoursPerDay, locale),
    occupantCount: formatNumberForInput(building.occupantCount, locale),
    workingDaysPerYear:
      building.workingDaysPerYear == null
        ? ""
        : formatNumberForInput(building.workingDaysPerYear, locale),
    coolingEnthalpyInsideKjKg: formatNumberForInput(building.coolingEnthalpyInsideKjKg, locale),
    coolingEnthalpyOutsideKjKg: formatNumberForInput(building.coolingEnthalpyOutsideKjKg, locale),
    coolingEnthalpyHottestDayKjKg: formatNumberForInput(
      building.coolingEnthalpyHottestDayKjKg,
      locale,
    ),
  };
}

/**
 * A required number field: empty or unparsable is an error (never 0). `0` is returned only so the caller
 * can keep going and collect every error; it is never sent anywhere because `errors` is then non-empty.
 */
function parseRequiredNumber(
  value: string,
  fieldLabel: string,
  errors: string[],
  t: TFunction,
  locale: NumberLocale,
  opts?: { integer?: boolean },
): number {
  const parsed = parseLocaleNumber(value, locale, opts);
  if (!parsed.ok) {
    errors.push(t("buildings:form.fieldMustBeNumber", { field: fieldLabel }));
    return 0;
  }
  return parsed.value;
}

/** An optional number field: empty is "not given", unparsable is an error. */
function parseOptionalNumber(
  value: string,
  fieldLabel: string,
  errors: string[],
  t: TFunction,
  locale: NumberLocale,
  opts?: { integer?: boolean },
): number | undefined {
  const parsed = parseLocaleNumber(value, locale, opts);
  if (!parsed.ok) {
    if (parsed.reason === "invalid") {
      errors.push(t("buildings:form.fieldMustBeNumber", { field: fieldLabel }));
    }
    return undefined;
  }
  return parsed.value;
}

export function parseBuildingFormValues(
  values: BuildingFormValues,
  t: TFunction,
  locale: NumberLocale,
): {
  data: CreateBuildingInput | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!values.name.trim()) {
    errors.push(t("buildings:form.fieldRequired", { field: t("buildings:form.fieldNameLabel") }));
  }
  if (!values.location.trim()) {
    errors.push(
      t("buildings:form.fieldRequired", { field: t("buildings:form.fieldLocationLabel") }),
    );
  }
  if (!values.climateRegionId) {
    errors.push(
      t("buildings:form.fieldRequired", { field: t("buildings:form.fieldClimateRegionLabel") }),
    );
  }

  const heatingSeasonDurationDays = parseRequiredNumber(
    values.heatingSeasonDurationDays,
    t("buildings:form.fieldHeatingSeasonDurationLabel"),
    errors,
    t,
    locale,
    { integer: true },
  );
  const indoorTempNonOperationC = parseRequiredNumber(
    values.indoorTempNonOperationC,
    t("buildings:form.fieldIndoorTempNonOperationLabel"),
    errors,
    t,
    locale,
  );
  const indoorTempOperationC = parseRequiredNumber(
    values.indoorTempOperationC,
    t("buildings:form.fieldIndoorTempOperationLabel"),
    errors,
    t,
    locale,
  );
  const outdoorAvgHeatingSeasonTempC = parseRequiredNumber(
    values.outdoorAvgHeatingSeasonTempC,
    t("buildings:form.fieldAvgOutdoorTempLabel"),
    errors,
    t,
    locale,
  );
  const outdoorDesignTempC = parseRequiredNumber(
    values.outdoorDesignTempC,
    t("buildings:form.fieldOutdoorDesignTempLabel"),
    errors,
    t,
    locale,
  );
  const nonOperationHoursPerDay = parseRequiredNumber(
    values.nonOperationHoursPerDay,
    t("buildings:form.fieldNonOperationHoursLabel"),
    errors,
    t,
    locale,
  );
  const operationHoursPerDay = parseRequiredNumber(
    values.operationHoursPerDay,
    t("buildings:form.fieldOperationHoursLabel"),
    errors,
    t,
    locale,
  );

  const yearBuilt = parseOptionalNumber(
    values.yearBuilt,
    t("buildings:form.fieldYearBuiltLabel"),
    errors,
    t,
    locale,
    { integer: true },
  );
  const latitude = parseOptionalNumber(
    values.latitude,
    t("buildings:form.fieldLatitudeLabel"),
    errors,
    t,
    locale,
  );
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    errors.push(
      t("buildings:form.fieldOutOfRange", {
        field: t("buildings:form.fieldLatitudeLabel"),
        min: -90,
        max: 90,
      }),
    );
  }
  const longitude = parseOptionalNumber(
    values.longitude,
    t("buildings:form.fieldLongitudeLabel"),
    errors,
    t,
    locale,
  );
  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    errors.push(
      t("buildings:form.fieldOutOfRange", {
        field: t("buildings:form.fieldLongitudeLabel"),
        min: -180,
        max: 180,
      }),
    );
  }
  const netCooledFloorAreaM2 = parseOptionalNumber(
    values.netCooledFloorAreaM2,
    t("buildings:form.fieldFloorAreaLabel"),
    errors,
    t,
    locale,
  );
  const occupantCount = parseOptionalNumber(
    values.occupantCount,
    t("buildings:form.fieldOccupantCountLabel"),
    errors,
    t,
    locale,
    { integer: true },
  );
  const workingDaysPerYear = parseOptionalNumber(
    values.workingDaysPerYear,
    t("buildings:form.fieldWorkingDaysLabel"),
    errors,
    t,
    locale,
    { integer: true },
  );
  if (workingDaysPerYear !== undefined && (workingDaysPerYear < 1 || workingDaysPerYear > 366)) {
    errors.push(t("buildings:form.fieldWorkingDaysRange"));
  }
  const coolingEnthalpyInsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyInsideKjKg,
    t("buildings:form.fieldEnthalpyInsideLabel"),
    errors,
    t,
    locale,
  );
  const coolingEnthalpyOutsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyOutsideKjKg,
    t("buildings:form.fieldEnthalpyOutsideLabel"),
    errors,
    t,
    locale,
  );
  const coolingEnthalpyHottestDayKjKg = parseOptionalNumber(
    values.coolingEnthalpyHottestDayKjKg,
    t("buildings:form.fieldEnthalpyHottestLabel"),
    errors,
    t,
    locale,
  );

  if (errors.length > 0) return { data: null, errors };

  return {
    data: {
      name: values.name.trim(),
      location: values.location.trim(),
      climateRegionId: values.climateRegionId,
      buildingType: values.buildingType,
      yearBuilt: yearBuilt ?? null,
      status: values.status,
      deadline: values.deadline.trim() || null,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      netCooledFloorAreaM2: netCooledFloorAreaM2 ?? null,
      heatingSeasonDurationDays,
      indoorTempNonOperationC,
      indoorTempOperationC,
      outdoorAvgHeatingSeasonTempC,
      outdoorDesignTempC,
      nonOperationHoursPerDay,
      operationHoursPerDay,
      occupantCount: occupantCount ?? 0,
      workingDaysPerYear: workingDaysPerYear ?? null,
      coolingEnthalpyInsideKjKg: coolingEnthalpyInsideKjKg ?? null,
      coolingEnthalpyOutsideKjKg: coolingEnthalpyOutsideKjKg ?? null,
      coolingEnthalpyHottestDayKjKg: coolingEnthalpyHottestDayKjKg ?? null,
    },
    errors: [],
  };
}

interface BuildingFormFieldsProps {
  values: BuildingFormValues;
  onChange: (values: BuildingFormValues) => void;
  climateRegions: ClimateRegion[];
  climateRegionsLoading: boolean;
  idPrefix?: string;
}

export function BuildingFormFields({
  values,
  onChange,
  climateRegions,
  climateRegionsLoading,
  idPrefix = "building",
}: BuildingFormFieldsProps) {
  const { t } = useTranslation("buildings");

  function set<K extends keyof BuildingFormValues>(key: K, value: BuildingFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("form.locationAndType")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("name")}>{t("form.name")}</Label>
            <Input
              id={id("name")}
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("location")}>{t("form.location")}</Label>
            <Input
              id={id("location")}
              required
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("climateRegion")}>{t("form.climateRegion")}</Label>
            <Select
              value={values.climateRegionId || undefined}
              onValueChange={(v) => set("climateRegionId", v)}
              disabled={climateRegionsLoading || climateRegions.length === 0}
            >
              <SelectTrigger id={id("climateRegion")}>
                <SelectValue
                  placeholder={
                    climateRegionsLoading
                      ? t("form.loadingRegions")
                      : climateRegions.length === 0
                        ? t("form.noClimateRegions")
                        : t("form.selectRegion")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {climateRegions.map((region) => (
                  <SelectItem key={region.id} value={region.id}>
                    {region.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!climateRegionsLoading && climateRegions.length === 0 && (
              <p className="text-xs text-muted-foreground">{t("form.noClimateRegionsHelp")}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("buildingType")}>{t("form.buildingType")}</Label>
            <Select
              value={values.buildingType}
              onValueChange={(v) => set("buildingType", v as BuildingType)}
            >
              <SelectTrigger id={id("buildingType")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {BUILDING_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("yearBuilt")}>{t("form.yearBuilt")}</Label>
            <NumberInput
              integer
              id={id("yearBuilt")}
              value={values.yearBuilt}
              onValueChange={(raw) => set("yearBuilt", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("floorArea")}>{t("form.floorArea")}</Label>
            <NumberInput
              id={id("floorArea")}
              value={values.netCooledFloorAreaM2}
              onValueChange={(raw) => set("netCooledFloorAreaM2", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("occupantCount")}>{t("form.occupantCount")}</Label>
            <NumberInput
              integer
              id={id("occupantCount")}
              value={values.occupantCount}
              onValueChange={(raw) => set("occupantCount", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("workingDaysPerYear")}>{t("form.workingDaysPerYear")}</Label>
            <NumberInput
              integer
              id={id("workingDaysPerYear")}
              value={values.workingDaysPerYear}
              onValueChange={(raw) => set("workingDaysPerYear", raw)}
            />
            <p className="text-xs text-muted-foreground">{t("form.workingDaysPerYearHint")}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("status")}>{t("form.status")}</Label>
            <Select value={values.status} onValueChange={(v) => set("status", v as BuildingStatus)}>
              <SelectTrigger id={id("status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDING_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {t(`status.${BUILDING_STATUS_TRANSLATION_KEYS[status]}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("deadline")}>{t("form.deadline")}</Label>
            <Input
              id={id("deadline")}
              type="date"
              value={values.deadline}
              onChange={(e) => set("deadline", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("latitude")}>{t("form.latitude")}</Label>
            <NumberInput
              id={id("latitude")}
              placeholder="41.2995"
              value={values.latitude}
              onValueChange={(raw) => set("latitude", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("longitude")}>{t("form.longitude")}</Label>
            <NumberInput
              id={id("longitude")}
              placeholder="69.2401"
              value={values.longitude}
              onValueChange={(raw) => set("longitude", raw)}
            />
            <p className="text-xs text-muted-foreground">{t("form.coordinatesHelp")}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("form.heatingSeasonConfig")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("heatingSeasonDurationDays")}>
              {t("form.heatingSeasonDuration")}
            </Label>
            <NumberInput
              integer
              id={id("heatingSeasonDurationDays")}
              required
              value={values.heatingSeasonDurationDays}
              onValueChange={(raw) => set("heatingSeasonDurationDays", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("outdoorAvgHeatingSeasonTempC")}>{t("form.avgOutdoorTemp")}</Label>
            <NumberInput
              id={id("outdoorAvgHeatingSeasonTempC")}
              required
              value={values.outdoorAvgHeatingSeasonTempC}
              onValueChange={(raw) => set("outdoorAvgHeatingSeasonTempC", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("outdoorDesignTempC")}>{t("form.outdoorDesignTemp")}</Label>
            <NumberInput
              id={id("outdoorDesignTempC")}
              required
              value={values.outdoorDesignTempC}
              onValueChange={(raw) => set("outdoorDesignTempC", raw)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("form.indoorTempsAndHours")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("indoorTempOperationC")}>{t("form.indoorTempOperation")}</Label>
            <NumberInput
              id={id("indoorTempOperationC")}
              required
              value={values.indoorTempOperationC}
              onValueChange={(raw) => set("indoorTempOperationC", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("indoorTempNonOperationC")}>
              {t("form.indoorTempNonOperation")}
            </Label>
            <NumberInput
              id={id("indoorTempNonOperationC")}
              required
              value={values.indoorTempNonOperationC}
              onValueChange={(raw) => set("indoorTempNonOperationC", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("operationHoursPerDay")}>{t("form.operationHours")}</Label>
            <NumberInput
              id={id("operationHoursPerDay")}
              required
              value={values.operationHoursPerDay}
              onValueChange={(raw) => set("operationHoursPerDay", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("nonOperationHoursPerDay")}>{t("form.nonOperationHours")}</Label>
            <NumberInput
              id={id("nonOperationHoursPerDay")}
              required
              value={values.nonOperationHoursPerDay}
              onValueChange={(raw) => set("nonOperationHoursPerDay", raw)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">
          {t("form.coolingEnthalpies")}{" "}
          <span className="font-normal text-muted-foreground">{t("form.optional")}</span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyInside")}>{t("form.inside")}</Label>
            <NumberInput
              id={id("enthalpyInside")}
              value={values.coolingEnthalpyInsideKjKg}
              onValueChange={(raw) => set("coolingEnthalpyInsideKjKg", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyOutside")}>{t("form.outside")}</Label>
            <NumberInput
              id={id("enthalpyOutside")}
              value={values.coolingEnthalpyOutsideKjKg}
              onValueChange={(raw) => set("coolingEnthalpyOutsideKjKg", raw)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyHottest")}>{t("form.hottestDay")}</Label>
            <NumberInput
              id={id("enthalpyHottest")}
              value={values.coolingEnthalpyHottestDayKjKg}
              onValueChange={(raw) => set("coolingEnthalpyHottestDayKjKg", raw)}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
