import Link from "next/link";
import { Pencil } from "lucide-react";
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
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getPurchaseReturns } from "@/server/queries/purchase-returns";

const statuses = ["draft", "posted", "cancelled"];

export default async function PurchaseReturnsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [returns, allReturns] = await Promise.all([getPurchaseReturns(filters), getPurchaseReturns({ page: "all" })]);
  const rows = allReturns.rows;
  const count = (...items: string[]) => rows.filter((row) => items.includes(row.status)).length;
  return (
    <>
      <PageHeader title="Purchase Returns" description="Return posted supplier receipts and deduct stock once posted." action={{ href: "/purchase-returns/new", label: "New Return" }} />
      <WorkspaceGrid
        rightRail={
          <ConsoleSection title="Return Summary">
            <div className="grid gap-2 text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><strong>{rows.length}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><strong>{count("draft")}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><strong>{count("posted")}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Value</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + row.return_value, 0))}</strong></div>
            </div>
          </ConsoleSection>
        }
      >
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-3 border-b bg-white p-4 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search return, GRN, PO, supplier" className="md:max-w-sm" />
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">View</TableHead>
                  <TableHead>Return No</TableHead>
                  <TableHead>GRN</TableHead>
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.rows.map((row) => (
                  <DataGridRow key={row.id} href={`/purchase-returns/${row.id}`}>
                    <TableCell><Link href={`/purchase-returns/${row.id}`} aria-label={`View ${row.purchase_return_no}`}><Pencil className="h-4 w-4" /></Link></TableCell>
                    <TableCell><DocumentNumber value={row.purchase_return_no} size="sm" /></TableCell>
                    <TableCell>{row.grn_no ?? "-"}</TableCell>
                    <TableCell>{row.po_no ?? "-"}</TableCell>
                    <TableCell>{row.supplier_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{formatNumber(row.return_total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.return_value)}</TableCell>
                  </DataGridRow>
                ))}
                {!returns.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title="No purchase returns found" description="Supplier returns will appear here after posted GRNs are returned." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={returns.page} totalPages={returns.totalPages} totalRows={returns.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
