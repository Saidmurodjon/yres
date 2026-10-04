import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yres/ui";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

export interface RevisionConflictDialogProps {
  open: boolean;
  /** Disables both buttons and spins the overwrite one while the retried save is in flight. */
  pending?: boolean;
  /** Re-sends the save with the server's `currentRevision`, overwriting their change with the user's edits. */
  onOverwrite: () => void | Promise<void>;
  /** Discards the user's edits and reloads the server's current version. */
  onReload: () => void | Promise<void>;
}

/**
 * A10 (web): the 409 `revision_conflict` dialog — two foundational choices are offered, both named by
 * their effect (forms-and-numbers.md: edits are never silently discarded). There is deliberately no
 * dismiss/cancel: one of the two is required, so Escape/overlay-click are no-ops here.
 */
export function RevisionConflictDialog({
  open,
  pending = false,
  onOverwrite,
  onReload,
}: RevisionConflictDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          // The non-destructive-to-the-server choice (keep editing elsewhere, discard locally) gets focus.
          event.preventDefault();
          document.querySelector<HTMLButtonElement>("[data-revision-reload]")?.focus();
        }}
        onEscapeKeyDown={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{t("revisionConflict.title")}</DialogTitle>
          <DialogDescription>{t("revisionConflict.description")}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            data-revision-reload
            type="button"
            variant="outline"
            onClick={() => void onReload()}
            disabled={pending}
          >
            {t("revisionConflict.reload")}
          </Button>
          <Button type="button" onClick={() => void onOverwrite()} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("revisionConflict.overwrite")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
