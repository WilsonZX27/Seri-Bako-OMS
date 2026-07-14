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
import { PriorityBadge } from "@/components/priority-badge";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { SelectNative } from "@/components/ui/select-native";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConsoleSection } from "@/components/layout/right-console";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency } from "@/lib/utils";
import { getPurchaseRequestSummary, getPurchaseRequests } from "@/server/queries/procurement";

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "manager_review", label: "Manager Review" },
  { value: "admin_review", label: "Admin Review" },
  { value: "finance_review", label: "Finance Review" },
  { value: "ready_to_convert", label: "Ready to Convert" },
  { value: "converted_to_po", label: "Converted to PO" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
];

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [requests, summary] = await Promise.all([getPurchaseRequests(filters), getPurchaseRequestSummary()]);
  return (
    <>
      <PageHeader title="Purchase Requests" description="Create, review, return, and convert branch requests into purchase orders." />
      <WorkspaceGrid
        className="pt-4"
        rightRail={
          <>
            <ConsoleSection title="Actions">
              <div className="grid gap-2">
                <Button asChild size="sm" className="w-full">
                  <Link href="/purchase-requests/new">New PR</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/api/export/purchase-requests">Export CSV</Link>
                </Button>
              </div>
            </ConsoleSection>
            <ConsoleSection title="PR Summary">
              <div className="grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total PRs</span><strong>{summary.total}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager Review</span><strong>{summary.managerReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Admin Review</span><strong>{summary.adminReview}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Finance Review</span><strong>{summary.financeReview}</strong></div>
              </div>
            </ConsoleSection>
          </>
        }
      >
        <div className="overflow-hidden rounded-[2px] border border-[var(--sb-border-soft)] bg-card">
          <StatusTabs statuses={statuses} activeStatus={filters.status} />
          <form className="flex flex-col gap-2 border-b bg-white p-3 md:flex-row md:items-center">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search PR no, branch, location, remarks" className="md:max-w-sm" />
            <SelectNative name="priority" defaultValue={filters.priority ?? "all"} className="md:max-w-44">
              <option value="all">All priorities</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </SelectNative>
            <Button type="submit" variant="secondary">Search</Button>
            <Button asChild variant="ghost"><a href="?">Reset</a></Button>
          </form>
          <BulkSelectionProvider ids={requests.rows.map((request) => request.id)} actionLabel="Archive selected" actionHint="Open selected PRs to archive, reject, or convert them through workflow-safe actions.">
          <DataGridHint text="Pro-tip: Double-click any row to open the purchase request." />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20"><BulkSelectAllCheckbox /></TableHead>
                  <SortableHead label="PR No" column="request_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Date" column="request_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Needed By" column="needed_by_date" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Priority</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Location</TableHead>
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead className="text-right">Lines</TableHead>
                  <TableHead className="text-right">Estimated Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.rows.map((request) => (
                  <DataGridRow key={request.id} href={`/purchase-requests/${request.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkSelectRowCheckbox id={request.id} />
                        <Link href={`/purchase-requests/${request.id}`} aria-label={`Quick view ${request.request_no}`} className="rounded-none p-1 text-[var(--sb-text-soft)] hover:bg-[var(--sb-surface-muted)] hover:text-[var(--sb-amber-700)]">
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </div>
                    </TableCell>
                    <TableCell><DocumentNumber value={request.request_no} size="sm" /></TableCell>
                    <TableCell>{request.request_date}</TableCell>
                    <TableCell>{request.needed_by_date ?? "-"}</TableCell>
                    <TableCell><PriorityBadge priority={request.priority} /></TableCell>
                    <TableCell>{request.branch_name ?? "-"}</TableCell>
                    <TableCell>{request.location_name ?? "-"}</TableCell>
                    <TableCell><StatusBadge status={request.status} /></TableCell>
                    <TableCell className="text-right">{request.line_count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(request.estimated_total)}</TableCell>
                  </DataGridRow>
                ))}
                {!requests.rows.length ? <TableRow><TableCell colSpan={10}><EmptyState title="No purchase requests found" description="New purchase requests will appear here after staff submit branch needs." action={{ href: "/purchase-requests/new", label: "New PR" }} /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={requests.page} totalPages={requests.totalPages} totalRows={requests.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
