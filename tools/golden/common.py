"""Shared helpers for the golden-fixture extractors (see tools/golden/README.md).

Values are read from the workbook's cached results (openpyxl ``data_only=True``);
nothing is recomputed. Every cell is read together with at least one label cell, and a
label that no longer matches aborts the run (the row shifted), so a moved row can never
silently produce a wrong expected value.
"""

import hashlib
import re
import sys
from pathlib import Path

import openpyxl

WORKBOOK_NAME = "3-DMTT v7.20.xlsx"
WORKBOOK_SHA256 = "187d19962269d25ff6b241b97374ba868b9b38c94a9b9d27f5ac78ddf6dc5f6a"
VERSION = "v7.20"
LAST_DECISION = "X98"

REPO_ROOT = Path(__file__).resolve().parents[2]


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    sys.exit(1)


def verify_sha256(path: Path, expected: str = WORKBOOK_SHA256) -> str:
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != expected:
        fail(f"sha256 mismatch for {path}: got {digest}, expected {expected}")
    return digest


def load_workbook(path: Path, expected_sha: str = WORKBOOK_SHA256):
    verify_sha256(path, expected_sha)
    return openpyxl.load_workbook(path, data_only=True)


def _norm(text) -> str:
    return re.sub(r"\s+", " ", str(text)).strip().lower()


def slug(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9]+", "_", str(text)).strip("_")


class Extractor:
    """Collects ``{id, excel, value|kind, class}`` entries and enforces label checks."""

    def __init__(self, workbook):
        self.wb = workbook
        self.entries: list[dict] = []
        self.skipped: list[dict] = []
        self._ids: set[str] = set()

    # -- low level ---------------------------------------------------------
    def raw(self, sheet: str, addr: str):
        return self.wb[sheet][addr].value

    def check_label(self, sheet: str, addr: str, expected: str) -> None:
        actual = self.raw(sheet, addr)
        if actual is None or not _norm(actual).startswith(_norm(expected)):
            fail(
                f"label mismatch at {sheet}!{addr}: expected it to start with {expected!r}, "
                f"found {actual!r} (row shifted?)"
            )

    def _add(self, entry: dict) -> None:
        if entry["id"] in self._ids:
            fail(f"duplicate golden id {entry['id']}")
        self._ids.add(entry["id"])
        self.entries.append(entry)

    @staticmethod
    def _classify(value):
        """Return the value fields for an entry, or None when the cell is not usable."""
        if isinstance(value, bool):
            return {"kind": "text", "text": str(value)}
        if isinstance(value, (int, float)):
            return {"value": value}
        return None

    def put(self, id_: str, sheet: str, addr: str, labels, cls: str, text: bool = False) -> None:
        """Record one cell. ``labels`` is a list of ``(addr, expected-prefix)`` checks."""
        for label_addr, expected in labels:
            self.check_label(sheet, label_addr, expected)
        value = self.raw(sheet, addr)
        excel = f"{sheet}!{addr}"
        if value is None:
            self.skipped.append({"id": id_, "excel": excel, "reason": "empty cell"})
            return
        if isinstance(value, str):
            if value.startswith("#"):
                self.skipped.append({"id": id_, "excel": excel, "reason": f"Excel error {value}"})
                return
            if text:
                self._add({"id": id_, "excel": excel, "kind": "text", "text": value, "class": cls})
            else:
                self._add({"id": id_, "excel": excel, "kind": "none", "text": value, "class": cls})
            return
        fields = self._classify(value)
        if fields is None:
            self.skipped.append({"id": id_, "excel": excel, "reason": f"unsupported type {type(value).__name__}"})
            return
        self._add({"id": id_, "excel": excel, **fields, "class": cls})

    def put_row(self, id_: str, sheet: str, row: int, first: str, last: str, labels, cls: str) -> None:
        """Record a horizontal range as an array (``null`` for empty cells)."""
        for label_addr, expected in labels:
            self.check_label(sheet, label_addr, expected)
        ws = self.wb[sheet]
        values = []
        for cell in ws[f"{first}{row}:{last}{row}"][0]:
            if isinstance(cell.value, str) and cell.value.startswith("#"):
                self.skipped.append({"id": id_, "excel": f"{sheet}!{cell.coordinate}", "reason": f"Excel error {cell.value}"})
                values.append(None)
            else:
                values.append(cell.value)
        self._add({"id": id_, "excel": f"{sheet}!{first}{row}:{last}{row}", "values": values, "class": cls})
