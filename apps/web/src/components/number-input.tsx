import { Input } from "@yres/ui";
import { type InputHTMLAttributes, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatNumberForInput, parseLocaleNumber, toNumberLocale } from "../lib/number";

export interface NumberInputProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "type" | "value" | "onChange" | "min" | "max"
  > {
  /** The raw text the user typed — form state stays a string, parse with `parseLocaleNumber` on save. */
  value: string;
  onValueChange: (raw: string) => void;
  /** Whole numbers only (years, counts): numeric keypad and a stricter check. */
  integer?: boolean;
  min?: number;
  max?: number;
  /** Shown to the right inside the field (e.g. "kWh", "m²"). */
  unit?: string;
  /** Message from the form's own validation; shown instead of the field's blur check. */
  error?: string;
  /**
   * Set to false for cramped cells (dense grids, table rows) where a text line would break the layout:
   * the field is still flagged (`aria-invalid`, red border, message in `title`) and the form must list the
   * problem itself on save. Default true.
   */
  showMessage?: boolean;
}

/**
 * The only way to type a number into a form (forms-and-numbers.md). `<input type="number">` mangles `12,5`
 * for uz/ru users, so this is a text input with a decimal keypad whose content is parsed by
 * `parseLocaleNumber` using the APP language, not the browser's. It never rewrites what the user typed;
 * on blur it shows an inline message (text, not just colour) for an unparsable or out-of-range value.
 * An empty field raises no error here — whether it is required is the form's decision.
 */
export function NumberInput({
  value,
  onValueChange,
  integer,
  min,
  max,
  unit,
  error,
  showMessage = true,
  className,
  id,
  onBlur,
  ...rest
}: NumberInputProps) {
  const { t, i18n } = useTranslation("common");
  const locale = toNumberLocale(i18n.language);
  const [blurError, setBlurError] = useState<string | null>(null);
  const generatedId = useId();
  const errorId = `${id ?? generatedId}-error`;
  const message = error ?? blurError;

  function check(raw: string): string | null {
    const parsed = parseLocaleNumber(raw, locale, { integer });
    if (!parsed.ok) {
      if (parsed.reason === "empty") return null;
      // A decimal in an integer field is the more specific complaint.
      if (integer && parseLocaleNumber(raw, locale).ok) return t("number.integer");
      return t("number.invalid");
    }
    if (min !== undefined && parsed.value < min) {
      return t("number.min", { min: formatNumberForInput(min, locale) });
    }
    if (max !== undefined && parsed.value > max) {
      return t("number.max", { max: formatNumberForInput(max, locale) });
    }
    return null;
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Input
          {...rest}
          id={id}
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          autoComplete="off"
          enterKeyHint="next"
          value={value}
          onChange={(event) => {
            setBlurError(null);
            onValueChange(event.target.value);
          }}
          onBlur={(event) => {
            setBlurError(check(event.target.value));
            onBlur?.(event);
          }}
          aria-invalid={message ? true : undefined}
          aria-describedby={message && showMessage ? errorId : rest["aria-describedby"]}
          title={!showMessage && message ? message : rest.title}
          className={
            [unit ? "pr-12" : "", message ? "border-destructive!" : "", className]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
      {message && showMessage && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-destructive">
          ⚠ {message}
        </p>
      )}
    </div>
  );
}
