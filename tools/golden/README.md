# Golden fixture tools

Python is used **only** to generate the golden fixtures from the auditor's workbook; CI and
`bun run test` never run it (the generated JSON is committed).

## Workbook

`3-DMTT v7.20.xlsx` is **not in the repo** (WB data, 8–10 MB). On the project owner's Mac:
`~/Library/CloudStorage/OneDrive-Personal/EA/2026/WB ECE Energy Audit/3-MTM/3-DMTT v7.20.xlsx`,
sha256 `187d19962269d25ff6b241b97374ba868b9b38c94a9b9d27f5ac78ddf6dc5f6a`. A different hash aborts the run.
Values are the workbook's cached results (`openpyxl`, `data_only=True`) — nothing is recomputed.

## Run

```bash
python3 -m venv tools/golden/.venv
tools/golden/.venv/bin/pip install -r tools/golden/requirements.txt
tools/golden/.venv/bin/python tools/golden/extract_expected.py --xlsx "<path to 3-DMTT v7.20.xlsx>"
```

Writes `apps/api/tests/golden/fixtures/3-dmtt/v7.20/expected.json`. Never edit it by hand; re-running changes
only `meta.extractedAt`. Exit code 1 on a sha256 mismatch or a label mismatch (a row/column shifted).

## Output format

`{ meta, entries[], skipped[] }`. An entry is `{ id, excel: "Sheet!Cell", class, value }` for numbers;
`{ …, kind: "none", text: "> 20" }` for non-numeric result placeholders (`> 20`, `n/a (<0)`, `—`);
`{ …, kind: "text", text }` for text results (Yes/No, carrier, EE class, Checks); `{ …, values: [...] }`
for a horizontal range (cash-flow rows, `null` = empty cell). Excel error cells are never recorded — they go to `skipped[]`.
Classes G0–G6 follow `docs/production/06-sifat-test-va-reliz.md` §2.

## Label checks

Every cell is read with label cell(s) (row label and, where useful, the column header). A label that no longer
starts with the expected text aborts the run. Measure rows are located by the running number in `Measures_summary!B`,
financial blocks by the measure name in `Financial indicators!C` (block header `Measure:`), envelope elements by the
code in column D.

## When a new workbook version arrives

Update `WORKBOOK_NAME`/`WORKBOOK_SHA256`/`VERSION`/`LAST_DECISION` in `common.py`, run the extractor; label failures show
what moved. Review the `expected.json` diff and the golden test's `divergences.json` before committing.
