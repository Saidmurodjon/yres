// bun run golden:report — prints the current golden mismatches (feeds divergences.json).
import { runGolden } from "./compare";

const { mismatches, matched } = runGolden();
console.log(`matched ${matched.length}, mismatched ${mismatches.length}`);
for (const m of mismatches) {
  const pct = m.deltaPct === null ? "" : ` (${m.deltaPct.toFixed(2)}%)`;
  console.log(
    `${m.id}\t${m.excel}\tactual=${JSON.stringify(m.actual)}\texpected=${JSON.stringify(m.expected)}${pct}`,
  );
}
