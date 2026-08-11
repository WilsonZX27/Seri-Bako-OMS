import Link from "next/link";
import { Pencil } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPurchaseReturns } from "@/server/queries/purchase-returns";
import { hasPermission } from "@/server/auth/permissions";

const statuses = ["draft", "posted", "cancelled"];

export default async function PurchaseReturnsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [returns, allReturns, canCreate] = await Promise.all([getPurchaseReturns(filters), getPurchaseReturns({ page: "all" }), hasPermission("purchase_return.create")]);
  const rows = allReturns.rows;
  const count = (...items: string[]) => rows.filter((row) => items.includes(row.status)).length;
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/purchase-returns", label: "Reset filters" } : canCreate ? { href: "/purchase-returns/new", label: "New Return" } : undefined;
  return (
    <>
      <PageHeader title="Purchase Returns" description="Return posted supplier receipts and deduct stock once posted." />
      <WorkspaceGrid
        rightRail={
            <>
              <ConsoleSection title="Actions">
                {canCreate ? <Button asChild className="w-full" data-mobile-primary-action>
                  <Link href="/purchase-returns/new">New Return</Link>
                </Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}
              </ConsoleSection>
              <ConsoleSection title="Return Summary">
                <div className="grid gap-2 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">Total</span><strong>{rows.length}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><strong>{count("draft")}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><strong>{count("posted")}</strong></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Value</span><strong>{formatCurrency(rows.reduce((sum, row) => sum + row.return_value, 0))}</strong></div>
                </div>
              </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden border bg-card">
          <FilterBar resultCount={returns.totalRows} resetHref="/purchase-returns" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search return, GRN, PO, supplier" className="md:max-w-sm" />
            <StatusTabs statuses={statuses} activeStatus={filters.status} />
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <Button type="submit">Search</Button>
          </FilterBar>
            <Table mobileHidden stickyColumn="second" aria-label="Purchase returns">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">Action</TableHead>
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
                    <TableCell className="text-center"><TableActionLink href={`/purchase-returns/${row.id}`} label={`Open ${row.purchase_return_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><DocumentNumber value={row.purchase_return_no} size="sm" /></TableCell>
                    <TableCell>{row.grn_no ?? "-"}</TableCell>
                    <TableCell>{row.po_no ?? "-"}</TableCell>
                    <TableCell>{row.supplier_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={row.status} /></TableCell>
                    <TableCell className="text-right">{formatNumber(row.return_total)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.return_value)}</TableCell>
                  </DataGridRow>
                ))}
                {!returns.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={filtered ? "No returns match these filters" : "No purchase returns yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier returns appear after a posted receiving is returned."} action={emptyAction} /></TableCell></TableRow> : null}
              </TableBody>
          </Table>
          <OperationalList ariaLabel="Purchase returns">
            {returns.rows.map((row) => <OperationalListRow
              key={row.id}
              href={`/purchase-returns/${row.id}`}
              label={`Open ${row.purchase_return_no}`}
              primary={<div><DocumentNumber value={row.purchase_return_no} size="sm" /><p className="text-[11px] font-normal text-[var(--sb-text-muted)]">PO {row.po_no ?? "not linked"} · {formatNumber(row.return_total)} returned</p></div>}
              status={<StatusBadge status={row.status} />}
              secondary={`${row.supplier_name ?? "No supplier"} · ${row.grn_no ?? "No GRN"}`}
              meta={formatCurrency(row.return_value)}
            />)}
            {!returns.rows.length ? <EmptyState title={filtered ? "No returns match these filters" : "No purchase returns yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier returns appear after a posted receiving is returned."} action={filtered ? emptyAction : undefined} /> : null}
          </OperationalList>
          <PaginationControls page={returns.page} totalPages={returns.totalPages} totalRows={returns.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
