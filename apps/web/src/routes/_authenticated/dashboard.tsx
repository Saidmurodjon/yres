import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  MetricCard,
  Skeleton,
} from "@yres/ui";
import { Building2, PlusCircle, Ruler } from "lucide-react";
import { useBuildings } from "../../hooks";
import { BUILDING_TYPE_LABELS, formatDate, formatNumber } from "../../lib/labels";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { data, isLoading, isError, error } = useBuildings({ pageSize: 100 });
  const buildings = data?.buildings ?? [];

  const totalFloorArea = buildings.reduce((sum, b) => sum + (b.netCooledFloorAreaM2 ?? 0), 0);
  const recentBuildings = [...buildings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            An overview of your building portfolio and audit activity.
          </p>
        </div>
        <Button asChild>
          <Link to="/buildings/new">
            <PlusCircle className="h-4 w-4" />
            New Building
          </Link>
        </Button>
      </div>

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load buildings: {error instanceof Error ? error.message : "Unknown error"}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      ) : (
        !isError && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard
              label="Total Buildings"
              value={String(buildings.length)}
              icon={<Building2 className="h-5 w-5" />}
            />
            <MetricCard
              label="Total Floor Area (m²)"
              value={formatNumber(totalFloorArea, 0)}
              icon={<Ruler className="h-5 w-5" />}
            />
          </div>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent buildings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : recentBuildings.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <Building2 className="h-10 w-10 text-muted-foreground" />
              <p className="font-medium">No buildings yet</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Add your first building to start tracking its envelope, consumption, and
                energy-saving measures.
              </p>
              <Button asChild className="mt-2">
                <Link to="/buildings/new">
                  <PlusCircle className="h-4 w-4" />
                  New Building
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {recentBuildings.map((building) => (
                <li key={building.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <Link
                      to="/buildings/$buildingId"
                      params={{ buildingId: building.id }}
                      className="font-medium hover:underline"
                    >
                      {building.name}
                    </Link>
                    <p className="truncate text-sm text-muted-foreground">{building.location}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant="secondary">{BUILDING_TYPE_LABELS[building.buildingType]}</Badge>
                    <span className="hidden text-sm text-muted-foreground sm:inline">
                      {formatDate(building.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
