"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { goodsReceivingSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import { z } from "zod";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

function extractGoodsReceiving(formData: FormData) {
  const poLineIds = formData.getAll("line_purchase_order_line_id").map(String);
  const itemIds = formData.getAll("line_item_id").map(String);
  const ordered = formData.getAll("line_ordered_qty").map(String);
  const previous = formData.getAll("line_previously_received_qty").map(String);
  const pending = formData.getAll("line_pending_qty").map(String);
  const received = formData.getAll("line_received_qty").map(String);
  const rejected = formData.getAll("line_rejected_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const costs = formData.getAll("line_unit_cost").map(String);
  const batches = formData.getAll("line_batch_no").map(String);
  const expiries = formData.getAll("line_expiry_date").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  return goodsReceivingSchema.parse({
    grn_no: formData.get("grn_no"),
    purchase_order_id: formData.get("purchase_order_id"),
    supplier_id: formData.get("supplier_id"),
    received_date: formData.get("received_date"),
    branch_id: formData.get("branch_id"),
    location_id: formData.get("location_id"),
    received_by: formData.get("received_by") || null,
    remarks: formData.get("remarks"),
    delivery_order_attached: formData.get("delivery_order_attached") === "on",
    lines: poLineIds
      .map((poLineId, index) => ({
        purchase_order_line_id: poLineId,
        item_id: itemIds[index],
        ordered_qty: ordered[index] ?? 0,
        previously_received_qty: previous[index] ?? 0,
        pending_qty: pending[index] ?? 0,
        received_qty: received[index] ?? 0,
        rejected_qty: rejected[index] ?? 0,
        uom: uoms[index],
        unit_cost: costs[index] ?? 0,
        batch_no: batches[index],
        expiry_date: expiries[index],
        remarks: remarks[index],
      }))
      .filter((line) => line.purchase_order_line_id && line.item_id),
  });
}

async function ensureReceivablePo(purchaseOrderId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("purchase_orders").select("id,status,supplier_id").eq("id", purchaseOrderId).single();
  if (error) throw new Error(error.message);
  if (!["approved", "sent", "partial_received"].includes(data.status)) {
    throw new Error("Cannot receive against cancelled, closed, draft, or unapproved PO.");
  }
  return data;
}

export async function createGoodsReceiving(formData: FormData) {
  await requirePermissionOrRedirect("goods_receiving.create", "/goods-receivings/new");
  try {
    const payload = extractGoodsReceiving(formData);
    const deliveryOrderNo = cleanText(formData.get("delivery_order_no"));
    if (isMockMode()) redirect("/goods-receivings/grn-mock-partial");
    const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);

    const po = await ensureReceivablePo(payload.purchase_order_id);
    if (po.supplier_id !== payload.supplier_id) throw new Error("GRN supplier must match selected PO supplier.");

    const profile = await identity();
    const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
    const grnNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "goods_receiving",
      enteredNumber: payload.grn_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_goods_receiving_atomic", {
      p_payload: {
        ...payload,
        grn_no: grnNo,
        location_id: locationId,
        idempotency_key: idempotencyKey,
        remarks: [deliveryOrderNo ? `DO ${deliveryOrderNo}` : null, payload.remarks].filter(Boolean).join(" - ") || null,
      },
    });
    if (error) throw new Error(error.message);
    const created = data as { id: string };
    revalidateWorkspaceState(["/goods-receivings"]);
    redirect(`/goods-receivings/${created.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/goods-receivings/new", "error", formatActionError(error, "Could not create this goods receiving."));
  }
}

export async function postGoodsReceiving(id: string, formData: FormData) {
  await requirePermission("grn.post");
  if (isMockMode()) return;

  const supabase = await createClient();
  const doExceptionReason = cleanText(formData.get("do_exception_reason"));
  const { data, error } = await supabase.rpc("post_goods_receiving_atomic", {
    p_goods_receiving_id: id,
    p_do_exception_reason: doExceptionReason,
  });
  if (error) throw new Error(error.message);
  const result = data as { document_id?: string | null; grn_no?: string; purchase_order_id?: string; already_posted?: boolean } | null;
  if (result?.document_id && !result.already_posted) {
    if (doExceptionReason) await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "delivery_order_exception", message: `Delivery Order exception: ${doExceptionReason}` });
    await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "posted", message: `Goods receiving ${result.grn_no ?? id} posted to inventory` });
  }
  revalidateWorkspaceState(["/goods-receivings", `/goods-receivings/${id}`, "/purchase-orders", ...(result?.purchase_order_id ? [`/purchase-orders/${result.purchase_order_id}`] : [])]);
  revalidatePath("/inventory");
  revalidatePath("/stock-transactions");
  revalidatePath("/stock-balance");
  revalidatePath("/stock-card");
}

export async function cancelGoodsReceiving(id: string) {
  await requirePermission("goods_receiving.cancel");
  if (isMockMode()) return;
  const profile = await identity();
  const supabase = await createClient();
  const { data: grn, error: grnError } = await supabase.from("goods_receivings").select("status,document_id,grn_no").eq("id", id).single();
  if (grnError) throw new Error(grnError.message);
  if (grn.status === "cancelled") return;
  if (grn.status === "posted") throw new Error("Posted GRN cannot be cancelled in Sprint 3.5.");
  const [{ error }, { error: documentError }] = await Promise.all([
    supabase.from("goods_receivings").update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_by: profile?.id ?? null }).eq("id", id),
    grn.document_id
      ? supabase.from("documents").update({ status: "cancelled", current_step: "Cancelled", cancelled_at: new Date().toISOString(), updated_by: profile?.id ?? null }).eq("id", grn.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (documentError) throw new Error(documentError.message);
  if (grn.document_id) await writeActivityLog({ entityType: "document", entityId: grn.document_id, activityType: "cancelled", message: `Goods receiving ${grn.grn_no} cancelled` });
  revalidateWorkspaceState(["/goods-receivings", `/goods-receivings/${id}`]);
}
