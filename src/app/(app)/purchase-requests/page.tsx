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
        className="pt-4 sb-portrait-tablet-rail"
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
            <FilterBar resetHref="/purchase-requests" filtered={filtered} resultCount={requests?.totalRows} className="sb-list-filters--balanced">
              <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PR no, branch, remarks" className="md:max-w-sm" />
              <SelectControl name="status" defaultValue={filters.status ?? "all"} ariaLabel="Status" options={[{ value: "all", label: "All statuses" }, ...statuses.map((status) => ({ value: status.value, label: status.label }))]} />
              <SelectControl name="priority" defaultValue={filters.priority ?? "all"} ariaLabel="Priority" options={[{ value: "all", label: "All priorities" }, { value: "critical", label: "Critical" }, { value: "urgent", label: "Urgent" }, { value: "normal", label: "Normal" }, { value: "low", label: "Low" }]} />
              <Button type="submit" className="sb-filter-submit min-w-0" data-list-action="primary">Search</Button>
              {filtered ? <Button asChild variant="secondary" className="sb-filter-submit min-w-0" data-list-action="secondary"><Link href="/purchase-requests">Reset</Link></Button> : null}
            </FilterBar>
          <div className="sb-list-content-card overflow-hidden">
            <BulkSelectionProvider ids={requests?.rows.map((request) => request.id) ?? []} actionLabel="Delete selected" actionHint="Review selected requests before permanent deletion." selectionActions={<BulkPhaseOneDelete />}>
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase request." />
              <Table className="sb-purchase-request-table" mobileHidden compactUntil="xl" aria-label="Purchase requests" stickyColumn="third">
            <TableHeader>
                <TableRow>
                  <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead>
                  <TableHead>Action</TableHead>
                  <SortableHead label="Request" column="request_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Schedule" column="request_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Request context</TableHead>
                  <TableHead>Supplier</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="pr-5 text-right">Request value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests?.rows.map((request) => (
                  <DataGridRow key={request.id} href={`/purchase-requests/${request.id}`}>
                    <TableSelectionCell><BulkSelectRowCheckbox id={request.id} /></TableSelectionCell>
                    <TableCell><TableActionLink className="mx-0" href={`/purchase-requests/${request.id}`} label={`Open ${request.request_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><div className="min-w-0"><DocumentNumber value={request.request_no} size="sm" /><p className="mt-0.5 text-[11px] text-muted-foreground">{request.requested_by_name}</p></div></TableCell>
                    <TableCell><p>{formatDateOnly(request.request_date)}</p>{request.needed_by_date ? <p className="mt-1 text-[11px] italic text-muted-foreground">{formatDateOnly(request.needed_by_date)}</p> : null}</TableCell>
                    <TableCell><p>{request.branch_name ?? "—"}</p><div className="mt-1"><PriorityBadge priority={request.priority} /></div></TableCell>
                    <TableCell className="whitespace-normal break-words align-top"><span className={request.supplier_state === "assigned" ? "text-[var(--sb-text)]" : "font-medium text-[var(--sb-warning)]"}>{request.supplier_state === "assigned" ? request.supplier_names.join(", ") : request.supplier_state === "assignment_required" ? "Supplier assignment required" : request.supplier_state === "details_unavailable" ? "Supplier details unavailable" : "—"}</span></TableCell>
                    <TableCell className="whitespace-normal"><StatusBadge status={request.status === "converted_to_po" && request.procurement_status ? request.procurement_status : request.status} /></TableCell>
                    <TableCell className="text-right"><p>{request.line_count} lines</p><p className="mt-1 text-[11px] text-muted-foreground">{formatCurrency(request.estimated_total)}</p></TableCell>
                  </DataGridRow>
                ))}
                {!requests?.rows.length ? <TableRow><TableCell colSpan={8}><EmptyState title={requestsResult.unavailable ? "Purchase request data unavailable" : filtered ? "No requests match these filters" : "No purchase requests yet"} description={requestsResult.unavailable ? "The request source could not be verified. No record count or estimated total is shown as zero." : filtered ? "Reset the filters or widen the search." : "Purchase requests appear here after branch needs are created."} action={requestsResult.unavailable ? { href: "/purchase-requests", label: "Retry requests" } : filtered ? { href: "/purchase-requests", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase requests" showUntil="xl">
              {requests?.rows.map((request) => {
                const supplierLabel = request.supplier_state === "assigned" ? request.supplier_names.join(", ") : "Supplier pending";
                return <OperationalListRow key={request.id} href={`/purchase-requests/${request.id}`} label={`Open ${request.request_no}`} primary={<DocumentNumber value={request.request_no} size="sm" className="text-sm" />} status={<StatusBadge status={request.status === "converted_to_po" && request.procurement_status ? request.procurement_status : request.status} />} secondary={<span className="flex min-w-0 items-center gap-2 text-[12px] text-[var(--sb-text-muted)]"><span className="shrink-0">{request.branch_name ?? "Unassigned"}</span><span aria-hidden="true">·</span><span className="shrink-0">{formatDateOnly(request.request_date)}</span><span aria-hidden="true">·</span><span className="min-w-0 truncate">{request.requested_by_name}</span></span>} detail={<span className="flex min-w-0 items-center justify-between gap-3 text-[11px] text-muted-foreground"><span className="truncate" title={supplierLabel}>{supplierLabel}</span><span className="shrink-0 tabular-nums">{request.line_count} items · <strong className="font-medium text-foreground">{formatCurrency(request.estimated_total)}</strong></span></span>} />;
              })}
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
