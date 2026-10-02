/**
 * Escapes text for an HTML body or a quoted attribute value (S-4). Every user-controlled string that goes
 * into an email template must pass through here — a name like `<a href="https://evil">…</a>` would
 * otherwise send phishing links from our own domain. `&` is replaced first so the entities added below
 * are not escaped again; already-escaped input is therefore escaped a second time, which is correct
 * (the original text is preserved when the result is rendered).
 */
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
