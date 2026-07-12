import type { BuildingType } from "@yres/types";
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@yres/ui";
import type { Building, ClimateRegion, CreateBuildingInput } from "../../lib/api-types";
import { BUILDING_TYPES, BUILDING_TYPE_LABELS } from "../../lib/labels";

export interface BuildingFormValues {
  name: string;
  location: string;
  climateRegionId: string;
  buildingType: BuildingType;
  yearBuilt: string;
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

function parseRequiredNumber(value: string, label: string, errors: string[]): number {
  const n = Number(value);
  if (value.trim() === "" || Number.isNaN(n)) {
    errors.push(`${label} must be a number.`);
    return 0;
  }
  return n;
}

function parseOptionalNumber(value: string, label: string, errors: string[]): number | undefined {
  if (value.trim() === "") return undefined;
  const n = Number(value);
  if (Number.isNaN(n)) {
    errors.push(`${label} must be a number.`);
    return undefined;
  }
  return n;
}

export function parseBuildingFormValues(values: BuildingFormValues): {
  data: CreateBuildingInput | null;
  errors: string[];
} {
  const errors: string[] = [];

  if (!values.name.trim()) errors.push("Name is required.");
  if (!values.location.trim()) errors.push("Location is required.");
  if (!values.climateRegionId) errors.push("Climate region is required.");

  const heatingSeasonDurationDays = parseRequiredNumber(
    values.heatingSeasonDurationDays,
    "Heating season duration",
    errors,
  );
  const indoorTempNonOperationC = parseRequiredNumber(
    values.indoorTempNonOperationC,
    "Indoor temperature (non-operation)",
    errors,
  );
  const indoorTempOperationC = parseRequiredNumber(
    values.indoorTempOperationC,
    "Indoor temperature (operation)",
    errors,
  );
  const outdoorAvgHeatingSeasonTempC = parseRequiredNumber(
    values.outdoorAvgHeatingSeasonTempC,
    "Average outdoor heating-season temperature",
    errors,
  );
  const outdoorDesignTempC = parseRequiredNumber(
    values.outdoorDesignTempC,
    "Outdoor design temperature",
    errors,
  );
  const nonOperationHoursPerDay = parseRequiredNumber(
    values.nonOperationHoursPerDay,
    "Non-operation hours/day",
    errors,
  );
  const operationHoursPerDay = parseRequiredNumber(
    values.operationHoursPerDay,
    "Operation hours/day",
    errors,
  );

  const yearBuilt = parseOptionalNumber(values.yearBuilt, "Year built", errors);
  const netCooledFloorAreaM2 = parseOptionalNumber(
    values.netCooledFloorAreaM2,
    "Net cooled floor area",
    errors,
  );
  const occupantCount = parseOptionalNumber(values.occupantCount, "Occupant count", errors);
  const coolingEnthalpyInsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyInsideKjKg,
    "Cooling enthalpy (inside)",
    errors,
  );
  const coolingEnthalpyOutsideKjKg = parseOptionalNumber(
    values.coolingEnthalpyOutsideKjKg,
    "Cooling enthalpy (outside)",
    errors,
  );
  const coolingEnthalpyHottestDayKjKg = parseOptionalNumber(
    values.coolingEnthalpyHottestDayKjKg,
    "Cooling enthalpy (hottest day)",
    errors,
  );

  if (errors.length > 0) return { data: null, errors };

  return {
    data: {
      name: values.name.trim(),
      location: values.location.trim(),
      climateRegionId: values.climateRegionId,
      buildingType: values.buildingType,
      yearBuilt: yearBuilt ?? null,
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
  function set<K extends keyof BuildingFormValues>(key: K, value: BuildingFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  const id = (name: string) => `${idPrefix}-${name}`;

  return (
    <div className="space-y-8">
      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Location &amp; type</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("name")}>Name *</Label>
            <Input
              id={id("name")}
              required
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("location")}>Location *</Label>
            <Input
              id={id("location")}
              required
              value={values.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("climateRegion")}>Climate region *</Label>
            <Select
              value={values.climateRegionId || undefined}
              onValueChange={(v) => set("climateRegionId", v)}
              disabled={climateRegionsLoading || climateRegions.length === 0}
            >
              <SelectTrigger id={id("climateRegion")}>
                <SelectValue
                  placeholder={
                    climateRegionsLoading
                      ? "Loading regions..."
                      : climateRegions.length === 0
                        ? "No climate regions available"
                        : "Select a region"
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
              <p className="text-xs text-muted-foreground">
                No climate regions available yet. Ask an administrator to seed climate data before
                creating buildings.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("buildingType")}>Building type</Label>
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
            <Label htmlFor={id("yearBuilt")}>Year built</Label>
            <Input
              id={id("yearBuilt")}
              type="number"
              value={values.yearBuilt}
              onChange={(e) => set("yearBuilt", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("floorArea")}>Net cooled floor area (m²)</Label>
            <Input
              id={id("floorArea")}
              type="number"
              step="any"
              value={values.netCooledFloorAreaM2}
              onChange={(e) => set("netCooledFloorAreaM2", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("occupantCount")}>Occupant count</Label>
            <Input
              id={id("occupantCount")}
              type="number"
              value={values.occupantCount}
              onChange={(e) => set("occupantCount", e.target.value)}
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="text-sm font-semibold">Heating season configuration</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("heatingSeasonDurationDays")}>
              Heating season duration (days) *
            </Label>
            <Input
              id={id("heatingSeasonDurationDays")}
              type="number"
              required
              value={values.heatingSeasonDurationDays}
              onChange={(e) => set("heatingSeasonDurationDays", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("outdoorAvgHeatingSeasonTempC")}>
              Avg. outdoor temp, heating season (°C) *
            </Label>
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
            <Label htmlFor={id("outdoorDesignTempC")}>Outdoor design temperature (°C) *</Label>
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
        <legend className="text-sm font-semibold">Indoor temperatures &amp; operating hours</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={id("indoorTempOperationC")}>Indoor temp, operation hours (°C) *</Label>
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
            <Label htmlFor={id("indoorTempNonOperationC")}>
              Indoor temp, non-operation hours (°C) *
            </Label>
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
            <Label htmlFor={id("operationHoursPerDay")}>Operation hours/day *</Label>
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
            <Label htmlFor={id("nonOperationHoursPerDay")}>Non-operation hours/day *</Label>
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
          Cooling enthalpies (kJ/kg){" "}
          <span className="font-normal text-muted-foreground">— optional</span>
        </legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyInside")}>Inside</Label>
            <Input
              id={id("enthalpyInside")}
              type="number"
              step="any"
              value={values.coolingEnthalpyInsideKjKg}
              onChange={(e) => set("coolingEnthalpyInsideKjKg", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyOutside")}>Outside</Label>
            <Input
              id={id("enthalpyOutside")}
              type="number"
              step="any"
              value={values.coolingEnthalpyOutsideKjKg}
              onChange={(e) => set("coolingEnthalpyOutsideKjKg", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={id("enthalpyHottest")}>Hottest day</Label>
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
