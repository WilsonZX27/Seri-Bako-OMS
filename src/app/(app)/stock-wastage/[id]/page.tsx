import { Check, X, Trash2 } from "lucide-react";
import { AlertTriangle } from "lucide-react";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { Card, CardContent } from "@/components/ui/card";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatNumber } from "@/lib/utils";
import { cancelStockWastage, postStockWastage, rejectStockWastage } from "@/server/actions/stock-operations";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockWastageDetail } from "@/server/queries/stock-operations";
import { detailOrNotFound } from "@/server/queries/detail";

const wastageSteps = [
  { key: "draft", label: "Draft", description: "Wastage is being prepared." },
  { key: "posted", label: "Posted", description: "Stock movement has been recorded." },
  { key: "rejected", label: "Rejected", description: "Wastage was rejected." },
  { key: "cancelled", label: "Cancelled", description: "Wastage was cancelled." },
];

const recommendsEvidence = (reason: string) => ["damaged", "expired", "supplier_claim"].includes(reason);

export default async function StockWastageDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { wastage, lines } = await detailOrNotFound(getStockWastageDetail(id));
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
                <DocumentActionForm action={postStockWastage.bind(null, wastage.id)} pendingLabel="Posting..."><Check className="size-4 shrink-0" aria-hidden="true" />Post wastage</DocumentActionForm>
                <DocumentActionForm action={rejectStockWastage.bind(null, wastage.id)} pendingLabel="Rejecting..." variant="destructive"><X className="size-4 shrink-0" aria-hidden="true" />Reject</DocumentActionForm>
                <DocumentActionForm action={cancelStockWastage.bind(null, wastage.id)} pendingLabel="Deleting draft..." variant="destructive"><Trash2 className="size-4 shrink-0" aria-hidden="true" />Delete draft</DocumentActionForm>
              </DocumentActionBar>
            ) : (
              <BlockedDestructiveAction buttonLabel="Delete wastage" title={`Cannot delete ${wastage.wastage_no}`} description="Posted wastage has stock-impacting ledger rows." recommendation="Use a controlled stock correction; physical deletion is prohibited." />
            )}
          </DocumentSideSection>
          {evidenceMissing ? (
            <DocumentSideSection title="Attachment Recommended">
              <div className="flex items-start gap-2 text-xs font-normal leading-5 text-muted-foreground">
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
          <div className="sb-label-value-summary sb-inventory-summary grid gap-4 md:grid-cols-3">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{formatDateOnly(wastage.wastage_date)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{wastage.branch_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Reason</p><p className="font-medium capitalize">{wastage.reason.replaceAll("_", " ")}</p></div>
          </div>
          {wastage.remarks ? <p className="rounded-md bg-secondary/35 p-3 text-sm">{wastage.remarks}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Wastage Lines</h2>
            <Table mobileHidden aria-label="Wastage lines">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
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
                    <TableCell className="text-right">{formatNumber(line.quantity)} {line.uom}</TableCell>
                    <TableCell className="capitalize">{line.reason.replaceAll("_", " ")}</TableCell>
                    <TableCell>{line.batch_no ?? "-"}<p className="text-xs text-muted-foreground">{line.expiry_date ?? ""}</p></TableCell>
                    <TableCell>{line.remarks ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="divide-y xl:hidden" role="list" aria-label="Wastage lines" data-stock-wastage-detail-lines>{lines.map((line) => <article key={line.id} className="space-y-3 py-4 first:pt-1 last:pb-1" role="listitem"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-medium leading-snug">{line.item?.item_name ?? line.item_id}</h3><p className="mt-0.5 text-xs text-muted-foreground">{line.item?.item_code ?? "No item code"}</p></div><strong className="shrink-0 text-[var(--sb-warning)]">{formatNumber(line.quantity)} {line.uom}</strong></div><dl className="grid grid-cols-2 gap-4 rounded-md bg-secondary/35 p-3 text-xs"><div><dt className="text-muted-foreground">Reason</dt><dd className="mt-1 font-medium capitalize">{line.reason.replaceAll("_", " ")}</dd></div><div><dt className="text-muted-foreground">Batch / expiry</dt><dd className="mt-1 font-medium">{line.batch_no ?? "No batch"}{line.expiry_date ? ` · ${formatDateOnly(line.expiry_date)}` : ""}</dd></div></dl>{line.remarks ? <p className="text-xs"><span className="text-muted-foreground">Remarks:</span> {line.remarks}</p> : null}</article>)}</div>
        </CardContent>
      </Card>
    </DocumentWorkspace>
  );
}
