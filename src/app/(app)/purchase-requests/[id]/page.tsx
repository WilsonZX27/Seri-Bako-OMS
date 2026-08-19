import { AlertTriangle, BadgeCheck, CircleCheck, FileCheck2, Send, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { DocumentNumber } from "@/components/document-number";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions, MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { StaleWorkflowRefresh } from "@/components/documents/stale-workflow-refresh";
import { PriorityBadge } from "@/components/priority-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { RejectActionForm } from "@/components/ui/reject-action-form";
import { NotFoundState } from "@/components/ui/system-states";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { getPrWorkflowLabel, getPrWorkflowStep, PR_WORKFLOW_STEP_LABELS, PURCHASE_REQUEST_WORKFLOW_STEPS } from "@/lib/purchase-request-status";
import { formatCurrency, formatDateOnly, formatNumber } from "@/lib/utils";
import {
  adminApprovePurchaseRequest,
  cancelPurchaseRequest,
  updateDraftPurchaseRequest,
  convertPurchaseRequestToPurchaseOrder,
  financeApprovePurchaseRequest,
  managerApprovePurchaseRequest,
  rejectPurchaseRequest,
  revisePurchaseRequestLine,
  resolvePurchaseRequestUnresolvedLine,
  submitPurchaseRequest,
} from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getCurrentProfile, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrdersForRequest, getPurchaseRequest, getPurchaseRequestBranchStock, getRecoverableDocumentWorkflowAvailable } from "@/server/queries/procurement";
import { getPhaseOneDeletePreview } from "@/server/queries/hard-delete";
import { hardDeletePhaseOne } from "@/server/actions/hard-delete";
import { PurchaseRequestForm } from "@/components/procurement-forms";
import { PurchaseRequestLineResolutionForm } from "@/components/purchase-request-line-resolution-form";
import { logServerError } from "@/server/observability/logger";
import { PurchaseRequestLineRecovery } from "@/components/purchase-request-line-recovery";
import { diagnosePurchaseRequestSupplier } from "@/lib/purchase-request-readiness";

const prSteps = PURCHASE_REQUEST_WORKFLOW_STEPS.map((step) => ({
  key: step,
  label: PR_WORKFLOW_STEP_LABELS[step],
  description:
    step === "draft"
      ? "Kitchen prepares the request."
      : step === "manager_review"
        ? "Manager approves the purchase need."
        : step === "admin_review"
          ? "Purchasing checks completeness and sourcing readiness."
          : step === "finance_review"
            ? "Finance checks budget and invoice readiness."
            : step === "ready_to_convert"
              ? "Ready to convert to purchase order."
              : "Purchase order has been created.",
}));

function isStatus(status: string, ...matches: string[]) {
  return matches.includes(status);
}

export default async function PurchaseRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const [{ id }, messageParams] = await Promise.all([params, searchParams]);
  const purchaseRequest = await getPurchaseRequest(id);
  if (!purchaseRequest) {
    return <NotFoundState title="Purchase request not available" description="This request may not exist, or you may not have access to it." action={{ href: "/purchase-requests", label: "Back to purchase requests" }} />;
  }
  const { request, lines, unresolvedLines } = purchaseRequest;
  const [auxiliaryResults, permissions, profile] = await Promise.all([
    Promise.allSettled([
      getPurchaseOrdersForRequest(id),
      getItemsForSelect(),
      getSuppliersForSelect(),
      getBranchSupplierMappingsForSelect(),
      getBranchesForSelect(),
      request.document_id ? getDocumentBundle(request.document_id) : Promise.resolve(null),
      getPhaseOneDeletePreview("purchase_request", request.id),
      getPurchaseRequestBranchStock(request.branch_id, lines.map((line) => line.item_id)),
      getRecoverableDocumentWorkflowAvailable(),
    ]),
    getPermissionMap([
      "purchase_request.create",
      "pr.submit",
      "pr.admin_review",
      "pr.purchasing_review",
      "pr.manager_approve",
      "pr.finance_review",
      "pr.convert_to_po",
      "pr.reject",
      "pr.cancel",
      "pr.view_all",
      "documents.attach",
    ]),
    getCurrentProfile(),
  ]);
  const [linkedOrdersResult, itemsResult, suppliersResult, supplierMappingsResult, branchesResult, documentBundleResult, deletePreviewResult, branchStockResult, recoveryCapabilityResult] = auxiliaryResults;
  for (const [result, source] of [
    [linkedOrdersResult, "page.purchaseRequestDetail.linkedOrders"],
    [itemsResult, "page.purchaseRequestDetail.itemDirectory"],
    [suppliersResult, "page.purchaseRequestDetail.supplierDirectory"],
    [supplierMappingsResult, "page.purchaseRequestDetail.supplierMappings"],
    [branchesResult, "page.purchaseRequestDetail.branchDirectory"],
    [documentBundleResult, "page.purchaseRequestDetail.documentBundle"],
    [deletePreviewResult, "page.purchaseRequestDetail.deletePreview"],
    [branchStockResult, "page.purchaseRequestDetail.branchStock"],
    [recoveryCapabilityResult, "page.purchaseRequestDetail.recoveryCapability"],
  ] as const) {
    if (result.status === "rejected") logServerError(result.reason, { source });
  }
  const linkedPurchaseOrders = linkedOrdersResult.status === "fulfilled" ? linkedOrdersResult.value : null;
  const items = itemsResult.status === "fulfilled" ? itemsResult.value : null;
  const suppliers = suppliersResult.status === "fulfilled" ? suppliersResult.value : null;
  const supplierMappings = supplierMappingsResult.status === "fulfilled" ? supplierMappingsResult.value : null;
  const branches = branchesResult.status === "fulfilled" ? branchesResult.value : null;
  const documentBundle = documentBundleResult.status === "fulfilled" ? documentBundleResult.value : null;
  const documentBundleUnavailable = Boolean(request.document_id && documentBundleResult.status === "rejected");
  const deletePreview = deletePreviewResult.status === "fulfilled" ? deletePreviewResult.value : null;
  const branchStock = branchStockResult.status === "fulfilled" ? branchStockResult.value : null;
  const stockByItemId = new Map((branchStock ?? []).map((stock) => [stock.itemId, stock]));
  const recoveryAvailable = recoveryCapabilityResult.status === "fulfilled" && recoveryCapabilityResult.value;
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  const supplierIds = suppliers ? new Set(suppliers.map((supplier) => supplier.id)) : null;
  const branch = branches?.find((row) => row.id === request.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0);
  const canViewCommercial = permissions["pr.view_all"] && !["kitchen", "kitchen_staff"].includes(String(profile?.role_code ?? "").toLowerCase());
  const roleCode = String(profile?.role_code ?? "").toLowerCase();
  const canManageDeletion = roleCode === "super_admin";
  const canSubmit = isStatus(request.status, "draft", "rejected", "returned") && permissions["pr.submit"];
  const canCancel = ["draft", "manager_review", "admin_review", "finance_review", "ready_to_convert"].includes(request.status) && permissions["pr.cancel"];
  const canEditDraft = request.status === "draft" && permissions["purchase_request.create"];
  const isOwner = roleCode === "super_admin";
  const canManagerReview = request.status === "manager_review" && permissions["pr.manager_approve"] && (roleCode === "manager" || isOwner);
  const canAdminReview = request.status === "admin_review" && permissions["pr.admin_review"] && (roleCode === "purchasing" || isOwner);
  const canFinanceReview = request.status === "finance_review" && permissions["pr.finance_review"] && (roleCode === "finance" || isOwner);
  const canRepairReviewLines = (canManagerReview || canAdminReview) && recoveryAvailable;
  const readinessByLine = new Map(lines.map((line) => [line.id, diagnosePurchaseRequestSupplier({
    line,
    item: itemById.get(line.item_id),
    branchId: request.branch_id,
    supplierIds,
    supplierMappings,
  })] as const));
  const blockingLineIssues = lines.flatMap((line) => {
    const diagnosis = readinessByLine.get(line.id);
    return diagnosis?.issue ? [{ line, diagnosis }] : [];
  });
  const canConvert = request.status === "ready_to_convert" && permissions["pr.convert_to_po"];
  const canReject =
    (request.status === "manager_review" && (roleCode === "manager" || isOwner) && (permissions["pr.manager_approve"] || permissions["pr.reject"])) ||
    (request.status === "admin_review" && (roleCode === "purchasing" || isOwner) && (permissions["pr.admin_review"] || permissions["pr.reject"])) ||
    (request.status === "finance_review" && (roleCode === "finance" || isOwner) && (permissions["pr.finance_review"] || permissions["pr.reject"]));
  const hasPrimaryAction = canSubmit || canManagerReview || canAdminReview || canFinanceReview || canConvert;
  const deleteControl = canManageDeletion && !canCancel ? (deletePreview?.eligible ? <DangerConfirmForm action={hardDeletePhaseOne.bind(null, "purchase_request", request.id)} title={`Permanently delete ${request.request_no}?`} description="This cannot be undone. Purchase request lines will be removed; the document number will remain consumed." warning="Type the exact request number to continue." checkboxLabel="I understand this permanently deletes the eligible request." confirmWord={deletePreview.confirmation} buttonLabel="Delete purchase request" pendingLabel="Deleting..." /> : <BlockedDestructiveAction buttonLabel="Delete purchase request" title={`Cannot delete ${request.request_no}`} description="Permanent deletion is blocked by the current status or linked records." recommendation={deletePreview ? Object.entries(deletePreview.dependencies).filter(([, count]) => count > 0).map(([key, count]) => `${key}: ${count}`).join("; ") : "Dependency preview unavailable."} />) : null;
  const saveDraftAction = canEditDraft ? <SubmitButton form="purchase-request-form" type="submit" pendingLabel="Saving..." className="w-full justify-center">Save draft changes</SubmitButton> : null;
  const secondaryActions = saveDraftAction || canCancel || canReject || deleteControl ? <div className="space-y-2">
    {saveDraftAction}
    {canReject ? <RejectActionForm action={rejectPurchaseRequest.bind(null, request.id)} /> : null}
    {canCancel ? (
      <DocumentActionForm action={cancelPurchaseRequest.bind(null, request.id)} pendingLabel="Removing..." variant="secondary">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Delete unposted request
      </DocumentActionForm>
    ) : null}
    {deleteControl}
  </div> : null;
  const nextStep = prSteps.find((step) => step.key === getPrWorkflowStep(request.status))?.description;
  const mobilePrimaryAction = canSubmit
    ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting..."><Send className="h-4 w-4" aria-hidden="true" />Submit PR</DocumentActionForm>
    : canManagerReview
      ? blockingLineIssues.length ? <Button asChild><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label={<><CircleCheck className="h-4 w-4" aria-hidden="true" />Approve as Manager</>} title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary />
      : canAdminReview
        ? blockingLineIssues.length ? <Button asChild><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={adminApprovePurchaseRequest.bind(null, request.id)} label={<><ShoppingCart className="h-4 w-4" aria-hidden="true" />Approve as Purchasing</>} title="Approve this PR as Purchasing?" description="This moves the request to Finance Review." pendingLabel="Approving..." mobilePrimary />
      : canFinanceReview
          ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label={<><BadgeCheck className="h-4 w-4" aria-hidden="true" />Approve as Finance</>} title="Approve this PR as Finance?" description="This marks the request ready for PO conversion." pendingLabel="Approving..." mobilePrimary />
          : canConvert
            ? <MobileTaskSheet label="Prepare Purchase Order"><form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="space-y-2"><Input name="autocount_po_no" placeholder="AutoCount PO Number" required /><SubmitButton type="submit" pendingLabel="Converting..." className="w-full justify-center"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Prepare Purchase Order</SubmitButton></form></MobileTaskSheet>
            : null;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Requests", href: "/purchase-requests" }, { label: request.request_no }]}
      documentNo={request.request_no}
      title="Purchase Request"
      status={getPrWorkflowLabel(request.status)}
      priority={request.priority}
      branch={branch?.branch_name ?? (!branches ? "Branch unavailable" : undefined)}
      workflowSteps={prSteps}
      currentStatus={getPrWorkflowStep(request.status)}
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Supporting Attachments" defaultLabel="Purchase Request Attachment" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /></> : null}
      mobileMoreOptions={secondaryActions ? <DocumentMoreOptions>{secondaryActions}</DocumentMoreOptions> : null}
      sidePanel={
        <>
          <DocumentActionSection description="Only the next valid workflow action is shown." moreOptions={secondaryActions}>
            <DocumentActionBar>
              {canSubmit ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting..." mobilePrimary><Send className="h-4 w-4" aria-hidden="true" />Submit to Manager Review</DocumentActionForm> : null}
              {canManagerReview ? blockingLineIssues.length ? <Button asChild className="w-full"><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label={<><CircleCheck className="h-4 w-4" aria-hidden="true" />Approve as Manager</>} title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary /> : null}
              {canAdminReview ? blockingLineIssues.length ? <Button asChild className="w-full"><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={adminApprovePurchaseRequest.bind(null, request.id)} label={<><ShoppingCart className="h-4 w-4" aria-hidden="true" />Approve as Purchasing</>} title="Approve this PR as Purchasing?" description="This moves the request to Finance Review." pendingLabel="Approving..." mobilePrimary /> : null}
              {canFinanceReview ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label={<><BadgeCheck className="h-4 w-4" aria-hidden="true" />Approve as Finance</>} title="Approve this PR as Finance?" description="This marks the request ready for PO conversion." pendingLabel="Approving..." mobilePrimary /> : null}
              {request.status === "converted_to_po" && linkedPurchaseOrders?.[0] ? (
                <Button asChild className="w-full justify-center"><a href={`/purchase-orders/${linkedPurchaseOrders[0].id}`}><FileCheck2 className="h-4 w-4" aria-hidden="true" />Open PO</a></Button>
              ) : null}
            </DocumentActionBar>
            {canConvert ? (
              <form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="mt-3 space-y-2" data-mobile-primary-action>
                <Input name="autocount_po_no" placeholder="AutoCount PO Number" required />
                <SubmitButton type="submit" pendingLabel="Converting..." className="w-full justify-center"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Convert to Purchase Order</SubmitButton>
              </form>
            ) : null}
            {!hasPrimaryAction ? <p className="text-xs text-muted-foreground">You can view this document, but there is no workflow action available for your role or this status.</p> : null}
          </DocumentActionSection>
          <DocumentSideSection title="Validation / Next Step"><p className="text-xs text-muted-foreground">{nextStep ?? "No further workflow step is available."}</p></DocumentSideSection>
          {documentBundle ? (
            <>
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} title="Supporting Attachments" defaultLabel="Purchase Request Attachment" canManage={permissions["documents.attach"]} documentStatus={documentBundle.document.status} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : documentBundleUnavailable ? <DocumentSideSection title="Document Activity"><div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">Attachments, comments, and timeline could not be loaded. Retry this page.</p></div></DocumentSideSection> : null}
        </>
      }
    >
      {messageParams.error || messageParams.success ? (
            <Card>
              <CardContent className={`p-3 text-xs ${messageParams.error ? "text-destructive" : "text-[var(--sb-success)]"}`}>
                {messageParams.error ?? messageParams.success}
                <StaleWorkflowRefresh message={messageParams.error} />
              </CardContent>
            </Card>
          ) : null}
      {documentBundleUnavailable ? <Card className="document-surface shadow-none md:hidden"><CardContent className="p-3" role="status"><p className="text-sm font-semibold text-[var(--sb-warning)]">Document activity unavailable</p><p className="mt-1 text-xs text-muted-foreground">Attachments, comments, and timeline could not be loaded. Retry this page.</p></CardContent></Card> : null}

      {blockingLineIssues.length ? <section id="pr-guided-issues" className="scroll-mt-32 rounded-[var(--sb-panel-radius)] bg-[var(--sb-warning-bg)] p-4" role="status">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" /><div><h2 className="text-sm font-semibold">{blockingLineIssues.length} item{blockingLineIssues.length === 1 ? " needs" : "s need"} attention before this review can continue</h2><p className="mt-1 text-xs text-muted-foreground">{recoveryAvailable ? `The PR remains saved in ${getPrWorkflowLabel(request.status)}. Open the warning icon on an affected row to use a mapped supplier, change UOM, select another supplier, replace the item, or remove that line. Other lines remain available.` : "The PR remains saved and readable. Guided repair setup is unavailable in this environment; ask an Owner to apply migration 170, then Retry this page. No line will be changed until setup is available."}</p></div></div>
      </section> : null}

      <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <h2 className="text-[14px] font-semibold">Request Summary</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-5">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.request_date)}</p></div>
                <div className="hidden" aria-hidden="true"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p><PriorityBadge priority={request.priority} /></div>
                {request.required_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Required Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.required_date)}</p></div> : null}
                {request.needed_by_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Needed By</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.needed_by_date)}</p></div> : null}
                {branch?.branch_name ? <div className="md:hidden"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p><p className="text-sm font-medium text-[var(--sb-text)]">{branch.branch_name}</p></div> : !branches ? <div role="status" className="md:hidden"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p><p className="text-sm font-medium text-[var(--sb-warning)]">Details unavailable</p></div> : null}
              </div>
              {request.urgency_reason ? <section aria-label="Urgency reason" className="border-t border-[var(--sb-border-soft)] pt-3"><h3 className="text-[11px] font-medium uppercase tracking-wide text-warning">Urgency reason</h3><p className="mt-1 whitespace-pre-wrap text-[13px] text-warning">{request.urgency_reason}</p></section> : null}
              {request.remarks ? <section aria-label="Remarks" className="border-t border-[var(--sb-border-soft)] pt-3"><h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Remarks</h3><p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[var(--sb-text)]">{request.remarks}</p></section> : null}
            </CardContent>
          </Card>

          <Card className="document-surface shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold">Requested Items</h2>
                {canViewCommercial ? <p className="text-xs font-semibold">{formatCurrency(total)}</p> : null}
              </div>
              {canEditDraft && items && supplierMappings && branches ? (
                <>
                  <PurchaseRequestForm
                    items={items}
                    supplierMappings={supplierMappings}
                    branches={branches}
                    action={updateDraftPurchaseRequest.bind(null, request.id)}
                    initialBranchId={request.branch_id ?? ""}
                    initialRemarks={request.remarks ?? ""}
                    initialRequestDate={request.request_date}
                    initialRequiredDate={request.required_date ?? ""}
                    initialPriority={request.priority}
                    initialNeededByDate={request.needed_by_date ?? ""}
                    initialUrgencyReason={request.urgency_reason ?? ""}
                    initialProductionRisk={request.production_risk}
                    initialUpdatedAt={request.updated_at}
                    lockBranch
                    initialLines={[...lines.map((line, index) => ({
                      key: index,
                      itemId: line.item_id,
                      itemSearch: `${itemById.get(line.item_id)?.item_code ?? ""} - ${itemById.get(line.item_id)?.item_name ?? line.item_id}`,
                      qty: String(line.qty),
                      uom: line.uom,
                      supplierId: line.suggested_supplier_id ?? "",
                      cost: String(line.estimated_unit_cost),
                      remarks: line.remarks ?? "",
                      reason: line.reason ?? "",
                    })), ...unresolvedLines.map((line, index) => ({
                      key: lines.length + index,
                      itemId: "",
                      itemSearch: line.requested_description,
                      qty: String(line.requested_qty),
                      uom: line.requested_uom,
                      supplierId: "",
                      cost: "0",
                      remarks: line.remarks ?? "",
                      reason: "",
                    }))]}
                    canViewCommercial={canViewCommercial}
                    reserveMobileActionSpace={false}
                  />
                </>
              ) : (
                <>
                  {canEditDraft ? <div role="status" className="mb-3 border-l-2 border-[var(--sb-warning)] pl-3"><p className="text-sm font-semibold">Draft editing unavailable</p><p className="mt-1 text-xs text-muted-foreground">Item, supplier-route, or branch options could not be loaded. Existing request lines remain read-only until you retry.</p></div> : null}
                  <Table mobileHidden aria-label="Requested items">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                           <TableHead>Supplier</TableHead>
                           <TableHead className="text-right">Qty</TableHead>
                           <TableHead>UOM</TableHead>
                           <TableHead>Current branch stock</TableHead>
                           {canViewCommercial ? <TableHead className="text-right">Est. Cost</TableHead> : null}
                           <TableHead>Reason</TableHead>
                           {canRepairReviewLines ? <TableHead className="w-12"><span className="sr-only">Repair</span></TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => {
                          const item = itemById.get(line.item_id);
                          const readiness = readinessByLine.get(line.id)!;
                          const supplierName = readiness.supplierName ?? (line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id)?.name ?? null : null);
                          const stock = stockByItemId.get(line.item_id);
                          return (
                            <TableRow key={line.id} data-guided-issue={readiness.issue?.code}>
                              <TableCell><p className="font-medium">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></TableCell>
                              <TableCell>{readiness.issue ? <div><p className="font-medium text-[var(--sb-warning)]">{supplierName ?? readiness.issue.message}</p><p className="mt-0.5 max-w-[28ch] text-[11px] text-muted-foreground">Next: {readiness.issue.recommendedAction}</p></div> : <span className="text-muted-foreground">{supplierName ?? "Mapped supplier"}</span>}</TableCell>
                              <TableCell className="text-right">{formatNumber(line.qty)}</TableCell>
                              <TableCell>{line.uom}</TableCell>
                              <TableCell>{stock ? <div><p className="font-medium">{formatNumber(stock.quantity)} {stock.uom}</p><p className="text-[11px] text-muted-foreground">As of {formatDateOnly(stock.asOf)} · {stock.source}</p></div> : <div><p className="font-medium text-[var(--sb-warning)]">Stock unavailable</p><Button asChild variant="ghost" size="sm" className="h-auto p-0 text-xs"><a href={`/purchase-requests/${request.id}`}>Retry</a></Button></div>}</TableCell>
                              {canViewCommercial ? <TableCell className="text-right">{formatCurrency(line.estimated_unit_cost)}</TableCell> : null}
                              <TableCell>{line.reason ?? "-"}</TableCell>
                              {canRepairReviewLines && items && supplierMappings && request.branch_id ? <TableCell><PurchaseRequestLineRecovery action={revisePurchaseRequestLine.bind(null, request.id)} line={line} itemLabel={`${item?.item_code ?? ""} - ${item?.item_name ?? line.item_id}`} items={items} mappings={supplierMappings} branchId={request.branch_id} issue={readiness.issue} suggestedSupplierId={readiness.suggestedSupplierId} /></TableCell> : canRepairReviewLines ? <TableCell><Button asChild variant="outline" size="sm"><a href={`/purchase-requests/${request.id}`}>Retry</a></Button></TableCell> : null}
                            </TableRow>
                          );
                        })}
                        {unresolvedLines.map((line) => <TableRow key={line.id}>
                          <TableCell><p className="font-medium">{line.requested_description}</p><p className="text-xs font-medium text-[var(--sb-warning)]">Non-catalog item · Purchasing match required</p></TableCell>
                          <TableCell>{canAdminReview && items ? <PurchaseRequestLineResolutionForm action={resolvePurchaseRequestUnresolvedLine.bind(null, request.id)} items={items} unresolvedLineId={line.id} description={line.requested_description} compact /> : <span className="text-muted-foreground">Not sourced yet</span>}</TableCell>
                          <TableCell className="text-right">{formatNumber(line.requested_qty)}</TableCell>
                          <TableCell>{line.requested_uom}</TableCell>
                          <TableCell><span className="text-muted-foreground">Available after item match</span></TableCell>
                          {canViewCommercial ? <TableCell className="text-right">—</TableCell> : null}
                          <TableCell>{line.remarks ?? "-"}</TableCell>
                        </TableRow>)}
                      </TableBody>
                  </Table>
                  <div className="divide-y divide-[var(--sb-border-soft)] xl:hidden" role="list" aria-label="Requested items">
                    {lines.map((line) => {
                      const item = itemById.get(line.item_id);
                      const readiness = readinessByLine.get(line.id)!;
                      const supplierName = readiness.supplierName ?? (line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id)?.name ?? null : null);
                      const stock = stockByItemId.get(line.item_id);
                      return <div key={line.id} role="listitem" data-guided-issue={readiness.issue?.code} className="min-w-0 py-3 text-[13px]">
                        <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-[12px] text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></div><div className="flex shrink-0 items-center gap-2"><p className="font-semibold">{formatNumber(line.qty)} {line.uom}</p>{canRepairReviewLines && items && supplierMappings && request.branch_id ? <PurchaseRequestLineRecovery action={revisePurchaseRequestLine.bind(null, request.id)} line={line} itemLabel={`${item?.item_code ?? ""} - ${item?.item_name ?? line.item_id}`} items={items} mappings={supplierMappings} branchId={request.branch_id} issue={readiness.issue} suggestedSupplierId={readiness.suggestedSupplierId} /> : null}</div></div>
                        {readiness.issue ? <div className="mt-1"><p className="break-words text-[12px] font-medium text-[var(--sb-warning)]">{supplierName ?? readiness.issue.message}</p><p className="text-[11px] text-muted-foreground">Next: {readiness.issue.recommendedAction}</p></div> : <p className="mt-1 break-words text-[12px] text-muted-foreground">Supplier: {supplierName ?? "Mapped supplier"}</p>}
                        {stock ? <p className="mt-1 text-[12px] text-muted-foreground">Current branch stock: <span className="font-medium text-foreground">{formatNumber(stock.quantity)} {stock.uom}</span> · As of {formatDateOnly(stock.asOf)}</p> : <p className="mt-1 text-[12px] font-medium text-[var(--sb-warning)]">Current branch stock unavailable · <a className="underline" href={`/purchase-requests/${request.id}`}>Retry</a></p>}
                        {line.reason ? <p className="mt-1 break-words text-[12px] text-muted-foreground">{line.reason}</p> : null}{canViewCommercial ? <p className="mt-1 text-right text-[12px] font-medium">{formatCurrency(line.estimated_unit_cost)} / {line.uom}</p> : null}
                      </div>;
                    })}
                    {unresolvedLines.map((line) => <div key={line.id} role="listitem" className="min-w-0 py-3 text-[13px]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{line.requested_description}</p><p className="text-[12px] font-medium text-[var(--sb-warning)]">Non-catalog item · Purchasing match required</p></div><p className="shrink-0 font-semibold">{formatNumber(line.requested_qty)} {line.requested_uom}</p></div>{line.remarks ? <p className="mt-1 text-[12px] text-muted-foreground">{line.remarks}</p> : null}{canAdminReview && items ? <div className="mt-2"><PurchaseRequestLineResolutionForm action={resolvePurchaseRequestUnresolvedLine.bind(null, request.id)} items={items} unresolvedLineId={line.id} description={line.requested_description} /></div> : null}</div>)}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-[12px] text-muted-foreground">Linked documents</p>
                <h2 className="text-[14px] font-semibold">Purchase Orders created from this PR</h2>
              </div>
              {linkedPurchaseOrders === null ? <div role="status" className="bg-secondary/30 p-3"><p className="text-[12px] font-semibold text-[var(--sb-warning)]">Linked purchase orders unavailable</p><p className="mt-1 text-[12px] text-muted-foreground">The PR remains available. Retry to load conversion links.</p></div> : linkedPurchaseOrders.length ? (
                <div className="grid min-w-0 gap-3 md:grid-cols-2">
                  {linkedPurchaseOrders.map((order) => (
                    <Button key={order.id} asChild variant="outline" className="h-auto min-w-0 justify-between gap-2 p-3">
                      <a href={`/purchase-orders/${order.id}`}>
                        <span className="min-w-0 text-left">
                          <DocumentNumber value={order.po_no} size="sm" className="max-w-full break-all" />
                          <span className="mt-1 block truncate text-[12px] text-muted-foreground">{order.supplier_name ?? "Supplier"}</span>
                        </span>
                        <span className="shrink-0 text-[13px] font-semibold">{formatCurrency(order.order_total)}</span>
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="bg-secondary/30 p-3 text-[12px] text-muted-foreground">
                  No purchase order has been created from this PR yet. The PO link will appear here after approval and conversion.
                </p>
              )}
            </CardContent>
          </Card>

    </DocumentWorkspace>
  );
}
