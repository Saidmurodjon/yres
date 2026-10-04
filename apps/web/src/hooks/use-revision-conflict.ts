import { useState } from "react";
import { ApiError } from "../lib/api";

export interface RevisionConflictState {
  /** The entity's actual revision right now, per the server's 409 body (A10-expected-revision.md §3). */
  currentRevision: number;
}

/**
 * Shared plumbing for A10's "someone else changed this section" 409 (`code: "revision_conflict"`).
 * `check(err)` records the conflict (so the caller's `RevisionConflictDialog` can render) and returns
 * `true` when `err` is that specific conflict; the caller does `if (check(err)) return;` before its
 * normal error handling, so an unrelated failure still surfaces its own message
 * (forms-and-numbers.md: a save failure is never silently swallowed).
 */
export function useRevisionConflict() {
  const [conflict, setConflict] = useState<RevisionConflictState | null>(null);

  function check(err: unknown): boolean {
    if (err instanceof ApiError && err.code === "revision_conflict") {
      setConflict({ currentRevision: err.currentRevision ?? 0 });
      return true;
    }
    return false;
  }

  return { conflict, check, clear: () => setConflict(null) };
}
