import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { Card, CardContent } from "@/components/ui/card";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { cancelStockTransfer, postStockTransfer, rejectStockTransfer, startStockTransfer } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransfer } from "@/server/queries/stock-operations";
import { getPermissionMap } from "@/server/auth/permissions";

const transferSteps = [
  { key: "draft", label: "Draft", description: "Transfer is being prepared." },
  { key: "in_transit", label: "In Transit", description: "Stock is moving between branches." },
  { key: "completed", label: "Completed", description: "Stock movement has been recorded." },
  { key: "rejected", label: "Rejected", description: "Transfer was rejected." },
  { key: "cancelled", label: "Cancelled", description: "Transfer was cancelled." },
];

export default async function StockTransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ transfer, lines }, permissions] = await Promise.all([getStockTransfer(id), getPermissionMap(["stock_transfer.update", "stock_transfer.post", "stock_transfer.cancel"])]);
  const bundle = transfer.document_id ? await getDocumentBundle(transfer.document_id) : null;
  const canStart = transfer.status === "draft" && permissions["stock_transfer.update"];
  const canPost = transfer.status === "in_transit" && permissions["stock_transfer.post"];
  const canReject = ["draft", "in_transit"].includes(transfer.status) && permissions["stock_transfer.update"];
  const canCancel = ["draft", "in_transit"].includes(transfer.status) && permissions["stock_transfer.cancel"];
  const canAct = canStart || canPost;
  const deleteControl = <BlockedDestructiveAction buttonLabel="Delete transfer" title={`Cannot delete ${transfer.transfer_no}`} description={canAct ? "Transfers remain linked to their source and destination stock movements." : "Completed or closed transfer history preserves stock integrity."} recommendation={canAct ? "Cancel or reject before completion." : "Create a controlled compensating transfer or correction; physical deletion is prohibited."} />;
  const secondaryActions = canReject || canCancel ? <div className="space-y-2">{canReject ? <DocumentActionForm action={rejectStockTransfer.bind(null, transfer.id)} pendingLabel="Rejecting..." variant="destructive">Reject transfer</DocumentActionForm> : null}{canCancel ? <DocumentActionForm action={cancelStockTransfer.bind(null, transfer.id)} pendingLabel="Cancelling..." variant="ghost">Cancel transfer</DocumentActionForm> : null}{deleteControl}</div> : deleteControl;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Transfers", href: "/stock-transfers" }, { label: transfer.transfer_no }]}
      documentNo={transfer.transfer_no}
      title="Stock Transfer"
      status={transfer.status}
      workflowSteps={transferSteps}
      currentStatus={transfer.status}
      mobilePrimaryAction={canStart ? <DocumentActionForm action={startStockTransfer.bind(null, transfer.id)} pendingLabel="Moving...">Move to In Transit</DocumentActionForm> : canPost ? <DocumentActionForm action={postStockTransfer.bind(null, transfer.id)} pendingLabel="Posting...">Complete Transfer</DocumentActionForm> : null}
      mobileActivity={bundle ? <><AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} /><CommentsPanel documentId={bundle.document.id} comments={bundle.comments} /><DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Post only after the transfer lines are checked.">
            {canAct ? (
              <DocumentActionBar>
                {canStart ? <DocumentActionForm action={startStockTransfer.bind(null, transfer.id)} pendingLabel="Moving...">Move to In Transit</DocumentActionForm> : null}
                {canPost ? <DocumentActionForm action={postStockTransfer.bind(null, transfer.id)} pendingLabel="Posting...">Complete transfer</DocumentActionForm> : null}
              </DocumentActionBar>
            ) : (
              <p className="text-xs text-muted-foreground">This transfer is read-only in its current state.</p>
            )}
          </DocumentSideSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{transfer.status === "draft" ? "Check both branches and every transfer quantity before moving stock in transit." : transfer.status === "in_transit" ? "Confirm the destination received every line before completing the transfer." : "Finalized transfer movements remain read-only."}</p></DocumentSideSection>
          <DocumentSideSection title="More Options"><DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions></DocumentSideSection>
          {bundle ? (
            <>
              <AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} />
              <CommentsPanel documentId={bundle.document.id} comments={bundle.comments} />
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
            <div><p className="text-xs uppercase text-muted-foreground">From</p><p className="font-medium">{transfer.from_branch_name}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">To</p><p className="font-medium">{transfer.to_branch_name}</p></div>
          </div>
          {transfer.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{transfer.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Transfer Lines</h2>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                    <TableCell className="text-right">{formatNumber(line.quantity)}</TableCell>
                    <TableCell>{line.uom}</TableCell>
                    <TableCell>{line.remarks ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
