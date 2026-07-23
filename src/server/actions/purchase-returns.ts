"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { purchaseReturnSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
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

function extractPurchaseReturn(formData: FormData) {
  const grnLineIds = formData.getAll("line_goods_receiving_line_id").map(String);
  const poLineIds = formData.getAll("line_purchase_order_line_id").map(String);
  const itemIds = formData.getAll("line_item_id").map(String);
  const received = formData.getAll("line_received_qty").map(String);
  const returned = formData.getAll("line_previously_returned_qty").map(String);
  const quantities = formData.getAll("line_return_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const costs = formData.getAll("line_unit_cost").map(String);
  const reasons = formData.getAll("line_reason").map(String);
  return purchaseReturnSchema.parse({
    purchase_return_no: formData.get("purchase_return_no"),
    goods_receiving_id: formData.get("goods_receiving_id"),
    return_date: formData.get("return_date"),
    reason: cleanText(formData.get("reason")),
    remarks: cleanText(formData.get("remarks")),
    lines: grnLineIds
      .map((grnLineId, index) => ({
        goods_receiving_line_id: grnLineId,
        purchase_order_line_id: poLineIds[index],
        item_id: itemIds[index],
        received_qty: received[index] ?? 0,
        previously_returned_qty: returned[index] ?? 0,
        return_qty: quantities[index] ?? 0,
        uom: uoms[index],
        unit_cost: costs[index] ?? 0,
        reason: reasons[index],
      }))
      .filter((line) => line.goods_receiving_line_id && Number(line.return_qty) > 0),
  });
}

export async function createPurchaseReturn(formData: FormData) {
  await requirePermissionOrRedirect("purchase_return.create", "/purchase-returns/new");
  try {
    if (isMockMode()) redirect("/purchase-returns/prt-mock");
    const payload = extractPurchaseReturn(formData);
    const profile = await identity();
    const supabase = await createClient();
    const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
    const returnNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "purchase_return", enteredNumber: payload.purchase_return_no });
    const { data, error } = await supabase.rpc("create_purchase_return_atomic", {
      p_payload: { ...payload, purchase_return_no: returnNo, idempotency_key: idempotencyKey },
    });
    if (error) throw new Error(error.message);
    const created = data as { id: string };
    revalidateWorkspaceState(["/purchase-returns", "/goods-receivings"]);
    redirect(`/purchase-returns/${created.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-returns/new", "error", formatActionError(error, "Could not create this purchase return."));
  }
}

export async function postPurchaseReturn(id: string) {
  await requirePermissionOrRedirect("purchase_return.post", `/purchase-returns/${id}`);
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("post_purchase_return_atomic", { p_purchase_return_id: id });
    if (error) throw new Error(error.message);
    const result = data as { document_id?: string | null; purchase_return_no?: string; goods_receiving_id?: string; already_posted?: boolean } | null;
    if (result?.document_id && !result.already_posted) await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "posted", message: `Purchase return ${result.purchase_return_no ?? id} posted to inventory` });
    revalidateWorkspaceState(["/purchase-returns", `/purchase-returns/${id}`, "/goods-receivings", ...(result?.goods_receiving_id ? [`/goods-receivings/${result.goods_receiving_id}`] : [])]);
    revalidatePath("/stock-transactions");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
  } catch (error) {
    safeRedirectWithMessage(`/purchase-returns/${id}`, "error", formatActionError(error, "Could not post this purchase return."));
  }
}

export async function cancelPurchaseReturn(id: string) {
  await requirePermissionOrRedirect("purchase_return.cancel", `/purchase-returns/${id}`);
  const { error } = await (await createClient()).rpc("cancel_purchase_return_atomic", { p_purchase_return_id: id });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/purchase-returns", `/purchase-returns/${id}`]);
}
