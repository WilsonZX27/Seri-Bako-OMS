import { AlertTriangle } from "lucide-react";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { postGoodsReceiving } from "@/server/actions/goods-receivings";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getGoodsReceiving } from "@/server/queries/goods-receivings";

const grnSteps = [
  { key: "draft", label: "Draft", description: "Receiving is being checked." },
  { key: "posted", label: "Posted", description: "Stock has been posted to inventory." },
  { key: "cancelled", label: "Cancelled", description: "Receiving was cancelled before posting." },
];

export default async function GoodsReceivingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ receiving, lines }, permissions] = await Promise.all([
    getGoodsReceiving(id),
    getPermissionMap(["grn.post"]),
  ]);
  const documentBundle = receiving.document_id ? await getDocumentBundle(receiving.document_id) : null;
  const totalReceivedValue = lines.reduce((sum, line) => sum + line.received_qty * line.unit_cost, 0);
  const hasRejected = lines.some((line) => line.rejected_qty > 0);
  const hasDeliveryOrder = Boolean(documentBundle?.attachments.some((attachment) => attachment.status === "active"));
  const receivingDisplay = receiving as typeof receiving & { supplier_name?: string | null; location_name?: string | null };
  const hasPrimaryAction = permissions["grn.post"] && receiving.status === "draft";

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Goods Receiving", href: "/goods-receivings" }, { label: receiving.grn_no }]}
      documentNo={receiving.grn_no}
      title="Goods Receiving"
      status={receiving.status}
      workflowSteps={grnSteps}
      currentStatus={receiving.status}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Post after receiving details are checked. Attachments can be added for audit support.">
            <DocumentActionBar>
              <DocumentActionLink href={`/purchase-orders/${receiving.purchase_order_id}`} variant="outline">View PO</DocumentActionLink>
              {hasPrimaryAction ? <DocumentActionForm action={postGoodsReceiving.bind(null, receiving.id)} pendingLabel="Posting...">Post to stock</DocumentActionForm> : null}
            </DocumentActionBar>
            {!hasPrimaryAction && receiving.status === "draft" ? <p className="mt-3 text-sm text-muted-foreground">You can view this GRN, but you do not have permission to post it.</p> : null}
          </DocumentSideSection>
          {!hasDeliveryOrder && receiving.status === "draft" ? (
            <DocumentSideSection title="Attachment Recommended">
              <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Add the Delivery Order attachment when it is available.
              </div>
            </DocumentSideSection>
          ) : null}
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
              <h2 className="text-sm font-semibold">Receiving Summary</h2>
              <div className="grid gap-4 md:grid-cols-4">
                <div><p className="text-xs uppercase text-muted-foreground">Supplier</p><p className="font-medium">{receivingDisplay.supplier_name ?? receiving.supplier_id}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Date</p><p className="font-medium">{receiving.received_date}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Receiving Area</p><p className="font-medium">{receivingDisplay.location_name ?? "Branch default store"}</p></div>
                <div><p className="text-xs uppercase text-muted-foreground">Received Value</p><p className="font-medium">{formatCurrency(totalReceivedValue)}</p></div>
              </div>
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
                <h2 className="text-sm font-semibold">Received Items</h2>
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
            <p className="rounded-md border bg-secondary/30 p-3 text-sm text-muted-foreground">Comments, attachments, timeline, and revision history are available in the right panel.</p>
          ) : null}
    </DocumentWorkspace>
  );
}
