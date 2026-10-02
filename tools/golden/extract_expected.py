#!/usr/bin/env python3
"""Extract the v7.20 golden expected values from the auditor's workbook.

    tools/golden/.venv/bin/python tools/golden/extract_expected.py --xlsx "<path to 3-DMTT v7.20.xlsx>"

Writes apps/api/tests/golden/fixtures/3-dmtt/v7.20/expected.json (never edit it by hand).
Exit code 1 when the workbook's sha256 differs or any label check fails.
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

from common import (
    LAST_DECISION,
    REPO_ROOT,
    VERSION,
    WORKBOOK_NAME,
    WORKBOOK_SHA256,
    Extractor,
    fail,
    load_workbook,
    slug,
)

DEFAULT_OUT = REPO_ROOT / "apps/api/tests/golden/fixtures/3-dmtt/v7.20/expected.json"

MS = "Measures_summary"
BB = "Breakdown Baseline & Balance"
FI = "Financial indicators"
LB = "Losses env. before"
LA = "Losses env. after"
OV = "Overall gener. & distrib. eff."


def g0_geometry(x: Extractor) -> None:
    x.put("geometry.heatedFloorAreaM2", "Envelope", "L95", [("D95", "Total")], "G0")
    x.put("geometry.heatedVolumeM3", "Envelope", "M95", [("D95", "Total")], "G0")


def _scan_envelope(x: Extractor, sheet: str, scenario: str, last_row: int, totals) -> None:
    """Element rows are found by the code in column D (rows 6..last_row), never by position."""
    ws = x.wb[sheet]
    x.check_label(sheet, "D4", "Wall type")
    x.check_label(sheet, "E4", "Area")
    x.check_label(sheet, "F4", "U value")
    x.check_label(sheet, "G4", "Qtot")
    sums: dict[str, float] = {}
    seen: set[str] = set()
    for row in range(6, last_row + 1):
        code = ws.cell(row, 4).value
        if not isinstance(code, str) or not code.strip():
            continue
        key = slug(code)
        if key in seen:
            fail(f"{sheet}: element code {code!r} repeats (row {row})")
        seen.add(key)
        for col, name in (("E", "areaM2"), ("F", "uValueWPerM2K"), ("G", "annualLossKwh")):
            cell = ws[f"{col}{row}"].value
            if isinstance(cell, (int, float)) and not isinstance(cell, bool):
                x.put(f"envelope.{scenario}.{key}.{name}", sheet, f"{col}{row}", [(f"D{row}", code)], "G1")
                if name == "annualLossKwh":
                    sums[key] = cell
    for suffix, addr, label_addr, label in totals:
        x.put(f"envelope.{scenario}.total.{suffix}", sheet, addr, [(label_addr, label)], "G1")
    grand = x.raw(sheet, totals[-1][1])
    if abs(sum(sums.values()) - grand) > 0.01:
        fail(f"{sheet}: element losses sum {sum(sums.values())} != total {grand}")


def g1_envelope(x: Extractor) -> None:
    _scan_envelope(
        x, LB, "before", 31,
        [
            ("walls", "G13", "C13", "Total annual heat losses through walls"),
            ("roof", "G19", "C19", "Total annual heat losses through roof"),
            ("floor", "G23", "C23", "Total annual heat losses through floor"),
            ("windowsDoors", "G31", "C31", "Total annual heat losses through windows"),
            ("building", "G32", "B32", "Total annual heat losses through buildin"),
        ],
    )
    _scan_envelope(
        x, LA, "after", 27,
        [
            ("walls", "G13", "C13", "Total annual heat losses through walls"),
            ("roof", "G19", "C19", "Total annual heat losses through roof"),
            ("floor", "G23", "C23", "Total annual heat losses through floor"),
            ("windowsDoors", "G27", "C27", "Total annual heat losses through windows"),
            ("building", "G28", "B28", "Total annual heat losses through buildin"),
        ],
    )


def g1_systems(x: Extractor) -> None:
    cols_before = {"D": "usefulNeedKwh", "F": "distributionLossKwh", "H": "finalEnergyKwh", "G": "efficiency"}
    cols_after = {"J": "usefulNeedKwh", "L": "distributionLossKwh", "N": "finalEnergyKwh", "M": "efficiency"}
    x.check_label(OV, "D3", "Before renovation")
    x.check_label(OV, "J3", "After renovation")
    # (id, row, label cell, label prefix, before columns, after columns)
    rows = [
        ("heating.boiler", 7, "C7", "Before: existing gas boiler", "DFHJLMN"),
        ("heating.total", 8, "C8", "Total", "DHJN"),
        ("dhw.electricHeaters", 11, "C11", "Electric water heaters", "DFHJLN"),
        ("dhw.solar", 12, "C12", "Solar DHW", "JN"),
        ("dhw.total", 13, "C13", "Total", "DHJN"),
        ("cooling.split", 15, "C15", "Split systems", "DFHJLN"),
    ]
    names = {**cols_before, **cols_after}
    for key, row, label_addr, label, cols in rows:
        for col in cols:
            scen = "before" if col in cols_before else "after"
            x.put(
                f"generation.{key}.{scen}.{names[col]}", OV, f"{col}{row}",
                [(label_addr, label), (f"{col}4", {"D": "Useful", "F": "Distribution", "H": "Final", "G": "Generation", "J": "Useful", "L": "Distribution", "N": "Final", "M": "Generation"}[col])],
                "G1",
            )
    x.put("generation.heatPump.copAfter", OV, "M7", [("C7", "Before: existing gas boiler")], "G1")
    x.put("generation.finalEnergy.totalBefore", OV, "H21", [("H4", "Final energy")], "G1")
    x.put("generation.finalEnergy.totalAfter", OV, "N21", [("N4", "Final energy")], "G1")


def g1_other(x: Extractor) -> None:
    x.put("lighting.before.annualKwh", "Lighting", "L11", [("C11", "Total annual energy consumption for arti")], "G1")
    x.put("lighting.after.annualKwh", "Lighting", "L16", [("C16", "Total annual energy consumption for arti")], "G1")
    x.put("lighting.savingsKwh", "Lighting", "L17", [("B17", "Electricity savings")], "G1")
    x.put("equipment.before.annualKwh", "Equipment", "K49", [("B49", "Total annual energy used by equipment be")], "G1")
    x.put("equipment.after.annualKwh", "Equipment", "K100", [("B100", "Total annual energy used by equipment af")], "G1")
    x.put("equipment.savingsKwh", "Equipment", "K102", [("J102", "savings")], "G1")
    x.put("pv.annualProductionKwh", "PV", "C25", [("B25", "Total annual production")], "G1")
    x.put("pv.electricityDemandKwh", "PV", "C34", [("B34", "Electricity demand after renovation")], "G1")
    x.put("pv.selfConsumedKwh", "PV", "C35", [("B35", "Self-consumed PV electricity")], "G1")
    x.put("pv.exportedKwh", "PV", "C36", [("B36", "PV electricity exported")], "G1")
    x.put("pv.productionValueUsd", "PV", "C38", [("B38", "Value of the PV production")], "G1")
    x.put("solarDhw.annualKwh", "Solar DHW", "I13", [("B13", "Proposed solar DHW"), ("I11", "DHW generation")], "G1")
    x.put("ems.thermalSavingsKwh", "EMS", "D9", [("B9", "Total annual THERMAL")], "G1")
    x.put("ems.electricalSavingsKwh", "EMS", "D10", [("B10", "Total annual ELECTRICAL")], "G1")


BALANCE_THERMAL = [
    (4, "walls", "Walls"), (5, "roof", "Roof"), (6, "floor", "Floor"),
    (7, "windowsDoors", "Windows and Doors"), (8, "ventilation", "Ventilation"),
    (9, "dhwNeedsDistribution", "DHW needs"), (10, "heatDistribution", "Heat Distribution"),
    (11, "generation", "Generation Heating"), (12, "gainsHeatingSeason", "Gains heating season"),
    (13, "solarDhw", "Solar DHW"), (14, "ems", "EMS"), (15, "total", "Total"),
]
BALANCE_ELECTRICAL = [
    (16, "lighting", "Lighting"), (17, "equipment", "Equipment"), (18, "cooling", "Cooling"),
    (19, "dhw", "DHW"), (20, "heatingElectric", "Heating (ELECTRIC"), (21, "ventilation", "Ventilation"),
    (22, "pv", "PV"), (23, "gainsCooling", "Gains, cooling season"), (24, "ems", "EMS"), (25, "total", "Total"),
]


def g2_balance(x: Extractor) -> None:
    # Column D: theoretical before · F: baseline actual (totals only) · G: after · H: theoretical savings
    x.check_label(BB, "D3", "Theoretical energy needs")
    x.check_label(BB, "F3", "Actual energy consumption")
    x.check_label(BB, "G3", "Energy needs based on standardized")
    x.check_label(BB, "H3", "Theoretical energy savings")
    for block, rows in (("thermal", BALANCE_THERMAL), ("electrical", BALANCE_ELECTRICAL)):
        for row, key, label in rows:
            cols = {"D": "theoreticalBeforeKwh", "G": "afterKwh", "H": "theoreticalSavingsKwh"}
            if key == "total":
                cols["F"] = "baselineActualKwh"
            for col, name in cols.items():
                # D4:D12 / D16:D21 and G/H 4:14 / 16:24 are per spec; totals carry every column.
                if key != "total" and col == "D" and row in (13, 14, 22, 23, 24):
                    continue  # no "before" value in these rows (the sheet leaves them empty)
                if block == "electrical" and key != "total" and col == "H":
                    continue  # per-row electrical savings are not golden checkpoints (spec: H4:H14 and H25 only)
                x.put(f"balance.{block}.{key}.{name}", BB, f"{col}{row}", [(f"C{row}", label)], "G2")
    x.put("compare.specificBeforeKwhPerM2", BB, "G75", [("C75", "Specific, without PV")], "G2")
    x.put("compare.specificAfterKwhPerM2", BB, "H75", [("C75", "Specific, without PV")], "G2")
    x.put("compare.specificAfterWithPvKwhPerM2", BB, "H76", [("C76", "Specific, with PV")], "G2")
    for id_, addr, label_addr, label in (
        ("class.beforeWithoutPv", "G78", "C78", "EE CLASS (without PV)"),
        ("class.afterWithoutPv", "H78", "C78", "EE CLASS (without PV)"),
        ("class.zebLevel", "H84", "C84", "ZEB level"),
    ):
        x.put(id_, BB, addr, [(label_addr, label)], "G2-text", text=True)
    x.put("calibration.heatRatio", MS, "D55", [("C55", "Actual / theoretical ratio - HEAT")], "G2")
    x.put("calibration.electricityRatio", MS, "D56", [("C56", "Actual / theoretical ratio - ELECTRICITY")], "G2")


MEASURE_COLS = [
    ("D", "investmentUsd", "G3", False), ("E", "standardizedSavingsKwh", "G3", False),
    ("F", "standardizedSavingsUsd", "G3", False), ("I", "actualSavingsKwh", "G3", False),
    ("J", "actualSavingsUsd", "G3", False), ("M", "lifetimeYears", "G3", False),
    ("Q", "proposedForImplementation", "G3", True), ("R", "maintenancePercent", "G3", False),
    ("S", "carrier", "G3", True), ("T", "standardizedGasUsd", "G3", False),
    ("U", "standardizedElectricityUsd", "G3", False), ("V", "actualGasUsd", "G3", False),
    ("W", "actualElectricityUsd", "G3", False),
    ("G", "simplePaybackStandardizedYears", "G4", False), ("H", "discountedPaybackStandardizedYears", "G4", False),
    ("K", "simplePaybackActualYears", "G4", False), ("L", "discountedPaybackActualYears", "G4", False),
    ("N", "npvStandardizedUsd", "G4", False), ("O", "irrStandardized", "G4", False),
    ("P", "co2ReductionTonnesPerYear", "G5", False),
]
MEASURE_HEADERS = {
    "D": "Investment", "E": "Theoretical savings", "F": "[USD]", "I": "Actual savings", "J": "[USD]",
    "M": "Lifetime", "Q": "Proposed", "R": "Maintenance", "S": "Energy carrier", "T": "Standard savings - GAS",
    "U": "Standard savings - ELECTRICITY", "V": "Actual savings - GAS", "W": "Actual savings - ELECTRICITY",
    "G": "Simple", "H": "Discounted", "K": "Simple", "L": "Discounted", "N": "Net Present Value",
    "O": "Internal Rate", "P": "CO2 emission",
}
HEADER_ROW = {"F": 4, "G": 4, "H": 4, "J": 4, "K": 4, "L": 4}


def g3_measures(x: Extractor) -> list[str]:
    """Measure rows are located by the running number in column B (1..19), not by position."""
    ws = x.wb[MS]
    rows = {}
    for row in range(5, 24):
        number = ws.cell(row, 2).value
        if isinstance(number, (int, float)):
            number = str(int(number))
        rows[str(number)] = row
    expected_numbers = [str(i) for i in range(1, 20)]
    if [n for n in rows if n in expected_numbers] != expected_numbers or len(rows) != 19:
        fail(f"{MS}: expected measure numbers 1..19 in B5:B23, found {list(rows)}")
    x.check_label(MS, "B24", "Protective measures")
    names = []
    for n in expected_numbers:
        row = rows[n]
        names.append(str(ws.cell(row, 3).value))
        x.put(f"measures.{n}.name", MS, f"C{row}", [(f"B{row}", n)], "G3", text=True)
        for col, name, cls, text in MEASURE_COLS:
            header_row = HEADER_ROW.get(col, 3)
            x.put(f"measures.{n}.{name}", MS, f"{col}{row}", [(f"B{row}", n), (f"{col}{header_row}", MEASURE_HEADERS[col])], cls, text=text)
    # non-EE: rows 25..37 by running number 1..13
    non_ee_rows = {}
    for row in range(25, 38):
        number = ws.cell(row, 2).value
        non_ee_rows[str(int(number)) if isinstance(number, (int, float)) else str(number)] = row
    if list(non_ee_rows) != [str(i) for i in range(1, 14)]:
        fail(f"{MS}: expected non-EE numbers 1..13 in B25:B37, found {list(non_ee_rows)}")
    for n, row in non_ee_rows.items():
        x.put(f"nonEe.{n}.description", MS, f"C{row}", [(f"B{row}", n)], "G3", text=True)
        x.put(f"nonEe.{n}.costUsd", MS, f"D{row}", [(f"B{row}", n), ("D3", "Investment")], "G3")
        x.put(f"nonEe.{n}.proposedForImplementation", MS, f"Q{row}", [(f"B{row}", n), ("Q3", "Proposed")], "G3", text=True)
    for total_row, label, cols in (
        (38, "Total (all measures)", "DEFIJTUGKNP"),
        (39, "Total proposed for implementation", "DEFITUN"),
    ):
        key = "all" if total_row == 38 else "proposed"
        for col in cols:
            name = {c: n for c, n, _, _ in MEASURE_COLS}[col]
            cls = {c: k for c, _, k, _ in MEASURE_COLS}[col]
            x.put(f"totals.{key}.{name}", MS, f"{col}{total_row}", [(f"B{total_row}", label), (f"{col}{HEADER_ROW.get(col, 3)}", MEASURE_HEADERS[col])], cls)
    for id_, addr, label in (
        ("composition.gasSavedByHeatPumpKwh", "D61", "Gas that the baseline boiler"),
        ("composition.heatPumpElectricityKwh", "D62", "Heat pump electricity consumption"),
        ("composition.dhwElectricitySavedByHeatPumpKwh", "D63", "DHW: electricity saved by the heat pump"),
        ("composition.dhwElectricitySavedBySolarKwh", "D64", "DHW: electricity saved by the solar"),
        ("composition.circulationPumpsKwh", "D65", "Circulation pumps"),
        ("balanceCheck.gasSavingsKwh", "D67", "Sum of gas savings"),
        ("balanceCheck.gasBreakdownKwh", "E67", "Sum of gas savings"),
        ("balanceCheck.electricitySavingsKwh", "D68", "Sum of electricity savings"),
        ("balanceCheck.electricityBreakdownKwh", "E68", "Sum of electricity savings"),
        ("balanceCheck.gainsUtilisationCorrection", "D71", "Gains-utilisation correction"),
    ):
        x.put(id_, MS, addr, [(f"C{addr[1:]}", label)], "G3")
    return names


FIN_PARAMS = [
    (5, "baseYear"), (6, "calculationPeriodYears"), (7, "inflation"), (8, "realDiscountRate"),
    (9, "nominalDiscountRate"), (10, "realEscalationGas"), (11, "realEscalationElectricity"),
    (12, "realEscalationCoalHeat"), (13, "nominalEscalationGas"), (14, "nominalEscalationElectricity"),
    (15, "maintenanceEscalation"), (16, "exchangeRateUzsPerUsd"), (17, "gasTariffUzsPerM3"),
    (18, "electricityTariffUzsPerKwh"), (19, "pvExportTariffUzsPerKwh"), (20, "thermalTariffUzsPerGcal"),
    (21, "coalPriceUzsPerTonne"), (22, "gasNetCalorificValueKwhPerM3"), (23, "irrInitialGuess"),
]
FIN_PARAM_LABELS = {
    5: "Base year", 6: "Calculation period", 7: "Inflation", 8: "Real discount rate", 9: "Nominal discount rate",
    10: "Real escalation of the natural gas", 11: "Real escalation of the electricity", 12: "Real escalation of the coal",
    13: "Nominal escalation - natural gas", 14: "Nominal escalation - electricity", 15: "Escalation of maintenance",
    16: "Exchange rate", 17: "Natural gas tariff", 18: "Electricity tariff", 19: "PV export", 20: "Thermal energy tariff",
    21: "Coal price", 22: "Natural gas net calorific", 23: "IRR - initial guess",
}
CASHFLOW_ROWS = [
    (1, "years", "Indicators"), (4, "maintenanceUsd", "Maintenance costs"),
    (6, "grossStandardSavingsUsd", "Gross standard savings"), (7, "grossActualSavingsUsd", "Gross actual savings"),
    (8, "netStandardSavingsUsd", "Net standard savings"), (11, "discountedStandardNetUsd", "Actualized standardized"),
    (15, "accumulatedDiscountedStandardUsd", "Accumulated net discounted standardized"),
]


def g4_financial(x: Extractor, names: list[str]) -> None:
    for row, key in FIN_PARAMS:
        x.put(f"financialParameters.{key}", "Financial parameters", f"D{row}", [(f"B{row}", FIN_PARAM_LABELS[row])], "G4")
    ws = x.wb[FI]
    block_rows = [r for r in range(1, ws.max_row + 1) if ws.cell(r, 2).value == "Measure:"]
    by_name: dict[str, int] = {}
    for r in block_rows:
        by_name.setdefault(str(ws.cell(r, 3).value), r)
    missing = [n for n in names if n not in by_name]
    if missing:
        fail(f"{FI}: no block found for measure(s) {missing}")
    for index, name in enumerate(names, start=1):
        r = by_name[name]
        x.put(f"financial.{index}.npvActualUsd", FI, f"D{r + 14}", [(f"B{r + 14}", "3.4"), (f"C{r + 14}", "Actual NPV")], "G4")
        x.put(f"financial.{index}.irrActual", FI, f"D{r + 20}", [(f"B{r + 20}", "3.10"), (f"C{r + 20}", "Internal Rate of Return based on actual")], "G4")
        if index in (1, 15):
            for offset, key, label in CASHFLOW_ROWS:
                row = r + offset
                x.put_row(f"financial.{index}.cashflow.{key}", FI, row, "D", "X", [(f"C{row}", label)], "G4")
    # Excel errors in a block header would not be caught by the label check above
    x.check_label(MS, "N3", "Net Present Value")
    for id_, addr, label in (("co2.emissionFactorGas", "D43", None), ("co2.emissionFactorElectricity", "E43", None), ("co2.emissionFactorDistrictHeating", "F43", None)):
        x.put(id_, MS, addr, [("C43", "Emission factor to CO2"), (f"{addr[0]}42", {"D": "Local heating", "E": "Electricity", "F": "District heating"}[addr[0]])], "G5")


def g6_checks(x: Extractor) -> None:
    for row in range(8, 21):
        label_id = x.raw("Checks", f"B{row}")
        if not (isinstance(label_id, str) and re.fullmatch(r"A\d+", label_id)):
            fail(f"Checks!B{row}: expected check id A<n>, found {label_id!r}")
        x.put(f"checks.{label_id}", "Checks", f"E{row}", [(f"B{row}", label_id), ("E7", "Calculated")], "G6", text=True)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--xlsx", required=True, type=Path, help="path to 3-DMTT v7.20.xlsx")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--sha256", default=WORKBOOK_SHA256, help="expected workbook sha256 (testing only)")
    args = parser.parse_args()

    wb = load_workbook(args.xlsx, args.sha256)
    x = Extractor(wb)
    g0_geometry(x)
    g1_envelope(x)
    g1_systems(x)
    g1_other(x)
    g2_balance(x)
    names = g3_measures(x)
    g4_financial(x, names)
    g6_checks(x)

    document = {
        "meta": {
            "workbook": WORKBOOK_NAME,
            "sha256": WORKBOOK_SHA256,
            "version": VERSION,
            "lastDecision": LAST_DECISION,
            "extractedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "extractor": "tools/golden/extract_expected.py",
        },
        "entries": x.entries,
        "skipped": x.skipped,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {len(x.entries)} entries, {len(x.skipped)} skipped -> {args.out}")
    for s in x.skipped:
        print(f"  skipped {s['id']} ({s['excel']}): {s['reason']}", file=sys.stderr)


if __name__ == "__main__":
    main()
