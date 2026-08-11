import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { getOutletDailyDemandTrend } from "@/server/queries/outlet-daily-records";

const metric = (label: string, value: number) => <div><p className="text-xs text-muted-foreground">{label}</p><strong>{formatNumber(value)}</strong></div>;

export default async function DemandTrendsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const report = await getOutletDailyDemandTrend(await searchParams);
  const lowConfidence = report.coverage.confidence === "Low";
  return <>
    <PageHeader title="Demand Trend Lite" description="Outlet-record movement and wastage trends for operational review." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Data Quality"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on Outlet Daily Records only.</p><p>Estimated movement is not POS sales.</p><p>Low-sample products remain visible but need caution.</p><p>No inventory or production writes are made.</p></div></ConsoleSection>
      <ConsoleSection title="Coverage"><div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Confidence</span><strong>{report.coverage.confidence}</strong></p><p className="flex justify-between gap-3"><span>Completed outlet-days</span><strong>{report.coverage.completed} / {report.coverage.expected} ({formatNumber(report.coverage.percent)}%)</strong></p><p className="flex justify-between gap-3"><span>Incomplete records</span><strong>{report.coverage.incomplete}</strong></p><p className="flex justify-between gap-3"><span>Missing outlet-days</span><strong>{report.coverage.missing}</strong></p></div></ConsoleSection>
    </>}>
      <div className="overflow-hidden border bg-card"><form className="sb-list-filters"><SelectNative name="period" defaultValue={report.filters.period}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="month">Current month</option></SelectNative><SelectNative name="branch" defaultValue={report.filters.branch}><option value="all">All available outlets</option>{report.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}</SelectNative><SelectNative name="product" defaultValue={report.filters.product}><option value="all">All products</option>{report.products.map((product) => <option key={product.id} value={product.id}>{product.product_name}</option>)}</SelectNative><SelectNative name="status" defaultValue={report.filters.status}><option value="all">Completed + reviewed</option><option value="evening_completed">Completed only</option><option value="reviewed">Reviewed only</option></SelectNative><Button type="submit" variant="secondary">Filter</Button><Button asChild variant="ghost"><Link href="/reports/demand-trends">Reset</Link></Button></form></div>
      {lowConfidence ? <Card className="border-warning/40 bg-warning/10"><CardContent className="flex gap-2 p-3 text-sm text-warning"><AlertTriangle className="h-4 w-4 shrink-0" />Use with caution: {report.coverage.incomplete} incomplete record(s) and {report.coverage.missing} missing outlet-day(s) are excluded from reliable totals. Estimated movement is not POS sales.</CardContent></Card> : null}
      <Card><CardContent className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-6">{metric("Received", report.summary.received)}{metric("Leftover", report.summary.leftover)}{metric("Wastage", report.summary.wastage)}{metric("Estimated movement", report.summary.movement)}{metric("Wastage %", report.summary.wastage_percent)}{metric("Coverage", report.coverage.percent)}</CardContent></Card>
      <TrendChart rows={report.daily} />
      <TrendTable title="Top Moving Products" rows={report.top_moving_products} empty="No completed or reviewed product lines match the current filters." />
      <TrendTable title="Top Wastage Products" rows={report.top_wastage_products} empty="No wastage data is available for the current filters." />
      <TrendTable title="Outlet Comparison" rows={report.outlets} empty="No completed or reviewed outlet records match the current filters." />
      <TrendTable title="Daily Trend" rows={report.daily} empty="No daily trend data is available for the current filters." />
    </WorkspaceGrid>
  </>;
}

type TrendRow = { id: string; name: string; received: number; leftover: number; wastage: number; movement: number; wastage_percent: number; completed_records?: number; low_sample?: boolean; no_completed_records?: boolean };
function TrendChart({ rows }: { rows: TrendRow[] }) {
  const points = rows.slice(-14);
  if (points.length < 2) return null;
  const maxValue = Math.max(...points.flatMap((row) => [row.movement, row.wastage]), 1);
  const x = (index: number) => 24 + (index * 552) / Math.max(points.length - 1, 1);
  const y = (value: number) => 132 - (value / maxValue) * 104;
  const movementPoints = points.map((row, index) => `${x(index)},${y(row.movement)}`).join(" ");
  const wastagePoints = points.map((row, index) => `${x(index)},${y(row.wastage)}`).join(" ");
  return (
    <section className="border bg-card p-3 sm:p-4" aria-label="Daily movement and wastage trend">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div><h2 className="text-sm font-semibold">Daily movement trend</h2><p className="text-xs text-muted-foreground">Estimated movement compared with recorded wastage.</p></div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-primary" />Movement</span><span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-[var(--sb-danger)]" />Wastage</span></div>
      </div>
      <svg viewBox="0 0 600 160" className="h-36 w-full" role="img" aria-label="Daily estimated movement and wastage lines">
        <line x1="24" y1="132" x2="576" y2="132" stroke="var(--sb-border-soft)" />
        <line x1="24" y1="80" x2="576" y2="80" stroke="var(--sb-border-soft)" strokeDasharray="3 4" />
        <line x1="24" y1="28" x2="576" y2="28" stroke="var(--sb-border-soft)" strokeDasharray="3 4" />
        <polyline points={movementPoints} fill="none" stroke="var(--sb-green-700)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="square" />
        <polyline points={wastagePoints} fill="none" stroke="var(--sb-danger)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="square" />
        {points.map((row, index) => <g key={row.id}><circle cx={x(index)} cy={y(row.movement)} r="3" fill="var(--sb-green-700)" /><circle cx={x(index)} cy={y(row.wastage)} r="2.5" fill="var(--sb-danger)" /></g>)}
      </svg>
      <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground"><span>{points[0]?.name}</span><span className="text-right">{points[points.length - 1]?.name}</span></div>
    </section>
  );
}
function TrendTable({ title, rows, empty }: { title: string; rows: TrendRow[]; empty: string }) {
  return <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">{title}</h2></div><Table aria-label={title}><TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Leftover</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead className="text-right">Est. movement</TableHead><TableHead className="text-right">Wastage %</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell className="font-medium">{row.name}{row.low_sample ? <p className="text-xs font-normal text-warning">Low sample · {row.completed_records} completed record(s)</p> : null}{row.no_completed_records ? <p className="text-xs font-normal text-warning">No completed records in this range</p> : null}</TableCell><TableCell className="text-right">{formatNumber(row.received)}</TableCell><TableCell className="text-right">{formatNumber(row.leftover)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage)}</TableCell><TableCell className="text-right">{formatNumber(row.movement)}</TableCell><TableCell className="text-right">{formatNumber(row.wastage_percent)}%</TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No reliable trend data" description={empty} /></TableCell></TableRow> : null}</TableBody></Table></section>;
}
