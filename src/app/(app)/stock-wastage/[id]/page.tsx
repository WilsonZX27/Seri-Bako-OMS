import { AlertTriangle } from "lucide-react";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { cancelStockWastage, postStockWastage, rejectStockWastage } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockWastageDetail } from "@/server/queries/stock-operations";

const wastageSteps = [
  { key: "draft", label: "Draft", description: "Wastage is being prepared." },
  { key: "posted", label: "Posted", description: "Stock movement has been recorded." },
  { key: "rejected", label: "Rejected", description: "Wastage was rejected." },
  { key: "cancelled", label: "Cancelled", description: "Wastage was cancelled." },
];

const recommendsEvidence = (reason: string) => ["damaged", "expired", "supplier_claim"].includes(reason);

export default async function StockWastageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wastage, lines } = await getStockWastageDetail(id);
  const bundle = wastage.document_id ? await getDocumentBundle(wastage.document_id) : null;
  const evidenceMissing = recommendsEvidence(wastage.reason) && !bundle?.attachments.length;
  const canAct = wastage.status === "draft";

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Wastage", href: "/stock-wastage" }, { label: wastage.wastage_no }]}
      documentNo={wastage.wastage_no}
      title="Stock Wastage"
      status={wastage.status}
      workflowSteps={wastageSteps}
      currentStatus={wastage.status}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Post only after the wastage lines and evidence are checked.">
            {canAct ? (
              <DocumentActionBar>
                <DocumentActionForm action={postStockWastage.bind(null, wastage.id)} pendingLabel="Posting...">Post wastage</DocumentActionForm>
                <DocumentActionForm action={rejectStockWastage.bind(null, wastage.id)} pendingLabel="Rejecting..." variant="destructive">Reject</DocumentActionForm>
                <DocumentActionForm action={cancelStockWastage.bind(null, wastage.id)} pendingLabel="Cancelling..." variant="ghost">Cancel</DocumentActionForm>
              </DocumentActionBar>
            ) : (
              <p className="text-sm text-muted-foreground">No workflow action is available for this wastage status.</p>
            )}
          </DocumentSideSection>
          {evidenceMissing ? (
            <DocumentSideSection title="Attachment Recommended">
              <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Add a photo when available for audit support.
              </div>
            </DocumentSideSection>
          ) : null}
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
          <h2 className="text-sm font-semibold">Wastage Summary</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{wastage.wastage_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch Store</p><p className="font-medium">{wastage.location_name}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Reason</p><p className="font-medium capitalize">{wastage.reason.replaceAll("_", " ")}</p></div>
          </div>
          {wastage.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{wastage.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Wastage Lines</h2>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Batch / Expiry</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                    <TableCell>{line.barcode ?? "-"}</TableCell>
                    <TableCell className="text-right">{formatNumber(line.quantity)} {line.uom}</TableCell>
                    <TableCell className="capitalize">{line.reason.replaceAll("_", " ")}</TableCell>
                    <TableCell>{line.batch_no ?? "-"}<p className="text-xs text-muted-foreground">{line.expiry_date ?? ""}</p></TableCell>
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
