/**
 * Engine version for `computeAudit()` (`audit.engine.ts`) — recorded on every snapshot (A04/A05)
 * so a bank/regulator can prove which engine version produced a given result. See
 * `.claude/rules/calculation-engine.md` for the bump rule; summary:
 *
 * - Numbers `computeAudit` returns change for some input (formula, default, new term) → MINOR.
 * - Only shape changes (new optional field, existing numbers unchanged) → PATCH.
 * - Methodology book version changes (e.g. v7.20 → v7.21) or a field is removed from
 *   `AuditResult` → MAJOR, and bump `METHODOLOGY_VERSION` too.
 * - Pure refactor (byte-for-byte identical result) → do not bump.
 *
 * Bump in the same commit as any change to computeAudit's output.
 */
export const ENGINE_VERSION = "0.9.0";

/** Methodology the engine targets — the golden fixture's workbook (calculation-engine.md). */
export const METHODOLOGY_VERSION = "3-DMTT v7.20";
