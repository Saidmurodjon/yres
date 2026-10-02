import { D1_MAX_PARAMS, chunkRowsForInsert } from "@yres/db";
import { describe, expect, it } from "vitest";

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ i }));

describe("chunkRowsForInsert", () => {
  it("returns no chunks for zero rows", () => {
    expect(chunkRowsForInsert([], 10)).toEqual([]);
  });

  it("splits 25 rows of 10 columns into 10 + 10 + 5", () => {
    expect(chunkRowsForInsert(rows(25), 10).map((c) => c.length)).toEqual([10, 10, 5]);
  });

  it("never binds more than the D1 parameter limit in one chunk", () => {
    for (const columns of [1, 3, 7, 9, 11, 13, 33, 100]) {
      for (const n of [1, 9, 100, 257]) {
        const chunks = chunkRowsForInsert(rows(n), columns);
        for (const chunk of chunks)
          expect(chunk.length * columns).toBeLessThanOrEqual(D1_MAX_PARAMS);
        expect(chunks.flat()).toHaveLength(n);
      }
    }
  });

  it("keeps row order across chunks", () => {
    expect(chunkRowsForInsert(rows(7), 50).flat()).toEqual(rows(7));
  });
});
