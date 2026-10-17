import Link from "next/link";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { PaginationControls } from "@/components/sortable-table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { StatusTabs } from "@/components/status-tabs";
import { StatusBadge } from "@/components/ui/status-badge";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { hasActiveFilters } from "@/lib/table-state";
import { formatDateOnly } from "@/lib/utils";
import { hasPermission } from "@/server/auth/permissions";
import { getStockTransfers, getStockTransferSummary } from "@/server/queries/stock-operations";
import { logServerError } from "@/server/observability/logger";

const statuses = ["draft", "in_transit", "completed", "rejected", "cancelled"];

export default async function StockTransfersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [data, canCreate, [summaryResult]] = await Promise.all([getStockTransfers(filters), hasPermission("stock_transfer.create"), Promise.allSettled([getStockTransferSummary()])]);
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.stockTransfers.summary" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const filtered = hasActiveFilters(filters);
  const emptyAction = filtered ? { href: "/stock-transfers", label: "Reset filters" } : canCreate ? { href: "/stock-transfers/new", label: "New Transfer" } : undefined;

  return <>
    <PageHeader title="Stock Transfers" description="Send stock into transit, then record the quantity the destination actually receives." />
    <WorkspaceGrid hideMobileConsole={!canCreate} tabletRailMode="split" rightRail={<>
      <ConsoleSection title="Actions">{canCreate ? <Button asChild className="w-full" data-mobile-primary-action><Link href="/stock-transfers/new">New Transfer</Link></Button> : <p className="text-xs text-muted-foreground">Your role has read-only access.</p>}</ConsoleSection>
      <ConsoleSection title="Transfer Summary">{summary ? <dl className="grid gap-2 text-xs"><div className="flex justify-between"><dt className="text-muted-foreground">Total</dt><dd className="font-semibold">{summary.total}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Draft</dt><dd className="font-semibold">{summary.draft}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">In transit</dt><dd className="font-semibold">{summary.inTransit}</dd></div><div className="flex justify-between"><dt className="text-muted-foreground">Completed</dt><dd className="font-semibold">{summary.completed}</dd></div></dl> : <div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">The transfer queue remains current. Retry to load transfer totals.</p></div>}</ConsoleSection>
    </>}>
      <div className="overflow-hidden rounded-[var(--sb-panel-radius)] border bg-card">
        <FilterBar resultCount={data.totalRows} resetHref="/stock-transfers" filtered={filtered}><Input name="search" defaultValue={filters.search ?? ""} placeholder="Search transfer no, branch, remarks" /><StatusTabs statuses={statuses} activeStatus={filters.status} />{filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}</FilterBar>
        <DataGridHint text="Pro-tip: Double-click any row to open the stock transfer." />
        <div className="sb-list-content-card overflow-hidden">
        <Table mobileHidden aria-label="Stock transfers" stickyColumn="second"><TableHeader><TableRow><TableHead className="w-16 text-center">Action</TableHead><TableHead>No</TableHead><TableHead>Date</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Lines</TableHead></TableRow></TableHeader>
          <TableBody>{data.rows.map((row) => <DataGridRow key={row.id} href={`/stock-transfers/${row.id}`}><TableCell className="w-16 p-0 text-center"><TableActionLink href={`/stock-transfers/${row.id}`} label={`Open ${row.transfer_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell><TableCell className="font-medium">{row.transfer_no}</TableCell><TableCell>{formatDateOnly(row.transfer_date)}</TableCell><TableCell>{row.from_branch_name ?? "-"}</TableCell><TableCell>{row.to_branch_name ?? "-"}</TableCell><TableCell><StatusBadge status={row.status} /></TableCell><TableCell className="text-right">{row.line_count}</TableCell></DataGridRow>)}
          {!data.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title={filtered ? "No transfers match these filters" : "No stock transfers yet"} description={filtered ? "Reset the filters or widen the search." : "Transfers appear after stock is prepared for another branch."} action={emptyAction} /></TableCell></TableRow> : null}</TableBody></Table>
        <OperationalList ariaLabel="Stock transfers">{data.rows.map((row) => <OperationalListRow key={row.id} href={`/stock-transfers/${row.id}`} label={`Open ${row.transfer_no}`} primary={row.transfer_no} status={<StatusBadge status={row.status} />} secondary={`${row.from_branch_name ?? "Unknown branch"} → ${row.to_branch_name ?? "Unknown branch"}`} meta={`${formatDateOnly(row.transfer_date)} · ${row.line_count} lines`} />)}{!data.rows.length ? <EmptyState title={filtered ? "No transfers match these filters" : "No stock transfers yet"} description={filtered ? "Reset the filters or widen the search." : "Transfers appear after stock is prepared for another branch."} action={filtered ? emptyAction : undefined} /> : null}</OperationalList>
        <PaginationControls page={data.page} totalPages={data.totalPages} totalRows={data.totalRows} searchParams={filters} />
        </div>
      </div>
    </WorkspaceGrid>
  </>;
}
