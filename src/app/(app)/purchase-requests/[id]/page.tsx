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
  submitPurchaseRequest,
} from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getBranchSupplierMappingsForSelect, getCurrentProfile, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrdersForRequest, getPurchaseRequest } from "@/server/queries/procurement";
import { getPhaseOneDeletePreview } from "@/server/queries/hard-delete";
import { hardDeletePhaseOne } from "@/server/actions/hard-delete";
import { PurchaseRequestForm } from "@/components/procurement-forms";
import { logServerError } from "@/server/observability/logger";

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
  const { request, lines } = purchaseRequest;
  const [auxiliaryResults, permissions, profile] = await Promise.all([
    Promise.allSettled([
      getPurchaseOrdersForRequest(id),
      getItemsForSelect(),
      getSuppliersForSelect(),
      getBranchSupplierMappingsForSelect(),
      getBranchesForSelect(),
      request.document_id ? getDocumentBundle(request.document_id) : Promise.resolve(null),
      getPhaseOneDeletePreview("purchase_request", request.id),
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
  const [linkedOrdersResult, itemsResult, suppliersResult, supplierMappingsResult, branchesResult, documentBundleResult, deletePreviewResult] = auxiliaryResults;
  for (const [result, source] of [
    [linkedOrdersResult, "page.purchaseRequestDetail.linkedOrders"],
    [itemsResult, "page.purchaseRequestDetail.itemDirectory"],
    [suppliersResult, "page.purchaseRequestDetail.supplierDirectory"],
    [supplierMappingsResult, "page.purchaseRequestDetail.supplierMappings"],
    [branchesResult, "page.purchaseRequestDetail.branchDirectory"],
    [documentBundleResult, "page.purchaseRequestDetail.documentBundle"],
    [deletePreviewResult, "page.purchaseRequestDetail.deletePreview"],
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
  const itemById = new Map((items ?? []).map((item) => [item.id, item]));
  const supplierById = new Map((suppliers ?? []).map((supplier) => [supplier.id, supplier]));
  const branch = branches?.find((row) => row.id === request.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0);
  const canViewCommercial = permissions["pr.view_all"] && !["kitchen", "kitchen_staff"].includes(String(profile?.role_code ?? "").toLowerCase());
  const roleCode = String(profile?.role_code ?? "").toLowerCase();
  const isFinance = roleCode === "finance";
  const canManageDeletion = roleCode === "super_admin";
  const canSubmit = isStatus(request.status, "draft", "rejected", "returned") && permissions["pr.submit"];
  const canCancel = ["draft", "manager_review", "admin_review", "finance_review", "ready_to_convert"].includes(request.status) && permissions["pr.cancel"];
  const canEditDraft = request.status === "draft" && permissions["purchase_request.create"];
  const canManagerReview = request.status === "manager_review" && permissions["pr.manager_approve"] && !isFinance;
  const canAdminReview = request.status === "admin_review" && permissions["pr.admin_review"];
  const canFinanceReview = request.status === "finance_review" && permissions["pr.finance_review"];
  const canConvert = request.status === "ready_to_convert" && permissions["pr.convert_to_po"];
  const canReject =
    (request.status === "manager_review" && !isFinance && (permissions["pr.manager_approve"] || permissions["pr.reject"])) ||
    (request.status === "admin_review" && (permissions["pr.admin_review"] || permissions["pr.reject"])) ||
    (request.status === "finance_review" && (permissions["pr.finance_review"] || permissions["pr.reject"]));
  const hasPrimaryAction = canSubmit || canManagerReview || canAdminReview || canFinanceReview || canConvert;
  const deleteControl = canManageDeletion && !canCancel ? (deletePreview?.eligible ? <DangerConfirmForm action={hardDeletePhaseOne.bind(null, "purchase_request", request.id)} title={`Permanently delete ${request.request_no}?`} description="This cannot be undone. Purchase request lines will be removed; the document number will remain consumed." warning="Type the exact request number to continue." checkboxLabel="I understand this permanently deletes the eligible request." confirmWord={deletePreview.confirmation} buttonLabel="Delete purchase request" pendingLabel="Deleting..." /> : <BlockedDestructiveAction buttonLabel="Delete purchase request" title={`Cannot delete ${request.request_no}`} description="Permanent deletion is blocked by the current status or linked records." recommendation={deletePreview ? Object.entries(deletePreview.dependencies).filter(([, count]) => count > 0).map(([key, count]) => `${key}: ${count}`).join("; ") : "Dependency preview unavailable."} />) : null;
  const secondaryActions = canCancel || canReject || deleteControl ? <div className="space-y-2">
              {canCancel ? <DocumentActionForm action={cancelPurchaseRequest.bind(null, request.id)} pendingLabel="Removing..." variant="destructive">Delete unposted request</DocumentActionForm> : null}
    {canReject ? <form action={rejectPurchaseRequest.bind(null, request.id)} className="space-y-2"><Input name="remarks" placeholder="Rejection remarks required" required /><SubmitButton type="submit" pendingLabel="Rejecting..." variant="destructive" className="w-full justify-center">Reject request</SubmitButton></form> : null}
    {deleteControl}
  </div> : null;
  const nextStep = prSteps.find((step) => step.key === getPrWorkflowStep(request.status))?.description;
  const mobilePrimaryAction = canSubmit
    ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting...">Submit PR</DocumentActionForm>
    : canManagerReview
      ? <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label="Approve as Manager" title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary />
      : canAdminReview
        ? <ConfirmActionForm action={adminApprovePurchaseRequest.bind(null, request.id)} label="Approve as Purchasing" title="Approve this PR as Purchasing?" description="This moves the request to Finance Review." pendingLabel="Approving..." mobilePrimary />
        : canFinanceReview
          ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label="Approve as Finance" title="Approve this PR as Finance?" description="This marks the request ready for PO conversion." pendingLabel="Approving..." mobilePrimary />
          : canConvert
            ? <MobileTaskSheet label="Prepare Purchase Order"><form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="space-y-2"><Input name="autocount_po_no" placeholder="AutoCount PO Number" required /><SubmitButton type="submit" pendingLabel="Converting..." className="w-full justify-center">Prepare Purchase Order</SubmitButton></form></MobileTaskSheet>
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
              {canSubmit ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting..." mobilePrimary>Submit to Manager Review</DocumentActionForm> : null}
              {canManagerReview ? <ConfirmActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} label="Approve as Manager" title="Approve this PR as Manager?" description="This moves the request to Purchasing Review." pendingLabel="Approving..." mobilePrimary /> : null}
              {canAdminReview ? <ConfirmActionForm action={adminApprovePurchaseRequest.bind(null, request.id)} label="Approve as Purchasing" title="Approve this PR as Purchasing?" description="This moves the request to Finance Review." pendingLabel="Approving..." mobilePrimary /> : null}
              {canFinanceReview ? <ConfirmActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} label="Approve as Finance" title="Approve this PR as Finance?" description="This marks the request ready for PO conversion." pendingLabel="Approving..." mobilePrimary /> : null}
              {request.status === "converted_to_po" && linkedPurchaseOrders?.[0] ? (
                <Button asChild className="w-full justify-center"><a href={`/purchase-orders/${linkedPurchaseOrders[0].id}`}>Open PO</a></Button>
              ) : null}
            </DocumentActionBar>
            {canConvert ? (
              <form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="mt-3 space-y-2" data-mobile-primary-action>
                <Input name="autocount_po_no" placeholder="AutoCount PO Number" required />
                <SubmitButton type="submit" pendingLabel="Converting..." className="w-full justify-center">Convert to Purchase Order</SubmitButton>
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

      <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <h2 className="text-[14px] font-semibold">Request Summary</h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-5">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.request_date)}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p><PriorityBadge priority={request.priority} /></div>
                {request.required_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Required Date</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.required_date)}</p></div> : null}
                {request.needed_by_date ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Needed By</p><p className="text-sm font-medium text-[var(--sb-text)]">{formatDateOnly(request.needed_by_date)}</p></div> : null}
                {branch?.branch_name ? <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p><p className="text-sm font-medium text-[var(--sb-text)]">{branch.branch_name}</p></div> : !branches ? <div role="status"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p><p className="text-sm font-medium text-[var(--sb-warning)]">Details unavailable</p></div> : null}
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
                    initialLines={lines.map((line, index) => ({
                      key: index,
                      itemId: line.item_id,
                      itemSearch: `${itemById.get(line.item_id)?.item_code ?? ""} - ${itemById.get(line.item_id)?.item_name ?? line.item_id}`,
                      qty: String(line.qty),
                      uom: line.uom,
                      supplierId: line.suggested_supplier_id ?? "",
                      cost: String(line.estimated_unit_cost),
                      remarks: line.remarks ?? "",
                      reason: line.reason ?? "",
                    }))}
                    canViewCommercial={canViewCommercial}
                  />
                  <div className="mt-4">
                    <SubmitButton form="purchase-request-form" type="submit" className="w-full">
                      Save draft changes
                    </SubmitButton>
                  </div>
                </>
              ) : (
                <>
                  {canEditDraft ? <div role="status" className="mb-3 border-l-2 border-[var(--sb-warning)] pl-3"><p className="text-sm font-semibold">Draft editing unavailable</p><p className="mt-1 text-xs text-muted-foreground">Item, supplier-route, or branch options could not be loaded. Existing request lines remain read-only until you retry.</p></div> : null}
                  <Table mobileHidden aria-label="Requested items">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead>Supplier Suggestion</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead>UOM</TableHead>
                          {canViewCommercial ? <TableHead className="text-right">Est. Cost</TableHead> : null}
                          <TableHead>Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lines.map((line) => {
                          const item = itemById.get(line.item_id);
                          const supplier = line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id) : null;
                          return (
                            <TableRow key={line.id}>
                              <TableCell><p className="font-medium">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></TableCell>
                              <TableCell><span className="text-muted-foreground">{line.suggested_supplier_id && !suppliers ? "Supplier details unavailable" : supplier?.name ?? "No supplier suggested"}</span></TableCell>
                              <TableCell className="text-right">{formatNumber(line.qty)}</TableCell>
                              <TableCell>{line.uom}</TableCell>
                              {canViewCommercial ? <TableCell className="text-right">{formatCurrency(line.estimated_unit_cost)}</TableCell> : null}
                              <TableCell>{line.reason ?? "-"}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                  </Table>
                  <div className="divide-y divide-[var(--sb-border-soft)] xl:hidden" role="list" aria-label="Requested items">
                    {lines.map((line) => {
                      const item = itemById.get(line.item_id);
                      const supplier = line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id) : null;
                      return <div key={line.id} role="listitem" className="min-w-0 py-3 text-[13px]"><div className="flex min-w-0 items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{!items ? "Item details unavailable" : item?.item_name ?? line.item_id}</p><p className="text-[12px] text-muted-foreground">{!items ? `Reference ${line.item_id}` : item?.item_code ?? "No item code"}</p></div><p className="shrink-0 font-semibold">{formatNumber(line.qty)} {line.uom}</p></div>{line.suggested_supplier_id && !suppliers ? <p className="mt-1 break-words text-[12px] text-[var(--sb-warning)]">Supplier details unavailable</p> : supplier ? <p className="mt-1 break-words text-[12px] text-muted-foreground">Supplier: {supplier.name}</p> : null}{line.reason ? <p className="mt-1 break-words text-[12px] text-muted-foreground">{line.reason}</p> : null}{canViewCommercial ? <p className="mt-1 text-right text-[12px] font-medium">{formatCurrency(line.estimated_unit_cost)} / {line.uom}</p> : null}</div>;
                    })}
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
