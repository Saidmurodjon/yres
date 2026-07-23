import type { ReportAnnotationSectionKey } from "@yres/types";
import { Button, Label, Textarea } from "@yres/ui";
import { PenLine } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { useReportAnnotations, useUpsertReportAnnotation } from "../hooks/use-audit";

/**
 * Freeform note an auditor can attach to a specific chart/section, surfaced
 * verbatim (italic) under the matching chart in the PDF report
 * (`report.service.ts`, docs/report-redesign-proposal.md §5b). One instance
 * per `sectionKey` — several can render on the same page since
 * `useReportAnnotations` shares its query cache across them.
 */
export function AuditorNote({
  buildingId,
  sectionKey,
  readOnly = false,
}: {
  buildingId: string;
  sectionKey: ReportAnnotationSectionKey;
  readOnly?: boolean;
}) {
  const { t } = useTranslation("common");
  const annotationsQuery = useReportAnnotations(buildingId);
  const upsert = useUpsertReportAnnotation(buildingId);
  const savedNote = annotationsQuery.data?.annotations?.[sectionKey] ?? "";
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(savedNote);
  const textareaId = useId();

  useEffect(() => {
    if (!isEditing) setDraft(savedNote);
  }, [savedNote, isEditing]);

  if (readOnly) {
    if (!savedNote) return null;
    return <p className="mt-3 text-sm italic text-muted-foreground">{savedNote}</p>;
  }

  if (!isEditing) {
    return savedNote ? (
      <button
        type="button"
        className="mt-3 flex items-start gap-1.5 text-left text-sm italic text-muted-foreground hover:text-foreground"
        onClick={() => setIsEditing(true)}
      >
        <PenLine className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {savedNote}
      </button>
    ) : (
      <Button
        variant="ghost"
        size="sm"
        className="mt-3 text-muted-foreground"
        onClick={() => setIsEditing(true)}
      >
        <PenLine className="h-3.5 w-3.5" />
        {t("addNote")}
      </Button>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <Label htmlFor={textareaId} className="text-xs font-medium text-muted-foreground">
        {t("auditorNote")}
      </Label>
      <Textarea
        id={textareaId}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t("auditorNotePlaceholder")}
        rows={2}
        autoFocus
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={upsert.isPending}
          onClick={() =>
            upsert.mutate(
              { sectionKey, note: draft.trim() },
              { onSuccess: () => setIsEditing(false) },
            )
          }
        >
          {upsert.isPending ? t("saving") : t("save")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={upsert.isPending}
          onClick={() => {
            setDraft(savedNote);
            setIsEditing(false);
          }}
        >
          {t("cancel")}
        </Button>
      </div>
    </div>
  );
}
