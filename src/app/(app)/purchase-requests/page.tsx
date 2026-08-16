import { Pencil, Plus } from "lucide-react";
import Link from "next/link";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { BulkPhaseOneDelete } from "@/components/bulk-phase-one-delete";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { PriorityBadge } from "@/components/priority-badge";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { SelectControl } from "@/components/ui/select-control";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPurchaseRequestSummary, getPurchaseRequests } from "@/server/queries/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { PurchaseRequestExportDialog } from "@/components/purchase-request-export-dialog";
import { logServerError } from "@/server/observability/logger";

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "manager_review", label: "Manager Review" },
  { value: "admin_review", label: "Purchasing Review" },
  { value: "finance_review", label: "Finance Review" },
  { value: "ready_to_convert", label: "Ready to Convert" },
  { value: "converted_to_po", label: "Converted to PO" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
];

async function loadRequests(filters: Record<string, string | undefined>) {
  try {
    return { data: await getPurchaseRequests(filters), unavailable: false };
  } catch (error) {
    logServerError(error, { source: "page.purchaseRequests.list" });
    return { data: null, unavailable: true };
  }
}

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [requestsResult, permissions, [summaryResult]] = await Promise.all([loadRequests(filters), getPermissionMap(["pr.create", "pr.view_branch"]), Promise.allSettled([getPurchaseRequestSummary()])]);
  const requests = requestsResult.data;
  if (summaryResult.status === "rejected") logServerError(summaryResult.reason, { source: "page.purchaseRequests.summary" });
  const summary = summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader
        title="Purchase Requests"
        description="Create, review, return, and convert branch requests into purchase orders."
        action={permissions["pr.create"] ? { href: "/purchase-requests/new", label: "New purchase request" } : undefined}
        hideTabletCreateFab
      />
      <WorkspaceGrid
        className="pt-4"
        hideMobileConsole
        tabletRailMode="split"
        tabletRailBreakpoint="md"
        rightRail={
          <div className="space-y-3 [&>section]:overflow-hidden [&>section]:rounded-[var(--sb-panel-radius)] [&>section]:border [&>section]:border-[var(--sb-border-soft)] [&>section]:bg-card [&>section]:shadow-[var(--sb-shadow-panel)]" data-tablet-split-actions>
            {permissions["pr.create"] || permissions["pr.view_branch"] ? <ConsoleSection title="Actions"><div className="grid gap-2">
              {permissions["pr.create"] ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/purchase-requests/new"><Plus className="h-4 w-4" />New PR</Link></Button> : null}
              {permissions["pr.view_branch"] ? <PurchaseRequestExportDialog /> : null}
            </div></ConsoleSection> : null}
            <ConsoleSection title="PR Summary">
              {summary ? <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total PRs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager Review</span><strong>{summary.managerReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Purchasing Review</span><strong>{summary.adminReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Finance Review</span><strong>{summary.financeReview}</strong></div>
              </div> : <div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">The request queue remains current. Retry to load PR totals.</p></div>}
            </ConsoleSection>
          </div>
        }
      >
        <div className="space-y-3" data-tablet-main-list>
            <FilterBar resetHref="/purchase-requests" filtered={filtered} resultCount={requests?.totalRows}>
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PR no, branch, remarks" className="md:max-w-sm" />
              <SelectControl name="status" defaultValue={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status.value, label: status.label }))]} />
              <SelectControl name="priority" defaultValue={filters.priority ?? "all"} ariaLabel="Priority" options={[{ value: "all", label: "All priorities" }, { value: "critical", label: "Critical" }, { value: "urgent", label: "Urgent" }, { value: "normal", label: "Normal" }, { value: "low", label: "Low" }]} />
              {filtered ? <Button asChild variant="secondary" className="sb-filter-submit shrink-0"><Link href="/purchase-requests">Reset</Link></Button> : <Button type="submit" variant="secondary" className="sb-filter-submit shrink-0">Search</Button>}
            </FilterBar>
          <div className="sb-list-content-card overflow-hidden">
            <BulkSelectionProvider ids={requests?.rows.map((request) => request.id) ?? []} actionLabel="Delete selected" actionHint="Review selected requests before permanent deletion." selectionActions={<BulkPhaseOneDelete />}>
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase request." />
          <Table mobileHidden compactUntil="xl" aria-label="Purchase requests" stickyColumn="third">
              <TableHeader>
                <TableRow>
                  <TableSelectionHead className="hidden md:table-cell"><BulkSelectAllCheckbox /></TableSelectionHead>
                  <TableHead className="w-10 text-center">Action</TableHead>
                  <SortableHead label="PR No" column="request_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead className="hidden md:table-cell" label="Date" column="request_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Needed By" column="needed_by_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="hidden md:table-cell">Priority</TableHead>
                  <TableHead className="hidden lg:table-cell">Branch</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="hidden text-right lg:table-cell">Lines</TableHead>
                  <TableHead className="hidden text-right md:table-cell">Estimated Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.rows.map((request) => (
                  <DataGridRow key={request.id} href={`/purchase-requests/${request.id}`}>
                      <TableSelectionCell className="hidden md:table-cell">
                       <BulkSelectRowCheckbox id={request.id} />
                      </TableSelectionCell>
                    <TableCell className="w-10 p-0 text-center">
                      <TableActionLink href={`/purchase-requests/${request.id}`} label={`Open ${request.request_no}`}><Pencil className="h-4 w-4" /></TableActionLink>
                    </TableCell>
                    <TableCell><DocumentNumber value={request.request_no} size="sm" /></TableCell>
                    <TableCell className="hidden md:table-cell">{formatDateOnly(request.request_date)}</TableCell>
                    <TableCell>{formatDateOnly(request.needed_by_date, "-")}</TableCell>
                    <TableCell className="hidden md:table-cell"><PriorityBadge priority={request.priority} /></TableCell>
                    <TableCell className="hidden lg:table-cell">{request.branch_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell className="hidden text-right lg:table-cell">{request.line_count}</TableCell>
                    <TableCell className="hidden text-right md:table-cell">{formatCurrency(request.estimated_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!requests?.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title={requestsResult.unavailable ? "Purchase request data unavailable" : filtered ? "No requests match these filters" : "No purchase requests yet"} description={requestsResult.unavailable ? "The request source could not be verified. No record count or estimated total is shown as zero." : filtered ? "Reset the filters or widen the search." : "Purchase requests appear here after branch needs are created."} action={requestsResult.unavailable ? { href: "/purchase-requests", label: "Retry requests" } : filtered ? { href: "/purchase-requests", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase requests" showUntil="xl">
              {requests?.rows.map((request) => <OperationalListRow key={request.id} href={`/purchase-requests/${request.id}`} label={`Open ${request.request_no}`} primary={<DocumentNumber value={request.request_no} size="sm" />} status={<StatusBadge status={request.status} />} secondary={`${request.branch_name ?? "Unassigned branch"} · ${formatDateOnly(request.request_date)}`} meta={`${request.line_count} items · Needed ${formatDateOnly(request.needed_by_date, "—")}`} />)}
              {!requests?.rows.length ? <EmptyState title={requestsResult.unavailable ? "Purchase request data unavailable" : filtered ? "No requests match these filters" : "No purchase requests yet"} description={requestsResult.unavailable ? "The request source could not be verified. No record count or estimated total is shown as zero." : filtered ? "Reset the filters or widen the search." : "Purchase requests appear here after branch needs are created."} action={requestsResult.unavailable ? { href: "/purchase-requests", label: "Retry requests" } : filtered ? { href: "/purchase-requests", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          </BulkSelectionProvider>
          {requests ? <PaginationControls page={requests.page} totalPages={requests.totalPages} totalRows={requests.totalRows} searchParams={filters} /> : null}
          </div>
        </div>
      </WorkspaceGrid>
    </>
  );
}
