import Link from "next/link";
import { AgingDistributionBars } from "@/components/reports/aging-distribution-bars";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls } from "@/components/sortable-table";
import { DocumentNumber } from "@/components/document-number";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { getApAgingReport } from "@/server/queries/ap-aging";

export const dynamic = "force-dynamic";

const bucketLabels: Record<string, string> = {
  not_due: "Not Due", due_today: "Due Today", overdue_1_30: "1–30 Days Overdue",
  overdue_31_60: "31–60 Days Overdue", overdue_61_90: "61–90 Days Overdue",
  overdue_90_plus: "90+ Days Overdue", missing_due_date: "Missing Due Date",
};

const dates = (value: string | null) => value ? formatDateOnly(value, "Missing") : "Missing";
const shiftDate = (value: string, days: number) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };

export default async function ApAgingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getApAgingReport(filters);
  const totalPages = Math.max(1, Math.ceil(report.total_rows / report.page_size));
  const activeFilterCount = [filters.search, filters.supplier && filters.supplier !== "all" ? filters.supplier : undefined, filters.bucket && filters.bucket !== "all" ? filters.bucket : undefined, filters.status && filters.status !== "all" ? filters.status : undefined, filters.due_from, filters.due_to, filters.overdue === "1" ? filters.overdue : undefined].filter(Boolean).length;
  const dueSoonHref = `?due_from=${shiftDate(report.report_date, 1)}&due_to=${shiftDate(report.report_date, 7)}`;
  const exportQuery = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => !!entry[1] && entry[0] !== "page")).toString();
  const bucketHref = (bucket: string) => {
    const params = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1])));
    params.set("bucket", bucket);
    params.delete("page");
    return `?${params.toString()}`;
  };
  const agingDistribution = Object.entries(bucketLabels).map(([key, label]) => ({
    key,
    label,
    outstanding: report.buckets[key]?.outstanding ?? 0,
    invoiceCount: report.buckets[key]?.invoice_count ?? 0,
    href: bucketHref(key),
  }));
  const metric = (label: string, value: number | string, href?: string) => <Link href={href ?? "#aging-table"} className="flex min-h-[4.25rem] min-w-0 flex-col justify-between rounded-[var(--sb-radius-control)] border bg-white px-3 py-2 hover:border-[var(--sb-amber-300)]"><span className="text-[11px] leading-4 text-muted-foreground">{label}</span><strong className="tabular-nums">{typeof value === "number" ? formatCurrency(value) : value}</strong></Link>;
  return <>
    <PageHeader title="AP Aging" description={`Open supplier payables as of ${dates(report.report_date)}.`} />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Payables Context"><div className="space-y-2 text-xs"><p><span className="text-muted-foreground">As of</span><br /><strong>{dates(report.report_date)}</strong></p><p><span className="text-muted-foreground">Oldest overdue</span><br /><strong>{report.summary.oldest_overdue_invoice ?? "None"}</strong></p><p><span className="text-muted-foreground">Highest exposure</span><br /><strong>{report.summary.highest_exposure_supplier ?? "None"}</strong></p><Link className="inline-flex font-semibold text-[var(--sb-green-800)] hover:underline" href="?bucket=overdue_90_plus">Review 90+ day invoices</Link></div></ConsoleSection>
      <ConsoleSection title="Actions"><div className="grid gap-2"><Button asChild size="sm"><a href={`/api/export/ap-aging${exportQuery ? `?${exportQuery}` : ""}`}>Export CSV</a></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices/cash-flow">Cash Flow Forecast</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices">Supplier Invoices</Link></Button></div></ConsoleSection>
      <ConsoleSection title="Aging Definitions"><div className="space-y-1.5 text-xs text-muted-foreground"><p>Overdue starts one day after the due date. Prioritize missing due dates, then 91+ days, overdue, due today, and due within 7 days.</p><p>Scope: Open or Partially Paid invoices with a positive MYR balance.</p></div></ConsoleSection>
    </>}>
      <div className="space-y-3">
        <div className="flex gap-2 md:hidden" aria-label="AP aging actions">
          <Button asChild size="sm" className="flex-1"><a href={`/api/export/ap-aging${exportQuery ? `?${exportQuery}` : ""}`}>Export CSV</a></Button>
          <Button asChild size="sm" variant="outline" className="flex-1"><Link href="/supplier-invoices/cash-flow">Cash flow</Link></Button>
        </div>
        <section className="grid grid-cols-2 gap-2 md:hidden" aria-label="Payables snapshot">
          {metric("Outstanding", report.summary.total_outstanding)}
          {metric("Overdue", report.summary.total_overdue, "?overdue=1")}
          {metric("Due today", report.summary.due_today, "?bucket=due_today")}
          {metric("Next 7 days", report.summary.due_next_7_days, dueSoonHref)}
        </section>
        <div className="grid items-start gap-3 md:grid-cols-2 md:[&>*]:self-start">
        <AgingDistributionBars items={agingDistribution} reportDate={dates(report.report_date)} />

        <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Supplier Exposure</h2></div><Table mobileHidden aria-label="Supplier payable exposure"><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Overdue</TableHead><TableHead>Oldest Due</TableHead><TableHead className="text-right">Max Days</TableHead></TableRow></TableHeader><TableBody>{report.suppliers.map((row) => <TableRow key={row.supplier_id}><TableCell><Link href={`?supplier=${row.supplier_id}`} className="font-medium hover:underline">{row.supplier_name}</Link></TableCell><TableCell className="text-right">{row.invoice_count}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.total_outstanding)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.overdue_outstanding ?? 0)}</TableCell><TableCell>{dates(row.oldest_due_date)}</TableCell><TableCell className="text-right">{row.maximum_days_overdue}</TableCell></TableRow>)}</TableBody></Table><div className="divide-y xl:hidden" role="list" aria-label="Supplier payable exposure" data-ap-aging-supplier-list>{report.suppliers.map((row) => <Link key={row.supplier_id} href={`?supplier=${row.supplier_id}`} className="block space-y-3 px-3 py-4 first:pt-3 last:pb-3" role="listitem"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-medium leading-snug">{row.supplier_name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{row.invoice_count} open invoice{row.invoice_count === 1 ? "" : "s"}</p></div><strong className="shrink-0 tabular-nums">{formatCurrency(row.total_outstanding)}</strong></div><dl className="grid grid-cols-3 gap-3 text-xs"><div><dt className="text-muted-foreground">Overdue</dt><dd className="mt-1 font-medium text-[var(--sb-warning)]">{formatCurrency(row.overdue_outstanding ?? 0)}</dd></div><div><dt className="text-muted-foreground">Oldest due</dt><dd className="mt-1 font-medium">{dates(row.oldest_due_date)}</dd></div><div><dt className="text-muted-foreground">Max overdue</dt><dd className="mt-1 font-medium">{row.maximum_days_overdue > 0 ? `${row.maximum_days_overdue} days` : "None"}</dd></div></dl></Link>)}{!report.suppliers.length ? <EmptyState title="No supplier exposure" description="Suppliers with open positive payables appear here." /> : null}</div></section>

        </div>

        <div className="space-y-3">
        <section id="aging-table" className="space-y-3">
          <FilterBar resultCount={report.total_rows} resetHref="/supplier-invoices/aging" filtered={activeFilterCount > 0} activeCount={activeFilterCount} className="sb-list-filters--balanced">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search invoice, reference, or supplier" aria-label="Search invoices" />
            <SelectNative name="supplier" defaultValue={filters.supplier ?? "all"} aria-label="Supplier"><option value="all">All suppliers</option>{report.suppliers.map((row) => <option key={row.supplier_id} value={row.supplier_id}>{row.supplier_name}</option>)}</SelectNative>
            <SelectNative name="bucket" defaultValue={filters.bucket ?? "all"} aria-label="Aging bucket"><option value="all">All aging buckets</option>{Object.entries(bucketLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectNative>
            <FilterBarMore activeCount={activeFilterCount} resetHref="/supplier-invoices/aging">
              <SelectNative name="status" defaultValue={filters.status ?? "all"} aria-label="Invoice status"><option value="all">All open statuses</option><option value="open">Open</option><option value="partially_paid">Partially Paid</option></SelectNative>
              <Input name="due_from" type="date" defaultValue={filters.due_from ?? ""} aria-label="Due date from" />
              <Input name="due_to" type="date" defaultValue={filters.due_to ?? ""} aria-label="Due date to" />
              <label className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" name="overdue" value="1" defaultChecked={filters.overdue === "1"} /> Overdue only</label>
            </FilterBarMore>
            <Button type="submit" variant="secondary">Filter</Button>
          </FilterBar>
          <div className="sb-list-content-card overflow-hidden" data-ap-aging-content>
          <Table mobileHidden aria-label="AP aging invoice detail"><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Supplier Ref.</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice Date</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Days Overdue</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Bucket</TableHead><TableHead>Alert</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{report.rows.map((row) => <TableRow key={row.id}><TableCell><Link href={`/supplier-invoices/${row.id}`}><DocumentNumber value={row.invoice_no} size="sm" /></Link></TableCell><TableCell>{row.supplier_invoice_no}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell>{dates(row.invoice_date)}</TableCell><TableCell className="whitespace-nowrap">{dates(row.due_date)}</TableCell><TableCell className="whitespace-nowrap text-right">{row.days_overdue > 0 ? `${row.days_overdue} days overdue` : "0"}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.original_total)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.amount_paid)}</TableCell><TableCell className="whitespace-nowrap text-right font-semibold">{formatCurrency(row.outstanding)}</TableCell><TableCell className="whitespace-nowrap">{bucketLabels[row.aging_bucket]}</TableCell><TableCell className="whitespace-nowrap text-xs font-medium">{row.alert_severity === "due_soon" ? `${row.days_until_due} days until due` : row.alert_label ?? "No immediate alert"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}{!report.rows.length ? <TableRow><TableCell colSpan={12}><EmptyState title="No open payables match these filters" description="Open and partially paid invoices with positive balances appear here." /></TableCell></TableRow> : null}</TableBody></Table>
          <div className="divide-y xl:hidden" role="list" aria-label="AP aging invoice detail" data-ap-aging-invoice-list>{report.rows.map((row) => { const alert = row.alert_severity === "due_soon" ? `${row.days_until_due} days until due` : row.alert_label ?? "No immediate alert"; return <Link key={row.id} href={`/supplier-invoices/${row.id}`} className="block space-y-3 px-3 py-4" role="listitem"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><DocumentNumber value={row.invoice_no} size="sm" /><p className="mt-1 truncate text-xs text-muted-foreground">{row.supplier_name} · Ref {row.supplier_invoice_no}</p></div><div className="shrink-0 text-right"><strong className="tabular-nums">{formatCurrency(row.outstanding)}</strong><div className="mt-1"><StatusBadge status={row.status} /></div></div></div><div className={`rounded-md border px-3 py-2 text-xs ${row.alert_severity ? "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-secondary/25 text-muted-foreground"}`}><strong>{alert}</strong><span className="ml-1">· {bucketLabels[row.aging_bucket]}</span></div><dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs sm:grid-cols-4"><div><dt className="text-muted-foreground">Due date</dt><dd className="mt-1 font-medium">{dates(row.due_date)}</dd></div><div><dt className="text-muted-foreground">Invoice date</dt><dd className="mt-1 font-medium">{dates(row.invoice_date)}</dd></div><div><dt className="text-muted-foreground">Original</dt><dd className="mt-1 font-medium">{formatCurrency(row.original_total)}</dd></div><div><dt className="text-muted-foreground">Paid</dt><dd className="mt-1 font-medium">{formatCurrency(row.amount_paid)}</dd></div></dl></Link>; })}{!report.rows.length ? <EmptyState title="No open payables match these filters" description="Open and partially paid invoices with positive balances appear here." /> : null}</div>
          <PaginationControls page={report.page} totalPages={totalPages} totalRows={report.total_rows} searchParams={filters} />
          </div>
        </section>
      </div>
      </div>
    </WorkspaceGrid>
  </>;
}
