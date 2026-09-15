import { DocumentActionBar } from "@/components/document-action-bar";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions } from "@/components/documents/mobile-document-surfaces";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { StockCountForm } from "@/components/stock-count-form";
import { StockCountLineRecovery } from "@/components/stock-count-line-recovery";
import { AddStockCountItemDialog } from "@/components/stock-count-scope-actions";
import { StockCountVoidDialog } from "@/components/stock-count-void-dialog";
import { Button } from "@/components/ui/button";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateOnly, formatQuantity } from "@/lib/utils";
import { addItemToStockCount, autosaveStockCountDraft, cancelStockCount, postStockCount, resolveStockCountLineRevision, reviseStockCountLine, saveAndPostStockCount, updateStockCountDraft, voidStockCount } from "@/server/actions/stock-counts";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getStockCount, getStockCountVoidPreview } from "@/server/queries/stock-counts";
import { StockCountNotFoundError } from "@/server/queries/stock-counts";
import { notFound } from "next/navigation";

const stockCountSteps = [
  { key: "draft", label: "Draft", description: "Count is being prepared." },
  { key: "posted", label: "Posted", description: "Variance posted to stock." },
];
const legacyPendingStatuses = new Set(["submitted", "reviewed", "approved"]);

export default async function StockCountDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const filters = await searchParams;
  const stockCountPromise = getStockCount(id).catch((error) => {
    if (error instanceof StockCountNotFoundError) notFound();
    throw error;
  });
  const [{ count, lines, revisions, revisionsAvailable, reconciliations }, permissions, branches, items] = await Promise.all([
    stockCountPromise,
    getPermissionMap(["stock_count.update", "stock_count.cancel", "stock_count.post"]),
    getBranchesForSelect(),
    getItemsForSelect(),
  ]);
  const pendingRevisions = revisions.filter((revision) => revision.status === "pending");
  const documentBundle = count.document_id ? await getDocumentBundle(count.document_id) : null;
  const adjustedLines = lines.filter((line) => Number(line.variance_qty) !== 0);
  const retiredLines = lines.filter((line) => line.retirement);
  const isLegacyPending = legacyPendingStatuses.has(count.status);
  const canPost = (count.status === "draft" || isLegacyPending) && permissions["stock_count.post"] && pendingRevisions.length === 0;
  const canEdit = count.status === "draft" && permissions["stock_count.update"];
  // Any count that has not posted inventory can still be safely removed from
  // active work. Posted counts are the immutable audit boundary.
  const canCancel = (count.status === "draft" || isLegacyPending) && permissions["stock_count.cancel"];
  const canVoid = count.status === "posted" && permissions["stock_count.cancel"];
  const voidPreview = canVoid ? await getStockCountVoidPreview(count.id) : null;
  const hasPrimaryAction = canPost || canEdit || canVoid;
  const formId = `stock-count-edit-${count.id}`;
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
      triggerVariant="outline"
    />
  ) : null;
  const addItemControl = canEdit ? <AddStockCountItemDialog items={items} existingItemIds={lines.map((line) => line.item_id)} action={addItemToStockCount.bind(null, count.id)} initialOpen={filters.open === "add-item"} /> : null;
  const initialLineAction = (filters.open === "replace" || filters.open === "remove") && filters.item_id
    ? { mode: filters.open, itemId: filters.item_id } as const
    : null;
  const secondaryActions = cancelControl ? <div className="space-y-2">{cancelControl}</div> : null;
  const postAction = canEdit ? saveAndPostStockCount.bind(null, count.id) : postStockCount.bind(null, count.id);
  const confirmAction = canPost ? <ConfirmActionForm action={postAction} formId={canEdit ? formId : undefined} label="Confirm & Post Count" title="Post this stock count?" description={`${lines.filter((line) => line.variance_qty !== 0).length} adjusted lines will update the branch stock ledger. Your latest entries will be saved before posting. This cannot be undone.`} pendingLabel="Saving & posting..." mobilePrimary /> : null;
  const voidControl = canVoid && voidPreview ? <StockCountVoidDialog action={voidStockCount.bind(null, count.id)} preview={voidPreview} /> : null;
  const mobilePrimaryAction = hasPrimaryAction ? <div>{confirmAction ?? (canEdit ? <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton> : voidControl)}</div> : null;
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
  const reconciliationRows = reconciliations as Array<{ item_id: string; snapshot_balance: number; posting_balance: number; movement_qty: number; physical_qty: number; final_variance_qty: number }>;

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
          {hasPrimaryAction || canCancel ? <DocumentActionSection description={canVoid ? "Reversal preserves the original count and creates equal opposite ledger movements." : undefined}>
            {hasPrimaryAction ? (
              <DocumentActionBar>
                {canPost ? <ConfirmActionForm action={postAction} formId={canEdit ? formId : undefined} label="Post count" title="Post this stock count?" description={`${lines.filter((line) => line.variance_qty !== 0).length} adjusted lines will update the branch stock ledger. Inventory movements made during counting will be reconciled automatically without changing the physical quantities.`} pendingLabel="Saving & posting..." /> : canEdit ? <SubmitButton form={formId} className="w-full" pendingLabel="Saving...">Save draft</SubmitButton> : voidControl}
                {canCancel ? cancelControl : null}
              </DocumentActionBar>
            ) : null}
          </DocumentActionSection> : null}
          <DocumentSideSection title="Next step"><p className="text-xs text-muted-foreground">{count.status === "draft" ? "Enter the physical quantities and post when complete. If inventory moved during counting, the system keeps your physical count and records the reconciliation for follow-up." : isLegacyPending ? "Confirm and post this historical count, or cancel it if permitted." : "Posted counts are read-only. Reconciliation notices remain in the document history."}</p></DocumentSideSection>
          <DocumentSideSection title="Retired lines"><p className="text-xs"><strong>{retiredLines.length}</strong> item{retiredLines.length === 1 ? "" : "s"} retired by this Stock Count.</p>{retiredLines.length ? <a href="#retired-stock-count-lines" className="text-xs font-semibold text-[var(--sb-link)] hover:underline">View retired items</a> : null}</DocumentSideSection>
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
      {reconciliationRows.length || retiredLines.length ? <div className="grid gap-3 md:grid-cols-2" data-stock-count-notices>
      {reconciliationRows.length ? <section className="rounded-[var(--sb-panel-radius)] border border-amber-200 bg-amber-50 p-3" role="status">
        <h2 className="text-sm font-semibold">Inventory changed during this count</h2>
        <p className="mt-1 text-xs text-muted-foreground">Stock moved after this count started. Your entered physical quantities were kept; posting recalculated each variance against the latest ledger balance. The affected items are listed below.</p>
        <div className="mt-3 divide-y divide-[var(--sb-border-soft)]">{reconciliationRows.map((entry) => {
          const line = lines.find((candidate) => candidate.item_id === entry.item_id);
          return <div key={entry.item_id} className="grid gap-1 py-2 text-xs grid-cols-2 [&>p:first-child]:col-span-2"><p className="font-medium">{line?.item?.item_code} · {line?.item?.item_name}</p><p><span className="text-muted-foreground">Started</span> {formatQuantity(entry.snapshot_balance)}</p><p><span className="text-muted-foreground">Posted baseline</span> {formatQuantity(entry.posting_balance)}</p><p><span className="text-muted-foreground">Physical</span> {formatQuantity(entry.physical_qty)}</p><p className="font-semibold"><span className="font-normal text-muted-foreground">Variance</span> {formatQuantity(entry.final_variance_qty)}</p></div>;
        })}</div>
      </section> : null}
      {retiredLines.length ? <section id="retired-stock-count-lines" className="overflow-hidden rounded-[var(--sb-panel-radius)] border border-amber-200 bg-amber-50"><div className="border-b border-[var(--sb-border-soft)] p-3"><h2 className="text-sm font-semibold">Retired by this Stock Count</h2><p className="mt-1 text-xs text-muted-foreground">{retiredLines.length} item{retiredLines.length === 1 ? "" : "s"} removed from future counts for this branch. Historical quantities remain intact.</p></div><div className="divide-y divide-[var(--sb-border-soft)]">{retiredLines.map((line, index)=><div key={line.id} className="grid gap-1 p-3 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><p className="font-semibold"><span className="mr-2 inline-flex min-w-5 justify-center rounded-full bg-amber-100 px-1 tabular-nums" aria-label={`Retired item ${index + 1}`}>{index + 1}</span>{line.item?.item_code} · {line.item?.item_name}</p><p className="text-muted-foreground">{line.retirement?.note || line.retirement?.reason?.replaceAll("_", " ")}</p></div><p className="tabular-nums">Final count {formatQuantity(line.retirement?.actual_qty ?? line.physical_qty)} {line.uom}</p></div>)}</div></section> : null}
      </div> : null}
      {canEdit ? <StockCountForm formId={formId} branches={branches} selectedBranchId={count.branch_id ?? undefined} seedLines={editableLines} action={updateStockCountDraft.bind(null, count.id)} autosaveAction={autosaveStockCountDraft.bind(null, count.id)} lineRevisionAction={reviseStockCountLine.bind(null, count.id)} itemCatalog={items} addItemControl={addItemControl} initialLineAction={initialLineAction} draftId={count.id} showSubmit={false} initialCountDate={count.count_date} initialRemarks={count.remarks} /> : null}

      {!canEdit ? <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="text-sm font-semibold">Count Summary</h2>
            <div className="grid gap-4 md:grid-cols-4">
            <div><p className="text-xs uppercase text-muted-foreground">Date</p><p className="font-medium">{formatDateOnly(count.count_date)}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Branch</p><p className="font-medium">{count.branch_name ?? "-"}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Adjusted lines</p><p className="font-medium">{adjustedLines.length}</p></div>
            <div><p className="text-xs uppercase text-muted-foreground">Retired lines</p><p className="font-medium">{retiredLines.length}</p></div>
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
                  const high = Number(line.variance_qty) !== 0;
                  return (
                    <TableRow key={line.id} className={high ? "bg-warning/10" : ""}>
                      <TableCell><p className="font-medium">{line.item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{line.item?.item_code}</p></TableCell>
                      <TableCell className="text-right">{formatQuantity(line.theoretical_qty)}</TableCell>
                      <TableCell className="text-right font-medium">{formatQuantity(line.physical_qty)}</TableCell>
                      <TableCell className="text-right">{formatQuantity(line.variance_qty)}</TableCell>
                      <TableCell className={`text-right ${high ? "font-semibold text-warning" : ""}`}>{formatQuantity(line.variance_percent)}%</TableCell>
                      <TableCell>{line.uom}</TableCell>
                      <TableCell>{line.remarks ?? "-"}</TableCell>
                      {isLegacyPending && permissions["stock_count.post"] && revisionsAvailable ? <TableCell><StockCountLineRecovery action={reviseStockCountLine.bind(null, count.id)} line={line} items={items} reviewMode /></TableCell> : null}
                    </TableRow>
                  );
                })}
              </TableBody>
          </Table>
          <div className="divide-y xl:hidden" role="list" aria-label="Posted stock count lines" data-posted-stock-count-lines>
            {lines.map((line) => {
              const high = Number(line.variance_qty) !== 0;
              return (
                <article key={line.id} className={`space-y-3 py-4 first:pt-1 last:pb-1 ${high ? "bg-[var(--sb-warning-bg)] px-3" : ""}`} role="listitem">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="font-medium leading-snug">{line.item?.item_name ?? line.item_id}</h3><p className="mt-0.5 text-xs text-muted-foreground">{line.item?.item_code}</p></div><div className="flex shrink-0 items-start gap-2 text-right"><div><strong>{formatQuantity(line.physical_qty)} {line.uom}</strong><p className={`text-xs ${high ? "font-semibold text-[var(--sb-warning)]" : "text-muted-foreground"}`}>{formatQuantity(line.variance_qty)} · {formatQuantity(line.variance_percent)}%</p></div>{isLegacyPending && permissions["stock_count.post"] && revisionsAvailable ? <StockCountLineRecovery action={reviseStockCountLine.bind(null, count.id)} line={line} items={items} reviewMode /> : null}</div></div>
                  <dl className="grid grid-cols-2 gap-4 rounded-md bg-secondary/35 p-3 text-xs"><div><dt className="text-muted-foreground">Starting balance</dt><dd className="mt-1 font-medium">{formatQuantity(line.theoretical_qty)} {line.uom}</dd></div><div><dt className="text-muted-foreground">Variance</dt><dd className="mt-1 font-medium">{formatQuantity(line.variance_qty)} {line.uom}</dd></div></dl>
                  {line.remarks ? <p className="text-xs"><span className="text-muted-foreground">Remarks:</span> {line.remarks}</p> : null}
                </article>
              );
            })}
          </div>
        </CardContent>
      </Card> : null}
    </DocumentWorkspace>
  );
}
