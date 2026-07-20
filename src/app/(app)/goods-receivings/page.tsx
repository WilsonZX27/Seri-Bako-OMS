import Link from "next/link";
import { Pencil } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getGoodsReceivings } from "@/server/queries/goods-receivings";
import { hasPermission } from "@/server/auth/permissions";

const statuses = ["draft", "posted", "cancelled"];

export default async function GoodsReceivingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [receivings, allReceivings, canCreate] = await Promise.all([getGoodsReceivings(filters), getGoodsReceivings({ page: "all" }), hasPermission("grn.create")]);
  const rows = allReceivings.rows;
  const count = (...statuses: string[]) => rows.filter((receiving) => statuses.includes(receiving.status)).length;
  const receivedTotal = rows.reduce((sum, receiving) => sum + receiving.received_total, 0);
  const rejectedTotal = rows.reduce((sum, receiving) => sum + receiving.rejected_total, 0);
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader
        title="Goods Receiving"
        description="Receive supplier deliveries against approved purchase orders. Stock increases only after GRN posting."
      />
      <WorkspaceGrid
        rightRail={
          <>
            <ConsoleSection title="Actions">
              {canCreate ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/goods-receivings/new">New GRN</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}
            </ConsoleSection>
            <ConsoleSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total GRNs</span><strong>{rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><strong>{count("draft")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><strong>{count("posted")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{count("cancelled")}</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Received Qty</span><strong>{formatNumber(receivedTotal)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rejected Qty</span><strong>{formatNumber(rejectedTotal)}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <FilterBar resultCount={receivings.totalRows} resetHref="/goods-receivings" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN no, PO, supplier, branch" className="md:max-w-sm" />
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <Button type="submit" variant="secondary">Search</Button>
          </FilterBar>
          <BulkSelectionProvider ids={receivings.rows.map((receiving) => receiving.id)} actionLabel="Archive selected" actionHint="Open selected GRNs to post or cancel them through workflow-safe actions. Posted receiving records are never hard deleted.">
          <DataGridHint text="Pro-tip: Double-click any row to open the goods receiving document." />
            <Table mobileHidden aria-label="Goods receiving records">
              <TableHeader>
                <TableRow>
                  <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead>
                  <SortableHead label="GRN No" column="grn_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Received" column="received_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Branch</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="w-12 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivings.rows.map((receiving) => (
                  <DataGridRow key={receiving.id} href={`/goods-receivings/${receiving.id}`}>
                      <TableSelectionCell>
                        <BulkSelectRowCheckbox id={receiving.id} />
                      </TableSelectionCell>
                    <TableCell><DocumentNumber value={receiving.grn_no} size="sm" /></TableCell>
                    <TableCell>{receiving.po_no ?? "-"}</TableCell>
                    <TableCell>{receiving.supplier_name ?? "-"}</TableCell>
                    <TableCell>{receiving.received_date}</TableCell>
                    <TableCell>{receiving.branch_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={receiving.status} /></TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.received_total)}</TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.rejected_total)}</TableCell>
                    <TableCell className="text-right"><TableActionLink href={`/goods-receivings/${receiving.id}`} label={`Open ${receiving.grn_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                  </DataGridRow>
                ))}
                {!receivings.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title={filtered ? "No receivings match these filters" : "No goods receivings yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier deliveries will appear after they are recorded."} action={filtered ? { href: "/goods-receivings", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Goods receiving records">
              {receivings.rows.map((receiving) => <OperationalListRow key={receiving.id} href={`/goods-receivings/${receiving.id}`} label={`Open ${receiving.grn_no}`} primary={<DocumentNumber value={receiving.grn_no} size="sm" />} status={<StatusBadge status={receiving.status} />} secondary={`${receiving.supplier_name ?? "No supplier"} · ${receiving.received_date}`} meta={`${formatNumber(receiving.received_total)} received`} />)}
              {!receivings.rows.length ? <EmptyState title={filtered ? "No receivings match these filters" : "No goods receivings yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier deliveries will appear after they are recorded."} action={filtered ? { href: "/goods-receivings", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          </BulkSelectionProvider>
          <PaginationControls page={receivings.page} totalPages={receivings.totalPages} totalRows={receivings.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
