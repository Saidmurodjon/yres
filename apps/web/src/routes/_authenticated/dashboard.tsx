import { Link, createFileRoute } from "@tanstack/react-router";
import type { BuildingStatus, BuildingType } from "@yres/types";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  MetricCard,
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
} from "@yres/ui";
import { Building2, PlusCircle, Ruler, Search, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip } from "../../components/chart-tooltip";
import { useBuildings } from "../../hooks";
import type { BuildingWithRole } from "../../lib/api-types";
import { CHART_COLORS } from "../../lib/chart-colors";
import {
  BUILDING_STATUS_TRANSLATION_KEYS,
  BUILDING_STATUSES,
  BUILDING_TYPES,
  BUILDING_TYPE_LABELS,
  formatDate,
  formatNumber,
  isBuildingOverdue,
} from "../../lib/labels";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
});

const STATUS_BADGE_VARIANT: Record<
  BuildingStatus,
  "secondary" | "warning" | "success" | "outline"
> = {
  not_started: "secondary",
  in_progress: "warning",
  completed: "success",
  on_hold: "outline",
};

const ALL = "all";

function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const { data, isLoading, isError, error } = useBuildings({ pageSize: 100 });
  const buildings = data?.buildings ?? [];

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BuildingType | typeof ALL>(ALL);
  const [statusFilter, setStatusFilter] = useState<BuildingStatus | typeof ALL>(ALL);
  const [regionFilter, setRegionFilter] = useState(ALL);

  const regions = useMemo(
    () => Array.from(new Set(buildings.map((b) => b.location))).sort(),
    [buildings],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return buildings.filter((b) => {
      if (q && !b.name.toLowerCase().includes(q) && !b.location.toLowerCase().includes(q)) {
        return false;
      }
      if (typeFilter !== ALL && b.buildingType !== typeFilter) return false;
      if (statusFilter !== ALL && b.status !== statusFilter) return false;
      if (regionFilter !== ALL && b.location !== regionFilter) return false;
      return true;
    });
  }, [buildings, search, typeFilter, statusFilter, regionFilter]);

  const totalFloorArea = filtered.reduce((sum, b) => sum + (b.netCooledFloorAreaM2 ?? 0), 0);

  const regionChartData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of filtered) counts.set(b.location, (counts.get(b.location) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count);
  }, [filtered]);

  const hasFilters = search.trim() !== "" || typeFilter !== ALL || statusFilter !== ALL || regionFilter !== ALL;

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

      {!isError && !isLoading && buildings.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("filters.searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as BuildingType | "all")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allTypes")}</SelectItem>
              {BUILDING_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {BUILDING_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as BuildingStatus | "all")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allStatuses")}</SelectItem>
              {BUILDING_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`buildings:status.${BUILDING_STATUS_TRANSLATION_KEYS[status]}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={setRegionFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("filters.allRegions")}</SelectItem>
              {regions.map((region) => (
                <SelectItem key={region} value={region}>
                  {region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              value={String(filtered.length)}
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

      {!isError && !isLoading && buildings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("regionChart.title")}</CardTitle>
          </CardHeader>
          <CardContent>
            {regionChartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("regionChart.noData")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={regionChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                  <XAxis
                    dataKey="location"
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={<ChartTooltip formatValue={(v) => formatNumber(v, 0)} />}
                  />
                  <Bar
                    dataKey="count"
                    name={t("totalBuildings")}
                    fill={CHART_COLORS.primary}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
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
          ) : buildings.length === 0 ? (
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
          ) : filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {hasFilters ? t("filters.noMatch") : t("noBuildingsYet")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("columnName")}</TableHead>
                  <TableHead>{t("columnLocation")}</TableHead>
                  <TableHead>{t("columnStatus")}</TableHead>
                  <TableHead>{t("columnAuditors")}</TableHead>
                  <TableHead>{t("columnStarted")}</TableHead>
                  <TableHead>{t("columnDeadline")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((building: BuildingWithRole) => (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/buildings/$buildingId"
                        params={{ buildingId: building.id }}
                        className="hover:underline"
                      >
                        {building.name}
                      </Link>
                    </TableCell>
                    <TableCell>{building.location}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[building.status]}>
                        {t(`buildings:status.${BUILDING_STATUS_TRANSLATION_KEYS[building.status]}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {building.collaboratorCount}
                      </span>
                    </TableCell>
                    <TableCell>{formatDate(building.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{formatDate(building.deadline)}</span>
                        {isBuildingOverdue(building) && (
                          <Badge variant="destructive">{t("overdueBadge")}</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
