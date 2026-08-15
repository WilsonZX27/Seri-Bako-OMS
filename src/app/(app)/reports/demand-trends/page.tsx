import { AlertTriangle } from "lucide-react";
import { DemandTrendChart } from "@/components/reports/demand-trend-chart";
import { DemandRankingChart } from "@/components/reports/demand-ranking-chart";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";
import { logServerError } from "@/server/observability/logger";

export const dynamic = "force-dynamic";

export default async function DemandTrendsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getOutletDailyDemandTrend(filters).catch((error) => {
    logServerError(error, { source: "page.demandTrends.report" });
    return null;
  });
  if (!report) return <>
    <PageHeader title="Demand Trend Lite" description="Outlet-record movement and wastage trends for operational review." />
    <WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Report status"><p className="text-xs text-muted-foreground">The report source could not be verified. No incomplete result is shown as zero.</p></ConsoleSection>} tabletRailMode="split">
      <Card><CardContent className="p-5"><EmptyState title="Demand Trend Lite is unavailable" description="Try again shortly. Outlet records remain unchanged, and no incomplete trend is presented as an empty report." action={{ href: "/reports/demand-trends", label: "Retry report" }} /></CardContent></Card>
    </WorkspaceGrid>
  </>;
  const lowConfidence = report.coverage.confidence === "Low";
  return <>
    <PageHeader title="Demand Trend Lite" description="Outlet-record movement and wastage trends for operational review." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Data Quality"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on Outlet Daily Records only.</p><p>Estimated movement is not POS sales.</p><p>Low-sample products remain visible but need caution.</p><p>No inventory or production writes are made.</p></div></ConsoleSection>
      <ConsoleSection title="Coverage"><div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Confidence</span><strong>{report.coverage.confidence}</strong></p><p className="flex justify-between gap-3"><span>Completed outlet-days</span><strong>{report.coverage.completed} / {report.coverage.expected} ({formatNumber(report.coverage.percent)}%)</strong></p><p className="flex justify-between gap-3"><span>Incomplete records</span><strong>{report.coverage.incomplete}</strong></p><p className="flex justify-between gap-3"><span>Missing outlet-days</span><strong>{report.coverage.missing}</strong></p></div></ConsoleSection>
    </>} tabletRailMode="split">
      <div className="overflow-hidden border bg-card"><FilterBar resetHref="/reports/demand-trends"><SelectNative name="period" defaultValue={report.filters.period} aria-label="Reporting period"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">Current month</option></SelectNative><SelectNative name="branch" defaultValue={report.filters.branch} aria-label="Outlet branch"><option value="all">All available outlets</option>{report.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative><FilterBarMore activeCount={Number(report.filters.product !== "all") + Number(report.filters.status !== "all")} resetHref="/reports/demand-trends"><SelectNative name="product" defaultValue={report.filters.product} aria-label="Product"><option value="all">All products</option>{report.products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}</SelectNative><SelectNative name="status" defaultValue={report.filters.status} aria-label="Daily record status"><option value="all">Completed + reviewed</option><option value="evening_completed">Completed only</option><option value="reviewed">Reviewed only</option></SelectNative></FilterBarMore><Button type="submit" variant="secondary">Filter</Button></FilterBar></div>
      {lowConfidence ? <Card className="border-warning/40 bg-warning/10"><CardContent className="flex gap-2 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Use with caution: {report.coverage.incomplete} incomplete record(s) and {report.coverage.missing} missing outlet-day(s) are excluded from reliable totals. Estimated movement is not POS sales.</CardContent></Card> : null}
      <MetricStrip items={[{ label: "Received", value: formatNumber(report.summary.received) }, { label: "Leftover", value: formatNumber(report.summary.leftover) }, { label: "Wastage", value: formatNumber(report.summary.wastage) }, { label: "Estimated movement", value: formatNumber(report.summary.movement) }, { label: "Wastage %", value: `${formatNumber(report.summary.wastage_percent)}%` }, { label: "Coverage", value: `${formatNumber(report.coverage.percent)}%` }]} className="grid-cols-3 lg:grid-cols-6" />
      <DemandTrendChart rows={report.daily} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DemandRankingChart title="Top moving products" description="Six highest estimated movements in the current scope." rows={report.top_moving_products} metric="movement" searchParams={{ period: report.filters.period, branch: report.filters.branch, status: report.filters.status }} />
        <DemandRankingChart title="Top wastage products" description="Six highest wastage quantities in the current scope." rows={report.top_wastage_products} metric="wastage" searchParams={{ period: report.filters.period, branch: report.filters.branch, status: report.filters.status }} />
      </div>
      <TrendTable title="Top Moving Products" rows={report.top_moving_products} empty="No completed or reviewed product lines match the current filters." collapsible />
      <TrendTable title="Top Wastage Products" rows={report.top_wastage_products} empty="No wastage data is available for the current filters." collapsible />
      <TrendTable title="Outlet Comparison" rows={report.outlets} empty="No completed or reviewed outlet records match the current filters." collapsible />
      <TrendTable title="Daily detail" rows={report.daily} empty="No daily trend data is available for the current filters." collapsible />
    </WorkspaceGrid>
  </>;
}

type TrendRow = { id: string; name: string; received: number; leftover: number; wastage: number; movement: number; wastage_percent: number; completed_records?: number; low_sample?: boolean; no_completed_records?: boolean };
function TrendTable({ title, rows, empty, collapsible = false }: { title: string; rows: TrendRow[]; empty: string; collapsible?: boolean }) {
  const content = <><Table mobileHidden aria-label={title}><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Leftover</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Est. movement</TableHead><TableHead className="text-right">Wastage %</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}{row.low_sample ? <p className="text-xs font-normal text-warning">Low sample · {row.completed_records} completed record(s)</p> : null}{row.no_completed_records ? <p className="text-xs font-normal text-warning">No completed records in this range</p> : null}</TableCell><TableCell className="text-right">{formatNumber(row.received)}</TableCell><TableCell className="text-right">{formatNumber(row.leftover)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage)}</TableCell><TableCell className="text-right">{formatNumber(row.movement)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage_percent)}%</TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No reliable trend data" description={empty} /></TableCell></TableRow> : null}</TableBody></Table><OperationalList ariaLabel={title}>{rows.map((row) => <OperationalListRow key={row.id} label={`${row.name} demand trend`} primary={row.name} status={row.no_completed_records ? <Badge variant="danger">No data</Badge> : row.low_sample ? <Badge variant="warning">Low sample</Badge> : undefined} statusMeta={<>Movement {formatNumber(row.movement)}</>} secondary={<>Received {formatNumber(row.received)} · Leftover {formatNumber(row.leftover)}</>} meta={<>Wastage {formatNumber(row.wastage)} · {formatNumber(row.wastage_percent)}%</>} />)}{!rows.length ? <EmptyState title="No reliable trend data" description={empty} /> : null}</OperationalList></>;
  if (collapsible) return <details className="overflow-hidden border bg-card" data-demand-detail-disclosure><summary className="flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-sm font-semibold hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]">{title} · full detail ({rows.length})</summary><div className="border-t">{content}</div></details>;
  return <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">{title}</h2></div>{content}</section>;
}
