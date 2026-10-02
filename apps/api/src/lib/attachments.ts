/**
 * Chat attachment safety (02-arxitektura V-1, security.md). Files are served from the API origin, so
 * anything a browser would render as a document there (HTML, SVG, XML...) could run script with the
 * user's cookies. Hence: a strict MIME allowlist on upload, and the same check again on download
 * (objects stored before the allowlist existed), plus headers that stop sniffing and sandbox the response.
 */

export const INLINE_IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
] as const;

export const ALLOWED_ATTACHMENT_MIME_TYPES = [
  ...INLINE_IMAGE_MIME_TYPES,
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
] as const;

const FILE_NAME_MAX_LENGTH = 120;

/** Lowercased media type without parameters, or `null` if it is not on the allowlist (SVG/HTML/XML/JS never are). */
export function normalizeAttachmentMime(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const base = raw.split(";")[0]?.trim().toLowerCase();
  if (!base) return null;
  return (ALLOWED_ATTACHMENT_MIME_TYPES as readonly string[]).includes(base) ? base : null;
}

/**
 * Safe stored/displayed file name. Besides the path and shell-special characters, `#` and `%` are replaced
 * too: the name becomes part of the R2 key, which is put into a URL path unencoded.
 */
export function sanitizeAttachmentFileName(name: string): string {
  const cleaned = name
    // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control characters is the point
    .replace(/[/\\:*?"<>|#%\u0000-\u001f\u007f]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  if (!cleaned) return "file";
  if (cleaned.length <= FILE_NAME_MAX_LENGTH) return cleaned;

  const dot = cleaned.lastIndexOf(".");
  const extension = dot > 0 && cleaned.length - dot <= 16 ? cleaned.slice(dot) : "";
  return cleaned.slice(0, FILE_NAME_MAX_LENGTH - extension.length) + extension;
}

/** `Content-Disposition` parameter value safe in a quoted string: ASCII only, no quote or backslash. */
function asciiFallback(name: string): string {
  return name.replace(/[^\x20-\x7e]|["\\]/g, "_");
}

/** RFC 5987 value: encodeURIComponent leaves `'()*` unescaped, which the grammar does not allow. */
function encodeRfc5987(name: string): string {
  return encodeURIComponent(name).replace(
    /['()*]/g,
    (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

export function attachmentResponseHeaders(
  storedMime: string | undefined,
  fileName: string,
): Headers {
  const mime = normalizeAttachmentMime(storedMime);
  const isInlineImage = (INLINE_IMAGE_MIME_TYPES as readonly string[]).includes(mime ?? "");
  const safeName = sanitizeAttachmentFileName(fileName);

  const headers = new Headers();
  headers.set("Content-Type", mime ?? "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `${isInlineImage ? "inline" : "attachment"}; filename="${asciiFallback(safeName)}"; filename*=UTF-8''${encodeRfc5987(safeName)}`,
  );
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Content-Security-Policy", "sandbox; default-src 'none'");
  headers.set("Cache-Control", "private, max-age=3600");
  return headers;
}
