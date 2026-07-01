"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { purchaseOrderSchema, purchaseRequestSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import type { ApprovalStatus, PurchaseOrderStatus, PurchaseRequestStatus } from "@/types/database";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
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

export async function createPurchaseRequest(formData: FormData) {
  await requirePermission("purchase_request.create");
  const payload = extractPurchaseRequest(formData);
  if (isMockMode()) redirect("/purchase-requests");
  const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);
  await ensureActiveItems(payload.lines.map((line) => line.item_id));
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_requests")
    .insert({
      company_id: profile?.company_id ?? null,
      request_no: payload.request_no,
      requested_by: profile?.id ?? null,
      request_date: payload.request_date,
      required_date: cleanText(formData.get("required_date")),
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
  const documentId = await createLinkedDocument({ documentNo: payload.request_no, documentType: "purchase_request", title: `Purchase Request ${payload.request_no}`, relatedEntityType: "purchase_request", relatedEntityId: data.id });
  const [{ error: updateError }, { error: linesError }] = await Promise.all([
    supabase.from("purchase_requests").update({ document_id: documentId }).eq("id", data.id),
    supabase.from("purchase_request_lines").insert(payload.lines.map((line) => ({ ...line, suggested_supplier_id: line.suggested_supplier_id || null, purchase_request_id: data.id }))),
  ]);
  if (updateError) throw new Error(updateError.message);
  if (linesError) throw new Error(linesError.message);
  await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase request ${payload.request_no} created` });
  revalidatePath("/purchase-requests");
  redirect(`/purchase-requests/${data.id}`);
}

async function updatePrStatus(id: string, status: PurchaseRequestStatus, documentStatus: "draft" | "pending_approval" | "approved" | "rejected" | "cancelled", approvalStatus: ApprovalStatus, step: string, message: string) {
  const supabase = await createClient();
  const profile = await identity();
  const { data: pr, error: prError } = await supabase.from("purchase_requests").select("document_id").eq("id", id).single();
  if (prError) throw new Error(prError.message);
  const [{ error }, { error: documentError }] = await Promise.all([
    supabase.from("purchase_requests").update({ status, updated_by: profile?.id ?? null }).eq("id", id),
    pr.document_id
      ? supabase.from("documents").update({ status: documentStatus, approval_status: approvalStatus, current_step: step, updated_by: profile?.id ?? null }).eq("id", pr.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (documentError) throw new Error(documentError.message);
  if (pr.document_id) await writeActivityLog({ entityType: "document", entityId: pr.document_id, activityType: status, message });
  revalidatePath("/purchase-requests");
  revalidatePath(`/purchase-requests/${id}`);
}

export async function submitPurchaseRequest(id: string) {
  await requirePermission("purchase_request.submit");
  if (isMockMode()) return;
  await updatePrStatus(id, "admin_review", "pending_approval", "pending", "Admin review", "Purchase request submitted to Admin Review");
}

export async function adminReviewPurchaseRequest(id: string) {
  await requirePermission("purchase_request.review");
  if (isMockMode()) return;
  await updatePrStatus(id, "purchasing_review", "pending_approval", "pending", "Purchasing review", "Admin approved purchase request");
}

export async function purchasingReviewPurchaseRequest(id: string) {
  await requirePermission("purchase_request.review");
  if (isMockMode()) return;
  await updatePrStatus(id, "pending_approval", "pending_approval", "pending", "Manager approval", "Purchasing verified supplier, MOQ, lead time, and cost");
}

export async function approvePurchaseRequest(id: string) {
  await requirePermission("purchase_request.approve");
  if (isMockMode()) return;
  await updatePrStatus(id, "approved", "approved", "approved", "Approved", "Manager approved purchase request");
}

export async function rejectPurchaseRequest(id: string, formData: FormData) {
  await requirePermission("purchase_request.approve");
  const remarks = cleanText(formData.get("remarks"));
  if (!remarks) throw new Error("Rejection remarks are required.");
  if (isMockMode()) return;
  await updatePrStatus(id, "rejected", "rejected", "rejected", "Rejected", `Purchase request rejected: ${remarks}`);
}

export async function cancelPurchaseRequest(id: string) {
  await requirePermission("purchase_request.update");
  if (isMockMode()) return;
  await updatePrStatus(id, "cancelled", "cancelled", "cancelled", "Cancelled", "Purchase request cancelled");
}

export async function createPurchaseOrder(formData: FormData) {
  await requirePermission("purchase_order.create");
  const payload = extractPurchaseOrder(formData);
  if (isMockMode()) redirect("/purchase-orders");
  await ensureActiveItems(payload.lines.map((line) => line.item_id));
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: profile?.company_id ?? null,
      po_no: payload.po_no,
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
  const documentId = await createLinkedDocument({ documentNo: payload.po_no, documentType: "purchase_order", title: `Purchase Order ${payload.po_no}`, relatedEntityType: "purchase_order", relatedEntityId: data.id });
  const [{ error: updateError }, { error: linesError }] = await Promise.all([
    supabase.from("purchase_orders").update({ document_id: documentId }).eq("id", data.id),
    supabase.from("purchase_order_lines").insert(payload.lines.map((line) => ({ ...line, purchase_order_id: data.id }))),
  ]);
  if (updateError) throw new Error(updateError.message);
  if (linesError) throw new Error(linesError.message);
  await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase order ${payload.po_no} created` });
  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${data.id}`);
}

async function updatePoStatus(id: string, status: PurchaseOrderStatus, approvalStatus: ApprovalStatus, step: string, message: string) {
  const supabase = await createClient();
  const profile = await identity();
  const { data: order, error: orderError } = await supabase.from("purchase_orders").select("document_id").eq("id", id).single();
  if (orderError) throw new Error(orderError.message);
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
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${id}`);
}

export async function submitPurchaseOrder(id: string) {
  await requirePermission("purchase_order.submit");
  if (isMockMode()) return;
  await updatePoStatus(id, "pending_approval", "pending", "Manager approval", "Purchase order submitted for approval");
}

export async function approvePurchaseOrder(id: string) {
  await requirePermission("purchase_order.approve");
  if (isMockMode()) return;
  await updatePoStatus(id, "approved", "approved", "Approved", "Purchase order approved");
}

export async function sendPurchaseOrder(id: string) {
  await requirePermission("purchase_order.send");
  if (isMockMode()) return;
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("approval_status").eq("id", id).single();
  if (error) throw new Error(error.message);
  if (data.approval_status !== "approved") throw new Error("Cannot send unapproved PO.");
  await updatePoStatus(id, "sent", "approved", "Sent to supplier", "Purchase order sent to supplier");
}

export async function cancelPurchaseOrder(id: string) {
  await requirePermission("purchase_order.cancel");
  if (isMockMode()) return;
  await updatePoStatus(id, "cancelled", "cancelled", "Cancelled", "Purchase order cancelled");
}

export async function closePurchaseOrder(id: string) {
  await requirePermission("purchase_order.close");
  if (isMockMode()) return;
  await updatePoStatus(id, "closed", "approved", "Closed", "Purchase order closed");
}

export async function convertPurchaseRequestToPurchaseOrder(id: string) {
  await requirePermission("purchase_request.convert");
  if (isMockMode()) redirect("/purchase-orders/po-mock-001");
  const supabase = await createClient();
  const [{ data: pr, error: prError }, { data: lines, error: linesError }, { data: suppliers, error: suppliersError }] = await Promise.all([
    supabase.from("purchase_requests").select("*").eq("id", id).single(),
    supabase.from("purchase_request_lines").select("*").eq("purchase_request_id", id),
    supabase.from("suppliers").select("id").eq("status", "active").limit(1),
  ]);
  if (prError) throw new Error(prError.message);
  if (linesError) throw new Error(linesError.message);
  if (suppliersError) throw new Error(suppliersError.message);
  if (pr.status === "rejected") throw new Error("Cannot convert rejected PR.");
  if (pr.status !== "approved") throw new Error("Only approved PR can be converted.");
  const firstSupplier = lines?.find((line) => line.suggested_supplier_id)?.suggested_supplier_id ?? suppliers?.[0]?.id;
  if (!firstSupplier) throw new Error("PO supplier required.");
  const profile = await identity();
  const poNo = `PO-${Date.now().toString().slice(-6)}`;
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .insert({
      company_id: pr.company_id,
      purchase_request_id: id,
      po_no: poNo,
      supplier_id: firstSupplier,
      order_date: new Date().toISOString().slice(0, 10),
      expected_delivery_date: pr.required_date,
      status: "draft",
      approval_status: "draft",
      remarks: `Converted from ${pr.request_no}`,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (poError) throw new Error(poError.message);
  const documentId = await createLinkedDocument({ documentNo: poNo, documentType: "purchase_order", title: `Purchase Order ${poNo}`, relatedEntityType: "purchase_order", relatedEntityId: po.id });
  const [{ error: poUpdateError }, { error: poLinesError }, { error: prUpdateError }] = await Promise.all([
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
    supabase.from("purchase_requests").update({ status: "converted" }).eq("id", id),
  ]);
  if (poUpdateError) throw new Error(poUpdateError.message);
  if (poLinesError) throw new Error(poLinesError.message);
  if (prUpdateError) throw new Error(prUpdateError.message);
  await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase order ${poNo} converted from ${pr.request_no}` });
  revalidatePath("/purchase-requests");
  revalidatePath("/purchase-orders");
  redirect(`/purchase-orders/${po.id}`);
}
