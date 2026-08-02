"use server";

import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockTransferSchema, stockWastageSchema } from "@/lib/validations/stock-operations";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { getCurrentProfile } from "@/server/queries/common";
import { z } from "zod";

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
}

function parseOperationalRecordId(id: string, label: string) {
  return z.string().uuid(`The ${label} identifier is invalid.`).parse(id);
}

function extractTransfer(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const qtys = formData.getAll("line_quantity").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  const enabled = new Set(formData.getAll("line_enabled").map(String));
  return stockTransferSchema.parse({
    transfer_no: formData.get("transfer_no"),
    transfer_date: formData.get("transfer_date"),
    from_branch_id: formData.get("from_branch_id") || null,
    to_branch_id: formData.get("to_branch_id") || null,
    remarks: formData.get("remarks"),
    lines: itemIds.map((itemId, i) => ({ item_id: itemId, quantity: qtys[i], uom: uoms[i], remarks: remarks[i] })).filter((line) => line.item_id && enabled.has(line.item_id)),
  });
}

function extractWastage(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
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
    reason: formData.get("reason"),
    remarks: formData.get("remarks"),
    lines: itemIds.map((itemId, i) => ({ item_id: itemId, quantity: qtys[i], uom: uoms[i], reason: reasons[i], batch_no: batches[i], expiry_date: expiries[i], remarks: remarks[i] })).filter((line) => line.item_id),
  });
}

export async function createStockTransfer(formData: FormData) {
  await requirePermissionOrRedirect("stock_transfer.create", "/stock-transfers/new");
  try {
    const payload = extractTransfer(formData);
    if (payload.from_branch_id === payload.to_branch_id) throw new Error("Source and destination branches must be different.");
    if (isMockMode()) redirect("/stock-transfers/transfer-draft");
    const profile = await identity();
    const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
    const transferNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_transfer",
      enteredNumber: payload.transfer_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_stock_transfer_atomic", { p_payload: { ...payload, transfer_no: transferNo, idempotency_key: idempotencyKey } });
    if (error) throw new Error(error.message);
    const created = data as { id: string };
    redirect(`/stock-transfers/${created.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-transfers/new", "error", formatActionError(error, "Could not create this stock transfer."));
  }
}

export async function receiveStockTransfer(formData: FormData) {
  await requirePermission("stock_transfer.post");
  const transferId = parseOperationalRecordId(String(formData.get("transfer_id") ?? ""), "stock transfer");
  if (isMockMode()) return;
  const lineIds = formData.getAll("receipt_line_id").map(String);
  const quantities = formData.getAll("receipt_quantity").map(String);
  const uoms = formData.getAll("receipt_uom").map(String);
  const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
  const lines = lineIds.map((lineId, index) => ({
    line_id: z.uuid().parse(lineId),
    received_quantity: z.number().nonnegative().max(1_000_000).multipleOf(0.0001).parse(Number(quantities[index] ?? 0)),
    uom: uoms[index] ?? "",
  }));
  const supabase = await createClient();
  const { error } = await supabase.rpc("receive_stock_transfer_atomic", {
    p_transfer_id: transferId,
    p_payload: { idempotency_key: idempotencyKey, lines },
  });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/stock-transfers", `/stock-transfers/${transferId}`, "/inventory", "/stock-balance", "/stock-card", "/stock-transactions"]);
  redirect(`/stock-transfers/${transferId}`);
}

export async function startStockTransfer(id: string) {
  await requirePermission("stock_transfer.update");
  if (isMockMode()) return;
  const transferId = parseOperationalRecordId(id, "stock transfer");
  const supabase = await createClient();
  const { error } = await supabase.rpc("dispatch_stock_transfer_atomic", { p_transfer_id: transferId });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/stock-transfers", `/stock-transfers/${transferId}`, "/inventory", "/stock-balance", "/stock-card", "/stock-transactions"]);
  redirect(`/stock-transfers/${transferId}`);
}
async function transitionStockTransferTerminal(id: string, action: "cancel" | "reject") {
  if (action === "cancel") await requirePermission("stock_transfer.cancel");
  else await requirePermission("stock_transfer.update");
  if (isMockMode()) return;
  const transferId = parseOperationalRecordId(id, "stock transfer");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_stock_transfer_terminal_atomic", { p_transfer_id: transferId, p_action: action });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/stock-transfers", `/stock-transfers/${transferId}`]);
  redirect(`/stock-transfers/${transferId}`);
}

export async function cancelStockTransfer(id: string) { await transitionStockTransferTerminal(id, "cancel"); }
export async function rejectStockTransfer(id: string) { await transitionStockTransferTerminal(id, "reject"); }

export async function createStockWastage(formData: FormData) {
  await requirePermissionOrRedirect("stock_wastage.create", "/stock-wastage/new");
  try {
    const payload = extractWastage(formData);
    if (isMockMode()) redirect("/stock-wastage/wastage-damaged");
    const profile = await identity();
    const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
    const wastageNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_wastage",
      enteredNumber: payload.wastage_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("create_stock_wastage_atomic", { p_payload: { ...payload, wastage_no: wastageNo, idempotency_key: idempotencyKey } });
    if (error) throw new Error(error.message);
    const created = data as { id: string };
    redirect(`/stock-wastage/${created.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-wastage/new", "error", formatActionError(error, "Could not create this stock wastage."));
  }
}

export async function postStockWastage(id: string) {
  await requirePermission("stock_wastage.post");
  if (isMockMode()) return;
  const wastageId = parseOperationalRecordId(id, "stock wastage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("post_stock_wastage_atomic", { p_wastage_id: wastageId });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/stock-wastage", `/stock-wastage/${wastageId}`, "/inventory", "/stock-balance", "/stock-card", "/stock-transactions"]);
}

async function transitionStockWastageTerminal(id: string, action: "cancel" | "reject") {
  if (action === "cancel") await requirePermission("stock_wastage.cancel");
  else await requirePermission("stock_wastage.update");
  if (isMockMode()) return;
  const wastageId = parseOperationalRecordId(id, "stock wastage");
  const supabase = await createClient();
  const { error } = await supabase.rpc("transition_stock_wastage_terminal_atomic", { p_wastage_id: wastageId, p_action: action });
  if (error) throw new Error(error.message);
  revalidateWorkspaceState(["/stock-wastage", `/stock-wastage/${wastageId}`]);
}

export async function cancelStockWastage(id: string) { await transitionStockWastageTerminal(id, "cancel"); }
export async function rejectStockWastage(id: string) { await transitionStockWastageTerminal(id, "reject"); }
