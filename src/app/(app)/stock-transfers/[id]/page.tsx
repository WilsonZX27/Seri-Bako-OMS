import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { StockTransferReceiveForm } from "@/components/stock-operation-forms";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { cancelStockTransfer, receiveStockTransfer, rejectStockTransfer, startStockTransfer } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockTransfer } from "@/server/queries/stock-operations";
import { getPermissionMap } from "@/server/auth/permissions";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const receiveLines = lines.map((line) => ({ id: line.id, item_id: line.item_id, item_name: line.item?.item_name ?? line.item_id, item_code: line.item?.item_code, quantity: line.quantity, received_quantity: line.received_quantity ?? 0, uom: line.uom }));
  const deleteControl = <BlockedDestructiveAction buttonLabel="Delete transfer" title={`Cannot delete ${transfer.transfer_no}`} description="Completed transfers preserve stock integrity." recommendation="Use a controlled compensating transfer or correction; physical deletion is prohibited." />;
  const secondaryActions = canReject || canCancel ? <div className="space-y-2">{canReject ? <DocumentActionForm action={rejectStockTransfer.bind(null, transfer.id)} pendingLabel="Rejecting..." variant="destructive">Reject transfer</DocumentActionForm> : null}{canCancel ? <DocumentActionForm action={cancelStockTransfer.bind(null, transfer.id)} pendingLabel="Deleting draft..." variant="ghost">Delete unposted transfer</DocumentActionForm> : null}{transfer.status !== "draft" && !canCancel ? deleteControl : null}</div> : deleteControl;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Transfers", href: "/stock-transfers" }, { label: transfer.transfer_no }]}
      documentNo={transfer.transfer_no}
      title="Stock Transfer"
      status={transfer.status}
      workflowSteps={transferSteps}
      currentStatus={transfer.status}
      mobilePrimaryAction={canStart ? <DocumentActionForm action={startStockTransfer.bind(null, transfer.id)} pendingLabel="Reserving...">Send to destination</DocumentActionForm> : canPost ? <SubmitButton form="stock-transfer-receive-form" pendingLabel="Receiving...">Confirm received quantities</SubmitButton> : null}
      mobileActivity={bundle ? <><AttachmentPanel documentId={bundle.document.id} attachments={bundle.attachments} /><CommentsPanel documentId={bundle.document.id} comments={bundle.comments} /><DocumentTimeline document={bundle.document} activities={bundle.activityLogs} comments={bundle.comments} attachments={bundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentActionSection description="Send reserves source stock; destination confirmation posts only the quantity actually received." moreOptions={secondaryActions}>
            {canAct ? (
              <DocumentActionBar>
                {canStart ? <DocumentActionForm action={startStockTransfer.bind(null, transfer.id)} pendingLabel="Moving...">Move to In Transit</DocumentActionForm> : null}
                {canPost ? <SubmitButton form="stock-transfer-receive-form" pendingLabel="Receiving...">Confirm received quantities</SubmitButton> : null}
              </DocumentActionBar>
            ) : (
              <p className="text-xs text-muted-foreground">This transfer is read-only in its current state.</p>
            )}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{transfer.status === "draft" ? "Check both branches and every transfer quantity before reserving stock in transit." : transfer.status === "in_transit" ? "Confirm the destination quantity; partial receipts remain in transit." : "Finalized transfer movements remain read-only."}</p></DocumentSideSection>
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
      {canPost ? (
        <Card id="receive-transfer">
          <CardContent className="space-y-3 p-5">
            <div>
              <h2 className="text-sm font-semibold">Receive transfer</h2>
              <p className="text-xs text-muted-foreground">Confirm the quantity physically received at the destination. Partial receipts are allowed.</p>
            </div>
            <StockTransferReceiveForm transferId={transfer.id} lines={receiveLines} action={receiveStockTransfer} />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Transfer Summary</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{formatDateOnly(transfer.transfer_date)}</p></div>
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
                    <TableCell className="text-right">{formatNumber(line.quantity)}<span className="block text-xs text-muted-foreground">received {formatNumber(line.received_quantity ?? 0)}</span></TableCell>
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
