import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentActionBar, DocumentActionForm } from "@/components/document-action-bar";
import { DocumentNumber } from "@/components/document-number";
import { AttachmentPanel, CommentsPanel, DocumentTimeline, RevisionPanel } from "@/components/documents/document-panels";
import { DocumentSideSection, DocumentWorkspace } from "@/components/documents/document-workspace";
import { StaleWorkflowRefresh } from "@/components/documents/stale-workflow-refresh";
import { PriorityBadge } from "@/components/priority-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { NotFoundState } from "@/components/ui/system-states";
import { BlockedDestructiveAction } from "@/components/ui/danger-confirm-form";
import { DangerConfirmForm } from "@/components/ui/danger-confirm-form";
import { getPrWorkflowLabel, getPrWorkflowStep, PR_WORKFLOW_STEP_LABELS, PURCHASE_REQUEST_WORKFLOW_STEPS } from "@/lib/purchase-request-status";
import { formatCurrency, formatNumber } from "@/lib/utils";
import {
  adminApprovePurchaseRequest,
  cancelPurchaseRequest,
  convertPurchaseRequestToPurchaseOrder,
  financeApprovePurchaseRequest,
  managerApprovePurchaseRequest,
  rejectPurchaseRequest,
  submitPurchaseRequest,
} from "@/server/actions/procurement";
import { getPermissionMap } from "@/server/auth/permissions";
import { getBranchesForSelect, getItemsForSelect, getSuppliersForSelect } from "@/server/queries/common";
import { getDocumentBundle } from "@/server/queries/documents";
import { getPurchaseOrdersForRequest, getPurchaseRequest } from "@/server/queries/procurement";
import { getPhaseOneDeletePreview } from "@/server/queries/hard-delete";
import { hardDeletePhaseOne } from "@/server/actions/hard-delete";

const prSteps = PURCHASE_REQUEST_WORKFLOW_STEPS.map((step) => ({
  key: step,
  label: PR_WORKFLOW_STEP_LABELS[step],
  description:
    step === "draft"
      ? "Kitchen prepares the request."
      : step === "manager_review"
        ? "Manager approves the purchase need."
        : step === "admin_review"
          ? "Admin keys in and checks completeness."
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
  const [linkedPurchaseOrders, items, suppliers, branches, permissions] = await Promise.all([
    getPurchaseOrdersForRequest(id).catch(() => []),
    getItemsForSelect().catch(() => []),
    getSuppliersForSelect().catch(() => []),
    getBranchesForSelect().catch(() => []),
    getPermissionMap(["pr.submit", "pr.admin_review", "pr.purchasing_review", "pr.manager_approve", "pr.finance_review", "pr.convert_to_po", "pr.reject", "pr.cancel"]),
  ]);
  const documentBundle = request.document_id ? await getDocumentBundle(request.document_id).catch(() => null) : null;
  const deletePreview = await getPhaseOneDeletePreview("purchase_request", request.id).catch(() => null);
  const itemById = new Map(items.map((item) => [item.id, item]));
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  const branch = branches.find((row) => row.id === request.branch_id);
  const total = lines.reduce((sum, line) => sum + line.qty * line.estimated_unit_cost, 0);
  const canSubmit = isStatus(request.status, "draft", "rejected", "returned") && permissions["pr.submit"];
  const canCancel = request.status === "draft" && permissions["pr.cancel"];
  const canManagerReview = request.status === "manager_review" && permissions["pr.manager_approve"];
  const canAdminReview = request.status === "admin_review" && permissions["pr.admin_review"];
  const canFinanceReview = request.status === "finance_review" && permissions["pr.finance_review"];
  const canConvert = request.status === "ready_to_convert" && permissions["pr.convert_to_po"];
  const canReject =
    (request.status === "manager_review" && (permissions["pr.manager_approve"] || permissions["pr.reject"])) ||
    (request.status === "admin_review" && (permissions["pr.admin_review"] || permissions["pr.reject"])) ||
    (request.status === "finance_review" && (permissions["pr.finance_review"] || permissions["pr.reject"]));
  const hasPrimaryAction =
    canSubmit ||
    canCancel ||
    canAdminReview ||
    canFinanceReview ||
    canConvert ||
    (request.status === "converted_to_po" && linkedPurchaseOrders.length > 0) ||
    canReject;

  return (
    <DocumentWorkspace
      breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Purchase Requests", href: "/purchase-requests" }, { label: request.request_no }]}
      documentNo={request.request_no}
      title="Purchase Request"
      status={getPrWorkflowLabel(request.status)}
      priority={request.priority}
      branch={branch?.branch_name}
      workflowSteps={prSteps}
      currentStatus={getPrWorkflowStep(request.status)}
      sidePanel={
        <>
          <DocumentSideSection title="Primary Action" description="Only the next valid workflow action is shown.">
            <DocumentActionBar>
              {canSubmit ? <DocumentActionForm action={submitPurchaseRequest.bind(null, request.id)} pendingLabel="Submitting...">Submit to Manager Review</DocumentActionForm> : null}
              {canCancel ? <DocumentActionForm action={cancelPurchaseRequest.bind(null, request.id)} pendingLabel="Cancelling..." variant="ghost">Cancel draft</DocumentActionForm> : null}
              {canManagerReview ? <DocumentActionForm action={managerApprovePurchaseRequest.bind(null, request.id)} pendingLabel="Approving...">Manager Approve</DocumentActionForm> : null}
              {canAdminReview ? <DocumentActionForm action={adminApprovePurchaseRequest.bind(null, request.id)} pendingLabel="Reviewing...">Complete Admin Review</DocumentActionForm> : null}
              {canFinanceReview ? <DocumentActionForm action={financeApprovePurchaseRequest.bind(null, request.id)} pendingLabel="Reviewing...">Complete Finance Review</DocumentActionForm> : null}
              {request.status === "converted_to_po" && linkedPurchaseOrders[0] ? (
                <Button asChild className="w-full justify-center"><a href={`/purchase-orders/${linkedPurchaseOrders[0].id}`}>Open PO</a></Button>
              ) : null}
              {deletePreview?.eligible ? <DangerConfirmForm action={hardDeletePhaseOne.bind(null, "purchase_request", request.id)} title={`Permanently delete ${request.request_no}?`} description="This cannot be undone. Purchase request lines will be removed; the document number will remain consumed." warning="Type the exact request number to continue." checkboxLabel="I understand this permanently deletes the eligible request." confirmWord={deletePreview.confirmation} buttonLabel="Delete purchase request" pendingLabel="Deleting..." /> : <BlockedDestructiveAction buttonLabel="Delete purchase request" title={`Cannot delete ${request.request_no}`} description="Permanent deletion is blocked by the current status or linked records." recommendation={deletePreview ? Object.entries(deletePreview.dependencies).filter(([, count]) => count > 0).map(([key, count]) => `${key}: ${count}`).join("; ") : "Dependency preview unavailable."} />}
            </DocumentActionBar>
            {canConvert ? (
              <form action={convertPurchaseRequestToPurchaseOrder.bind(null, request.id)} className="mt-3 space-y-2">
                <Input name="autocount_po_no" placeholder="AutoCount PO Number" required />
                <SubmitButton type="submit" pendingLabel="Converting..." className="w-full justify-center">Convert to Purchase Order</SubmitButton>
              </form>
            ) : null}
            {canReject ? (
              <form action={rejectPurchaseRequest.bind(null, request.id)} className="mt-3 space-y-2">
                <Input name="remarks" placeholder="Rejection remarks required" required />
                <SubmitButton type="submit" pendingLabel="Rejecting..." variant="destructive" className="w-full justify-center">Reject</SubmitButton>
              </form>
            ) : null}
            {!hasPrimaryAction ? <p className="text-xs text-muted-foreground">You can view this document, but there is no workflow action available for your role or this status.</p> : null}
          </DocumentSideSection>
          {documentBundle ? (
            <>
              <CommentsPanel documentId={documentBundle.document.id} comments={documentBundle.comments} />
              <AttachmentPanel documentId={documentBundle.document.id} attachments={documentBundle.attachments} />
              <DocumentTimeline document={documentBundle.document} activities={documentBundle.activityLogs} comments={documentBundle.comments} attachments={documentBundle.attachments} />
              <RevisionPanel revisions={documentBundle.revisions} />
            </>
          ) : null}
        </>
      }
    >
          {messageParams.error || messageParams.success ? (
            <Card>
              <CardContent className={`p-3 text-xs ${messageParams.error ? "text-destructive" : "text-emerald-700"}`}>
                {messageParams.error ?? messageParams.success}
                <StaleWorkflowRefresh message={messageParams.error} />
              </CardContent>
            </Card>
          ) : null}

          <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <h2 className="text-[14px] font-semibold">Request Summary</h2>
              <div className="grid gap-3 md:grid-cols-5">
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request Date</p><p className="text-sm font-medium text-slate-900">{request.request_date}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Priority</p><PriorityBadge priority={request.priority} /></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Required Date</p><p className="text-sm font-medium text-slate-900">{request.required_date ?? "-"}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Needed By</p><p className="text-sm font-medium text-slate-900">{request.needed_by_date ?? "-"}</p></div>
                <div><p className="text-[11px] uppercase tracking-wide text-muted-foreground">Branch</p><p className="text-sm font-medium text-slate-900">{branch?.branch_name ?? "-"}</p></div>
              </div>
              {request.urgency_reason ? <p className="rounded-md border bg-warning/10 p-3 text-xs text-warning">{request.urgency_reason}</p> : null}
              {request.remarks ? <p className="rounded-md border bg-secondary/30 p-3 text-xs">{request.remarks}</p> : null}
            </CardContent>
          </Card>

          <Card className="document-surface shadow-none">
            <CardContent className="space-y-3 p-4">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Linked Documents</p>
                <h2 className="text-sm font-semibold">Purchase Orders created from this PR</h2>
              </div>
              {linkedPurchaseOrders.length ? (
                <div className="grid gap-3 md:grid-cols-2">
                  {linkedPurchaseOrders.map((order) => (
                    <Button key={order.id} asChild variant="outline" className="h-auto justify-between p-4">
                      <a href={`/purchase-orders/${order.id}`}>
                        <span className="text-left">
                          <DocumentNumber value={order.po_no} size="sm" />
                          <span className="mt-1 block text-xs text-muted-foreground">{order.supplier_name ?? "Supplier"}</span>
                        </span>
                        <span className="text-sm font-semibold">{formatCurrency(order.order_total)}</span>
                      </a>
                    </Button>
                  ))}
                </div>
              ) : (
                <p className="rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground">
                  No purchase order has been created from this PR yet. The PO link will appear here after approval and conversion.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="document-surface shadow-none">
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[14px] font-semibold">Requested Items</h2>
                <p className="text-xs font-semibold">{formatCurrency(total)}</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Supplier Suggestion</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>UOM</TableHead>
                      <TableHead className="text-right">Est. Cost</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lines.map((line) => {
                      const item = itemById.get(line.item_id);
                      const supplier = line.suggested_supplier_id ? supplierById.get(line.suggested_supplier_id) : null;
                      return (
                        <TableRow key={line.id}>
                          <TableCell><p className="font-medium">{item?.item_name ?? line.item_id}</p><p className="text-xs text-muted-foreground">{item?.item_code ?? "No item code"}</p></TableCell>
                          <TableCell><span className="text-muted-foreground">{supplier?.name ?? "No supplier suggested"}</span></TableCell>
                          <TableCell className="text-right">{formatNumber(line.qty)}</TableCell>
                          <TableCell>{line.uom}</TableCell>
                          <TableCell className="text-right">{formatCurrency(line.estimated_unit_cost)}</TableCell>
                          <TableCell>{line.reason ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {documentBundle ? (
            <p className="rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground">Comments, attachments, timeline, and revision history are available in the right panel.</p>
          ) : null}
    </DocumentWorkspace>
  );
}
