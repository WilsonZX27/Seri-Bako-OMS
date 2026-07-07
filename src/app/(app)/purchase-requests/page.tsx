import Link from "next/link";
import { Eye } from "lucide-react";
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
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { formatCurrency } from "@/lib/utils";
import { getPurchaseRequests } from "@/server/queries/procurement";

const statuses = [
  { value: "draft", label: "Draft" },
  { value: "admin_review", label: "Manager Review" },
  { value: "purchasing_review", label: "Admin Review" },
  { value: "pending_approval", label: "Finance Review" },
  { value: "approved", label: "Ready to Convert" },
  { value: "converted", label: "Converted to PO" },
  { value: "rejected", label: "Rejected / Returned" },
];

export default async function PurchaseRequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [requests, allRequests] = await Promise.all([getPurchaseRequests(filters), getPurchaseRequests({ page: "all" })]);
  const rows = allRequests.rows;
  const count = (...statuses: string[]) => rows.filter((request) => statuses.includes(request.status)).length;
  const estimatedTotal = rows.reduce((sum, request) => sum + request.estimated_total, 0);
  return (
    <>
      <PageHeader title="Purchase Requests" description="Create, review, return, and convert branch requests into purchase orders." action={{ href: "/purchase-requests/new", label: "New PR" }} secondaryAction={{ href: "/api/export/purchase-requests", label: "Export CSV" }} />
      <WorkspaceGrid
        className="pt-4"
        rightRail={
          <>
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">PR Summary</h2>
              <div className="mt-3 grid gap-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Total PRs</span><strong>{rows.length}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Manager Review</span><strong>{count("admin_review", "manager_review", "submitted")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Admin Review</span><strong>{count("purchasing_review")}</strong></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Finance Review</span><strong>{count("pending_approval", "finance_review")}</strong></div>
              </div>
            </section>
            <section className="rounded-lg border bg-card p-3 shadow-sm">
              <h2 className="text-[13px] font-semibold">Page Metrics</h2>
              <div className="mt-3 space-y-2">
                <div className="rounded-md border bg-white p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">Pending Value</p>
                  <p className="mt-1 text-lg font-semibold">{formatCurrency(estimatedTotal)}</p>
                </div>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/purchase-requests">Full Details</Link>
                </Button>
              </div>
            </section>
          </>
        }
      >
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
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
                        <Link href={`/purchase-requests/${request.id}`} aria-label={`Quick view ${request.request_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
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
