import { useCallback, useEffect, useRef, useState } from "react";

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
  const [rows, setRowsState] = useState<T[]>(serverRows);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  const serverRowsRef = useRef(serverRows);
  serverRowsRef.current = serverRows;
  const serverSignature = JSON.stringify(serverRows);
  const lastSignature = useRef(serverSignature);
  const lastResetKey = useRef(resetKey);

  useEffect(() => {
    const resetChanged = resetKey !== lastResetKey.current;
    const serverChanged = serverSignature !== lastSignature.current;
    lastResetKey.current = resetKey;
    lastSignature.current = serverSignature;
    if (resetChanged || (serverChanged && !dirtyRef.current)) {
      setRowsState(serverRowsRef.current);
      dirtyRef.current = false;
      setDirty(false);
    }
  }, [serverSignature, resetKey]);

  const setRows = useCallback((updater: T[] | ((prev: T[]) => T[])) => {
    dirtyRef.current = true;
    setDirty(true);
    setRowsState(updater);
  }, []);

  const markClean = useCallback(() => {
    dirtyRef.current = false;
    setDirty(false);
  }, []);

  return { rows, setRows, dirty, markClean };
}
