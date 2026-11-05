import { DAILY_UNIT_UNAVAILABLE } from "@/lib/daily-quantity-basis";
import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getProductionDemandVariance } from "@/server/queries/outlet-daily-records";
import { ProductionVarianceSignalChart } from "@/components/reports/production-variance-signal-chart";
import { logServerError } from "@/server/observability/logger";

const metric = (label: string, value: number | null) => <div className="flex min-w-0 items-start justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><strong>{value === null ? "Unavailable" : formatNumber(value)}</strong></div>;
type QuantityRow = { received: number; quantity_totals_available?: boolean; quantity_unit?: string | null };
const quantity = (row: QuantityRow, value: number) => row.quantity_totals_available === true && row.quantity_unit && Number.isFinite(value) ? `${formatNumber(value)} ${row.quantity_unit}` : "Unavailable";
const rate = (row: QuantityRow, value: number) => row.quantity_totals_available === true && row.quantity_unit && row.received > 0 && Number.isFinite(value) ? `${formatNumber(value)}%` : "Unavailable";
const signalBadge = (signal: string) => <Badge variant={signal === "over_supplied" ? "warning" : signal === "under_supplied" ? "danger" : signal === "review_manual" ? "secondary" : "success"}>{signal === "over_supplied" ? "Over-supplied" : signal === "under_supplied" ? "Under-supplied" : signal === "review_manual" ? "Review manually" : "Balanced"}</Badge>;

export default async function ProductionVariancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getProductionDemandVariance(filters).catch((error) => {
    logServerError(error, { source: "page.productionVariance.report" });
    return null;
  });
  if (!report) return <>
    <PageHeader title="Production vs Outlet Demand Variance" description="Outlet demand signals only; production job output is not compared because no reliable posted-output join is used." />
    <WorkspaceGrid hideMobileConsole rightRail={<ConsoleSection title="Report status"><p className="text-xs text-muted-foreground">The outlet-demand source could not be verified. No failed read is classified as balanced or zero.</p></ConsoleSection>}>
      <Card><CardContent className="p-5"><EmptyState title="Production variance is unavailable" description="Try again shortly. No variance classification is shown from incomplete data, and no production or inventory record was changed." action={{ href: "/production/variance", label: "Retry report" }} /></CardContent></Card>
    </WorkspaceGrid>
  </>;
  const quantitiesAvailable = report.quantity_totals_available === true && !!report.quantity_unit;
  const filtered = hasActiveFilters(filters);
  return <>
    <PageHeader title="Production vs Outlet Demand Variance" description="Outlet demand signals only; production job output is not compared because no reliable posted-output join is used." />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Assumptions"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on Outlet Daily Records only.</p><p>Estimated movement is not POS sales.</p><p>Incomplete records reduce confidence.</p><p>No stock, production, or planning records are changed.</p><p>Production job comparison is not included without a reliable posted-output join.</p></div></ConsoleSection>
      <ConsoleSection title="Coverage"><div className="space-y-1 text-xs"><p className="flex justify-between gap-3"><span>Confidence</span><strong>{report.coverage.confidence}</strong></p><p className="flex justify-between gap-3"><span>Completed outlet-days</span><strong>{report.coverage.completed} / {report.coverage.expected}</strong></p><p className="flex justify-between gap-3"><span>Incomplete records</span><strong>{report.coverage.incomplete}</strong></p><p className="flex justify-between gap-3"><span>Missing outlet-days</span><strong>{report.coverage.missing}</strong></p></div><Button asChild className="mt-3 w-full" variant="outline" size="sm"><Link href="/reports/demand-trends">Open Demand Trends</Link></Button></ConsoleSection>
    </>}>
      <div aria-label="Production variance filters">
        <FilterBar resultCount={report.variance.rows.length} resetHref="/production/variance" filtered={filtered}>
          <SelectControl name="period" defaultValue={report.filters.period} ariaLabel="Period" options={[{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "month", label: "Current month" }]} />
          <SelectControl name="branch" defaultValue={report.filters.branch} ariaLabel="Outlet" options={[{ value: "all", label: "All accessible outlets" }, ...report.branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
          <SelectControl name="product" defaultValue={report.filters.product} ariaLabel="Product" options={[{ value: "all", label: "All products" }, ...report.products.map((product) => ({ value: product.id, label: product.product_name }))]} />
          <SelectControl name="signal" defaultValue={report.variance.signal} ariaLabel="Signal" options={[{ value: "all", label: "All signals" }, { value: "over_supplied", label: "Over-supplied" }, { value: "under_supplied", label: "Under-supplied" }, { value: "balanced", label: "Balanced" }, { value: "review_manual", label: "Review manually" }]} />
          <Button type="submit" variant="secondary">Filter</Button>
        </FilterBar>
      </div>
      <Card><CardContent className="grid grid-cols-2 gap-3 p-3 lg:grid-cols-4">{metric("Over-supply signals", quantitiesAvailable ? report.variance.summary.over_supplied : null)}{metric("Under-supply signals", quantitiesAvailable ? report.variance.summary.under_supplied : null)}{metric("High wastage", quantitiesAvailable ? report.variance.summary.high_wastage : null)}{metric("Manual review", report.variance.summary.low_confidence)}</CardContent></Card>
      {quantitiesAvailable ? <ProductionVarianceSignalChart rows={report.variance.all_rows} searchParams={filters} /> : <Card><CardContent className="p-4"><h2 className="text-sm font-semibold">Supply signals unavailable</h2><p className="mt-1 text-sm text-muted-foreground">{DAILY_UNIT_UNAVAILABLE} Product-outlet rows with unverified units require manual review.</p></CardContent></Card>}
      <section className="sb-list-content-card overflow-hidden"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Outlet demand variance</h2><p className="text-xs text-muted-foreground">Over-supply signals use high leftover (20%+) or wastage (10%+). Under-supply is a low-leftover movement signal, not a production shortfall.</p></div>
        <Table mobileHidden aria-label="Production versus outlet demand variance"><TableHeader><TableRow><TableHead>Product / outlet</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Movement</TableHead><TableHead className="text-right">Leftover</TableHead><TableHead className="text-right">Wastage</TableHead><TableHead>Variance signal</TableHead><TableHead>Confidence</TableHead></TableRow></TableHeader><TableBody>{report.variance.rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.product_name}</p><p className="text-xs text-muted-foreground">{row.branch_name} · {row.completed_records} completed record(s)</p></TableCell><TableCell className="text-right">{quantity(row, row.received)}</TableCell><TableCell className="text-right">{quantity(row, row.movement)}</TableCell><TableCell className="text-right">{quantity(row, row.leftover)} ({rate(row, row.leftover_percent)})</TableCell><TableCell className="text-right">{quantity(row, row.wastage)} ({rate(row, row.wastage_percent)})</TableCell><TableCell>{signalBadge(row.quantity_totals_available === true && row.quantity_unit ? row.variance_signal : "review_manual")}</TableCell><TableCell>{row.low_sample ? "Low sample" : report.coverage.confidence}</TableCell></TableRow>)}{!report.variance.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No reliable variance data" description="Complete Outlet Daily Records before using demand variance signals." /></TableCell></TableRow> : null}</TableBody></Table>
        <div className="divide-y xl:hidden" data-production-variance-list>{report.variance.rows.map((row) => <div key={row.id} className="space-y-3 p-3"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-medium">{row.product_name}</p><p className="text-xs text-muted-foreground">{row.branch_name} · {row.completed_records} completed record(s)</p></div>{signalBadge(row.quantity_totals_available === true && row.quantity_unit ? row.variance_signal : "review_manual")}</div><div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs"><p className="text-muted-foreground">Received <strong className="block text-sm text-foreground">{quantity(row, row.received)}</strong></p><p className="text-muted-foreground">Movement <strong className="block text-sm text-foreground">{quantity(row, row.movement)}</strong></p><p className="text-muted-foreground">Leftover <strong className="block text-sm text-foreground">{quantity(row, row.leftover)} ({rate(row, row.leftover_percent)})</strong></p><p className="text-muted-foreground">Wastage <strong className="block text-sm text-foreground">{quantity(row, row.wastage)} ({rate(row, row.wastage_percent)})</strong></p><p className="col-span-2 text-muted-foreground">Confidence <strong className="block text-sm text-foreground">{row.low_sample ? "Low sample" : report.coverage.confidence}</strong></p></div></div>)}{!report.variance.rows.length ? <EmptyState title="No reliable variance data" description="Complete Outlet Daily Records before using demand variance signals." /> : null}</div>
      </section>
    </WorkspaceGrid>
  </>;
}
