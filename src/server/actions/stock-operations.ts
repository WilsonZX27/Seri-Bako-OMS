"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockTransferSchema, stockWastageSchema } from "@/lib/validations/stock-operations";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import type { StockOperationStatus, StockWastageReason } from "@/types/database";

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
}
async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

function extractTransfer(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const barcodes = formData.getAll("line_barcode").map(String);
  const qtys = formData.getAll("line_quantity").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  return stockTransferSchema.parse({
    transfer_no: formData.get("transfer_no"),
    transfer_date: formData.get("transfer_date"),
    from_branch_id: formData.get("from_branch_id") || null,
    from_location_id: formData.get("from_location_id"),
    to_branch_id: formData.get("to_branch_id") || null,
    to_location_id: formData.get("to_location_id"),
    status: formData.get("status") ?? "draft",
    remarks: formData.get("remarks"),
    lines: itemIds.map((itemId, i) => ({ item_id: itemId, barcode: barcodes[i], quantity: qtys[i], uom: uoms[i], remarks: remarks[i] })).filter((line) => line.item_id),
  });
}

function extractWastage(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const barcodes = formData.getAll("line_barcode").map(String);
  const qtys = formData.getAll("line_quantity").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const reasons = formData.getAll("line_reason").map(String);
  const batches = formData.getAll("line_batch_no").map(String);
  const expiries = formData.getAll("line_expiry_date").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  return stockWastageSchema.parse({
    wastage_no: formData.get("wastage_no"),
    wastage_date: formData.get("wastage_date"),
    branch_id: formData.get("branch_id") || null,
    location_id: formData.get("location_id"),
    reason: formData.get("reason"),
    status: formData.get("status") ?? "draft",
    remarks: formData.get("remarks"),
    lines: itemIds.map((itemId, i) => ({ item_id: itemId, barcode: barcodes[i], quantity: qtys[i], uom: uoms[i], reason: reasons[i], batch_no: batches[i], expiry_date: expiries[i], remarks: remarks[i] })).filter((line) => line.item_id),
  });
}

async function createDoc(no: string, type: string, title: string, relatedId: string) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({
    company_id: profile?.company_id ?? null,
    document_no: no,
    document_type: type,
    title,
    status: "draft",
    approval_status: "draft",
    current_step: "Draft",
    related_entity_type: type,
    related_entity_id: relatedId,
    created_by: profile?.id ?? null,
    updated_by: profile?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial document created.", changed_by: profile?.id ?? null });
  return data.id;
}

export async function createStockTransfer(formData: FormData) {
  await requirePermissionOrRedirect("stock_transfer.create", "/stock-transfers/new");
  try {
    const payload = extractTransfer(formData);
    if (isMockMode()) redirect("/stock-transfers/transfer-draft");
    const fromLocationId = await resolveDefaultLocation(payload.from_branch_id, payload.from_location_id);
    const toLocationId = await resolveDefaultLocation(payload.to_branch_id, payload.to_location_id);
    if (fromLocationId === toLocationId) throw new Error("Source and destination cannot be the same location.");
    const profile = await identity();
    const transferNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_transfer",
      enteredNumber: payload.transfer_no,
    });
    const supabase = await createClient();
    const { lines, ...header } = payload;
    const { data, error } = await supabase.from("stock_transfers").insert({ company_id: profile?.company_id ?? null, ...header, transfer_no: transferNo, from_location_id: fromLocationId, to_location_id: toLocationId, created_by: profile?.id ?? null, updated_by: profile?.id ?? null }).select("id").single();
    if (error) throw new Error(error.message);
    const docId = await createDoc(transferNo, "stock_transfer", `Stock Transfer ${transferNo}`, data.id);
    const [{ error: upErr }, { error: linesErr }] = await Promise.all([
      supabase.from("stock_transfers").update({ document_id: docId }).eq("id", data.id),
      supabase.from("stock_transfer_lines").insert(lines.map((line) => ({ ...line, stock_transfer_id: data.id, barcode: clean(line.barcode), remarks: clean(line.remarks) }))),
    ]);
    if (upErr) throw new Error(upErr.message);
    if (linesErr) throw new Error(linesErr.message);
    await writeActivityLog({ entityType: "document", entityId: docId, activityType: "created", message: `Stock transfer ${transferNo} created` });
    redirect(`/stock-transfers/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-transfers/new", "error", formatActionError(error, "Could not create this stock transfer."));
  }
}

async function setTransferStatus(id: string, status: StockOperationStatus, message: string) {
  const profile = await identity();
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("stock_transfers").select("document_id,transfer_no").eq("id", id).single();
  if (error) throw new Error(error.message);
  const now = new Date().toISOString();
  await supabase.from("stock_transfers").update({ status, updated_by: profile?.id ?? null, ...(status === "posted" ? { posted_at: now } : {}) }).eq("id", id);
  if (row.document_id) {
    await supabase.from("documents").update({ status: status === "posted" ? "posted" : status === "cancelled" ? "cancelled" : status === "rejected" ? "rejected" : "approved", approval_status: status === "rejected" ? "rejected" : "approved", current_step: message, updated_by: profile?.id ?? null, ...(status === "posted" ? { posted_at: now } : {}) }).eq("id", row.document_id);
    await writeActivityLog({ entityType: "document", entityId: row.document_id, activityType: status, message });
  }
  revalidatePath("/stock-transfers");
  revalidatePath(`/stock-transfers/${id}`);
}

export async function postStockTransfer(id: string) {
  await requirePermission("stock_transfer.post");
  if (isMockMode()) return;
  const profile = await identity();
  const supabase = await createClient();
  const [{ data: transfer, error }, { data: lines }] = await Promise.all([supabase.from("stock_transfers").select("*").eq("id", id).single(), supabase.from("stock_transfer_lines").select("*").eq("stock_transfer_id", id)]);
  if (error) throw new Error(error.message);
  if (!lines?.length) throw new Error("Cannot post without lines.");
  for (const line of lines) {
    for (const side of ["out", "in"] as const) {
      const type = side === "out" ? "transfer_out" : "transfer_in";
      const loc = side === "out" ? transfer.from_location_id : transfer.to_location_id;
      const qtyIn = side === "in" ? line.quantity : 0;
      const qtyOut = side === "out" ? line.quantity : 0;
      const { data: stock, error: stockErr } = await supabase.from("stock_transactions").insert({ transaction_no: `ST-${transfer.transfer_no}-${side}-${String(line.id).slice(0, 4)}`, document_id: transfer.document_id, branch_id: side === "out" ? transfer.from_branch_id : transfer.to_branch_id, item_id: line.item_id, location_id: loc, transaction_type: type, transaction_date: transfer.transfer_date, quantity_in: qtyIn, quantity_out: qtyOut, unit_cost: 0, total_cost: 0, status: "posted", posted_at: new Date().toISOString(), posted_by: profile?.id ?? null, remarks: `Posted from ${transfer.transfer_no}`, reference_type: "stock_transfer", reference_id: transfer.id, from_location_id: transfer.from_location_id, to_location_id: transfer.to_location_id, created_by: profile?.id ?? null }).select("id").single();
      if (stockErr) throw new Error(stockErr.message);
      const { error: lineErr } = await supabase.from("stock_transaction_lines").insert({ stock_transaction_id: stock.id, stock_entity_type: "item", item_id: line.item_id, branch_id: side === "out" ? transfer.from_branch_id : transfer.to_branch_id, location_id: loc, quantity_in: qtyIn, quantity_out: qtyOut, unit_cost: 0, reference_type: "stock_transfer", reference_id: transfer.id, remarks: line.remarks, created_by: profile?.id ?? null });
      if (lineErr) throw new Error(lineErr.message);
    }
  }
  await setTransferStatus(id, "posted", `Stock transfer ${transfer.transfer_no} posted`);
  revalidatePath("/inventory"); revalidatePath("/stock-balance"); revalidatePath("/stock-card"); revalidatePath("/stock-transactions");
}

export async function cancelStockTransfer(id: string) { await requirePermission("stock_transfer.cancel"); if (isMockMode()) return; await setTransferStatus(id, "cancelled", "Stock transfer cancelled"); }
export async function rejectStockTransfer(id: string) { await requirePermission("stock_transfer.update"); if (isMockMode()) return; await setTransferStatus(id, "rejected", "Stock transfer rejected"); }

export async function createStockWastage(formData: FormData) {
  await requirePermissionOrRedirect("stock_wastage.create", "/stock-wastage/new");
  try {
    const payload = extractWastage(formData);
    if (isMockMode()) redirect("/stock-wastage/wastage-damaged");
    const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);
    const profile = await identity();
    const wastageNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_wastage",
      enteredNumber: payload.wastage_no,
    });
    const supabase = await createClient();
    const { lines, ...header } = payload;
    const { data, error } = await supabase.from("stock_wastage").insert({ company_id: profile?.company_id ?? null, ...header, wastage_no: wastageNo, location_id: locationId, created_by: profile?.id ?? null, updated_by: profile?.id ?? null }).select("id").single();
    if (error) throw new Error(error.message);
    const docId = await createDoc(wastageNo, "stock_wastage", `Stock Wastage ${wastageNo}`, data.id);
    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("stock_wastage").update({ document_id: docId }).eq("id", data.id),
      supabase.from("stock_wastage_lines").insert(lines.map((line) => ({ ...line, stock_wastage_id: data.id, barcode: clean(line.barcode), batch_no: clean(line.batch_no), expiry_date: clean(line.expiry_date), remarks: clean(line.remarks) }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);
    await writeActivityLog({ entityType: "document", entityId: docId, activityType: "created", message: `Stock wastage ${wastageNo} created` });
    redirect(`/stock-wastage/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-wastage/new", "error", formatActionError(error, "Could not create this stock wastage."));
  }
}

export async function postStockWastage(id: string) {
  await requirePermission("stock_wastage.post");
  if (isMockMode()) return;
  const profile = await identity();
  const supabase = await createClient();
  const [{ data: wastage, error }, { data: lines }] = await Promise.all([supabase.from("stock_wastage").select("*").eq("id", id).single(), supabase.from("stock_wastage_lines").select("*").eq("stock_wastage_id", id)]);
  if (error) throw new Error(error.message);
  if (!lines?.length) throw new Error("Cannot post without lines.");
  const evidenceReasons: StockWastageReason[] = ["damaged", "expired", "supplier_claim"];
  if (evidenceReasons.includes(wastage.reason) && wastage.document_id) {
    const { count } = await supabase.from("attachments").select("id", { count: "exact", head: true }).eq("entity_type", "document").eq("entity_id", wastage.document_id).eq("status", "active").is("deleted_at", null);
    if (!count) throw new Error("Photo attachment required before posting this wastage.");
  }
  for (const line of lines) {
    const txType = line.reason === "damaged" ? "damage" : line.reason === "missing" ? "missing" : "wastage";
    const { data: stock, error: stockErr } = await supabase.from("stock_transactions").insert({ transaction_no: `ST-${wastage.wastage_no}-${String(line.id).slice(0, 4)}`, document_id: wastage.document_id, branch_id: wastage.branch_id, item_id: line.item_id, location_id: wastage.location_id, transaction_type: txType, transaction_date: wastage.wastage_date, quantity_in: 0, quantity_out: line.quantity, unit_cost: 0, total_cost: 0, status: "posted", posted_at: new Date().toISOString(), posted_by: profile?.id ?? null, remarks: `Posted from ${wastage.wastage_no}`, reference_type: "stock_wastage", reference_id: wastage.id, created_by: profile?.id ?? null }).select("id").single();
    if (stockErr) throw new Error(stockErr.message);
    await supabase.from("stock_transaction_lines").insert({ stock_transaction_id: stock.id, stock_entity_type: "item", item_id: line.item_id, branch_id: wastage.branch_id, location_id: wastage.location_id, quantity_in: 0, quantity_out: line.quantity, unit_cost: 0, reference_type: "stock_wastage", reference_id: wastage.id, remarks: line.remarks, created_by: profile?.id ?? null });
  }
  await supabase.from("stock_wastage").update({ status: "posted", posted_at: new Date().toISOString(), updated_by: profile?.id ?? null }).eq("id", id);
  if (wastage.document_id) await writeActivityLog({ entityType: "document", entityId: wastage.document_id, activityType: "posted", message: `Stock wastage ${wastage.wastage_no} posted` });
  revalidatePath("/stock-wastage"); revalidatePath(`/stock-wastage/${id}`); revalidatePath("/inventory"); revalidatePath("/stock-balance"); revalidatePath("/stock-card"); revalidatePath("/stock-transactions");
}

export async function cancelStockWastage(id: string) { await requirePermission("stock_wastage.cancel"); if (isMockMode()) return; const supabase = await createClient(); await supabase.from("stock_wastage").update({ status: "cancelled" }).eq("id", id); revalidatePath("/stock-wastage"); }
export async function rejectStockWastage(id: string) { await requirePermission("stock_wastage.update"); if (isMockMode()) return; const supabase = await createClient(); await supabase.from("stock_wastage").update({ status: "rejected" }).eq("id", id); revalidatePath("/stock-wastage"); }
