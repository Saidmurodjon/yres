import { describe, expect, it } from "vitest";
import { initialSyncedRowsState, syncedRowsReducer } from "./use-synced-rows";

type Row = { id: string; v: string };
const server = (...ids: string[]): Row[] => ids.map((id) => ({ id, v: id }));
const sig = (rows: Row[]) => JSON.stringify(rows);

function start(rows: Row[], resetKey = "before") {
  return initialSyncedRowsState(rows, sig(rows), resetKey);
}
const onServer = (state: ReturnType<typeof start>, rows: Row[], resetKey = "before") =>
  syncedRowsReducer(state, { type: "server", serverRows: rows, signature: sig(rows), resetKey });

describe("syncedRowsReducer (U2: refetch must not trample unsaved edits)", () => {
  it("follows the server while the rows are clean", () => {
    const next = onServer(start(server("a")), server("a", "b"));
    expect(next.rows).toEqual(server("a", "b"));
    expect(next.dirty).toBe(false);
  });

  it("keeps the user's unsaved rows when the server data changes (a neighbour card was saved)", () => {
    let state = start(server("a"));
    state = syncedRowsReducer(state, {
      type: "edit",
      updater: (prev) => [...prev, { id: "local-1", v: "typed" }],
    });
    expect(state.dirty).toBe(true);
    state = onServer(state, server("a", "other"));
    expect(state.rows.map((r) => r.id)).toEqual(["a", "local-1"]);
    expect(state.dirty).toBe(true);
  });

  it("order 1 — refetch lands BEFORE markClean: the server rows are applied by markClean", () => {
    let state = start(server("a"));
    state = syncedRowsReducer(state, { type: "edit", updater: [{ id: "local-1", v: "typed" }] });
    const saved = server("real-1"); // what the server stored and returned after the save
    state = onServer(state, saved); // refetch arrives while still dirty → remembered
    expect(state.rows).toEqual([{ id: "local-1", v: "typed" }]);
    expect(state.missedSync).toBe(true);
    state = syncedRowsReducer(state, { type: "clean", serverRows: saved });
    expect(state.rows).toEqual(saved);
    expect(state.dirty).toBe(false);
    expect(state.missedSync).toBe(false);
  });

  it("order 2 — refetch lands AFTER markClean: the server action applies it", () => {
    let state = start(server("a"));
    state = syncedRowsReducer(state, { type: "edit", updater: [{ id: "local-1", v: "typed" }] });
    state = syncedRowsReducer(state, { type: "clean", serverRows: server("a") }); // refetch not here yet
    expect(state.dirty).toBe(false);
    expect(state.rows).toEqual([{ id: "local-1", v: "typed" }]);
    const saved = server("real-1");
    state = onServer(state, saved);
    expect(state.rows).toEqual(saved);
  });

  it("a reset key change always shows the server rows and clears dirty (scenario switch after confirming)", () => {
    let state = start(server("a"), "before");
    state = syncedRowsReducer(state, { type: "edit", updater: [{ id: "local-1", v: "typed" }] });
    state = onServer(state, server("x"), "after");
    expect(state.rows).toEqual(server("x"));
    expect(state.dirty).toBe(false);
    expect(state.missedSync).toBe(false);
  });

  it("ignores a server update whose content did not change", () => {
    const state = start(server("a"));
    expect(onServer(state, server("a"))).toBe(state);
  });
});
