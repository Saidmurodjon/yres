import { describe, expect, it } from "vitest";
import {
  type NumberLocale,
  formatNumberForInput,
  parseLocaleNumber,
  toNumberLocale,
} from "./number";

const ALL: NumberLocale[] = ["uz", "ru", "en"];

describe("parseLocaleNumber", () => {
  const ok = (raw: string, locale: NumberLocale, opts?: { integer?: boolean }) => {
    const result = parseLocaleNumber(raw, locale, opts);
    return result.ok ? result.value : result.reason;
  };

  it.each([
    ["12,5", ALL, 12.5],
    ["12.5", ALL, 12.5],
    ["1 234,5", ["uz", "ru"], 1234.5],
    ["1 234,5", ["uz", "ru"], 1234.5],
    ["1 234,5", ["uz", "ru"], 1234.5],
    ["1,234.5", ["en"], 1234.5],
    ["1.234,5", ["ru"], 1234.5],
    ["1,234", ["en"], 1234],
    ["1,234", ["uz", "ru"], 1.234],
    ["1.234", ALL, 1.234],
    ["1,234,567", ["en"], 1234567],
    ["1.234.567", ["uz"], 1234567],
    ["−29,02", ["ru"], -29.02],
    ["-0,5", ["uz"], -0.5],
    [",5", ["uz"], 0.5],
    [".5", ["uz"], 0.5],
    ["5.", ["uz"], 5],
    ["  7  ", ALL, 7],
    ["0,123", ["en"], 0.123],
    ["1 234", ALL, 1234],
    ["1 234 567,5", ["ru"], 1234567.5],
    ["1\u202f234,5", ["uz", "ru"], 1234.5],
    ["1\u00a0234\u00a0567,5", ["ru"], 1234567.5],
    ["1\u2009234", ALL, 1234],
    ["1'234'567", ALL, 1234567],
    ["1,234,567.89", ["en"], 1234567.89],
    ["1.234.567,89", ["ru"], 1234567.89],
    ["1 234 567,5", ["ru"], 1234567.5],
    ["-1.234,5", ["uz"], -1234.5],
  ] as const)("%j in %j → %j", (raw, locales, expected) => {
    for (const locale of locales) expect(ok(raw, locale)).toBe(expected);
  });

  it("reports empty input as empty, never as 0", () => {
    for (const locale of ALL) {
      expect(parseLocaleNumber("", locale)).toEqual({ ok: false, reason: "empty" });
      expect(parseLocaleNumber("   ", locale)).toEqual({ ok: false, reason: "empty" });
    }
  });

  it.each([
    "12abc",
    "1e3",
    "12,5,3",
    "--1",
    "1,23,4",
    "abc",
    "Infinity",
    "-",
    ",",
    "1,2,3",
    "1.2.3",
    "+5",
    "1,234,56",
    "12 5",
    "12'5",
    "1 2 3",
    "1 23 456",
    "1 234,5 6",
    "1 234'567",
    "1 234.567 8",
    "0 123",
    "1,2.3",
    "1.2,3.4",
    "1.234,5,6",
    "1,234.5.6",
    "0,123.4",
  ])("rejects %j as invalid", (raw) => {
    for (const locale of ALL)
      expect(parseLocaleNumber(raw, locale)).toEqual({ ok: false, reason: "invalid" });
  });

  it("enforces integers when asked", () => {
    expect(ok("12,5", "uz", { integer: true })).toBe("invalid");
    expect(ok("2024", "uz", { integer: true })).toBe(2024);
    expect(ok("12.0", "en", { integer: true })).toBe(12);
  });

  it("rejects numbers too large to be finite", () => {
    expect(ok(`1${"0".repeat(400)}`, "en")).toBe("invalid");
  });
});

describe("formatNumberForInput", () => {
  it("uses the locale's decimal separator without grouping or trailing zeros", () => {
    expect(formatNumberForInput(12.5, "uz")).toBe("12,5");
    expect(formatNumberForInput(12.5, "ru")).toBe("12,5");
    expect(formatNumberForInput(12.5, "en")).toBe("12.5");
    expect(formatNumberForInput(1234.5, "uz")).toBe("1234,5");
    expect(formatNumberForInput(12.5, "en")).toBe("12.5");
    expect(formatNumberForInput(-0.5, "ru")).toBe("-0,5");
    expect(formatNumberForInput(10, "uz")).toBe("10");
  });

  it("returns an empty string for missing values and expands exponent notation", () => {
    expect(formatNumberForInput(null, "uz")).toBe("");
    expect(formatNumberForInput(undefined, "en")).toBe("");
    expect(formatNumberForInput(Number.NaN, "en")).toBe("");
    expect(formatNumberForInput(0.0000001, "en")).toBe("0.0000001");
  });

  it("round-trips through parseLocaleNumber in every locale", () => {
    for (const locale of ALL) {
      for (const value of [0, 12.5, -29.02, 1234.5, 0.001, 0.000123, 0.035, 1234567.891, 1e-7]) {
        expect(parseLocaleNumber(formatNumberForInput(value, locale), locale)).toEqual({
          ok: true,
          value,
        });
      }
    }
  });
});

describe("toNumberLocale", () => {
  it("maps language tags to the three supported locales, defaulting to uz", () => {
    expect(toNumberLocale("ru-RU")).toBe("ru");
    expect(toNumberLocale("en-US")).toBe("en");
    expect(toNumberLocale("uz")).toBe("uz");
    expect(toNumberLocale("uz-Latn-UZ")).toBe("uz");
    expect(toNumberLocale("de")).toBe("uz");
    expect(toNumberLocale(undefined)).toBe("uz");
  });
});
