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
import { createInventoryMovement } from "@/server/inventory/engine";
import { getCurrentProfile } from "@/server/queries/common";

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

async function createLinkedDocument(input: { documentNo: string; relatedEntityId: string }) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .insert({
      company_id: profile?.company_id ?? null,
      document_no: input.documentNo,
      document_type: "purchase_return",
      title: `Purchase Return ${input.documentNo}`,
      status: "draft",
      approval_status: "not_required",
      current_step: "Draft return",
      related_entity_type: "purchase_return",
      related_entity_id: input.relatedEntityId,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial purchase return created.", changed_by: profile?.id ?? null });
  return data.id;
}

export async function createPurchaseReturn(formData: FormData) {
  await requirePermissionOrRedirect("purchase_return.create", "/purchase-returns/new");
  try {
    if (isMockMode()) redirect("/purchase-returns/prt-mock");
    const payload = extractPurchaseReturn(formData);
    const profile = await identity();
    const supabase = await createClient();
    const { data: grn, error: grnError } = await supabase.from("goods_receivings").select("*").eq("id", payload.goods_receiving_id).single();
    if (grnError) throw new Error(grnError.message);
    if (grn.status !== "posted") throw new Error("Only posted GRNs can be returned.");

    const { data: currentLines, error: lineReadError } = await supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", grn.id);
    if (lineReadError) throw new Error(lineReadError.message);
    const currentById = new Map((currentLines ?? []).map((line) => [line.id, line]));
    for (const line of payload.lines) {
      const current = currentById.get(line.goods_receiving_line_id);
      const returnable = Number(current?.received_qty ?? 0) - Number(current?.returned_qty ?? 0);
      if (!current || line.item_id !== current.item_id || line.return_qty > returnable) throw new Error("Return quantity cannot exceed received minus previously returned quantity.");
    }

    const returnNo = await resolveDocumentNumber({ companyId: profile?.company_id, documentType: "purchase_return", enteredNumber: payload.purchase_return_no });
    const { data, error } = await supabase
      .from("purchase_returns")
      .insert({
        company_id: profile?.company_id ?? null,
        purchase_return_no: returnNo,
        goods_receiving_id: grn.id,
        purchase_order_id: grn.purchase_order_id,
        supplier_id: grn.supplier_id,
        branch_id: grn.branch_id,
        location_id: grn.location_id,
        return_date: payload.return_date,
        status: "draft",
        reason: payload.reason,
        remarks: payload.remarks,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const documentId = await createLinkedDocument({ documentNo: returnNo, relatedEntityId: data.id });
    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("purchase_returns").update({ document_id: documentId }).eq("id", data.id),
      supabase.from("purchase_return_lines").insert(payload.lines.map((line) => ({ ...line, purchase_return_id: data.id, reason: cleanText(line.reason ?? null) }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Purchase return ${returnNo} created` });
    revalidateWorkspaceState(["/purchase-returns", "/goods-receivings"]);
    redirect(`/purchase-returns/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/purchase-returns/new", "error", formatActionError(error, "Could not create this purchase return."));
  }
}

export async function postPurchaseReturn(id: string) {
  await requirePermissionOrRedirect("purchase_return.post", `/purchase-returns/${id}`);
  try {
    const profile = await identity();
    const supabase = await createClient();
    const [{ data: row, error }, { data: lines, error: linesError }] = await Promise.all([
      supabase.from("purchase_returns").select("*").eq("id", id).single(),
      supabase.from("purchase_return_lines").select("*").eq("purchase_return_id", id),
    ]);
    if (error) throw new Error(error.message);
    if (linesError) throw new Error(linesError.message);
    if (row.status === "posted") return;
    if (row.status !== "draft") throw new Error("Only draft purchase returns can be posted.");
    if (!(lines ?? []).length) throw new Error("Cannot post an empty purchase return.");

    const { data: currentLines, error: currentError } = await supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", row.goods_receiving_id);
    if (currentError) throw new Error(currentError.message);
    const currentById = new Map((currentLines ?? []).map((line) => [line.id, line]));

    for (const line of lines ?? []) {
      const current = currentById.get(line.goods_receiving_line_id);
      const currentReturned = Number(current?.returned_qty ?? 0);
      const returnable = Number(current?.received_qty ?? 0) - currentReturned;
      if (!current || Number(line.return_qty) > returnable) throw new Error("Return quantity cannot exceed received minus previously returned quantity.");
      const transactionNo = `ST-${row.purchase_return_no}-${String(line.id).slice(0, 4)}`;
      const movement = await createInventoryMovement({
        movementType: "RETURN_TO_SUPPLIER",
        transactionNo,
        documentId: row.document_id,
        branchId: row.branch_id,
        itemId: line.item_id,
        locationId: row.location_id,
        transactionDate: row.return_date,
        quantity: Number(line.return_qty),
        unitCost: Number(line.unit_cost),
        postedBy: profile?.id ?? null,
        remarks: `Returned to supplier from ${row.purchase_return_no}`,
        referenceType: "purchase_return",
        referenceId: row.id,
      });
      const [{ error: grnLineError }, { error: returnLineError }] = await Promise.all([
        supabase.from("goods_receiving_lines").update({ returned_qty: currentReturned + Number(line.return_qty) }).eq("id", line.goods_receiving_line_id),
        supabase.from("purchase_return_lines").update({ stock_transaction_id: movement.id }).eq("id", line.id),
      ]);
      if (grnLineError) throw new Error(grnLineError.message);
      if (returnLineError) throw new Error(returnLineError.message);
    }

    const now = new Date().toISOString();
    const [{ error: updateError }, { error: docError }] = await Promise.all([
      supabase.from("purchase_returns").update({ status: "posted", posted_at: now, posted_by: profile?.id ?? null, updated_by: profile?.id ?? null }).eq("id", id),
      row.document_id
        ? supabase.from("documents").update({ status: "posted", current_step: "Posted to inventory", posted_at: now, updated_by: profile?.id ?? null }).eq("id", row.document_id)
        : Promise.resolve({ error: null }),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (docError) throw new Error(docError.message);
    if (row.document_id) await writeActivityLog({ entityType: "document", entityId: row.document_id, activityType: "posted", message: `Purchase return ${row.purchase_return_no} posted to inventory` });
    revalidateWorkspaceState(["/purchase-returns", `/purchase-returns/${id}`, "/goods-receivings", `/goods-receivings/${row.goods_receiving_id}`]);
    revalidatePath("/stock-transactions");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-balances");
    revalidatePath("/stock-card");
  } catch (error) {
    safeRedirectWithMessage(`/purchase-returns/${id}`, "error", formatActionError(error, "Could not post this purchase return."));
  }
}

export async function cancelPurchaseReturn(id: string) {
  await requirePermissionOrRedirect("purchase_return.cancel", `/purchase-returns/${id}`);
  const profile = await identity();
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("purchase_returns").select("status,document_id,purchase_return_no").eq("id", id).single();
  if (error) throw new Error(error.message);
  if (row.status === "posted") throw new Error("Posted purchase returns cannot be cancelled.");
  if (row.status === "cancelled") return;
  const now = new Date().toISOString();
  const [{ error: updateError }, { error: docError }] = await Promise.all([
    supabase.from("purchase_returns").update({ status: "cancelled", cancelled_at: now, updated_by: profile?.id ?? null }).eq("id", id),
    row.document_id
      ? supabase.from("documents").update({ status: "cancelled", current_step: "Cancelled", cancelled_at: now, updated_by: profile?.id ?? null }).eq("id", row.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (updateError) throw new Error(updateError.message);
  if (docError) throw new Error(docError.message);
  if (row.document_id) await writeActivityLog({ entityType: "document", entityId: row.document_id, activityType: "cancelled", message: `Purchase return ${row.purchase_return_no} cancelled` });
  revalidateWorkspaceState(["/purchase-returns", `/purchase-returns/${id}`]);
}
