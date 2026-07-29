import { Pencil } from "lucide-react";
import { BulkSelectAllCheckbox, BulkSelectionProvider, BulkSelectRowCheckbox } from "@/components/bulk-selection";
import { DataGridRow } from "@/components/ui/data-grid-row";
import { DataGridHint } from "@/components/ui/data-grid-hint";
import { DocumentNumber } from "@/components/document-number";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar } from "@/components/ui/filter-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectControl } from "@/components/ui/select-control";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { StatusTabs } from "@/components/status-tabs";
import { OperationalList, OperationalListRow, Table, TableActionLink, TableBody, TableCell, TableHead, TableHeader, TableRow, TableSelectionCell, TableSelectionHead } from "@/components/ui/table";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { getCanonicalDocumentHref } from "@/lib/document-routing";
import { formatStatusLabel } from "@/lib/status-label";
import { hasActiveFilters } from "@/lib/table-state";
import type { DocumentRow } from "@/server/queries/documents";
import { getDocuments } from "@/server/queries/documents";

function getDocumentStageLabel(document: DocumentRow) {
  if (["rejected", "cancelled"].includes(document.status)) return document.status;
  if (["approved", "posted", "completed", "closed", "converted"].includes(document.status)) return document.status;
  if (document.current_step && ["pending_approval", "submitted"].includes(document.status)) {
    const normalizedStep = document.current_step.toLowerCase().replaceAll(" ", "_");
    const stepMap: Record<string, string> = {
      admin_review: "admin_review",
      purchasing_review: "purchasing_review",
      manager_approval: "manager_approval",
      draft_receiving: "draft_receiving",
      "manager_approval_required": "manager_approval",
    };
    return stepMap[normalizedStep] ?? normalizedStep;
  }
  return "draft";
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const documents = await getDocuments(filters);
  const filtered = hasActiveFilters(filters);

  return (
    <>
      <PageHeader title="Documents Register" description="Audit-ready register for document status, approvals, attachments, revisions, and timelines." />
      <WorkspaceGrid className="p-3 sm:p-4">
        <div className="overflow-hidden rounded-[2px] border bg-card">
          <FilterBar resultCount={documents.totalRows} resetHref="/documents" filtered={filtered}>
            <Input name="search" defaultValue={filters.search ?? ""} placeholder="Search document no, title, type" />
            <StatusTabs statuses={[
              { value: "draft", label: "Draft" },
              { value: "pending_approval", label: "In Review" },
              { value: "approved", label: "Approved" },
              { value: "posted", label: "Posted" },
              { value: "rejected", label: "Rejected" },
              { value: "closed", label: "Completed" },
            ]} activeStatus={filters.status} />
            <SelectControl name="document_type" defaultValue={filters.document_type ?? "all"} ariaLabel="Document type" options={[
              { value: "all", label: "All document types" },
              { value: "purchase_request", label: "Purchase Request" },
              { value: "purchase_order", label: "Purchase Order" },
              { value: "goods_receiving", label: "Goods Receiving" },
              { value: "stock_count", label: "Stock Count" },
              { value: "stock_transfer", label: "Stock Transfer" },
              { value: "stock_wastage", label: "Stock Wastage" },
              { value: "supplier_invoice", label: "Supplier Invoice" },
              { value: "payment_schedule", label: "Payment Schedule" },
            ]} />
            {filters.status ? <input type="hidden" name="status" value={filters.status} /> : null}
            <Button type="submit" variant="secondary">Filter</Button>
          </FilterBar>
          <BulkSelectionProvider ids={documents.rows.map((document) => document.id)} actionLabel="Archive selected" actionHint="Documents with history are not hard deleted. Open selected documents to use workflow-safe actions.">
          <DataGridHint text="Pro-tip: Double-click any row to open the document." />
            <Table mobileHidden aria-label="Documents register" stickyColumn="third">
              <TableHeader>
                <TableRow>
                  <TableSelectionHead><BulkSelectAllCheckbox /></TableSelectionHead>
                  <TableHead className="w-12 text-center">Action</TableHead>
                  <SortableHead label="Doc No" column="document_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Type" column="document_type" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Stage</TableHead>
                  <TableHead>Created By</TableHead>
                  <SortableHead label="Created" column="created_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Updated" column="updated_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.rows.map((document) => {
                  const href = getCanonicalDocumentHref(document);
                  return (
                  <DataGridRow key={document.id} href={href}>
                      <TableSelectionCell>
                        <BulkSelectRowCheckbox id={document.id} />
                      </TableSelectionCell>
                    <TableCell className="text-center"><TableActionLink href={href} label={`Open ${document.document_no}`}><Pencil className="h-4 w-4" /></TableActionLink></TableCell>
                    <TableCell><DocumentNumber value={document.document_no} size="sm" /></TableCell>
                    <TableCell>{formatStatusLabel(document.document_type)}</TableCell>
                    <TableCell><StatusBadge status={getDocumentStageLabel(document)} /></TableCell>
                    <TableCell>{document.created_by_name ?? "Unknown user"}</TableCell>
                    <TableCell>{new Date(document.created_at).toLocaleDateString("en-MY")}</TableCell>
                    <TableCell>{new Date(document.updated_at).toLocaleDateString("en-MY")}</TableCell>
                  </DataGridRow>
                  );
                })}
                {!documents.rows.length ? <TableRow><TableCell colSpan={7}><EmptyState title="No documents found" description="Documents will appear here after PR, PO, GRN, inventory, or approval activity is recorded." /></TableCell></TableRow> : null}
              </TableBody>
            </Table>
            <OperationalList ariaLabel="Documents register">
              {documents.rows.map((document) => {
                const href = getCanonicalDocumentHref(document);
                return <OperationalListRow key={document.id} href={href} label={`Open ${document.document_no}`} primary={<DocumentNumber value={document.document_no} size="sm" />} status={<StatusBadge status={getDocumentStageLabel(document)} />} secondary={`${formatStatusLabel(document.document_type)} · ${document.created_by_name ?? "Unknown user"}`} meta={new Date(document.updated_at).toLocaleDateString("en-MY")} />;
              })}
              {!documents.rows.length ? <EmptyState title="No documents found" description="Documents will appear here after PR, PO, GRN, inventory, or approval activity is recorded." action={filtered ? { href: "/documents", label: "Reset filters" } : undefined} /> : null}
            </OperationalList>
          </BulkSelectionProvider>
          <PaginationControls page={documents.page} totalPages={documents.totalPages} totalRows={documents.totalRows} searchParams={filters} />
        </div>
      </WorkspaceGrid>
    </>
  );
}
