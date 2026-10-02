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

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  /** Default: the common "Cancel". */
  cancelLabel?: string;
  /** The confirm button is the red destructive variant (deleting, discarding). */
  destructive?: boolean;
  /** Confirm is disabled and shows a spinner while the action runs. */
  pending?: boolean;
  /** Why the action failed, shown inside the dialog (which the caller keeps open) — never swallowed. */
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * "Are you sure?" for actions that cannot be undone (forms-and-numbers.md): deleting a server object,
 * throwing away unsaved edits. Focus starts on Cancel — Enter/Space on a reflex does the safe thing — and
 * Esc, the overlay and the × all cancel.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !pending && onCancel()}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          // Radix would focus the first focusable element; the safe choice is the Cancel button.
          event.preventDefault();
          document.querySelector<HTMLButtonElement>("[data-confirm-cancel]")?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            ⚠ {error}
          </p>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            data-confirm-cancel
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel ?? t("cancel")}
          </Button>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            onClick={() => void onConfirm()}
            disabled={pending}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
