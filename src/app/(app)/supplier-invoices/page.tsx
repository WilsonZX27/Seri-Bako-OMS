import Link from "next/link";
import { Eye } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency } from "@/lib/utils";
import { getSupplierInvoices } from "@/server/queries/supplier-invoices";

const statuses = ["unpaid", "partially_paid", "paid", "cancelled"];

export default async function SupplierInvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [invoices, allInvoices] = await Promise.all([getSupplierInvoices(filters), getSupplierInvoices({ page: "all" })]);
  const rows = allInvoices.rows;
  const count = (...items: string[]) => rows.filter((row) => items.includes(row.status)).length;
  return (
    <>
      <PageHeader title="Supplier Invoices" description="Track posted GRN invoices and basic AP payments." action={{ href: "/supplier-invoices/new", label: "New Invoice" }} />
      <WorkspaceGrid
        rightRail={
          <ConsoleSection title="AP Summary">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Open</span><strong>{count("unpaid", "partially_paid")}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Paid</span><strong>{count("paid")}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Balance</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + row.balance_due, 0))}</strong></div>
            </div>
          </ConsoleSection>
        }
      >
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search invoice, supplier, PO, GRN" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">View</TableHead>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Supplier Inv.</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>PO / GRN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.rows.map((row) => (
                  <DataGridRow key={row.id} href={`/supplier-invoices/${row.id}`}>
                    <TableCell><Link href={`/supplier-invoices/${row.id}`} aria-label={`View ${row.invoice_no}`}><Eye className="h-4 w-4" /></Link></TableCell>
                    <TableCell><DocumentNumber value={row.invoice_no} size="sm" /></TableCell>
                    <TableCell>{row.supplier_invoice_no}</TableCell>
                    <TableCell>{row.supplier_name ?? "-"}</TableCell>
                    <TableCell>{row.po_no ?? "-"} / {row.grn_no ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{formatCurrency(row.total_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.amount_paid)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.balance_due)}</TableCell>
                  </DataGridRow>
                ))}
                {!invoices.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title="No supplier invoices found" description="Supplier invoices will appear here after posted GRNs are invoiced." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={invoices.page} totalPages={invoices.totalPages} totalRows={invoices.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
