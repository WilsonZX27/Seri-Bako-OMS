import Link from "next/link";
import { AgingDistributionBars } from "@/components/reports/aging-distribution-bars";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { DocumentNumber } from "@/components/document-number";
import { PaginationControls } from "@/components/sortable-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { getCashFlowForecast } from "@/server/queries/ap-aging";

const periodLabels = { "7": "7 Days", "14": "14 Days", "30": "30 Days", month: "Current Month" } as const;
const stateLabels = { overdue: "Overdue", due_today: "Due Today", upcoming: "Upcoming", missing_due_date: "Missing Due Date" } as const;
const date = (value: string | null) => value ? formatDateOnly(value, "Missing") : "Missing";

export default async function CashFlowForecastPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const forecast = await getCashFlowForecast(filters.period, filters.page);
  const totalPages = Math.max(1, Math.ceil(forecast.total_rows / forecast.page_size));
  const windowLabels = {
    overdue: "Overdue brought forward",
    due_today: "Due today",
    due_1_7: "Due in 1–7 days",
    due_8_14: "Due in 8–14 days",
    due_15_period_end: `Due in 15+ days through ${date(forecast.period_end)}`,
    missing_due_date: "Missing due date",
  } as const;
  const windowHref = (key: (typeof forecast.windows)[number]["key"]) => {
    if (key === "overdue") return "/supplier-invoices/aging?overdue=1";
    if (key === "due_today") return "/supplier-invoices/aging?bucket=due_today";
    if (key === "missing_due_date") return "/supplier-invoices/aging?bucket=missing_due_date";
    const startOffset = key === "due_1_7" ? 1 : key === "due_8_14" ? 8 : 15;
    const endOffset = key === "due_1_7" ? 7 : key === "due_8_14" ? 14 : null;
    const start = new Date(`${forecast.report_date}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() + startOffset);
    const dueFrom = start.toISOString().slice(0, 10);
    const dueTo = endOffset === null ? forecast.period_end : (() => { const end = new Date(`${forecast.report_date}T00:00:00Z`); end.setUTCDate(end.getUTCDate() + endOffset); return end.toISOString().slice(0, 10); })();
    return `/supplier-invoices/aging?due_from=${dueFrom}&due_to=${dueTo}`;
  };
  const dueWindowDistribution = forecast.windows
    .filter((window) => window.key !== "due_8_14" || forecast.period !== "7")
    .filter((window) => window.key !== "due_15_period_end" || forecast.period === "30" || forecast.period === "month")
    .map((window) => ({ key: window.key, label: windowLabels[window.key], outstanding: window.amount, invoiceCount: window.invoice_count, href: windowHref(window.key) }));
  const metric = (label: string, value: number) => <div className="border bg-white px-3 py-2"><span className="block text-[11px] text-muted-foreground">{label}</span><strong className="tabular-nums">{formatCurrency(value)}</strong></div>;

  return <>
    <PageHeader title="Cash Flow Forecast" description={`Upcoming supplier payables as of ${date(forecast.report_date)}.`} />
    <WorkspaceGrid hideMobileConsole rightRail={<>
      <ConsoleSection title="Actions"><div className="grid gap-2"><Button asChild size="sm"><Link href="/supplier-invoices/aging">Open AP Aging</Link></Button><Button asChild variant="outline" size="sm"><Link href="/supplier-invoices">Supplier Invoices</Link></Button></div></ConsoleSection>
      <ConsoleSection title="Forecast Assumptions"><div className="space-y-2 text-xs text-muted-foreground"><p>Based on approved Open and Partially Paid supplier invoices with a positive outstanding balance.</p><p>Draft, Void and Paid invoices are excluded. Missing due dates are shown separately.</p><p>Amounts are MYR only under the current schema. This is a payables forecast, not a bank or cash-in forecast.</p></div></ConsoleSection>
      <ConsoleSection title="Period"><div className="text-xs"><p className="flex justify-between"><span className="text-muted-foreground">Selected</span><strong>{periodLabels[forecast.period]}</strong></p><p className="mt-2 flex justify-between"><span className="text-muted-foreground">Through</span><strong>{date(forecast.period_end)}</strong></p><p className="mt-2 text-muted-foreground">This week covers today through seven days ahead; next week covers days eight through fourteen.</p></div></ConsoleSection>
    </>}>
      <div className="space-y-4 py-4">
        <nav aria-label="Forecast period" className="flex gap-2 overflow-x-auto border bg-card p-2">
          {Object.entries(periodLabels).map(([value, label]) => <Button key={value} asChild size="sm" variant={forecast.period === value ? "default" : "outline"}><Link href={`?period=${value}`}>{label}</Link></Button>)}
        </nav>

        <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {metric(`Due in ${periodLabels[forecast.period]}`, forecast.total_due_in_period)}
          {metric("Overdue Brought Forward", forecast.overdue_brought_forward)}
          {metric("Due Today", forecast.due_today)}
          {metric("Due This Week", forecast.due_this_week)}
          {metric("Due Next Week", forecast.due_next_week)}
          {metric("Missing Due Date Exposure", forecast.missing_due_date_exposure)}
        </section>

        <AgingDistributionBars
          items={dueWindowDistribution}
          reportDate={date(forecast.report_date)}
          title="Payable pressure by due window"
          description={`Open MYR balances through ${date(forecast.period_end)}. Windows are mutually exclusive; missing due dates remain outside the forecast period.`}
          ariaLabel="Cash flow due-window distribution"
        />

        <section className="overflow-hidden border bg-card">
          <div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Top Suppliers in Selected Period</h2></div>
          <Table mobileHidden aria-label="Top suppliers by upcoming payable"><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Upcoming Amount</TableHead></TableRow></TableHeader><TableBody>
            {forecast.top_suppliers.map((supplier) => <TableRow key={supplier.supplier_id}><TableCell><Link href={`/supplier-invoices/aging?supplier=${supplier.supplier_id}`} className="font-medium hover:underline">{supplier.supplier_name}</Link></TableCell><TableCell className="text-right">{supplier.invoice_count}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(supplier.amount)}</TableCell></TableRow>)}
            {!forecast.top_suppliers.length ? <TableRow><TableCell colSpan={3}><EmptyState title="No upcoming supplier payments" description="Choose a longer period or review overdue and missing-due-date invoices below." /></TableCell></TableRow> : null}
          </TableBody></Table><div className="divide-y xl:hidden" role="list" aria-label="Top suppliers by upcoming payable" data-cash-flow-supplier-list>{forecast.top_suppliers.map((supplier) => <Link key={supplier.supplier_id} href={`/supplier-invoices/aging?supplier=${supplier.supplier_id}`} className="flex items-start justify-between gap-4 px-3 py-4" role="listitem"><div className="min-w-0"><h3 className="font-medium leading-snug">{supplier.supplier_name}</h3><p className="mt-1 text-xs text-muted-foreground">{supplier.invoice_count} invoice{supplier.invoice_count === 1 ? "" : "s"} in selected period</p></div><strong className="shrink-0 tabular-nums">{formatCurrency(supplier.amount)}</strong></Link>)}{!forecast.top_suppliers.length ? <EmptyState title="No upcoming supplier payments" description="Choose a longer period or review overdue and missing-due-date invoices below." /> : null}</div>
        </section>

        <section className="overflow-hidden border bg-card">
          <div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Invoice Forecast Detail</h2><p className="text-xs text-muted-foreground">Overdue, selected-period and missing-due-date obligations.</p></div>
          <Table mobileHidden aria-label="Cash flow invoice forecast detail"><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Supplier Ref.</TableHead><TableHead>Supplier</TableHead><TableHead>Due Date</TableHead><TableHead>Forecast State</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader><TableBody>
            {forecast.rows.map((row) => <TableRow key={row.id}><TableCell><Link href={`/supplier-invoices/${row.id}`}><DocumentNumber value={row.invoice_no} size="sm" /></Link></TableCell><TableCell>{row.supplier_invoice_no}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell className="whitespace-nowrap">{date(row.due_date)}</TableCell><TableCell className="whitespace-nowrap text-xs font-medium">{stateLabels[row.forecast_state]}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.original_total)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.amount_paid)}</TableCell><TableCell className="whitespace-nowrap text-right font-semibold">{formatCurrency(row.outstanding)}</TableCell></TableRow>)}
            {!forecast.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title="No payable pressure in this period" description="Open or Partially Paid invoices will appear when they are overdue, due in the selected period, or missing a due date." /></TableCell></TableRow> : null}
          </TableBody></Table><div className="divide-y xl:hidden" role="list" aria-label="Cash flow invoice forecast detail" data-cash-flow-invoice-list>{forecast.rows.map((row) => <Link key={row.id} href={`/supplier-invoices/${row.id}`} className="block space-y-3 px-3 py-4" role="listitem"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><DocumentNumber value={row.invoice_no} size="sm" /><p className="mt-1 truncate text-xs text-muted-foreground">{row.supplier_name} · Ref {row.supplier_invoice_no}</p></div><div className="shrink-0 text-right"><strong className="tabular-nums">{formatCurrency(row.outstanding)}</strong><div className="mt-1"><StatusBadge status={row.status} /></div></div></div><div className={`rounded-md border px-3 py-2 text-xs font-medium ${row.forecast_state === "overdue" || row.forecast_state === "missing_due_date" ? "border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] text-[var(--sb-warning)]" : "bg-secondary/25"}`}>{stateLabels[row.forecast_state]} · Due {date(row.due_date)}</div><dl className="grid grid-cols-2 gap-4 text-xs"><div><dt className="text-muted-foreground">Original</dt><dd className="mt-1 font-medium">{formatCurrency(row.original_total)}</dd></div><div><dt className="text-muted-foreground">Paid</dt><dd className="mt-1 font-medium">{formatCurrency(row.amount_paid)}</dd></div></dl></Link>)}{!forecast.rows.length ? <EmptyState title="No payable pressure in this period" description="Open or Partially Paid invoices will appear when they are overdue, due in the selected period, or missing a due date." /> : null}</div>
          <PaginationControls page={forecast.page} totalPages={totalPages} totalRows={forecast.total_rows} searchParams={{ period: forecast.period }} />
        </section>
      </div>
    </WorkspaceGrid>
  </>;
}
