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
import { useUpdateUserStatus } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { AdminUser } from "../../lib/api-types";

interface DeactivateUserDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Confirmation is only needed going active → inactive; reactivating isn't destructive, so it's a plain button in admin/users.tsx with no dialog. */
export function DeactivateUserDialog({ user, open, onOpenChange }: DeactivateUserDialogProps) {
  const { t } = useTranslation("admin");
  const updateStatus = useUpdateUserStatus();
  const [error, setError] = useState<string | null>(null);

  async function handleDeactivate() {
    setError(null);
    try {
      await updateStatus.mutateAsync({ userId: user.id, isActive: false });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("deactivate.failed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deactivate.title", { name: user.name })}</DialogTitle>
          <DialogDescription>{t("deactivate.description")}</DialogDescription>
        </DialogHeader>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("deactivate.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeactivate}
            disabled={updateStatus.isPending}
          >
            {updateStatus.isPending ? t("deactivate.deactivating") : t("deactivate.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
