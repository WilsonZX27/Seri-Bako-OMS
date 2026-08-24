import { DocumentActionBar } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { StockCountForm } from "@/components/stock-count-form";
import { StockCountLineRecovery } from "@/components/stock-count-line-recovery";
import { Button } from "@/components/ui/button";
import { BlockedDestructiveAction, DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatQuantity } from "@/lib/utils";
import { autosaveStockCountDraft, cancelStockCount, deleteStockCount, postStockCount, resolveStockCountLineRevision, reviseStockCountLine, saveAndPostStockCount, updateStockCountDraft } from "@/server/actions/stock-counts";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockCount } from "@/server/queries/stock-counts";
import { StockCountNotFoundError } from "@/server/queries/stock-counts";
import { notFound } from "next/navigation";

const stockCountSteps = [
  { key: "draft", label: "Draft", description: "Count is being prepared." },
  { key: "posted", label: "Posted", description: "Variance posted to stock." },
];
const legacyPendingStatuses = new Set(["submitted", "reviewed", "approved"]);

export default async function StockCountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stockCountPromise = getStockCount(id).catch((error) => {
    if (error instanceof StockCountNotFoundError) notFound();
    throw error;
  });
  const [{ count, lines, revisions, revisionsAvailable }, permissions, branches, items] = await Promise.all([
    stockCountPromise,
    getPermissionMap(["stock_count.update", "stock_count.cancel", "stock_count.post"]),
    getBranchesForSelect(),
    getItemsForSelect(),
  ]);
  const pendingRevisions = revisions.filter((revision) => revision.status === "pending");
  const documentBundle = count.document_id ? await getDocumentBundle(count.document_id) : null;
  const highVarianceLines = lines.filter((line) => Math.abs(line.variance_percent) > count.tolerance_percent);
  const isLegacyPending = legacyPendingStatuses.has(count.status);
  const canPost = (count.status === "draft" || isLegacyPending) && permissions["stock_count.post"] && pendingRevisions.length === 0;
  const canEdit = count.status === "draft" && permissions["stock_count.update"];
  // Any count that has not posted inventory can still be safely removed from
  // active work. Posted counts are the immutable audit boundary.
  const canDeleteByStatus = count.status !== "posted";
  const canDelete = canDeleteByStatus && (permissions["stock_count.update"] || permissions["stock_count.cancel"]);
  const canCancel = (count.status === "draft" || isLegacyPending) && permissions["stock_count.cancel"];
  const hasPrimaryAction = canPost || canEdit;
  const formId = `stock-count-edit-${count.id}`;
  const deleteLabel = count.status === "draft" ? "Delete draft" : "Delete unposted count";
  const deleteControl = canDelete
    ? <DangerConfirmForm action={deleteStockCount.bind(null, count.id)} buttonLabel={deleteLabel} title={`${deleteLabel} ${count.count_no}?`} description="This removes the unposted count from active work. Its audit activity remains available." checkboxLabel="I understand this removes the Stock Count from active records." warning="Only posted counts are protected because they already changed the stock ledger." confirmWord={count.count_no} pendingLabel="Deleting..." />
    : <BlockedDestructiveAction
      buttonLabel="Delete stock count"
      title={canDeleteByStatus ? `Delete permission required for ${count.count_no}` : `Cannot delete ${count.count_no}`}
      description={canDeleteByStatus ? "This unposted count can be removed, but your role does not have the required Stock Count delete permission." : "This count has already been posted to the stock ledger."}
      recommendation={canDeleteByStatus ? "Ask an Owner to grant Stock Count update or cancel permission." : "Posted counts remain immutable. Create a new count for any correction."}
    />;
  const cancelControl = canCancel ? (
    <DangerConfirmForm
      action={cancelStockCount.bind(null, count.id)}
      buttonLabel="Cancel stock count"
      title={`Cancel ${count.count_no}?`}
      description="This removes the unposted count from active work while preserving its audit history. You can start a new count later."
      checkboxLabel="I understand this count will be cancelled and removed from active work."
      warning="No stock ledger movement will be posted."
      confirmWord={count.count_no}
      pendingLabel="Cancelling..."
    />
  ) : null;
  const secondaryActions = cancelControl || deleteControl ? <div className="space-y-2">{cancelControl}{deleteControl}</div> : null;
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
    retirement: line.retirement,
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
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={<DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions>}
      sidePanel={
        <>
          <DocumentActionSection description="Only valid stock count actions are shown." moreOptions={secondaryActions} collapseMoreOptions>
            {hasPrimaryAction ? (
              <DocumentActionBar className={canEdit && canPost ? "grid-cols-2" : undefined}>
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

      {!revisionsAvailable && isLegacyPending ? <Card className="border-[var(--sb-warning)] shadow-none"><CardContent className="p-4"><p className="text-sm font-semibold">Line correction setup unavailable</p><p className="mt-1 text-xs text-muted-foreground">This count remains readable and saved. Ask an Owner to apply migration 170, then retry before proposing a replacement. Unchanged counts can still follow the existing post flow.</p></CardContent></Card> : null}

      {pendingRevisions.length ? <Card id="stock-count-guided-issues" className="border-[var(--sb-warning)] shadow-none"><CardContent className="space-y-3 p-4"><div><p className="text-sm font-semibold">{pendingRevisions.length} line change{pendingRevisions.length === 1 ? "" : "s"} need review</p><p className="text-xs text-muted-foreground">Progress is saved. Review each proposal below; only final posting is paused.</p></div>{pendingRevisions.map((revision, index) => <div key={revision.id} className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{index === 0 ? "Next issue" : `Issue ${index + 1}`}: {revision.action}</p><p className="text-xs text-muted-foreground">{revision.reason}</p></div><div className="flex gap-2"><form action={resolveStockCountLineRevision.bind(null, count.id, revision.id)}><input type="hidden" name="review_action" value="reject"/><Button variant="outline" size="sm">Reject</Button></form><form action={resolveStockCountLineRevision.bind(null, count.id, revision.id)}><input type="hidden" name="review_action" value="approve"/><Button size="sm">Approve</Button></form></div></div>)}</CardContent></Card> : null}

      {!canEdit ? <Card>
        <CardContent className="p-5">
          <h2 className="mb-3 text-sm font-semibold">Count Lines</h2>
          <Table mobileHidden aria-label="Posted stock count lines">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Theoretical</TableHead>
                  <TableHead className="text-right">Physical</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead className="text-right">Variance %</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Remarks</TableHead>
                  {isLegacyPending && permissions["stock_count.post"] && revisionsAvailable ? <TableHead className="w-12"><span className="sr-only">Edit</span></TableHead> : null}
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
                      {isLegacyPending && permissions["stock_count.post"] && revisionsAvailable ? <TableCell><StockCountLineRecovery action={reviseStockCountLine.bind(null, count.id)} line={line} items={items} reviewMode /></TableCell> : null}
                    </TableRow>
                  );
                })}
              </TableBody>
          </Table>
          <div className="divide-y xl:hidden" role="list" aria-label="Posted stock count lines" data-posted-stock-count-lines>
            {lines.map((line) => {
              const high = Math.abs(line.variance_percent) > count.tolerance_percent;
              return (
                <article key={line.id} className={`space-y-3 py-4 first:pt-1 last:pb-1 ${high ? "bg-[var(--sb-warning-bg)] px-3" : ""}`} role="listitem">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-medium leading-snug">{line.item?.item_name ?? line.item_id}</h3><p className="mt-0.5 text-xs text-muted-foreground">{line.item?.item_code}</p></div><div className="flex shrink-0 items-start gap-2 text-right"><div><strong>{formatQuantity(line.physical_qty)} {line.uom}</strong><p className={`text-xs ${high ? "font-semibold text-[var(--sb-warning)]" : "text-muted-foreground"}`}>{formatQuantity(line.variance_qty)} · {formatQuantity(line.variance_percent)}%</p></div>{isLegacyPending && permissions["stock_count.post"] && revisionsAvailable ? <StockCountLineRecovery action={reviseStockCountLine.bind(null, count.id)} line={line} items={items} reviewMode /> : null}</div></div>
                  <dl className="grid grid-cols-2 gap-4 rounded-md bg-secondary/35 p-3 text-xs"><div><dt className="text-muted-foreground">Theoretical</dt><dd className="mt-1 font-medium">{formatQuantity(line.theoretical_qty)} {line.uom}</dd></div><div><dt className="text-muted-foreground">Tolerance</dt><dd className="mt-1 font-medium">{formatQuantity(count.tolerance_percent)}%</dd></div></dl>
                  {line.remarks ? <p className="text-xs"><span className="text-muted-foreground">Remarks:</span> {line.remarks}</p> : high ? <p className="text-xs font-medium text-[var(--sb-warning)]">Variance exceeds tolerance; remarks were not recorded.</p> : null}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card> : null}
    </DocumentWorkspace>
  );
}
