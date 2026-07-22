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
    layout.barChart(
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
    layout.barChart(
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
