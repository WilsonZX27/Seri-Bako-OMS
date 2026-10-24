import { AlertTriangle } from "lucide-react";
import Link from "next/link";
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
import { SelectControl } from "@/components/ui/select-control";
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
  const lowConfidence = report.coverage.confidence === "Low" || report.coverage.unavailable > 0 || report.coverage.reliable_lines === 0;
  return <>
    <PageHeader title="Demand Trend Lite" description="Outlet-record movement and wastage trends for operational review." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Data Quality"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on Outlet Daily Records only.</p><p>Estimated movement is not POS sales.</p><p>Low-sample products remain visible but need caution.</p><p>No inventory or production writes are made.</p></div></ConsoleSection>
      <ConsoleSection title="Coverage"><div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Confidence</span><strong>{report.coverage.confidence}</strong></p><p className="flex justify-between gap-3"><span>Completed outlet-days</span><strong>{report.coverage.completed} / {report.coverage.expected} ({formatNumber(report.coverage.percent)}%)</strong></p><p className="flex justify-between gap-3"><span>Incomplete records</span><strong>{report.coverage.incomplete}</strong></p><p className="flex justify-between gap-3"><span>Unavailable receiving</span><strong>{report.coverage.unavailable}</strong></p><p className="flex justify-between gap-3"><span>Missing outlet-days</span><strong>{report.coverage.missing}</strong></p></div></ConsoleSection>
    </>} tabletRailMode="split">
      <FilterBar resetHref="/reports/demand-trends" className="sb-list-filters--balanced"><SelectControl name="period" defaultValue={report.filters.period} ariaLabel="Reporting period" options={[({value: "7", label: "Last 7 days"}), ({value: "30", label: "Last 30 days"}), ({value: "month", label: "Current month"})]}/><SelectControl name="branch" defaultValue={report.filters.branch} ariaLabel="Outlet branch" options={[({value: "all", label: "All available outlets"}), ...(report.branches.map((branch) => ({value: String((branch.id) ?? ""), label: String((branch.branch_name) ?? "")})))]}/><FilterBarMore activeCount={Number(report.filters.product !== "all")} resetHref="/reports/demand-trends"><SelectControl name="product" defaultValue={report.filters.product} ariaLabel="Product" options={[({value: "all", label: "All products"}), ...(report.products.map((product) => ({value: String((product.id) ?? ""), label: String((product.product_name) ?? "")})))]}/></FilterBarMore><Button type="submit" variant="secondary">Filter</Button></FilterBar>
      {lowConfidence ? <Card className="border-warning/40 bg-warning/10"><CardContent className="flex gap-2 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Use with caution: {report.coverage.incomplete} incomplete record(s), {report.coverage.unavailable} record(s) with unverified receiving, and {report.coverage.missing} missing outlet-day(s) are excluded from reliable totals. Estimated movement is not POS sales.</CardContent></Card> : null}
      <MetricStrip items={[{ label: "Received", value: report.coverage.reliable_lines ? formatNumber(report.summary.received) : "Unavailable" }, { label: "Leftover", value: report.coverage.reliable_lines ? formatNumber(report.summary.leftover) : "Unavailable" }, { label: "Wastage", value: report.coverage.reliable_lines ? formatNumber(report.summary.wastage) : "Unavailable" }, { label: "Estimated movement", value: report.coverage.reliable_lines ? formatNumber(report.summary.movement) : "Unavailable" }, { label: "Wastage %", value: report.coverage.reliable_lines ? `${formatNumber(report.summary.wastage_percent)}%` : "Unavailable" }, { label: "Coverage", value: `${formatNumber(report.coverage.percent)}%` }]} className="lg:grid-cols-6" />
      <DemandTrendChart rows={report.daily} />
      <div className="grid gap-4 lg:grid-cols-2">
        <DemandRankingChart title="Top moving products" description="Six highest estimated movements in the current scope." rows={report.top_moving_products} metric="movement" searchParams={{ period: report.filters.period, branch: report.filters.branch, status: report.filters.status }} />
        <DemandRankingChart title="Top wastage products" description="Six highest wastage quantities in the current scope." rows={report.top_wastage_products} metric="wastage" searchParams={{ period: report.filters.period, branch: report.filters.branch, status: report.filters.status }} />
      </div>
      <TrendTable title="Top Moving Products" rows={report.top_moving_products} empty="No posted product lines match the current filters." collapsible />
      <TrendTable title="Top Wastage Products" rows={report.top_wastage_products} empty="No wastage data is available for the current filters." collapsible />
      <TrendTable title="Outlet Comparison" rows={report.outlets} empty="No posted outlet records match the current filters." collapsible />
      <TrendTable title="Daily detail" rows={report.daily} empty="No daily trend data is available for the current filters." collapsible detailHref={(row) => outletDailyHref(row.id, report.filters)} />
    </WorkspaceGrid>
  </>;
}

type TrendRow = { id: string; name: string; received: number; leftover: number; wastage: number; movement: number; wastage_percent: number; completed_records?: number; low_sample?: boolean; no_completed_records?: boolean };
const trendMetric = (row: TrendRow, value: number) => row.no_completed_records ? "Unavailable" : formatNumber(value);
const trendRate = (row: TrendRow) => row.no_completed_records ? "Unavailable" : `${formatNumber(row.wastage_percent)}%`;
function outletDailyHref(date: string, filters: Record<string, string | undefined>) {
  const params = new URLSearchParams({ date });
  if (filters.branch && filters.branch !== "all") params.set("branch", filters.branch);
  if (filters.status && filters.status !== "all") params.set("status", filters.status);
  return `/outlet-daily-records?${params.toString()}`;
}

function TrendTable({ title, rows, empty, collapsible = false, detailHref }: { title: string; rows: TrendRow[]; empty: string; collapsible?: boolean; detailHref?: (row: TrendRow) => string }) {
  const content = <><Table mobileHidden aria-label={title}><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Leftover</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Est. movement</TableHead><TableHead className="text-right">Wastage %</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{detailHref ? <Link className="underline-offset-4 hover:underline" href={detailHref(row)}>{row.name}</Link> : row.name}{row.low_sample ? <p className="text-xs font-normal text-warning">Low sample · {row.completed_records} completed record(s)</p> : null}{row.no_completed_records ? <p className="text-xs font-normal text-warning">No completed records in this range</p> : null}</TableCell><TableCell className="text-right">{trendMetric(row, row.received)}</TableCell><TableCell className="text-right">{trendMetric(row, row.leftover)}</TableCell><TableCell className="text-right">{trendMetric(row, row.wastage)}</TableCell><TableCell className="text-right">{trendMetric(row, row.movement)}</TableCell><TableCell className="text-right">{trendRate(row)}</TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No reliable trend data" description={empty} /></TableCell></TableRow> : null}</TableBody></Table><OperationalList ariaLabel={title}>{rows.map((row) => <OperationalListRow key={row.id} href={detailHref?.(row)} label={`${row.name} demand trend`} primary={row.name} status={row.no_completed_records ? <Badge variant="danger">No data</Badge> : row.low_sample ? <Badge variant="warning">Low sample</Badge> : undefined} statusMeta={<>Movement {trendMetric(row, row.movement)}</>} secondary={<>Received {trendMetric(row, row.received)} · Leftover {trendMetric(row, row.leftover)}</>} meta={<>Wastage {trendMetric(row, row.wastage)} · {trendRate(row)}</>} />)}{!rows.length ? <EmptyState title="No reliable trend data" description={empty} /> : null}</OperationalList></>;
  if (collapsible) return <details className="overflow-hidden border bg-card" data-demand-detail-disclosure><summary className="flex min-h-11 cursor-pointer items-center px-3 py-2.5 text-sm font-semibold hover:bg-[var(--sb-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--sb-green-700)]">{title} · full detail ({rows.length})</summary><div className="border-t">{content}</div></details>;
  return <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">{title}</h2></div>{content}</section>;
}
