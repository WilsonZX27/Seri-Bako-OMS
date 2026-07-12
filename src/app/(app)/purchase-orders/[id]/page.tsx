import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { PriorityBadge } from "@/components/priority-badge";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { approvePurchaseOrder, closePurchaseOrder, rejectPurchaseOrder, sendPurchaseOrder, submitPurchaseOrder } from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrder, getPurchaseRequestForOrder } from "@/server/queries/procurement";

const poSteps = [
  { key: "draft", label: "Draft", description: "Order is being prepared." },
  { key: "pending_approval", label: "Approval", description: "Waiting for approval." },
  { key: "approved", label: "Approved", description: "Ready to send to supplier." },
  { key: "sent", label: "Sent", description: "Supplier has received the order." },
  { key: "partial_received", label: "Receiving", description: "Some lines have been received." },
  { key: "received", label: "Received", description: "All goods received." },
  { key: "closed", label: "Closed", description: "Order is complete." },
];

const convertedPoSteps = [
  { key: "approved", label: "Ready to Send Supplier", description: "Approved PR has become a supplier PO." },
  { key: "sent", label: "Sent to Supplier", description: "Supplier has received the order." },
  { key: "partial_received", label: "Receiving", description: "Goods receiving is in progress." },
  { key: "received", label: "Received", description: "All goods received." },
  { key: "closed", label: "Closed", description: "Order is complete." },
];

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ order, lines }, items, suppliers, branches, permissions] = await Promise.all([
    getPurchaseOrder(id),
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    getPermissionMap(["po.submit", "po.approve", "po.send", "po.receive", "purchase_order.close"]),
  ]);
  const sourceRequest = await getPurchaseRequestForOrder(order.purchase_request_id);
  const fromApprovedPr = Boolean(sourceRequest);
  const documentBundle = order.document_id ? await getDocumentBundle(order.document_id) : null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplier = suppliers.find((row) => row.id === order.supplier_id);
  const branch = branches.find((row) => row.id === order.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0);
  const hasPrimaryAction =
    (!fromApprovedPr && order.status === "draft" && permissions["po.submit"]) ||
    (!fromApprovedPr && order.status === "pending_approval" && permissions["po.approve"]) ||
    (order.status === "approved" && permissions["po.send"]) ||
    (["sent", "partial_received"].includes(order.status) && permissions["po.receive"]) ||
    (order.status === "partial_received" && permissions["purchase_order.close"]);

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Orders", href: "/purchase-orders" }, { label: order.po_no }]}
      documentNo={order.po_no}
      title="Purchase Order"
      status={order.status}
      priority={order.priority}
      workflowSteps={fromApprovedPr ? convertedPoSteps : poSteps}
      currentStatus={order.status}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Only the next valid workflow action is shown.">
            <DocumentActionBar>
              {!fromApprovedPr && order.status === "draft" && permissions["po.submit"] ? <DocumentActionForm action={submitPurchaseOrder.bind(null, order.id)} pendingLabel="Submitting..." variant="secondary">Submit approval</DocumentActionForm> : null}
              {!fromApprovedPr && order.status === "pending_approval" && permissions["po.approve"] ? (
                <>
                  <DocumentActionForm action={approvePurchaseOrder.bind(null, order.id)} pendingLabel="Approving...">Approve</DocumentActionForm>
                  <DocumentActionForm action={rejectPurchaseOrder.bind(null, order.id)} pendingLabel="Rejecting..." variant="destructive">Reject</DocumentActionForm>
                </>
              ) : null}
              {order.status === "approved" && permissions["po.send"] ? <DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Sending..." variant="outline">Send to supplier</DocumentActionForm> : null}
              {["sent", "partial_received"].includes(order.status) && permissions["po.receive"] ? <DocumentActionLink href={`/goods-receivings/new?po_id=${order.id}`} variant="outline">Receive goods</DocumentActionLink> : null}
              {order.status === "partial_received" && permissions["purchase_order.close"] ? <DocumentActionForm action={closePurchaseOrder.bind(null, order.id)} pendingLabel="Closing..." variant="outline">Close</DocumentActionForm> : null}
            </DocumentActionBar>
            {!hasPrimaryAction ? <p className="text-sm text-muted-foreground">You can view this document, but there is no workflow action available for your role or this status.</p> : null}
          </DocumentSideSection>
          {documentBundle ? (
            <>
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold">Order Summary</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{supplier?.name ?? order.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{branch?.branch_name ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Order Date</p><p className="font-medium">{order.order_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Expected Delivery</p><p className="font-medium">{order.expected_delivery_date ?? "-"}</p></div>
                {!fromApprovedPr ? <div><p className="text-xs uppercase text-muted-foreground">Approval</p><StatusBadge status={order.approval_status} /></div> : null}
                <div><p className="text-xs uppercase text-muted-foreground">Priority</p><PriorityBadge priority={order.priority} /></div>
                <div><p className="text-xs uppercase text-muted-foreground">Needed By</p><p className="font-medium">{order.needed_by_date ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Source Document</p><p className="font-medium">{sourceRequest?.request_no ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Production Risk</p><p className="font-medium">{order.production_risk ? "Yes" : "No"}</p></div>
              </div>
              {order.urgency_reason ? <p className="rounded-md border bg-warning/10 p-3 text-sm text-warning">{order.urgency_reason}</p> : null}
              {order.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{order.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Source Document</p>
                <h2 className="text-sm font-semibold">Purchase Request link</h2>
              </div>
              {sourceRequest ? (
                <Button asChild variant="outline" className="h-auto justify-between p-4">
                  <a href={`/purchase-requests/${sourceRequest.id}`}>
                    <span className="text-left">
                      <DocumentNumber value={sourceRequest.request_no} size="sm" />
                      <span className="block text-xs text-muted-foreground">Created the purchase order workflow</span>
                    </span>
                    <StatusBadge status={sourceRequest.status} />
                  </a>
                </Button>
              ) : (
                <p className="rounded-md border bg-secondary/30 p-3 text-sm text-muted-foreground">This purchase order was created directly and has no source purchase request.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Ordered Items</h2>
                <p className="text-sm font-semibold">{formatCurrency(total)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Cancelled</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const item = itemById.get(line.item_id);
                      const pending = line.qty_ordered - line.qty_received - line.qty_cancelled;
                      return (
                        <TableRow key={line.id}>
                          <TableCell><p className="font-medium">{item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{item?.item_code}</p></TableCell>
                          <TableCell className="text-right">{formatNumber(line.qty_ordered)}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.qty_received)}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.qty_cancelled)}</TableCell>
                          <TableCell className="text-right font-medium">{formatNumber(pending)}</TableCell>
                          <TableCell>{line.uom}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.unit_price)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.qty_ordered * line.unit_price)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {documentBundle ? (
            <p className="rounded-md border bg-secondary/30 p-3 text-sm text-muted-foreground">Comments, attachments, timeline, and revision history are available in the right panel.</p>
          ) : null}
    </DocumentWorkspace>
  );
}
