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
import { getCurrentProfile } from "@/server/queries/common";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { logServerWarning } from "@/server/observability/logger";
import { z } from "zod";

function cleanText(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}

function parseGoodsReceivingId(id: string) {
  return z.uuid().parse(id);
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
  const receivedBase = formData.getAll("line_received_base_qty").map(String);
  const rejectedBase = formData.getAll("line_rejected_base_qty").map(String);
  const conversionSnapshots = formData.getAll("line_conversion_snapshot").map(String);
  const rememberConversions = formData.getAll("line_remember_conversion").map(String);
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
        received_base_qty: receivedBase[index] || null,
        rejected_base_qty: rejectedBase[index] || null,
        conversion_to_base_uom_snapshot: conversionSnapshots[index] || null,
        remember_conversion: rememberConversions[index] === "on",
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
  const [supabase, actor] = await Promise.all([createClient(), requireActiveTenantActor()]);
  const { data, error } = await supabase.from("purchase_orders").select("id,status,supplier_id").eq("id", purchaseOrderId).eq("company_id", actor.companyId).single();
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
  try {
    await requirePermission("grn.post");
    if (isMockMode()) return;

    const goodsReceivingId = parseGoodsReceivingId(id);
    const supabase = await createClient();
    const doExceptionReason = z.string().trim().max(1_000).nullable().parse(cleanText(formData.get("do_exception_reason")));
    const { data, error } = await supabase.rpc("post_goods_receiving_atomic", {
      p_goods_receiving_id: goodsReceivingId,
      p_do_exception_reason: doExceptionReason,
    });
    if (error) throw new Error(error.message);
    const result = data as { document_id?: string | null; grn_no?: string; purchase_order_id?: string; already_posted?: boolean } | null;
    if (result?.document_id && !result.already_posted) {
      // Activity history is useful audit metadata, but it is not the posting
      // transaction. A logging failure must not turn an already committed GRN
      // into a false failure or invite a user to retry and duplicate movement.
      try {
        if (doExceptionReason) await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "delivery_order_exception", message: `Delivery Order exception: ${doExceptionReason}` });
        await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "posted", message: `Goods receiving ${result.grn_no ?? id} posted to inventory` });
      } catch (activityError) {
        logServerWarning(activityError, { source: "goods-receivings.post.activity-log", actorId: result.document_id });
      }
    }
    revalidateWorkspaceState(["/goods-receivings", `/goods-receivings/${id}`, "/purchase-orders", ...(result?.purchase_order_id ? [`/purchase-orders/${result.purchase_order_id}`] : [])]);
    revalidatePath("/inventory");
    revalidatePath("/stock-transactions");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
    safeRedirectWithMessage(`/goods-receivings/${id}`, "success", result?.already_posted ? "This receiving was already posted. No duplicate stock movement was created." : `${result?.grn_no ?? "Goods receiving"} posted to stock.`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/goods-receivings/${id}`, "error", formatActionError(error, "Could not post this receiving to stock."));
  }
}

export async function updateGoodsReceivingDraft(id: string, formData: FormData) {
  try {
    await requirePermission("grn.post");
    const goodsReceivingId = parseGoodsReceivingId(id);
    const lineIds = formData.getAll("line_id").map(String);
    const received = formData.getAll("received_qty").map(String);
    const rejected = formData.getAll("rejected_qty").map(String);
    const reasons = formData.getAll("over_receipt_reason").map(String);
    const lines = z.array(z.object({
      line_id: z.uuid(),
      received_qty: z.coerce.number().finite().min(0).max(1_000_000),
      rejected_qty: z.coerce.number().finite().min(0).max(1_000_000),
      over_receipt_reason: z.string().trim().max(1_000).nullable(),
    })).min(1).max(500).parse(lineIds.map((lineId, index) => ({
      line_id: lineId,
      received_qty: received[index] ?? "0",
      rejected_qty: rejected[index] ?? "0",
      over_receipt_reason: cleanText(reasons[index] ?? null),
    })));
    const supabase = await createClient();
    const { error } = await supabase.rpc("update_goods_receiving_draft_atomic" as never, {
      p_goods_receiving_id: goodsReceivingId,
      p_lines: lines,
    } as never);
    if (error) throw new Error(error.message);
    revalidateWorkspaceState([`/goods-receivings/${goodsReceivingId}`, "/goods-receivings"]);
    safeRedirectWithMessage(`/goods-receivings/${goodsReceivingId}`, "success", "Received quantities saved. Review them, then post to stock when ready.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/goods-receivings/${id}`, "error", formatActionError(error, "Could not save the received quantities."));
  }
}

export async function cancelGoodsReceiving(id: string) {
  await requirePermission("goods_receiving.cancel");
  if (isMockMode()) return;
  const goodsReceivingId = parseGoodsReceivingId(id);
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_goods_receiving_atomic", { p_goods_receiving_id: goodsReceivingId });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/goods-receivings", `/goods-receivings/${id}`]);
  safeRedirectWithMessage("/goods-receivings", "success", "Draft receiving cancelled and removed from active work.");
}
