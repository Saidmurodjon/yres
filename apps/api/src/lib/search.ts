import { type SQL, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";

/** Lowercase with the Unicode-aware lowercaser — SQLite's own `lower()` only folds ASCII. */
export function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/** The value stored in `building.search_text` (database.md: the app writes it on every insert/update). */
export function buildingSearchText(name: string, location: string | null | undefined): string {
  return normalizeSearchText(`${name} ${location ?? ""}`);
}

/** `column LIKE '%q%'` with `%`, `_` and `\` in the user's text matched literally (security.md). */
export function likeContains(column: SQLiteColumn, query: string): SQL {
  const escaped = query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
  return sql`${column} LIKE ${`%${escaped}%`} ESCAPE '\\'`;
}
