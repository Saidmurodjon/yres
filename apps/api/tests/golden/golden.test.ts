import { describe, expect, it } from "vitest";
import { EXPECTED, runGolden } from "./compare";
import divergencesFile from "./divergences.json";
import { MAPPING } from "./mapping";

interface Divergence {
  id: string;
  x: string[];
  title: string;
  status: "open" | "accepted" | "unexplained";
  closesIn: string;
  expectedIds: string[];
  note: string;
}
const divergences = divergencesFile.divergences as Divergence[];
const notModelled = divergencesFile.notModelled as { reason: string; expectedIds: string[] }[];

const divergentIds = new Map<string, string>();
for (const d of divergences) for (const id of d.expectedIds) divergentIds.set(id, d.id);
const notModelledIds = new Set(notModelled.flatMap((g) => g.expectedIds));

const run = runGolden();
const mismatchById = new Map(run.mismatches.map((m) => [m.id, m]));

describe("golden: 3-DMTT v7.20", () => {
  it("every expected id is either mapped or listed as notModelled (and never both)", () => {
    const expectedIds = new Set(EXPECTED.map((e) => e.id));
    const unowned = [...expectedIds].filter((id) => !MAPPING[id] && !notModelledIds.has(id));
    expect(unowned, `ids with no owner: ${unowned.join(", ")}`).toEqual([]);
    const both = [...notModelledIds].filter((id) => MAPPING[id]);
    expect(both, `mapped ids also listed notModelled: ${both.join(", ")}`).toEqual([]);
    const stale = [...notModelledIds, ...divergentIds.keys(), ...Object.keys(MAPPING)].filter(
      (id) => !expectedIds.has(id),
    );
    expect(stale, `ids that are not in expected.json: ${stale.join(", ")}`).toEqual([]);
  });

  it("a divergence's ids are all mapped", () => {
    const unmapped = [...divergentIds.keys()].filter((id) => !MAPPING[id]);
    expect(unmapped).toEqual([]);
  });

  it("no new divergence: every out-of-tolerance id is listed in divergences.json", () => {
    const fresh = run.mismatches.filter((m) => !divergentIds.has(m.id));
    expect(
      fresh.map(
        (m) =>
          `${m.id}  ${m.excel}  ${JSON.stringify(m.actual)} vs ${JSON.stringify(m.expected)}${
            m.deltaPct === null ? "" : ` (${m.deltaPct.toFixed(2)}%)`
          }`,
      ),
      "new divergence — fix the engine or list it (with a cause) in divergences.json",
    ).toEqual([]);
  });

  it("no stale divergence: a listed id that is back within tolerance must be removed", () => {
    const closed = [...divergentIds.entries()].filter(([id]) => !mismatchById.has(id));
    expect(
      closed.map(([id, d]) => `${id} (${d})`),
      "closed by itself — update divergences.json",
    ).toEqual([]);
  });

  it("unexplained divergences are visible", () => {
    const unexplained = divergences.filter((d) => d.status === "unexplained").map((d) => d.id);
    if (unexplained.length)
      console.warn(`[golden] unexplained divergences: ${unexplained.join(", ")}`);
    expect(true).toBe(true);
  });
});
