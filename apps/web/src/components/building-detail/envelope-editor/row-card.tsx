import { Button } from "@yres/ui";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

export function RowCard({
  children,
  onRemove,
  headerExtra,
}: {
  children: ReactNode;
  onRemove: () => void;
  headerExtra?: ReactNode;
}) {
  const { t } = useTranslation("envelope");
  return (
    <div className="space-y-3 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <div>{headerExtra}</div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
          {t("editor.remove")}
        </Button>
      </div>
      {children}
    </div>
  );
}
