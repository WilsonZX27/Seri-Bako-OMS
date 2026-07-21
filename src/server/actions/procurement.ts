"use server";

import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import type { PurchaseRequestStatus } from "@/lib/status-contracts";
import { createClient } from "@/lib/supabase/server";
import { purchaseOrderSchema, purchaseRequestSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import { z } from "zod";
import type { ApprovalStatus, PurchaseOrderStatus } from "@/types/database";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

async function notifyNextPrRole(input: {
  pr: { id: string; request_no: string; branch_id: string | null; company_id: string | null };
  nextStatus: PurchaseRequestStatus;
}) {
  const roleCodesByStatus: Partial<Record<PurchaseRequestStatus, string[]>> = {
    manager_review: ["manager", "super_admin"],
    admin_review: ["purchasing", "super_admin"],
    finance_review: ["finance", "super_admin"],
    ready_to_convert: ["purchasing", "super_admin"],
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
    manager_review: "PR Manager Review required",
    admin_review: "PR Purchasing Review required",
    finance_review: "PR Finance Review required",
    ready_to_convert: "PR ready to convert to PO",
  };
  const messageByStatus: Partial<Record<PurchaseRequestStatus, string>> = {
    manager_review: `${input.pr.request_no} is waiting for Manager Review.`,
    admin_review: `${input.pr.request_no} is waiting for Purchasing Review.`,
    finance_review: `${input.pr.request_no} is waiting for Finance Review.`,
    ready_to_convert: `${input.pr.request_no} is approved and ready to convert to PO.`,
  };

  const notifications = (roles ?? []).map((role) => ({
    company_id: input.pr.company_id,
    recipient_role_id: role.id,
    branch_id: input.pr.branch_id,
    title: titleByStatus[input.nextStatus] ?? "Purchase Request update",
    message: messageByStatus[input.nextStatus] ?? `${input.pr.request_no} has moved to the next workflow step.`,
    action_url: `/purchase-requests/${input.pr.id}`,
    priority: input.nextStatus === "finance_review" ? "high" : "normal",
    entity_type: "purchase_request",
    entity_id: input.pr.id,
  }));
  if (!notifications.length) return;
  const { error } = await supabase.from("notifications").insert(notifications);
  if (error) console.error(error);
}

function extractPurchaseRequest(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  if (!itemIds.some(Boolean)) throw new Error("Add at least one item before creating this purchase request.");
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
  const startedAt = performance.now();
  let checkpoint = startedAt;
  const timings: Record<string, number> = {};
  const mark = (phase: string) => {
    const now = performance.now();
    timings[phase] = Math.round(now - checkpoint);
    checkpoint = now;
  };
  await requirePermissionOrRedirect("purchase_request.create", "/purchase-requests/new");
  mark("authorization");
  try {
    if (isMockMode()) redirect("/purchase-requests");
    const idempotencyKey = z.uuid().parse(cleanText(formData.get("idempotency_key")));
    const supabase = await createClient();
    const { data: existing } = await supabase.from("purchase_requests").select("id, request_no").eq("idempotency_key", idempotencyKey).maybeSingle();
    if (existing) redirect(`/purchase-requests/${existing.id}`);
    mark("idempotency");
    const payload = extractPurchaseRequest(formData);
    const intent = formData.get("intent") === "submit" ? "submit" : "draft";
    const [locationId, , profile] = await Promise.all([
      resolveDefaultLocation(payload.branch_id, payload.location_id),
      ensureActiveItems(payload.lines.map((line) => line.item_id)),
      identity(),
    ]);
    mark("validation_and_references");
    const requestNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "purchase_request",
      enteredNumber: payload.request_no,
    });
    mark("document_number");
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
        status: "draft",
        remarks: payload.remarks,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") {
        const { data: duplicate } = await supabase.from("purchase_requests").select("id").eq("idempotency_key", idempotencyKey).maybeSingle();
        if (duplicate) redirect(`/purchase-requests/${duplicate.id}`);
      }
      throw new Error(error.message);
    }
    mark("header_insert");
    const [documentId, { error: linesError }] = await Promise.all([
      createLinkedDocument({ documentNo: requestNo, documentType: "purchase_request", title: `Purchase Request ${requestNo}`, relatedEntityType: "purchase_request", relatedEntityId: data.id }),
      supabase.from("purchase_request_lines").insert(payload.lines.map((line) => ({ ...line, suggested_supplier_id: line.suggested_supplier_id || null, purchase_request_id: data.id }))),
    ]);
    if (linesError) throw new Error(linesError.message);
    const [{ error: updateError }] = await Promise.all([
      supabase.rpc("link_purchase_request_document", { target_purchase_request_id: data.id, target_document_id: documentId }),
      writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase request ${requestNo} created` }),
    ]);
    if (updateError) throw new Error(updateError.message);
    mark("document_lines_and_audit");
    revalidateWorkspaceState(["/purchase-requests"]);
    mark("revalidation");
    if (process.env.SB_PERF_LOG === "true") {
      console.info("[perf] createPurchaseRequest", { ...timings, total: Math.round(performance.now() - startedAt), id: data.id });
    }
    if (intent === "submit") {
      const submitted = await transitionPurchaseRequest(data.id, "submit");
      safeRedirectWithMessage(`/purchase-requests/${data.id}`, "success", `${submitted.request_no} submitted to Manager Review. Manager has been notified.`);
    }
    redirect(`/purchase-requests/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-requests/new", "error", formatActionError(error, "Could not create this purchase request."));
  }
}

type PrTransitionAction = "submit" | "manager_approve" | "admin_approve" | "finance_approve" | "reject" | "cancel";
type PrTransitionResult = {
  id: string;
  request_no: string;
  company_id: string | null;
  branch_id: string | null;
  status: PurchaseRequestStatus;
  already_applied: boolean;
};

async function transitionPurchaseRequest(id: string, action: PrTransitionAction, remarks?: string | null) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("transition_purchase_request", {
    target_purchase_request_id: id,
    transition_action: action,
    transition_remarks: remarks ?? null,
  });
  if (error) throw new Error(error.message);
  const result = data as unknown as PrTransitionResult;
  if (!result?.id || !result.request_no || !result.status) throw new Error("Purchase request transition returned an invalid result.");
  if (!result.already_applied) await notifyNextPrRole({ pr: result, nextStatus: result.status });
  revalidateWorkspaceState(["/purchase-requests", `/purchase-requests/${id}`]);
  return result;
}

export async function submitPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "submit");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} submitted to Manager Review. Manager has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not submit this purchase request."));
  }
}

export async function managerApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "manager_approve");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Manager Review completed. Purchasing has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Manager Review."));
  }
}

export async function adminApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "admin_approve");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Purchasing Review completed. Finance has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not complete Purchasing Review."));
  }
}

export async function financeApprovePurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "finance_approve");
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${pr.request_no} Finance Review completed. Purchase request is ready to convert.`);
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
    const updated = await transitionPurchaseRequest(id, "reject", remarks);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "success", `${updated.request_no} rejected. Requester has been notified.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not reject this purchase request."));
  }
}

export async function cancelPurchaseRequest(id: string) {
  try {
    if (isMockMode()) return;
    const pr = await transitionPurchaseRequest(id, "cancel");
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
        status: "draft",
        approval_status: "draft",
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
  revalidateWorkspaceState(["/purchase-orders", `/purchase-orders/${id}`]);
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

export async function convertPurchaseRequestToPurchaseOrder(id: string, formData: FormData) {
  try {
    if (isMockMode()) redirect("/purchase-orders/po-mock-001");
    await requirePermission("pr.convert_to_po");
    const autocountPoNo = cleanText(formData.get("autocount_po_no"));
    if (!autocountPoNo) throw new Error("AutoCount PO Number is required.");
    const supabase = await createClient();
    const profile = await identity();
    const { data, error } = await supabase.rpc("convert_purchase_request_to_purchase_order", {
      target_purchase_request_id: id,
      target_po_no: autocountPoNo,
    });
    if (error) throw new Error(error.message);
    const result = data?.[0];
    if (!result) throw new Error("Purchase order conversion returned no result.");
    if (!result.already_existed) {
      await createPurchaseOrderCreatedNotification({ poId: result.purchase_order_id, poNo: result.purchase_order_no, prNo: result.purchase_request_no, companyId: profile?.company_id ?? null, staffId: profile?.id ?? null });
    }

    revalidateWorkspaceState([`/purchase-requests/${id}`, "/purchase-orders"]);
    const message = result.already_existed
      ? `Purchase order ${result.purchase_order_no} is already linked to this PR.`
      : `Purchase order ${result.purchase_order_no} created from ${result.purchase_request_no}.`;
    safeRedirectWithMessage(`/purchase-orders/${result.purchase_order_id}`, "success", message);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/purchase-requests/${id}`, "error", formatActionError(error, "Could not convert this purchase request."));
  }
}
