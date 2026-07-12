import { Link } from "@tanstack/react-router";
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@yres/ui";
import { BarChart3, ClipboardCheck, LineChart, Pencil, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import type { Building } from "../../lib/api-types";
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

export function OverviewTab({ building }: { building: Building }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/buildings/$buildingId/audit" params={{ buildingId: building.id }}>
              <ClipboardCheck className="h-4 w-4" />
              Run Audit
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/buildings/$buildingId/results" params={{ buildingId: building.id }}>
              <BarChart3 className="h-4 w-4" />
              Audit Results
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/buildings/$buildingId/financial" params={{ buildingId: building.id }}>
              <LineChart className="h-4 w-4" />
              Financial Analysis
            </Link>
          </Button>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Location &amp; type</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Location" value={building.location} />
              <Field
                label="Building type"
                value={
                  <Badge variant="secondary">{BUILDING_TYPE_LABELS[building.buildingType]}</Badge>
                }
              />
              <Field
                label="Year built"
                value={building.yearBuilt ? String(building.yearBuilt) : "—"}
              />
              <Field
                label="Net cooled floor area"
                value={`${formatNumber(building.netCooledFloorAreaM2)} m²`}
              />
              <Field label="Occupant count" value={String(building.occupantCount)} />
              <Field label="Created" value={formatDate(building.createdAt)} />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Heating season configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Heating season duration"
                value={`${formatNumber(building.heatingSeasonDurationDays, 0)} days`}
              />
              <Field
                label="Avg. outdoor temp (heating season)"
                value={`${formatNumber(building.outdoorAvgHeatingSeasonTempC)} °C`}
              />
              <Field
                label="Outdoor design temp"
                value={`${formatNumber(building.outdoorDesignTempC)} °C`}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Indoor temperatures &amp; hours</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Indoor temp (operation)"
                value={`${formatNumber(building.indoorTempOperationC)} °C`}
              />
              <Field
                label="Indoor temp (non-operation)"
                value={`${formatNumber(building.indoorTempNonOperationC)} °C`}
              />
              <Field
                label="Operation hours/day"
                value={formatNumber(building.operationHoursPerDay)}
              />
              <Field
                label="Non-operation hours/day"
                value={formatNumber(building.nonOperationHoursPerDay)}
              />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cooling enthalpies</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4">
              <Field
                label="Inside"
                value={`${formatNumber(building.coolingEnthalpyInsideKjKg)} kJ/kg`}
              />
              <Field
                label="Outside"
                value={`${formatNumber(building.coolingEnthalpyOutsideKjKg)} kJ/kg`}
              />
              <Field
                label="Hottest day"
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
