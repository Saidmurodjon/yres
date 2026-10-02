import { useBlocker } from "@tanstack/react-router";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "./confirm-dialog";

/**
 * Unsaved-edit protection (forms-and-numbers.md): no form silently throws edits away. Every editor registers
 * whether it is dirty (`useRegisterDirty`); anything that would discard the edits — switching a tab or
 * scenario, leaving the route, closing the page — asks first (`useConfirmDiscard`, the router blocker below,
 * `beforeunload`).
 *
 * Why plain React state and not Zustand: the flags belong to ONE mounted page and must die with it; a global
 * store could carry a stale "dirty" flag over to another building. It is ephemeral UI state, not data that
 * comes from the database, so the TanStack Query / Zustand boundary in ui-guidelines.md is not crossed.
 */
interface UnsavedChangesContextValue {
  register: (key: string, dirty: boolean) => void;
  unregister: (key: string) => void;
  isDirtyRef: { readonly current: boolean };
  /**
   * Runs `action` at once when nothing is dirty, otherwise after the user confirms discarding. The action
   * MUST unmount or reset every dirty editor (a tab switch unmounts, a scenario switch changes the
   * `useSyncedRows` reset key, closing a dialog sets its dirty to false): the provider does not clear the
   * flags itself, because an editor that stayed mounted with unsaved text would then look clean.
   */
  confirmDiscard: (action: () => void) => void;
}

const NOOP_CONTEXT: UnsavedChangesContextValue = {
  register: () => {},
  unregister: () => {},
  isDirtyRef: { current: false },
  confirmDiscard: (action) => action(),
};

const UnsavedChangesContext = createContext<UnsavedChangesContextValue>(NOOP_CONTEXT);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation("common");
  const [dirtyByKey, setDirtyByKey] = useState<ReadonlyMap<string, boolean>>(new Map());
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const isDirty = useMemo(() => [...dirtyByKey.values()].some(Boolean), [dirtyByKey]);
  // The router calls shouldBlockFn at navigation time; a ref keeps it from reading a stale closure.
  const isDirtyRef = useRef(false);
  isDirtyRef.current = isDirty;

  const register = useCallback((key: string, dirty: boolean) => {
    setDirtyByKey((prev) => {
      if (prev.get(key) === dirty) return prev;
      const next = new Map(prev);
      next.set(key, dirty);
      return next;
    });
  }, []);

  const unregister = useCallback((key: string) => {
    setDirtyByKey((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Map(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const confirmDiscard = useCallback((action: () => void) => {
    if (!isDirtyRef.current) {
      action();
      return;
    }
    // Wrapped in a function: a bare function passed to setState would be called as an updater.
    setPendingAction(() => action);
  }, []);

  const blocker = useBlocker({
    shouldBlockFn: () => isDirtyRef.current,
    enableBeforeUnload: () => isDirtyRef.current,
    withResolver: true,
  });

  const blocked = blocker.status === "blocked";

  const value = useMemo(
    () => ({ register, unregister, isDirtyRef, confirmDiscard }),
    [register, unregister, confirmDiscard],
  );

  return (
    <UnsavedChangesContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={blocked || pendingAction !== null}
        title={t("unsaved.title")}
        description={t("unsaved.description")}
        confirmLabel={t("unsaved.discard")}
        cancelLabel={t("unsaved.stay")}
        destructive
        onConfirm={() => {
          if (blocker.status === "blocked") blocker.proceed();
          else pendingAction?.();
          setPendingAction(null);
        }}
        onCancel={() => {
          if (blocker.status === "blocked") blocker.reset();
          setPendingAction(null);
        }}
      />
    </UnsavedChangesContext.Provider>
  );
}

/** Tells the nearest provider whether this editor has unsaved edits. Unregisters itself on unmount. */
export function useRegisterDirty(key: string, dirty: boolean) {
  const { register, unregister } = useContext(UnsavedChangesContext);
  useEffect(() => {
    register(key, dirty);
  }, [register, key, dirty]);
  useEffect(() => () => unregister(key), [unregister, key]);
}

/** `(action) => void`: runs `action` immediately when clean, otherwise after "discard unsaved changes?" is confirmed. */
export function useConfirmDiscard() {
  return useContext(UnsavedChangesContext).confirmDiscard;
}
