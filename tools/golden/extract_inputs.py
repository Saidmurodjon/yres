#!/usr/bin/env python3
"""Extract the v7.20 *input* cells into an ``AuditInputs``-shaped JSON (F01's type).

    tools/golden/.venv/bin/python tools/golden/extract_inputs.py --xlsx "<path to 3-DMTT v7.20.xlsx>"

Only constants (or cells that are a direct function of constants and are the sheet's own input
table, e.g. the gains-sheet shading factors) are read — never an intermediate *result* that the
engine is supposed to reproduce. The two documented exceptions are listed in ``NOTES`` at the
bottom of the output. Where the engine model has no field for a v7.20 input, the closest honest
representation is written and the gap is listed in ``modelGaps`` (F03b registers each one in
``divergences.json``).
"""

import argparse

import json
import openpyxl
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

DEFAULT_OUT = REPO_ROOT / "apps/api/tests/golden/fixtures/3-dmtt/v7.20/inputs.json"

MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTH_NUMBER = {name: i + 1 for i, name in enumerate(MONTHS)}
LONG_MONTHS = {
    "January": 1, "February": 2, "March": 3, "April": 4, "May": 5, "June": 6, "July": 7,
    "August": 8, "September": 9, "October": 10, "November": 11, "December": 12,
}
ORIENTATION = {
    "N": "north", "S": "south", "E": "east", "W": "west", "NE": "northeast", "NW": "northwest",
    "SE": "southeast", "SW": "southwest",
}
LOSSES = "Losses env. before"


FORMULA_WB = None
# Distribution efficiencies that the workbook hard-codes inside formulas (no input cell): the formula text is
# asserted, then the constants are used.
UNPIPED_DHW_ETA = 0.98 * 0.85  # Overall gener. & distrib. eff.!F11 / L11 = D11*(1-(0.98*0.85))
COOLING_DISTRIBUTION_ETA = 0.96  # F15 / L15 = D15*(1-96%)


def check_formula(sheet: str, addr: str, expected: str) -> None:
    actual = FORMULA_WB[sheet][addr].value
    if str(actual).replace(" ", "") != expected.replace(" ", ""):
        fail(f"formula mismatch at {sheet}!{addr}: expected {expected!r}, found {actual!r}")


class Reader:
    """Label-checked reads of single cells (same guarantee as the expected-values extractor)."""

    def __init__(self, x: Extractor):
        self.x = x
        self.wb = x.wb

    def num(self, sheet: str, addr: str, *labels) -> float:
        for label_addr, expected in labels:
            self.x.check_label(sheet, label_addr, expected)
        value = self.wb[sheet][addr].value
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            fail(f"{sheet}!{addr}: expected a number, found {value!r}")
        return value

    def num_or_none(self, sheet: str, addr: str):
        value = self.wb[sheet][addr].value
        return value if isinstance(value, (int, float)) and not isinstance(value, bool) else None

    def text(self, sheet: str, addr: str, *labels) -> str:
        for label_addr, expected in labels:
            self.x.check_label(sheet, label_addr, expected)
        value = self.wb[sheet][addr].value
        if not isinstance(value, str):
            fail(f"{sheet}!{addr}: expected text, found {value!r}")
        return value


# --------------------------------------------------------------------------- building / climate


def building(r: Reader) -> dict:
    s = "Building_data"
    return {
        "id": "golden-3-dmtt-v7.20",
        "heatingSeasonDurationDays": r.num(s, "D7", ("B7", "Duration of the heating season")),
        "indoorTempNonOperationC": r.num(s, "D8", ("B8", "Average inside temperature during heating")),
        "indoorTempOperationC": r.num(s, "D9", ("B9", "Average inside temperature during heating")),
        # C13's unit label says [h/y] but the value (14) is hours per day = 24 − D14; the engine field is per day.
        "nonOperationHoursPerDay": r.num(s, "D13", ("B13", "Non-operation hours")),
        "operationHoursPerDay": r.num(s, "D14", ("B14", "Operation hours per day")),
        "occupantCount": r.num(s, "D18", ("B18", "Average number of people")),
        "workingDaysPerYear": int(r.num(s, "D19", ("C19", "[days/y]"))),  # Building_data!D19 = 250 (Lighting!J8 = D19 x D14)
        "coolingEnthalpyInsideKjKg": r.num(s, "D15", ("B15", "Average inside enthalpy")),
        "coolingEnthalpyOutsideKjKg": r.num(s, "D16", ("B16", "Average outside enthalpy")),
    }


def climate(r: Reader) -> dict:
    wb = r.wb
    # heating months (Losses env. before!N36:T38: month, mean temperature, days)
    heating = {}
    for col in "NOPQRST":
        name = r.text(LOSSES, f"{col}36", ("M36", "Month"))
        heating[MONTH_NUMBER[name]] = {
            "avgOutdoorTempC": r.num(LOSSES, f"{col}37", ("M37", "Average temp")),
            "heatingDaysInMonth": int(r.num(LOSSES, f"{col}38", ("M38", "Duration [days]"))),
        }
    # the Climate data row that carries the same Oct…Apr temperatures supplies May…Sep
    cd = wb["Climate data"]
    row_found = None
    for row in range(5, cd.max_row + 1):
        values = [cd.cell(row, 2 + i).value for i in range(12)]
        if all(isinstance(v, (int, float)) for v in values) and all(
            abs(values[m - 1] - heating[m]["avgOutdoorTempC"]) < 1e-9 for m in heating
        ):
            if row_found is not None:
                fail("Climate data: more than one row matches the heating-season temperatures")
            row_found = row
    if row_found is None:
        fail("Climate data: no row matches Losses env. before!N37:T37")
    r.x.check_label("Climate data", "B2", "I")
    temps = {m: cd.cell(row_found, 1 + m).value for m in range(1, 13)}

    # heating-season solar radiation: gains!N4:T11 (Table A.4), one row per month
    gains = "gains"
    r.x.check_label(gains, "N4", "Month")
    radiation = {}
    for row in range(5, 12):
        month = LONG_MONTHS[r.text(gains, f"N{row}", ("N4", "Month"))]
        radiation[month] = {
            "solarRadiationSouthKwhM2": r.num(gains, f"O{row}", ("O4", "South")),
            "solarRadiationNorthKwhM2": r.num(gains, f"P{row}", ("P4", "North")),
            "solarRadiationEastWestKwhM2": r.num(gains, f"Q{row}", ("Q4", "East, West")),
            "solarRadiationSeSwKwhM2": r.num(gains, f"R{row}", ("R4", "South-east")),
            "solarRadiationNeNwKwhM2": r.num(gains, f"S{row}", ("S4", "North-east")),
            "solarRadiationHorizontalKwhM2": r.num(gains, f"T{row}", ("T4", "Horizontal")),
        }
    if set(radiation) != set(heating):
        fail(f"gains radiation months {sorted(radiation)} != heating months {sorted(heating)}")

    # cooling-season radiation: Cooling!J5:N12 (V*, VI, VII, VIII, IX* = May..Sep)
    cooling = "Cooling"
    cool_cols = dict(zip("JKLMN", [5, 6, 7, 8, 9]))
    for col, label in zip("JKLMN", ["V*", "VI", "VII", "VIII", "IX*"]):
        r.x.check_label(cooling, f"{col}5", label)
    cool_row = {"S": 6, "E": 7, "SE": 8, "NE": 10, "N": 12}
    for orient, row in cool_row.items():
        r.x.check_label(cooling, f"F{row}", orient)
    cooling_radiation = {}
    for col, month in cool_cols.items():
        cooling_radiation[month] = {
            "solarRadiationSouthKwhM2": r.num(cooling, f"{col}{cool_row['S']}"),
            "solarRadiationNorthKwhM2": r.num(cooling, f"{col}{cool_row['N']}"),
            "solarRadiationEastWestKwhM2": r.num(cooling, f"{col}{cool_row['E']}"),
            "solarRadiationSeSwKwhM2": r.num(cooling, f"{col}{cool_row['SE']}"),
            "solarRadiationNeNwKwhM2": r.num(cooling, f"{col}{cool_row['NE']}"),
            "solarRadiationHorizontalKwhM2": None,  # the sheet has no horizontal-window row
        }

    normals = []
    for month in range(1, 13):
        is_heating = month in heating
        entry = {
            "month": month,
            "avgOutdoorTempC": heating[month]["avgOutdoorTempC"] if is_heating else temps[month],
            "heatingDaysInMonth": heating[month]["heatingDaysInMonth"] if is_heating else None,
            "isHeatingSeasonMonth": is_heating,
        }
        entry.update(radiation[month] if is_heating else cooling_radiation.get(month, {
            "solarRadiationSouthKwhM2": None, "solarRadiationNorthKwhM2": None,
            "solarRadiationEastWestKwhM2": None, "solarRadiationSeSwKwhM2": None,
            "solarRadiationNeNwKwhM2": None, "solarRadiationHorizontalKwhM2": None,
        }))
        normals.append(entry)
    return {"monthlyNormals": normals}


def blocks(r: Reader) -> list[dict]:
    s = "Envelope"
    r.x.check_label(s, "E84", "Brut area of one floor")
    out = []
    for row, label in ((87, "Block A"), (88, "Block B"), (89, "Block C")):
        r.x.check_label(s, f"D{row}", label)
        out.append({
            # gross area per floor goes in as length × 1 m (the engine multiplies length × width)
            "footprintLengthM": r.num(s, f"E{row}"),
            "footprintWidthM": 1,
            "numberOfFloors": int(r.num(s, f"F{row}")),
            "floorToFloorHeightM": r.num(s, f"H{row}"),
            "perimeterM": r.num(s, f"I{row}"),
            "perimeterLossCoefficient": r.num(s, f"J{row}"),  # wall thickness
        })
    return out


# --------------------------------------------------------------------------- envelope


def parse_block(r: Reader, title_row: int, side: str) -> dict:
    """One ``U-values`` layer block. ``side`` is 'before' (C:H) or 'after' (J:O)."""
    ws = r.wb["U-values"]
    mat, thick, lam, total_col, res_col = (4, 5, 6, 3, 8) if side == "before" else (11, 12, 13, 10, 15)
    layers = []
    row = title_row + 4
    while True:
        if row > ws.max_row:
            fail(f"U-values: no 'Total' row under block at row {title_row}")
        if str(ws.cell(row, total_col).value).strip() == "Total":
            break
        material, t, l = ws.cell(row, mat).value, ws.cell(row, thick).value, ws.cell(row, lam).value
        if isinstance(material, str) and material.strip() and isinstance(t, (int, float)) and t > 0:
            if not isinstance(l, (int, float)) or l <= 0:
                fail(f"U-values row {row}: layer {material!r} has no conductivity")
            layers.append({"thicknessM": t, "material": {"thermalConductivityWPerMk": l}})
        row += 1
    resist = {}
    for offset in range(1, 4):
        label = str(ws.cell(row + offset, total_col).value)
        if label.startswith("Thermal resistance of interior surface"):
            resist["interior"] = ws.cell(row + offset, res_col).value
        if label.startswith("Thermal resistance of exterior surface"):
            resist["exterior"] = ws.cell(row + offset, res_col).value
    return {"layers": layers, **resist}


# (id, code, category, title row of its U-values block)
CONSTRUCTIONS = [
    ("W1", "W1", "external_wall", 2),
    ("Socle1", "Socle 1. (heated space)", "socle_heated", 33),
    ("Socle2", "Socle 2", "socle_ground", 63),
    ("R1", "R1", "roof", 78),
    ("F1", "F1", "floor", 108),
]


def constructions(r: Reader) -> tuple[list[dict], list[dict]]:
    """Construction types (before + after retrofit) and the per-category surface resistances."""
    ws = r.wb["U-values"]
    types, resistances = [], []
    for ident, code, category, title_row in CONSTRUCTIONS:
        title = str(ws.cell(title_row, 3).value)
        if "before renovation" not in title.lower() and ident != "F1":
            fail(f"U-values!C{title_row}: unexpected block title {title!r}")
        before, after = parse_block(r, title_row, "before"), parse_block(r, title_row, "after")
        if not before["layers"] or not after["layers"]:
            fail(f"U-values block {ident}: no layers found (before {len(before['layers'])}, after {len(after['layers'])})")
        types.append({"id": f"ct-{ident}", "scenario": "before", "retrofitOfId": None,
                      "elementCategory": category, "layers": before["layers"]})
        types.append({"id": f"ct-{ident}-after", "scenario": "after", "retrofitOfId": f"ct-{ident}",
                      "elementCategory": category, "layers": after["layers"]})
        resistances.append({"elementCategory": category,
                            "interiorResistanceM2kPerW": before["interior"],
                            "exteriorResistanceM2kPerW": before["exterior"]})
    # F3: floor over an unheated crawl space — layer table U-values!Q127:U130, Rsi/Rse in T131:U132
    r.x.check_label("U-values", "Q126", "Layer")
    f3_before, f3_after = [], []
    for row in range(127, 131):
        lam = ws.cell(row, 19).value
        for target, col in ((f3_before, 20), (f3_after, 21)):
            if (ws.cell(row, col).value or 0) > 0:
                target.append({"thicknessM": ws.cell(row, 18).value, "material": {"thermalConductivityWPerMk": lam}})
    types.append({"id": "ct-F3", "scenario": "before", "retrofitOfId": None, "elementCategory": "floor", "layers": f3_before})
    types.append({"id": "ct-F3-after", "scenario": "after", "retrofitOfId": "ct-F3", "elementCategory": "floor", "layers": f3_after})
    return types, resistances


def opening_types(r: Reader, wall_openings: dict) -> list[dict]:
    """Before types per (code, width, height) used in the element table + the three after types."""
    s = "Envelope"
    u_before = {}
    for row in (86, 87, 88, 90, 91, 92):
        u_before[r.text(s, f"AG{row}", ("AG84", "Type"))] = r.num(s, f"AH{row}", ("AH84", "Uvalue"))
    # window optics: the single before / after row of the gains sheet (shading = area-weighted over orientations)
    gains = "gains"

    def optics(first_row: int):
        g_value = r.num(gains, f"C{first_row}", ("C4", "gn"))
        frame = r.num(gains, f"D{first_row}", ("D4", "Fw"))
        weighted, area = 0.0, 0.0
        for row in range(first_row, first_row + 6):
            a_raw = r.wb[gains].cell(row, 2).value
            a = 0.0 if a_raw is None else r.num(gains, f"B{row}")  # empty area cell (Horizontal) = no such windows
            weighted += a * r.num(gains, f"H{row}")
            area += a
        return g_value, frame, (weighted / area if area else 1.0)

    g_b, fw_b, sh_b = optics(5)
    g_a, fw_a, sh_a = optics(26)
    types = []
    for (code, w, h), category in sorted(wall_openings.items(), key=lambda kv: (kv[0][0], kv[0][1], kv[0][2])):
        is_window = category == "window"
        types.append({
            "id": f"ot-{slug(code)}-{w:g}x{h:g}", "category": category, "scenario": "before",
            "uValueWm2k": u_before[code], "gValue": g_b if is_window else None,
            "frameFactor": fw_b if is_window else None, "shadingFactor": sh_b if is_window else 1,
            "widthM": w, "heightM": h,
        })
    for row, category in ((98, "window"), (99, "window"), (100, "door")):
        code = r.text(s, f"AG{row}", ("AG96", "Type"))
        types.append({
            "id": f"ot-{code}", "category": category, "scenario": "after",
            "uValueWm2k": r.num(s, f"AH{row}", ("AH96", "Uvalue")),
            "gValue": g_a if category == "window" else None,
            "frameFactor": fw_a if category == "window" else None,
            "shadingFactor": sh_a if category == "window" else 1,
            "widthM": None, "heightM": None,
        })
    return types


def envelope_elements(r: Reader) -> tuple[list[dict], dict]:
    s = "Envelope"
    ws = r.wb[s]
    r.x.check_label(s, "E4", "Element")
    start_rows = [row for row in range(7, 63) if isinstance(ws.cell(row, 5).value, str) and ws.cell(row, 5).value.strip()]
    elements, wall_openings = [], {}
    category_of = {"W1": "external_wall", "Socle 1. (heated space)": "socle_heated", "Socle 2": "socle_ground"}
    construction_of = {"W1": "ct-W1", "Socle 1. (heated space)": "ct-Socle1", "Socle 2": "ct-Socle2"}
    w1_net = 0.0
    deductions: list[float] = []
    for index, row in enumerate(start_rows):
        code = ws.cell(row, 5).value.strip()
        if code == "Parapet":
            continue  # NOT in the heat-loss calculation (Envelope!AI105: the parapet sits above the heated envelope)
        if code not in construction_of:
            fail(f"Envelope!E{row}: unknown element type {code!r}")
        next_start = start_rows[index + 1] if index + 1 < len(start_rows) else 63
        orientation = ORIENTATION.get(str(ws.cell(row, 3).value or "").strip(), "north")
        f, g, h = (ws.cell(row, c).value for c in (6, 7, 8))
        i_area, j_area = ws.cell(row, 9).value, ws.cell(row, 10).value
        num = lambda v: isinstance(v, (int, float))
        if not num(f) and (not num(i_area) or i_area == 0) and (not num(j_area) or j_area == 0):
            continue  # zero-area placeholder rows (porch/abutment schedules, Envelope!48-50)
        if not num(f) and num(i_area) and i_area < 0:
            # negative deduction (Envelope!51, link-corridor abutment): the engine clamps element area at 0,
            # so it is subtracted from the C-block wall (rows 43/46) below; see MODEL_GAPS
            deductions.append(-i_area)
            continue
        if num(f):
            length, h_env, h_ground = f, g or 0, h or 0
        elif isinstance(i_area, (int, float)) and i_area != 0:
            length, h_env, h_ground = i_area, 1, 0  # area-based row (socle, deduction): length = area × 1 m
        elif isinstance(j_area, (int, float)) and j_area != 0:
            length, h_env, h_ground = j_area, 0, 1  # ground-contact area
        else:
            fail(f"Envelope row {row}: no geometry")
        openings = []
        for sub in range(row, next_start):
            width, height = ws.cell(sub, 12).value, ws.cell(sub, 13).value
            if isinstance(width, (int, float)) and isinstance(height, (int, float)):
                for col, wcode in ((14, "Win1"), (15, "Win2"), (16, "Win3")):
                    count = ws.cell(sub, col).value
                    if isinstance(count, (int, float)) and count > 0:
                        wall_openings[(wcode, width, height)] = "window"
                        openings.append((wcode, width, height, count, "window"))
            dwidth, dheight = ws.cell(sub, 21).value, ws.cell(sub, 22).value
            if isinstance(dwidth, (int, float)) and isinstance(dheight, (int, float)):
                for col, dcode in ((23, "D1"), (24, "D2"), (25, "D3")):
                    count = ws.cell(sub, col).value
                    if isinstance(count, (int, float)) and count > 0:
                        wall_openings[(dcode, dwidth, dheight)] = "door"
                        openings.append((dcode, dwidth, dheight, count, "door"))
        element = {
            "id": f"el-{row}", "constructionTypeId": construction_of[code], "orientation": orientation,
            "lengthM": length, "heightEnvContactM": h_env, "heightGroundContactM": h_ground,
            "openings": [{"openingTypeId": f"ot-{slug(c)}-{w:g}x{hh:g}", "count": int(n),
                          "openingType": {"category": cat, "widthM": w, "heightM": hh}}
                         for c, w, hh, n, cat in openings],
        }
        elements.append(element)
        if code == "W1":
            w1_net += length * (h_env + h_ground) - sum(w * hh * n for _, w, hh, n, _ in openings)
    for deduction in deductions:
        target = next(e for e in elements if e["id"] == "el-43")  # C-block long elevation, h = 3.22 m
        target["lengthM"] -= deduction / target["heightEnvContactM"]
        w1_net -= deduction
    expected_w1 = r.num(s, "K74", ("D74", "Total"), ("E74", "W1"))
    if abs(w1_net - expected_w1) > 0.01:
        fail(f"Envelope: W1 net area from parsed rows {w1_net} != Envelope!K74 {expected_w1}")
    # roof and floors are area-only rows in the types table (Envelope!AG:AH)
    for ident, ct, area_addr, code_addr, code in (
        ("R1", "ct-R1", "AH122", "AG122", "R1"), ("F1", "ct-F1", "AH115", "AG115", "F1"),
        ("F3", "ct-F3", "AH117", "AG117", "F3"),
    ):
        area = r.num(s, area_addr, (code_addr, code))
        elements.append({"id": f"el-{ident}", "constructionTypeId": ct, "orientation": "north",
                         "lengthM": area, "heightEnvContactM": 1, "heightGroundContactM": 0, "openings": []})
    return elements, wall_openings


# --------------------------------------------------------------------------- services


def ventilation(r: Reader) -> list[dict]:
    s = "Ventilation losses"
    fresh = r.num(s, "F45", ("D45", "72 decentralised")) # = G45 / E45 (5040 m3/h over 418 people)
    return [
        {"scenario": "before", "systemType": "natural", "airChangeRatePerHour": r.num(s, "E5", ("B5", "Before renovation"), ("E3", "Air exchange rate")),
         "freshAirPerPersonM3h": None, "heatRecoveryEfficiency": None, "fanElectricalPowerKw": None, "coolingSeasonHours": None},
        {"scenario": "after", "systemType": "natural", "airChangeRatePerHour": r.num(s, "E10", ("B10", "After renovation"), ("E3", "Air exchange rate")),
         "freshAirPerPersonM3h": None, "heatRecoveryEfficiency": None, "fanElectricalPowerKw": None, "coolingSeasonHours": None},
        {"scenario": "after", "systemType": "mechanical", "airChangeRatePerHour": None,
         "freshAirPerPersonM3h": fresh, "heatRecoveryEfficiency": r.num(s, "H45", ("D45", "72 decentralised")),
         # nameplate power of the two ventilation lines of the Equipment sheet (rows 85-86), see modelGaps
         "fanElectricalPowerKw": r.num("Equipment", "F85") + r.num("Equipment", "F86"),
         "coolingSeasonHours": None},
    ]


def dhw(r: Reader) -> list[dict]:
    s = "DHW generation"
    out = []
    for scenario, rows, header in (("before", (5, 6), "B3"), ("after", (23, 24), "B21")):
        r.x.check_label(s, header, "Description of source")
        for row in rows:
            carrier = r.text(s, f"C{row}")
            out.append({"scenario": scenario, "energyCarrier": "electricity",
                        "specificConsumptionLPersonDay": r.num(s, f"D{row}", (f"D{3 if scenario == 'before' else 21}", "Consumption")),
                        "personsServed": int(r.num(s, f"E{row}")), "_source": carrier})
    for entry in out:
        entry.pop("_source")
    return out


def distribution(r: Reader) -> tuple[list[dict], list[dict]]:
    s = "Heat distr. efficiency"
    r.x.check_label(s, "R8", "60")
    mean_temp = r.num(s, "R8")  # the 60 °C column that J10 = VLOOKUP(..., 3) reads
    systems = [
        {"scenario": "before", "systemType": "heating", "pipeDiameterClass": r.text(s, "D10", ("B6", "Before renovation")),
         "lengthM": r.num(s, "E10"), "insulatedFraction": r.num(s, "F10"), "meanFluidTempC": mean_temp},
        {"scenario": "after", "systemType": "heating", "pipeDiameterClass": r.text(s, "D17", ("B13", "After renovation")),
         "lengthM": r.num(s, "E17"), "insulatedFraction": r.num(s, "F17"), "meanFluidTempC": mean_temp},
    ]
    refs = []
    r.x.check_label(s, "Q8", "≤50")
    for row in (9, 10, 11):
        diameter = r.text(s, f"P{row}", ("P5", "Nominal internal pipe diameter"))
        for col, temp in (("Q", 50), ("R", 60), ("S", 70)):
            refs.append({"diameterClass": diameter, "insulated": "insulated", "meanFluidTempC": temp,
                         "maxHeatFluxWPerM": r.num(s, f"{col}{row}")})
    r.x.check_label(s, "Q15", "Mean temperature of the heat carrier - 60")
    for row in (17, 18, 19):
        refs.append({"diameterClass": r.text(s, f"P{row}", ("P15", "Nominal internal pipe diameter")), "insulated": False,
                     "meanFluidTempC": None, "maxHeatFluxWPerM": r.num(s, f"Q{row}")})
    return systems, refs


def generation(r: Reader) -> list[dict]:
    s = "Overall gener. & distrib. eff."
    ihs = "IHS"
    cop = r.num(ihs, "D34", ("B34", "Seasonal COP"))  # documented exception: monthly SCOP is a P2 model (D6)
    items = [
        ("heating-before", "heating", "before", "gas_boiler", r.num(s, "G7", ("C7", "Before: existing gas boiler")), r.num(s, "E7")),
        ("heating-after", "heating", "after", "heat_pump", cop, r.num(s, "K7")),
        ("dhw-before", "dhw", "before", "electric_boiler", r.num(s, "G11", ("C11", "Electric water heaters")), r.num(s, "E11")),
        ("dhw-after", "dhw", "after", "electric_boiler", r.num(s, "M11", ("C11", "Electric water heaters")), r.num(s, "K11")),
        ("dhw-solar-after", "dhw", "after", "solar_dhw", r.num(s, "M12", ("C12", "Solar DHW")), r.num(s, "K12")),
        ("cooling-before", "cooling", "before", "split_ac", r.num(s, "G15", ("C15", "Split systems")), r.num(s, "E15")),
        ("cooling-after", "cooling", "after", "split_ac", r.num(s, "M15", ("C15", "Split systems")), r.num(s, "K15")),
    ]
    check_formula(s, "F11", "=D11*(1-(0.98*0.85))")
    check_formula(s, "L11", "=J11*(1-(0.98*0.85))")
    unpiped = {"dhw-before": UNPIPED_DHW_ETA, "dhw-after": UNPIPED_DHW_ETA}  # electric DHW heaters: no pipe segments
    return [{"id": f"gen-{i}", "endUse": e, "scenario": sc, "sourceType": t, "efficiencyOrSeer": eff, "shareOfDemand": share,
             "distributionEfficiency": unpiped.get(i)}
            for i, e, sc, t, eff, share in items]


def lighting(r: Reader) -> tuple[list[dict], list[dict]]:
    s = "Lighting"
    zones = []
    for scenario, row in (("before", 8), ("after", 13)):
        zones.append({
            "scenario": scenario, "areaM2": r.num(s, f"D{row}", ("D5", "Area")),
            "technologyMix": {
                "incandescentFraction": r.num(s, f"E{row}", ("E6", "Incandescent")),
                "fluorescentElectromagneticFraction": r.num(s, f"F{row}", ("F6", "Fluorescent")),
                "fluorescentElectronicFraction": r.num(s, f"G{row}", ("G6", "Fluorescent")),
                "ledFraction": r.num(s, f"H{row}", ("H6", "LED")),
            },
            "utilizationFactor": r.num(s, f"K{row}", ("K5", "Utilization factor")),
        })
    names = ["Incandescent", "Fluorescent, electromagnetic", "Fluorescent, electronic", "LED"]
    keys = ["incandescent", "fluorescentElectromagnetic", "fluorescentElectronic", "led"]
    lamps = [{"name": f"@LAMP:{k}", "powerDensityWPerM2": r.num(s, f"R{8 + i}", (f"Q{8 + i}", names[i]))}
             for i, k in enumerate(keys)]
    return zones, lamps


def equipment(r: Reader) -> list[dict]:
    s = "Equipment"
    out = []
    for scenario, first, last, header in (("before", 6, 48, "B2"), ("after", 56, 99, "B52")):
        r.x.check_label(s, header, "No.")
        for row in range(first, last + 1):
            if scenario == "after" and row in (85, 86):
                # exhaust fans + 72 ERV units: the workbook counts them under mechanical ventilation
                # (Ventilation losses!I50), not in Equipment!K100 -> they feed ventilationSystem.fanElectricalPowerKw
                r.x.check_label(s, f"C{row}", "Exhaust fans" if row == 85 else "72 decentralised")
                continue
            power, units = r.num_or_none(s, f"D{row}"), r.num_or_none(s, f"E{row}")
            if not power or not units:
                continue
            out.append({
                "scenario": scenario, "unitPowerKw": power, "quantity": int(units),
                "heatingSeasonHours": r.num_or_none(s, f"G{row}") or 0,
                "coolingSeasonHours": r.num_or_none(s, f"H{row}") or 0,
                "heatingUtilizationFactor": r.num_or_none(s, f"I{row}") or 0,
                "coolingUtilizationFactor": r.num_or_none(s, f"J{row}") or 0,
            })
    return out


def cooling(r: Reader) -> tuple[list[dict], list[dict]]:
    s = "Cooling"
    windows = []
    for scenario, rows in (("before", range(6, 13)), ("after", range(15, 22))):
        for row in rows:
            area = r.num(s, f"G{row}")
            if area <= 0:
                continue
            orientation = ORIENTATION[r.text(s, f"F{row}")]
            windows.append({"scenario": scenario, "orientation": orientation, "areaM2": area,
                            "gValue": r.num(s, f"H{row}", ("H3", "Reduction factor")),
                            "shadingFactor": r.num(s, f"I{row}", ("I3", "Shading reduction factor"))})
    systems = [
        {"scenario": "before", "seer": r.num(s, "G37", ("G35", "Seasonal Coefficient")),
         "distributionEfficiency": COOLING_DISTRIBUTION_ETA},
        {"scenario": "after", "seer": r.num(s, "O37", ("O35", "Seasonal Coefficient")),
         "distributionEfficiency": COOLING_DISTRIBUTION_ETA},
    ]
    check_formula("Overall gener. & distrib. eff.", "F15", "=D15*(1-96%)")
    check_formula("Overall gener. & distrib. eff.", "L15", "=J15*(1-96%)")
    return windows, systems


def renewables(r: Reader) -> list[dict]:
    pv = "PV"
    r.x.check_label(pv, "C12", "Monthly electricity production")
    monthly = [{"productionKwh": r.num(pv, f"C{13 + i}", (f"B{13 + i}", name))}
               for i, name in enumerate(["January", "February", "March", "April", "May", "June", "July",
                                         "August", "September", "October", "November", "December"])]
    solar = [{"productionKwh": r.num("Solar DHW", "I13", ("B13", "Proposed solar DHW"), ("I11", "DHW generation"))}]
    return [
        {"systemType": "pv", "monthlyProduction": monthly},
        {"systemType": "solar_dhw", "monthlyProduction": solar},
    ]


def utility_bills(r: Reader) -> list[dict]:
    s = "Consumption"
    r.x.check_label(s, "V10", "kWh/m3")
    ncv = r.num(s, "U10")  # gas net calorific value, kWh/m3
    out = []
    for carrier, header, first, native_to_kwh in (("gas", "B4", 7, ncv), ("electricity", "B22", 25, 1)):
        for col, year_cell in (("D", "D"), ("G", "G"), ("J", "J")):
            year_text = r.text(s, f"{year_cell}{first - 3}", (f"{header[0]}{first - 3}", "GAS" if carrier == "gas" else "Electrical"))
            year = int(year_text.split()[-1])
            for i in range(12):
                row = first + i
                value = r.num_or_none(s, f"{col}{row}")
                if value is None:
                    continue
                out.append({"energyCarrier": carrier, "year": year, "consumptionKwh": value * native_to_kwh})
    return out


MEASURE_CATEGORY = {
    1: "envelope_wall_insulation", 2: "envelope_wall_insulation", 3: "other", 4: "envelope_roof_insulation",
    5: "envelope_floor_insulation", 6: "window_replacement", 7: "window_replacement", 8: "window_replacement",
    9: "other", 10: "mechanical_ventilation_heat_recovery", 11: "gas_boiler_replacement", 12: "other",
    13: "heating_system", 14: "solar_dhw", 15: "pv", 16: "lighting", 17: "equipment_replacement", 18: "ems",
    19: "other",
}


def measures(r: Reader) -> tuple[list[dict], list[dict]]:
    s = "Measures_summary"
    energy = []
    for n in range(1, 20):
        row = 4 + n
        r.x.check_label(s, f"B{row}", str(n))
        energy.append({
            "id": f"measure-{n}", "name": r.text(s, f"C{row}"), "category": MEASURE_CATEGORY[n],
            "investmentCostUsd": r.num(s, f"D{row}"), "lifetimeYears": int(r.num(s, f"M{row}")),
            "maintenanceCostPercent": r.num(s, f"R{row}"),
            "proposedForImplementation": r.text(s, f"Q{row}") == "Yes",
        })
    non_ee = []
    n_s = "Non-EE measures"
    r.x.check_label(n_s, "C3", "Non-EE Measures")
    for n in range(1, 14):
        row = 3 + n
        r.x.check_label(n_s, f"B{row}", str(n))
        unit = r.wb[n_s][f"E{row}"].value
        non_ee.append({"id": f"non-ee-{n}", "description": r.text(n_s, f"C{row}"),
                       "unit": unit, "quantity": r.num(n_s, f"F{row}"), "unitCostUsd": r.num(n_s, f"G{row}")})
    return energy, non_ee


def tariffs(r: Reader) -> list[dict]:
    s = "Measures_summary"
    out = []
    for col, carrier in (("D", "gas"), ("E", "electricity"), ("F", "district_heat"), ("G", "coal")):
        out.append({"energyCarrier": carrier,
                    "unitCostUsd": r.num(s, f"{col}45", ("C45", "Energy cost")),
                    "emissionFactorKgCo2PerKwh": r.num(s, f"{col}43", ("C43", "Emission factor"))})
    return out


def financial_parameters(r: Reader) -> dict:
    s = "Financial parameters"

    def num(row: int, label: str) -> float:
        return r.num(s, f"D{row}", (f"B{row}", label))

    # D9/D13/D14/D15 are formulas of D7/D8/D10..D12 (nominal values are derived by the engine)
    check_formula(s, "D9", "=(1+D8)*(1+D7)-1")
    check_formula(s, "D15", "=D7")
    return {
        "baseYear": int(num(5, "Base year")),
        "periodYears": int(num(6, "Calculation period")),
        "inflationRate": num(7, "Inflation"),
        "realDiscountRate": num(8, "Real discount rate"),
        "realEscalationGas": num(10, "Real escalation of the natural gas"),
        "realEscalationElectricity": num(11, "Real escalation of the electricity"),
        "realEscalationHeat": num(12, "Real escalation of the coal"),
        "exchangeRateUzsPerUsd": num(16, "Exchange rate"),
        "gasTariffUzsPerM3": num(17, "Natural gas tariff"),
        "gasNcvKwhPerM3": num(22, "Natural gas net calorific"),
        "electricityTariffUzsPerKwh": num(18, "Electricity tariff"),
        "heatTariffUzsPerGcal": num(20, "Thermal energy tariff"),
        "coalPriceUzsPerT": num(21, "Coal price"),
        "coalNcvKwhPerKg": None,  # no source cell
        "pvExportEnabled": True,  # the workbook counts exported PV electricity (D19, PV!C38)
        "pvExportTariffUzsPerKwh": num(19, "PV export"),
        "irrInitialGuess": num(23, "IRR - initial guess"),
        "tariffSource": None,
        "tariffEffectiveDate": None,
    }


MODEL_GAPS = [
    "Floors F1/F3: the zone method and the unheated-space temperature factor n are not modelled (F08); layers are given, U comes out as a plain layer sum.",
    "Surface resistances are one record per element category (first construction of that category); v7.20 sets Rint/Rext per construction block.",
    "Envelope!I51 (-27.692 m2 link-corridor deduction) is a negative-length W1 element; the engine clamps each element to >= 0.",
    "Parapet (Envelope row 56-58) is excluded: v7.20 has no heat-loss row for it (Envelope!AI105).",
    "Window shading is an area-weighted average of gains!H (orientation-specific Fhor*Fov*Ffin); the engine has one shadingFactor per opening type.",
    "Opening types are one per (code, width, height); after-scenario types are the three new codes with retrofitOfId = null (F07).",
    "Mechanical ventilation: the exhaust-only 4070 m3/h line (Ventilation losses row 46) has no representation; fan power is the Equipment nameplate sum (rows 85-86).",
    "Lighting operation hours (Lighting!J = 2500 h/y) have no input; the engine uses operation hours x heating-season days.",
    "DHW: v7.20 uses working days (112/138) and DeltaT 55/45; the engine uses heating-season days with fixed DeltaT.",
    "Heat pump COP is the single seasonal value IHS!D34 (an intermediate result; monthly SCOP is P2/D6).",
    "Solar DHW production is a single annual value given as one monthly row.",
    "Non-operation Delta-t and ground-contact elements follow v7.20 row-specific rules (D9) the engine does not have.",
]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--xlsx", required=True, type=Path)
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--sha256", default=WORKBOOK_SHA256, help="expected workbook sha256 (testing only)")
    args = parser.parse_args()

    wb = load_workbook(args.xlsx, args.sha256)
    r = Reader(Extractor(wb))
    global FORMULA_WB
    FORMULA_WB = openpyxl.load_workbook(args.xlsx)  # sha256 already verified above

    elements, wall_openings = envelope_elements(r)
    c_types, resistances = constructions(r)
    zones, lamps = lighting(r)
    dist_systems, pipe_refs = distribution(r)
    cool_windows, cool_systems = cooling(r)
    energy_measures, non_ee = measures(r)
    inputs = {
        "building": building(r),
        "climateRegion": climate(r),
        "blocks": blocks(r),
        "envelopeElements": elements,
        "constructionTypes": c_types,
        "openingTypes": opening_types(r, wall_openings),
        "surfaceResistances": resistances,
        "ventilationSystems": ventilation(r),
        "coolingWindows": cool_windows,
        "coolingSystems": cool_systems,
        "dhwSources": dhw(r),
        "distributionSystems": dist_systems,
        "pipeLossReferences": pipe_refs,
        "generationSources": generation(r),
        "lightingZones": zones,
        "lampTypes": lamps,
        "equipmentItems": equipment(r),
        "renewableSystems": renewables(r),
        "utilityBills": utility_bills(r),
        "energyMeasures": energy_measures,
        "nonEeMeasures": non_ee,
        "tariffs": tariffs(r),
        "financialParameters": financial_parameters(r),
    }
    document = {
        "meta": {
            "workbook": WORKBOOK_NAME, "sha256": WORKBOOK_SHA256, "version": VERSION,
            "lastDecision": LAST_DECISION,
            "extractedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "extractor": "tools/golden/extract_inputs.py",
            "lampTypeNote": "lampTypes[].name '@LAMP:<key>' is replaced by LAMP_TYPE_NAMES[<key>] when the test loads the fixture",
        },
        "modelGaps": MODEL_GAPS,
        "inputs": inputs,
    }
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {args.out}")


if __name__ == "__main__":
    main()
