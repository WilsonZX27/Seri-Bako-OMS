import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { PriorityBadge } from "@/components/priority-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { WorkflowStatusPipeline } from "@/components/workflow-status-pipeline";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  adminReviewPurchaseRequest,
  approvePurchaseRequest,
  convertPurchaseRequestToPurchaseOrder,
  purchasingReviewPurchaseRequest,
  rejectPurchaseRequest,
  submitPurchaseRequest,
} from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect, getLocationsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrdersForRequest, getPurchaseRequest } from "@/server/queries/procurement";

const prSteps = [
  { key: "draft", label: "Draft", description: "Request is being prepared." },
  { key: "admin_review", label: "Admin Review", description: "Admin checks request completeness." },
  { key: "purchasing_review", label: "Purchasing", description: "Supplier, MOQ, lead time, and cost are checked." },
  { key: "pending_approval", label: "Manager", description: "Manager approval before PO conversion." },
  { key: "approved", label: "Approved", description: "Ready to convert to purchase order." },
  { key: "converted", label: "Converted", description: "Purchase order has been created." },
];

export default async function PurchaseRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ request, lines }, linkedPurchaseOrders, items, suppliers, branches, locations, permissions] = await Promise.all([
    getPurchaseRequest(id),
    getPurchaseOrdersForRequest(id),
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    getLocationsForSelect(),
    getPermissionMap(["pr.submit", "pr.admin_review", "pr.purchasing_review", "pr.manager_approve", "pr.convert_to_po"]),
  ]);
  const documentBundle = request.document_id ? await getDocumentBundle(request.document_id) : null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const branch = branches.find((row) => row.id === request.branch_id);
  const location = locations.find((row) => row.id === request.location_id);
  const total = lines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0);
  const canReject =
    (request.status === "admin_review" && permissions["pr.admin_review"]) ||
    (request.status === "pending_approval" && permissions["pr.manager_approve"]);

  return (
    <>
      <PageHeader title={<DocumentNumber value={request.request_no} />} description="Purchase Request detail and review workflow" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <WorkflowStatusPipeline steps={prSteps} currentStatus={request.status} />

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                  <StatusBadge status={request.status} />
                </div>
                <DocumentActionBar>
                  {request.status === "draft" && permissions["pr.submit"] ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Saving..." variant="secondary">Submit to Admin</DocumentActionForm> : null}
                  {request.status === "admin_review" && permissions["pr.admin_review"] ? <DocumentActionForm action={adminReviewPurchaseRequest.bind(null, request.id)} pendingLabel="Approving..." variant="outline">Admin approve</DocumentActionForm> : null}
                  {request.status === "purchasing_review" && permissions["pr.purchasing_review"] ? <DocumentActionForm action={purchasingReviewPurchaseRequest.bind(null, request.id)} pendingLabel="Saving..." variant="outline">Purchasing verified</DocumentActionForm> : null}
                  {request.status === "pending_approval" && permissions["pr.manager_approve"] ? <DocumentActionForm action={approvePurchaseRequest.bind(null, request.id)} pendingLabel="Approving...">Manager approve</DocumentActionForm> : null}
                  {request.status === "approved" && permissions["pr.convert_to_po"] ? (
                    <DocumentActionForm action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} pendingLabel="Converting...">Convert to Purchase Order</DocumentActionForm>
                  ) : null}
                </DocumentActionBar>
              </div>
              {canReject ? (
                <form action={rejectPurchaseRequest.bind(null, request.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
                  <Input name="remarks" placeholder="Rejection remarks required" required />
                  <SubmitButton type="submit" pendingLabel="Saving..." variant="destructive">Reject</SubmitButton>
                </form>
              ) : null}
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Request Date</p><p className="font-medium">{request.request_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Priority</p><PriorityBadge priority={request.priority} /></div>
                <div><p className="text-xs uppercase text-muted-foreground">Needed By</p><p className="font-medium">{request.needed_by_date ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{branch?.branch_name ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Location</p><p className="font-medium">{location?.location_name ?? "-"}</p></div>
              </div>
              {request.urgency_reason ? <p className="rounded-md border bg-warning/10 p-3 text-sm text-warning">{request.urgency_reason}</p> : null}
              {request.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{request.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Linked Documents</p>
                <h2 className="text-sm font-semibold">Purchase Orders created from this PR</h2>
              </div>
              {linkedPurchaseOrders.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {linkedPurchaseOrders.map((order) => (
                    <Button key={order.id} asChild variant="outline" className="h-auto justify-between p-4">
                      <a href={`/purchase-orders/${order.id}`}>
                        <span className="text-left">
                          <DocumentNumber value={order.po_no} size="sm" />
                          <span className="mt-1 block text-xs text-muted-foreground">{order.supplier_name ?? "Supplier"}</span>
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(order.order_total)}</span>
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border bg-secondary/30 p-3 text-sm text-muted-foreground">
                  {request.status === "approved" ? "No purchase order has been created yet." : "A purchase order link will appear after this PR is approved and converted."}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Requested Items</h2>
                <p className="text-sm font-semibold">{formatCurrency(total)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Supplier Suggestion</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const item = itemById.get(line.item_id);
                      const supplier = line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id) : null;
                      return (
                        <TableRow key={line.id}>
                          <TableCell><p className="font-medium">{item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{item?.item_code}</p></TableCell>
                          <TableCell>{supplier?.name ?? "-"}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.qty)}</TableCell>
                          <TableCell>{line.uom}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.estimated_unit_cost)}</TableCell>
                          <TableCell>{line.reason ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
            </>
          ) : null}
        </div>
        <div className="space-y-5">
          {documentBundle ? (
            <>
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
