import type { building } from "@yres/db";
import type { AuditResult, GenerationSourceResult } from "@yres/types";
import { type PDFFont, type PDFPage, PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { DEFAULT_DISCOUNT_RATE, ENERGY_ESCALATION_RATES } from "./financial.service";
import type {
  CarrierConsumptionHistory,
  ConstructionTypeUValueBreakdown,
  LatestTariffRow,
} from "./report-data.service";

type Building = typeof building.$inferSelect;

/** Raw data `AuditResult` doesn't carry — fetched separately by the `/audit/report` route via `report-data.service.ts` (see `.claude/rules/hisobot.md`). */
export interface ReportExtras {
  uValues: ConstructionTypeUValueBreakdown[];
  consumptionHistory: CarrierConsumptionHistory[];
  tariffs: LatestTariffRow[];
}

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PAGE_WIDTH = 595.28; // A4 in points
const PAGE_HEIGHT = 841.89;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const INK = rgb(0.12, 0.12, 0.14);
const MUTED = rgb(0.45, 0.45, 0.48);
const RULE = rgb(0.85, 0.85, 0.87);
const ACCENT = rgb(0.09, 0.38, 0.34);

/** Chart card surface — every chart sits on this light panel with a colored accent edge so it reads as a designed block rather than bare marks on the page. Donut charts punch their center hole in this exact color so the cutout blends seamlessly with the card (see `pieChart`). */
const CHART_CARD_BG = rgb(0.966, 0.968, 0.971);
const CHART_CARD_BORDER = rgb(0.87, 0.88, 0.9);
const CHART_GRID = rgb(0.85, 0.86, 0.88);

/** Chart series colors — a modern, print-safe flat palette (varying hue AND lightness so grayscale printing still tells series apart). First entry matches ACCENT so single-series charts stay on-brand. */
const CHART_PALETTE = [
  ACCENT,
  rgb(0.16, 0.42, 0.68),
  rgb(0.82, 0.53, 0.15),
  rgb(0.68, 0.29, 0.29),
  rgb(0.42, 0.32, 0.58),
  rgb(0.55, 0.58, 0.62),
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
   * `.claude/rules/hisobot.md`). Sits on a `CHART_CARD_BG` panel with a
   * colored left edge (same treatment as `pieChart`, so the two read as one
   * visual system) and dashed gridlines at 0/25/50/75/100% of the max value
   * with axis labels, rather than bars floating on bare page background.
   * Bars are proportional to `chartHeight`; each gets a bold, centered value
   * label above it and a centered category label below.
   */
  barChart(data: { label: string; value: number }[], chartHeight = 130) {
    if (data.length === 0) return;
    const padding = 14;
    const axisWidth = 26;
    const labelBandHeight = 26;
    const totalHeight = padding * 2 + chartHeight + labelBandHeight;
    this.ensureSpace(totalHeight);

    const cardTop = this.y;
    const cardBottom = cardTop - totalHeight;
    this.page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: CONTENT_WIDTH,
      height: totalHeight,
      color: CHART_CARD_BG,
      borderColor: CHART_CARD_BORDER,
      borderWidth: 0.75,
    });
    this.page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: 3,
      height: totalHeight,
      color: ACCENT,
    });

    const plotLeft = MARGIN + padding + axisWidth;
    const plotRight = MARGIN + CONTENT_WIDTH - padding;
    const plotWidth = plotRight - plotLeft;
    const baselineY = cardTop - padding - chartHeight;
    const maxValue = Math.max(...data.map((d) => Math.abs(d.value)), 1);

    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const gy = baselineY + chartHeight * fraction;
      this.page.drawLine({
        start: { x: plotLeft, y: gy },
        end: { x: plotRight, y: gy },
        thickness: fraction === 0 ? 0.75 : 0.5,
        color: fraction === 0 ? RULE : CHART_GRID,
        dashArray: fraction === 0 || fraction === 1 ? undefined : [1.5, 1.5],
      });
      const axisLabel = fmt(maxValue * fraction, 0);
      const axisLabelWidth = this.regular.widthOfTextAtSize(axisLabel, 6.5);
      this.page.drawText(axisLabel, {
        x: plotLeft - 6 - axisLabelWidth,
        y: gy - 2,
        size: 6.5,
        font: this.regular,
        color: MUTED,
      });
    }

    const slotWidth = plotWidth / data.length;
    const barWidth = Math.min(slotWidth * 0.55, 42);

    data.forEach((d, i) => {
      const barHeight = (Math.abs(d.value) / maxValue) * chartHeight;
      const x = plotLeft + i * slotWidth + (slotWidth - barWidth) / 2;
      this.page.drawRectangle({
        x,
        y: baselineY,
        width: barWidth,
        height: Math.max(barHeight, 0.75),
        color: CHART_PALETTE[i % CHART_PALETTE.length],
      });

      const valueLabel = fmt(d.value, 0);
      const valueLabelWidth = this.bold.widthOfTextAtSize(valueLabel, 7);
      this.page.drawText(valueLabel, {
        x: x + barWidth / 2 - valueLabelWidth / 2,
        y: baselineY + barHeight + 4,
        size: 7,
        font: this.bold,
        color: INK,
      });

      const catLabel = truncateLabel(d.label, slotWidth, 7);
      const catLabelWidth = this.regular.widthOfTextAtSize(catLabel, 7);
      this.page.drawText(catLabel, {
        x: x + barWidth / 2 - catLabelWidth / 2,
        y: baselineY - 12,
        size: 7,
        font: this.regular,
        color: MUTED,
      });
    });

    this.y = cardBottom - 10;
  }

  /**
   * Donut chart: pie wedges via `drawSvgPath` (an `M`ove to center, `L`ine
   * to the arc's start, `A`rc to its end, `Z` close — the only way to draw
   * an arbitrary shape pdf-lib doesn't have a primitive for; arc math is
   * unchanged from the original pie implementation). A thin stroke in the
   * card's own background color separates wedges, and a plain `drawCircle`
   * in that exact same background color punches the center hole — safe
   * because it's a uniform fill matching the surrounding card, not a real
   * clip path, so there's no seam. The total sits in that hole and a side
   * legend (circular swatches + share %) replaces on-slice labels since
   * there's no text-along-a-curve support. Proportions are correct; exact
   * wedge rendering couldn't be visually verified in this sandbox (no PDF
   * viewer) — see `.claude/rules/hisobot.md`'s testing note.
   */
  pieChart(data: { label: string; value: number }[], radius = 60) {
    const positive = data.filter((d) => d.value > 0);
    if (positive.length === 0) return;
    const total = positive.reduce((sum, d) => sum + d.value, 0);
    const diameter = radius * 2;
    const padding = 14;
    const legendRowHeight = 16;
    const innerHeight = Math.max(diameter, positive.length * legendRowHeight);
    const totalHeight = innerHeight + padding * 2;
    this.ensureSpace(totalHeight);

    const cardTop = this.y;
    const cardBottom = cardTop - totalHeight;
    this.page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: CONTENT_WIDTH,
      height: totalHeight,
      color: CHART_CARD_BG,
      borderColor: CHART_CARD_BORDER,
      borderWidth: 0.75,
    });
    this.page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: 3,
      height: totalHeight,
      color: ACCENT,
    });

    const cx = MARGIN + padding + radius + 6;
    const cy = cardTop - padding - radius;

    let cumulativeFraction = 0;
    positive.forEach((d, i) => {
      const fraction = d.value / total;
      const path = wedgePath(cx, cy, radius, cumulativeFraction, cumulativeFraction + fraction);
      this.page.drawSvgPath(path, {
        color: CHART_PALETTE[i % CHART_PALETTE.length],
        borderColor: CHART_CARD_BG,
        borderWidth: 1.5,
      });
      cumulativeFraction += fraction;
    });

    const holeRadius = radius * 0.58;
    this.page.drawCircle({ x: cx, y: cy, size: holeRadius, color: CHART_CARD_BG });

    const totalLabel = fmt(total, 0);
    const totalLabelWidth = this.bold.widthOfTextAtSize(totalLabel, 11);
    this.page.drawText(totalLabel, {
      x: cx - totalLabelWidth / 2,
      y: cy + 1,
      size: 11,
      font: this.bold,
      color: INK,
    });
    const unitLabel = "kWh";
    const unitLabelWidth = this.regular.widthOfTextAtSize(unitLabel, 6.5);
    this.page.drawText(unitLabel, {
      x: cx - unitLabelWidth / 2,
      y: cy - 10,
      size: 6.5,
      font: this.regular,
      color: MUTED,
    });

    const legendX = cx + radius + 24;
    const legendTop = cy + (positive.length * legendRowHeight) / 2;
    positive.forEach((d, i) => {
      const rowY = legendTop - i * legendRowHeight;
      const color = CHART_PALETTE[i % CHART_PALETTE.length];
      this.page.drawCircle({ x: legendX + 4, y: rowY - 3, size: 4, color });
      this.page.drawText(d.label, {
        x: legendX + 14,
        y: rowY - 6,
        size: 8,
        font: this.regular,
        color: INK,
      });
      const pctLabel = `${((d.value / total) * 100).toFixed(0)}%`;
      const pctLabelWidth = this.bold.widthOfTextAtSize(pctLabel, 8);
      this.page.drawText(pctLabel, {
        x: MARGIN + CONTENT_WIDTH - padding - pctLabelWidth,
        y: rowY - 6,
        size: 8,
        font: this.bold,
        color: MUTED,
      });
    });

    this.y = cardBottom - 10;
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
 * Builds a filled wedge path from center `(cx, cy)` for the arc spanning
 * `[startFraction, endFraction)` of a full circle, measured clockwise from
 * the top, as a fan of straight-line segments rather than an SVG elliptical
 * arc (`A`) command. An earlier version used a single `A` command — visually
 * verified (by actually opening a generated PDF) to render wrong for *both*
 * small wedges (thin self-intersecting slivers instead of a slice) and large,
 * >50%-of-circle wedges (a wildly oversized blob): the arc's large-arc/sweep
 * flags interact with `drawSvgPath`'s own `scale(1, -1)` Y-flip ("SVG path Y
 * axis is opposite pdf-lib's", per pdf-lib's source) in a way that isn't the
 * plain flag semantics the flip-cancellation reasoning assumed. A line-segment
 * fan has no arc flags to get wrong — just explicit `(x, y)` pairs — at the
 * cost of a very slightly faceted edge, invisible at this chart's print size
 * with one segment roughly every 4°. `cx`/`cy` are real page coordinates
 * (PDF's y-axis, origin bottom-left); every Y coordinate emitted into the
 * path is negated so it lands back at the intended page position once
 * pdf-lib's automatic flip un-negates it (this part of the original
 * reasoning held up under visual verification and is unchanged).
 */
function wedgePath(
  cx: number,
  cy: number,
  radius: number,
  startFraction: number,
  endFraction: number,
): string {
  const segments = Math.max(2, Math.ceil((endFraction - startFraction) * 90));
  const points: string[] = [];
  for (let i = 0; i <= segments; i++) {
    const fraction = startFraction + ((endFraction - startFraction) * i) / segments;
    const angle = Math.PI / 2 - fraction * 2 * Math.PI;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    points.push(`L ${x} ${-y}`);
  }
  return `M ${cx} ${-cy} ${points.join(" ")} Z`;
}

interface GenerationEfficiencyRow {
  endUse: string;
  scenario: string;
  usefulEnergyNeedKwh: number;
  distributionLossKwh: number;
  finalEnergyConsumptionKwh: number;
  specificFinalEnergyKwhPerM2: number;
  /** Weighted by each source's own `finalEnergyConsumptionKwh` so a mix of e.g. a district-heat and a gas-boiler source doesn't average their efficiencies as if they served equal shares. */
  weightedEfficiencyOrSeer: number;
}

/** `result.generation` is one row per generation *source*; multiple sources can share an end-use (e.g. district heat + a gas boiler both serving "heating"), so this collapses them into one report row per end-use/scenario. */
function aggregateGenerationByEndUseScenario(
  generation: GenerationSourceResult[],
): GenerationEfficiencyRow[] {
  const groups = new Map<string, GenerationSourceResult[]>();
  for (const g of generation) {
    const key = `${g.endUse}|${g.scenario}`;
    const rows = groups.get(key) ?? [];
    rows.push(g);
    groups.set(key, rows);
  }

  return [...groups.values()].map((rows) => {
    const usefulEnergyNeedKwh = rows.reduce((sum, r) => sum + r.usefulEnergyNeedKwh, 0);
    const distributionLossKwh = rows.reduce((sum, r) => sum + r.distributionLossKwh, 0);
    const finalEnergyConsumptionKwh = rows.reduce((sum, r) => sum + r.finalEnergyConsumptionKwh, 0);
    const specificFinalEnergyKwhPerM2 = rows.reduce(
      (sum, r) => sum + r.specificFinalEnergyKwhPerM2,
      0,
    );
    const weightedEfficiencyOrSeer =
      finalEnergyConsumptionKwh > 0
        ? rows.reduce((sum, r) => sum + r.efficiencyOrSeer * r.finalEnergyConsumptionKwh, 0) /
          finalEnergyConsumptionKwh
        : 0;

    return {
      endUse: rows[0]?.endUse ?? "",
      scenario: rows[0]?.scenario ?? "",
      usefulEnergyNeedKwh,
      distributionLossKwh,
      finalEnergyConsumptionKwh,
      specificFinalEnergyKwhPerM2,
      weightedEfficiencyOrSeer,
    };
  });
}

function fmt(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

function fmtUsd(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${fmt(value, 0)}`;
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${fmt(value * 100, 1)}%`;
}

/**
 * Renders a fresh AuditResult (see routes/audit.ts's "recalculate on demand"
 * rule — this never reads a stored result) into a downloadable PDF report.
 */
export async function generateAuditReportPdf(
  building: Building,
  result: AuditResult,
  extras: ReportExtras,
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
  layout.keyValueGrid(
    [
      ["Heating season duration", `${fmt(building.heatingSeasonDurationDays, 0)} days`],
      ["Indoor temp. (operation hours)", `${fmt(building.indoorTempOperationC, 1)} °C`],
      ["Indoor temp. (non-operation hours)", `${fmt(building.indoorTempNonOperationC, 1)} °C`],
      ["Outdoor avg. temp. (heating season)", `${fmt(building.outdoorAvgHeatingSeasonTempC, 1)} °C`],
      ["Outdoor design temp. (coldest 5 days)", `${fmt(building.outdoorDesignTempC, 1)} °C`],
      ["Cooling enthalpy — inside", `${fmt(building.coolingEnthalpyInsideKjKg, 1)} kJ/kg`],
      ["Cooling enthalpy — outside", `${fmt(building.coolingEnthalpyOutsideKjKg, 1)} kJ/kg`],
      ["Cooling enthalpy — hottest day", `${fmt(building.coolingEnthalpyHottestDayKjKg, 1)} kJ/kg`],
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

  if (extras.uValues.length > 0) {
    layout.heading("U-value calculations");
    for (const ct of extras.uValues) {
      layout.paragraph(
        `${ct.code} — ${ct.elementCategory.replace(/_/g, " ")} (${ct.scenario}) — U = ${fmt(ct.uValueWPerM2K, 3)} W/m²K`,
      );
      layout.table(
        ["Layer", "Material", "Thickness (m)", "Conductivity (W/mK)", "R (m²K/W)"],
        ct.layers.map((l, i) => [
          String(i + 1),
          l.materialName,
          fmt(l.thicknessM, 3),
          fmt(l.thermalConductivityWPerMk, 2),
          fmt(l.resistanceM2KPerW, 3),
        ]),
        [40, 190, 90, 110, 90],
      );
      layout.paragraph(
        `Rint = ${fmt(ct.interiorResistanceM2kPerW, 3)} m²K/W · Rext = ${fmt(ct.exteriorResistanceM2kPerW, 3)} m²K/W · Total R = ${fmt(ct.totalThermalResistanceM2KPerW, 3)} m²K/W`,
      );
    }
  }

  if (extras.consumptionHistory.length > 0) {
    layout.heading("Metered energy consumption history (baseline)");
    for (const carrier of extras.consumptionHistory) {
      const years = [
        ...new Set(carrier.months.flatMap((m) => m.byYear.map((y) => y.year))),
      ].sort((a, b) => a - b);
      layout.paragraph(carrier.energyCarrier.replace(/_/g, " "));
      layout.table(
        ["Month", ...years.map(String), "Average (baseline)"],
        carrier.months.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          ...years.map((year) => {
            const yearRow = m.byYear.find((y) => y.year === year);
            return yearRow ? fmt(yearRow.consumptionKwh, 0) : "—";
          }),
          fmt(m.averageConsumptionKwh, 0),
        ]),
        [70, ...years.map(() => 70), 100],
      );
      layout.barChart(
        carrier.months.map((m) => ({
          label: MONTH_NAMES[m.month - 1] ?? String(m.month),
          value: m.averageConsumptionKwh,
        })),
      );
    }
  }

  const generationEfficiency = aggregateGenerationByEndUseScenario(result.generation);
  if (generationEfficiency.length > 0) {
    layout.heading("Generation & distribution efficiency");
    layout.table(
      [
        "End use",
        "Scenario",
        "Useful need (kWh)",
        "Distrib. loss (kWh)",
        "Efficiency/SEER",
        "Final energy (kWh)",
        "Specific (kWh/m²)",
      ],
      generationEfficiency.map((g) => [
        g.endUse,
        g.scenario === "before" ? "Before" : "After",
        fmt(g.usefulEnergyNeedKwh, 0),
        fmt(g.distributionLossKwh, 0),
        fmt(g.weightedEfficiencyOrSeer, 2),
        fmt(g.finalEnergyConsumptionKwh, 0),
        fmt(g.specificFinalEnergyKwhPerM2, 1),
      ]),
      [80, 70, 90, 90, 80, 90, 80],
    );
  }

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

  // `section` distinguishes gross pre-generation envelope/ventilation losses
  // from post-generation purchased final energy — never sum across them
  // (calculation-engine.md).
  const envelopeLossRows = result.energyBalanceBreakdown.filter(
    (r) => r.section === "envelope_ventilation_loss",
  );
  if (envelopeLossRows.length > 0) {
    layout.heading("Envelope & ventilation heat loss breakdown (before vs. after)");
    layout.table(
      ["Category", "Before (kWh)", "After (kWh)"],
      envelopeLossRows.map((r) => [
        r.category.replace(/_/g, " "),
        fmt(r.beforeKwh, 0),
        fmt(r.afterKwh, 0),
      ]),
      [280, 100, 100],
    );
    layout.paragraph("Before-renovation distribution (where heat is lost today):");
    layout.pieChart(
      envelopeLossRows.map((r) => ({ label: r.category.replace(/_/g, " "), value: r.beforeKwh })),
    );
  }

  const finalEnergyRows = result.energyBalanceBreakdown.filter((r) => r.section === "final_energy");
  if (finalEnergyRows.length > 0) {
    layout.heading("Final (purchased) energy breakdown (before vs. after)");
    layout.table(
      ["Category", "Before (kWh)", "After (kWh)"],
      finalEnergyRows.map((r) => [
        r.category.replace(/_/g, " "),
        fmt(r.beforeKwh, 0),
        fmt(r.afterKwh, 0),
      ]),
      [280, 100, 100],
    );
    layout.paragraph("After-renovation distribution (what will be purchased):");
    layout.pieChart(
      finalEnergyRows.map((r) => ({ label: r.category.replace(/_/g, " "), value: r.afterKwh })),
    );
  }

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
    // Standardized and actual are always shown together, never one without
    // the other (calculation-engine.md) — as two adjacent tables sharing the
    // same row order, since this drawing engine has no multi-line cells to
    // fit both scenarios into a single row.
    layout.paragraph("Theoretical savings (standardized conditions):");
    layout.table(
      ["Measure", "Investment", "Std. savings", "Payback (yr)", "NPV", "IRR", "CO2 (t/yr)"],
      measuresToList.map((m) => [
        m.name,
        fmtUsd(m.investmentCostUsd),
        `${fmtUsd(m.standardizedAnnualSavingsUsd)} (${fmt(m.standardizedAnnualSavingsKwh, 0)} kWh)`,
        fmt(m.standardized.simplePaybackYears, 1),
        fmtUsd(m.standardized.npv),
        fmtPct(m.standardized.irr),
        fmt(m.co2ReductionTonnesPerYear, 1),
      ]),
      [110, 65, 100, 55, 55, 50, 50],
    );
    layout.paragraph("Actual savings (calibrated against metered bills):");
    layout.table(
      ["Measure", "Actual savings", "Payback (yr)", "NPV", "IRR"],
      measuresToList.map((m) => [
        m.name,
        `${fmtUsd(m.actualAnnualSavingsUsd)} (${fmt(m.actualAnnualSavingsKwh, 0)} kWh)`,
        fmt(m.actual.simplePaybackYears, 1),
        fmtUsd(m.actual.npv),
        fmtPct(m.actual.irr),
      ]),
      [140, 120, 60, 60, 60],
    );
  }

  if (result.measures.length > 0) {
    layout.heading("GHG emissions (CO2 reduction)");
    layout.paragraph(
      `Total CO2 reduction across all measures: ${fmt(result.summary.co2ReductionTonnesPerYear, 1)} tCO2/yr.`,
    );
    layout.table(
      ["Measure", "CO2 reduction (tCO2/yr)"],
      result.measures.map((m) => [m.name, fmt(m.co2ReductionTonnesPerYear, 1)]),
      [280, 150],
    );
    if (extras.tariffs.length > 0) {
      layout.paragraph(
        `Emission factors used: ${extras.tariffs
          .map((t) => `${t.energyCarrier.replace(/_/g, " ")} ${fmt(t.emissionFactorKgCo2PerKwh, 2)} kgCO2/kWh`)
          .join(" · ")}.`,
      );
    }
  }

  layout.heading("Financial assumptions");
  layout.paragraph(
    `Discount rate: ${fmtPct(DEFAULT_DISCOUNT_RATE)} · Annual fuel-price escalation: ${Object.entries(
      ENERGY_ESCALATION_RATES,
    )
      .map(([carrier, rate]) => `${carrier.replace(/_/g, " ")} ${fmtPct(rate)}`)
      .join(", ")}.`,
  );
  if (extras.tariffs.length > 0) {
    layout.table(
      ["Energy carrier", "Unit cost", "Emission factor"],
      extras.tariffs.map((t) => [
        t.energyCarrier.replace(/_/g, " "),
        `$${fmt(t.unitCostUsd, 3)}/kWh`,
        `${fmt(t.emissionFactorKgCo2PerKwh, 2)} kgCO2/kWh`,
      ]),
      [200, 150, 150],
    );
  }

  if (proposedMeasures.length > 0) {
    layout.heading("Cashflow detail (proposed measures)");
    for (const m of proposedMeasures) {
      layout.paragraph(`${m.name} — lifetime ${m.lifetimeYears} years`);
      layout.table(
        ["Year", "Std. net CF", "Std. discounted", "Std. cumulative", "Actual net CF", "Actual disc.", "Actual cum."],
        m.standardizedCashflow.map((std, i) => {
          const actual = m.actualCashflow[i];
          return [
            String(std.year),
            fmtUsd(std.netCashflow),
            fmtUsd(std.discountedNetCashflow),
            fmtUsd(std.cumulativeDiscountedCashflow),
            actual ? fmtUsd(actual.netCashflow) : "—",
            actual ? fmtUsd(actual.discountedNetCashflow) : "—",
            actual ? fmtUsd(actual.cumulativeDiscountedCashflow) : "—",
          ];
        }),
        [35, 75, 75, 75, 75, 75, 75],
      );
    }
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

  // Annex 2: the monthly/category detail behind the annual figures shown
  // above — already computed by AuditResult but never rendered anywhere.
  // For the auditor to verify calculations, not the primary reading path,
  // so it's kept at the end (hisobot.md's Annex 2).
  layout.heading("Annex 2: Detailed calculations");

  if (result.envelopeHeatLoss.length > 0) {
    layout.paragraph("Envelope heat loss — monthly, by category");
    for (const scenarioResult of result.envelopeHeatLoss) {
      layout.paragraph(scenarioResult.scenario === "before" ? "Before" : "After");
      layout.table(
        ["Month", "Category", "Operation hrs (kWh)", "Non-op. hrs (kWh)", "Total (kWh)"],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          m.category.replace(/_/g, " "),
          fmt(m.operationHoursLossKwh, 0),
          fmt(m.nonOperationHoursLossKwh, 0),
          fmt(m.totalKwh, 0),
        ]),
        [70, 150, 100, 100, 80],
      );
    }
  }

  if (result.ventilationLoss.length > 0) {
    layout.paragraph("Ventilation heat loss — monthly");
    for (const scenarioResult of result.ventilationLoss) {
      layout.paragraph(scenarioResult.scenario === "before" ? "Before" : "After");
      layout.table(
        ["Month", "Natural (kWh)", "Mechanical (kWh)", "Total (kWh)"],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          fmt(m.naturalLossKwh, 0),
          fmt(m.mechanicalLossKwh, 0),
          fmt(m.totalKwh, 0),
        ]),
        [100, 130, 130, 100],
      );
    }
  }

  if (result.heatingEnergyBalance.length > 0) {
    layout.paragraph("Heating energy balance — monthly");
    for (const scenarioResult of result.heatingEnergyBalance) {
      layout.paragraph(scenarioResult.scenario === "before" ? "Before" : "After");
      layout.table(
        ["Month", "Outdoor (°C)", "Gains (kWh)", "Losses (kWh)", "Util. factor", "Net need (kWh)"],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          fmt(m.outdoorTempC, 1),
          fmt(m.totalGainsKwh, 0),
          fmt(m.totalLossesKwh, 0),
          fmt(m.utilizationFactor, 2),
          fmt(m.netEnergyNeedKwh, 0),
        ]),
        [70, 80, 90, 90, 80, 90],
      );
    }
  }

  return layout.toBytes();
}
