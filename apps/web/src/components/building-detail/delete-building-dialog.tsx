import { useNavigate } from "@tanstack/react-router";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yres/ui";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useDeleteBuilding } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { Building } from "../../lib/api-types";

interface DeleteBuildingDialogProps {
  building: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBuildingDialog({ building, open, onOpenChange }: DeleteBuildingDialogProps) {
  const { t } = useTranslation("buildings");
  const navigate = useNavigate();
  const deleteBuilding = useDeleteBuilding();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteBuilding.mutateAsync(building.id);
      navigate({ to: "/buildings" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("delete.deleteFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("delete.title", { name: building.name })}</DialogTitle>
          <DialogDescription>{t("delete.description")}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("delete.cancel")}
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteBuilding.isPending}>
            {deleteBuilding.isPending ? t("delete.deleting") : t("delete.deleteBuilding")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
