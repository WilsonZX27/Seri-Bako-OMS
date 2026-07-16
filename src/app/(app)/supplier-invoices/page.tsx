import Link from "next/link";
import { Pencil } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency } from "@/lib/utils";
import { getSupplierInvoiceFilterSuppliers, getSupplierInvoices } from "@/server/queries/supplier-invoices";

const statuses = ["draft", "open", "partially_paid", "paid", "void"];

export default async function SupplierInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [invoices, allInvoices, suppliers] = await Promise.all([getSupplierInvoices(filters), getSupplierInvoices({ page: "all" }), getSupplierInvoiceFilterSuppliers()]);
  const rows = allInvoices.rows;
  const count = (...items: string[]) => rows.filter((row) => items.includes(row.status)).length;
  return (
    <>
      <PageHeader title="Supplier Invoices" description="Track posted GRN invoices and basic AP payments." />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="Actions">
              <Button asChild size="sm" className="w-full"><Link href="/supplier-invoices/new">New Invoice</Link></Button>
            </ConsoleSection>
            <ConsoleSection title="AP Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Open</span><strong>{count("open", "partially_paid")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><strong>{count("paid")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + row.balance_due, 0))}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="sb-list-filters">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search invoice or supplier" className="md:max-w-sm" />
            <SelectNative name="status" defaultValue={filters.status ?? "all"}><option value="all">All statuses</option>{statuses.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</SelectNative>
            <SelectNative name="supplier" defaultValue={filters.supplier ?? "all"}><option value="all">All suppliers</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SelectNative>
            <SelectNative name="due" defaultValue={filters.due ?? "all"}><option value="all">All due states</option><option value="overdue">Overdue</option><option value="due_7">Due in 7 days</option><option value="no_due">No due date</option></SelectNative>
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableHead className="w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.rows.map((row) => (
                  <DataGridRow key={row.id} href={`/supplier-invoices/${row.id}`}>
                    <TableCell><DocumentNumber value={row.invoice_no} size="sm" /></TableCell>
                    <TableCell>{row.supplier_invoice_no}</TableCell>
                    <TableCell>{row.supplier_name ?? "-"}</TableCell>
                    <TableCell>{row.po_no ?? "-"} / {row.grn_no ?? "-"}</TableCell>
                    <TableCell>{row.invoice_date}</TableCell>
                    <TableCell>{row.due_date ?? "-"}{row.is_overdue ? <span className="ml-2 text-xs font-medium text-destructive">Overdue</span> : null}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount_paid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.balance_due)}</TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/supplier-invoices/${row.id}`} label={`Open ${row.invoice_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                  </DataGridRow>
                ))}
                {!invoices.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title="No supplier invoices found" description="Supplier invoices will appear here after posted GRNs are invoiced." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={invoices.page} totalPages={invoices.totalPages} totalRows={invoices.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
