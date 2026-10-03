import {
  type NumberLocale,
  type ParseResult,
  formatNumberForInput,
  parseLocaleNumber,
} from "./number";

/**
 * The single place where a stored fraction (0.02) and the percent a user types (2) are converted.
 * Rounded to 10 decimals so `0.028 * 100` shows `2,8`, not `2,8000000000000003`.
 */
const round = (value: number) => Number(value.toFixed(10));

/** Server fraction → text for a percent field. */
export function fractionToPercentText(fraction: number | null, locale: NumberLocale): string {
  return fraction === null ? "" : formatNumberForInput(round(fraction * 100), locale);
}

/** Text of a percent field → fraction (`2` → `0.02`); same result shape as `parseLocaleNumber`. */
export function parsePercentAsFraction(raw: string, locale: NumberLocale): ParseResult {
  const parsed = parseLocaleNumber(raw, locale);
  return parsed.ok ? { ok: true, value: round(parsed.value / 100) } : parsed;
}
