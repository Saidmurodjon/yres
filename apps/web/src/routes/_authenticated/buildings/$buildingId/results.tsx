import { Link, createFileRoute } from "@tanstack/react-router";
import type { Scenario } from "@yres/types";
import {
  Badge,
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
  Tabs,
  TabsList,
  TabsTrigger,
} from "@yres/ui";
import {
  ArrowRight,
  Clock,
  DollarSign,
  Download,
  Leaf,
  Loader2,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Line,
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
import { AuditorNote } from "../../../../components/auditor-note";
import { ChartLegend } from "../../../../components/chart-legend";
import { ChartTooltip } from "../../../../components/chart-tooltip";
import { ShareBar } from "../../../../components/share-bar";
import { useAuditResults, useDownloadAuditReport, useRunAudit } from "../../../../hooks/use-audit";
import { ApiError } from "../../../../lib/api";
import {
  BALANCE_COLORS,
  CHART_COLORS,
  END_USE_COLORS,
  SCENARIO_COLORS,
} from "../../../../lib/chart-colors";
import {
  ENERGY_BALANCE_CATEGORY_LABELS,
  END_USES,
  END_USE_LABELS,
  MEASURE_CATEGORY_LABELS,
  MONTH_LABELS,
  formatCurrency,
  formatDate,
  formatNumber,
  formatYears,
} from "../../../../lib/labels";

export const Route = createFileRoute("/_authenticated/buildings/$buildingId/results")({
  component: AuditResultsPage,
});

function AuditResultsPage() {
  const { t } = useTranslation("audit");
  const { buildingId } = Route.useParams();
  const auditResultsQuery = useAuditResults(buildingId);
  const runAudit = useRunAudit(buildingId);
  const downloadReport = useDownloadAuditReport(buildingId);
  const [balanceScenario, setBalanceScenario] = useState<Scenario>("after");

  if (auditResultsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("results.title")}</h1>
        <AuditResultsSkeleton />
      </div>
    );
  }

  if (auditResultsQuery.isError) {
    const error = auditResultsQuery.error;
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t("results.title")}</h1>
          <AuditNotRunEmptyState buildingId={buildingId} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">{t("results.title")}</h1>
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
        <h1 className="text-2xl font-semibold tracking-tight">{t("results.title")}</h1>
        <AuditResultsSkeleton />
      </div>
    );
  }

  const { result } = auditResultsQuery.data;
  const { summary } = result;

  const endUseRows = END_USES.map((endUse) => {
    const before =
      result.finalEnergyByEndUse.find((e) => e.endUse === endUse && e.scenario === "before")
        ?.finalEnergyConsumptionKwh ?? 0;
    const after =
      result.finalEnergyByEndUse.find((e) => e.endUse === endUse && e.scenario === "after")
        ?.finalEnergyConsumptionKwh ?? 0;
    return { endUse, label: END_USE_LABELS[endUse], before, after };
  }).filter((row) => row.before > 0 || row.after > 0);

  const BALANCE_SECTION_LABELS = {
    envelope_ventilation_loss: t("results.balanceBreakdown.sections.envelopeVentilationLoss"),
    final_energy: t("results.balanceBreakdown.sections.finalEnergy"),
    renewable_offset: t("results.balanceBreakdown.sections.renewableOffset"),
  } as const;
  const balanceSections = (
    ["envelope_ventilation_loss", "final_energy", "renewable_offset"] as const
  )
    .map((section) => ({
      key: section,
      label: BALANCE_SECTION_LABELS[section],
      rows: result.energyBalanceBreakdown.filter(
        (row) => row.section === section && (row.beforeKwh > 0 || row.afterKwh > 0),
      ),
    }))
    .filter((section) => section.rows.length > 0);

  const shareSegments = endUseRows.map((row) => ({
    key: row.endUse,
    label: row.label,
    value: row.before,
    color: END_USE_COLORS[row.endUse],
  }));

  const availableBalanceScenarios = result.heatingEnergyBalance.map((b) => b.scenario);
  const activeBalance =
    result.heatingEnergyBalance.find((b) => b.scenario === balanceScenario) ??
    result.heatingEnergyBalance[0];
  const monthlyRows = (activeBalance?.monthly ?? []).map((m) => ({
    month: MONTH_LABELS[m.month - 1]?.slice(0, 3) ?? String(m.month),
    gains: m.totalGainsKwh,
    losses: m.totalLossesKwh,
    net: m.netEnergyNeedKwh,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t("results.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("results.generated", { date: formatDate(result.generatedAt) })}
            {auditResultsQuery.isFetching && ` · ${t("results.updating")}`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/buildings/$buildingId/financial" params={{ buildingId }}>
                {t("results.financialAnalysis")}
              </Link>
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadReport.mutate()}
              disabled={downloadReport.isPending}
            >
              {downloadReport.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("results.preparing")}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  {t("results.downloadReport")}
                </>
              )}
            </Button>
            <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
              {runAudit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("results.running")}
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  {t("results.reRunAudit")}
                </>
              )}
            </Button>
          </div>
          {runAudit.isError && (
            <p className="max-w-xs text-right text-sm text-destructive">
              {runAudit.error instanceof ApiError ? runAudit.error.message : t("results.runFailed")}
            </p>
          )}
          {downloadReport.isError && (
            <p className="max-w-xs text-right text-sm text-destructive">
              {downloadReport.error instanceof ApiError
                ? downloadReport.error.message
                : t("results.downloadFailed")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label={t("results.kpi.currentEnergyUse")}
          value={`${formatNumber(summary.currentEnergyUseKwhPerM2Year, 0)} kWh/m²/yr`}
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          label={t("results.kpi.potentialEnergyUse")}
          value={`${formatNumber(summary.potentialEnergyUseKwhPerM2Year, 0)} kWh/m²/yr`}
          icon={<TrendingDown className="h-5 w-5" />}
          trend={
            summary.potentialEnergyUseKwhPerM2Year < summary.currentEnergyUseKwhPerM2Year
              ? "down"
              : "up"
          }
          trendIsGood
        />
        <MetricCard
          label={t("results.kpi.potentialSavings")}
          value={`${formatNumber(summary.potentialSavingsKwhPerM2Year, 0)} kWh/m²/yr`}
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <MetricCard
          label={t("results.kpi.co2Reduction")}
          value={`${formatNumber(summary.co2ReductionTonnesPerYear, 1)} tCO2/yr`}
          icon={<Leaf className="h-5 w-5" />}
        />
        <MetricCard
          label={t("results.kpi.totalInvestment")}
          value={formatCurrency(summary.totalInvestmentUsd)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          label={t("results.kpi.totalAnnualSavings")}
          value={formatCurrency(summary.totalAnnualSavingsUsd)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label={t("results.kpi.simplePayback")}
          value={formatYears(summary.simplePaybackYears)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("results.endUseChart.title")}</CardTitle>
            <CardDescription>{t("results.endUseChart.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            {endUseRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("results.endUseChart.noData")}
              </p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={endUseRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={CHART_COLORS.grid} />
                    <XAxis
                      dataKey="label"
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
                      content={<ChartTooltip formatValue={(v) => `${formatNumber(v, 0)} kWh`} />}
                    />
                    <Bar
                      dataKey="before"
                      name={t("results.endUseChart.beforeRetrofit")}
                      fill={SCENARIO_COLORS.before}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="after"
                      name={t("results.endUseChart.afterRetrofit")}
                      fill={SCENARIO_COLORS.after}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend
                  items={[
                    { label: t("results.endUseChart.beforeRetrofit"), color: SCENARIO_COLORS.before },
                    { label: t("results.endUseChart.afterRetrofit"), color: SCENARIO_COLORS.after },
                  ]}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("results.energyMix.title")}</CardTitle>
            <CardDescription>{t("results.energyMix.description")}</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-center">
            <ShareBar segments={shareSegments} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("results.balanceBreakdown.title")}</CardTitle>
          <CardDescription>{t("results.balanceBreakdown.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {balanceSections.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("results.balanceBreakdown.noData")}
            </p>
          ) : (
            <div className="space-y-6">
              {balanceSections.map((section) => (
                <div key={section.key}>
                  <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                    {section.label}
                  </h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t("results.balanceBreakdown.component")}</TableHead>
                        <TableHead className="text-right">
                          {t("results.balanceBreakdown.before")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("results.balanceBreakdown.after")}
                        </TableHead>
                        <TableHead className="text-right">
                          {t("results.balanceBreakdown.savings")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {section.rows.map((row) => (
                        <TableRow key={row.category}>
                          <TableCell className="font-medium">
                            {ENERGY_BALANCE_CATEGORY_LABELS[row.category] ?? row.category}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.section === "renewable_offset"
                              ? "—"
                              : formatNumber(row.beforeKwh, 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatNumber(row.afterKwh, 0)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {row.section === "renewable_offset"
                              ? "—"
                              : formatNumber(row.beforeKwh - row.afterKwh, 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <AuditorNote buildingId={buildingId} sectionKey={section.key} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("results.monthlyBalance.title")}</CardTitle>
            <CardDescription>{t("results.monthlyBalance.description")}</CardDescription>
          </div>
          {availableBalanceScenarios.length > 1 && (
            <Tabs
              value={balanceScenario}
              onValueChange={(value) => setBalanceScenario(value as Scenario)}
            >
              <TabsList>
                {availableBalanceScenarios.includes("before") && (
                  <TabsTrigger value="before">{t("results.monthlyBalance.before")}</TabsTrigger>
                )}
                {availableBalanceScenarios.includes("after") && (
                  <TabsTrigger value="after">{t("results.monthlyBalance.after")}</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        <CardContent>
          {monthlyRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("results.monthlyBalance.noData")}
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={320}>
                <ComposedChart data={monthlyRows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                    width={64}
                  />
                  <Tooltip
                    cursor={{ stroke: CHART_COLORS.grid }}
                    content={<ChartTooltip formatValue={(v) => `${formatNumber(v, 0)} kWh`} />}
                  />
                  <Bar
                    dataKey="net"
                    name={t("results.monthlyBalance.netEnergyNeed")}
                    fill={BALANCE_COLORS.net}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="gains"
                    name={t("results.monthlyBalance.totalGains")}
                    stroke={BALANCE_COLORS.gains}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="losses"
                    name={t("results.monthlyBalance.totalLosses")}
                    stroke={BALANCE_COLORS.losses}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { label: t("results.monthlyBalance.netEnergyNeed"), color: BALANCE_COLORS.net },
                  { label: t("results.monthlyBalance.totalGains"), color: BALANCE_COLORS.gains },
                  { label: t("results.monthlyBalance.totalLosses"), color: BALANCE_COLORS.losses },
                ]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>{t("results.measures.title")}</CardTitle>
            <CardDescription>
              {t("results.measures.evaluated", { count: result.measures.length })}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/buildings/$buildingId/financial" params={{ buildingId }}>
              {t("results.measures.financialDetail")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {result.measures.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("shared.noMeasuresRecorded")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("results.measures.columnMeasure")}</TableHead>
                  <TableHead>{t("results.measures.columnCategory")}</TableHead>
                  <TableHead className="text-right">
                    {t("results.measures.columnSavingsKwh")}
                  </TableHead>
                  <TableHead className="text-right">
                    {t("results.measures.columnSavingsUsd")}
                  </TableHead>
                  <TableHead className="text-right">{t("results.measures.columnPayback")}</TableHead>
                  <TableHead className="text-right">{t("results.measures.columnNpv")}</TableHead>
                  <TableHead className="text-right">{t("results.measures.columnCo2")}</TableHead>
                  <TableHead>{t("results.measures.columnStatus")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.measures.map((measure) => (
                  <TableRow key={measure.measureId}>
                    <TableCell className="font-medium">{measure.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {MEASURE_CATEGORY_LABELS[measure.category]}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(measure.standardizedAnnualSavingsKwh, 0)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(measure.standardizedAnnualSavingsUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatYears(measure.simplePaybackYears)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(measure.standardized.npv)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(measure.co2ReductionTonnesPerYear, 1)}
                    </TableCell>
                    <TableCell>
                      {measure.proposedForImplementation ? (
                        <Badge variant="success">{t("results.measures.proposed")}</Badge>
                      ) : (
                        <Badge variant="secondary">{t("results.measures.notSelected")}</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
