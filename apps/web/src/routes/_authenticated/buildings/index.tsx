import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@yres/ui";
import { Building2, PlusCircle, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useBuildings } from "../../../hooks";
import { BUILDING_TYPE_LABELS, formatNumber } from "../../../lib/labels";

export const Route = createFileRoute("/_authenticated/buildings/")({
  component: BuildingsListPage,
});

function BuildingsListPage() {
  const { t } = useTranslation("buildings");
  const { data, isLoading, isError, error } = useBuildings({ pageSize: 100 });
  const [search, setSearch] = useState("");

  const buildings = data?.buildings ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return buildings;
    return buildings.filter(
      (b) => b.name.toLowerCase().includes(q) || b.location.toLowerCase().includes(q),
    );
  }, [buildings, search]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("list.title")}</h1>
          <p className="mt-1 text-muted-foreground">{t("list.subtitle")}</p>
        </div>
        <Button asChild>
          <Link to="/buildings/new">
            <PlusCircle className="h-4 w-4" />
            {t("list.newBuilding")}
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("list.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isError ? (
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            {t("list.failedToLoad")}: {error instanceof Error ? error.message : t("common:unknownError")}
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : buildings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
            <p className="font-medium">{t("list.noBuildingsYet")}</p>
            <p className="max-w-sm text-sm text-muted-foreground">{t("list.noBuildingsDescription")}</p>
            <Button asChild className="mt-2">
              <Link to="/buildings/new">
                <PlusCircle className="h-4 w-4" />
                {t("list.newBuilding")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {t("list.noMatch", { search })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("list.columnName")}</TableHead>
                <TableHead>{t("list.columnLocation")}</TableHead>
                <TableHead>{t("list.columnType")}</TableHead>
                <TableHead>{t("list.columnFloorArea")}</TableHead>
                <TableHead className="text-right">{t("list.columnActions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((building) => (
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
                    <Badge variant="secondary">{BUILDING_TYPE_LABELS[building.buildingType]}</Badge>
                  </TableCell>
                  <TableCell>{formatNumber(building.netCooledFloorAreaM2)}</TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="ghost" size="sm">
                      <Link to="/buildings/$buildingId" params={{ buildingId: building.id }}>
                        {t("list.view")}
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
