import Link from "next/link";
import { ClipboardCheck, FileText, PackageCheck, Paperclip, ShoppingCart, Warehouse, Factory } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { SelectNative } from "@/components/ui/select-native";
import { PaginationControls, SortableHead } from "@/components/sortable-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkspaceQuickInsights, WorkspaceSectionPanel, type WorkspaceInsight, type WorkspaceSection } from "@/components/workspace-panels";
import { getDocuments } from "@/server/queries/documents";

function statusVariant(status: string) {
  if (["approved", "posted", "closed"].includes(status)) return "success";
  if (["rejected", "cancelled"].includes(status)) return "danger";
  return "secondary";
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const filters = await searchParams;
  const documents = await getDocuments(filters);
  const hasActiveFilters = Boolean(
    filters.search
      || (filters.document_type && filters.document_type !== "all")
      || (filters.status && filters.status !== "all")
      || (filters.approval_status && filters.approval_status !== "all")
      || filters.sort
      || filters.page,
  );
  const documentInsights: WorkspaceInsight[] = [
    { label: "Total Documents", value: documents.totalRows, icon: FileText, theme: "neutral" },
    { label: "Pending Approval", value: 0, icon: ClipboardCheck, theme: "amber" },
    { label: "Posted Documents", value: 0, icon: Paperclip, theme: "green" },
    { label: "Audit Reviews", value: 0, icon: ClipboardCheck, theme: "blue" },
  ];
  const documentSections: WorkspaceSection[] = [
    {
      title: "Purchase Documents",
      description: "Purchase requests, purchase orders, and supplier receiving documents.",
      icon: ShoppingCart,
      theme: "amber",
      actions: [
        { href: "/documents?document_type=purchase_request", title: "Purchase Requests", description: "Review purchase request documents and approvals.", icon: ClipboardCheck, recommendedFor: "purchasing" },
        { href: "/documents?document_type=purchase_order", title: "Purchase Orders", description: "Review supplier order documents and status.", icon: ShoppingCart, recommendedFor: "purchasing and finance" },
        { href: "/documents?document_type=goods_receiving", title: "Goods Receiving", description: "Review posted and draft receiving documents.", icon: PackageCheck, recommendedFor: "receiving and finance" },
      ],
    },
    {
      title: "Inventory Documents",
      description: "Stock counts, transfers, wastage, and stock movement documents.",
      icon: Warehouse,
      theme: "teal",
      actions: [
        { href: "/documents?document_type=stock_count", title: "Stock Counts", description: "Review stock count documents and approvals.", icon: ClipboardCheck, recommendedFor: "operations" },
        { href: "/documents?document_type=stock_transfer", title: "Stock Transfers", description: "Review branch transfer documents.", icon: Warehouse, recommendedFor: "operations" },
        { href: "/documents?document_type=stock_wastage", title: "Stock Wastage", description: "Review wastage documents and exception handling.", icon: Paperclip, recommendedFor: "managers" },
      ],
    },
    {
      title: "Production Documents",
      description: "Production job documents will appear as Sprint 7 workflows are enabled.",
      icon: Factory,
      theme: "green",
      actions: [
        { href: "/documents?document_type=production_job", title: "Production Jobs", description: "Production document workflow is coming soon.", icon: Factory, recommendedFor: "kitchen", badge: "Coming soon", disabled: true },
      ],
    },
    {
      title: "Approvals / Audit",
      description: "Approval queues, posted documents, and complete document register.",
      icon: FileText,
      theme: "blue",
      actions: [
        { href: "/documents?approval_status=pending", title: "Pending Approvals", description: "Open documents waiting for review.", icon: ClipboardCheck, recommendedFor: "managers" },
        { href: "/documents?status=posted", title: "Posted Documents", description: "Review completed documents and attachments.", icon: Paperclip, recommendedFor: "finance" },
        { href: "/documents", title: "All Documents", description: "Search the complete document register.", icon: FileText, recommendedFor: "finance and admin" },
      ],
    },
  ];

  return (
    <>
      <PageHeader title="Document Center" description="Reusable document control for approvals, attachments, comments, revisions, and timelines." />
      <div className="space-y-5 p-5">
        {!hasActiveFilters ? (
          <>
            <WorkspaceQuickInsights insights={documentInsights} />
            <div className="grid gap-5 xl:grid-cols-2">
              {documentSections.map((section) => (
                <WorkspaceSectionPanel key={section.title} section={section} />
              ))}
            </div>
          </>
        ) : null}
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="border-b p-4">
            <p className="sb-section-label">Document Register</p>
            <h2 className="mt-1 text-lg font-semibold">Filtered document list</h2>
          </div>
          <form className="grid gap-3 border-b p-4 md:grid-cols-5">
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead label="Document No" column="document_no" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Type" column="document_type" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Title" column="title" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Status" column="status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Approval" column="approval_status" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Created By</TableHead>
                  <SortableHead label="Created" column="created_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <SortableHead label="Updated" column="updated_at" currentSort={filters.sort} currentDir={filters.dir} searchParams={filters} />
                  <TableHead>Current Step</TableHead>
                  <TableHead>Related Entity</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.rows.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.document_no}</TableCell>
                    <TableCell>{document.document_type.replaceAll("_", " ")}</TableCell>
                    <TableCell>{document.title}</TableCell>
                    <TableCell><Badge variant={statusVariant(document.status)}>{document.status}</Badge></TableCell>
                    <TableCell><Badge variant={statusVariant(document.approval_status)}>{document.approval_status}</Badge></TableCell>
                    <TableCell>{document.created_by_name ?? document.created_by ?? "-"}</TableCell>
                    <TableCell>{new Date(document.created_at).toLocaleDateString("en-MY")}</TableCell>
                    <TableCell>{new Date(document.updated_at).toLocaleDateString("en-MY")}</TableCell>
                    <TableCell>{document.current_step ?? "-"}</TableCell>
                    <TableCell>{document.related_entity_type ? `${document.related_entity_type} / ${document.related_entity_id ?? "-"}` : "-"}</TableCell>
                    <TableCell className="text-right"><Button asChild variant="outline" size="sm"><Link href={`/documents/${document.id}`}>View</Link></Button></TableCell>
                  </TableRow>
                ))}
                {!documents.rows.length ? <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground">No documents found.</TableCell></TableRow> : null}
              </TableBody>
            </Table>
          </div>
          <PaginationControls page={documents.page} totalPages={documents.totalPages} totalRows={documents.totalRows} searchParams={filters} />
        </div>
      </div>
    </>
  );
}
