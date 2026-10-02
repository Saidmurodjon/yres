import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateUserStatus } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { AdminUser } from "../../lib/api-types";
import { ConfirmDialog } from "../confirm-dialog";

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
    <ConfirmDialog
      open={open}
      title={t("deactivate.title", { name: user.name })}
      description={t("deactivate.description")}
      confirmLabel={updateStatus.isPending ? t("deactivate.deactivating") : t("deactivate.confirm")}
      cancelLabel={t("deactivate.cancel")}
      destructive
      pending={updateStatus.isPending}
      error={error}
      onConfirm={handleDeactivate}
      onCancel={() => {
        setError(null);
        onOpenChange(false);
      }}
    />
  );
}
