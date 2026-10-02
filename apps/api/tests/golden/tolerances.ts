/**
 * Golden tolerances — the "boshlang'ich" column of docs/production/06-sifat-test-va-reliz.md §2.3.
 * One table, keyed by the expected.json `class` and the id's field name. A value passes when
 * |actual − expected| ≤ max(abs, rel · |expected|) (either part may be absent).
 * Never widen a tolerance to make a test green — list a divergence in divergences.json instead.
 */
export interface Tolerance {
  rel?: number;
  abs?: number;
}

export function toleranceFor(id: string, cls: string): Tolerance {
  const field = id.split(".").pop() ?? id;
  if (cls === "G0") return { rel: 0.001 };
  if (/payback/i.test(field))
    return { abs: id.includes("discounted") || /discounted/i.test(field) ? 0.2 : 0.1 };
  if (/^npv/i.test(field)) return { rel: 0.02, abs: 50 };
  if (/^irr/i.test(field)) return { abs: 0.002 }; // 0.2 percentage points, IRR is stored as a fraction
  if (/(investment|cost)Usd$/.test(field)) return { abs: 0.01 }; // CAPEX is an input sum
  if (id.startsWith("calibration.")) return { rel: 0.005 };
  if (id.startsWith("compare.")) return { abs: 1.0 };
  if (cls === "G5") return { rel: 0.01 };
  if (cls === "G3") return { rel: 0.02 };
  return { rel: 0.01 }; // G1, G2, G4 remainder
}

export function withinTolerance(actual: number, expected: number, tol: Tolerance): boolean {
  const allowed = Math.max(tol.abs ?? 0, (tol.rel ?? 0) * Math.abs(expected));
  return Math.abs(actual - expected) <= allowed;
}
