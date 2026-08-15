import Link from "next/link";
import { ConsoleSection } from "@/components/layout/right-console";
import { ProcurementVarianceCharts } from "@/components/reports/procurement-variance-charts";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { MetricStrip } from "@/components/ui/metric-strip";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getProcurementVariance } from "@/server/queries/procurement-variance";

export const dynamic = "force-dynamic";

const variants = { Matched: "success", "Price variance": "warning", "Quantity variance": "warning", "Missing invoice": "danger", "Missing GRN": "danger", "Not linked": "secondary", "Review manually": "secondary" } as const;

type VarianceRow = Awaited<ReturnType<typeof getProcurementVariance>>[number];

function varianceSignal(row: VarianceRow) {
  if (row.price_variance_amount != null && row.status === "Price variance") return `${formatCurrency(row.price_variance_amount)} · ${((row.price_variance_percent ?? 0) * 100).toFixed(1)}%`;
  if (row.quantity_variance != null && row.status === "Quantity variance") return `${formatNumber(row.quantity_variance)} qty`;
  if (row.status === "Matched") return "No variance";
  return "Action required";
}

function ProcurementStageComparison({ row }: { row: VarianceRow }) {
  const stages = [
    { label: "PO", document: row.po_no, quantity: formatNumber(row.ordered_qty), price: formatCurrency(row.po_unit_price) },
    { label: "GRN", document: row.grn_no ?? "Missing", quantity: row.received_qty == null ? "—" : formatNumber(row.received_qty), price: row.grn_unit_price == null ? "—" : formatCurrency(row.grn_unit_price) },
    { label: "Invoice", document: row.invoice_no ?? "Missing", quantity: row.invoiced_qty == null ? "—" : formatNumber(row.invoiced_qty), price: row.invoice_unit_price == null ? "—" : formatCurrency(row.invoice_unit_price) },
  ];
  return <div className="space-y-2" data-procurement-stage-comparison>
    <div className="grid grid-cols-3 divide-x divide-[var(--sb-border-soft)] rounded-[var(--sb-radius-control)] border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)]">
      {stages.map((stage) => <div key={stage.label} className="min-w-0 px-2 py-1.5">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-soft)]">{stage.label}</span>
        <strong className="mt-0.5 block truncate text-[11px] text-[var(--sb-text)]" title={stage.document}>{stage.document}</strong>
        <span className="mt-1 block tabular-nums">Qty {stage.quantity}</span>
        <span className="block tabular-nums">Price {stage.price}</span>
      </div>)}
    </div>
    <p>Supplier reference: {row.reference_supplier_price == null ? "Unavailable" : formatCurrency(row.reference_supplier_price)} · Compared {formatDateOnly(row.comparison_date)}</p>
  </div>;
}

export default async function ProcurementVariancePage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams; const rows = await getProcurementVariance(filters).catch(() => null);
  const count = (status: string) => rows?.filter((row) => row.status === status).length ?? 0;
  return <><PageHeader title="Procurement Variance" description="Read-only comparison of linked purchase, receiving, invoice, and supplier reference records." />
    <WorkspaceGrid hideMobileConsole rightRail={<><ConsoleSection title="Review paths"><div className="grid gap-2"><Button asChild size="sm" variant="outline"><Link href="/purchase-orders">Purchase Orders</Link></Button><Button asChild size="sm" variant="outline"><Link href="/goods-receivings">Goods Receiving</Link></Button><Button asChild size="sm" variant="outline"><Link href="/supplier-invoices">Supplier Invoices</Link></Button></div></ConsoleSection><ConsoleSection title="Comparison rules"><div className="space-y-2 text-xs text-muted-foreground"><p>Read-only comparison of records joined by existing document-line links only. Unlinked records are never guessed.</p><p>Price warnings are more than RM 0.01 or 2%. Any quantity difference is a warning where no document tolerance exists.</p><p>Thresholds are warnings, not automatic claims. No PO, GRN, invoice, supplier price, or stock record is changed.</p></div></ConsoleSection></>} tabletRailMode="split" tabletRailBreakpoint="md">
      {!rows ? <Card><CardContent className="p-5"><EmptyState title="Procurement variance is unavailable" description="Try again shortly. No procurement data was changed." /></CardContent></Card> : <div className="space-y-4"><MetricStrip className="grid-cols-2 sm:grid-cols-3" items={[{ label: "Matched", value: count("Matched") }, { label: "Price variance", value: count("Price variance") }, { label: "Quantity variance", value: count("Quantity variance") }, { label: "Missing invoice / GRN", value: count("Missing invoice") + count("Missing GRN") }, { label: "Review manually", value: count("Review manually") + count("Not linked") }]} /><ProcurementVarianceCharts rows={rows} /><div className="space-y-3" data-procurement-variance-workspace><FilterBar resultCount={rows.length} resetHref="/reports/procurement-variance" filtered={hasActiveFilters(filters)}><Input name="search" defaultValue={filters.search} placeholder="Search PO, supplier, or item" aria-label="Search PO, supplier, or item" /><SelectNative name="status" defaultValue={filters.status ?? "all"}><option value="all">All statuses</option>{Object.keys(variants).map((status) => <option key={status} value={status.toLowerCase().replaceAll(" ", "_")}>{status}</option>)}</SelectNative><FilterBarMore activeCount={[filters.date_from, filters.date_to].filter(Boolean).length} resetHref="/reports/procurement-variance"><Input name="date_from" type="date" defaultValue={filters.date_from} aria-label="Date from" /><Input name="date_to" type="date" defaultValue={filters.date_to} aria-label="Date to" /></FilterBarMore><Button type="submit" variant="secondary">Filter</Button></FilterBar><section className="sb-list-content-card overflow-hidden"><Table mobileHidden aria-label="Procurement cost variance"><TableHeader><TableRow><TableHead>Item / supplier</TableHead><TableHead>PO</TableHead><TableHead>GRN</TableHead><TableHead>Invoice</TableHead><TableHead className="text-right">Ordered / received / invoiced</TableHead><TableHead className="text-right">PO / GRN / invoice price</TableHead><TableHead className="text-right">Reference price</TableHead><TableHead className="text-right">Price variance</TableHead><TableHead className="text-right">Qty variance</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.map((row) => <TableRow key={row.id}><TableCell><p className="font-medium">{row.item_code}</p><p className="text-xs text-muted-foreground">{row.item_name} · {row.supplier}</p></TableCell><TableCell>{row.po_no}</TableCell><TableCell>{row.grn_no ?? "—"}</TableCell><TableCell>{row.invoice_no ?? "—"}</TableCell><TableCell className="text-right">{formatNumber(row.ordered_qty)} / {row.received_qty == null ? "—" : formatNumber(row.received_qty)} / {row.invoiced_qty == null ? "—" : formatNumber(row.invoiced_qty)}</TableCell><TableCell className="text-right">{formatCurrency(row.po_unit_price)} / {row.grn_unit_price == null ? "—" : formatCurrency(row.grn_unit_price)} / {row.invoice_unit_price == null ? "—" : formatCurrency(row.invoice_unit_price)}</TableCell><TableCell className="text-right">{row.reference_supplier_price == null ? "Unavailable" : formatCurrency(row.reference_supplier_price)}</TableCell><TableCell className="text-right">{row.price_variance_amount == null ? "—" : `${formatCurrency(row.price_variance_amount)} (${((row.price_variance_percent ?? 0) * 100).toFixed(1)}%)`}</TableCell><TableCell className="text-right">{row.quantity_variance == null ? "—" : formatNumber(row.quantity_variance)}</TableCell><TableCell><Badge variant={variants[row.status]}>{row.status}</Badge></TableCell></TableRow>)}{!rows.length ? <TableRow><TableCell colSpan={10}><EmptyState title="No comparable procurement lines" description="Only existing PO, GRN, invoice, and supplier-item links are compared. No matches are inferred." /></TableCell></TableRow> : null}</TableBody></Table><OperationalList ariaLabel="Procurement cost variance">{rows.map((row) => <OperationalListRow key={row.id} label={`${row.item_name}, ${row.status}, ${varianceSignal(row)}`} primary={row.item_name} status={<Badge variant={variants[row.status]}>{row.status}</Badge>} statusMeta={varianceSignal(row)} secondary={<>{row.item_code} · {row.supplier}</>} meta={formatDateOnly(row.comparison_date)} detail={<ProcurementStageComparison row={row} />} />)}{!rows.length ? <EmptyState title="No comparable procurement lines" description="Only existing PO, GRN, invoice, and supplier-item links are compared. No matches are inferred." /> : null}</OperationalList></section></div></div>}
    </WorkspaceGrid></>;
}
