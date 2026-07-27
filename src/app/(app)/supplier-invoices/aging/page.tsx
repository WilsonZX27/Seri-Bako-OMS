import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { PaginationControls } from "@/components/sortable-table";
import { DocumentNumber } from "@/components/document-number";
import { formatCurrency } from "@/lib/utils";
import { getApAgingReport } from "@/server/queries/ap-aging";

const bucketLabels: Record<string, string> = {
  not_due: "Not Due", due_today: "Due Today", overdue_1_30: "1–30 Days Overdue",
  overdue_31_60: "31–60 Days Overdue", overdue_61_90: "61–90 Days Overdue",
  overdue_90_plus: "90+ Days Overdue", missing_due_date: "Missing Due Date",
};

const dates = (value: string | null) => value ? new Intl.DateTimeFormat("en-MY", { dateStyle: "medium", timeZone: "Asia/Kuala_Lumpur" }).format(new Date(`${value}T00:00:00+08:00`)) : "Missing";
const shiftDate = (value: string, days: number) => { const date = new Date(`${value}T00:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10); };

export default async function ApAgingPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const report = await getApAgingReport(filters);
  const totalPages = Math.max(1, Math.ceil(report.total_rows / report.page_size));
  const dueSoonHref = `?due_from=${shiftDate(report.report_date, 1)}&due_to=${shiftDate(report.report_date, 7)}`;
  const exportQuery = new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => !!entry[1] && entry[0] !== "page")).toString();
  const metric = (label: string, value: number | string, href?: string) => <Link href={href ?? "#aging-table"} className="border bg-white px-3 py-2 hover:border-[var(--sb-amber-300)]"><span className="block text-[11px] text-muted-foreground">{label}</span><strong className="tabular-nums">{typeof value === "number" ? formatCurrency(value) : value}</strong></Link>;
  return <>
    <PageHeader title="AP Aging" description={`Open supplier payables as of ${dates(report.report_date)}.`} />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Payables Context"><div className="space-y-2 text-xs"><p><span className="text-muted-foreground">As of</span><br /><strong>{dates(report.report_date)}</strong></p><p className="flex justify-between"><span>Total outstanding</span><strong>{formatCurrency(report.summary.total_outstanding)}</strong></p><p className="flex justify-between"><span>Total overdue</span><strong>{formatCurrency(report.summary.total_overdue)}</strong></p><p className="flex justify-between"><span>Due next 7 days</span><strong>{formatCurrency(report.summary.due_next_7_days)}</strong></p><p><span className="text-muted-foreground">Oldest overdue</span><br /><strong>{report.summary.oldest_overdue_invoice ?? "None"}</strong></p><p><span className="text-muted-foreground">Highest exposure</span><br /><strong>{report.summary.highest_exposure_supplier ?? "None"}</strong></p></div></ConsoleSection>
      <ConsoleSection title="Actions"><div className="grid gap-2"><Button asChild size="sm"><a href={`/api/export/ap-aging${exportQuery ? `?${exportQuery}` : ""}`}>Export CSV</a></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices/cash-flow">Cash Flow Forecast</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices">Supplier Invoices</Link></Button></div></ConsoleSection>
      <ConsoleSection title="Aging Definitions"><p className="text-xs text-muted-foreground">Days overdue begin the day after the due date. Missing due dates rank first for attention, followed by 91+ day critical balances, overdue invoices, due today, then due within seven days. Only Open and Partially Paid invoices with a positive MYR balance are included.</p></ConsoleSection>
    </>}>
      <div className="space-y-4 py-4">
        <div className="flex gap-2 md:hidden" aria-label="AP aging actions">
          <Button asChild size="sm" className="flex-1"><a href={`/api/export/ap-aging${exportQuery ? `?${exportQuery}` : ""}`}>Export CSV</a></Button>
          <Button asChild size="sm" variant="outline" className="flex-1"><Link href="/supplier-invoices/cash-flow">Cash flow</Link></Button>
        </div>
        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metric("Total Outstanding", report.summary.total_outstanding)}
          {metric("Total Overdue", report.summary.total_overdue, "?overdue=1")}
          {metric("Due Today", report.summary.due_today, "?bucket=due_today")}
          {metric("Due in Next 7 Days", report.summary.due_next_7_days, dueSoonHref)}
          {metric("90+ Days Overdue", report.summary.overdue_90_plus, "?bucket=overdue_90_plus")}
          {metric("Suppliers with Balance", String(report.summary.supplier_count))}
        </section>

        <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Aging Buckets</h2></div><div className="grid gap-px bg-border sm:grid-cols-2 xl:grid-cols-4">{Object.entries(bucketLabels).map(([key, label]) => <Link key={key} href={`?bucket=${key}`} className="bg-white px-3 py-2 text-xs"><span className="block text-muted-foreground">{label}</span><strong>{formatCurrency(report.buckets[key]?.outstanding ?? 0)}</strong><span className="ml-2 text-muted-foreground">{report.buckets[key]?.invoice_count ?? 0} invoices</span></Link>)}</div></section>

        <section className="overflow-hidden border bg-card"><div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Supplier Exposure</h2></div><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Overdue</TableHead><TableHead>Oldest Due</TableHead><TableHead className="text-right">Max Days</TableHead></TableRow></TableHeader><TableBody>{report.suppliers.map((row) => <TableRow key={row.supplier_id}><TableCell><Link href={`?supplier=${row.supplier_id}`} className="font-medium hover:underline">{row.supplier_name}</Link></TableCell><TableCell className="text-right">{row.invoice_count}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.total_outstanding)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.overdue_outstanding ?? 0)}</TableCell><TableCell>{dates(row.oldest_due_date)}</TableCell><TableCell className="text-right">{row.maximum_days_overdue}</TableCell></TableRow>)}</TableBody></Table></div></section>

        <section id="aging-table" className="overflow-hidden border bg-card">
          <form className="sb-list-filters">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search invoice, reference, or supplier" />
            <SelectNative name="supplier" defaultValue={filters.supplier ?? "all"}><option value="all">All suppliers</option>{report.suppliers.map((row) => <option key={row.supplier_id} value={row.supplier_id}>{row.supplier_name}</option>)}</SelectNative>
            <SelectNative name="bucket" defaultValue={filters.bucket ?? "all"}><option value="all">All aging buckets</option>{Object.entries(bucketLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</SelectNative>
            <SelectNative name="status" defaultValue={filters.status ?? "all"}><option value="all">All open statuses</option><option value="open">Open</option><option value="partially_paid">Partially Paid</option></SelectNative>
            <Input name="due_from" type="date" defaultValue={filters.due_from ?? ""} aria-label="Due date from" />
            <Input name="due_to" type="date" defaultValue={filters.due_to ?? ""} aria-label="Due date to" />
            <label className="flex items-center gap-2 text-xs"><input type="checkbox" name="overdue" value="1" defaultChecked={filters.overdue === "1"} /> Overdue only</label>
            <Button type="submit">Filter</Button><Button asChild variant="ghost"><Link href="/supplier-invoices/aging">Clear</Link></Button>
          </form>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Supplier Ref.</TableHead><TableHead>Supplier</TableHead><TableHead>Invoice Date</TableHead><TableHead>Due Date</TableHead><TableHead className="text-right">Days Overdue</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead>Bucket</TableHead><TableHead>Alert</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{report.rows.map((row) => <TableRow key={row.id}><TableCell><Link href={`/supplier-invoices/${row.id}`}><DocumentNumber value={row.invoice_no} size="sm" /></Link></TableCell><TableCell>{row.supplier_invoice_no}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell>{dates(row.invoice_date)}</TableCell><TableCell className="whitespace-nowrap">{dates(row.due_date)}</TableCell><TableCell className="whitespace-nowrap text-right">{row.days_overdue > 0 ? `${row.days_overdue} days overdue` : "0"}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.original_total)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.amount_paid)}</TableCell><TableCell className="whitespace-nowrap text-right font-semibold">{formatCurrency(row.outstanding)}</TableCell><TableCell className="whitespace-nowrap">{bucketLabels[row.aging_bucket]}</TableCell><TableCell className="whitespace-nowrap text-xs font-medium">{row.alert_severity === "due_soon" ? `${row.days_until_due} days until due` : row.alert_label ?? "No immediate alert"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell></TableRow>)}{!report.rows.length ? <TableRow><TableCell colSpan={12}><EmptyState title="No open payables match these filters" description="Open and partially paid invoices with positive balances appear here." /></TableCell></TableRow> : null}</TableBody></Table></div>
          <PaginationControls page={report.page} totalPages={totalPages} totalRows={report.total_rows} searchParams={filters} />
        </section>
      </div>
    </WorkspaceGrid>
  </>;
}
