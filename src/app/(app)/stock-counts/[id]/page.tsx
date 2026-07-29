import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { StockCountForm } from "@/components/stock-count-form";
import { StockCountAutosaveStatus } from "@/components/stock-count-autosave-status";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatQuantity } from "@/lib/utils";
import { autosaveStockCountDraft, cancelStockCount, postStockCount, saveAndPostStockCount, updateStockCountDraft } from "@/server/actions/stock-counts";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockCount } from "@/server/queries/stock-counts";

const stockCountSteps = [
  { key: "draft", label: "Draft", description: "Count is being prepared." },
  { key: "posted", label: "Posted", description: "Variance posted to stock." },
];
const legacyPendingStatuses = new Set(["submitted", "reviewed", "approved"]);

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ count, lines }, permissions, branches] = await Promise.all([
    getStockCount(id),
    getPermissionMap(["stock_count.update", "stock_count.post", "stock_count.cancel"]),
    getBranchesForSelect(),
  ]);
  const documentBundle = count.document_id ? await getDocumentBundle(count.document_id) : null;
  const highVarianceLines = lines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent);
  const isLegacyPending = legacyPendingStatuses.has(count.status);
  const canPost = (count.status === "draft" || isLegacyPending) && permissions["stock_count.post"];
  const canEdit = count.status === "draft" && permissions["stock_count.update"];
  const canCancel = count.status === "draft" && permissions["stock_count.cancel"];
  const hasPrimaryAction = canPost || canEdit;
  const formId = `stock-count-edit-${count.id}`;
  const deleteControl = <BlockedDestructiveAction buttonLabel="Delete stock count" title={`Cannot delete ${count.count_no}`} description={count.status === "posted" ? "This count produced an auditable variance adjustment." : "The count preserves physical quantities and its audit history."} recommendation={count.status === "posted" ? "Post a new count or correction; physical deletion is prohibited." : "Cancel the draft when permitted, or confirm and post a legacy pending count."} />;
  const secondaryActions = canCancel ? <div className="space-y-2"><DocumentActionForm action={cancelStockCount.bind(null, count.id)} pendingLabel="Cancelling..." variant="ghost">Cancel stock count</DocumentActionForm>{deleteControl}</div> : deleteControl;
  const postAction = canEdit ? saveAndPostStockCount.bind(null, count.id) : postStockCount.bind(null, count.id);
  const confirmAction = canPost ? <ConfirmActionForm action={postAction} formId={canEdit ? formId : undefined} label="Confirm & Post Count" title="Post this stock count?" description={`${lines.filter((line) => line.variance_qty !== 0).length} adjusted lines will update the branch stock ledger. Your latest entries will be saved before posting. This cannot be undone.`} pendingLabel="Saving & posting..." mobilePrimary /> : null;
  const mobilePrimaryAction = hasPrimaryAction ? (
    <div className={`grid gap-2 ${canEdit && canPost ? "grid-cols-2" : "grid-cols-1"}`}>
      {canEdit ? <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton> : null}
      {confirmAction}
    </div>
  ) : null;
  const editableLines = lines.map((line) => ({
    line_id: line.id,
    item_id: line.item_id,
    item_code: line.item?.item_code ?? line.item_id,
    item_name: line.item?.item_name ?? line.item_id,
    theoretical_qty: line.theoretical_qty,
    physical_qty: line.physical_qty,
    prefill_source: "ledger_balance" as const,
    uom: line.uom,
    remarks: line.remarks,
  }));

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Inventory", href: "/inventory" }, { label: "Stock Counts", href: "/stock-counts" }, { label: count.count_no }]}
      documentNo={count.count_no}
      title="Stock Count"
      status={count.status}
      branch={count.branch_name}
      workflowSteps={stockCountSteps}
      currentStatus={isLegacyPending ? "draft" : count.status}
      mobileWorkflowTrailing={canEdit ? <StockCountAutosaveStatus /> : null}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentActionSection description="Only valid stock count actions are shown." moreOptions={secondaryActions}>
            {hasPrimaryAction ? (
              <DocumentActionBar>
                {canEdit ? <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton> : null}
                {canPost ? <ConfirmActionForm action={postAction} formId={canEdit ? formId : undefined} label="Confirm & Post Count" title="Post this stock count?" description={`${lines.filter((line) => line.variance_qty !== 0).length} adjusted lines will update the branch stock ledger. Your latest entries will be saved before posting. This cannot be undone.`} pendingLabel="Saving & posting..." /> : null}
              </DocumentActionBar>
            ) : (
              <p className="text-sm text-muted-foreground">You can view this count, but there is no workflow action available for your role or this status.</p>
            )}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{count.status === "draft" ? "Save the physical quantities, then confirm and post. The server checks that stock has not moved since this snapshot." : isLegacyPending ? "This historical pending count is locked for editing. Confirm and post it to finish the inventory reconciliation, or cancel it if permitted." : "Posted counts remain read-only; use a new count for a correction."}</p></DocumentSideSection>
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
      {canEdit ? <StockCountForm formId={formId} branches={branches} selectedBranchId={count.branch_id ?? undefined} seedLines={editableLines} action={updateStockCountDraft.bind(null, count.id)} autosaveAction={autosaveStockCountDraft.bind(null, count.id)} draftId={count.id} showSubmit={false} initialCountDate={count.count_date} initialTolerance={count.tolerance_percent} initialRemarks={count.remarks} /> : null}

      {!canEdit ? <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Count Summary</h2>
            <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{formatDateOnly(count.count_date)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{count.branch_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Tolerance</p><p className="font-medium">{formatQuantity(count.tolerance_percent)}%</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">High Variance</p><p className="font-medium">{highVarianceLines.length}</p></div>
          </div>
          {count.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-sm">{count.remarks}</p> : null}
        </CardContent>
      </Card> : null}

      {!canEdit ? <Card>
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
                      <TableCell className="text-right">{formatQuantity(line.theoretical_qty)}</TableCell>
                      <TableCell className="text-right font-medium">{formatQuantity(line.physical_qty)}</TableCell>
                      <TableCell className="text-right">{formatQuantity(line.variance_qty)}</TableCell>
                      <TableCell className={`text-right ${high ? "font-semibold text-warning" : ""}`}>{formatQuantity(line.variance_percent)}%</TableCell>
                      <TableCell>{line.uom}</TableCell>
                      <TableCell>{line.remarks ?? (high ? "Remarks required" : "-")}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
          </Table>
        </CardContent>
      </Card> : null}
    </DocumentWorkspace>
  );
}
