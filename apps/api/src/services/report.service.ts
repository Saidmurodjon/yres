import fontkit from "@pdf-lib/fontkit";
import type { building } from "@yres/db";
import type { AuditResult, GenerationSourceResult } from "@yres/types";
import { type PDFFont, type PDFPage, PDFDocument, rgb } from "pdf-lib";
import { PT_SERIF_BOLD_BASE64 } from "../assets/fonts/pt-serif-bold";
import { PT_SERIF_ITALIC_BASE64 } from "../assets/fonts/pt-serif-italic";
import { PT_SERIF_REGULAR_BASE64 } from "../assets/fonts/pt-serif-regular";
import { DEFAULT_DISCOUNT_RATE, ENERGY_ESCALATION_RATES } from "./financial.service";
import { enumLabel, localeTag, type ReportLang, t } from "./report-i18n";
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

const PORTRAIT_WIDTH = 595.28; // A4 in points
const PORTRAIT_HEIGHT = 841.89;
const LANDSCAPE_WIDTH = PORTRAIT_HEIGHT;
const LANDSCAPE_HEIGHT = PORTRAIT_WIDTH;
const MARGIN = 50;

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
  private pageWidth: number;
  private pageHeight: number;
  private regular: PDFFont;
  private bold: PDFFont;
  private italic: PDFFont;
  private lang: ReportLang;

  private constructor(
    doc: PDFDocument,
    regular: PDFFont,
    bold: PDFFont,
    italic: PDFFont,
    lang: ReportLang,
  ) {
    this.doc = doc;
    this.regular = regular;
    this.bold = bold;
    this.italic = italic;
    this.lang = lang;
    this.pageWidth = PORTRAIT_WIDTH;
    this.pageHeight = PORTRAIT_HEIGHT;
    this.page = doc.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.pageHeight - MARGIN;
  }

  static async create(lang: ReportLang): Promise<ReportLayout> {
    const doc = await PDFDocument.create();
    // pdf-lib's built-in StandardFonts (the previous Times* embedding) only
    // support WinAnsi encoding — real-world tested: generating a Russian
    // report threw "WinAnsi cannot encode ..." on the very first Cyrillic
    // character. PT Serif (SIL OFL, see assets/fonts/OFL.txt) is embedded
    // instead — a Latin+Cyrillic serif in the spirit of Times New Roman —
    // via `@pdf-lib/fontkit`, the library's own mechanism for embedding
    // arbitrary font files instead of the four built-in Latin-only ones.
    doc.registerFontkit(fontkit);
    const regular = await doc.embedFont(PT_SERIF_REGULAR_BASE64, { subset: false });
    const bold = await doc.embedFont(PT_SERIF_BOLD_BASE64, { subset: false });
    const italic = await doc.embedFont(PT_SERIF_ITALIC_BASE64, { subset: false });
    return new ReportLayout(doc, regular, bold, italic, lang);
  }

  /** Current page's printable width — portrait by default, widened when `table()` switches a too-wide table onto its own landscape page (see that method's comment). */
  private contentWidth(): number {
    return this.pageWidth - MARGIN * 2;
  }

  private newPortraitPage() {
    this.pageWidth = PORTRAIT_WIDTH;
    this.pageHeight = PORTRAIT_HEIGHT;
    this.page = this.doc.addPage([this.pageWidth, this.pageHeight]);
    this.y = this.pageHeight - MARGIN;
  }

  private ensureSpace(height: number) {
    if (this.y - height < MARGIN) {
      this.page = this.doc.addPage([this.pageWidth, this.pageHeight]);
      this.y = this.pageHeight - MARGIN;
    }
  }

  title(text: string) {
    this.ensureSpace(32);
    this.page.drawText(text, { x: MARGIN, y: this.y - 22, size: 22, font: this.bold, color: INK });
    this.y -= 36;
  }

  heading(text: string) {
    this.ensureSpace(30);
    this.y -= 10;
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 14, font: this.bold, color: ACCENT });
    this.y -= 6;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y },
      end: { x: this.pageWidth - MARGIN, y: this.y },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= 16;
  }

  paragraph(text: string) {
    this.ensureSpace(17);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.regular, color: MUTED });
    this.y -= 17;
  }

  /**
   * Auditor commentary / narrative note — italic, visually distinct from
   * `paragraph()`'s regular-weight body text (approved report redesign,
   * `docs/report-redesign-proposal.md` §1/§5). Used for construction-type
   * descriptions and, in later phases, optional per-section auditor
   * conclusions under charts.
   */
  note(text: string) {
    this.ensureSpace(17);
    this.page.drawText(text, { x: MARGIN, y: this.y, size: 10, font: this.italic, color: MUTED });
    this.y -= 17;
  }

  /** Two-column label/value rows, e.g. building metadata or KPI cards flattened to text. */
  keyValueGrid(pairs: [string, string][], columns = 2) {
    const colWidth = this.contentWidth() / columns;
    const rowHeight = 34;
    for (let i = 0; i < pairs.length; i += columns) {
      this.ensureSpace(rowHeight);
      const rowPairs = pairs.slice(i, i + columns);
      rowPairs.forEach(([label, value], col) => {
        const x = MARGIN + col * colWidth;
        this.page.drawText(label, { x, y: this.y, size: 9, font: this.regular, color: MUTED });
        this.page.drawText(value, {
          x,
          y: this.y - 15,
          size: 13,
          font: this.bold,
          color: INK,
        });
      });
      this.y -= rowHeight;
    }
  }

  /**
   * Draws a table on the current (portrait) page — unless the combined
   * `columnWidths` don't fit portrait's printable width, in which case the
   * whole table gets its own landscape page (A4 rotated) instead of
   * silently overflowing past the right margin. The larger 10pt table text
   * from the typography redesign made several already-tight tables (e.g.
   * the 7-column cashflow detail) exceed portrait width — this is the
   * general "won't fit portrait → use landscape" fallback the redesign
   * proposal asked for, not a one-off fix for that section. Whatever
   * content follows always resumes on a fresh portrait page.
   *
   * `columnWidths` was hand-tuned against English header text length —
   * ru/uz headers for the same column (e.g. "Issiqlik o'tkazuvchanligi
   * (Vt/mK)" vs "Thermal conductivity (W/mK)") can be meaningfully longer
   * and would silently bleed into the next column's header with no gap.
   * Widening each column to at least the actual rendered header width
   * (measured against the bold font actually used to draw it) makes this
   * self-correcting per language instead of needing separate column-width
   * tuning per locale.
   */
  table(headers: string[], rows: string[][], columnWidths: number[]) {
    const headerPadding = 8;
    const effectiveWidths = columnWidths.map((w, i) => {
      const headerWidth = this.bold.widthOfTextAtSize(headers[i] ?? "", 10);
      return Math.max(w, headerWidth + headerPadding);
    });
    const totalWidth = effectiveWidths.reduce((sum, w) => sum + w, 0);
    const needsLandscape = totalWidth > this.contentWidth();
    if (needsLandscape) {
      this.pageWidth = LANDSCAPE_WIDTH;
      this.pageHeight = LANDSCAPE_HEIGHT;
      this.page = this.doc.addPage([this.pageWidth, this.pageHeight]);
      this.y = this.pageHeight - MARGIN;
    }

    const rowHeight = 18;
    const drawHeaderRow = () => {
      this.ensureSpace(rowHeight * 2);
      let x = MARGIN;
      for (let i = 0; i < headers.length; i++) {
        this.page.drawText(headers[i] ?? "", {
          x,
          y: this.y,
          size: 10,
          font: this.bold,
          color: INK,
        });
        x += effectiveWidths[i] ?? 60;
      }
      this.y -= 4;
      this.page.drawLine({
        start: { x: MARGIN, y: this.y },
        end: { x: this.pageWidth - MARGIN, y: this.y },
        thickness: 0.5,
        color: RULE,
      });
      this.y -= rowHeight - 4;
    };

    drawHeaderRow();
    for (const row of rows) {
      if (this.y - rowHeight < MARGIN) {
        this.page = this.doc.addPage([this.pageWidth, this.pageHeight]);
        this.y = this.pageHeight - MARGIN;
        drawHeaderRow();
      }
      let x = MARGIN;
      for (let i = 0; i < row.length; i++) {
        this.page.drawText(row[i] ?? "", {
          x,
          y: this.y,
          size: 10,
          font: this.regular,
          color: INK,
        });
        x += effectiveWidths[i] ?? 60;
      }
      this.y -= rowHeight;
    }
    this.y -= 8;

    if (needsLandscape) {
      this.newPortraitPage();
    }
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
      width: this.contentWidth(),
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
    const plotRight = MARGIN + this.contentWidth() - padding;
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
      const axisLabel = fmt(this.lang, maxValue * fraction, 0);
      const axisLabelWidth = this.regular.widthOfTextAtSize(axisLabel, 7);
      this.page.drawText(axisLabel, {
        x: plotLeft - 6 - axisLabelWidth,
        y: gy - 2,
        size: 7,
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

      const valueLabel = fmt(this.lang, d.value, 0);
      const valueLabelWidth = this.bold.widthOfTextAtSize(valueLabel, 8);
      this.page.drawText(valueLabel, {
        x: x + barWidth / 2 - valueLabelWidth / 2,
        y: baselineY + barHeight + 4,
        size: 8,
        font: this.bold,
        color: INK,
      });

      const catLabel = truncateLabel(d.label, slotWidth, 8);
      const catLabelWidth = this.regular.widthOfTextAtSize(catLabel, 8);
      this.page.drawText(catLabel, {
        x: x + barWidth / 2 - catLabelWidth / 2,
        y: baselineY - 12,
        size: 8,
        font: this.regular,
        color: MUTED,
      });
    });

    this.y = cardBottom - 10;
  }

  /**
   * Grouped (multi-series) bar chart — one cluster of side-by-side bars per
   * category, matching the platform's own "last 3 years, by month"
   * comparison chart (`apps/web/src/components/building-detail/
   * consumption-comparison-chart.tsx`'s `MonthlyComparisonChart`, a
   * `recharts` grouped `BarChart`) rather than the single averaged bar the
   * PDF previously showed for consumption history. Skips per-bar value
   * labels (unlike the single-series `barChart`) — with up to 3 bars per
   * one of 12 month-categories there's no room to keep them legible; a
   * swatch+label legend under the chart carries series identity instead.
   */
  groupedBarChart(
    categories: string[],
    series: { label: string; values: number[] }[],
    chartHeight = 130,
  ) {
    if (categories.length === 0 || series.length === 0) return;
    const padding = 14;
    const axisWidth = 26;
    const labelBandHeight = 20;
    const legendHeight = 18;
    const totalHeight = padding * 2 + chartHeight + labelBandHeight + legendHeight;
    this.ensureSpace(totalHeight);

    const cardTop = this.y;
    const cardBottom = cardTop - totalHeight;
    this.page.drawRectangle({
      x: MARGIN,
      y: cardBottom,
      width: this.contentWidth(),
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
    const plotRight = MARGIN + this.contentWidth() - padding;
    const plotWidth = plotRight - plotLeft;
    const baselineY = cardTop - padding - chartHeight;
    const maxValue = Math.max(...series.flatMap((s) => s.values.map((v) => Math.abs(v))), 1);

    for (const fraction of [0, 0.25, 0.5, 0.75, 1]) {
      const gy = baselineY + chartHeight * fraction;
      this.page.drawLine({
        start: { x: plotLeft, y: gy },
        end: { x: plotRight, y: gy },
        thickness: fraction === 0 ? 0.75 : 0.5,
        color: fraction === 0 ? RULE : CHART_GRID,
        dashArray: fraction === 0 || fraction === 1 ? undefined : [1.5, 1.5],
      });
      const axisLabel = fmt(this.lang, maxValue * fraction, 0);
      const axisLabelWidth = this.regular.widthOfTextAtSize(axisLabel, 7);
      this.page.drawText(axisLabel, {
        x: plotLeft - 6 - axisLabelWidth,
        y: gy - 2,
        size: 7,
        font: this.regular,
        color: MUTED,
      });
    }

    const slotWidth = plotWidth / categories.length;
    const barGap = 2;
    const clusterWidth = Math.min(slotWidth * 0.75, series.length * 14 + (series.length - 1) * barGap);
    const barWidth = (clusterWidth - (series.length - 1) * barGap) / series.length;

    categories.forEach((cat, catIndex) => {
      const clusterX = plotLeft + catIndex * slotWidth + (slotWidth - clusterWidth) / 2;
      series.forEach((s, seriesIndex) => {
        const value = s.values[catIndex] ?? 0;
        const barHeight = (Math.abs(value) / maxValue) * chartHeight;
        const x = clusterX + seriesIndex * (barWidth + barGap);
        this.page.drawRectangle({
          x,
          y: baselineY,
          width: barWidth,
          height: Math.max(barHeight, 0.5),
          color: CHART_PALETTE[seriesIndex % CHART_PALETTE.length],
        });
      });

      const catLabel = truncateLabel(cat, slotWidth, 8);
      const catLabelWidth = this.regular.widthOfTextAtSize(catLabel, 8);
      this.page.drawText(catLabel, {
        x: plotLeft + catIndex * slotWidth + slotWidth / 2 - catLabelWidth / 2,
        y: baselineY - 12,
        size: 8,
        font: this.regular,
        color: MUTED,
      });
    });

    const legendY = baselineY - labelBandHeight - 6;
    const legendItemWidths = series.map(
      (s) => 12 + this.regular.widthOfTextAtSize(s.label, 8) + 18,
    );
    const totalLegendWidth = legendItemWidths.reduce((sum, w) => sum + w, 0);
    let legendX = MARGIN + (this.contentWidth() - totalLegendWidth) / 2;
    series.forEach((s, i) => {
      const color = CHART_PALETTE[i % CHART_PALETTE.length];
      this.page.drawCircle({ x: legendX + 4, y: legendY, size: 4, color });
      this.page.drawText(s.label, {
        x: legendX + 12,
        y: legendY - 3,
        size: 8,
        font: this.regular,
        color: INK,
      });
      legendX += legendItemWidths[i] ?? 0;
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
      width: this.contentWidth(),
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

    const totalLabel = fmt(this.lang, total, 0);
    const totalLabelWidth = this.bold.widthOfTextAtSize(totalLabel, 12);
    this.page.drawText(totalLabel, {
      x: cx - totalLabelWidth / 2,
      y: cy + 1,
      size: 12,
      font: this.bold,
      color: INK,
    });
    const unitLabel = t(this.lang, "unitKwh");
    const unitLabelWidth = this.regular.widthOfTextAtSize(unitLabel, 7.5);
    this.page.drawText(unitLabel, {
      x: cx - unitLabelWidth / 2,
      y: cy - 11,
      size: 7.5,
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
        size: 9,
        font: this.regular,
        color: INK,
      });
      const pctLabel = `${((d.value / total) * 100).toFixed(0)}%`;
      const pctLabelWidth = this.bold.widthOfTextAtSize(pctLabel, 9);
      this.page.drawText(pctLabel, {
        x: MARGIN + this.contentWidth() - padding - pctLabelWidth,
        y: rowY - 6,
        size: 9,
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

function fmt(lang: ReportLang, value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString(localeTag(lang), {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function fmtUsd(lang: ReportLang, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `$${fmt(lang, value, 0)}`;
}

function fmtPct(lang: ReportLang, value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${fmt(lang, value * 100, 1)}%`;
}

/**
 * Renders a fresh AuditResult (see routes/audit.ts's "recalculate on demand"
 * rule — this never reads a stored result) into a downloadable PDF report.
 * `lang` matches whichever UI language the request was made in (the
 * frontend passes its current `i18n.language` as a query param — see
 * `routes/audit.ts` — since this runs server-side with no access to the
 * browser's i18next instance); defaults to English if omitted or
 * unrecognized. Report structural text and enum-value labels are
 * translated via `report-i18n.ts`; free-text database content (measure
 * names, ancillary-cost descriptions, construction-type/auditor notes) is
 * never translated — see that file's own doc comment for why.
 */
export async function generateAuditReportPdf(
  building: Building,
  result: AuditResult,
  extras: ReportExtras,
  lang: ReportLang = "en",
): Promise<Uint8Array> {
  const layout = await ReportLayout.create(lang);

  layout.title(t(lang, "title"));
  layout.paragraph(
    t(lang, "generatedOn", {
      name: building.name,
      location: building.location,
      date: new Date(result.generatedAt).toLocaleDateString(localeTag(lang), {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }),
  );

  layout.heading(t(lang, "headingBuilding"));
  layout.keyValueGrid(
    [
      [t(lang, "labelName"), building.name],
      [t(lang, "labelLocation"), building.location],
      [t(lang, "labelType"), enumLabel(lang, building.buildingType)],
      [t(lang, "labelYearBuilt"), building.yearBuilt ? String(building.yearBuilt) : "—"],
      [
        t(lang, "labelNetCooledFloorArea"),
        building.netCooledFloorAreaM2 ? `${fmt(lang, building.netCooledFloorAreaM2, 0)} m²` : "—",
      ],
      [t(lang, "labelOccupants"), String(building.occupantCount)],
    ],
    2,
  );
  layout.keyValueGrid(
    [
      [
        t(lang, "labelHeatingSeasonDuration"),
        `${fmt(lang, building.heatingSeasonDurationDays, 0)} ${t(lang, "unitDay")}`,
      ],
      [t(lang, "labelIndoorTempOperation"), `${fmt(lang, building.indoorTempOperationC, 1)} °C`],
      [
        t(lang, "labelIndoorTempNonOperation"),
        `${fmt(lang, building.indoorTempNonOperationC, 1)} °C`,
      ],
      [
        t(lang, "labelOutdoorAvgTemp"),
        `${fmt(lang, building.outdoorAvgHeatingSeasonTempC, 1)} °C`,
      ],
      [t(lang, "labelOutdoorDesignTemp"), `${fmt(lang, building.outdoorDesignTempC, 1)} °C`],
      [
        t(lang, "labelCoolingEnthalpyInside"),
        `${fmt(lang, building.coolingEnthalpyInsideKjKg, 1)} kJ/kg`,
      ],
      [
        t(lang, "labelCoolingEnthalpyOutside"),
        `${fmt(lang, building.coolingEnthalpyOutsideKjKg, 1)} kJ/kg`,
      ],
      [
        t(lang, "labelCoolingEnthalpyHottestDay"),
        `${fmt(lang, building.coolingEnthalpyHottestDayKjKg, 1)} kJ/kg`,
      ],
    ],
    2,
  );

  // Concise up-front overview (namunaviy hujjatning Table 1) — independent
  // of, and read before, the full "Recommended measures" detail later in
  // the report (docs/report-redesign-proposal.md §3 item 3).
  if (result.measures.length > 0) {
    layout.heading(t(lang, "headingExecutiveSummary"));
    layout.table(
      [
        t(lang, "thMeasure"),
        t(lang, "thInvestment"),
        t(lang, "thPaybackStd"),
        t(lang, "thPaybackActual"),
        t(lang, "thCo2PerYear"),
        t(lang, "thRecommended"),
      ],
      result.measures.map((m) => [
        m.name,
        fmtUsd(lang, m.investmentCostUsd),
        m.standardized.simplePaybackYears !== null
          ? `${fmt(lang, m.standardized.simplePaybackYears, 1)} ${t(lang, "unitYr")}`
          : "—",
        m.actual.simplePaybackYears !== null
          ? `${fmt(lang, m.actual.simplePaybackYears, 1)} ${t(lang, "unitYr")}`
          : "—",
        fmt(lang, m.co2ReductionTonnesPerYear, 1),
        m.proposedForImplementation ? t(lang, "yes") : t(lang, "no"),
      ]),
      [280, 65, 80, 85, 65, 85],
    );
  }

  layout.heading(t(lang, "headingSummary"));
  const { summary } = result;
  layout.keyValueGrid(
    [
      [
        t(lang, "labelCurrentEnergyUse"),
        `${fmt(lang, summary.currentEnergyUseKwhPerM2Year, 0)} ${t(lang, "unitKwhPerM2Yr")}`,
      ],
      [
        t(lang, "labelPotentialEnergyUse"),
        `${fmt(lang, summary.potentialEnergyUseKwhPerM2Year, 0)} ${t(lang, "unitKwhPerM2Yr")}`,
      ],
      [
        t(lang, "labelPotentialSavings"),
        `${fmt(lang, summary.potentialSavingsKwhPerM2Year, 0)} ${t(lang, "unitKwhPerM2Yr")}`,
      ],
      [
        t(lang, "labelCo2Reduction"),
        `${fmt(lang, summary.co2ReductionTonnesPerYear, 1)} ${t(lang, "unitTco2Yr")}`,
      ],
      [t(lang, "labelTotalInvestment"), fmtUsd(lang, summary.totalInvestmentUsd)],
      [t(lang, "labelTotalInvestmentAncillary"), fmtUsd(lang, summary.totalNonEeMeasureCostUsd)],
      [t(lang, "labelTotalAnnualSavings"), fmtUsd(lang, summary.totalAnnualSavingsUsd)],
      [
        t(lang, "labelSimplePayback"),
        summary.simplePaybackYears !== null
          ? `${fmt(lang, summary.simplePaybackYears, 1)} ${t(lang, "unitYr")}`
          : "—",
      ],
    ],
    3,
  );

  layout.heading(t(lang, "headingEnvelopeAreas"));
  const areas = result.envelopeAreas;
  layout.table(
    [t(lang, "thElement"), t(lang, "thArea")],
    [
      [enumLabel(lang, "external_wall"), fmt(lang, areas.externalWallAreaM2, 1)],
      [t(lang, "labelSocle"), fmt(lang, areas.socleAreaM2, 1)],
      [enumLabel(lang, "roof"), fmt(lang, areas.roofAreaM2, 1)],
      [enumLabel(lang, "floor"), fmt(lang, areas.floorAreaM2, 1)],
      [enumLabel(lang, "window"), fmt(lang, areas.windowAreaM2, 1)],
      [enumLabel(lang, "door"), fmt(lang, areas.doorAreaM2, 1)],
    ],
    [280, 100],
  );

  if (extras.uValues.length > 0) {
    layout.heading(t(lang, "headingUValueCalculations"));
    for (const ct of extras.uValues) {
      const scenarioLabel = ct.scenario === "before" ? t(lang, "before") : t(lang, "after");
      layout.paragraph(
        `${ct.code} — ${enumLabel(lang, ct.elementCategory)} (${scenarioLabel}) — U = ${fmt(lang, ct.uValueWPerM2K, 3)} W/m²K`,
      );
      if (ct.description) {
        layout.note(ct.description);
      }
      layout.table(
        [
          t(lang, "thLayer"),
          t(lang, "thMaterial"),
          t(lang, "thThickness"),
          t(lang, "thConductivity"),
          t(lang, "thResistance"),
        ],
        ct.layers.map((l, i) => [
          String(i + 1),
          l.materialName,
          fmt(lang, l.thicknessM, 3),
          fmt(lang, l.thermalConductivityWPerMk, 2),
          fmt(lang, l.resistanceM2KPerW, 3),
        ]),
        [30, 185, 85, 100, 85],
      );
      layout.paragraph(
        t(lang, "resistanceSummary", {
          rint: fmt(lang, ct.interiorResistanceM2kPerW, 3),
          rext: fmt(lang, ct.exteriorResistanceM2kPerW, 3),
          total: fmt(lang, ct.totalThermalResistanceM2KPerW, 3),
        }),
      );
    }
  }

  if (extras.consumptionHistory.length > 0) {
    layout.heading(t(lang, "headingConsumptionHistory"));
    for (const carrier of extras.consumptionHistory) {
      const years = [
        ...new Set(carrier.months.flatMap((m) => m.byYear.map((y) => y.year))),
      ].sort((a, b) => a - b);
      layout.paragraph(enumLabel(lang, carrier.energyCarrier));
      // Grouped, year-by-year bars (matching the platform's own
      // MonthlyComparisonChart) already carry every value the old
      // month×year table showed — no separate table needed
      // (docs/report-redesign-proposal.md's chart-implies-no-table rule).
      layout.groupedBarChart(
        carrier.months.map((m) => MONTH_NAMES[m.month - 1] ?? String(m.month)),
        years.map((year) => ({
          label: String(year),
          values: carrier.months.map(
            (m) => m.byYear.find((y) => y.year === year)?.consumptionKwh ?? 0,
          ),
        })),
      );
    }
  }

  const generationEfficiency = aggregateGenerationByEndUseScenario(result.generation);
  if (generationEfficiency.length > 0) {
    layout.heading(t(lang, "headingGenerationEfficiency"));
    layout.table(
      [
        t(lang, "thEndUse"),
        t(lang, "thScenario"),
        t(lang, "thUsefulNeed"),
        t(lang, "thDistribLoss"),
        t(lang, "thEfficiencySeer"),
        t(lang, "thFinalEnergyKwh"),
        t(lang, "thSpecific"),
      ],
      generationEfficiency.map((g) => [
        enumLabel(lang, g.endUse),
        g.scenario === "before" ? t(lang, "before") : t(lang, "after"),
        fmt(lang, g.usefulEnergyNeedKwh, 0),
        fmt(lang, g.distributionLossKwh, 0),
        fmt(lang, g.weightedEfficiencyOrSeer, 2),
        fmt(lang, g.finalEnergyConsumptionKwh, 0),
        fmt(lang, g.specificFinalEnergyKwhPerM2, 1),
      ]),
      [70, 70, 110, 110, 90, 110, 100],
    );
  }

  layout.heading(t(lang, "headingHeatingEnergyBalance"));
  layout.table(
    [t(lang, "thScenario"), t(lang, "thAnnualNetHeatingNeed")],
    result.heatingEnergyBalance.map((r) => [
      r.scenario === "before" ? t(lang, "beforeBaseline") : t(lang, "afterProposed"),
      fmt(lang, r.annualNetEnergyNeedKwh, 0),
    ]),
    [280, 200],
  );

  layout.heading(t(lang, "headingFinalEnergyByEndUse"));
  layout.table(
    [t(lang, "thEndUse"), t(lang, "thScenario"), t(lang, "thFinalEnergy")],
    result.finalEnergyByEndUse.map((e) => [
      enumLabel(lang, e.endUse),
      e.scenario === "before" ? t(lang, "before") : t(lang, "after"),
      fmt(lang, e.finalEnergyConsumptionKwh, 0),
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
    layout.heading(t(lang, "headingEnvelopeLossBreakdown"));
    // Before AND after donuts together carry every value the old before/after
    // table did — no separate table needed
    // (docs/report-redesign-proposal.md's chart-implies-no-table rule).
    layout.paragraph(t(lang, "beforeDistLossToday"));
    layout.pieChart(
      envelopeLossRows.map((r) => ({ label: enumLabel(lang, r.category), value: r.beforeKwh })),
    );
    layout.paragraph(t(lang, "afterDistResidual"));
    layout.pieChart(
      envelopeLossRows.map((r) => ({ label: enumLabel(lang, r.category), value: r.afterKwh })),
    );
  }

  const finalEnergyRows = result.energyBalanceBreakdown.filter((r) => r.section === "final_energy");
  if (finalEnergyRows.length > 0) {
    layout.heading(t(lang, "headingFinalEnergyBreakdown"));
    layout.paragraph(t(lang, "beforeDistPurchasedToday"));
    layout.pieChart(
      finalEnergyRows.map((r) => ({ label: enumLabel(lang, r.category), value: r.beforeKwh })),
    );
    layout.paragraph(t(lang, "afterDistPurchased"));
    layout.pieChart(
      finalEnergyRows.map((r) => ({ label: enumLabel(lang, r.category), value: r.afterKwh })),
    );
  }

  const proposedMeasures = result.measures.filter((m) => m.proposedForImplementation);
  layout.heading(
    proposedMeasures.length > 0
      ? t(lang, "headingRecommendedMeasures")
      : t(lang, "headingMeasuresNoneSelected"),
  );
  const measuresToList = proposedMeasures.length > 0 ? proposedMeasures : result.measures;
  if (measuresToList.length === 0) {
    layout.paragraph(t(lang, "noMeasuresDefined"));
  } else {
    // Standardized and actual are always shown together, never one without
    // the other (calculation-engine.md) — as two adjacent tables sharing the
    // same row order, since this drawing engine has no multi-line cells to
    // fit both scenarios into a single row.
    layout.paragraph(t(lang, "theoreticalSavings"));
    layout.table(
      [
        t(lang, "thMeasure"),
        t(lang, "thInvestment"),
        t(lang, "thStdSavings"),
        t(lang, "thPaybackYr"),
        t(lang, "thNpv"),
        t(lang, "thIrr"),
        t(lang, "thCo2PerYear"),
      ],
      measuresToList.map((m) => [
        m.name,
        fmtUsd(lang, m.investmentCostUsd),
        `${fmtUsd(lang, m.standardizedAnnualSavingsUsd)} (${fmt(lang, m.standardizedAnnualSavingsKwh, 0)} ${t(lang, "unitKwh")})`,
        fmt(lang, m.standardized.simplePaybackYears, 1),
        fmtUsd(lang, m.standardized.npv),
        fmtPct(lang, m.standardized.irr),
        fmt(lang, m.co2ReductionTonnesPerYear, 1),
      ]),
      [230, 65, 130, 65, 70, 90, 60],
    );
    layout.paragraph(t(lang, "actualSavingsCalibrated"));
    layout.table(
      [t(lang, "thMeasure"), t(lang, "thActualSavings"), t(lang, "thPaybackYr"), t(lang, "thNpv"), t(lang, "thIrr")],
      measuresToList.map((m) => [
        m.name,
        `${fmtUsd(lang, m.actualAnnualSavingsUsd)} (${fmt(lang, m.actualAnnualSavingsKwh, 0)} ${t(lang, "unitKwh")})`,
        fmt(lang, m.actual.simplePaybackYears, 1),
        fmtUsd(lang, m.actual.npv),
        fmtPct(lang, m.actual.irr),
      ]),
      [260, 150, 70, 80, 100],
    );
  }

  if (result.measures.length > 0) {
    layout.heading(t(lang, "headingGhgEmissions"));
    layout.paragraph(
      t(lang, "totalCo2Reduction", {
        value: fmt(lang, result.summary.co2ReductionTonnesPerYear, 1),
      }),
    );
    layout.table(
      [t(lang, "thMeasure"), t(lang, "thCo2ReductionTyr")],
      result.measures.map((m) => [m.name, fmt(lang, m.co2ReductionTonnesPerYear, 1)]),
      [280, 150],
    );
    if (extras.tariffs.length > 0) {
      layout.paragraph(
        t(lang, "emissionFactorsUsed", {
          list: extras.tariffs
            .map(
              (tariff) =>
                `${enumLabel(lang, tariff.energyCarrier)} ${fmt(lang, tariff.emissionFactorKgCo2PerKwh, 2)} ${t(lang, "unitKgco2PerKwh")}`,
            )
            .join(" · "),
        }),
      );
    }
  }

  layout.heading(t(lang, "headingFinancialAssumptions"));
  layout.paragraph(
    t(lang, "discountRateAssumption", {
      rate: fmtPct(lang, DEFAULT_DISCOUNT_RATE),
      escalation: Object.entries(ENERGY_ESCALATION_RATES)
        .map(([carrier, rate]) => `${enumLabel(lang, carrier)} ${fmtPct(lang, rate)}`)
        .join(", "),
    }),
  );
  if (extras.tariffs.length > 0) {
    layout.table(
      [t(lang, "thEnergyCarrier"), t(lang, "thUnitCost"), t(lang, "thEmissionFactor")],
      extras.tariffs.map((tariff) => [
        enumLabel(lang, tariff.energyCarrier),
        `$${fmt(lang, tariff.unitCostUsd, 3)}/${t(lang, "unitKwh")}`,
        `${fmt(lang, tariff.emissionFactorKgCo2PerKwh, 2)} ${t(lang, "unitKgco2PerKwh")}`,
      ]),
      [160, 120, 150],
    );
  }

  if (proposedMeasures.length > 0) {
    layout.heading(t(lang, "headingCashflowDetail"));
    for (const m of proposedMeasures) {
      layout.paragraph(t(lang, "measureLifetime", { name: m.name, years: m.lifetimeYears }));
      layout.table(
        [
          t(lang, "thYear"),
          t(lang, "thStdNetCf"),
          t(lang, "thStdDiscounted"),
          t(lang, "thStdCumulative"),
          t(lang, "thActualNetCf"),
          t(lang, "thActualDisc"),
          t(lang, "thActualCum"),
        ],
        m.standardizedCashflow.map((std, i) => {
          const actual = m.actualCashflow[i];
          return [
            String(std.year),
            fmtUsd(lang, std.netCashflow),
            fmtUsd(lang, std.discountedNetCashflow),
            fmtUsd(lang, std.cumulativeDiscountedCashflow),
            actual ? fmtUsd(lang, actual.netCashflow) : "—",
            actual ? fmtUsd(lang, actual.discountedNetCashflow) : "—",
            actual ? fmtUsd(lang, actual.cumulativeDiscountedCashflow) : "—",
          ];
        }),
        [35, 75, 75, 75, 75, 75, 75],
      );
    }
  }

  if (result.nonEeMeasures.length > 0) {
    layout.heading(t(lang, "headingAncillaryCosts"));
    layout.table(
      [t(lang, "thDescription"), t(lang, "thQuantity"), t(lang, "thUnitCost"), t(lang, "thTotalCost")],
      result.nonEeMeasures.map((m) => [
        m.description,
        `${fmt(lang, m.quantity, 1)}${m.unit ? ` ${m.unit}` : ""}`,
        fmtUsd(lang, m.unitCostUsd),
        fmtUsd(lang, m.totalCostUsd),
      ]),
      [200, 100, 80, 80],
    );
  }

  // Annex 2: the monthly/category detail behind the annual figures shown
  // above — already computed by AuditResult but never rendered anywhere.
  // For the auditor to verify calculations, not the primary reading path,
  // so it's kept at the end (hisobot.md's Annex 2).
  layout.heading(t(lang, "headingAnnex2"));

  if (result.envelopeHeatLoss.length > 0) {
    layout.paragraph(t(lang, "envelopeHeatLossMonthly"));
    for (const scenarioResult of result.envelopeHeatLoss) {
      layout.paragraph(scenarioResult.scenario === "before" ? t(lang, "before") : t(lang, "after"));
      layout.table(
        [
          t(lang, "thMonth"),
          t(lang, "thCategory"),
          t(lang, "thOperationHrs"),
          t(lang, "thNonOpHrs"),
          t(lang, "thTotal"),
        ],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          enumLabel(lang, m.category),
          fmt(lang, m.operationHoursLossKwh, 0),
          fmt(lang, m.nonOperationHoursLossKwh, 0),
          fmt(lang, m.totalKwh, 0),
        ]),
        [65, 140, 95, 95, 75],
      );
    }
  }

  if (result.ventilationLoss.length > 0) {
    layout.paragraph(t(lang, "ventilationHeatLossMonthly"));
    for (const scenarioResult of result.ventilationLoss) {
      layout.paragraph(scenarioResult.scenario === "before" ? t(lang, "before") : t(lang, "after"));
      layout.table(
        [t(lang, "thMonth"), t(lang, "thNatural"), t(lang, "thMechanical"), t(lang, "thTotal")],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          fmt(lang, m.naturalLossKwh, 0),
          fmt(lang, m.mechanicalLossKwh, 0),
          fmt(lang, m.totalKwh, 0),
        ]),
        [100, 130, 130, 100],
      );
    }
  }

  if (result.heatingEnergyBalance.length > 0) {
    layout.paragraph(t(lang, "heatingEnergyBalanceMonthly"));
    for (const scenarioResult of result.heatingEnergyBalance) {
      layout.paragraph(scenarioResult.scenario === "before" ? t(lang, "before") : t(lang, "after"));
      layout.table(
        [
          t(lang, "thMonth"),
          t(lang, "thOutdoor"),
          t(lang, "thGains"),
          t(lang, "thLosses"),
          t(lang, "thUtilFactor"),
          t(lang, "thNetNeed"),
        ],
        scenarioResult.monthly.map((m) => [
          MONTH_NAMES[m.month - 1] ?? String(m.month),
          fmt(lang, m.outdoorTempC, 1),
          fmt(lang, m.totalGainsKwh, 0),
          fmt(lang, m.totalLossesKwh, 0),
          fmt(lang, m.utilizationFactor, 2),
          fmt(lang, m.netEnergyNeedKwh, 0),
        ]),
        [55, 80, 85, 85, 75, 85],
      );
    }
  }

  return layout.toBytes();
}
