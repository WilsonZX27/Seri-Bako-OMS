import Link from "next/link";
import { Clock3, FilePlus2, Pencil, TrendingUp } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { FilterBarMore } from "@/components/ui/filter-bar";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPermissionMap } from "@/server/auth/permissions";
import { getSupplierInvoiceFilterSuppliers, getSupplierInvoiceSummary, getSupplierInvoices } from "@/server/queries/supplier-invoices";
import { logServerError } from "@/server/observability/logger";

const statuses = ["draft", "open", "partially_paid", "paid", "void"];

export default async function SupplierInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [invoices, permissions, auxiliary] = await Promise.all([
    getSupplierInvoices(filters),
    getPermissionMap(["supplier_invoice.create", "supplier_invoice.pay"]),
    Promise.allSettled([getSupplierInvoiceSummary(), getSupplierInvoiceFilterSuppliers()]),
  ]);
  const [summaryResult, suppliersResult] = auxiliary;
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.supplierInvoices.summary" });
  if (suppliersResult.status === "rejected") logServerError(suppliersResult.reason, { source: "page.supplierInvoices.supplierFilter" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const suppliers = suppliersResult.status === "fulfilled" ? suppliersResult.value : null;
  const filtered = hasActiveFilters(filters);
  const hasMobileAction = permissions["supplier_invoice.create"] || permissions["supplier_invoice.pay"];
  return (
    <>
      <PageHeader title="Supplier Invoices" description="Track posted GRN invoices and basic AP payments." />
      <WorkspaceGrid
        hideMobileConsole={!hasMobileAction}
        tabletRailMode="split"
        rightRail={
          <>
            {permissions["supplier_invoice.create"] || permissions["supplier_invoice.pay"] ? <ConsoleSection title="Actions">
              <div className="grid gap-2">
                {permissions["supplier_invoice.create"] ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/supplier-invoices/new"><FilePlus2 className="h-4 w-4" />New Invoice</Link></Button> : null}
                {permissions["supplier_invoice.pay"] ? <><Button asChild variant="outline" size="sm" className="w-full" data-mobile-primary-action={!permissions["supplier_invoice.create"] || undefined}><Link href="/supplier-invoices/aging"><Clock3 className="h-4 w-4" />AP Aging</Link></Button><Button asChild variant="outline" size="sm" className="w-full"><Link href="/supplier-invoices/cash-flow"><TrendingUp className="h-4 w-4" />Cash Flow Forecast</Link></Button></> : null}
              </div>
            </ConsoleSection> : null}
            {permissions["supplier_invoice.pay"] ? <ConsoleSection title="AP Summary">
              {summary ? <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Open</span><strong>{summary.open}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><strong>{summary.paid}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><strong>{formatCurrency(summary.balance)}</strong></div>
              </div> : <div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">The invoice queue remains current. Retry to load AP totals.</p></div>}
            </ConsoleSection> : null}
          </>
        }
      >
        <div className="space-y-3">
          <UnifiedListHeader resultCount={invoices.totalRows} resetHref="/supplier-invoices" filtered={filtered} activeCount={[filters.status, filters.supplier && filters.supplier !== "all", filters.due && filters.due !== "all"].filter(Boolean).length}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search invoice or supplier" className="md:max-w-sm" />
            <StatusTabs statuses={statuses} activeStatus={filters.status} />
            <FilterBarMore activeCount={[filters.supplier && filters.supplier !== "all", filters.due && filters.due !== "all"].filter(Boolean).length} resetHref="/supplier-invoices">
              <SelectControl name={suppliers ? "supplier" : undefined} defaultValue={suppliers ? filters.supplier ?? "all" : "unavailable"} ariaLabel="Supplier" disabled={!suppliers} options={suppliers ? [{ value: "all", label: "All suppliers" }, ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))] : [{ value: "unavailable", label: "Supplier filter unavailable" }]} />
              {!suppliers && filters.supplier ? <input type="hidden" name="supplier" value={filters.supplier} /> : null}
              <SelectControl name="due" defaultValue={filters.due ?? "all"} ariaLabel="Due state" options={[{ value: "all", label: "All due states" }, { value: "overdue", label: "Overdue" }, { value: "due_7", label: "Due in 7 days" }, { value: "no_due", label: "No due date" }]} />
            </FilterBarMore>
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}

            {filtered ? <Button asChild variant="secondary" data-list-action="secondary"><Link href="/supplier-invoices">Reset</Link></Button> : null}
          </UnifiedListHeader>
          <div className="sb-list-content-card overflow-hidden" data-mobile-list-content-card>
            <Table mobileHidden aria-label="Supplier invoices" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier Inv.</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>PO / GRN</TableHead>
                  <TableHead>Invoice Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.rows.map((row) => (
                  <DataGridRow key={row.id} href={`/supplier-invoices/${row.id}`}>
                    <TableCell className="w-10 p-0 text-center"><TableActionLink href={`/supplier-invoices/${row.id}`} label={`Open ${row.invoice_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><DocumentNumber value={row.invoice_no} size="sm" /></TableCell>
                    <TableCell>{row.supplier_invoice_no}</TableCell>
                    <TableCell>{row.supplier_name ?? "-"}</TableCell>
                    <TableCell>{row.po_no ?? "-"} / {row.grn_no ?? "-"}</TableCell>
                    <TableCell>{formatDateOnly(row.invoice_date)}</TableCell>
                    <TableCell>{formatDateOnly(row.due_date)}{row.is_overdue ? <span className="ml-2 text-xs font-medium text-destructive">Overdue</span> : null}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount_paid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.balance_due)}</TableCell>
                  </DataGridRow>
                ))}
                {!invoices.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title={filtered ? "No invoices match these filters" : "No invoices require review"} description={filtered ? "Reset the filters or widen the search." : "All current supplier invoices are up to date."} action={filtered ? { href: "/supplier-invoices", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Supplier invoices">
              {invoices.rows.map((row) => <OperationalListRow
                key={row.id}
                href={`/supplier-invoices/${row.id}`}
                label={`Open ${row.invoice_no}`}
                primary={<div><DocumentNumber value={row.invoice_no} size="sm" /><p className={row.is_overdue ? "text-[11px] font-medium text-[var(--sb-danger)]" : "text-[11px] font-normal text-[var(--sb-text-muted)]"}>{row.is_overdue ? "Overdue — action required" : `GRN ${row.grn_no ?? row.po_no ?? "not linked"}`}</p></div>}
                status={<StatusBadge status={row.status} />}
                secondary={`${row.supplier_name ?? "No supplier"} · Due ${formatDateOnly(row.due_date, "—")}`}
                meta={formatCurrency(row.balance_due)}
              />)}
              {!invoices.rows.length ? <EmptyState title={filtered ? "No invoices match these filters" : "No invoices require review"} description={filtered ? "Reset the filters or widen the search." : "All current supplier invoices are up to date."} action={filtered ? { href: "/supplier-invoices", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          <PaginationControls page={invoices.page} totalPages={invoices.totalPages} totalRows={invoices.totalRows} searchParams={filters} />
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
