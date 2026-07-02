import { AlertTriangle } from "lucide-react";
import { DocumentActionBar, DocumentActionForm, DocumentActionLink } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WorkflowStatusPipeline } from "@/components/workflow-status-pipeline";
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

  return (
    <>
      <PageHeader title={<DocumentNumber value={receiving.grn_no} size="lg" />} description="Workflow, received items, attachments, and posting status." />
      <div className="grid gap-5 p-5 xl:grid-cols-[1fr_420px]">
        <div className="space-y-5">
          <WorkflowStatusPipeline steps={grnSteps} currentStatus={receiving.status} />

          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Current Status</p>
                  <StatusBadge status={receiving.status} />
                </div>
                <DocumentActionBar>
                  <DocumentActionLink href={`/purchase-orders/${receiving.purchase_order_id}`} variant="outline">View PO</DocumentActionLink>
                  {receiving.status === "draft" ? (
                    <>
                      {permissions["grn.post"] ? <DocumentActionForm action={postGoodsReceiving.bind(null, receiving.id)} pendingLabel="Posting...">Post to stock</DocumentActionForm> : null}
                    </>
                  ) : null}
                </DocumentActionBar>
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
