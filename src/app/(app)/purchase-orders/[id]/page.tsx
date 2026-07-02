import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { PriorityBadge } from "@/components/priority-badge";
import { WorkflowStatusPipeline } from "@/components/workflow-status-pipeline";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { approvePurchaseOrder, closePurchaseOrder, rejectPurchaseOrder, sendPurchaseOrder, submitPurchaseOrder } from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrder, getPurchaseRequestForOrder } from "@/server/queries/procurement";

function statusVariant(status: string) {
  if (["approved", "sent", "received", "closed"].includes(status)) return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

const poSteps = [
  { key: "draft", label: "Draft", description: "Order is being prepared." },
  { key: "pending_approval", label: "Approval", description: "Waiting for approval." },
  { key: "approved", label: "Approved", description: "Ready to send to supplier." },
  { key: "sent", label: "Sent", description: "Supplier has received the order." },
  { key: "partial_received", label: "Receiving", description: "Some lines have been received." },
  { key: "received", label: "Received", description: "All goods received." },
  { key: "closed", label: "Closed", description: "Order is complete." },
];

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ order, lines }, items, suppliers, permissions] = await Promise.all([
    getPurchaseOrder(id),
    getItemsForSelect(),
    getSuppliersForSelect(),
    getPermissionMap(["po.submit", "po.approve", "po.send", "po.receive", "purchase_order.close"]),
  ]);
  const sourceRequest = await getPurchaseRequestForOrder(order.purchase_request_id);
  const documentBundle = order.document_id ? await getDocumentBundle(order.document_id) : null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplier = suppliers.find((row) => row.id === order.supplier_id);
  const total = lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0);

  return (
    <>
      <PageHeader title={<DocumentNumber value={order.po_no} />} description="Purchase Order detail and approval workflow" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <WorkflowStatusPipeline steps={poSteps} currentStatus={order.status} />

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                  <Badge className="mt-1" variant={statusVariant(order.status)}>{order.status}</Badge>
                </div>
                <DocumentActionBar>
                  {order.status === "draft" && permissions["po.submit"] ? <DocumentActionForm action={submitPurchaseOrder.bind(null, order.id)} pendingLabel="Saving..." variant="secondary">Submit approval</DocumentActionForm> : null}
                  {order.status === "pending_approval" && permissions["po.approve"] ? (
                    <>
                      <DocumentActionForm action={approvePurchaseOrder.bind(null, order.id)} pendingLabel="Approving...">Approve</DocumentActionForm>
                      <DocumentActionForm action={rejectPurchaseOrder.bind(null, order.id)} pendingLabel="Saving..." variant="destructive">Reject</DocumentActionForm>
                    </>
                  ) : null}
                  {order.status === "approved" && permissions["po.send"] ? <DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Saving..." variant="outline">Send to supplier</DocumentActionForm> : null}
                  {["sent", "partial_received"].includes(order.status) && permissions["po.receive"] ? <DocumentActionLink href={`/goods-receivings/new?po_id=${order.id}`} variant="outline">Receive goods</DocumentActionLink> : null}
                  {order.status === "partial_received" && permissions["purchase_order.close"] ? <DocumentActionForm action={closePurchaseOrder.bind(null, order.id)} pendingLabel="Saving..." variant="outline">Close</DocumentActionForm> : null}
                </DocumentActionBar>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{supplier?.name ?? order.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Order Date</p><p className="font-medium">{order.order_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Expected Delivery</p><p className="font-medium">{order.expected_delivery_date ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Approval</p><Badge className="mt-1" variant={statusVariant(order.approval_status)}>{order.approval_status}</Badge></div>
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
                      <span className="block font-semibold">{sourceRequest.request_no}</span>
                      <span className="block text-xs text-muted-foreground">Created the purchase order workflow</span>
                    </span>
                    <Badge variant={statusVariant(sourceRequest.status)}>{sourceRequest.status}</Badge>
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
