import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Card, CardContent, CardFooter, CardHeader, CardTitle } from "@yres/ui";
import { ArrowLeft } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  BuildingFormFields,
  DEFAULT_BUILDING_FORM_VALUES,
  parseBuildingFormValues,
} from "../../../components/buildings/building-form-fields";
import {
  UnsavedChangesProvider,
  useRegisterDirty,
  useRunWithoutBlocking,
} from "../../../components/unsaved-changes";
import { useCreateBuilding } from "../../../hooks";
import { useClimateRegions } from "../../../hooks";
import { ApiError } from "../../../lib/api";
import { toNumberLocale } from "../../../lib/number";

export const Route = createFileRoute("/_authenticated/buildings/new")({
  component: NewBuildingPage,
});

function NewBuildingPage() {
  return (
    <UnsavedChangesProvider>
      <NewBuildingForm />
    </UnsavedChangesProvider>
  );
}

function NewBuildingForm() {
  const { t, i18n } = useTranslation("buildings");
  const navigate = useNavigate();
  const { data: climateData, isLoading: climateLoading } = useClimateRegions({ pageSize: 100 });
  const createBuilding = useCreateBuilding();

  const [values, setValues] = useState(DEFAULT_BUILDING_FORM_VALUES);
  const runWithoutBlocking = useRunWithoutBlocking();
  // Anything typed beyond the prefilled defaults is unsaved: leaving the page / closing the tab asks first.
  useRegisterDirty(
    "building.new",
    JSON.stringify(values) !== JSON.stringify(DEFAULT_BUILDING_FORM_VALUES),
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ message: string; details?: unknown } | null>(null);

  const climateRegions = climateData?.regions ?? [];

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setApiError(null);

    const { data, errors } = parseBuildingFormValues(values, t, toNumberLocale(i18n.language));
    setValidationErrors(errors);
    if (!data) return;

    try {
      const { building } = await createBuilding.mutateAsync(data);
      // The building is saved; the dirty flag only clears on the next render, so skip the blocker once.
      await runWithoutBlocking(() =>
        navigate({ to: "/buildings/$buildingId", params: { buildingId: building.id } }),
      );
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError({ message: err.message, details: err.details });
      } else {
        setApiError({ message: err instanceof Error ? err.message : t("new.createFailed") });
      }
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/buildings">
            <ArrowLeft className="h-4 w-4" />
            {t("new.backToBuildings")}
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("new.title")}</h1>
        <p className="mt-1 text-muted-foreground">{t("new.subtitle")}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>{t("new.buildingDetails")}</CardTitle>
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
                <p className="font-medium">{t("new.pleaseFix")}</p>
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
              <Link to="/buildings">{t("new.cancel")}</Link>
            </Button>
            <Button type="submit" disabled={createBuilding.isPending}>
              {createBuilding.isPending ? t("new.creating") : t("new.createBuilding")}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  );
}
