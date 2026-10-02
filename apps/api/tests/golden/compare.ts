import type { AuditResult } from "@yres/types";
import type { AuditInputs } from "../../src/services/audit-inputs";
import { computeAudit } from "../../src/services/audit.engine";
import expectedJson from "./fixtures/3-dmtt/v7.20/expected.json";
import { loadGoldenInputs } from "./load-inputs";
import { MAPPING } from "./mapping";
import { type Tolerance, toleranceFor, withinTolerance } from "./tolerances";

export interface ExpectedEntry {
  id: string;
  excel: string;
  class: string;
  value?: number;
  kind?: "none" | "text";
  text?: string;
  values?: (number | null)[];
}

export const EXPECTED = (expectedJson as unknown as { entries: ExpectedEntry[] }).entries;

export interface Mismatch {
  id: string;
  excel: string;
  actual: number | string | null;
  expected: number | string | null;
  deltaPct: number | null;
  tolerance: Tolerance;
}

export interface GoldenRun {
  result: AuditResult;
  inputs: AuditInputs;
  /** ids present in the mapping that fall outside tolerance */
  mismatches: Mismatch[];
  /** ids present in the mapping and within tolerance */
  matched: string[];
}

export function runGolden(): GoldenRun {
  const inputs = loadGoldenInputs();
  const result = computeAudit(inputs, { generatedAt: "2026-01-01T00:00:00.000Z" });
  const mismatches: Mismatch[] = [];
  const matched: string[] = [];
  for (const entry of EXPECTED) {
    const accessor = MAPPING[entry.id];
    if (!accessor) continue;
    const actual = accessor(result, inputs);
    const expected =
      entry.kind === "none"
        ? null
        : entry.kind === "text"
          ? (entry.text ?? "")
          : (entry.value ?? null);
    const tol = toleranceFor(entry.id, entry.class);
    let ok: boolean;
    if (typeof expected === "number" && typeof actual === "number")
      ok = withinTolerance(actual, expected, tol);
    else ok = actual === expected; // null ↔ "none" and text are exact
    if (ok) matched.push(entry.id);
    else {
      const deltaPct =
        typeof expected === "number" && typeof actual === "number" && expected !== 0
          ? ((actual - expected) / Math.abs(expected)) * 100
          : null;
      mismatches.push({
        id: entry.id,
        excel: entry.excel,
        actual,
        expected,
        deltaPct,
        tolerance: tol,
      });
    }
  }
  return { result, inputs, mismatches, matched };
}
