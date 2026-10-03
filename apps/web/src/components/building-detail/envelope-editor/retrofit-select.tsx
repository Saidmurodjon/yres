import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@yres/ui";
import { useTranslation } from "react-i18next";
import type { BeforeTypeOption } from "./state";

/** "After" editor: which "before" type a row replaces. A before type can be replaced by one after type only. */
export function RetrofitOfSelect({
  id,
  value,
  category,
  options,
  takenCodes,
  onChange,
}: {
  id: string;
  value: string;
  category: string;
  options: BeforeTypeOption[];
  /** Before codes already chosen by other rows. */
  takenCodes: Set<string>;
  onChange: (code: string) => void;
}) {
  const { t } = useTranslation("envelope");
  const candidates = options.filter((o) => o.category === category);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t("editor.retrofit.replaces")} *</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger id={id}>
          <SelectValue placeholder={t("editor.retrofit.choose")} />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((o) => (
            <SelectItem
              key={o.code}
              value={o.code}
              disabled={takenCodes.has(o.code) && o.code !== value}
            >
              {o.code}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {candidates.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("editor.retrofit.noCandidates")}</p>
      )}
    </div>
  );
}

/** Before types nothing replaces — they stay as they are. */
export function KeptTypes({ codes }: { codes: string[] }) {
  const { t } = useTranslation("envelope");
  if (codes.length === 0) return null;
  return (
    <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
      {t("editor.retrofit.kept", { codes: codes.join(", ") })}
    </p>
  );
}
