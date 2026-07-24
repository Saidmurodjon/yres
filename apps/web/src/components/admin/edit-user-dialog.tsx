import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@yres/ui";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateAdminUser } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { AdminUser } from "../../lib/api-types";

interface EditUserDialogProps {
  user: AdminUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditUserDialog({ user, open, onOpenChange }: EditUserDialogProps) {
  const { t } = useTranslation("admin");
  const updateUser = useUpdateAdminUser();
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(user.name);
      setUsername(user.username);
      setError(null);
    }
  }, [open, user]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(t("edit.nameRequired"));
      return;
    }
    if (!username.trim()) {
      setError(t("edit.usernameRequired"));
      return;
    }

    try {
      await updateUser.mutateAsync({
        userId: user.id,
        data: { name: name.trim(), username: username.trim() },
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("edit.updateFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{t("edit.title", { name: user.name })}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-name">{t("edit.nameLabel")}</Label>
              <Input id="edit-user-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-user-username">{t("edit.usernameLabel")}</Label>
              <Input
                id="edit-user-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("edit.cancel")}
            </Button>
            <Button type="submit" disabled={updateUser.isPending}>
              {updateUser.isPending ? t("common:saving") : t("edit.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
