import type { EndUse, Scenario } from "@yres/types";

/**
 * Chart colors are derived from the design system's CSS custom properties
 * (packages/ui/src/styles/globals.css) rather than Recharts' default
 * palette, so charts match the rest of the UI and stay correct in both
 * light and dark mode (the tokens themselves flip with `data-theme`).
 *
 * The design system only defines a handful of hues (primary, success,
 * warning, destructive, muted-foreground) rather than a full 8-slot
 * categorical ramp, so the assignments below are fixed and documented here
 * rather than generated — each chart reuses the same slot for the same
 * meaning rather than re-deriving colors ad hoc.
 */
export const CHART_COLORS = {
  primary: "hsl(var(--primary))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  muted: "hsl(var(--muted-foreground))",
  grid: "hsl(var(--border))",
} as const;

/**
 * Before/after scenario comparison. This is an "emphasis" pairing, not an
 * arbitrary 2-color categorical: "after" (the retrofit outcome) is the
 * point, "before" (the baseline) is context, so before is de-emphasized
 * gray and after carries the accent.
 */
export const SCENARIO_COLORS: Record<Scenario, string> = {
  before: CHART_COLORS.muted,
  after: CHART_COLORS.primary,
};

/**
 * Fixed categorical order for end-use energy series (heating / DHW /
 * cooling) — used consistently across the breakdown pie and any stacked
 * views so the same end use always reads as the same color.
 */
export const END_USE_COLORS: Record<EndUse, string> = {
  heating: CHART_COLORS.primary,
  dhw: CHART_COLORS.warning,
  cooling: CHART_COLORS.success,
};

/**
 * Monthly heat balance series (EN ISO 13790). Gains and losses carry a
 * real good/bad connotation (a gain offsets heating demand, a loss adds to
 * it) so they legitimately wear status-adjacent hues; net energy need is
 * the resulting quantity that must be supplied, in the neutral accent.
 */
export const BALANCE_COLORS = {
  gains: CHART_COLORS.success,
  losses: CHART_COLORS.warning,
  net: CHART_COLORS.primary,
} as const;

/** Diverging pair for values with a real positive/negative meaning (NPV). */
export const DIVERGING_COLORS = {
  positive: CHART_COLORS.success,
  negative: CHART_COLORS.destructive,
} as const;
