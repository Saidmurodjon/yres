import { type InferInsertModel, getTableColumns } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import type { SQLiteColumn, SQLiteTable } from "drizzle-orm/sqlite-core";
import type { Database } from "./index";

/** D1 allows at most 100 bound parameters per statement (docs: D1 limits). */
export const D1_MAX_PARAMS = 100;

/** Splits `rows` so no chunk binds more than `D1_MAX_PARAMS` parameters. */
export function chunkRowsForInsert<T>(rows: readonly T[], columnsPerRow: number): T[][] {
  const perChunk = Math.max(1, Math.floor(D1_MAX_PARAMS / Math.max(1, columnsPerRow)));
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += perChunk) {
    chunks.push(rows.slice(i, i + perChunk));
  }
  return chunks;
}

/**
 * Multi-row insert as one statement per chunk. Spread the result into the
 * route's single `db.batch()` — atomicity stays at the batch, never per chunk.
 * Column count comes from the table (drizzle binds defaulted `id`/`createdAt`
 * too), so the limit holds whatever subset of fields the rows carry.
 */
export function insertChunked<TTable extends SQLiteTable>(
  db: Database,
  table: TTable,
  rows: readonly InferInsertModel<TTable>[],
  options?: { onConflictDoNothing?: SQLiteColumn },
): BatchItem<"sqlite">[] {
  const columns = Object.keys(getTableColumns(table)).length;
  const conflictTarget = options?.onConflictDoNothing;
  return chunkRowsForInsert(rows, columns).map((chunk) => {
    const insert = db.insert(table).values(chunk);
    return conflictTarget ? insert.onConflictDoNothing({ target: conflictTarget }) : insert;
  });
}
