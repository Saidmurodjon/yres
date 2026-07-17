import { Link, createFileRoute } from "@tanstack/react-router";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  MetricCard,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  cn,
} from "@yres/ui";
import { ArrowLeft, Clock, DollarSign, Leaf, Wallet } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AuditErrorState,
  AuditNotRunEmptyState,
  AuditResultsSkeleton,
} from "../../../../components/audit-result-states";
import { ChartLegend } from "../../../../components/chart-legend";
import { ChartTooltip } from "../../../../components/chart-tooltip";
import { useAuditResults } from "../../../../hooks/use-audit";
import { ApiError } from "../../../../lib/api";
import { CHART_COLORS, DIVERGING_COLORS } from "../../../../lib/chart-colors";
import {
  MEASURE_CATEGORY_LABELS,
  formatCurrency,
  formatNumber,
  formatPercent,
  formatYears,
} from "../../../../lib/labels";

export const Route = createFileRoute("/_authenticated/buildings/$buildingId/financial")({
  component: FinancialAnalysisPage,
});

function FinancialAnalysisPage() {
  const { t } = useTranslation("audit");
  const { buildingId } = Route.useParams();
  const auditResultsQuery = useAuditResults(buildingId);
  const [selectedMeasureId, setSelectedMeasureId] = useState<string | null>(null);

  if (auditResultsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("financial.title")}</h1>
        <AuditResultsSkeleton />
      </div>
    );
  }

  if (auditResultsQuery.isError) {
    const error = auditResultsQuery.error;
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("financial.title")}</h1>
          <AuditNotRunEmptyState buildingId={buildingId} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("financial.title")}</h1>
        <AuditErrorState
          message={error instanceof Error ? error.message : t("common:unknownError")}
          onRetry={() => auditResultsQuery.refetch()}
        />
      </div>
    );
  }

  if (!auditResultsQuery.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("financial.title")}</h1>
        <AuditResultsSkeleton />
      </div>
    );
  }

  const { result } = auditResultsQuery.data;
  const { summary, measures } = result;

  const npvRows = measures
    .map((measure) => ({
      measureId: measure.measureId,
      name: measure.name,
      npv: measure.standardized.npv,
    }))
    .sort((a, b) => b.npv - a.npv);

  const selectedMeasure =
    measures.find((measure) => measure.measureId === selectedMeasureId) ?? measures[0] ?? null;

  const proposedMeasures = measures.filter((measure) => measure.proposedForImplementation);
  const proposedCo2TonnesPerYear = proposedMeasures.reduce(
    (sum, measure) => sum + measure.co2ReductionTonnesPerYear,
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("financial.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("financial.subtitle")}</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/buildings/$buildingId/results" params={{ buildingId }}>
            <ArrowLeft className="h-4 w-4" />
            {t("financial.backToResults")}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("financial.portfolioSummary.title")}</CardTitle>
          <CardDescription>
            {t("financial.portfolioSummary.proposed", { count: proposedMeasures.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MetricCard
              label={t("financial.portfolioSummary.totalInvestment")}
              value={formatCurrency(summary.totalInvestmentUsd)}
              icon={<DollarSign className="h-5 w-5" />}
            />
            <MetricCard
              label={t("financial.portfolioSummary.totalAnnualSavings")}
              value={formatCurrency(summary.totalAnnualSavingsUsd)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <MetricCard
              label={t("financial.portfolioSummary.blendedPayback")}
              value={formatYears(summary.simplePaybackYears)}
              icon={<Clock className="h-5 w-5" />}
            />
            <MetricCard
              label={t("financial.portfolioSummary.co2Reduction")}
              value={`${formatNumber(proposedCo2TonnesPerYear, 1)} tCO2/yr`}
              icon={<Leaf className="h-5 w-5" />}
            />
          </div>
          <p className="text-xs text-muted-foreground">{t("financial.portfolioSummary.note")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("financial.npvChart.title")}</CardTitle>
          <CardDescription>{t("financial.npvChart.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {npvRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("shared.noMeasuresRecorded")}
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={Math.max(220, npvRows.length * 40)}>
                <BarChart
                  data={npvRows}
                  layout="vertical"
                  margin={{ top: 8, right: 24, left: 8, bottom: 0 }}
                >
                  <CartesianGrid horizontal={false} stroke={CHART_COLORS.grid} />
                  <XAxis
                    type="number"
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={false}
                    tickFormatter={(value) => formatCurrency(value)}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: CHART_COLORS.muted, fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                    width={160}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    content={<ChartTooltip formatValue={(v) => formatCurrency(v)} />}
                  />
                  <ReferenceLine x={0} stroke={CHART_COLORS.grid} />
                  <Bar dataKey="npv" name={t("financial.npvChart.npv")} radius={4} maxBarSize={20}>
                    {npvRows.map((row) => (
                      <Cell
                        key={row.measureId}
                        fill={row.npv >= 0 ? DIVERGING_COLORS.positive : DIVERGING_COLORS.negative}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { label: t("financial.npvChart.positiveNpv"), color: DIVERGING_COLORS.positive },
                  { label: t("financial.npvChart.negativeNpv"), color: DIVERGING_COLORS.negative },
                ]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("financial.comparison.title")}</CardTitle>
          <CardDescription>{t("financial.comparison.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {measures.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("shared.noMeasuresRecorded")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("financial.comparison.columnMeasure")}</TableHead>
                  <TableHead>{t("financial.comparison.columnCategory")}</TableHead>
                  <TableHead className="text-right">
                    {t("financial.comparison.columnInvestment")}
                  </TableHead>
                  <TableHead className="text-right">{t("financial.comparison.columnNpv")}</TableHead>
                  <TableHead className="text-right">{t("financial.comparison.columnIrr")}</TableHead>
                  <TableHead className="text-right">
                    {t("financial.comparison.columnSimplePayback")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("financial.comparison.columnDiscountedPayback")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measures.map((measure) => {
                  const isSelected = measure.measureId === selectedMeasure?.measureId;
                  return (
                    <TableRow
                      key={measure.measureId}
                      onClick={() => setSelectedMeasureId(measure.measureId)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          setSelectedMeasureId(measure.measureId);
                        }
                      }}
                      tabIndex={0}
                      aria-selected={isSelected}
                      className={cn("cursor-pointer", isSelected && "bg-accent")}
                    >
                      <TableCell className="font-medium">{measure.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {MEASURE_CATEGORY_LABELS[measure.category]}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(measure.investmentCostUsd)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatCurrency(measure.standardized.npv)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatPercent(measure.standardized.irr)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatYears(measure.standardized.simplePaybackYears)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatYears(measure.standardized.discountedPaybackYears)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {selectedMeasure && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedMeasure.name}</CardTitle>
            <CardDescription>
              {t("financial.detail.subtitle", {
                category: MEASURE_CATEGORY_LABELS[selectedMeasure.category],
                investment: formatCurrency(selectedMeasure.investmentCostUsd),
                years: selectedMeasure.lifetimeYears,
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("financial.detail.columnIndicator")}</TableHead>
                  <TableHead className="text-right">
                    {t("financial.detail.columnStandardized")}
                  </TableHead>
                  <TableHead className="text-right">{t("financial.detail.columnActual")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>{t("financial.detail.annualSavingsKwh")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(selectedMeasure.standardizedAnnualSavingsKwh, 0)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatNumber(selectedMeasure.actualAnnualSavingsKwh, 0)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.annualSavingsUsd")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(selectedMeasure.standardizedAnnualSavingsUsd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(selectedMeasure.actualAnnualSavingsUsd)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.npv")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(selectedMeasure.standardized.npv)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(selectedMeasure.actual.npv)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.irr")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(selectedMeasure.standardized.irr)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(selectedMeasure.actual.irr)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.simplePayback")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatYears(selectedMeasure.standardized.simplePaybackYears)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatYears(selectedMeasure.actual.simplePaybackYears)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.discountedPayback")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatYears(selectedMeasure.standardized.discountedPaybackYears)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatYears(selectedMeasure.actual.discountedPaybackYears)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.discountRate")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(selectedMeasure.standardized.discountRate)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatPercent(selectedMeasure.actual.discountRate)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>{t("financial.detail.analysisHorizon")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {selectedMeasure.standardized.analysisHorizonYears} {t("financial.detail.yearsShort")}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {selectedMeasure.actual.analysisHorizonYears} {t("financial.detail.yearsShort")}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
