import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@yres/ui";
import { BarChart3, ClipboardCheck, LineChart, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Building, BuildingRole } from "../../lib/api-types";
import { BUILDING_TYPE_LABELS, formatDate, formatNumber } from "../../lib/labels";
import { DeleteBuildingDialog } from "./delete-building-dialog";
import { EditBuildingDialog } from "./edit-building-dialog";

interface FieldProps {
  label: string;
  value: ReactNode;
}

function Field({ label, value }: FieldProps) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{value}</dd>
    </div>
  );
}

export function OverviewTab({ building, role }: { building: Building; role: BuildingRole }) {
  const { t } = useTranslation("buildings");
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const canEdit = role === "owner" || role === "editor";
  const canDelete = role === "owner";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/buildings/$buildingId/audit" params={{ buildingId: building.id }}>
              <ClipboardCheck className="h-4 w-4" />
              {t("overview.runAudit")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/buildings/$buildingId/results" params={{ buildingId: building.id }}>
              <BarChart3 className="h-4 w-4" />
              {t("overview.auditResults")}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/buildings/$buildingId/financial" params={{ buildingId: building.id }}>
              <LineChart className="h-4 w-4" />
              {t("overview.financialAnalysis")}
            </Link>
          </Button>
        </div>
        {(canEdit || canDelete) && (
          <div className="flex gap-2">
            {canEdit && (
              <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                {t("common:edit")}
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" />
                {t("common:delete")}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.locationAndType")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label={t("overview.location")} value={building.location} />
              <Field
                label={t("overview.buildingType")}
                value={
                  <Badge variant="secondary">{BUILDING_TYPE_LABELS[building.buildingType]}</Badge>
                }
              />
              <Field
                label={t("overview.yearBuilt")}
                value={building.yearBuilt ? String(building.yearBuilt) : "—"}
              />
              <Field
                label={t("overview.floorArea")}
                value={`${formatNumber(building.netCooledFloorAreaM2)} m²`}
              />
              <Field label={t("overview.occupantCount")} value={String(building.occupantCount)} />
              <Field label={t("overview.created")} value={formatDate(building.createdAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.heatingSeasonConfig")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label={t("overview.heatingSeasonDuration")}
                value={`${formatNumber(building.heatingSeasonDurationDays, 0)} ${t("overview.days")}`}
              />
              <Field
                label={t("overview.avgOutdoorTemp")}
                value={`${formatNumber(building.outdoorAvgHeatingSeasonTempC)} °C`}
              />
              <Field
                label={t("overview.outdoorDesignTemp")}
                value={`${formatNumber(building.outdoorDesignTempC)} °C`}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.indoorTempsAndHours")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label={t("overview.indoorTempOperation")}
                value={`${formatNumber(building.indoorTempOperationC)} °C`}
              />
              <Field
                label={t("overview.indoorTempNonOperation")}
                value={`${formatNumber(building.indoorTempNonOperationC)} °C`}
              />
              <Field
                label={t("overview.operationHours")}
                value={formatNumber(building.operationHoursPerDay)}
              />
              <Field
                label={t("overview.nonOperationHours")}
                value={formatNumber(building.nonOperationHoursPerDay)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("overview.coolingEnthalpies")}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label={t("overview.inside")}
                value={`${formatNumber(building.coolingEnthalpyInsideKjKg)} kJ/kg`}
              />
              <Field
                label={t("overview.outside")}
                value={`${formatNumber(building.coolingEnthalpyOutsideKjKg)} kJ/kg`}
              />
              <Field
                label={t("overview.hottestDay")}
                value={`${formatNumber(building.coolingEnthalpyHottestDayKjKg)} kJ/kg`}
              />
            </dl>
          </CardContent>
        </Card>
      </div>

      <EditBuildingDialog building={building} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteBuildingDialog building={building} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </div>
  );
}
