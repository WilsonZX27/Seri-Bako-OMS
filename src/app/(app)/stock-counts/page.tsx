import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, FilterBarMore } from "@/components/ui/filter-bar";
import { UnifiedListHeader } from "@/components/common/UnifiedListHeader";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters, paginateRows } from "@/lib/table-state";
import { formatDateOnly } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { getBranchesForSelect } from "@/server/queries/common";
import { getStockCountSummary, getStockCounts } from "@/server/queries/stock-counts";
import { logServerError } from "@/server/observability/logger";
import { StockCountExportDialog } from "@/components/stock-count-export-dialog";

// Stock Count has one active workflow: Draft → Confirm & Post. Legacy states
// remain readable in the table, but are intentionally not promoted as filters.
const statuses = ["draft", "posted", "cancelled"];

async function loadStockCounts(filters: Record<string, string | undefined>) {
  try {
    return await getStockCounts(filters);
  } catch (error) {
    logServerError(error, { source: "page.stockCounts.list" });
    return paginateRows([], filters.page, 12);
  }
}

async function loadBranches() {
  try {
    return await getBranchesForSelect();
  } catch (error) {
    logServerError(error, { source: "page.stockCounts.branchFilter" });
    return [];
  }
}

async function loadSummary() {
  try {
    return await getStockCountSummary();
  } catch (error) {
    logServerError(error, { source: "page.stockCounts.summary" });
    return { total: null, draft: null, posted: null, cancelled: null };
  }
}

export default async function StockCountsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [counts, summary, branches, canCreate] = await Promise.all([loadStockCounts(filters), loadSummary(), loadBranches(), hasPermission("stock_count.create")]);
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/stock-counts", label: "Reset filters" } : canCreate ? { href: "/stock-counts/new", label: "New Count" } : undefined;
  const exportHref = `/api/export/stock-counts?from=${filters.from ?? ""}&to=${filters.to ?? ""}`;
  return <>
        <PageHeader
          title="Stock Counts"
          description="Physical counts compared against calculated branch stock."
          action={canCreate ? { href: "/stock-counts/new", label: "New Stock Count" } : undefined}
          hideTabletCreateFab
        />
    <WorkspaceGrid
      hideMobileConsole={!canCreate}
      tabletRailMode="split"
      tabletRailBreakpoint="md"
      rightRail={<div className="space-y-3 [&>section]:overflow-hidden [&>section]:rounded-[var(--sb-panel-radius)] [&>section]:border [&>section]:border-[var(--sb-border-soft)] [&>section]:bg-card [&>section]:shadow-[var(--sb-shadow-card)]" data-tablet-split-actions data-stock-count-tablet-rail>
      <ConsoleSection title="Actions"><div className="grid gap-2" data-export-href={exportHref}>{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/stock-counts/new"><Plus className="h-4 w-4" />New Stock Count</Link></Button> : null}<StockCountExportDialog branches={branches} defaultFrom={filters.from} defaultTo={filters.to} /></div></ConsoleSection>
      <ConsoleSection title="Stock Count Summary"><dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{summary.total ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Draft</dt><dd className="font-semibold">{summary.draft ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Posted</dt><dd className="font-semibold">{summary.posted ?? "—"}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Cancelled</dt><dd className="font-semibold">{summary.cancelled ?? "—"}</dd></div></dl></ConsoleSection>
    </div>}>
      <div className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card" data-tablet-main-list>
        <div className="hidden sm:block">
          <FilterBar resultCount={counts.totalRows} resetHref="/stock-counts" filtered={filtered} className="sb-tablet-split-filter">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search count no, branch, remarks" />
            <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <SelectControl name="status" defaultValue={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, { value: "draft", label: "Draft" }, { value: "posted", label: "Posted" }, { value: "cancelled", label: "Cancelled" }]} />
            {filtered ? <Button asChild variant="secondary" className="sb-filter-submit"><Link href="/stock-counts">Reset</Link></Button> : <Button type="submit" className="sb-filter-submit">Search</Button>}
            <FilterBarMore activeCount={Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/stock-counts"><Input name="from" type="date" defaultValue={filters.from ?? ""} aria-label="From date" /><Input name="to" type="date" defaultValue={filters.to ?? ""} aria-label="To date" /></FilterBarMore>
          </FilterBar>
        </div>
        <div className="sm:hidden">
          <UnifiedListHeader phoneOnly resultCount={counts.totalRows} resetHref="/stock-counts" filtered={filtered} activeCount={Number(Boolean(filters.branch_id && filters.branch_id !== "all")) + Number(Boolean(filters.status && filters.status !== "all")) + Number(Boolean(filters.from)) + Number(Boolean(filters.to))} className="sb-mobile-list-filter">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search count no, branch, remarks" />
            <SelectControl name="branch_id" defaultValue={filters.branch_id ?? "all"} ariaLabel="Branch" options={[{ value: "all", label: "All branches" }, ...branches.map((branch) => ({ value: branch.id, label: branch.branch_name }))]} />
            <StatusTabs statuses={statuses} activeStatus={filters.status} />
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <FilterBarMore activeCount={Number(Boolean(filters.from)) + Number(Boolean(filters.to))} resetHref="/stock-counts"><Input name="from" type="date" defaultValue={filters.from ?? ""} aria-label="From date" /><Input name="to" type="date" defaultValue={filters.to ?? ""} aria-label="To date" /></FilterBarMore>
          </UnifiedListHeader>
        </div>
        <DataGridHint text="Pro-tip: Double-click any row to open the stock count." />
        <Table mobileHidden compactUntil="xl" aria-label="Stock counts" stickyColumn="second"><TableHeader><TableRow><TableHead className="w-16 text-center">Action</TableHead><SortableHead label="Count No" column="count_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><SortableHead label="Date" column="count_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead>Branch</TableHead><TableHead>Submitted by</TableHead><SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} /><TableHead className="text-right">Lines</TableHead><TableHead className="text-right">High Variance</TableHead></TableRow></TableHeader>
          <TableBody>{counts.rows.map((row) => <DataGridRow key={row.id} href={`/stock-counts/${row.id}`}><TableCell className="w-16 p-0 text-center"><TableActionLink href={`/stock-counts/${row.id}`} label={`Open ${row.count_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell><TableCell className="font-medium">{row.count_no}</TableCell><TableCell>{formatDateOnly(row.count_date)}</TableCell><TableCell>{row.branch_name ?? "-"}</TableCell><TableCell>{row.counted_by_name ?? "-"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell><TableCell className="text-right">{row.high_variance_count}</TableCell></DataGridRow>)}{!counts.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={filtered ? "No counts match these filters" : "No stock counts yet"} description={filtered ? "Reset the filters or widen the date range." : "Counts appear after a permitted user starts a branch stock count."} action={emptyAction} /></TableCell></TableRow> : null}</TableBody></Table>
        <OperationalList ariaLabel="Stock counts" showUntil="xl">{counts.rows.map((row) => <OperationalListRow key={row.id} href={`/stock-counts/${row.id}`} label={`Open ${row.count_no}`} primary={`${row.branch_name ?? "Unknown branch"} · ${formatDateOnly(row.count_date)}`} status={<StatusBadge status={row.status} />} secondary={`Submitted by ${row.counted_by_name ?? "Unknown user"}`} detail={<span className="hidden sm:inline">{row.count_no}</span>} meta={<span className={row.high_variance_count > 0 ? "font-semibold text-[var(--sb-warning)]" : undefined}>{row.line_count} lines · {row.high_variance_count} variance</span>} />)}{!counts.rows.length ? <EmptyState title={filtered ? "No counts match these filters" : "No stock counts yet"} description={filtered ? "Reset the filters or widen the date range." : "Counts appear after a permitted user starts a branch stock count."} action={filtered ? emptyAction : undefined} /> : null}</OperationalList>
        <PaginationControls page={counts.page} totalPages={counts.totalPages} totalRows={counts.totalRows} searchParams={filters} />
      </div>
    </WorkspaceGrid>
  </>;
}
