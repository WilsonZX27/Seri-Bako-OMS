import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { ApprovalPanel, AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { cancelGoodsReceiving, postGoodsReceiving } from "@/server/actions/goods-receivings";
import { getDocumentBundle } from "@/server/queries/documents";
import { getGoodsReceiving } from "@/server/queries/goods-receivings";

function statusVariant(status: string) {
  if (status === "posted") return "success";
  if (status === "cancelled") return "danger";
  return "secondary";
}

export default async function GoodsReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { receiving, lines } = await getGoodsReceiving(id);
  const documentBundle = receiving.document_id ? await getDocumentBundle(receiving.document_id) : null;
  const totalReceivedValue = lines.reduce((sum, line) => sum + line.received_qty * line.unit_cost, 0);
  const hasRejected = lines.some((line) => line.rejected_qty > 0);
  const hasDeliveryOrder = Boolean(documentBundle?.attachments.some((attachment) => attachment.status === "active"));
  const receivingDisplay = receiving as typeof receiving & { supplier_name?: string | null; location_name?: string | null };

  return (
    <>
      <PageHeader title={receiving.grn_no} description="Goods Receiving Note detail and posting workflow" />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                  <Badge className="mt-1" variant={statusVariant(receiving.status)}>{receiving.status}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline"><Link href={`/purchase-orders/${receiving.purchase_order_id}`}>View PO</Link></Button>
                  {receiving.status === "draft" ? (
                    <>
                      <form action={postGoodsReceiving.bind(null, receiving.id)}><Button type="submit">Post to stock</Button></form>
                      <form action={cancelGoodsReceiving.bind(null, receiving.id)}><Button type="submit" variant="ghost">Cancel</Button></form>
                    </>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{receivingDisplay.supplier_name ?? receiving.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Date</p><p className="font-medium">{receiving.received_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Location</p><p className="font-medium">{receivingDisplay.location_name ?? receiving.location_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Value</p><p className="font-medium">{formatCurrency(totalReceivedValue)}</p></div>
              </div>
              {!hasDeliveryOrder && receiving.status === "draft" ? (
                <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Delivery Order attachment is required before posting.
                </div>
              ) : null}
              {hasRejected ? (
                <div className="flex gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This GRN contains rejected quantity. Rejected quantity does not increase stock.
                </div>
              ) : null}
              {receiving.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{receiving.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">GRN Lines</h2>
                <p className="text-sm font-semibold">{formatCurrency(totalReceivedValue)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Previously Received</TableHead>
                      <TableHead className="text-right">Pending</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Rejected</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead>Batch / Expiry</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Stock Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => (
                      <TableRow key={line.id}>
                        <TableCell>
                          <p className="font-medium">{line.item?.item_name ?? line.item_id}</p>
                          <p className="text-xs text-muted-foreground">{line.item?.item_code ?? "-"}</p>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(line.ordered_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(line.previously_received_qty)}</TableCell>
                        <TableCell className="text-right">{formatNumber(line.pending_qty)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(line.received_qty)}</TableCell>
                        <TableCell className="text-right">{line.rejected_qty > 0 ? <span className="font-medium text-destructive">{formatNumber(line.rejected_qty)}</span> : formatNumber(0)}</TableCell>
                        <TableCell>{line.uom}</TableCell>
                        <TableCell><p>{line.batch_no ?? "-"}</p><p className="text-xs text-muted-foreground">{line.expiry_date ?? ""}</p></TableCell>
                        <TableCell className="text-right">{formatCurrency(line.unit_cost)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(line.received_qty * line.unit_cost)}</TableCell>
                      </TableRow>
                    ))}
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
