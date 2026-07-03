"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { goodsReceivingSchema } from "@/lib/validations/procurement";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { createInventoryMovement } from "@/server/inventory/engine";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";

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
    status: formData.get("status") ?? "draft",
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

async function createLinkedDocument(input: {
  documentNo: string;
  documentType: string;
  title: string;
  relatedEntityType: string;
  relatedEntityId: string;
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
      status: "draft",
      approval_status: "not_required",
      current_step: "Draft receiving",
      related_entity_type: input.relatedEntityType,
      related_entity_id: input.relatedEntityId,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial goods receiving created.", changed_by: profile?.id ?? null });
  return data.id;
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
    if (isMockMode()) redirect("/goods-receivings/grn-mock-partial");
    const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);

    const po = await ensureReceivablePo(payload.purchase_order_id);
    if (po.supplier_id !== payload.supplier_id) throw new Error("GRN supplier must match selected PO supplier.");

    const profile = await identity();
    const grnNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "goods_receiving",
      enteredNumber: payload.grn_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("goods_receivings")
      .insert({
        company_id: profile?.company_id ?? null,
        purchase_order_id: payload.purchase_order_id,
        grn_no: grnNo,
        supplier_id: payload.supplier_id,
        received_date: payload.received_date,
        branch_id: payload.branch_id,
        location_id: locationId,
        status: "draft",
        received_by: profile?.id ?? null,
        remarks: payload.remarks,
        created_by: profile?.id ?? null,
        updated_by: profile?.id ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);

    const documentId = await createLinkedDocument({
      documentNo: grnNo,
      documentType: "goods_receiving",
      title: `Goods Receiving ${grnNo}`,
      relatedEntityType: "goods_receiving",
      relatedEntityId: data.id,
    });

    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("goods_receivings").update({ document_id: documentId }).eq("id", data.id),
      supabase.from("goods_receiving_lines").insert(payload.lines.map((line) => ({ ...line, expiry_date: cleanText(line.expiry_date ?? null), goods_receiving_id: data.id }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);

    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Goods receiving ${grnNo} created` });
    revalidatePath("/goods-receivings");
    redirect(`/goods-receivings/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/goods-receivings/new", "error", formatActionError(error, "Could not create this goods receiving."));
  }
}

export async function postGoodsReceiving(id: string) {
  await requirePermission("grn.post");
  if (isMockMode()) return;

  const profile = await identity();
  const supabase = await createClient();
  const [{ data: grn, error: grnError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("goods_receivings").select("*").eq("id", id).single(),
    supabase.from("goods_receiving_lines").select("*").eq("goods_receiving_id", id),
  ]);
  if (grnError) throw new Error(grnError.message);
  if (linesError) throw new Error(linesError.message);
  if (grn.status === "posted") return;
  if (grn.status !== "draft") throw new Error("Only draft GRN can be posted.");
  await ensureReceivablePo(grn.purchase_order_id);

  const receivingLines = lines ?? [];
  if (!receivingLines.some((line) => Number(line.received_qty) > 0)) throw new Error("Cannot post GRN without at least one received line.");
  const overReceived = receivingLines.some((line) => Number(line.received_qty) + Number(line.rejected_qty) > Number(line.pending_qty));
  if (overReceived) throw new Error("Received plus rejected quantity cannot exceed pending quantity without manager override.");

  if (grn.document_id) {
    const { count, error: attachmentError } = await supabase
      .from("attachments")
      .select("id", { count: "exact", head: true })
      .eq("entity_type", "document")
      .eq("entity_id", grn.document_id)
      .eq("status", "active")
      .is("deleted_at", null);
    if (attachmentError) throw new Error(attachmentError.message);
    if (!count) throw new Error("Delivery Order attachment is required before posting.");
  }

  for (const line of receivingLines) {
    if (Number(line.received_qty) <= 0) continue;
    const { error: poLineError } = await supabase
      .from("purchase_order_lines")
      .update({ qty_received: Number(line.previously_received_qty) + Number(line.received_qty) })
      .eq("id", line.purchase_order_line_id);
    if (poLineError) throw new Error(poLineError.message);
    const transactionNo = `ST-${grn.grn_no}-${String(line.id).slice(0, 4)}`;
    await createInventoryMovement({
      movementType: "GOODS_RECEIPT",
      transactionNo,
      documentId: grn.document_id,
      branchId: grn.branch_id,
      itemId: line.item_id,
      locationId: grn.location_id,
      transactionDate: grn.received_date,
      quantity: Number(line.received_qty),
      unitCost: Number(line.unit_cost),
      postedBy: profile?.id ?? null,
      remarks: `Received from ${grn.grn_no}${line.batch_no ? ` batch ${line.batch_no}` : ""}`,
      referenceType: "goods_receiving",
      referenceId: grn.id,
    });
  }

  const { data: poLines, error: poLinesError } = await supabase.from("purchase_order_lines").select("*").eq("purchase_order_id", grn.purchase_order_id);
  if (poLinesError) throw new Error(poLinesError.message);
  const isFullyReceived = (poLines ?? []).every((line) => Number(line.qty_ordered) - Number(line.qty_received) - Number(line.qty_cancelled) <= 0);
  const poStatus = isFullyReceived ? "received" : "partial_received";

  const [{ error: grnUpdateError }, { error: poUpdateError }, { error: docUpdateError }] = await Promise.all([
    supabase.from("goods_receivings").update({ status: "posted", posted_at: new Date().toISOString(), posted_by: profile?.id ?? null, updated_by: profile?.id ?? null }).eq("id", id),
    supabase.from("purchase_orders").update({ status: poStatus, updated_by: profile?.id ?? null }).eq("id", grn.purchase_order_id),
    grn.document_id
      ? supabase.from("documents").update({ status: "posted", current_step: "Posted to inventory", posted_at: new Date().toISOString(), updated_by: profile?.id ?? null }).eq("id", grn.document_id)
      : Promise.resolve({ error: null }),
  ]);
  if (grnUpdateError) throw new Error(grnUpdateError.message);
  if (poUpdateError) throw new Error(poUpdateError.message);
  if (docUpdateError) throw new Error(docUpdateError.message);

  if (grn.document_id) await writeActivityLog({ entityType: "document", entityId: grn.document_id, activityType: "posted", message: `Goods receiving ${grn.grn_no} posted to inventory` });
  revalidatePath("/goods-receivings");
  revalidatePath(`/goods-receivings/${id}`);
  revalidatePath("/purchase-orders");
  revalidatePath(`/purchase-orders/${grn.purchase_order_id}`);
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
  revalidatePath("/goods-receivings");
  revalidatePath(`/goods-receivings/${id}`);
}
