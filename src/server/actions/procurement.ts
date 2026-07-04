"use server";

import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { purchaseOrderSchema, purchaseRequestSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { hasPermission, requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import type { ApprovalStatus, PurchaseOrderStatus, PurchaseRequestStatus } from "@/types/database";

type PurchaseRequestStep = "draft" | "admin_review" | "purchasing_review" | "pending_approval" | "approved";

const wrongPrStepMessage = "This document has already moved to another workflow step. Refreshing...";
const noPermissionMessage = "You do not have permission to perform this action.";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

async function requireActiveStaffProfile() {
  const profile = await identity();
  if (!profile?.id) throw new Error("You must be signed in with an active staff profile.");
  if ("status" in profile && profile.status !== "active") throw new Error("Your staff account is not active.");
  return profile;
}

async function requireBranchAccess(branchId: string | null) {
  if (!branchId) return;
  if (await hasPermission("pr.view_all")) return;

  const profile = await requireActiveStaffProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff_branches")
    .select("branch_id")
    .eq("staff_id", profile.id)
    .eq("branch_id", branchId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error(noPermissionMessage);
}

async function requirePrTransition(input: {
  id: string;
  expectedStatus: PurchaseRequestStep;
  permission: string;
}) {
  await requireActiveStaffProfile();
  if (!(await hasPermission(input.permission))) throw new Error(noPermissionMessage);

  const supabase = await createClient();
  const { data: pr, error } = await supabase
    .from("purchase_requests")
    .select("id, request_no, status, branch_id, document_id, company_id")
    .eq("id", input.id)
    .single();
  if (error) throw new Error(error.message);
  await requireBranchAccess(pr.branch_id);
  if (pr.status !== input.expectedStatus) throw new Error(wrongPrStepMessage);
  return pr;
}

async function notifyNextPrRole(input: {
  pr: { id: string; request_no: string; branch_id: string | null; company_id: string | null };
  nextStatus: PurchaseRequestStatus;
}) {
  const roleCodesByStatus: Partial<Record<PurchaseRequestStatus, string[]>> = {
    admin_review: ["operations_admin", "admin", "super_admin"],
    purchasing_review: ["purchasing", "admin", "super_admin"],
    pending_approval: ["manager", "admin", "super_admin"],
    approved: ["purchasing", "operations_admin", "admin", "super_admin"],
  };
  const roleCodes = roleCodesByStatus[input.nextStatus] ?? [];
  if (!roleCodes.length) return;

  const supabase = await createClient();
  const { data: roles, error: rolesError } = await supabase
    .from("roles")
    .select("id, role_code")
    .in("role_code", roleCodes)
    .eq("status", "active");
  if (rolesError) {
    console.error(rolesError);
    return;
  }

  const titleByStatus: Partial<Record<PurchaseRequestStatus, string>> = {
    admin_review: "PR Admin Review required",
    purchasing_review: "PR Purchasing Review required",
    pending_approval: "PR Manager Approval required",
    approved: "PR ready to convert to PO",
  };
  const messageByStatus: Partial<Record<PurchaseRequestStatus, string>> = {
    admin_review: `${input.pr.request_no} is waiting for Admin Review.`,
    purchasing_review: `${input.pr.request_no} is waiting for Purchasing Review.`,
    pending_approval: `${input.pr.request_no} is waiting for Manager Approval.`,
    approved: `${input.pr.request_no} is approved and ready to convert to PO.`,
  };

  const notifications = (roles ?? []).map((role) => ({
    company_id: input.pr.company_id,
    recipient_role_id: role.id,
    branch_id: input.pr.branch_id,
    title: titleByStatus[input.nextStatus] ?? "Purchase Request update",
    message: messageByStatus[input.nextStatus] ?? `${input.pr.request_no} has moved to the next workflow step.`,
    action_url: `/purchase-requests/${input.pr.id}`,
    priority: input.nextStatus === "pending_approval" ? "high" : "normal",
    entity_type: "purchase_request",
    entity_id: input.pr.id,
  }));
  if (!notifications.length) return;
  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) console.error(error);
}

function extractPurchaseRequest(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const qtys = formData.getAll("line_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const costs = formData.getAll("line_estimated_unit_cost").map(String);
  const suppliers = formData.getAll("line_suggested_supplier_id").map(String);
  const reasons = formData.getAll("line_reason").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  return purchaseRequestSchema.parse({
    request_no: formData.get("request_no"),
    request_date: formData.get("request_date"),
    required_date: formData.get("required_date"),
    priority: formData.get("priority") ?? "normal",
    needed_by_date: formData.get("needed_by_date"),
    urgency_reason: formData.get("urgency_reason"),
    production_risk: formData.get("production_risk") === "on",
    branch_id: formData.get("branch_id"),
    location_id: formData.get("location_id"),
    status: formData.get("status") ?? "draft",
    remarks: formData.get("remarks"),
    lines: itemIds
      .map((itemId, index) => ({
        item_id: itemId,
        qty: qtys[index],
        uom: uoms[index],
        estimated_unit_cost: costs[index] ?? 0,
        suggested_supplier_id: suppliers[index] || null,
        reason: reasons[index],
        remarks: remarks[index],
      }))
      .filter((line) => line.item_id),
  });
}

function extractPurchaseOrder(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const qtys = formData.getAll("line_qty_ordered").map(String);
  const received = formData.getAll("line_qty_received").map(String);
  const cancelled = formData.getAll("line_qty_cancelled").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const prices = formData.getAll("line_unit_price").map(String);
  return purchaseOrderSchema.parse({
    po_no: formData.get("po_no"),
    supplier_id: formData.get("supplier_id"),
    order_date: formData.get("order_date"),
    expected_delivery_date: formData.get("expected_delivery_date"),
    status: formData.get("status") ?? "draft",
    approval_status: formData.get("approval_status") ?? "draft",
    remarks: formData.get("remarks"),
    lines: itemIds
      .map((itemId, index) => ({
        item_id: itemId,
        qty_ordered: qtys[index],
        qty_received: received[index] ?? 0,
        qty_cancelled: cancelled[index] ?? 0,
        uom: uoms[index],
        unit_price: prices[index] ?? 0,
      }))
      .filter((line) => line.item_id),
  });
}

async function ensureActiveItems(itemIds: string[]) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("id,status").in("id", itemIds);
  if (error) throw new Error(error.message);
  const active = new Set((data ?? []).filter((item) => item.status === "active").map((item) => item.id));
  const inactive = itemIds.filter((id) => !active.has(id));
  if (inactive.length) throw new Error("All selected items must be active.");
}

async function createLinkedDocument(input: {
  documentNo: string;
  documentType: string;
  title: string;
  relatedEntityType: string;
  relatedEntityId: string;
  status?: "draft" | "pending_approval" | "approved";
  approvalStatus?: ApprovalStatus;
}) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: profile?.company_id ?? null,
      document_no: input.documentNo,
      document_type: input.documentType,
      title: input.title,
      status: input.status ?? "draft",
      approval_status: input.approvalStatus ?? "draft",
      current_step: input.status === "pending_approval" ? "Manager approval" : "Draft",
      related_entity_type: input.relatedEntityType,
      related_entity_id: input.relatedEntityId,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial document created.", changed_by: profile?.id ?? null });
  return data.id;
}

async function createPurchaseOrderCreatedNotification(input: { poId: string; poNo: string; prNo: string; companyId: string | null; staffId: string | null }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("notifications").insert({
    company_id: input.companyId,
    recipient_user_id: user?.id ?? null,
    recipient_staff_id: input.staffId,
    title: "Purchase Order created",
    message: `${input.poNo} created from ${input.prNo}.`,
    action_url: `/purchase-orders/${input.poId}`,
    priority: "normal",
    entity_type: "purchase_order",
    entity_id: input.poId,
    actor_user_id: user?.id ?? null,
    created_by: input.staffId,
  });

  if (error) {
    console.error(error);
  }
}

export async function createPurchaseRequest(formData: FormData) {
  await requirePermissionOrRedirect("purchase_request.create", "/purchase-requests/new");
  try {
    const payload = extractPurchaseRequest(formData);
    if (isMockMode()) redirect("/purchase-requests");
    const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);
    await ensureActiveItems(payload.lines.map((line) => line.item_id));
    const profile = await identity();
    const requestNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "purchase_request",
      enteredNumber: payload.request_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("purchase_requests")
      .insert({
        company_id: profile?.company_id ?? null,
        request_no: requestNo,
        requested_by: profile?.id ?? null,
        request_date: payload.request_date,
        required_date: cleanText(formData.get("required_date")),
        priority: payload.priority,
        needed_by_date: cleanText(formData.get("needed_by_date")),
        urgency_reason: payload.urgency_reason,
        production_risk: Boolean(payload.production_risk),
        branch_id: payload.branch_id,
        location_id: locationId,
        status: payload.status,
        remarks: payload.remarks,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const documentId = await createLinkedDocument({ documentNo: requestNo, documentType: "purchase_request", title: `Purchase Request ${requestNo}`, relatedEntityType: "purchase_request", relatedEntityId: data.id });
    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("purchase_requests").update({ document_id: documentId }).eq("id", data.id),
      supabase.from("purchase_request_lines").insert(payload.lines.map((line) => ({ ...line, suggested_supplier_id: line.suggested_supplier_id || null, purchase_request_id: data.id }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase request ${requestNo} created` });
    revalidateWorkspaceState(["/purchase-requests"]);
    redirect(`/purchase-requests/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-requests/new", "error", formatActionError(error, "Could not create this purchase request."));
  }
}

async function updatePrStatus(input: {
  id: string;
  expectedStatus: PurchaseRequestStep;
  nextStatus: PurchaseRequestStatus;
  permission: string;
  documentStatus: "draft" | "pending_approval" | "approved" | "rejected" | "cancelled";
  approvalStatus: ApprovalStatus;
  step: string;
  message: string;
  activityType?: string;
}) {
  const supabase = await createClient();
  const profile = await requireActiveStaffProfile();
  const pr = await requirePrTransition({
    id: input.id,
    expectedStatus: input.expectedStatus,
    permission: input.permission,
  });
  const { data: updatedPr, error } = await supabase
    .from("purchase_requests")
    .update({ status: input.nextStatus, updated_by: profile.id })
    .eq("id", input.id)
    .eq("status", input.expectedStatus)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updatedPr) throw new Error(wrongPrStepMessage);

  const { error: documentError } = pr.document_id
    ? await supabase
        .from("documents")
        .update({ status: input.documentStatus, approval_status: input.approvalStatus, current_step: input.step, updated_by: profile.id })
        .eq("id", pr.document_id)
    : { error: null };
  if (documentError) throw new Error(documentError.message);
  if (pr.document_id) {
    await writeActivityLog({
      entityType: "document",
      entityId: pr.document_id,
      activityType: input.activityType ?? input.nextStatus,
      message: input.message,
      metadata: { workflow_step: input.expectedStatus, next_status: input.nextStatus },
    });
  }
  await notifyNextPrRole({ pr, nextStatus: input.nextStatus });
  revalidateWorkspaceState([`/purchase-requests/${input.id}`]);
  return pr;
}

export async function submitPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await updatePrStatus({
      id,
      expectedStatus: "draft",
      nextStatus: "admin_review",
      permission: "pr.submit",
      documentStatus: "pending_approval",
      approvalStatus: "pending",
      step: "Admin Review",
      message: "Purchase request submitted to Admin Review",
      activityType: "submitted",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} submitted to Admin Review. Administrator has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not submit this purchase request."));
  }
}

export async function adminReviewPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await updatePrStatus({
      id,
      expectedStatus: "admin_review",
      nextStatus: "purchasing_review",
      permission: "pr.admin_review",
      documentStatus: "pending_approval",
      approvalStatus: "pending",
      step: "Purchasing Review",
      message: "Admin Review completed",
      activityType: "admin_review_completed",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Admin Review completed. Purchasing has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Admin Review."));
  }
}

export async function purchasingReviewPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await updatePrStatus({
      id,
      expectedStatus: "purchasing_review",
      nextStatus: "pending_approval",
      permission: "pr.purchasing_review",
      documentStatus: "pending_approval",
      approvalStatus: "pending",
      step: "Manager Approval",
      message: "Purchasing Review completed",
      activityType: "purchasing_review_completed",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Purchasing Review completed. Manager has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Purchasing Review."));
  }
}

export async function approvePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await updatePrStatus({
      id,
      expectedStatus: "pending_approval",
      nextStatus: "approved",
      permission: "pr.manager_approve",
      documentStatus: "approved",
      approvalStatus: "approved",
      step: "Approved",
      message: "Manager approved purchase request",
      activityType: "manager_approved",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Manager Approval completed. Next step has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not approve this purchase request."));
  }
}

export async function rejectPurchaseRequest(id: string, formData: FormData) {
  try {
    const remarks = cleanText(formData.get("remarks"));
    if (!remarks) throw new Error("Rejection remarks are required.");
    if (isMockMode()) return;
    const supabase = await createClient();
    const { data: pr, error: prError } = await supabase.from("purchase_requests").select("status").eq("id", id).single();
    if (prError) throw new Error(prError.message);
    const transition =
      pr.status === "admin_review"
        ? { expectedStatus: "admin_review" as const, permission: "pr.admin_review", step: "Admin Review" }
        : pr.status === "purchasing_review"
          ? { expectedStatus: "purchasing_review" as const, permission: "pr.purchasing_review", step: "Purchasing Review" }
          : pr.status === "pending_approval"
            ? { expectedStatus: "pending_approval" as const, permission: "pr.manager_approve", step: "Manager Approval" }
            : null;
    if (!transition) throw new Error("This request is not at a rejectable workflow step.");
    const canReject = (await hasPermission("pr.reject")) || (await hasPermission(transition.permission));
    if (!canReject) throw new Error(noPermissionMessage);
    const updated = await updatePrStatus({
      id,
      expectedStatus: transition.expectedStatus,
      nextStatus: "rejected",
      permission: transition.permission,
      documentStatus: "rejected",
      approvalStatus: "rejected",
      step: "Rejected",
      message: `${transition.step} rejected: ${remarks}`,
      activityType: "rejected",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${updated.request_no} rejected by ${transition.step.replace(" Approval", "")}. Requester has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not reject this purchase request."));
  }
}

export async function cancelPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await updatePrStatus({
      id,
      expectedStatus: "draft",
      nextStatus: "cancelled",
      permission: "pr.cancel",
      documentStatus: "cancelled",
      approvalStatus: "cancelled",
      step: "Cancelled",
      message: "Purchase request cancelled",
      activityType: "cancelled",
    });
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} cancelled.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not cancel this purchase request."));
  }
}

export async function createPurchaseOrder(formData: FormData) {
  await requirePermission("purchase_order.create");
  try {
    const payload = extractPurchaseOrder(formData);
    if (isMockMode()) redirect("/purchase-orders");
    await ensureActiveItems(payload.lines.map((line) => line.item_id));
    const profile = await identity();
    const poNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "purchase_order",
      enteredNumber: payload.po_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: profile?.company_id ?? null,
        po_no: poNo,
        supplier_id: payload.supplier_id,
        order_date: payload.order_date,
        expected_delivery_date: cleanText(formData.get("expected_delivery_date")),
        status: payload.status,
        approval_status: payload.approval_status,
        remarks: payload.remarks,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const documentId = await createLinkedDocument({ documentNo: poNo, documentType: "purchase_order", title: `Purchase Order ${poNo}`, relatedEntityType: "purchase_order", relatedEntityId: data.id });
    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("purchase_orders").update({ document_id: documentId }).eq("id", data.id),
      supabase.from("purchase_order_lines").insert(payload.lines.map((line) => ({ ...line, purchase_order_id: data.id }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase order ${poNo} created` });
    revalidateWorkspaceState(["/purchase-orders"]);
    redirect(`/purchase-orders/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-orders/new", "error", formatActionError(error, "Could not create this purchase order."));
  }
}

async function updatePoStatus(id: string, status: PurchaseOrderStatus, approvalStatus: ApprovalStatus, step: string, message: string) {
  const supabase = await createClient();
  const profile = await identity();
  const { data: order, error: orderError } = await supabase.from("purchase_orders").select("status,document_id,po_no").eq("id", id).single();
  if (orderError) throw new Error(orderError.message);
  if (order.status === status) return order;
  const documentStatus = status === "approved" || status === "sent" ? "approved" : status === "cancelled" ? "cancelled" : status === "closed" ? "closed" : "pending_approval";
  const [{ error }, { error: documentError }] = await Promise.all([
    supabase.from("purchase_orders").update({ status, approval_status: approvalStatus, updated_by: profile?.id ?? null }).eq("id", id),
    order.document_id
      ? supabase.from("documents").update({ status: documentStatus, approval_status: approvalStatus, current_step: step, updated_by: profile?.id ?? null }).eq("id", order.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (documentError) throw new Error(documentError.message);
  if (order.document_id) await writeActivityLog({ entityType: "document", entityId: order.document_id, activityType: status, message });
  revalidateWorkspaceState([`/purchase-orders/${id}`]);
  return order;
}

export async function submitPurchaseOrder(id: string) {
  try {
    await requirePermission("po.submit");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "pending_approval", "pending", "Manager approval", "Purchase order submitted for approval");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} submitted for approval.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not submit this purchase order."));
  }
}

export async function approvePurchaseOrder(id: string) {
  try {
    await requirePermission("po.approve");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "approved", "approved", "Approved", "Purchase order approved");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} approved.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not approve this purchase order."));
  }
}

export async function rejectPurchaseOrder(id: string) {
  try {
    await requirePermission("po.approve");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "cancelled", "rejected", "Rejected", "Purchase order rejected");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} rejected.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not reject this purchase order."));
  }
}

export async function sendPurchaseOrder(id: string) {
  try {
    await requirePermission("po.send");
    if (isMockMode()) return;
    const supabase = await createClient();
    const { data, error } = await supabase.from("purchase_orders").select("approval_status,status,po_no").eq("id", id).single();
    if (error) throw new Error(error.message);
    if (data.status === "sent") safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${data.po_no} has already been sent.`);
    if (data.approval_status !== "approved") throw new Error("Cannot send unapproved PO.");
    const order = await updatePoStatus(id, "sent", "approved", "Sent to supplier", "Purchase order sent to supplier");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} sent to supplier.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not send this purchase order."));
  }
}

export async function cancelPurchaseOrder(id: string) {
  try {
    await requirePermission("purchase_order.cancel");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "cancelled", "cancelled", "Cancelled", "Purchase order cancelled");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} cancelled.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not cancel this purchase order."));
  }
}

export async function closePurchaseOrder(id: string) {
  try {
    await requirePermission("purchase_order.close");
    if (isMockMode()) return;
    const order = await updatePoStatus(id, "closed", "approved", "Closed", "Purchase order closed");
    safeRedirectWithMessage(`/purchase-orders/${id}`, "success", `${order.po_no} closed.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-orders/${id}`, "error", formatActionError(error, "Could not close this purchase order."));
  }
}

export async function convertPurchaseRequestToPurchaseOrder(id: string) {
  let reservedConversion = false;
  try {
    if (isMockMode()) redirect("/purchase-orders/po-mock-001");
    const supabase = await createClient();
    const [{ data: pr, error: prError }, { data: lines, error: linesError }, { data: existingPo, error: existingPoError }] = await Promise.all([
      supabase.from("purchase_requests").select("*").eq("id", id).single(),
      supabase.from("purchase_request_lines").select("*").eq("purchase_request_id", id),
      supabase.from("purchase_orders").select("id, po_no").eq("purchase_request_id", id).is("deleted_at", null).order("created_at", { ascending: true }).limit(1),
    ]);
    if (prError) throw new Error(prError.message);
    if (linesError) throw new Error(linesError.message);
    if (existingPoError) throw new Error(existingPoError.message);
    if (existingPo?.[0]) {
      safeRedirectWithMessage(`/purchase-orders/${existingPo[0].id}`, "success", `Purchase order ${existingPo[0].po_no} is already linked to this PR.`);
    }
    await requirePrTransition({ id, expectedStatus: "approved", permission: "pr.convert_to_po" });
    if (pr.status !== "approved") throw new Error(wrongPrStepMessage);
    if (!lines?.length) throw new Error("Add at least one item line before converting this PR.");

    const supplierIds = new Set(lines.map((line) => line.suggested_supplier_id).filter(Boolean));
    if (supplierIds.size === 0 || lines.some((line) => !line.suggested_supplier_id)) {
      throw new Error("Choose a supplier for every PR line before converting to PO.");
    }
    if (supplierIds.size > 1) {
      throw new Error("This PR has multiple suppliers. Split the request or keep one supplier before converting.");
    }
    const [supplierId] = Array.from(supplierIds);
    if (!supplierId) throw new Error("PO supplier is required.");

    const profile = await identity();
    const { data: reservedPr, error: reserveError } = await supabase
      .from("purchase_requests")
      .update({ status: "converted", updated_by: profile?.id ?? null })
      .eq("id", id)
      .eq("status", "approved")
      .select("id")
      .maybeSingle();
    if (reserveError) throw new Error(reserveError.message);
    if (!reservedPr) throw new Error(wrongPrStepMessage);
    reservedConversion = true;

    const poNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "purchase_order",
      enteredNumber: null,
    });
    const { data: po, error: poError } = await supabase
      .from("purchase_orders")
      .insert({
        company_id: pr.company_id,
        purchase_request_id: id,
        po_no: poNo,
        supplier_id: supplierId,
        order_date: pr.request_date,
        expected_delivery_date: pr.needed_by_date ?? pr.required_date,
        priority: pr.priority ?? "normal",
        needed_by_date: pr.needed_by_date ?? pr.required_date,
        urgency_reason: pr.urgency_reason,
        production_risk: pr.production_risk ?? false,
        status: "draft",
        approval_status: "draft",
        remarks: pr.remarks ? `Created from ${pr.request_no}. ${pr.remarks}` : `Created from ${pr.request_no}.`,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (poError) throw new Error(poError.message);
    const documentId = await createLinkedDocument({ documentNo: poNo, documentType: "purchase_order", title: `Purchase Order ${poNo}`, relatedEntityType: "purchase_order", relatedEntityId: po.id });
    const [{ error: poUpdateError }, { error: poLinesError }, { error: prUpdateError }, { error: prDocumentError }] = await Promise.all([
      supabase.from("purchase_orders").update({ document_id: documentId }).eq("id", po.id),
      supabase.from("purchase_order_lines").insert((lines ?? []).map((line) => ({
        purchase_order_id: po.id,
        item_id: line.item_id,
        qty_ordered: line.qty,
        qty_received: 0,
        qty_cancelled: 0,
        uom: line.uom,
        unit_price: line.estimated_unit_cost,
      }))),
      supabase.from("purchase_requests").update({ updated_by: profile?.id ?? null }).eq("id", id),
      pr.document_id
        ? supabase.from("documents").update({ status: "approved", approval_status: "approved", current_step: "Converted", updated_by: profile?.id ?? null }).eq("id", pr.document_id)
        : Promise.resolve({ error: null }),
    ]);
    if (poUpdateError) throw new Error(poUpdateError.message);
    if (poLinesError) throw new Error(poLinesError.message);
    if (prUpdateError) throw new Error(prUpdateError.message);
    if (prDocumentError) throw new Error(prDocumentError.message);

    const activityMessage = `Purchase Order ${poNo} created from ${pr.request_no}.`;
    try {
      await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: activityMessage });
      if (pr.document_id) {
        await writeActivityLog({
          entityType: "document",
          entityId: pr.document_id,
          activityType: "converted",
          message: `Purchase request ${pr.request_no} converted to ${poNo}`,
          metadata: { workflow_step: "approved", purchase_order_id: po.id },
        });
      }
    } catch (error) {
      console.error(error);
    }
    await createPurchaseOrderCreatedNotification({ poId: po.id, poNo, prNo: pr.request_no, companyId: pr.company_id, staffId: profile?.id ?? null });

    revalidateWorkspaceState([`/purchase-requests/${id}`, "/purchase-orders"]);
    safeRedirectWithMessage(`/purchase-orders/${po.id}`, "success", `Purchase order ${poNo} created from ${pr.request_no}.`);
  } catch (error) {
    rethrowRedirect(error);
    if (reservedConversion) {
      try {
        const supabase = await createClient();
        await supabase.from("purchase_requests").update({ status: "approved" }).eq("id", id).eq("status", "converted");
      } catch (revertError) {
        console.error(revertError);
      }
    }
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not convert this purchase request."));
  }
}
