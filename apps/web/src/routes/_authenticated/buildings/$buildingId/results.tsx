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
  Leaf,
  Loader2,
  PiggyBank,
  RefreshCw,
  TrendingDown,
  Wallet,
  Zap,
} from "lucide-react";
import { useState } from "react";
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
import { ChartLegend } from "../../../../components/chart-legend";
import { ChartTooltip } from "../../../../components/chart-tooltip";
import { ShareBar } from "../../../../components/share-bar";
import { useAuditResults, useRunAudit } from "../../../../hooks/use-audit";
import { ApiError } from "../../../../lib/api";
import {
  BALANCE_COLORS,
  CHART_COLORS,
  END_USE_COLORS,
  SCENARIO_COLORS,
} from "../../../../lib/chart-colors";
import {
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
  const { buildingId } = Route.useParams();
  const auditResultsQuery = useAuditResults(buildingId);
  const runAudit = useRunAudit(buildingId);
  const [balanceScenario, setBalanceScenario] = useState<Scenario>("after");

  if (auditResultsQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
        <AuditResultsSkeleton />
      </div>
    );
  }

  if (auditResultsQuery.isError) {
    const error = auditResultsQuery.error;
    if (error instanceof ApiError && error.status === 404) {
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
          <AuditNotRunEmptyState buildingId={buildingId} />
        </div>
      );
    }
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
        <AuditErrorState
          message={error instanceof Error ? error.message : "Unknown error"}
          onRetry={() => auditResultsQuery.refetch()}
        />
      </div>
    );
  }

  if (!auditResultsQuery.data) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
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
          <h1 className="text-2xl font-semibold tracking-tight">Audit Results</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Generated {formatDate(result.generatedAt)}
            {auditResultsQuery.isFetching && " · Updating…"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/buildings/$buildingId/financial" params={{ buildingId }}>
                Financial analysis
              </Link>
            </Button>
            <Button onClick={() => runAudit.mutate()} disabled={runAudit.isPending}>
              {runAudit.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running…
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Re-run audit
                </>
              )}
            </Button>
          </div>
          {runAudit.isError && (
            <p className="max-w-xs text-right text-sm text-destructive">
              {runAudit.error instanceof ApiError ? runAudit.error.message : "Failed to run audit."}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard
          label="Current energy use"
          value={`${formatNumber(summary.currentEnergyUseKwhPerM2Year, 0)} kWh/m²/yr`}
          icon={<Zap className="h-5 w-5" />}
        />
        <MetricCard
          label="Potential energy use"
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
          label="Potential savings"
          value={`${formatNumber(summary.potentialSavingsKwhPerM2Year, 0)} kWh/m²/yr`}
          icon={<PiggyBank className="h-5 w-5" />}
        />
        <MetricCard
          label="CO2 reduction"
          value={`${formatNumber(summary.co2ReductionTonnesPerYear, 1)} tCO2/yr`}
          icon={<Leaf className="h-5 w-5" />}
        />
        <MetricCard
          label="Total investment"
          value={formatCurrency(summary.totalInvestmentUsd)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <MetricCard
          label="Total annual savings"
          value={formatCurrency(summary.totalAnnualSavingsUsd)}
          icon={<Wallet className="h-5 w-5" />}
        />
        <MetricCard
          label="Simple payback"
          value={formatYears(summary.simplePaybackYears)}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Energy use by end-use</CardTitle>
            <CardDescription>Before vs. after retrofit, final energy (kWh/yr).</CardDescription>
          </CardHeader>
          <CardContent>
            {endUseRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No end-use energy data available.
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
                      name="Before retrofit"
                      fill={SCENARIO_COLORS.before}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Bar
                      dataKey="after"
                      name="After retrofit"
                      fill={SCENARIO_COLORS.after}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                  </BarChart>
                </ResponsiveContainer>
                <ChartLegend
                  items={[
                    { label: "Before retrofit", color: SCENARIO_COLORS.before },
                    { label: "After retrofit", color: SCENARIO_COLORS.after },
                  ]}
                />
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current energy mix</CardTitle>
            <CardDescription>Share of final energy by end-use, before retrofit.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-full flex-col justify-center">
            <ShareBar segments={shareSegments} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Monthly heating energy balance</CardTitle>
            <CardDescription>
              EN ISO 13790 balance — losses, gains, and net energy need by month.
            </CardDescription>
          </div>
          {availableBalanceScenarios.length > 1 && (
            <Tabs
              value={balanceScenario}
              onValueChange={(value) => setBalanceScenario(value as Scenario)}
            >
              <TabsList>
                {availableBalanceScenarios.includes("before") && (
                  <TabsTrigger value="before">Before</TabsTrigger>
                )}
                {availableBalanceScenarios.includes("after") && (
                  <TabsTrigger value="after">After</TabsTrigger>
                )}
              </TabsList>
            </Tabs>
          )}
        </CardHeader>
        <CardContent>
          {monthlyRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No monthly balance data available.
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
                    name="Net energy need"
                    fill={BALANCE_COLORS.net}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    type="monotone"
                    dataKey="gains"
                    name="Total gains"
                    stroke={BALANCE_COLORS.gains}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="losses"
                    name="Total losses"
                    stroke={BALANCE_COLORS.losses}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
              <ChartLegend
                items={[
                  { label: "Net energy need", color: BALANCE_COLORS.net },
                  { label: "Total gains", color: BALANCE_COLORS.gains },
                  { label: "Total losses", color: BALANCE_COLORS.losses },
                ]}
              />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Recommended measures</CardTitle>
            <CardDescription>
              {result.measures.length} measure{result.measures.length === 1 ? "" : "s"} evaluated
              for this building.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/buildings/$buildingId/financial" params={{ buildingId }}>
              Financial detail
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {result.measures.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No measures recorded for this building yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Measure</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Savings (kWh/yr)</TableHead>
                  <TableHead className="text-right">Savings (USD/yr)</TableHead>
                  <TableHead className="text-right">Payback</TableHead>
                  <TableHead className="text-right">NPV</TableHead>
                  <TableHead className="text-right">CO2 (t/yr)</TableHead>
                  <TableHead>Status</TableHead>
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
                        <Badge variant="success">Proposed</Badge>
                      ) : (
                        <Badge variant="secondary">Not selected</Badge>
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
