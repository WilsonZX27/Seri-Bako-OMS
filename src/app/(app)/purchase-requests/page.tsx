import { Download, Pencil, Plus } from "lucide-react";
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
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency, formatDateOnly } from "@/lib/utils";
import { hasActiveFilters } from "@/lib/table-state";
import { getPurchaseRequestSummary, getPurchaseRequests } from "@/server/queries/procurement";
import { getPermissionMap } from "@/server/auth/permissions";

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

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [requests, summary, permissions] = await Promise.all([getPurchaseRequests(filters), getPurchaseRequestSummary(), getPermissionMap(["pr.create", "pr.view_branch"])]);
  const filtered = hasActiveFilters(filters);
  return (
    <>
      <PageHeader
        title="Purchase Requests"
        description="Create, review, return, and convert branch requests into purchase orders."
        action={permissions["pr.create"] ? { href: "/purchase-requests/new", label: "New purchase request" } : undefined}
      />
      <WorkspaceGrid
        className="pt-4"
        hideMobileConsole
        tabletRailMode="split"
        tabletRailBreakpoint="lg"
        rightRail={
          <div className="space-y-3 [&>section]:overflow-hidden [&>section]:rounded-[var(--sb-panel-radius)] [&>section]:border [&>section]:border-[var(--sb-border-soft)] [&>section]:bg-card" data-tablet-split-actions>
            {permissions["pr.create"] || permissions["pr.view_branch"] ? <ConsoleSection title="Actions"><div className="grid gap-2">
              {permissions["pr.create"] ? <Button asChild size="sm" className="w-full" data-mobile-primary-action><Link href="/purchase-requests/new"><Plus className="h-4 w-4" />New PR</Link></Button> : null}
              {permissions["pr.view_branch"] ? <Button asChild variant="outline" size="sm" className="w-full" data-mobile-primary-action={!permissions["pr.create"] || undefined}><Link href="/api/export/purchase-requests"><Download className="h-4 w-4" />Export CSV</Link></Button> : null}
            </div></ConsoleSection> : null}
            <ConsoleSection title="PR Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total PRs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager Review</span><strong>{summary.managerReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Purchasing Review</span><strong>{summary.adminReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Finance Review</span><strong>{summary.financeReview}</strong></div>
              </div>
            </ConsoleSection>
          </div>
        }
      >
        <div className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-[var(--sb-border-soft)] bg-card" data-tablet-main-list>
          <FilterBar resetHref="/purchase-requests" filtered={filtered} resultCount={requests.totalRows} className="sb-tablet-split-filter sb-mobile-list-filter">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PR no, branch, remarks" className="md:max-w-sm" />
            <StatusTabs statuses={statuses} activeStatus={filters.status} />
            <SelectControl name="priority" defaultValue={filters.priority ?? "all"} ariaLabel="Priority" options={[{ value: "all", label: "All priorities" }, { value: "critical", label: "Critical" }, { value: "urgent", label: "Urgent" }, { value: "normal", label: "Normal" }, { value: "low", label: "Low" }]} />
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            {filtered ? <Button asChild variant="secondary" className="sb-filter-submit shrink-0"><Link href="/purchase-requests">Reset</Link></Button> : <Button type="submit" variant="secondary" className="sb-filter-submit shrink-0">Search</Button>}
          </FilterBar>
          <BulkSelectionProvider ids={requests.rows.map((request) => request.id)} actionLabel="Delete selected" actionHint="Review selected requests before permanent deletion.">
          <BulkPhaseOneDelete />
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
                {requests.rows.map((request) => (
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
                {!requests.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title={filtered ? "No requests match these filters" : "No purchase requests yet"} description={filtered ? "Reset the filters or widen the search." : "Purchase requests appear here after branch needs are created."} action={filtered ? { href: "/purchase-requests", label: "Reset filters" } : undefined} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Purchase requests" showUntil="xl">
              {requests.rows.map((request) => <OperationalListRow key={request.id} href={`/purchase-requests/${request.id}`} label={`Open ${request.request_no}`} primary={<DocumentNumber value={request.request_no} size="sm" />} status={<StatusBadge status={request.status} />} secondary={`${request.branch_name ?? "Unassigned branch"} · ${formatDateOnly(request.request_date)}`} meta={`${request.line_count} items · Needed ${formatDateOnly(request.needed_by_date, "—")}`} />)}
              {!requests.rows.length ? <EmptyState title={filtered ? "No requests match these filters" : "No purchase requests yet"} description={filtered ? "Reset the filters or widen the search." : "Purchase requests appear here after branch needs are created."} action={filtered ? { href: "/purchase-requests", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          </BulkSelectionProvider>
          <PaginationControls page={requests.page} totalPages={requests.totalPages} totalRows={requests.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
