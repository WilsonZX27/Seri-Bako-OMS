import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { StatusBadge } from "@/components/ui/status-badge";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { PriorityBadge } from "@/components/priority-badge";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { approvePurchaseOrder, cancelPurchaseOrder, closePurchaseOrder, rejectPurchaseOrder, sendPurchaseOrder, submitPurchaseOrder } from "@/server/actions/procurement";
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
    getPermissionMap(["po.submit", "po.approve", "po.send", "po.receive", "purchase_order.cancel", "purchase_order.close", "documents.attach"]),
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
    (["sent", "partial_received"].includes(order.status) && permissions["po.receive"]);
  const canReject = !fromApprovedPr && order.status === "pending_approval" && permissions["po.approve"];
  const canCancel = !fromApprovedPr && ["draft", "pending_approval", "approved"].includes(order.status) && permissions["purchase_order.cancel"];
  const canClose = ["partial_received", "received"].includes(order.status) && permissions["purchase_order.close"];
  const secondaryActions = canCancel || canReject || canClose ? <div className="space-y-2">{canCancel ? <DocumentActionForm action={cancelPurchaseOrder.bind(null, order.id)} pendingLabel="Deleting unposted order..." variant="destructive">Delete unposted order</DocumentActionForm> : null}{canReject ? <DocumentActionForm action={rejectPurchaseOrder.bind(null, order.id)} pendingLabel="Rejecting..." variant="destructive">Reject purchase order</DocumentActionForm> : null}{canClose ? <DocumentActionForm action={closePurchaseOrder.bind(null, order.id)} pendingLabel="Closing..." variant="outline">Close purchase order</DocumentActionForm> : null}</div> : null;
  const nextStep = (fromApprovedPr ? convertedPoSteps : poSteps).find((step) => step.key === order.status)?.description;
  const mobilePrimaryAction = !fromApprovedPr && order.status === "draft" && permissions["po.submit"]
    ? <DocumentActionForm action={submitPurchaseOrder.bind(null, order.id)} pendingLabel="Submitting...">Submit Purchase Order</DocumentActionForm>
    : !fromApprovedPr && order.status === "pending_approval" && permissions["po.approve"]
      ? <ConfirmActionForm action={approvePurchaseOrder.bind(null, order.id)} label="Approve as Manager" title="Approve this purchase order as Manager?" description="This makes the purchase order ready to send to the supplier." pendingLabel="Approving..." mobilePrimary />
      : order.status === "approved" && permissions["po.send"]
        ? <MobileTaskSheet label="Send to Supplier"><div className="space-y-3">{documentBundle ? <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Purchase Order file" description="Attach the AutoCount or supplier-facing PO before sending." defaultLabel="Purchase Order" uploadLabel="Attach Purchase Order" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} /> : null}<DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Sending...">Send to Supplier</DocumentActionForm></div></MobileTaskSheet>
        : ["sent", "partial_received"].includes(order.status) && permissions["po.receive"]
          ? <DocumentActionLink href={`/goods-receivings/new?po_id=${order.id}`}>Record Receiving &amp; Attach DO</DocumentActionLink>
          : null;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Orders", href: "/purchase-orders" }, { label: order.po_no }]}
      documentNo={order.po_no}
      title="Purchase Order"
      status={order.status}
      priority={order.priority}
      workflowSteps={fromApprovedPr ? convertedPoSteps : poSteps}
      currentStatus={order.status}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Purchase Order files" canManage={false} documentStatus={documentBundle.document.status} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={secondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : null}
      sidePanel={
        <>
          <DocumentActionSection description="Only the next valid workflow action is shown." moreOptions={secondaryActions}>
            <DocumentActionBar>
              {!fromApprovedPr && order.status === "draft" && permissions["po.submit"] ? <DocumentActionForm action={submitPurchaseOrder.bind(null, order.id)} pendingLabel="Submitting...">Submit approval</DocumentActionForm> : null}
              {!fromApprovedPr && order.status === "pending_approval" && permissions["po.approve"] ? (
                <ConfirmActionForm action={approvePurchaseOrder.bind(null, order.id)} label="Approve as Manager" title="Approve this purchase order as Manager?" description="This makes the purchase order ready to send to the supplier." pendingLabel="Approving..." mobilePrimary />
              ) : null}
              {order.status === "approved" && permissions["po.send"] ? <DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Sending..." mobilePrimary>Send to supplier</DocumentActionForm> : null}
              {["sent", "partial_received"].includes(order.status) && permissions["po.receive"] ? <div data-mobile-primary-action><DocumentActionLink href={`/goods-receivings/new?po_id=${order.id}`} variant="outline">Receive goods</DocumentActionLink></div> : null}
            </DocumentActionBar>
            {!hasPrimaryAction ? <p className="text-sm text-muted-foreground">You can view this document, but there is no workflow action available for your role or this status.</p> : null}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep ?? "No further workflow step is available."}</p></DocumentSideSection>
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Purchase Order Attachment" description="Attach the AutoCount or supplier-facing PO during preparation and sending." defaultLabel="Purchase Order" uploadLabel="Attach Purchase Order" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
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
                <div><p className="text-xs uppercase text-muted-foreground">AutoCount PO Number</p><p className="font-medium">{order.po_no}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{supplier?.name ?? order.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{branch?.branch_name ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Order Date</p><p className="font-medium">{formatDateOnly(order.order_date)}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Expected Delivery</p><p className="font-medium">{formatDateOnly(order.expected_delivery_date, "-")}</p></div>
                {!fromApprovedPr ? <div><p className="text-xs uppercase text-muted-foreground">Approval</p><StatusBadge status={order.approval_status} /></div> : null}
                <div><p className="text-xs uppercase text-muted-foreground">Priority</p><PriorityBadge priority={order.priority} /></div>
                <div><p className="text-xs uppercase text-muted-foreground">Needed By</p><p className="font-medium">{formatDateOnly(order.needed_by_date, "-")}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Source Document</p><p className="font-medium">{sourceRequest?.request_no ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Production Risk</p><p className="font-medium">{order.production_risk ? "Yes" : "No"}</p></div>
              </div>
              {order.urgency_reason ? <p className="rounded-md border bg-warning/10 p-3 text-sm text-warning">{order.urgency_reason}</p> : null}
              {order.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{order.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Ordered Items</h2>
                <p className="text-sm font-semibold">{formatCurrency(total)}</p>
              </div>
              <Table mobileHidden aria-label="Ordered items">
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
              <div className="divide-y divide-[var(--sb-border-soft)] md:hidden" role="list" aria-label="Ordered items">
                {lines.map((line) => {
                  const item = itemById.get(line.item_id);
                  const pending = line.qty_ordered - line.qty_received - line.qty_cancelled;
                  return <div key={line.id} role="listitem" className="min-w-0 py-3 text-[13px]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{item?.item_name ?? line.item_id}</p><p className="text-[12px] text-muted-foreground">{item?.item_code ?? "No item code"}</p></div><p className="shrink-0 font-semibold">{formatNumber(line.qty_ordered)} {line.uom}</p></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground"><span>Received {formatNumber(line.qty_received)}</span><span>Pending {formatNumber(pending)}</span><span>{formatCurrency(line.unit_price)} / {line.uom}</span></div></div>;
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div>
                <p className="text-[12px] text-muted-foreground">Linked document</p>
                <h2 className="text-[14px] font-semibold">Purchase Request</h2>
              </div>
              {sourceRequest ? (
                <Button asChild variant="outline" className="h-auto min-w-0 justify-between gap-2 p-3">
                  <a href={`/purchase-requests/${sourceRequest.id}`}>
                    <span className="min-w-0 text-left">
                      <DocumentNumber value={sourceRequest.request_no} size="sm" className="max-w-full break-all" />
                      <span className="block truncate text-[12px] text-muted-foreground">Created the purchase order workflow</span>
                    </span>
                    <StatusBadge status={sourceRequest.status} />
                  </a>
                </Button>
              ) : (
                <p className="bg-secondary/30 p-3 text-[12px] text-muted-foreground">This purchase order was created directly and has no source purchase request.</p>
              )}
            </CardContent>
          </Card>

    </DocumentWorkspace>
  );
}
