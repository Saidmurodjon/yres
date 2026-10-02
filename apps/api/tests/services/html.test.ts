import { describe, expect, it } from "vitest";
import { escapeHtml } from "../../src/lib/html";

describe("escapeHtml", () => {
  it("escapes the five significant characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });

  it("neutralizes a phishing link typed as a name", () => {
    const out = escapeHtml('<a href="https://evil.example">Click</a>');
    expect(out).not.toContain("<");
    expect(out).not.toContain('"');
  });

  it("returns an empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves ordinary text, including non-ASCII, alone", () => {
    expect(escapeHtml("Saidmurod Ҳамдамов")).toBe("Saidmurod Ҳамдамов");
  });

  it("escapes an already-escaped string again, so the original text survives rendering", () => {
    expect(escapeHtml("&lt;b&gt;")).toBe("&amp;lt;b&amp;gt;");
  });
});
