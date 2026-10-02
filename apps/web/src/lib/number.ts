/**
 * Locale-aware number parsing for form input (forms-and-numbers.md, U1).
 *
 * `<input type="number">` turns an uz/ru user's `12,5` into "" or 12 depending on the browser, and
 * `parseFloat`/`Number` accept or silently truncate whatever is typed ("12abc" → 12). Everything the user
 * types goes through `parseLocaleNumber` instead; callers must treat `invalid` as an error to show and
 * must never fall back to 0 or a default (a default is only for `empty`, and only if the business rule says so).
 */

export type NumberLocale = "uz" | "ru" | "en";

export type ParseResult = { ok: true; value: number } | { ok: false; reason: "empty" | "invalid" };

// Thousands separators other than `,`/`.`: space, no-break space, narrow no-break space, thin space, apostrophe.
// Built from strings so the invisible characters stay visible as escapes in the source.
const GROUPING_CLASS = "[ \\u00a0\\u202f\\u2009']";
const GROUPING_CHAR = new RegExp(GROUPING_CLASS);
const GROUPING_CHARS = new RegExp(GROUPING_CLASS, "g");
const UNICODE_MINUS = /−/g;
const STRICT_NUMBER = /^-?(\d+(\.\d*)?|\.\d+)$/;
// A thousands-grouped integer part: 1–3 digits (no leading zero), then groups of exactly 3.
const GROUPED_WITH_COMMA = /^-?[1-9]\d{0,2}(,\d{3})+$/;
const GROUPED_WITH_DOT = /^-?[1-9]\d{0,2}(\.\d{3})+$/;

const count = (text: string, char: string) => text.split(char).length - 1;

export function parseLocaleNumber(
  raw: string,
  locale: NumberLocale,
  opts?: { integer?: boolean },
): ParseResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, reason: "empty" };

  let text = trimmed.replace(UNICODE_MINUS, "-");

  // Space-like and apostrophe separators are accepted only as real thousands grouping ("1 234 567,5",
  // "1'234"); "12 5" or "1 2 3" would otherwise silently become a different number (125, 123).
  const groupingUsed = text.match(GROUPING_CHARS);
  if (groupingUsed) {
    const kinds = new Set(groupingUsed.map((char) => (char === "'" ? "'" : " ")));
    if (kinds.size > 1) return { ok: false, reason: "invalid" };
    const lastMark = Math.max(text.lastIndexOf(","), text.lastIndexOf("."));
    const integerPart = lastMark >= 0 ? text.slice(0, lastMark) : text;
    const fraction = lastMark >= 0 ? text.slice(lastMark) : "";
    if (GROUPING_CHAR.test(fraction)) return { ok: false, reason: "invalid" };
    const separator = kinds.has("'") ? "'" : GROUPING_CLASS;
    if (!new RegExp(`^-?[1-9]\\d{0,2}(?:${separator}\\d{3})+$`).test(integerPart)) {
      return { ok: false, reason: "invalid" };
    }
    text = integerPart.replace(GROUPING_CHARS, "") + fraction;
  }

  const commas = count(text, ",");
  const dots = count(text, ".");

  if (commas > 0 && dots > 0) {
    // The last separator is the decimal one, the other kind is a thousands separator.
    const decimal = text.lastIndexOf(",") > text.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    // One decimal mark, and everything before it must be a properly grouped integer part:
    // "1,234.5" and "1.234,5" are fine, "1,2.3" and "1.2,3.4" are not.
    const decimalAt = text.indexOf(decimal);
    const integerPart = text.slice(0, decimalAt);
    const grouped = thousands === "," ? GROUPED_WITH_COMMA : GROUPED_WITH_DOT;
    const plainInteger = /^-?\d+$/;
    const integerPartOk = integerPart.includes(thousands)
      ? grouped.test(integerPart)
      : plainInteger.test(integerPart) || integerPart === "" || integerPart === "-";
    if (count(text, decimal) !== 1 || !integerPartOk) return { ok: false, reason: "invalid" };
    text = text.replaceAll(thousands, "");
    if (decimal === ",") text = text.replace(",", ".");
  } else if (commas > 0) {
    if (commas > 1) {
      if (!GROUPED_WITH_COMMA.test(text)) return { ok: false, reason: "invalid" };
      text = text.replaceAll(",", "");
    } else if (locale === "en" && GROUPED_WITH_COMMA.test(text)) {
      // en: "1,234" is one thousand two hundred thirty-four (uz/ru read it as 1.234).
      text = text.replace(",", "");
    } else {
      text = text.replace(",", ".");
    }
  } else if (dots > 1) {
    if (!GROUPED_WITH_DOT.test(text)) return { ok: false, reason: "invalid" };
    text = text.replaceAll(".", "");
  }
  // A single "." is always a decimal point, in every locale: phone keypads often emit it.

  if (!STRICT_NUMBER.test(text)) return { ok: false, reason: "invalid" };
  const value = Number(text);
  if (!Number.isFinite(value)) return { ok: false, reason: "invalid" };
  if (opts?.integer && !Number.isInteger(value)) return { ok: false, reason: "invalid" };
  return { ok: true, value };
}

/**
 * Text for an input's initial/loaded value: no grouping, the locale's decimal separator, no trailing zeros.
 * Use this instead of `String(value)` when loading a server value into form state — otherwise an uz user
 * sees `12.5` and edits it into a mix of both separators.
 */
export function formatNumberForInput(
  value: number | null | undefined,
  locale: NumberLocale,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const plain = String(value).includes("e")
    ? value.toLocaleString("en-US", { useGrouping: false, maximumFractionDigits: 20 })
    : String(value);
  return locale === "en" ? plain : plain.replace(".", ",");
}

/** "ru-RU" → "ru"; anything unknown → "uz" (the app's default language). */
export function toNumberLocale(language: string | undefined): NumberLocale {
  const base = language?.toLowerCase().split("-")[0];
  return base === "ru" || base === "en" || base === "uz" ? base : "uz";
}
