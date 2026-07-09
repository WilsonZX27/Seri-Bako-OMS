import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { cancelStockTransfer, postStockTransfer, rejectStockTransfer, startStockTransfer } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransfer } from "@/server/queries/stock-operations";

const transferSteps = [
  { key: "draft", label: "Draft", description: "Transfer is being prepared." },
  { key: "in_transit", label: "In Transit", description: "Stock is moving between locations." },
  { key: "completed", label: "Completed", description: "Stock movement has been recorded." },
  { key: "rejected", label: "Rejected", description: "Transfer was rejected." },
  { key: "cancelled", label: "Cancelled", description: "Transfer was cancelled." },
];

export default async function StockTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { transfer, lines } = await getStockTransfer(id);
  const bundle = transfer.document_id ? await getDocumentBundle(transfer.document_id) : null;
  const canStart = transfer.status === "draft";
  const canPost = transfer.status === "in_transit";
  const canAct = canStart || canPost;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Transfers", href: "/stock-transfers" }, { label: transfer.transfer_no }]}
      documentNo={transfer.transfer_no}
      title="Stock Transfer"
      status={transfer.status}
      workflowSteps={transferSteps}
      currentStatus={transfer.status}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Post only after the transfer lines are checked.">
            {canAct ? (
              <DocumentActionBar>
                {canStart ? <DocumentActionForm action={startStockTransfer.bind(null, transfer.id)} pendingLabel="Moving...">Move to In Transit</DocumentActionForm> : null}
                {canPost ? <DocumentActionForm action={postStockTransfer.bind(null, transfer.id)} pendingLabel="Posting...">Complete transfer</DocumentActionForm> : null}
                <DocumentActionForm action={rejectStockTransfer.bind(null, transfer.id)} pendingLabel="Rejecting..." variant="destructive">Reject</DocumentActionForm>
                <DocumentActionForm action={cancelStockTransfer.bind(null, transfer.id)} pendingLabel="Cancelling..." variant="ghost">Cancel</DocumentActionForm>
              </DocumentActionBar>
            ) : (
              <p className="text-sm text-muted-foreground">No workflow action is available for this transfer status.</p>
            )}
          </DocumentSideSection>
          {bundle ? (
            <>
              <CommentsPanel documentId={bundle.document.id} comments={bundle.comments} />
              <AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} />
              <DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} />
              <RevisionPanel revisions={bundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Transfer Summary</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{transfer.transfer_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">From</p><p className="font-medium">{transfer.from_location_name}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">To</p><p className="font-medium">{transfer.to_location_name}</p></div>
          </div>
          {transfer.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{transfer.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Transfer Lines</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                    <TableCell>{line.barcode ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatNumber(line.quantity)}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell>{line.remarks ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
