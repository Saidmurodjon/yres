import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@yres/ui";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMaterials, useReplaceEnvelope, useSurfaceResistance } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnvelopeData } from "../../lib/api-types";
import { BuildingBlocksStep } from "./envelope-editor/building-blocks-step";
import { ConstructionTypesStep } from "./envelope-editor/construction-types-step";
import { EnvelopeElementsStep } from "./envelope-editor/envelope-elements-step";
import { OpeningTypesStep } from "./envelope-editor/opening-types-step";
import { type EditorState, parseEditorState, toEditorState } from "./envelope-editor/state";

type EditorStep = "blocks" | "constructionTypes" | "openingTypes" | "elements";
const STEP_IDS: EditorStep[] = ["blocks", "constructionTypes", "openingTypes", "elements"];

interface EnvelopeEditorDialogProps {
  buildingId: string;
  envelope: EnvelopeData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EnvelopeEditorDialog({
  buildingId,
  envelope,
  open,
  onOpenChange,
}: EnvelopeEditorDialogProps) {
  const { t } = useTranslation("envelope");
  const { data: materialsData, isLoading: materialsLoading } = useMaterials();
  const { data: surfaceResistanceData } = useSurfaceResistance();
  const replaceEnvelope = useReplaceEnvelope(buildingId);
  const materials = materialsData?.materials ?? [];
  const surfaceResistances = surfaceResistanceData?.surfaceResistances ?? [];

  const [state, setState] = useState<EditorState>(() => toEditorState(envelope));
  const [step, setStep] = useState<EditorStep>("blocks");
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-sync from server data when the dialog transitions to open, not on every envelope refetch while it's open (that would clobber in-progress edits).
  useEffect(() => {
    if (open) {
      setState(toEditorState(envelope));
      setStep("blocks");
      setErrors([]);
      setApiError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setApiError(null);
    const { payload, errors: validationErrors } = parseEditorState(state, t);
    setErrors(validationErrors);
    if (!payload) return;

    try {
      await replaceEnvelope.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : t("editor.saveFailed"));
    }
  }

  const steps: { id: EditorStep; label: string }[] = STEP_IDS.map((id) => ({
    id,
    label: t(`editor.steps.${id}`),
  }));
  const stepIndex = STEP_IDS.indexOf(step);
  const blockNames = state.buildingBlocks.map((b) => b.name).filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-6xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t("editor.title")}</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{t("editor.description")}</p>

        <ol className="flex flex-wrap items-center gap-2 text-sm">
          {steps.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setStep(s.id)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium ${
                  step === s.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground"
                }`}
              >
                {i + 1}
              </button>
              <span className={step === s.id ? "font-medium" : "text-muted-foreground"}>
                {s.label}
              </span>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
            </li>
          ))}
        </ol>

        <div className="flex-1 overflow-y-auto pr-1">
          {step === "blocks" && (
            <BuildingBlocksStep
              rows={state.buildingBlocks}
              onChange={(buildingBlocks) => setState((s) => ({ ...s, buildingBlocks }))}
            />
          )}
          {step === "constructionTypes" && (
            <ConstructionTypesStep
              rows={state.constructionTypes}
              materials={materials}
              materialsLoading={materialsLoading}
              surfaceResistances={surfaceResistances}
              onChange={(constructionTypes) => setState((s) => ({ ...s, constructionTypes }))}
            />
          )}
          {step === "openingTypes" && (
            <OpeningTypesStep
              rows={state.openingTypes}
              onChange={(openingTypes) => setState((s) => ({ ...s, openingTypes }))}
            />
          )}
          {step === "elements" && (
            <EnvelopeElementsStep
              rows={state.envelopeElements}
              constructionTypes={state.constructionTypes}
              openingTypes={state.openingTypes}
              blockNames={blockNames}
              onChange={(envelopeElements) => setState((s) => ({ ...s, envelopeElements }))}
            />
          )}
        </div>

        {errors.length > 0 && (
          <div className="max-h-32 overflow-y-auto rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <p className="font-medium">{t("editor.pleaseFix")}</p>
            <ul className="mt-1 list-inside list-disc">
              {errors.map((msg) => (
                <li key={msg}>{msg}</li>
              ))}
            </ul>
          </div>
        )}
        {apiError && <p className="text-sm text-destructive">{apiError}</p>}

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepIndex === 0}
              onClick={() => setStep(STEP_IDS[stepIndex - 1] ?? "blocks")}
            >
              <ArrowLeft className="h-4 w-4" />
              {t("editor.previousStep")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={stepIndex === STEP_IDS.length - 1}
              onClick={() => setStep(STEP_IDS[stepIndex + 1] ?? "elements")}
            >
              {t("editor.nextStep")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common:cancel")}
            </Button>
            <Button onClick={handleSubmit} disabled={replaceEnvelope.isPending}>
              {replaceEnvelope.isPending ? t("common:saving") : t("editor.saveEnvelope")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
