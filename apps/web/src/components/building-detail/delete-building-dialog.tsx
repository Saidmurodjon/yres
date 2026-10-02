import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteBuilding } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { Building } from "../../lib/api-types";
import { ConfirmDialog } from "../confirm-dialog";
import { useRunWithoutBlocking } from "../unsaved-changes";

interface DeleteBuildingDialogProps {
  building: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBuildingDialog({ building, open, onOpenChange }: DeleteBuildingDialogProps) {
  const { t } = useTranslation("buildings");
  const navigate = useNavigate();
  const runWithoutBlocking = useRunWithoutBlocking();
  const deleteBuilding = useDeleteBuilding();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteBuilding.mutateAsync(building.id);
      // Deleted for good: whatever was unsaved on this page is moot, so leaving must not ask.
      await runWithoutBlocking(() => navigate({ to: "/buildings" }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("delete.deleteFailed"));
    }
  }

  return (
    <ConfirmDialog
      open={open}
      title={t("delete.title", { name: building.name })}
      description={t("delete.description")}
      confirmLabel={deleteBuilding.isPending ? t("delete.deleting") : t("delete.deleteBuilding")}
      cancelLabel={t("delete.cancel")}
      destructive
      pending={deleteBuilding.isPending}
      error={error}
      onConfirm={handleDelete}
      onCancel={() => {
        setError(null);
        onOpenChange(false);
      }}
    />
  );
}
