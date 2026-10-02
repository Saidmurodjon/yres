import { useCallback, useEffect, useReducer, useRef } from "react";

/**
 * State machine behind `useSyncedRows`, pure so it can be unit-tested without React (use-synced-rows.test.ts).
 *
 * The "server" action is the server data (or the reset key) changing; "clean" is a successful save. A refetch
 * may land BEFORE `markClean()` (React Query gives no ordering between `await mutateAsync` returning and the
 * invalidated query finishing): then the rows are dirty when the new server data arrives, so the sync is
 * skipped and remembered (`missedSync`), and "clean" applies it. If the refetch lands AFTER, the rows are
 * already clean and the "server" action applies it. Either order ends with the server's rows.
 */
export interface SyncedRowsState<T> {
  rows: T[];
  dirty: boolean;
  missedSync: boolean;
  lastSignature: string;
  lastResetKey: string;
}

export type SyncedRowsAction<T> =
  | { type: "server"; serverRows: T[]; signature: string; resetKey: string }
  | { type: "edit"; updater: T[] | ((prev: T[]) => T[]) }
  | { type: "clean"; serverRows: T[] };

export function initialSyncedRowsState<T>(
  serverRows: T[],
  signature: string,
  resetKey: string,
): SyncedRowsState<T> {
  return {
    rows: serverRows,
    dirty: false,
    missedSync: false,
    lastSignature: signature,
    lastResetKey: resetKey,
  };
}

export function syncedRowsReducer<T>(
  state: SyncedRowsState<T>,
  action: SyncedRowsAction<T>,
): SyncedRowsState<T> {
  switch (action.type) {
    case "server": {
      const { serverRows, signature, resetKey } = action;
      if (resetKey !== state.lastResetKey) {
        // A different scenario/section view: always show the server's rows (callers confirm discarding first).
        return initialSyncedRowsState(serverRows, signature, resetKey);
      }
      if (signature === state.lastSignature) return state;
      if (state.dirty) return { ...state, missedSync: true, lastSignature: signature };
      return { ...state, rows: serverRows, lastSignature: signature };
    }
    case "edit": {
      const rows =
        typeof action.updater === "function" ? action.updater(state.rows) : action.updater;
      return { ...state, rows, dirty: true };
    }
    case "clean": {
      if (state.missedSync) {
        return { ...state, rows: action.serverRows, dirty: false, missedSync: false };
      }
      return { ...state, dirty: false };
    }
  }
}

/**
 * Editable rows that follow the server's data WITHOUT trampling the user's edits (forms-and-numbers.md, U2).
 *
 * The old pattern `useEffect(() => setRows(fromServer), [server])` replaced every card's rows whenever ANY
 * query refetched — saving one card wiped the unsaved rows typed into its neighbours. Here:
 *  - `serverRows` changing re-syncs the rows ONLY while they are clean (`dirty === false`);
 *  - `resetKey` changing (e.g. the scenario tab) always re-syncs and marks clean — the caller is expected to
 *    allow that only after the user confirmed discarding (`useConfirmDiscard`);
 *  - any `setRows` marks the rows dirty; call `markClean()` after a successful save.
 *
 * "Did the server data change?" is decided by `JSON.stringify` of `serverRows`: callers typically build the
 * array fresh on every render (a new reference each time), so reference equality would re-sync constantly,
 * and these row sets are small enough that serializing them is cheaper than a deep-compare helper.
 */
export function useSyncedRows<T>(
  serverRows: T[],
  resetKey: string,
): {
  rows: T[];
  setRows: (updater: T[] | ((prev: T[]) => T[])) => void;
  dirty: boolean;
  markClean: () => void;
} {
  const signature = JSON.stringify(serverRows);
  const [state, dispatch] = useReducer(
    syncedRowsReducer as (s: SyncedRowsState<T>, a: SyncedRowsAction<T>) => SyncedRowsState<T>,
    undefined,
    () => initialSyncedRowsState(serverRows, signature, resetKey),
  );
  // The latest server rows, readable from callbacks without making them depend on a fresh array every render.
  const serverRowsRef = useRef(serverRows);
  serverRowsRef.current = serverRows;

  useEffect(() => {
    dispatch({ type: "server", serverRows: serverRowsRef.current, signature, resetKey });
  }, [signature, resetKey]);

  const setRows = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    dispatch({ type: "edit", updater });
  }, []);

  const markClean = useCallback(() => {
    dispatch({ type: "clean", serverRows: serverRowsRef.current });
  }, []);

  return { rows: state.rows, setRows, dirty: state.dirty, markClean };
}
