import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/buildings/$buildingId/")({
  component: BuildingDetailPage,
});

function BuildingDetailPage() {
  const { buildingId } = Route.useParams();
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Building {buildingId}</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
