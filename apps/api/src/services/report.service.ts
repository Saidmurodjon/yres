import type { building } from "@yres/db";
import type { AuditResult } from "@yres/types";
import { type PDFFont, type PDFPage, PDFDocument, StandardFonts, rgb } from "pdf-lib";

type Building = typeof building.$inferSelect;

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.45, 0.45, 0.48);
const RULE = rgb(0.85, 0.85, 0.87);
const ACCENT = rgb(0.15, 0.35, 0.32);

/**
 * Minimal top-to-bottom flow layout on top of pdf-lib's raw per-page drawing
 * API (it has no built-in text flow or tables) — tracks a cursor and starts
 * a new page whenever the next block wouldn't fit.
 */
class ReportLayout {
  private doc: PDFDocument;
  private page: PDFPage;
  private y: number;
  private regular: PDFFont;
  private bold: PDFFont;

  private constructor(doc: PDFDocument, regular: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  static async create(): Promise<ReportLayout> {
    const doc = await PDFDocument.create();
    const regular = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);
    return new ReportLayout(doc, regular, bold);
  }

  private ensureSpace(height: number) {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      this.y = PAGE_HEIGHT - MARGIN;
    }
  }

  title(text: string) {
    this.ensureSpace(30);
    this.page.drawText(text, { x: MARGIN, y: this.y - 20, size: 20, font: this.bold, color: INK });
    this.y -= 34;
  }

  heading(text: string) {
    this.ensureSpace(28);
    this.y -= 10;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 13, font: this.bold, color: ACCENT });
    this.y -= 6;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: PAGE_WIDTH - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 16;
  }

  paragraph(text: string) {
    this.ensureSpace(16);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 9.5, font: this.regular, color: MUTED });
    this.y -= 16;
  }

  /** Two-column label/value rows, e.g. building metadata or KPI cards flattened to text. */
  keyValueGrid(pairs: [string, string][], columns = 2) {
    const colWidth = CONTENT_WIDTH / columns;
    const rowHeight = 32;
    for (let i = 0; i < pairs.length; i += columns) {
      this.ensureSpace(rowHeight);
      const rowPairs = pairs.slice(i, i + columns);
      rowPairs.forEach(([label, value], col) => {
        const x = MARGIN + col * colWidth;
        this.page.drawText(label, { x, y: this.y, size: 8, font: this.regular, color: MUTED });
        this.page.drawText(value, {
          x,
          y: this.y - 14,
          size: 12,
          font: this.bold,
          color: INK,
        });
      });
      this.y -= rowHeight;
    }
  }

  table(headers: string[], rows: string[][], columnWidths: number[]) {
    const rowHeight = 18;
    const drawHeaderRow = () => {
      this.ensureSpace(rowHeight * 2);
      let x = MARGIN;
      for (let i = 0; i < headers.length; i++) {
        this.page.drawText(headers[i] ?? "", {
          x,
          y: this.y,
          size: 8.5,
          font: this.bold,
          color: INK,
        });
        x += columnWidths[i] ?? 60;
      }
      this.y -= 4;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: PAGE_WIDTH - MARGIN, y: this.y },
        thickness: 0.5,
        color: RULE,
      });
      this.y -= rowHeight - 4;
    };

    drawHeaderRow();
    for (const row of rows) {
      if (this.y - rowHeight < MARGIN) {
        this.page = this.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        this.y = PAGE_HEIGHT - MARGIN;
        drawHeaderRow();
      }
      let x = MARGIN;
      for (let i = 0; i < row.length; i++) {
        this.page.drawText(row[i] ?? "", {
          x,
          y: this.y,
          size: 8.5,
          font: this.regular,
          color: INK,
        });
        x += columnWidths[i] ?? 60;
      }
      this.y -= rowHeight;
    }
    this.y -= 8;
  }

  async toBytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${fmt(value, 0)}`;
}

/**
 * Renders a fresh AuditResult (see routes/audit.ts's "recalculate on demand"
 * rule — this never reads a stored result) into a downloadable PDF report.
 */
export async function generateAuditReportPdf(
  building: Building,
  result: AuditResult,
): Promise<Uint8Array> {
  const layout = await ReportLayout.create();

  layout.title("YRES Energy Audit Report");
  layout.paragraph(
    `${building.name} — ${building.location} — generated ${new Date(result.generatedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
  );

  layout.heading("Building");
  layout.keyValueGrid(
    [
      ["Name", building.name],
      ["Location", building.location],
      ["Type", building.buildingType.replace(/_/g, " ")],
      ["Year built", building.yearBuilt ? String(building.yearBuilt) : "—"],
      [
        "Net cooled floor area",
        building.netCooledFloorAreaM2 ? `${fmt(building.netCooledFloorAreaM2, 0)} m²` : "—",
      ],
      ["Occupants", String(building.occupantCount)],
    ],
    2,
  );

  layout.heading("Summary");
  const { summary } = result;
  layout.keyValueGrid(
    [
      ["Current energy use", `${fmt(summary.currentEnergyUseKwhPerM2Year, 0)} kWh/m²/yr`],
      ["Potential energy use", `${fmt(summary.potentialEnergyUseKwhPerM2Year, 0)} kWh/m²/yr`],
      ["Potential savings", `${fmt(summary.potentialSavingsKwhPerM2Year, 0)} kWh/m²/yr`],
      ["CO2 reduction", `${fmt(summary.co2ReductionTonnesPerYear, 1)} tCO2/yr`],
      ["Total investment", fmtUsd(summary.totalInvestmentUsd)],
      ["  of which ancillary (non-energy-saving)", fmtUsd(summary.totalNonEeMeasureCostUsd)],
      ["Total annual savings", fmtUsd(summary.totalAnnualSavingsUsd)],
      [
        "Simple payback",
        summary.simplePaybackYears !== null ? `${fmt(summary.simplePaybackYears, 1)} yr` : "—",
      ],
    ],
    3,
  );

  layout.heading("Envelope areas");
  const areas = result.envelopeAreas;
  layout.table(
    ["Element", "Area (m²)"],
    [
      ["External wall", fmt(areas.externalWallAreaM2, 1)],
      ["Socle", fmt(areas.socleAreaM2, 1)],
      ["Roof", fmt(areas.roofAreaM2, 1)],
      ["Floor", fmt(areas.floorAreaM2, 1)],
      ["Windows", fmt(areas.windowAreaM2, 1)],
      ["Doors", fmt(areas.doorAreaM2, 1)],
    ],
    [280, 100],
  );

  layout.heading("Heating energy balance (before vs. after)");
  layout.table(
    ["Scenario", "Annual net heating need (kWh)"],
    result.heatingEnergyBalance.map((r) => [
      r.scenario === "before" ? "Before (baseline)" : "After (proposed)",
      fmt(r.annualNetEnergyNeedKwh, 0),
    ]),
    [280, 200],
  );

  layout.heading("Final energy by end-use");
  layout.table(
    ["End use", "Scenario", "Final energy (kWh)"],
    result.finalEnergyByEndUse.map((e) => [
      e.endUse,
      e.scenario === "before" ? "Before" : "After",
      fmt(e.finalEnergyConsumptionKwh, 0),
    ]),
    [180, 120, 180],
  );

  const proposedMeasures = result.measures.filter((m) => m.proposedForImplementation);
  layout.heading(
    proposedMeasures.length > 0
      ? "Recommended measures (proposed for implementation)"
      : "Measures (none currently selected for implementation)",
  );
  const measuresToList = proposedMeasures.length > 0 ? proposedMeasures : result.measures;
  if (measuresToList.length === 0) {
    layout.paragraph("No energy-saving measures have been defined for this building yet.");
  } else {
    layout.table(
      ["Measure", "Investment", "Annual savings", "Payback (yr)", "CO2 (t/yr)"],
      measuresToList.map((m) => [
        m.name,
        fmtUsd(m.investmentCostUsd),
        `${fmtUsd(m.standardizedAnnualSavingsUsd)} (${fmt(m.standardizedAnnualSavingsKwh, 0)} kWh)`,
        m.simplePaybackYears !== null ? fmt(m.simplePaybackYears, 1) : "—",
        fmt(m.co2ReductionTonnesPerYear, 1),
      ]),
      [140, 80, 160, 80, 60],
    );
  }

  if (result.nonEeMeasures.length > 0) {
    layout.heading("Ancillary costs (non-energy-saving)");
    layout.table(
      ["Description", "Quantity", "Unit cost", "Total cost"],
      result.nonEeMeasures.map((m) => [
        m.description,
        `${fmt(m.quantity, 1)}${m.unit ? ` ${m.unit}` : ""}`,
        fmtUsd(m.unitCostUsd),
        fmtUsd(m.totalCostUsd),
      ]),
      [200, 100, 80, 80],
    );
  }

  return layout.toBytes();
}
