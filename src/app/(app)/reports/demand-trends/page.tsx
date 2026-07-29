import { AlertTriangle } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";

export default async function DemandTrendsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const report = await getOutletDailyDemandTrend(await searchParams);
  const lowConfidence = report.coverage.confidence === "Low";
  return <>
    <PageHeader title="Demand Trend Lite" description="Outlet-record movement and wastage trends for operational review." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Data Quality"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on Outlet Daily Records only.</p><p>Estimated movement is not POS sales.</p><p>Low-sample products remain visible but need caution.</p><p>No inventory or production writes are made.</p></div></ConsoleSection>
      <ConsoleSection title="Coverage"><div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Confidence</span><strong>{report.coverage.confidence}</strong></p><p className="flex justify-between gap-3"><span>Completed outlet-days</span><strong>{report.coverage.completed} / {report.coverage.expected} ({formatNumber(report.coverage.percent)}%)</strong></p><p className="flex justify-between gap-3"><span>Incomplete records</span><strong>{report.coverage.incomplete}</strong></p><p className="flex justify-between gap-3"><span>Missing outlet-days</span><strong>{report.coverage.missing}</strong></p></div></ConsoleSection>
    </>} tabletRailMode="split">
      <div className="overflow-hidden border bg-card"><FilterBar resetHref="/reports/demand-trends"><SelectNative name="period" defaultValue={report.filters.period}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">Current month</option></SelectNative><SelectNative name="branch" defaultValue={report.filters.branch}><option value="all">All available outlets</option>{report.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative><FilterBarMore activeCount={Number(report.filters.product !== "all") + Number(report.filters.status !== "all")} resetHref="/reports/demand-trends"><SelectNative name="product" defaultValue={report.filters.product}><option value="all">All products</option>{report.products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}</SelectNative><SelectNative name="status" defaultValue={report.filters.status}><option value="all">Completed + reviewed</option><option value="evening_completed">Completed only</option><option value="reviewed">Reviewed only</option></SelectNative></FilterBarMore><Button type="submit" variant="secondary">Filter</Button></FilterBar></div>
      {lowConfidence ? <Card className="border-warning/40 bg-warning/10"><CardContent className="flex gap-2 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Use with caution: {report.coverage.incomplete} incomplete record(s) and {report.coverage.missing} missing outlet-day(s) are excluded from reliable totals. Estimated movement is not POS sales.</CardContent></Card> : null}
      <MetricStrip items={[{ label: "Received", value: formatNumber(report.summary.received) }, { label: "Leftover", value: formatNumber(report.summary.leftover) }, { label: "Wastage", value: formatNumber(report.summary.wastage) }, { label: "Estimated movement", value: formatNumber(report.summary.movement) }, { label: "Wastage %", value: `${formatNumber(report.summary.wastage_percent)}%` }, { label: "Coverage", value: `${formatNumber(report.coverage.percent)}%` }]} className="lg:grid-cols-6" />
      <TrendTable title="Top Moving Products" rows={report.top_moving_products} empty="No completed or reviewed product lines match the current filters." />
      <TrendTable title="Top Wastage Products" rows={report.top_wastage_products} empty="No wastage data is available for the current filters." />
      <TrendTable title="Outlet Comparison" rows={report.outlets} empty="No completed or reviewed outlet records match the current filters." />
      <TrendTable title="Daily Trend" rows={report.daily} empty="No daily trend data is available for the current filters." />
    </WorkspaceGrid>
  </>;
}

type TrendRow = { id: string; name: string; received: number; leftover: number; wastage: number; movement: number; wastage_percent: number; completed_records?: number; low_sample?: boolean; no_completed_records?: boolean };
function TrendTable({ title, rows, empty }: { title: string; rows: TrendRow[]; empty: string }) {
  return <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">{title}</h2></div><Table aria-label={title}><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Leftover</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Est. movement</TableHead><TableHead className="text-right">Wastage %</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}{row.low_sample ? <p className="text-xs font-normal text-warning">Low sample · {row.completed_records} completed record(s)</p> : null}{row.no_completed_records ? <p className="text-xs font-normal text-warning">No completed records in this range</p> : null}</TableCell><TableCell className="text-right">{formatNumber(row.received)}</TableCell><TableCell className="text-right">{formatNumber(row.leftover)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage)}</TableCell><TableCell className="text-right">{formatNumber(row.movement)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage_percent)}%</TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No reliable trend data" description={empty} /></TableCell></TableRow> : null}</TableBody></Table></section>;
}
