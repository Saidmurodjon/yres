import { Card, CardContent, CardHeader, CardTitle } from "@yres/ui";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartLegend } from "../chart-legend";
import { ChartTooltip } from "../chart-tooltip";
import type { UtilityBill } from "../../lib/api-types";
import { CHART_COLORS, RECENCY_COLORS } from "../../lib/chart-colors";
import { MONTH_LABELS, formatNumber } from "../../lib/labels";

/**
 * Total kWh per month, summed across every carrier — the normalized unit
 * makes carriers comparable, so "energy consumption" here is one number per
 * month rather than a per-carrier breakdown (which the compact entry table
 * above already shows per carrier).
 */
function monthlyTotalsByYear(bills: UtilityBill[], years: number[]): Record<number, number[]> {
  const totals: Record<number, number[]> = {};
  for (const year of years) totals[year] = Array(12).fill(0);
  for (const bill of bills) {
    const monthTotals = totals[bill.year];
    if (!monthTotals) continue;
    monthTotals[bill.month - 1] = (monthTotals[bill.month - 1] ?? 0) + (bill.consumptionKwh ?? 0);
  }
  return totals;
}

export function ConsumptionComparisonChart({ bills }: { bills: UtilityBill[] }) {
  const { t } = useTranslation("consumption");

  const compareYears = useMemo(() => {
    const yearsWithData = [...new Set(bills.map((b) => b.year))].sort((a, b) => b - a);
    return yearsWithData.slice(0, 3).sort((a, b) => a - b);
  }, [bills]);

  const colorsForYears = useMemo(
    () => RECENCY_COLORS.slice(RECENCY_COLORS.length - compareYears.length),
    [compareYears.length],
  );

  const data = useMemo(() => {
    const totals = monthlyTotalsByYear(bills, compareYears);
    return MONTH_LABELS.map((label, idx) => {
      const row: Record<string, string | number> = { month: label };
      for (const year of compareYears) {
        row[String(year)] = totals[year]?.[idx] ?? 0;
      }
      return row;
    });
  }, [bills, compareYears]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("comparisonChart.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("comparisonChart.description")}</p>
      </CardHeader>
      <CardContent>
        {compareYears.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("comparisonChart.noData")}
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                <XAxis
                  dataKey="month"
                  tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                  axisLine={{ stroke: CHART_COLORS.grid }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={56}
                />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted))" }}
                  content={<ChartTooltip formatValue={(v) => `${formatNumber(v, 0)} kVt·soat`} />}
                />
                {compareYears.map((year, i) => (
                  <Bar
                    key={year}
                    dataKey={String(year)}
                    name={String(year)}
                    fill={colorsForYears[i]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={18}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
            <ChartLegend
              items={compareYears.map((year, i) => ({ label: String(year), color: colorsForYears[i] ?? CHART_COLORS.muted }))}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
