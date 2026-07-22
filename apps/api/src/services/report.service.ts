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

/** Chart series colors — a handful of muted, print-safe tones distinct enough to tell apart in grayscale too (varying lightness, not just hue). */
const CHART_PALETTE = [
  ACCENT,
  rgb(0.55, 0.42, 0.15),
  rgb(0.25, 0.4, 0.55),
  rgb(0.5, 0.25, 0.35),
  rgb(0.35, 0.5, 0.3),
  rgb(0.6, 0.6, 0.62),
];

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

  /**
   * Vertical bar chart drawn with raw `drawRectangle`/`drawText` — pdf-lib
   * has no chart primitive, and `recharts` (used for the equivalent web
   * dashboard charts) can't run here: this service executes in the Workers
   * runtime, which has no DOM/canvas to render into (see
   * `.claude/rules/hisobot.md`). Bars are proportional to `chartHeight`;
   * each bar gets a value label above it and a category label below.
   */
  barChart(data: { label: string; value: number }[], chartHeight = 120) {
    if (data.length === 0) return;
    const labelBandHeight = 28;
    const totalHeight = chartHeight + labelBandHeight;
    this.ensureSpace(totalHeight);

    const maxValue = Math.max(...data.map((d) => Math.abs(d.value)), 1);
    const slotWidth = CONTENT_WIDTH / data.length;
    const barWidth = Math.min(slotWidth * 0.55, 48);
    const baselineY = this.y - chartHeight;

    this.page.drawLine({
      start: { x: MARGIN, y: baselineY },
      end: { x: PAGE_WIDTH - MARGIN, y: baselineY },
      thickness: 0.75,
      color: RULE,
    });

    data.forEach((d, i) => {
      const barHeight = (Math.abs(d.value) / maxValue) * chartHeight;
      const x = MARGIN + i * slotWidth + (slotWidth - barWidth) / 2;
      this.page.drawRectangle({
        x,
        y: baselineY,
        width: barWidth,
        height: Math.max(barHeight, 0.5),
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      });
      this.page.drawText(fmt(d.value, 0), {
        x,
        y: baselineY + barHeight + 4,
        size: 7,
        font: this.regular,
        color: MUTED,
      });
      this.page.drawText(truncateLabel(d.label, slotWidth, 7.5), {
        x: MARGIN + i * slotWidth + 2,
        y: baselineY - 12,
        size: 7.5,
        font: this.regular,
        color: INK,
      });
    });

    this.y -= totalHeight + 8;
  }

  /**
   * Pie chart drawn as a sequence of `drawSvgPath` wedges (an `M`ove to
   * center, `L`ine to the arc's start, `A`rc to its end, `Z` close) — the
   * only way to draw an arbitrary shape pdf-lib doesn't have a primitive
   * for. A side legend is drawn instead of on-slice labels since there's no
   * text-along-a-curve support. Proportions are correct; exact wedge
   * rendering couldn't be visually verified in this sandbox (no PDF
   * viewer) — see `.claude/rules/hisobot.md`'s testing note.
   */
  pieChart(data: { label: string; value: number }[], radius = 55) {
    const positive = data.filter((d) => d.value > 0);
    if (positive.length === 0) return;
    const total = positive.reduce((sum, d) => sum + d.value, 0);
    const diameter = radius * 2;
    const legendRowHeight = 14;
    const blockHeight = Math.max(diameter, positive.length * legendRowHeight) + 10;
    this.ensureSpace(blockHeight);

    const cx = MARGIN + radius;
    const cy = this.y - radius;

    let cumulativeFraction = 0;
    positive.forEach((d, i) => {
      const fraction = d.value / total;
      const path = wedgePath(cx, cy, radius, cumulativeFraction, cumulativeFraction + fraction);
      this.page.drawSvgPath(path, { color: CHART_PALETTE[i % CHART_PALETTE.length] });
      cumulativeFraction += fraction;
    });

    const legendX = MARGIN + diameter + 20;
    positive.forEach((d, i) => {
      const rowY = this.y - 4 - i * legendRowHeight;
      this.page.drawRectangle({
        x: legendX,
        y: rowY - 7,
        width: 8,
        height: 8,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      });
      const pct = ((d.value / total) * 100).toFixed(0);
      this.page.drawText(`${d.label} — ${pct}%`, {
        x: legendX + 12,
        y: rowY - 6,
        size: 8,
        font: this.regular,
        color: INK,
      });
    });

    this.y -= blockHeight;
  }

  async toBytes(): Promise<Uint8Array> {
    return this.doc.save();
  }
}

function truncateLabel(label: string, slotWidth: number, fontSize: number): string {
  const maxChars = Math.max(3, Math.floor(slotWidth / (fontSize * 0.55)));
  return label.length > maxChars ? `${label.slice(0, maxChars - 1)}…` : label;
}

/**
 * Builds an SVG wedge path from center `(cx, cy)` for the arc spanning
 * `[startFraction, endFraction)` of a full circle, measured clockwise from
 * the top. `cx`/`cy` are real page coordinates (PDF's y-axis, origin
 * bottom-left) — but `PDFPage.drawSvgPath` always applies its own
 * `scale(1, -1)` to the path it's given ("SVG path Y axis is opposite
 * pdf-lib's", per pdf-lib's own source), and this method is called without
 * an `x`/`y` offset (so no translation cancels it out). Every Y coordinate
 * in the emitted path is therefore negated here so it lands back at the
 * intended page position once pdf-lib flips it.
 */
function wedgePath(
  cx: number,
  cy: number,
  radius: number,
  startFraction: number,
  endFraction: number,
): string {
  const startAngle = Math.PI / 2 - startFraction * 2 * Math.PI;
  const endAngle = Math.PI / 2 - endFraction * 2 * Math.PI;
  const startX = cx + radius * Math.cos(startAngle);
  const startY = cy + radius * Math.sin(startAngle);
  const endX = cx + radius * Math.cos(endAngle);
  const endY = cy + radius * Math.sin(endAngle);
  const largeArcFlag = endFraction - startFraction > 0.5 ? 1 : 0;

  return `M ${cx} ${-cy} L ${startX} ${-startY} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endX} ${-endY} Z`;
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
