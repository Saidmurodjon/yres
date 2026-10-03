import { describe, expect, it } from "vitest";
import { fractionToPercentText, parsePercentAsFraction } from "./percent";

describe("percent conversion", () => {
  it("shows a stored fraction as a percent without float noise", () => {
    expect(fractionToPercentText(0.028, "en")).toBe("2.8");
    expect(fractionToPercentText(0.028, "uz")).toBe("2,8");
    expect(fractionToPercentText(null, "en")).toBe("");
  });

  it("parses typed percent back to a fraction", () => {
    expect(parsePercentAsFraction("2,8", "uz")).toEqual({ ok: true, value: 0.028 });
    expect(parsePercentAsFraction("4", "en")).toEqual({ ok: true, value: 0.04 });
  });

  it("never turns a bad value into 0", () => {
    expect(parsePercentAsFraction("12abc", "en")).toEqual({ ok: false, reason: "invalid" });
    expect(parsePercentAsFraction("", "en")).toEqual({ ok: false, reason: "empty" });
  });
});
