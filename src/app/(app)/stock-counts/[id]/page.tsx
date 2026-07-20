import { AlertTriangle } from "lucide-react";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { Card, CardContent } from "@/components/ui/card";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatNumber } from "@/lib/utils";
import { approveStockCount, cancelStockCount, postStockCount, rejectStockCount, reviewStockCount, submitStockCount } from "@/server/actions/stock-counts";
import { getPermissionMap } from "@/server/auth/permissions";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockCount } from "@/server/queries/stock-counts";

const stockCountSteps = [
  { key: "draft", label: "Draft", description: "Count is being prepared." },
  { key: "submitted", label: "Submitted", description: "Waiting for review." },
  { key: "reviewed", label: "Reviewed", description: "Ready for approval or posting." },
  { key: "approved", label: "Approved", description: "Ready to post variance." },
  { key: "posted", label: "Posted", description: "Variance posted to stock." },
];

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ count, lines }, permissions] = await Promise.all([
    getStockCount(id),
    getPermissionMap(["stock_count.submit", "stock_count.review", "stock_count.approve", "stock_count.post", "stock_count.cancel"]),
  ]);
  const documentBundle = count.document_id ? await getDocumentBundle(count.document_id) : null;
  const highVarianceLines = lines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent);
  const hasHighVarianceAttachment = Boolean(documentBundle?.attachments.length);
  const canSubmit = count.status === "draft" && permissions["stock_count.submit"];
  const canReview = count.status === "submitted" && permissions["stock_count.review"];
  const canApprove = count.status === "reviewed" && permissions["stock_count.approve"];
  const canPost = ["approved", "reviewed"].includes(count.status) && permissions["stock_count.post"];
  const canCancel = ["draft", "submitted", "reviewed"].includes(count.status) && permissions["stock_count.cancel"];
  const canReject = ["submitted", "reviewed"].includes(count.status) && permissions["stock_count.approve"];
  const hasPrimaryAction = canSubmit || canReview || canApprove || canPost;
  const deleteControl = <BlockedDestructiveAction buttonLabel="Delete stock count" title={`Cannot delete ${count.count_no}`} description={count.status === "posted" ? "This count produced an auditable variance adjustment." : "The count preserves physical quantities and workflow review."} recommendation={count.status === "posted" ? "Post a new count or correction; physical deletion is prohibited." : "Cancel or reject the count through its current workflow."} />;
  const secondaryActions = canReject || canCancel ? <div className="space-y-2">{canReject ? <DocumentActionForm action={rejectStockCount.bind(null, count.id)} pendingLabel="Rejecting..." variant="destructive">Reject stock count</DocumentActionForm> : null}{canCancel ? <DocumentActionForm action={cancelStockCount.bind(null, count.id)} pendingLabel="Cancelling..." variant="ghost">Cancel stock count</DocumentActionForm> : null}{deleteControl}</div> : deleteControl;
  const mobilePrimaryAction = canSubmit ? <DocumentActionForm action={submitStockCount.bind(null, count.id)} pendingLabel="Submitting...">Submit Stock Count</DocumentActionForm> : canReview ? <DocumentActionForm action={reviewStockCount.bind(null, count.id)} pendingLabel="Reviewing...">Review Stock Count</DocumentActionForm> : canApprove ? <ConfirmActionForm action={approveStockCount.bind(null, count.id)} label="Approve Stock Count" title="Approve this stock count?" description="This makes the verified variance ready for posting." pendingLabel="Approving..." mobilePrimary /> : canPost ? <DocumentActionForm action={postStockCount.bind(null, count.id)} pendingLabel="Posting...">Post Stock Variance</DocumentActionForm> : null;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Counts", href: "/stock-counts" }, { label: count.count_no }]}
      documentNo={count.count_no}
      title="Stock Count"
      status={count.status}
      branch={count.branch_name}
      workflowSteps={stockCountSteps}
      currentStatus={count.status}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentActionSection description="Only valid stock count actions are shown." moreOptions={secondaryActions}>
            {hasPrimaryAction ? (
              <DocumentActionBar>
                {canSubmit ? <DocumentActionForm action={submitStockCount.bind(null, count.id)} pendingLabel="Submitting...">Submit Stock Count</DocumentActionForm> : null}
                {canReview ? <DocumentActionForm action={reviewStockCount.bind(null, count.id)} pendingLabel="Reviewing...">Review Stock Count</DocumentActionForm> : null}
                {canApprove ? <ConfirmActionForm action={approveStockCount.bind(null, count.id)} label="Approve Stock Count" title="Approve this stock count?" description="This makes the verified variance ready for posting." pendingLabel="Approving..." mobilePrimary /> : null}
                {canPost ? <DocumentActionForm action={postStockCount.bind(null, count.id)} pendingLabel="Posting...">Post Stock Variance</DocumentActionForm> : null}
              </DocumentActionBar>
            ) : (
              <p className="text-sm text-muted-foreground">You can view this count, but there is no workflow action available for your role or this status.</p>
            )}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{count.status === "draft" ? "Enter physical quantities and submit the completed count for review." : count.status === "submitted" ? "Review the count and resolve high-variance evidence before approval." : count.status === "approved" ? "Post the verified variance to stock." : "Posted counts remain read-only."}</p></DocumentSideSection>
          {highVarianceLines.length && !hasHighVarianceAttachment ? (
            <DocumentSideSection title="Attachment Required">
              <div className="flex gap-2 rounded-md bg-warning/10 p-3 text-sm text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                High variance lines detected. Attach a count sheet photo or supporting proof before final approval.
              </div>
            </DocumentSideSection>
          ) : null}
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
      {highVarianceLines.length && !hasHighVarianceAttachment && documentBundle ? <div className="md:hidden"><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Count Evidence Required" description="Attach a count sheet photo or supporting proof before final approval." presentation="inline" documentStatus={documentBundle.document.status} /></div> : null}
      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Count Summary</h2>
          <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{count.count_date}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{count.branch_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Tolerance</p><p className="font-medium">{formatNumber(count.tolerance_percent)}%</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">High Variance</p><p className="font-medium">{highVarianceLines.length}</p></div>
          </div>
          {count.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{count.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Count Lines</h2>
          <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Theoretical</TableHead>
                  <TableHead className="text-right">Physical</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Remarks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => {
                  const high = Math.abs(line.variance_percent) > count.tolerance_percent;
                  return (
                    <TableRow key={line.id} className={high ? "bg-warning/10" : ""}>
                      <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                      <TableCell className="text-right">{formatNumber(line.theoretical_qty)}</TableCell>
                      <TableCell className="text-right font-medium">{formatNumber(line.physical_qty)}</TableCell>
                      <TableCell className="text-right">{formatNumber(line.variance_qty)}</TableCell>
                      <TableCell className={`text-right ${high ? "font-semibold text-warning" : ""}`}>{formatNumber(line.variance_percent)}%</TableCell>
                      <TableCell>{line.uom}</TableCell>
                      <TableCell>{line.remarks ?? (high ? "Remarks required" : "-")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
          </Table>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
