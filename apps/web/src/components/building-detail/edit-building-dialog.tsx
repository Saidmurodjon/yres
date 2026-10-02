import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@yres/ui";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useClimateRegions, useUpdateBuilding } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { Building } from "../../lib/api-types";
import { toNumberLocale } from "../../lib/number";
import {
  BuildingFormFields,
  type BuildingFormValues,
  buildingToFormValues,
  parseBuildingFormValues,
} from "../buildings/building-form-fields";
import { ConfirmDialog } from "../confirm-dialog";
import { useRegisterDirty } from "../unsaved-changes";

interface EditBuildingDialogProps {
  building: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditBuildingDialog({ building, open, onOpenChange }: EditBuildingDialogProps) {
  const { t, i18n } = useTranslation("buildings");
  const numberLocale = toNumberLocale(i18n.language);
  const { data: climateData, isLoading: climateLoading } = useClimateRegions({ pageSize: 100 });
  const updateBuilding = useUpdateBuilding(building.id);

  // The form as it looked when opened; anything different is an unsaved edit.
  const baselineRef = useRef("");
  const [values, setValues] = useState<BuildingFormValues>(() => {
    const initial = buildingToFormValues(building, numberLocale);
    baselineRef.current = JSON.stringify(initial);
    return initial;
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty = open && JSON.stringify(values) !== baselineRef.current;
  useRegisterDirty("building.edit", dirty);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<{ message: string; details?: unknown } | null>(null);

  // Re-sync only when the dialog OPENS: a refetch of `building` while it is open must not overwrite typing.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see above.
  useEffect(() => {
    if (open) {
      const initial = buildingToFormValues(building, numberLocale);
      baselineRef.current = JSON.stringify(initial);
      setValues(initial);
      setConfirmClose(false);
      setValidationErrors([]);
      setApiError(null);
    }
  }, [open]);

  const climateRegions = climateData?.regions ?? [];

  // Esc, a click outside, the × and "Cancel" all come through here: unsaved edits are never dropped silently.
  function requestClose() {
    if (dirty) setConfirmClose(true);
    else onOpenChange(false);
  }

  async function handleSubmit() {
    setApiError(null);
    const { data, errors } = parseBuildingFormValues(values, t, numberLocale);
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
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
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
            <Button variant="outline" onClick={requestClose}>
              {t("edit.cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={updateBuilding.isPending}>
              {updateBuilding.isPending ? t("edit.saving") : t("edit.saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        title={t("common:unsaved.title")}
        description={t("common:unsaved.description")}
        confirmLabel={t("common:unsaved.discard")}
        cancelLabel={t("common:unsaved.stay")}
        destructive
        onConfirm={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
        onCancel={() => setConfirmClose(false)}
      />
    </>
  );
}
