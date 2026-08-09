import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getGoodsReceivingSummary, getGoodsReceivings } from "@/server/queries/goods-receivings";
import { hasPermission } from "@/server/auth/permissions";

const statuses = ["draft", "posted", "cancelled"];

export default async function GoodsReceivingsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [receivings, summary, canCreate] = await Promise.all([getGoodsReceivings(filters), getGoodsReceivingSummary(), hasPermission("grn.create")]);
  const filtered = hasActiveFilters(filters);
  const emptyStateAction = filtered
    ? { href: "/goods-receivings", label: "Reset filters" }
    : canCreate
      ? { href: "/goods-receivings/new", label: "New GRN" }
      : undefined;
  return (
    <>
      <PageHeader
        title="Goods Receiving"
        description="Receive supplier deliveries against approved purchase orders. Stock increases only after GRN posting."
        action={canCreate ? { href: "/goods-receivings/new", label: "New GRN" } : undefined}
        hideTabletCreateFab
      />
      <WorkspaceGrid
        hideMobileConsole
        tabletRailMode="split"
        tabletRailBreakpoint="md"
        rightRail={
          <div className="space-y-3 [&>section]:overflow-hidden [&>section]:rounded-[var(--sb-panel-radius)] [&>section]:border [&>section]:border-[var(--sb-border-soft)] [&>section]:bg-card">
            {canCreate ? <ConsoleSection title="Actions"><Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/goods-receivings/new"><Plus className="h-4 w-4" />New GRN</Link></Button></ConsoleSection> : null}
            <ConsoleSection title="GRN Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total GRNs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Draft</span><strong>{summary.draft}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Posted</span><strong>{summary.posted}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Cancelled</span><strong>{summary.cancelled}</strong></div>
              </div>
              <div className="my-3 border-t" />
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Received Qty</span><strong>{formatNumber(summary.receivedTotal)}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rejected Qty</span><strong>{formatNumber(summary.rejectedTotal)}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        <div className="sb-work-surface overflow-hidden">
          <div className="hidden sm:block">
            <FilterBar resultCount={receivings.totalRows} resetHref="/goods-receivings" filtered={filtered} className="sb-list-filters--compact-mobile">
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN, PO or supplier" className="min-w-0 flex-1 md:max-w-sm" />
              <StatusTabs statuses={statuses} activeStatus={filters.status} />
              {filtered ? <Button asChild variant="secondary" className="shrink-0"><Link href="/goods-receivings">Reset</Link></Button> : <Button type="submit" variant="secondary" className="shrink-0">Search</Button>}
              {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            </FilterBar>
          </div>
          <div className="sm:hidden">
            <UnifiedListHeader
              phoneOnly
              phoneMode="inline"
              resultCount={receivings.totalRows}
              resetHref="/goods-receivings"
              filtered={filtered}
              activeCount={filters.status ? 1 : 0}
            >
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search GRN, PO or supplier" />
              <StatusTabs statuses={statuses} activeStatus={filters.status} />
              {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            </UnifiedListHeader>
          </div>
          <DataGridHint text="Pro-tip: Double-click any row to open the goods receiving document." />
          <Table mobileHidden aria-label="Goods receiving records" stickyColumn="second">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <SortableHead label="GRN No" column="grn_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>PO</TableHead>
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Received" column="received_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Branch</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivings.rows.map((receiving) => (
                  <DataGridRow key={receiving.id} href={`/goods-receivings/${receiving.id}`}>
                    <TableCell className="w-10 p-0 text-center"><TableActionLink href={`/goods-receivings/${receiving.id}`} label={`Open ${receiving.grn_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><DocumentNumber value={receiving.grn_no} size="sm" /></TableCell>
                    <TableCell>{receiving.po_no ?? "-"}</TableCell>
                    <TableCell>{receiving.supplier_name ?? "-"}</TableCell>
                    <TableCell>{formatDateOnly(receiving.received_date)}</TableCell>
                    <TableCell>{receiving.branch_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={receiving.status} /></TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.received_total)}</TableCell>
                    <TableCell className="text-right">{formatNumber(receiving.rejected_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!receivings.rows.length ? <TableRow><TableCell colSpan={9}><EmptyState title={filtered ? "No receivings match these filters" : "No goods receivings yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier deliveries will appear after they are recorded."} action={emptyStateAction} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Goods receiving records">
              {receivings.rows.map((receiving) => <OperationalListRow
                key={receiving.id}
                href={`/goods-receivings/${receiving.id}`}
                label={`Open ${receiving.grn_no}`}
                primary={<div><DocumentNumber value={receiving.grn_no} size="sm" /><p className="text-[11px] font-normal text-[var(--sb-text-muted)]">PO {receiving.po_no ?? "not linked"} · {formatDateOnly(receiving.received_date)}</p></div>}
                status={<StatusBadge status={receiving.status} />}
                secondary={`${receiving.supplier_name ?? "No supplier"} · ${receiving.branch_name ?? "No branch"}`}
                meta={`${formatNumber(receiving.received_total)} in · ${formatNumber(receiving.rejected_total)} rejected`}
              />)}
              {!receivings.rows.length ? <EmptyState title={filtered ? "No receivings match these filters" : "No goods receivings yet"} description={filtered ? "Reset the filters or widen the search." : "Supplier deliveries will appear after they are recorded."} action={emptyStateAction} /> : null}
            </OperationalList>
          <PaginationControls page={receivings.page} totalPages={receivings.totalPages} totalRows={receivings.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
