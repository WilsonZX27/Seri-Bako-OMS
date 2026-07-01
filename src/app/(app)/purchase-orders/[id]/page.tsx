import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { approvePurchaseOrder, cancelPurchaseOrder, closePurchaseOrder, sendPurchaseOrder, submitPurchaseOrder } from "@/server/actions/procurement";
import { getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrder } from "@/server/queries/procurement";

function statusVariant(status: string) {
  if (["approved", "sent", "received", "closed"].includes(status)) return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ order, lines }, items, suppliers] = await Promise.all([getPurchaseOrder(id), getItemsForSelect(), getSuppliersForSelect()]);
  const documentBundle = order.document_id ? await getDocumentBundle(order.document_id) : null;
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplier = suppliers.find((row) => row.id === order.supplier_id);
  const total = lines.reduce((sum, line) => sum + line.qty_ordered * line.unit_price, 0);

  return (
    <>
      <PageHeader title={order.po_no} description="Purchase Order detail and approval workflow" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                  <Badge className="mt-1" variant={statusVariant(order.status)}>{order.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={submitPurchaseOrder.bind(null, order.id)}><Button type="submit" variant="secondary">Submit approval</Button></form>
                  <form action={approvePurchaseOrder.bind(null, order.id)}><Button type="submit">Approve</Button></form>
                  <form action={sendPurchaseOrder.bind(null, order.id)}><Button type="submit" variant="outline">Send to supplier</Button></form>
                  {["approved", "sent", "partial_received"].includes(order.status) ? <Button asChild variant="outline"><a href={`/goods-receivings/new?po_id=${order.id}`}>Receive goods</a></Button> : null}
                  <form action={cancelPurchaseOrder.bind(null, order.id)}><Button type="submit" variant="ghost">Cancel</Button></form>
                  <form action={closePurchaseOrder.bind(null, order.id)}><Button type="submit" variant="outline">Close</Button></form>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{supplier?.name ?? order.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Order Date</p><p className="font-medium">{order.order_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Expected Delivery</p><p className="font-medium">{order.expected_delivery_date ?? "-"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Approval</p><Badge className="mt-1" variant={statusVariant(order.approval_status)}>{order.approval_status}</Badge></div>
              </div>
              {order.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{order.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Purchase Order Lines</h2>
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
              <ApprovalPanel document={documentBundle.document} approval={documentBundle.approval} approvalSteps={documentBundle.approvalSteps} />
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
