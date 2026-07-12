import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@yres/ui";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useState } from "react";
import {
  BuildingFormFields,
  DEFAULT_BUILDING_FORM_VALUES,
  parseBuildingFormValues,
} from "../../../components/buildings/building-form-fields";
import { useCreateBuilding } from "../../../hooks";
import { useClimateRegions } from "../../../hooks";
import { ApiError } from "../../../lib/api";

export const Route = createFileRoute("/_authenticated/buildings/new")({
  component: NewBuildingPage,
});

function NewBuildingPage() {
  const navigate = useNavigate();
  const { data: climateData, isLoading: climateLoading } = useClimateRegions({ pageSize: 100 });
  const createBuilding = useCreateBuilding();

  const [values, setValues] = useState(DEFAULT_BUILDING_FORM_VALUES);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ message: string; details?: unknown } | null>(null);

  const climateRegions = climateData?.regions ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError(null);

    const { data, errors } = parseBuildingFormValues(values);
    setValidationErrors(errors);
    if (!data) return;

    try {
      const { building } = await createBuilding.mutateAsync(data);
      navigate({ to: "/buildings/$buildingId", params: { buildingId: building.id } });
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError({ message: err.message, details: err.details });
      } else {
        setApiError({ message: err instanceof Error ? err.message : "Failed to create building." });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buildings">
            <ArrowLeft className="h-4 w-4" />
            Back to buildings
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New Building</h1>
        <p className="mt-1 text-muted-foreground">
          Enter the building's parameters. Defaults are provided for common heating-season
          assumptions — adjust anything that doesn't match your building.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Building details</CardTitle>
          </CardHeader>
          <CardContent>
            <BuildingFormFields
              values={values}
              onChange={setValues}
              climateRegions={climateRegions}
              climateRegionsLoading={climateLoading}
              idPrefix="new-building"
            />

            {validationErrors.length > 0 && (
              <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium">Please fix the following:</p>
                <ul className="mt-1 list-inside list-disc">
                  {validationErrors.map((msg) => (
                    <li key={msg}>{msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {apiError && (
              <div className="mt-6 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                <p className="font-medium">{apiError.message}</p>
                {apiError.details != null && (
                  <pre className="mt-2 whitespace-pre-wrap break-words text-xs opacity-80">
                    {typeof apiError.details === "string"
                      ? apiError.details
                      : JSON.stringify(apiError.details, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2">
            <Button asChild variant="outline" type="button">
              <Link to="/buildings">Cancel</Link>
            </Button>
            <Button type="submit" disabled={createBuilding.isPending}>
              {createBuilding.isPending ? "Creating..." : "Create building"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
