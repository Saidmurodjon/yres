import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@yres/ui";
import { ArrowLeft, Eye } from "lucide-react";
import { ConsumptionTab } from "../../../../components/building-detail/consumption-tab";
import { EnvelopeTab } from "../../../../components/building-detail/envelope-tab";
import { MeasuresTab } from "../../../../components/building-detail/measures-tab";
import { OverviewTab } from "../../../../components/building-detail/overview-tab";
import { SharingTab } from "../../../../components/building-detail/sharing-tab";
import { SystemsTab } from "../../../../components/building-detail/systems-tab";
import { useBuilding } from "../../../../hooks";
import { ApiError } from "../../../../lib/api";

export const Route = createFileRoute("/_authenticated/buildings/$buildingId/")({
  component: BuildingDetailPage,
});

function BuildingDetailPage() {
  const { buildingId } = Route.useParams();
  const { data, isLoading, isError, error } = useBuilding(buildingId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buildings">
            <ArrowLeft className="h-4 w-4" />
            Back to buildings
          </Link>
        </Button>
        <Card className="border-destructive/50">
          <CardContent className="p-6 text-sm text-destructive">
            Failed to load building:{" "}
            {error instanceof ApiError ? error.message : "This building could not be found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { building, role } = data;
  const isReadOnly = role === "viewer";

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buildings">
            <ArrowLeft className="h-4 w-4" />
            Back to buildings
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{building.name}</h1>
          {role !== "owner" && (
            <Badge variant={isReadOnly ? "secondary" : "outline"} className="capitalize">
              {role} access
            </Badge>
          )}
        </div>
        <p className="mt-1 text-muted-foreground">{building.location}</p>
        {isReadOnly && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            <Eye className="h-4 w-4 shrink-0" />
            You have view-only access to this building — changes are disabled.
          </div>
        )}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="envelope">Envelope</TabsTrigger>
          <TabsTrigger value="systems">Systems</TabsTrigger>
          <TabsTrigger value="consumption">Consumption</TabsTrigger>
          <TabsTrigger value="measures">Measures</TabsTrigger>
          <TabsTrigger value="sharing">Sharing</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab building={building} role={role} />
        </TabsContent>
        <TabsContent value="envelope">
          <EnvelopeTab buildingId={building.id} readOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="systems">
          <SystemsTab buildingId={building.id} readOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="consumption">
          <ConsumptionTab buildingId={building.id} readOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="measures">
          <MeasuresTab buildingId={building.id} readOnly={isReadOnly} />
        </TabsContent>
        <TabsContent value="sharing">
          <SharingTab buildingId={building.id} role={role} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
