import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/buildings/")({
  component: BuildingsListPage,
});

function BuildingsListPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Buildings</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
