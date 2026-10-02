import { describe, expect, it } from "vitest";
import {
  ALLOWED_ATTACHMENT_MIME_TYPES,
  attachmentResponseHeaders,
  normalizeAttachmentMime,
  sanitizeAttachmentFileName,
} from "../../src/lib/attachments";

describe("normalizeAttachmentMime", () => {
  it("never allows script-capable document types", () => {
    for (const type of [
      "image/svg+xml",
      "text/html",
      "text/html; charset=utf-8",
      "application/xhtml+xml",
      "text/xml",
      "application/xml",
      "application/javascript",
      "text/javascript",
    ]) {
      expect(normalizeAttachmentMime(type)).toBeNull();
    }
  });

  it("lowercases and drops parameters", () => {
    expect(normalizeAttachmentMime("IMAGE/PNG")).toBe("image/png");
    expect(normalizeAttachmentMime("text/plain; charset=utf-8")).toBe("text/plain");
  });

  it("rejects empty and unknown values", () => {
    expect(normalizeAttachmentMime("")).toBeNull();
    expect(normalizeAttachmentMime(undefined)).toBeNull();
    expect(normalizeAttachmentMime("application/x-unknown")).toBeNull();
  });

  it("accepts every allowlisted type", () => {
    for (const type of ALLOWED_ATTACHMENT_MIME_TYPES) {
      expect(normalizeAttachmentMime(type)).toBe(type);
    }
  });
});

describe("sanitizeAttachmentFileName", () => {
  it("neutralizes path traversal and URL-breaking characters", () => {
    const name = sanitizeAttachmentFileName("../../evil.html");
    expect(name).not.toContain("/");
    expect(name).not.toMatch(/^\./);
    expect(sanitizeAttachmentFileName('a:b*c?"d<e>f|g#h%i.png')).toBe("a_b_c__d_e_f_g_h_i.png");
    expect(sanitizeAttachmentFileName("line\nbreak\u0000.pdf")).toBe("line_break_.pdf");
  });

  it("falls back to 'file' for names that sanitize to nothing", () => {
    expect(sanitizeAttachmentFileName("")).toBe("file");
    expect(sanitizeAttachmentFileName("...")).toBe("file");
  });

  it("truncates to 120 characters but keeps the extension", () => {
    const name = sanitizeAttachmentFileName(`${"a".repeat(300)}.pdf`);
    expect(name).toHaveLength(120);
    expect(name.endsWith(".pdf")).toBe(true);
  });

  it("keeps ordinary and non-ASCII names", () => {
    expect(sanitizeAttachmentFileName("Hisobot 2026.xlsx")).toBe("Hisobot 2026.xlsx");
    expect(sanitizeAttachmentFileName("Ҳисобот.pdf")).toBe("Ҳисобот.pdf");
  });
});

describe("attachmentResponseHeaders", () => {
  it("serves an old object stored as text/html as an opaque download", () => {
    const headers = attachmentResponseHeaders("text/html", "page.html");
    expect(headers.get("Content-Type")).toBe("application/octet-stream");
    expect(headers.get("Content-Disposition")).toMatch(/^attachment;/);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Content-Security-Policy")).toBe("sandbox; default-src 'none'");
  });

  it("serves SVG stored by an earlier version as an opaque download too", () => {
    const headers = attachmentResponseHeaders("image/svg+xml", "x.svg");
    expect(headers.get("Content-Type")).toBe("application/octet-stream");
    expect(headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("renders allowlisted images inline", () => {
    const headers = attachmentResponseHeaders("image/png", "photo.png");
    expect(headers.get("Content-Type")).toBe("image/png");
    expect(headers.get("Content-Disposition")).toMatch(/^inline;/);
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("forces a download for non-image allowlisted types", () => {
    const headers = attachmentResponseHeaders("application/pdf", "report.pdf");
    expect(headers.get("Content-Type")).toBe("application/pdf");
    expect(headers.get("Content-Disposition")).toMatch(/^attachment;/);
  });

  it("treats a missing stored type as opaque", () => {
    expect(attachmentResponseHeaders(undefined, "x").get("Content-Type")).toBe(
      "application/octet-stream",
    );
  });

  it("encodes the file name safely in Content-Disposition", () => {
    const disposition =
      attachmentResponseHeaders("application/pdf", 'Ҳисобот "1"\'(2).pdf').get(
        "Content-Disposition",
      ) ?? "";
    const ascii = /filename="([^"]*)"/.exec(disposition)?.[1] ?? "";
    expect(ascii).not.toMatch(/[^\x20-\x7e]/);
    expect(disposition).toContain("filename*=UTF-8''");
    expect(disposition.split("filename*=UTF-8''")[1]).not.toMatch(/['()"]/);
  });
});
