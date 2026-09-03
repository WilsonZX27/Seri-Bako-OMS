import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { PriorityBadge } from "@/components/priority-badge";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import { cancelPurchaseOrder, closePurchaseOrder, restorePurchaseOrder, sendPurchaseOrder } from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getCurrentProfile, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getProcurementChainForRequest, getPurchaseOrder, getPurchaseRequestForOrder } from "@/server/queries/procurement";
import { ProcurementChain } from "@/components/procurement/procurement-chain";
import { PhaseOneDeleteAction } from "@/components/phase-one-delete-action";
import { AttachmentRequiredAction } from "@/components/documents/attachment-required-action";
import { detailOrNotFound } from "@/server/queries/detail";

const poSteps = [
  { key: "approved", label: "Ready to Send Supplier", description: "Backfilled AutoCount PO is ready to send." },
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
  const [{ order, lines }, items, suppliers, branches, permissions, profile] = await Promise.all([
    detailOrNotFound(getPurchaseOrder(id)),
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchesForSelect(),
    getPermissionMap(["po.send", "po.receive", "purchase_order.cancel", "purchase_order.close", "documents.attach"]),
    getCurrentProfile(),
  ]);
  const sourceRequest = await getPurchaseRequestForOrder(order.purchase_request_id);
  const procurementChain = sourceRequest ? await getProcurementChainForRequest(sourceRequest.id) : null;
  const isOwner = String(profile?.role_code ?? "").toLowerCase() === "super_admin";
  const fromApprovedPr = Boolean(sourceRequest);
  const documentBundle = order.document_id ? await getDocumentBundle(order.document_id) : null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplier = suppliers.find((row) => row.id === order.supplier_id);
  const branch = branches.find((row) => row.id === order.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0);
  // A PO converted from an approved PR is still unposted work until it is sent.
  // Keep the audited cancellation path available so traceable UAT and operator
  // corrections do not require a hidden database-only cleanup.
  const canCancel = ["draft", "pending_approval", "approved"].includes(order.status) && permissions["purchase_order.cancel"];
  const canClose = ["partial_received", "received"].includes(order.status) && permissions["purchase_order.close"];
  const canRestore = order.status === "cancelled" && order.approval_status === "cancelled" && permissions["purchase_order.cancel"];
  const hasReceivingAttachment = Boolean(documentBundle?.attachments.length);
  const receivingHref = `/goods-receivings/new?po_id=${order.id}`;
  const receivingAction = (label: string) => <AttachmentRequiredAction href={receivingHref} label={label} hasAttachment={hasReceivingAttachment} canUpload={permissions["documents.attach"]}>
    {documentBundle ? <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Delivery Order" description="Attach the supplier Delivery Order before recording receiving." defaultLabel="Delivery Order" uploadLabel="Upload DO" presentation="inline" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} /> : <p className="text-sm text-destructive">The purchase order document is unavailable. Refresh before receiving goods.</p>}
  </AttachmentRequiredAction>;
  const secondaryActions = canCancel || canClose || canRestore ? <div className="space-y-2">{canCancel ? <DocumentActionForm action={cancelPurchaseOrder.bind(null, order.id)} pendingLabel="Cancelling order..." variant="destructive">Cancel purchase order</DocumentActionForm> : null}{canRestore ? <><ConfirmActionForm action={restorePurchaseOrder.bind(null, order.id)} label="Restore purchase order" title={`Restore ${order.po_no}?`} description="The cancelled order will return to its previous unposted workflow state. Restoration is blocked if a replacement PO or downstream record exists." pendingLabel="Restoring..." /><PhaseOneDeleteAction recordType="purchase_order" recordId={order.id} label={order.po_no} /></> : null}{canClose ? <DocumentActionForm action={closePurchaseOrder.bind(null, order.id)} pendingLabel="Closing..." variant="outline">Close purchase order</DocumentActionForm> : null}</div> : null;
  const nextStep = (fromApprovedPr ? convertedPoSteps : poSteps).find((step) => step.key === order.status)?.description;
  const mobilePrimaryAction = order.status === "approved" && permissions["po.send"]
        ? <MobileTaskSheet label="Send to Supplier"><div className="space-y-3">{documentBundle ? <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Supporting Attachments" uploadLabel="Upload" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} /> : null}<DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Sending...">Send to Supplier</DocumentActionForm></div></MobileTaskSheet>
        : ["sent", "partial_received"].includes(order.status) && permissions["po.receive"]
          ? receivingAction("Record Receiving & Attach DO")
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
      tabletRailMode="split"
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={procurementChain?.attachments ?? documentBundle.attachments} title="Purchase files" defaultLabel="Delivery Order" uploadLabel="Upload" canManage={permissions["documents.attach"]} canRemove={isOwner} documentStatus={documentBundle.document.status} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} canRemove={isOwner} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /><RevisionPanel revisions={documentBundle.revisions} /></> : null}
      mobileMoreOptions={secondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : null}
      sidePanel={
        <>
          <DocumentActionSection description="Only the next valid workflow action is shown." moreOptions={secondaryActions}>
            <DocumentActionBar>
              {order.status === "approved" && permissions["po.send"] ? <DocumentActionForm action={sendPurchaseOrder.bind(null, order.id)} pendingLabel="Sending..." mobilePrimary>Send to supplier</DocumentActionForm> : null}
              {["sent", "partial_received"].includes(order.status) && permissions["po.receive"] ? <div data-mobile-primary-action>{receivingAction("Receive goods")}</div> : null}
            </DocumentActionBar>
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep ?? "No further workflow step is available."}</p></DocumentSideSection>
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={procurementChain?.attachments ?? documentBundle.attachments} title="Purchase files" uploadLabel="Upload" canManage={permissions["documents.attach"]} canRemove={isOwner} documentStatus={documentBundle.document.status} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} canRemove={isOwner} />
              <div className="hidden xl:contents"><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /><RevisionPanel revisions={documentBundle.revisions} /></div>
            </>
          ) : null}
        </>
      }
    >
          <Card>
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold">Order Summary</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">AutoCount PO Number</p><p className="font-medium">{order.po_no}</p></div>
                <div className="col-span-2 md:col-span-1"><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{supplier?.name ?? order.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{branch?.branch_name ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Order Date</p><p className="font-medium">{formatDateOnly(order.order_date)}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Expected Delivery</p><p className="font-medium">{formatDateOnly(order.expected_delivery_date, "-")}</p></div>
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
                      <TableHead>Comment</TableHead>
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
                          <TableCell className="max-w-56 text-xs text-muted-foreground">{line.remarks || "—"}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.qty_ordered * line.unit_price)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
              </Table>
              <div className="divide-y divide-[var(--sb-border-soft)] xl:hidden" role="list" aria-label="Ordered items">
                {lines.map((line) => {
                  const item = itemById.get(line.item_id);
                  const pending = line.qty_ordered - line.qty_received - line.qty_cancelled;
                  return <div key={line.id} role="listitem" className="min-w-0 py-3 text-[13px]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{item?.item_name ?? line.item_id}</p><p className="text-[12px] text-muted-foreground">{item?.item_code ?? "No item code"}</p></div><p className="shrink-0 font-semibold">{formatNumber(line.qty_ordered)} {line.uom}</p></div><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted-foreground"><span>Received {formatNumber(line.qty_received)}</span><span>Pending {formatNumber(pending)}</span><span>{formatCurrency(line.unit_price)} / {line.uom}</span></div>{line.remarks ? <p className="mt-1 text-[12px] text-muted-foreground">Comment · {line.remarks}</p> : null}</div>;
                })}
              </div>
            </CardContent>
          </Card>

          {procurementChain ? <ProcurementChain nodes={procurementChain.nodes} /> : <Card><CardContent className="p-4 text-[12px] text-muted-foreground">This purchase order was created directly and has no source purchase request.</CardContent></Card>}

    </DocumentWorkspace>
  );
}
