import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@yres/ui";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClimateRegions, useUpdateBuilding } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { Building } from "../../lib/api-types";
import {
  BuildingFormFields,
  type BuildingFormValues,
  buildingToFormValues,
  parseBuildingFormValues,
} from "../buildings/building-form-fields";

interface EditBuildingDialogProps {
  building: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBuildingDialog({ building, open, onOpenChange }: EditBuildingDialogProps) {
  const { t } = useTranslation("buildings");
  const { data: climateData, isLoading: climateLoading } = useClimateRegions({ pageSize: 100 });
  const updateBuilding = useUpdateBuilding(building.id);

  const [values, setValues] = useState<BuildingFormValues>(() => buildingToFormValues(building));
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ message: string; details?: unknown } | null>(null);

  useEffect(() => {
    if (open) {
      setValues(buildingToFormValues(building));
      setValidationErrors([]);
      setApiError(null);
    }
  }, [open, building]);

  const climateRegions = climateData?.regions ?? [];

  async function handleSubmit() {
    setApiError(null);
    const { data, errors } = parseBuildingFormValues(values, t);
    setValidationErrors(errors);
    if (!data) return;

    try {
      await updateBuilding.mutateAsync(data);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError({ message: err.message, details: err.details });
      } else {
        setApiError({ message: err instanceof Error ? err.message : t("edit.updateFailed") });
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("edit.title")}</DialogTitle>
        </DialogHeader>

        <BuildingFormFields
          values={values}
          onChange={setValues}
          climateRegions={climateRegions}
          climateRegionsLoading={climateLoading}
          idPrefix="edit-building"
        />

        {validationErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">{t("edit.pleaseFix")}</p>
            <ul className="mt-1 list-inside list-disc">
              {validationErrors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}

        {apiError && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">{apiError.message}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("edit.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={updateBuilding.isPending}>
            {updateBuilding.isPending ? t("edit.saving") : t("edit.saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
