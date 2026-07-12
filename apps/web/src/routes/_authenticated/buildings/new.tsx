import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/buildings/new")({
  component: NewBuildingPage,
});

function NewBuildingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">New Building</h1>
      <p className="mt-2 text-muted-foreground">Coming soon.</p>
    </div>
  );
}
