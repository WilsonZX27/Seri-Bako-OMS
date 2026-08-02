"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockCountSchema } from "@/lib/validations/stock-count";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { classifyActionError, formatActionError, requireAnyPermissionOrRedirect, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { logServerWarning } from "@/server/observability/logger";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";
import { z } from "zod";

const stockCountIdSchema = z.uuid("Invalid stock count identifier.");
export type StockCountAutosaveResult = {
  ok: boolean;
  id?: string;
  savedAt?: string;
  error?: string;
  retryable?: boolean;
};

function formatStockCountPostingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  if (normalized.includes("missing permission: stock_count.post")) return "You do not have permission to confirm and post stock counts.";
  if (normalized.includes("only draft or legacy pending stock counts")) return "This stock count is no longer pending and cannot be posted.";
  if (normalized.includes("stock changed since this draft was created")) return "Stock changed after this count was started. Refresh the count and recount before posting.";
  if (normalized.includes("uom")) return "An item UOM does not match its Stock Count line. Refresh the count and check the item setup.";
  if (normalized.includes("quantity") || normalized.includes("decimal")) return "A counted quantity is invalid. Check whole-unit rules and the four-decimal limit.";
  if (normalized.includes("unavailable for this branch")) return "This Stock Count is outside your assigned branch scope.";
  if (normalized.includes("posting reference") || normalized.includes("transaction reference")) return "This Stock Count posting reference conflicts with an existing inventory movement.";
  return formatActionError(error, "The Stock Count could not be posted. No inventory changes were made.");
}

function extractStockCount(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const theoretical = formData.getAll("line_theoretical_qty").map(String);
  const physical = formData.getAll("line_physical_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  return stockCountSchema.parse({
    count_no: formData.get("count_no"),
    count_date: formData.get("count_date"),
    branch_id: formData.get("branch_id"),
    tolerance_percent: formData.get("tolerance_percent") ?? 2,
    remarks: formData.get("remarks"),
    lines: itemIds
      .map((itemId, index) => ({
        item_id: itemId,
        theoretical_qty: theoretical[index] ?? 0,
        physical_qty: physical[index] ?? 0,
        uom: uoms[index],
        remarks: remarks[index],
      }))
      .filter((line) => line.item_id),
  });
}

async function createStockCountRecord(formData: FormData) {
  const payload = extractStockCount(formData);
  if (isMockMode()) return "stock-count-draft";
  const expectedLines = await getStockCountSeedLines(payload.branch_id);
  const expectedIds = new Set(expectedLines.map((line) => line.item_id));
  const submittedIds = new Set(payload.lines.map((line) => line.item_id));
  if (expectedIds.size !== submittedIds.size || [...expectedIds].some((itemId) => !submittedIds.has(itemId))) {
    throw new Error("All items for the selected branch must be included in the stock count.");
  }
  const idempotencyKey = z.uuid().parse(String(formData.get("idempotency_key") ?? ""));
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_stock_count_atomic", {
    p_payload: { ...payload, idempotency_key: idempotencyKey },
  });
  if (error) throw new Error(error.message);
  const created = data as { id: string } | null;
  if (!created?.id) throw new Error("Stock count creation did not return an identifier.");
  revalidateWorkspaceState(["/stock-counts"]);
  return created.id;
}

async function updateStockCountDraftRecord(id: string, formData: FormData, options: { revalidate?: boolean } = {}) {
  const countId = stockCountIdSchema.parse(id);
  const payload = extractStockCount(formData);
  const lineIds = formData.getAll("line_id").map(String);
  if (lineIds.length !== payload.lines.length || lineIds.some((lineId) => !z.uuid().safeParse(lineId).success)) {
    throw new Error("Draft line identifiers are missing. Refresh the count before saving.");
  }
  if (!isMockMode()) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("update_stock_count_draft_atomic", {
      p_stock_count_id: countId,
      p_payload: {
        remarks: payload.remarks,
        lines: payload.lines.map((line, index) => ({ ...line, line_id: lineIds[index] })),
      },
    });
    if (error) throw new Error(error.message);
    if (!(data as { id?: string } | null)?.id) throw new Error("Draft save did not return an identifier.");
  }
  if (options.revalidate !== false) revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
  return countId;
}

export async function createStockCount(formData: FormData) {
  await requirePermissionOrRedirect("stock_count.create", "/stock-counts/new");
  try {
    const createdId = await createStockCountRecord(formData);
    redirect(`/stock-counts/${createdId}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-counts/new", "error", formatActionError(error, "Could not create this stock count."));
  }
}

export async function updateStockCountDraft(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.update", `/stock-counts/${id}`);
  try {
    const countId = await updateStockCountDraftRecord(id, formData);
    redirect(`/stock-counts/${countId}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not save this stock count draft."));
  }
}

export async function autosaveNewStockCount(formData: FormData): Promise<StockCountAutosaveResult> {
  try {
    await requirePermission("stock_count.create");
    const id = await createStockCountRecord(formData);
    return { ok: true, id, savedAt: new Date().toISOString() };
  } catch (error) {
    const kind = classifyActionError(error);
    return {
      ok: false,
      error: formatActionError(error, "Autosave failed. Your changes remain on this device."),
      retryable: kind === "database_unavailable" || kind === "operation_failed" || kind === "unknown_error",
    };
  }
}

export async function autosaveStockCountDraft(id: string, formData: FormData): Promise<StockCountAutosaveResult> {
  try {
    await requirePermission("stock_count.update");
    const countId = await updateStockCountDraftRecord(id, formData, { revalidate: false });
    return { ok: true, id: countId, savedAt: new Date().toISOString() };
  } catch (error) {
    const kind = classifyActionError(error);
    return {
      ok: false,
      error: formatActionError(error, "Autosave failed. Your changes remain on this device."),
      retryable: kind === "database_unavailable" || kind === "operation_failed" || kind === "unknown_error",
    };
  }
}

export async function saveAndPostStockCount(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.update", `/stock-counts/${id}`);
  try {
    await updateStockCountDraftRecord(id, formData);
  } catch (error) {
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "The latest changes could not be saved, so this Stock Count was not posted."));
  }
  await postStockCount(id);
}

export async function cancelStockCount(id: string, _formData?: FormData) {
  await requirePermission("stock_count.cancel");
  if (isMockMode()) return;
  const countId = stockCountIdSchema.parse(id);
  const supabase = await createClient();
  const { data: updatedCount, error } = await supabase.rpc("cancel_stock_count_atomic", { p_stock_count_id: countId });
  if (error) throw new Error(error.message);
  if (!(updatedCount as { id?: string } | null)?.id) throw new Error("Stock count cancellation did not return an identifier.");
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
  // Leave the editable detail surface after cancellation. Otherwise the
  // autosave form remains mounted and can make a cancelled draft appear to
  // come back when the user continues typing or refreshes the page.
  safeRedirectWithMessage("/stock-counts", "success", "Draft Stock Count cancelled and removed from active work.");
}

export async function deleteStockCount(id: string, formData: FormData) {
  void formData;
  await requireAnyPermissionOrRedirect(["stock_count.update", "stock_count.cancel"], `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    if (isMockMode()) {
      safeRedirectWithMessage(`/stock-counts/${countId}`, "error", "Mock mode cannot remove stock counts. Connect Supabase and try again.");
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("delete_stock_count_draft_atomic", { p_stock_count_id: countId });
    if (error) throw new Error(error.message);
    if (!(data as { deleted?: boolean } | null)?.deleted) throw new Error("Stock count removal did not complete.");
    revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
    safeRedirectWithMessage("/stock-counts", "success", "Stock Count removed from active records.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "This Stock Count could not be removed."));
  }
}

export async function postStockCount(id: string) {
  await requirePermissionOrRedirect("stock_count.post", `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    if (isMockMode()) {
      safeRedirectWithMessage(`/stock-counts/${countId}`, "error", "Mock mode cannot post inventory. Connect Supabase and try again.");
    }
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("post_stock_count_atomic", { p_stock_count_id: countId });
    if (error) throw new Error(error.message);
    const result = data as { document_id?: string | null; count_no?: string; already_posted?: boolean; adjusted_count?: number; unchanged_count?: number } | null;
    revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
    revalidatePath("/inventory");
    revalidatePath("/stock-balance");
    revalidatePath("/stock-card");
    revalidatePath("/stock-transactions");
    if (result?.document_id && !result.already_posted) {
      try {
        await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "posted", message: `Stock count ${result.count_no ?? countId} posted to ledger` });
      } catch (activityError) {
        logServerWarning(activityError, { source: `stock_count.post.activity_log.${countId}` });
      }
    }
    safeRedirectWithMessage(
      `/stock-counts/${countId}`,
      "success",
      result?.already_posted
        ? "This Stock Count was already posted."
        : `Stock Count posted. ${result?.adjusted_count ?? 0} inventory movements created; ${result?.unchanged_count ?? 0} zero-variance lines required no movement.`,
    );
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatStockCountPostingError(error));
  }
}
