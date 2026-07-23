import { Card, CardContent, CardHeader, CardTitle } from "@yres/ui";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { UtilityBill } from "../../lib/api-types";
import { CHART_COLORS, RECENCY_COLORS } from "../../lib/chart-colors";
import { MONTH_LABELS, formatNumber } from "../../lib/labels";
import { ChartLegend } from "../chart-legend";
import { ChartTooltip } from "../chart-tooltip";

/**
 * Generic "last 3 years, by month" comparison bar chart — reused both per
 * carrier (in that carrier's own native unit) and once combined (every
 * carrier normalized to kWh), so the value extraction is the only thing
 * that differs between callers.
 */
export function MonthlyComparisonChart({
  title,
  description,
  bills,
  valueForBill,
  unitLabel,
  noDataLabel,
  height = 240,
  footer,
}: {
  title: string;
  description?: string;
  bills: UtilityBill[];
  valueForBill: (bill: UtilityBill) => number;
  unitLabel: string;
  noDataLabel: string;
  height?: number;
  /** Rendered below the chart/legend — e.g. an `AuditorNote` (docs/report-redesign-proposal.md §5b). */
  footer?: ReactNode;
}) {
  const compareYears = useMemo(() => {
    const yearsWithData = [...new Set(bills.map((b) => b.year))].sort((a, b) => b - a);
    return yearsWithData.slice(0, 3).sort((a, b) => a - b);
  }, [bills]);

  const colorsForYears = useMemo(
    () => RECENCY_COLORS.slice(RECENCY_COLORS.length - compareYears.length),
    [compareYears.length],
  );

  const data = useMemo(() => {
    const totals: Record<number, number[]> = {};
    for (const year of compareYears) totals[year] = Array(12).fill(0);
    for (const bill of bills) {
      const monthTotals = totals[bill.year];
      if (!monthTotals) continue;
      monthTotals[bill.month - 1] = (monthTotals[bill.month - 1] ?? 0) + valueForBill(bill);
    }
    return MONTH_LABELS.map((label, idx) => {
      const row: Record<string, string | number> = { month: label.slice(0, 3) };
      for (const year of compareYears) {
        row[String(year)] = totals[year]?.[idx] ?? 0;
      }
      return row;
    });
  }, [bills, compareYears, valueForBill]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>
        {compareYears.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{noDataLabel}</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={height}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={48}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={<ChartTooltip formatValue={(v) => `${formatNumber(v, 0)} ${unitLabel}`} />}
                />
                {compareYears.map((year, i) => (
                  <Bar
                    key={year}
                    dataKey={String(year)}
                    name={String(year)}
                    fill={colorsForYears[i]}
                    radius={[3, 3, 0, 0]}
                    maxBarSize={16}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend
              items={compareYears.map((year, i) => ({
                label: String(year),
                color: colorsForYears[i] ?? CHART_COLORS.muted,
              }))}
            />
          </>
        )}
        {footer}
      </CardContent>
    </Card>
  );
}
