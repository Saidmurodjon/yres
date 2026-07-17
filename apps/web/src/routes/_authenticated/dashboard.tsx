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
import { useTranslation } from "react-i18next";
import { useBuildings } from "../../hooks";
import { BUILDING_TYPE_LABELS, formatDate, formatNumber } from "../../lib/labels";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation("dashboard");
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
          <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild>
          <Link to="/buildings/new">
            <PlusCircle className="h-4 w-4" />
            {t("newBuilding")}
          </Link>
        </Button>
      </div>

      {isError && (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            {t("failedToLoad")}: {error instanceof Error ? error.message : t("common:unknownError")}
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
              label={t("totalBuildings")}
              value={String(buildings.length)}
              icon={<Building2 className="h-5 w-5" />}
            />
            <MetricCard
              label={t("totalFloorArea")}
              value={formatNumber(totalFloorArea, 0)}
              icon={<Ruler className="h-5 w-5" />}
            />
          </div>
        )
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t("recentBuildings")}</CardTitle>
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
              <p className="font-medium">{t("noBuildingsYet")}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{t("noBuildingsDescription")}</p>
              <Button asChild className="mt-2">
                <Link to="/buildings/new">
                  <PlusCircle className="h-4 w-4" />
                  {t("newBuilding")}
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
