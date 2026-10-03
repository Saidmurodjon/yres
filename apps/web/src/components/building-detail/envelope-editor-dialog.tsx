import type { Scenario } from "@yres/types";
import { Button, Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@yres/ui";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMaterials, useReplaceEnvelope, useSurfaceResistance } from "../../hooks";
import { ApiError } from "../../lib/api";
import type { EnvelopeData } from "../../lib/api-types";
import { toNumberLocale } from "../../lib/number";
import { ConfirmDialog } from "../confirm-dialog";
import { useRegisterDirty } from "../unsaved-changes";
import { BuildingBlocksStep } from "./envelope-editor/building-blocks-step";
import { ConstructionTypesStep } from "./envelope-editor/construction-types-step";
import { EnvelopeElementsStep } from "./envelope-editor/envelope-elements-step";
import { OpeningTypesStep } from "./envelope-editor/opening-types-step";
import {
  type EditorState,
  beforeTypeOptions,
  parseEditorState,
  toEditorState,
} from "./envelope-editor/state";

type EditorStep = "blocks" | "constructionTypes" | "openingTypes" | "elements";
const STEP_IDS: EditorStep[] = ["blocks", "constructionTypes", "openingTypes", "elements"];
// "After" only edits the types (geometry is the "before" state's), so blocks/elements are not shown.
const AFTER_STEP_IDS: EditorStep[] = ["constructionTypes", "openingTypes"];

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
  const { t, i18n } = useTranslation("envelope");
  const locale = toNumberLocale(i18n.language);
  const { data: materialsData, isLoading: materialsLoading } = useMaterials();
  const { data: surfaceResistanceData } = useSurfaceResistance();
  const replaceEnvelope = useReplaceEnvelope(buildingId);
  const materials = materialsData?.materials ?? [];
  const surfaceResistances = surfaceResistanceData?.surfaceResistances ?? [];

  // What the editor looked like when it was opened (rowIds differ per call, so compare the serialized state):
  // anything different is an unsaved edit.
  const baselineRef = useRef("");
  const [scenario, setScenario] = useState<Scenario>("before");
  const [pendingScenario, setPendingScenario] = useState<Scenario | null>(null);
  const stepIds = scenario === "before" ? STEP_IDS : AFTER_STEP_IDS;
  const beforeTypes = beforeTypeOptions(envelope);
  const [state, setState] = useState<EditorState>(() => {
    const initial = toEditorState(envelope, locale, "before");
    baselineRef.current = JSON.stringify(initial);
    return initial;
  });
  const [confirmClose, setConfirmClose] = useState(false);
  const dirty = open && JSON.stringify(state) !== baselineRef.current;
  useRegisterDirty("envelope.editor", dirty);
  const [step, setStep] = useState<EditorStep>("blocks");
  const [errors, setErrors] = useState<string[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: only re-sync from server data when the dialog transitions to open, not on every envelope refetch while it's open (that would clobber in-progress edits).
  useEffect(() => {
    if (open) {
      const initial = toEditorState(envelope, locale, "before");
      baselineRef.current = JSON.stringify(initial);
      setScenario("before");
      setPendingScenario(null);
      setState(initial);
      setConfirmClose(false);
      setStep("blocks");
      setErrors([]);
      setApiError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setApiError(null);
    const { payload, errors: validationErrors } = parseEditorState(
      state,
      t,
      locale,
      scenario,
      beforeTypes,
    );
    setErrors(validationErrors);
    if (!payload) return;

    try {
      await replaceEnvelope.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setApiError(err instanceof ApiError ? err.message : t("editor.saveFailed"));
    }
  }

  // Esc, a click outside, the × and "Cancel" all come through here: unsaved edits are never dropped silently.
  function requestClose() {
    if (dirty) setConfirmClose(true);
    else onOpenChange(false);
  }

  function applyScenario(next: Scenario) {
    const initial = toEditorState(envelope, locale, next);
    baselineRef.current = JSON.stringify(initial);
    setScenario(next);
    setState(initial);
    setStep(next === "before" ? "blocks" : "constructionTypes");
    setErrors([]);
    setApiError(null);
  }

  // Switching mode swaps the whole editor state, so unsaved edits ask first (same rule as closing).
  function requestScenario(next: Scenario) {
    if (next === scenario) return;
    if (dirty) setPendingScenario(next);
    else applyScenario(next);
  }

  const steps: { id: EditorStep; label: string }[] = stepIds.map((id) => ({
    id,
    label: t(`editor.steps.${id}`),
  }));
  const stepIndex = stepIds.indexOf(step);
  const blockNames = state.buildingBlocks.map((b) => b.name).filter(Boolean);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
        <DialogContent className="flex h-[85vh] max-w-6xl flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>
              {scenario === "before" ? t("editor.title") : t("editor.titleAfter")}
            </DialogTitle>
          </DialogHeader>

          <fieldset className="flex gap-2 border-0 p-0">
            <legend className="sr-only">{t("editor.scenario.label")}</legend>
            {(["before", "after"] as const).map((sc) => (
              <Button
                key={sc}
                type="button"
                size="sm"
                variant={scenario === sc ? "default" : "outline"}
                aria-pressed={scenario === sc}
                onClick={() => requestScenario(sc)}
              >
                {t(`editor.scenario.${sc}`)}
              </Button>
            ))}
          </fieldset>

          <p className="text-sm text-muted-foreground">
            {scenario === "before" ? t("editor.description") : t("editor.descriptionAfter")}
          </p>

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
                retrofitOptions={scenario === "after" ? beforeTypes.constructionTypes : undefined}
                materials={materials}
                materialsLoading={materialsLoading}
                surfaceResistances={surfaceResistances}
                onChange={(constructionTypes) => setState((s) => ({ ...s, constructionTypes }))}
              />
            )}
            {step === "openingTypes" && (
              <OpeningTypesStep
                rows={state.openingTypes}
                retrofitOptions={scenario === "after" ? beforeTypes.openingTypes : undefined}
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
                onClick={() => setStep(stepIds[stepIndex - 1] ?? stepIds[0] ?? "blocks")}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("editor.previousStep")}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={stepIndex === stepIds.length - 1}
                onClick={() => setStep(stepIds[stepIndex + 1] ?? "elements")}
              >
                {t("editor.nextStep")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={requestClose}>
                {t("common:cancel")}
              </Button>
              <Button onClick={handleSubmit} disabled={replaceEnvelope.isPending}>
                {replaceEnvelope.isPending ? t("common:saving") : t("editor.saveEnvelope")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmClose}
        title={t("common:unsaved.title")}
        description={t("common:unsaved.description")}
        confirmLabel={t("common:unsaved.discard")}
        cancelLabel={t("common:unsaved.stay")}
        destructive
        onConfirm={() => {
          setConfirmClose(false);
          onOpenChange(false);
        }}
        onCancel={() => setConfirmClose(false)}
      />
      <ConfirmDialog
        open={pendingScenario !== null}
        title={t("common:unsaved.title")}
        description={t("common:unsaved.description")}
        confirmLabel={t("common:unsaved.discard")}
        cancelLabel={t("common:unsaved.stay")}
        destructive
        onConfirm={() => {
          if (pendingScenario) applyScenario(pendingScenario);
          setPendingScenario(null);
        }}
        onCancel={() => setPendingScenario(null)}
      />
    </>
  );
}
