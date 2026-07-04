import { CheckCircle2, ClipboardCheck, Eye, FileText, Paperclip, XCircle } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KpiFilterStrip } from "@/components/ui/kpi-filter-strip";
import { getCanonicalDocumentHref } from "@/lib/document-routing";
import { formatStatusLabel } from "@/lib/status-label";
import { getDocuments } from "@/server/queries/documents";

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const [documents, allDocuments] = await Promise.all([getDocuments(filters), getDocuments({ page: "all" })]);
  const rows = allDocuments.rows;
  const count = (...statuses: string[]) => rows.filter((document) => statuses.includes(document.status)).length;
  const documentInsights = [
    { label: "Total", value: rows.length, href: "/documents", active: !filters.status, icon: FileText },
    { label: "Draft", value: count("draft"), href: "/documents?status=draft", active: filters.status === "draft", icon: FileText },
    { label: "Pending Approval", value: count("pending_approval", "submitted"), href: "/documents?status=pending_approval", active: filters.status === "pending_approval", icon: ClipboardCheck },
    { label: "Approved", value: count("approved"), href: "/documents?status=approved", active: filters.status === "approved", icon: CheckCircle2 },
    { label: "Rejected/Cancelled", value: count("rejected", "cancelled"), href: "/documents?status=rejected", active: filters.status === "rejected", icon: XCircle },
    { label: "Posted/Completed", value: count("posted", "closed"), href: "/documents?status=posted", active: filters.status === "posted", icon: Paperclip },
  ];

  return (
    <>
      <PageHeader title="Documents Register" description="Audit-ready register for document status, approvals, attachments, revisions, and timelines." />
      <div className="space-y-5 p-5">
        <KpiFilterStrip items={documentInsights} />
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <div className="border-b bg-white p-4">
            <p className="sb-section-label">Document Register</p>
            <h2 className="mt-1 text-lg font-semibold">Audit and document control</h2>
          </div>
          <StatusTabs statuses={[
            { value: "draft", label: "Draft" },
            { value: "pending_approval", label: "In Review" },
            { value: "approved", label: "Approved" },
            { value: "posted", label: "Posted" },
            { value: "rejected", label: "Rejected" },
            { value: "closed", label: "Completed" },
          ]} activeStatus={filters.status} />
          <form className="grid gap-3 border-b bg-white p-4 md:grid-cols-5">
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search document no, title, type" />
            <SelectNative name="document_type" defaultValue={filters.document_type ?? "all"}>
              <option value="all">All document types</option>
              <option value="purchase_request">Purchase Request</option>
              <option value="purchase_order">Purchase Order</option>
              <option value="goods_receiving">Goods Receiving</option>
              <option value="stock_count">Stock Count</option>
              <option value="stock_transfer">Stock Transfer</option>
              <option value="stock_wastage">Stock Wastage</option>
              <option value="supplier_invoice">Supplier Invoice</option>
              <option value="payment_schedule">Payment Schedule</option>
            </SelectNative>
            <SelectNative name="status" defaultValue={filters.status ?? "all"}>
              <option value="all">All status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="posted">Posted</option>
              <option value="cancelled">Cancelled</option>
              <option value="closed">Closed</option>
            </SelectNative>
            <SelectNative name="approval_status" defaultValue={filters.approval_status ?? "all"}>
              <option value="all">All approval</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="not_required">Not Required</option>
            </SelectNative>
            <div className="flex gap-2">
              <Button type="submit" variant="secondary">Filter</Button>
              <Button asChild variant="ghost"><a href="?">Reset</a></Button>
            </div>
          </form>
          <BulkSelectionProvider ids={documents.rows.map((document) => document.id)} actionLabel="Archive selected" actionHint="Documents with history are not hard deleted. Open selected documents to use workflow-safe actions.">
          <DataGridHint text="Pro-tip: Double-click any row to open the document." />
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20"><BulkSelectAllCheckbox /></TableHead>
                  <SortableHead label="Doc No" column="document_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Type" column="document_type" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Title" column="title" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Approval" column="approval_status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Created By</TableHead>
                  <SortableHead label="Created" column="created_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Updated" column="updated_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Current Step</TableHead>
                  <TableHead>Related Entity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.rows.map((document) => {
                  const href = getCanonicalDocumentHref(document);
                  return (
                  <DataGridRow key={document.id} href={href}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <BulkSelectRowCheckbox id={document.id} />
                        <a href={href} aria-label={`Quick view ${document.document_no}`} className="rounded-md p-1 text-slate-400 opacity-0 hover:bg-slate-100 hover:text-primary group-hover:opacity-100">
                          <Eye className="h-4 w-4" />
                        </a>
                      </div>
                    </TableCell>
                    <TableCell><DocumentNumber value={document.document_no} size="sm" /></TableCell>
                    <TableCell>{formatStatusLabel(document.document_type)}</TableCell>
                    <TableCell>{document.title}</TableCell>
                    <TableCell><StatusBadge status={document.status} /></TableCell>
                    <TableCell><StatusBadge status={document.approval_status} /></TableCell>
                    <TableCell>{document.created_by_name ?? "Unknown user"}</TableCell>
                    <TableCell>{new Date(document.created_at).toLocaleDateString("en-MY")}</TableCell>
                    <TableCell>{new Date(document.updated_at).toLocaleDateString("en-MY")}</TableCell>
                    <TableCell>{document.current_step ? formatStatusLabel(document.current_step) : "-"}</TableCell>
                    <TableCell>{document.related_entity_type ? formatStatusLabel(document.related_entity_type) : "-"}</TableCell>
                  </DataGridRow>
                  );
                })}
                {!documents.rows.length ? <TableRow><TableCell colSpan={11}><EmptyState title="No documents found" description="Documents will appear here after PR, PO, GRN, inventory, or approval activity is recorded." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          </BulkSelectionProvider>
          <PaginationControls page={documents.page} totalPages={documents.totalPages} totalRows={documents.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
