import { AlertTriangle, BadgeCheck, CircleCheck, CircleX, Clock, FileCheck2, MessageSquare, RotateCcw, Send, ShoppingCart, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { ConfirmActionForm } from "@/components/ui/confirm-action-form";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentActionSection, DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { DocumentMoreOptions, MobileTaskSheet } from "@/components/documents/mobile-document-surfaces";
import { PriorityBadge } from "@/components/priority-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { RejectActionForm } from "@/components/ui/reject-action-form";
import { NotFoundState } from "@/components/ui/system-states";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { getPrWorkflowLabel, getPrWorkflowStep, PR_WORKFLOW_STEP_LABELS, PURCHASE_REQUEST_WORKFLOW_STEPS } from "@/lib/purchase-request-status";
import { formatCurrency, formatDateOnly, formatDateTime, formatNumber } from "@/lib/utils";
import {
  adminApprovePurchaseRequest,
  addPurchaseRequestLineDuringReview,
  cancelPurchaseRequest,
  updateDraftPurchaseRequest,
  convertPurchaseRequestToPurchaseOrder,
  financeApprovePurchaseRequest,
  managerApprovePurchaseRequest,
  rejectPurchaseRequest,
  revisePurchaseRequestLine,
  resolvePurchaseRequestUnresolvedLine,
  submitPurchaseRequest,
  withdrawPurchaseRequest,
} from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getCurrentProfile, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getProcurementChainForRequest, getPurchaseOrdersForRequest, getPurchaseRequest, getPurchaseRequestBranchStock, getRecoverableDocumentWorkflowAvailable } from "@/server/queries/procurement";
import { ProcurementChain } from "@/components/procurement/procurement-chain";
import { getPhaseOneDeletePreview } from "@/server/queries/hard-delete";
import { hardDeletePhaseOne } from "@/server/actions/hard-delete";
import { PurchaseRequestForm } from "@/components/procurement-forms";
import { PurchaseRequestLineResolutionForm } from "@/components/purchase-request-line-resolution-form";
import { AddPurchaseRequestLineDialog } from "@/components/add-purchase-request-line-dialog";
import { logServerError } from "@/server/observability/logger";
import { PurchaseRequestLineRecovery } from "@/components/purchase-request-line-recovery";
import { diagnosePurchaseRequestSupplier } from "@/lib/purchase-request-readiness";
import { ActionErrorNotice } from "@/components/action-error-notice";

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
              ? "Legacy handoff needs PO creation to finish."
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
  searchParams: Promise<{ error?: string; success?: string; po_no?: string }>;
}) {
  const [{ id }, messageParams] = await Promise.all([params, searchParams]);
  const purchaseRequest = await getPurchaseRequest(id);
  if (!purchaseRequest) {
    return <NotFoundState title="Purchase request not available" description="This request may not exist, or you may not have access to it." action={{ href: "/purchase-requests", label: "Back to purchase requests" }} />;
  }
  const { request, lines, unresolvedLines } = purchaseRequest;
  const requestedItemCount = lines.length + unresolvedLines.length;
  // Resolve identity before loading the Owner-only hard-delete preview. A
  // non-owner must not invoke an RPC that is guaranteed to reject and pollute
  // the page's normal auxiliary-error log.
  const [permissions, profile] = await Promise.all([
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
  const roleCode = String(profile?.role_code ?? "").toLowerCase();
  const canManageDeletion = roleCode === "super_admin";
  const auxiliaryResults = await Promise.allSettled([
    getPurchaseOrdersForRequest(id),
    getItemsForSelect(),
    getSuppliersForSelect(),
    getBranchSupplierMappingsForSelect(),
    getBranchesForSelect(),
    request.document_id ? getDocumentBundle(request.document_id) : Promise.resolve(null),
    canManageDeletion ? getPhaseOneDeletePreview("purchase_request", request.id) : Promise.resolve(null),
    getPurchaseRequestBranchStock(request.branch_id, lines.map((line) => line.item_id)),
    getRecoverableDocumentWorkflowAvailable(),
    getProcurementChainForRequest(id),
  ]);
  const [linkedOrdersResult, itemsResult, suppliersResult, supplierMappingsResult, branchesResult, documentBundleResult, deletePreviewResult, branchStockResult, recoveryCapabilityResult, procurementChainResult] = auxiliaryResults;
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
    [procurementChainResult, "page.purchaseRequestDetail.procurementChain"],
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
  const rejectionActivity = documentBundle?.activityLogs
    .filter((activity) => activity.activity_type === "rejected")
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())[0] ?? null;
  const rejectionReason = rejectionActivity?.message.replace(/^Purchase request rejected:\s*/i, "").trim() ?? "";
  const deletePreview = deletePreviewResult.status === "fulfilled" ? deletePreviewResult.value : null;
  const branchStock = branchStockResult.status === "fulfilled" ? branchStockResult.value : null;
  const stockByItemId = new Map((branchStock ?? []).map((stock) => [stock.itemId, stock]));
  const recoveryAvailable = recoveryCapabilityResult.status === "fulfilled" && recoveryCapabilityResult.value;
  const procurementChain = procurementChainResult.status === "fulfilled" ? procurementChainResult.value : null;
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  const supplierIds = suppliers ? new Set(suppliers.map((supplier) => supplier.id)) : null;
  const branch = branches?.find((row) => row.id === request.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0);
  const canViewCommercial = permissions["pr.view_all"] && !["kitchen", "kitchen_staff"].includes(roleCode);
  const canSubmit = isStatus(request.status, "draft", "rejected", "returned") && permissions["pr.submit"];
  const isOwner = roleCode === "super_admin";
  const canCancel = request.status === "draft" && permissions["pr.cancel"];
  const canRequesterWithdraw = request.status === "manager_review" && permissions["pr.cancel"] && profile?.id === request.requested_by;
  const canOwnerRecoverWithdraw = request.status === "manager_review" && permissions["pr.cancel"] && isOwner && profile?.id !== request.requested_by;
  const canEditRequest = isStatus(request.status, "draft", "rejected", "returned") && permissions["purchase_request.create"] && (profile?.id === request.requested_by || isOwner);
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
  const summarySuppliers = [...new Set(lines.map((line) => {
    const readiness = readinessByLine.get(line.id);
    return readiness?.supplierName ?? (line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id)?.name ?? null : null);
  }).filter((name): name is string => Boolean(name)))];
  const selectedSupplierIds = [...new Set(lines.map((line) => readinessByLine.get(line.id)?.suggestedSupplierId ?? line.suggested_supplier_id).filter((supplierId): supplierId is string => Boolean(supplierId)))];
  const canonicalSupplierId = request.assigned_supplier_id ?? (selectedSupplierIds.length === 1 ? selectedSupplierIds[0] : null);
  const addLineItemIds = new Set((supplierMappings ?? []).filter((mapping) => mapping.branch_id === request.branch_id && mapping.supplier_id === canonicalSupplierId).map((mapping) => mapping.item_id));
  const addLineItems = (items ?? []).filter((item) => addLineItemIds.has(item.id)).sort((left, right) => left.item_code.localeCompare(right.item_code, undefined, { numeric: true, sensitivity: "base" }));
  const recoveryItems = (items ?? []).filter((item) => addLineItemIds.has(item.id) || lines.some((line) => line.item_id === item.id));
  const addLineSuppliers = (suppliers ?? []).filter((supplier) => supplier.id === canonicalSupplierId);
  const canConvert = request.status === "ready_to_convert" && permissions["pr.convert_to_po"];
  const canReject =
    (request.status === "manager_review" && (roleCode === "manager" || isOwner) && (permissions["pr.manager_approve"] || permissions["pr.reject"])) ||
    (request.status === "admin_review" && (roleCode === "purchasing" || isOwner) && (permissions["pr.admin_review"] || permissions["pr.reject"])) ||
    (request.status === "finance_review" && (roleCode === "finance" || isOwner) && (permissions["pr.finance_review"] || permissions["pr.reject"]));
  const hasPrimaryAction = canSubmit || canManagerReview || canAdminReview || canFinanceReview || canConvert;
  const deleteControl = canManageDeletion && !canCancel ? (deletePreview?.eligible ? <DangerConfirmForm action={hardDeletePhaseOne.bind(null, "purchase_request", request.id)} title={`Permanently delete ${request.request_no}?`} description="This cannot be undone. Purchase request lines will be removed; the document number will remain consumed." checkboxLabel="I understand this permanently deletes the eligible request." confirmWord={deletePreview.confirmation} buttonLabel="Delete purchase request" pendingLabel="Deleting..." /> : <BlockedDestructiveAction buttonLabel="Delete purchase request" title={`Cannot delete ${request.request_no}`} description="Permanent deletion is blocked by the current status or linked records." recommendation={deletePreview ? Object.entries(deletePreview.dependencies).filter(([, count]) => count > 0).map(([key, count]) => `${key}: ${count}`).join("; ") : "Dependency preview unavailable."} />) : null;
  const saveDraftAction = canEditRequest ? <SubmitButton form="purchase-request-form" type="submit" pendingLabel="Saving..." className="w-full justify-center">Save request changes</SubmitButton> : null;
  const withdrawControl = canRequesterWithdraw || canOwnerRecoverWithdraw ? <MobileTaskSheet label={canRequesterWithdraw ? "Revoke submission" : "Owner recovery: revoke submission"}><form action={withdrawPurchaseRequest.bind(null, request.id)} className="space-y-3"><p className="text-xs text-muted-foreground">Available only before Manager makes a decision. The request returns to Draft so it can be corrected or cancelled.</p><Field label="Revoke reason" required><Input name="reason" placeholder="Example: Submitted twice" required minLength={3} maxLength={500} /></Field><SubmitButton className="w-full justify-center" pendingLabel="Revoking..."><RotateCcw className="h-4 w-4" aria-hidden="true" />Revoke to Draft</SubmitButton></form></MobileTaskSheet> : null;
  const requestControls = saveDraftAction || canRequesterWithdraw || canCancel ? <div className="space-y-2">
    {saveDraftAction}
    {canRequesterWithdraw ? withdrawControl : null}
    {canCancel ? (
      <DocumentActionForm action={cancelPurchaseRequest.bind(null, request.id)} pendingLabel="Removing..." variant="outline">
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        Cancel unposted request
      </DocumentActionForm>
    ) : null}
  </div> : null;
  const administrativeControls = canOwnerRecoverWithdraw || deleteControl ? <div className="space-y-2">
    {canOwnerRecoverWithdraw ? withdrawControl : null}
    {deleteControl}
  </div> : null;
  const mobileMoreActions = requestControls || administrativeControls ? <div className="space-y-3">{requestControls}{administrativeControls}</div> : null;
  const nextStep = prSteps.find((step) => step.key === getPrWorkflowStep(request.status))?.description;
  const unresolvedSourcingNotice = unresolvedLines.length ? (
    <div className="flex items-start gap-2 rounded-[var(--sb-radius-control)] bg-[var(--sb-warning-bg)] p-2.5" role="status">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[var(--sb-text)]">{unresolvedLines.length} item{unresolvedLines.length === 1 ? "" : "s"} still need a Purchasing match.</p>
        <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
          {request.status === "manager_review"
            ? "Manager approval can continue; Purchasing must match these lines before Finance review."
            : request.status === "admin_review"
              ? "Resolve these lines before sending the request to Finance review."
              : "These lines must be matched before the request can be converted to a purchase order."}
        </p>
      </div>
    </div>
  ) : null;
  const mobilePrimaryAction = canSubmit
    ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting..."><Send className="h-4 w-4" aria-hidden="true" />Submit PR</DocumentActionForm>
    : canManagerReview
      ? blockingLineIssues.length ? <Button asChild><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label={<><CircleCheck className="h-4 w-4" aria-hidden="true" />Approve as Manager</>} title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary />
      : canAdminReview
        ? blockingLineIssues.length ? <Button asChild><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <MobileTaskSheet label="Complete Purchasing Review" primary><form action={adminApprovePurchaseRequest.bind(null, request.id)} className="space-y-3"><Field label="AutoCount PO Number" required><Input name="autocount_po_no" placeholder="Enter the number from AutoCount" required /></Field><p className="text-xs text-muted-foreground">Required before this request can move to Finance Review.</p><SubmitButton className="w-full justify-center" pendingLabel="Approving..."><ShoppingCart className="h-4 w-4" aria-hidden="true" />Send to Finance Review</SubmitButton></form></MobileTaskSheet>
      : canFinanceReview
          ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label={<><BadgeCheck className="h-4 w-4" aria-hidden="true" />Approve as Finance</>} title="Approve and create the PO?" description={`Finance approval will create ${request.autocount_po_no ?? "the saved AutoCount PO"} and make it ready to send.`} pendingLabel="Approving..." mobilePrimary />
          : canConvert
            ? <MobileTaskSheet label="Finish PO creation" primary><form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="space-y-2"><Field label="Saved AutoCount PO Number"><Input name="autocount_po_no" defaultValue={messageParams.po_no ?? request.autocount_po_no ?? ""} placeholder="AutoCount PO Number" required /></Field><p className="text-xs text-muted-foreground">Legacy recovery only. Correct the saved number here if AutoCount assigned a different one.</p><SubmitButton type="submit" pendingLabel="Finishing..." className="w-full justify-center"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Finish PO creation</SubmitButton></form></MobileTaskSheet>
            : request.status === "converted_to_po" && linkedPurchaseOrders?.[0]
              ? <Button asChild><a href={`/purchase-orders/${linkedPurchaseOrders[0].id}`}><FileCheck2 className="h-4 w-4" aria-hidden="true" />Open PO</a></Button>
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
      tabletRailMode="split"
      mobilePrimaryAction={mobilePrimaryAction}
      mobileActivity={documentBundle ? <><AttachmentPanel documentId={documentBundle.document.id} attachments={procurementChain?.attachments ?? documentBundle.attachments} title="Purchase files" canManage={permissions["documents.attach"]} canRemove={isOwner} documentStatus={documentBundle.document.status} /><CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} canRemove={isOwner} /><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /><RevisionPanel revisions={documentBundle.revisions} /></> : null}
      mobileMoreOptions={mobileMoreActions ? <DocumentMoreOptions>{mobileMoreActions}</DocumentMoreOptions> : null}
      sidePanel={
        <>
          {hasPrimaryAction || canReject || administrativeControls ? <DocumentActionSection moreOptions={administrativeControls} collapseMoreOptions>
            <DocumentActionBar>
              {canSubmit ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting..." mobilePrimary><Send className="h-4 w-4" aria-hidden="true" />Submit to Manager Review</DocumentActionForm> : null}
              {canManagerReview ? blockingLineIssues.length ? <Button asChild className="w-full"><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label={<><CircleCheck className="h-4 w-4" aria-hidden="true" />Approve as Manager</>} title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary /> : null}
              {canAdminReview ? blockingLineIssues.length ? <Button asChild className="w-full"><a href="#pr-guided-issues"><AlertTriangle className="h-4 w-4" />Review {blockingLineIssues.length} item issue{blockingLineIssues.length === 1 ? "" : "s"}</a></Button> : <form action={adminApprovePurchaseRequest.bind(null, request.id)} className="space-y-3"><Field label="AutoCount PO Number" required><Input name="autocount_po_no" placeholder="Enter the number from AutoCount" required /></Field><p className="text-[11px] leading-4 text-muted-foreground">Required before Finance Review.</p><SubmitButton className="w-full justify-center" pendingLabel="Approving..."><ShoppingCart className="h-4 w-4" aria-hidden="true" />Send to Finance Review</SubmitButton></form> : null}
              {canFinanceReview ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label={<><BadgeCheck className="h-4 w-4" aria-hidden="true" />Approve as Finance</>} title="Approve and create the PO?" description={`Finance approval will create ${request.autocount_po_no ?? "the saved AutoCount PO"} and make it ready to send.`} pendingLabel="Approving..." mobilePrimary /> : null}
              {request.status === "converted_to_po" && linkedPurchaseOrders?.[0] ? (
                <Button asChild className="w-full justify-center"><a href={`/purchase-orders/${linkedPurchaseOrders[0].id}`}><FileCheck2 className="h-4 w-4" aria-hidden="true" />Open PO</a></Button>
              ) : null}
            </DocumentActionBar>
            {canReject ? <div className="mt-2"><RejectActionForm action={rejectPurchaseRequest.bind(null, request.id)} label="Return for correction" pendingLabel="Returning..." title="Return this request for correction?" description="Add a clear reason so the requester knows what to revise before resubmitting." fieldLabel="Correction required" /></div> : null}
            {canConvert ? (
              <form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="mt-3 space-y-2" data-mobile-primary-action>
                <Field label="Saved AutoCount PO Number"><Input name="autocount_po_no" defaultValue={messageParams.po_no ?? request.autocount_po_no ?? ""} placeholder="AutoCount PO Number" required /></Field>
                <p className="text-[11px] leading-4 text-muted-foreground">Legacy recovery only. Correct this only if AutoCount assigned a different number.</p>
                <SubmitButton type="submit" pendingLabel="Finishing..." className="w-full justify-center"><FileCheck2 className="h-4 w-4" aria-hidden="true" />Finish PO creation</SubmitButton>
              </form>
            ) : null}
            {!hasPrimaryAction && !canReject && !requestControls && !administrativeControls ? <p className="text-xs text-muted-foreground">No action is required at this stage.</p> : null}
          </DocumentActionSection> : null}
          {requestControls ? <DocumentSideSection title="Request controls">{requestControls}</DocumentSideSection> : null}
          <DocumentSideSection title="Validation / Next Step">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{nextStep ?? "No further workflow step is available."}</p>
              {unresolvedSourcingNotice}
            </div>
          </DocumentSideSection>
          {documentBundle ? (
            <>
               <AttachmentPanel documentId={documentBundle.document.id} attachments={procurementChain?.attachments ?? documentBundle.attachments} title="Purchase files" canManage={permissions["documents.attach"]} canRemove={isOwner} documentStatus={documentBundle.document.status} />
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} canRemove={isOwner} />
              <div className="hidden xl:contents"><DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} /><RevisionPanel revisions={documentBundle.revisions} /></div>
            </>
          ) : documentBundleUnavailable ? <DocumentSideSection title="Document Activity"><div role="status"><p className="text-xs font-semibold text-[var(--sb-warning)]">Unavailable</p><p className="mt-1 text-xs text-muted-foreground">Attachments, comments, and timeline could not be loaded. Retry this page.</p></div></DocumentSideSection> : null}
        </>
      }
    >
      {messageParams.error && !/not active or available to this branch/i.test(messageParams.error) ? <ActionErrorNotice message={messageParams.error} /> : null}
      {messageParams.error && /not active or available to this branch/i.test(messageParams.error) ? <Card className="document-surface shadow-none"><CardContent className="p-3 text-sm"><p className="font-semibold">This item has no inventory history at this branch yet.</p><p className="mt-1 text-xs text-muted-foreground">Select it again to confirm the match. A zero-stock item can be linked without creating inventory movement.</p></CardContent></Card> : null}
      {messageParams.success ? (
            <Card>
              <CardContent className="p-3 text-xs text-[var(--sb-success)]">
                {messageParams.success}
              </CardContent>
            </Card>
          ) : null}
      {documentBundleUnavailable ? <Card className="document-surface shadow-none md:hidden"><CardContent className="p-3" role="status"><p className="text-sm font-semibold text-[var(--sb-warning)]">Document activity unavailable</p><p className="mt-1 text-xs text-muted-foreground">Attachments, comments, and timeline could not be loaded. Retry this page.</p></CardContent></Card> : null}

      {request.status === "rejected" && rejectionActivity ? <Card className="border-[var(--sb-danger)]/40 bg-[var(--sb-danger-bg)] shadow-none" role="alert">
        <CardContent className="flex items-start gap-3 p-3">
          <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-danger)]" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[var(--sb-danger)]">Purchase request was rejected. Correct it, then resubmit.</p>
            <div className="mt-2 space-y-1.5 text-sm leading-5 text-[var(--sb-text)]"><p className="flex items-start gap-2"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-danger)]" /><span>Comment: {rejectionReason || "No rejection reason was recorded."}</span></p><p className="flex items-center gap-2"><UserRound className="h-4 w-4 shrink-0 text-[var(--sb-danger)]" /><span>Rejected by {String(("created_by_name" in rejectionActivity ? rejectionActivity.created_by_name : null) ?? "Approver")}</span></p><p className="flex items-center gap-2"><Clock className="h-4 w-4 shrink-0 text-[var(--sb-danger)]" /><span>{formatDateTime(rejectionActivity.created_at)}</span></p></div>
          </div>
        </CardContent>
      </Card> : null}

      {blockingLineIssues.length ? <section id="pr-guided-issues" className="scroll-mt-32 rounded-[var(--sb-panel-radius)] bg-[var(--sb-warning-bg)] p-4" role="status">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sb-warning)]" /><div><h2 className="text-sm font-semibold">{blockingLineIssues.length} item{blockingLineIssues.length === 1 ? " needs" : "s need"} attention before this review can continue</h2><p className="mt-1 text-xs text-muted-foreground">{recoveryAvailable ? `The PR remains saved in ${getPrWorkflowLabel(request.status)}. Open the warning icon on an affected row to use a mapped supplier, change UOM, select another supplier, replace the item, or remove that line. Other lines remain available.` : "The PR remains saved and readable. Guided repair setup is unavailable in this environment; ask an Owner to apply migration 170, then Retry this page. No line will be changed until setup is available."}</p></div></div>
      </section> : null}

      <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <h2 className="text-[14px] font-semibold">Request Summary</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateTime(request.created_at)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Location</p><p className="text-sm font-medium text-[var(--sb-text)]">{branch?.branch_name ?? (branches ? "Unassigned" : "Unavailable")}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Submitted By</p><p className="text-sm font-medium text-[var(--sb-text)]">{request.requested_by_name ?? "—"}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Requested Lines</p><p className="text-sm font-medium text-[var(--sb-text)]">{requestedItemCount}</p></div>
                {canViewCommercial ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Est. Total Cost</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatCurrency(total)}</p></div> : null}
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Supplier</p><p className="whitespace-normal break-words text-sm font-medium text-[var(--sb-text)]">{summarySuppliers.length ? summarySuppliers.join(", ") : "Needs supplier mapping"}</p></div>
                <div className="hidden" aria-hidden="true"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p><PriorityBadge priority={request.priority} /></div>
                {request.required_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Required Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.required_date)}</p></div> : null}
                {request.needed_by_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Needed By</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.needed_by_date)}</p></div> : null}
              </div>
              {request.urgency_reason ? <section aria-label="Urgency reason" className="border-t border-[var(--sb-border-soft)] pt-3"><h3 className="text-[11px] font-medium uppercase tracking-wide text-warning">Urgency reason</h3><p className="mt-1 whitespace-pre-wrap text-[13px] text-warning">{request.urgency_reason}</p></section> : null}
              {request.remarks ? <section aria-label="Remarks" className="border-t border-[var(--sb-border-soft)] pt-3"><h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Remarks</h3><p className="mt-1 whitespace-pre-wrap text-[13px] leading-5 text-[var(--sb-text)]">{request.remarks}</p></section> : null}
            </CardContent>
          </Card>

          <Card className="document-surface shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex min-w-0 items-baseline gap-2"><h2 className="text-[14px] font-semibold">Requested Items</h2><span className="text-xs text-muted-foreground">{requestedItemCount} {requestedItemCount === 1 ? "item" : "items"}</span></div>
                {canViewCommercial ? <p className="text-xs font-semibold">{formatCurrency(total)}</p> : null}
              </div>
              {canEditRequest && items && suppliers && supplierMappings && branches ? (
                <>
                  <PurchaseRequestForm
                    items={items}
                    suppliers={suppliers}
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
                  {canEditRequest ? <div role="status" className="mb-3 rounded-[var(--sb-control-radius)] bg-[var(--sb-warning-soft)] p-3"><p className="text-sm font-semibold">Request editing unavailable</p><p className="mt-1 text-xs text-muted-foreground">Item, supplier-route, or branch options could not be loaded. Existing request lines remain read-only until you retry.</p></div> : null}
                  <Table mobileHidden aria-label="Requested items">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12 text-center">#</TableHead>
                          <TableHead>Item</TableHead>
                           <TableHead className="whitespace-nowrap text-right">Qty / UOM</TableHead>
                           <TableHead>Current branch stock</TableHead>
                           {canViewCommercial ? <TableHead className="text-right">Est. Cost</TableHead> : null}
                           <TableHead>Reason</TableHead>
                           {canRepairReviewLines ? <TableHead className="w-12"><span className="sr-only">Repair</span></TableHead> : null}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line, index) => {
                          const item = itemById.get(line.item_id);
                          const readiness = readinessByLine.get(line.id)!;
                          const stock = stockByItemId.get(line.item_id);
                          return (
                              <TableRow key={line.id} data-guided-issue={readiness.issue?.code} className={readiness.issue ? "bg-[var(--sb-danger-bg)]" : undefined}>
                              <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{index + 1}</TableCell>
                              <TableCell><p className="font-medium">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></TableCell>
                              <TableCell className="whitespace-nowrap text-right">{formatNumber(line.qty)} {line.uom}</TableCell>
                              <TableCell>{stock ? <div><p className="font-medium">{formatNumber(stock.quantity)} {stock.uom}</p><p className="text-[11px] text-muted-foreground">{formatDateOnly(stock.asOf)}</p></div> : <div><p className="font-medium text-muted-foreground">No branch stock history yet</p><p className="text-[11px] text-muted-foreground">New or not previously counted</p></div>}</TableCell>
                              {canViewCommercial ? <TableCell className="text-right">{formatCurrency(line.estimated_unit_cost)}</TableCell> : null}
                              <TableCell>{line.reason ?? "-"}</TableCell>
                              {canRepairReviewLines && items && suppliers && supplierMappings && request.branch_id ? <TableCell><PurchaseRequestLineRecovery action={revisePurchaseRequestLine.bind(null, request.id)} line={line} itemCode={item?.item_code ?? "No item code"} itemName={item?.item_name ?? line.item_id} items={recoveryItems} mappings={supplierMappings} suppliers={suppliers} branchId={request.branch_id} issue={readiness.issue} suggestedSupplierId={readiness.suggestedSupplierId} /></TableCell> : canRepairReviewLines ? <TableCell><Button asChild variant="outline" size="sm"><a href={`/purchase-requests/${request.id}`}>Retry</a></Button></TableCell> : null}
                            </TableRow>
                          );
                        })}
                        {unresolvedLines.map((line, index) => <TableRow key={line.id}>
                          <TableCell className="text-center text-xs tabular-nums text-muted-foreground">{lines.length + index + 1}</TableCell>
                          <TableCell><p className="font-medium">{line.requested_description}</p><p className="text-xs font-medium text-[var(--sb-danger)]">Non-catalog item · Purchasing match required</p></TableCell>
                          <TableCell className="whitespace-nowrap text-right">{formatNumber(line.requested_qty)} {line.requested_uom}</TableCell>
                          <TableCell><span className="text-muted-foreground">Available after item match</span></TableCell>
                          {canViewCommercial ? <TableCell className="text-right">—</TableCell> : null}
                          <TableCell>{line.remarks ?? "-"}</TableCell>
                          {canRepairReviewLines ? <TableCell>{canAdminReview && items ? <PurchaseRequestLineResolutionForm action={resolvePurchaseRequestUnresolvedLine.bind(null, request.id)} items={items} unresolvedLineId={line.id} description={line.requested_description} compact /> : null}</TableCell> : null}
                        </TableRow>)}
                      </TableBody>
                  </Table>
                  <div className="divide-y divide-[var(--sb-border-soft)] xl:hidden" role="list" aria-label="Requested items">
                    {lines.map((line, index) => {
                      const item = itemById.get(line.item_id);
                      const readiness = readinessByLine.get(line.id)!;
                      const supplierName = readiness.supplierName ?? (line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id)?.name ?? null : null);
                      const stock = stockByItemId.get(line.item_id);
                      return <div key={line.id} role="listitem" data-guided-issue={readiness.issue?.code} className={readiness.issue ? "min-w-0 bg-[var(--sb-danger-bg)] px-2 py-3 text-[13px]" : "min-w-0 py-3 text-[13px]"}>
                        <div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold tabular-nums text-muted-foreground">Item {index + 1}</p><p className="break-words font-semibold">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-[12px] text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></div><div className="flex shrink-0 items-start gap-2"><div className="text-right"><p className="font-semibold">{formatNumber(line.qty)} {line.uom}</p>{canViewCommercial ? <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">{formatCurrency(line.estimated_unit_cost)} / {line.uom}</p> : null}</div>{canRepairReviewLines && items && suppliers && supplierMappings && request.branch_id ? <PurchaseRequestLineRecovery action={revisePurchaseRequestLine.bind(null, request.id)} line={line} itemCode={item?.item_code ?? "No item code"} itemName={item?.item_name ?? line.item_id} items={recoveryItems} mappings={supplierMappings} suppliers={suppliers} branchId={request.branch_id} issue={readiness.issue} suggestedSupplierId={readiness.suggestedSupplierId} /> : null}</div></div>
                        {readiness.issue ? <div className="mt-1"><p className="break-words text-[12px] font-medium text-[var(--sb-danger)]">{supplierName ?? readiness.issue.message}</p></div> : null}
                        {stock ? <p className="mt-1 text-[12px] text-muted-foreground"><span className="font-medium text-foreground">{formatNumber(stock.quantity)} {stock.uom}</span> · {formatDateOnly(stock.asOf)}</p> : <p className="mt-1 text-[12px] text-muted-foreground">No branch stock history yet · New or not previously counted</p>}
                        {line.reason ? <p className="mt-1 break-words text-[12px] text-muted-foreground">{line.reason}</p> : null}
                      </div>;
                    })}
                    {unresolvedLines.map((line, index) => <div key={line.id} role="listitem" className="min-w-0 py-3 text-[13px]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="text-[11px] font-semibold tabular-nums text-muted-foreground">Item {lines.length + index + 1}</p><p className="break-words font-semibold">{line.requested_description}</p><p className="text-[12px] font-medium text-[var(--sb-danger)]">Non-catalog item · Purchasing match required</p></div><p className="shrink-0 font-semibold">{formatNumber(line.requested_qty)} {line.requested_uom}</p></div>{line.remarks ? <p className="mt-1 text-[12px] text-muted-foreground">{line.remarks}</p> : null}{canAdminReview && items ? <div className="mt-2"><PurchaseRequestLineResolutionForm action={resolvePurchaseRequestUnresolvedLine.bind(null, request.id)} items={items} unresolvedLineId={line.id} description={line.requested_description} /></div> : null}</div>)}
                  </div>
                  {canRepairReviewLines && canonicalSupplierId && items && suppliers && supplierMappings ? <div className="mt-3"><AddPurchaseRequestLineDialog action={addPurchaseRequestLineDuringReview.bind(null, request.id)} items={addLineItems} suppliers={addLineSuppliers} canViewCommercial={canViewCommercial} /></div> : null}
                </>
              )}
            </CardContent>
          </Card>

          {procurementChain ? <ProcurementChain nodes={procurementChain.nodes} /> : <Card className="document-surface shadow-none"><CardContent className="p-3 text-[12px] text-muted-foreground">Purchase chain unavailable. Retry this page to load linked PO, GRN, and invoice documents.</CardContent></Card>}

    </DocumentWorkspace>
  );
}
