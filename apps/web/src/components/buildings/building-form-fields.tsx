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
  BUILDING_STATUS_TRANSLATION_KEYS,
  BUILDING_STATUSES,
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
} from "../../lib/labels";

export interface BuildingFormValues {
  name: string;
  location: string;
  climateRegionId: string;
  buildingType: BuildingType;
  yearBuilt: string;
  status: BuildingStatus;
  deadline: string;
  netCooledFloorAreaM2: string;
  heatingSeasonDurationDays: string;
  indoorTempNonOperationC: string;
  indoorTempOperationC: string;
  outdoorAvgHeatingSeasonTempC: string;
  outdoorDesignTempC: string;
  nonOperationHoursPerDay: string;
  operationHoursPerDay: string;
  occupantCount: string;
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
  netCooledFloorAreaM2: "",
  heatingSeasonDurationDays: "163",
  indoorTempNonOperationC: "14",
  indoorTempOperationC: "22",
  outdoorAvgHeatingSeasonTempC: "2",
  outdoorDesignTempC: "-15",
  nonOperationHoursPerDay: "14",
  operationHoursPerDay: "10",
  occupantCount: "",
  coolingEnthalpyInsideKjKg: "",
  coolingEnthalpyOutsideKjKg: "",
  coolingEnthalpyHottestDayKjKg: "",
};

export function buildingToFormValues(building: Building): BuildingFormValues {
  return {
    name: building.name,
    location: building.location,
    climateRegionId: building.climateRegionId,
    buildingType: building.buildingType,
    yearBuilt: building.yearBuilt !== null ? String(building.yearBuilt) : "",
    status: building.status,
    deadline: building.deadline ?? "",
    netCooledFloorAreaM2:
      building.netCooledFloorAreaM2 !== null ? String(building.netCooledFloorAreaM2) : "",
    heatingSeasonDurationDays: String(building.heatingSeasonDurationDays),
    indoorTempNonOperationC: String(building.indoorTempNonOperationC),
    indoorTempOperationC: String(building.indoorTempOperationC),
    outdoorAvgHeatingSeasonTempC: String(building.outdoorAvgHeatingSeasonTempC),
    outdoorDesignTempC: String(building.outdoorDesignTempC),
    nonOperationHoursPerDay: String(building.nonOperationHoursPerDay),
    operationHoursPerDay: String(building.operationHoursPerDay),
    occupantCount: String(building.occupantCount),
    coolingEnthalpyInsideKjKg:
      building.coolingEnthalpyInsideKjKg !== null ? String(building.coolingEnthalpyInsideKjKg) : "",
    coolingEnthalpyOutsideKjKg:
      building.coolingEnthalpyOutsideKjKg !== null
        ? String(building.coolingEnthalpyOutsideKjKg)
        : "",
    coolingEnthalpyHottestDayKjKg:
      building.coolingEnthalpyHottestDayKjKg !== null
        ? String(building.coolingEnthalpyHottestDayKjKg)
        : "",
  };
}

function parseRequiredNumber(
  value: string,
  fieldLabel: string,
  errors: string[],
  t: TFunction,
): number {
  const n = Number(value);
  if (value.trim() === "" || Number.isNaN(n)) {
    errors.push(t("buildings:form.fieldMustBeNumber", { field: fieldLabel }));
    return 0;
  }
  return n;
}

function parseOptionalNumber(
  value: string,
  fieldLabel: string,
  errors: string[],
  t: TFunction,
): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) {
    errors.push(t("buildings:form.fieldMustBeNumber", { field: fieldLabel }));
    return undefined;
  }
  return n;
}

export function parseBuildingFormValues(
  values: BuildingFormValues,
  t: TFunction,
): {
  data: CreateBuildingInput | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!values.name.trim()) {
    errors.push(t("buildings:form.fieldRequired", { field: t("buildings:form.fieldNameLabel") }));
  }
  if (!values.location.trim()) {
    errors.push(t("buildings:form.fieldRequired", { field: t("buildings:form.fieldLocationLabel") }));
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
  );
  const indoorTempNonOperationC = parseRequiredNumber(
    values.indoorTempNonOperationC,
    t("buildings:form.fieldIndoorTempNonOperationLabel"),
    errors,
    t,
  );
  const indoorTempOperationC = parseRequiredNumber(
    values.indoorTempOperationC,
    t("buildings:form.fieldIndoorTempOperationLabel"),
    errors,
    t,
  );
  const outdoorAvgHeatingSeasonTempC = parseRequiredNumber(
    values.outdoorAvgHeatingSeasonTempC,
    t("buildings:form.fieldAvgOutdoorTempLabel"),
    errors,
    t,
  );
  const outdoorDesignTempC = parseRequiredNumber(
    values.outdoorDesignTempC,
    t("buildings:form.fieldOutdoorDesignTempLabel"),
    errors,
    t,
  );
  const nonOperationHoursPerDay = parseRequiredNumber(
    values.nonOperationHoursPerDay,
    t("buildings:form.fieldNonOperationHoursLabel"),
    errors,
    t,
  );
  const operationHoursPerDay = parseRequiredNumber(
    values.operationHoursPerDay,
    t("buildings:form.fieldOperationHoursLabel"),
    errors,
    t,
  );

  const yearBuilt = parseOptionalNumber(
    values.yearBuilt,
    t("buildings:form.fieldYearBuiltLabel"),
    errors,
    t,
  );
  const netCooledFloorAreaM2 = parseOptionalNumber(
    values.netCooledFloorAreaM2,
    t("buildings:form.fieldFloorAreaLabel"),
    errors,
    t,
  );
  const occupantCount = parseOptionalNumber(
    values.occupantCount,
    t("buildings:form.fieldOccupantCountLabel"),
    errors,
    t,
  );
  const coolingEnthalpyInsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyInsideKjKg,
    t("buildings:form.fieldEnthalpyInsideLabel"),
    errors,
    t,
  );
  const coolingEnthalpyOutsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyOutsideKjKg,
    t("buildings:form.fieldEnthalpyOutsideLabel"),
    errors,
    t,
  );
  const coolingEnthalpyHottestDayKjKg = parseOptionalNumber(
    values.coolingEnthalpyHottestDayKjKg,
    t("buildings:form.fieldEnthalpyHottestLabel"),
    errors,
    t,
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
      netCooledFloorAreaM2: netCooledFloorAreaM2 ?? null,
      heatingSeasonDurationDays,
      indoorTempNonOperationC,
      indoorTempOperationC,
      outdoorAvgHeatingSeasonTempC,
      outdoorDesignTempC,
      nonOperationHoursPerDay,
      operationHoursPerDay,
      occupantCount: occupantCount ?? 0,
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
            <Input
              id={id("yearBuilt")}
              type="number"
              value={values.yearBuilt}
              onChange={(e) => set("yearBuilt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("floorArea")}>{t("form.floorArea")}</Label>
            <Input
              id={id("floorArea")}
              type="number"
              step="any"
              value={values.netCooledFloorAreaM2}
              onChange={(e) => set("netCooledFloorAreaM2", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("occupantCount")}>{t("form.occupantCount")}</Label>
            <Input
              id={id("occupantCount")}
              type="number"
              value={values.occupantCount}
              onChange={(e) => set("occupantCount", e.target.value)}
            />
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
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("form.heatingSeasonConfig")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("heatingSeasonDurationDays")}>{t("form.heatingSeasonDuration")}</Label>
            <Input
              id={id("heatingSeasonDurationDays")}
              type="number"
              required
              value={values.heatingSeasonDurationDays}
              onChange={(e) => set("heatingSeasonDurationDays", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("outdoorAvgHeatingSeasonTempC")}>{t("form.avgOutdoorTemp")}</Label>
            <Input
              id={id("outdoorAvgHeatingSeasonTempC")}
              type="number"
              step="any"
              required
              value={values.outdoorAvgHeatingSeasonTempC}
              onChange={(e) => set("outdoorAvgHeatingSeasonTempC", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("outdoorDesignTempC")}>{t("form.outdoorDesignTemp")}</Label>
            <Input
              id={id("outdoorDesignTempC")}
              type="number"
              step="any"
              required
              value={values.outdoorDesignTempC}
              onChange={(e) => set("outdoorDesignTempC", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">{t("form.indoorTempsAndHours")}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("indoorTempOperationC")}>{t("form.indoorTempOperation")}</Label>
            <Input
              id={id("indoorTempOperationC")}
              type="number"
              step="any"
              required
              value={values.indoorTempOperationC}
              onChange={(e) => set("indoorTempOperationC", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("indoorTempNonOperationC")}>{t("form.indoorTempNonOperation")}</Label>
            <Input
              id={id("indoorTempNonOperationC")}
              type="number"
              step="any"
              required
              value={values.indoorTempNonOperationC}
              onChange={(e) => set("indoorTempNonOperationC", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("operationHoursPerDay")}>{t("form.operationHours")}</Label>
            <Input
              id={id("operationHoursPerDay")}
              type="number"
              step="any"
              required
              value={values.operationHoursPerDay}
              onChange={(e) => set("operationHoursPerDay", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("nonOperationHoursPerDay")}>{t("form.nonOperationHours")}</Label>
            <Input
              id={id("nonOperationHoursPerDay")}
              type="number"
              step="any"
              required
              value={values.nonOperationHoursPerDay}
              onChange={(e) => set("nonOperationHoursPerDay", e.target.value)}
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
            <Input
              id={id("enthalpyInside")}
              type="number"
              step="any"
              value={values.coolingEnthalpyInsideKjKg}
              onChange={(e) => set("coolingEnthalpyInsideKjKg", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyOutside")}>{t("form.outside")}</Label>
            <Input
              id={id("enthalpyOutside")}
              type="number"
              step="any"
              value={values.coolingEnthalpyOutsideKjKg}
              onChange={(e) => set("coolingEnthalpyOutsideKjKg", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyHottest")}>{t("form.hottestDay")}</Label>
            <Input
              id={id("enthalpyHottest")}
              type="number"
              step="any"
              value={values.coolingEnthalpyHottestDayKjKg}
              onChange={(e) => set("coolingEnthalpyHottestDayKjKg", e.target.value)}
            />
          </div>
        </div>
      </fieldset>
    </div>
  );
}
