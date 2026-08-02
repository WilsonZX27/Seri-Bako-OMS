import Link from "next/link";
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

        <section className="overflow-hidden border bg-card">
          <div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Top Suppliers in Selected Period</h2></div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Supplier</TableHead><TableHead className="text-right">Invoices</TableHead><TableHead className="text-right">Upcoming Amount</TableHead></TableRow></TableHeader><TableBody>
            {forecast.top_suppliers.map((supplier) => <TableRow key={supplier.supplier_id}><TableCell><Link href={`/supplier-invoices/aging?supplier=${supplier.supplier_id}`} className="font-medium hover:underline">{supplier.supplier_name}</Link></TableCell><TableCell className="text-right">{supplier.invoice_count}</TableCell><TableCell className="text-right font-semibold">{formatCurrency(supplier.amount)}</TableCell></TableRow>)}
            {!forecast.top_suppliers.length ? <TableRow><TableCell colSpan={3}><EmptyState title="No upcoming supplier payments" description="Choose a longer period or review overdue and missing-due-date invoices below." /></TableCell></TableRow> : null}
          </TableBody></Table></div>
        </section>

        <section className="overflow-hidden border bg-card">
          <div className="border-b px-3 py-2"><h2 className="text-sm font-semibold">Invoice Forecast Detail</h2><p className="text-xs text-muted-foreground">Overdue, selected-period and missing-due-date obligations.</p></div>
          <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Supplier Ref.</TableHead><TableHead>Supplier</TableHead><TableHead>Due Date</TableHead><TableHead>Forecast State</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Paid</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader><TableBody>
            {forecast.rows.map((row) => <TableRow key={row.id}><TableCell><Link href={`/supplier-invoices/${row.id}`}><DocumentNumber value={row.invoice_no} size="sm" /></Link></TableCell><TableCell>{row.supplier_invoice_no}</TableCell><TableCell>{row.supplier_name}</TableCell><TableCell className="whitespace-nowrap">{date(row.due_date)}</TableCell><TableCell className="whitespace-nowrap text-xs font-medium">{stateLabels[row.forecast_state]}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.original_total)}</TableCell><TableCell className="whitespace-nowrap text-right">{formatCurrency(row.amount_paid)}</TableCell><TableCell className="whitespace-nowrap text-right font-semibold">{formatCurrency(row.outstanding)}</TableCell></TableRow>)}
            {!forecast.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title="No payable pressure in this period" description="Open or Partially Paid invoices will appear when they are overdue, due in the selected period, or missing a due date." /></TableCell></TableRow> : null}
          </TableBody></Table></div>
          <PaginationControls page={forecast.page} totalPages={totalPages} totalRows={forecast.total_rows} searchParams={{ period: forecast.period }} />
        </section>
      </div>
    </WorkspaceGrid>
  </>;
}
