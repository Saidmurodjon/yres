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
import { useDeleteBuilding } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { Building } from "../../lib/api-types";

interface DeleteBuildingDialogProps {
  building: Building;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteBuildingDialog({ building, open, onOpenChange }: DeleteBuildingDialogProps) {
  const navigate = useNavigate();
  const deleteBuilding = useDeleteBuilding();
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setError(null);
    try {
      await deleteBuilding.mutateAsync(building.id);
      navigate({ to: "/buildings" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete building.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete "{building.name}"?</DialogTitle>
          <DialogDescription>
            This permanently deletes the building along with its envelope, consumption, and measure
            data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleteBuilding.isPending}>
            {deleteBuilding.isPending ? "Deleting..." : "Delete building"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
