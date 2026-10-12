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
import { looseSupabase } from "@/lib/supabase/loose";
import { z } from "zod";
import { beginTrackedOperation, completeTrackedOperation } from "@/server/reliability/operations";
import { recordSystemIncident } from "@/server/reliability/incidents";
import { createOperationId } from "@/lib/reliability/operation-result";

const stockCountIdSchema = z.uuid("Invalid stock count identifier.");
export type StockCountAutosaveResult = {
  ok: boolean;
  id?: string;
  savedAt?: string;
  error?: string;
  retryable?: boolean;
  operationId?: string;
};

function formatStockCountPostingError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();

  const snapshotConflict = message.match(/STOCK_SNAPSHOT_CONFLICT\|([^|]+)\|([^|]+)\|([^|]+)\|([^|\n]+)/i);
  if (snapshotConflict) {
    const [, itemCode, itemName, startingBalance, currentBalance] = snapshotConflict;
    return `Stock moved for ${itemCode} ${itemName}: starting balance ${startingBalance}, current balance ${currentBalance}. Your physical count is saved; review this item before posting.`;
  }

  if (normalized.includes("missing permission: stock_count.post")) return "You do not have permission to confirm and post stock counts.";
  if (normalized.includes("only draft or legacy pending stock counts")) return "This stock count is no longer pending and cannot be posted.";
  if (normalized.includes("stock changed since this draft was created")) return "Stock changed after this count was started. Refresh the count and recount before posting.";
  if (normalized.includes("uom")) return "An item UOM does not match its Stock Count line. Refresh the count and check the item setup.";
  if (normalized.includes("quantity") || normalized.includes("decimal")) return "A counted quantity is invalid. Check whole-unit rules and the four-decimal limit.";
  if (normalized.includes("unavailable for this branch")) return "This Stock Count is outside your assigned branch scope.";
  if (normalized.includes("posting reference") || normalized.includes("transaction reference")) return "This Stock Count posting reference conflicts with an existing inventory movement.";
  return formatActionError(error, "The Stock Count could not be posted. No inventory changes were made.");
}

function formatStockCountDraftError(error: unknown, fallback: string, formData?: FormData) {
  if (error instanceof z.ZodError) {
    const issue = error.issues[0];
    const lineIndex = issue?.path[0] === "lines" && typeof issue.path[1] === "number" ? issue.path[1] : null;
    const itemCodes = formData?.getAll("line_item_code").map(String) ?? [];
    const subject = lineIndex === null ? "Stock Count" : itemCodes[lineIndex] ? `Item ${itemCodes[lineIndex]}` : `Item ${lineIndex + 1}`;
    return `${subject}: ${issue?.message ?? "Review the entered value."}`;
  }
  return formatActionError(error, fallback);
}

function extractStockCount(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const theoretical = formData.getAll("line_theoretical_qty").map(String);
  const physical = formData.getAll("line_physical_qty").map(String);
  const uoms = formData.getAll("line_uom").map(String);
  const remarks = formData.getAll("line_remarks").map(String);
  if (!itemIds.length || theoretical.length !== itemIds.length || physical.length !== itemIds.length || uoms.length !== itemIds.length) {
    throw new Error("Stock Count lines are still loading. Wait for all quantities to appear, then try again.");
  }
  if (physical.some((value) => value.trim() === "") || theoretical.some((value) => value.trim() === "")) {
    throw new Error("Stock Count quantities are incomplete. Wait for the source values to load, then enter or confirm every line.");
  }
  return stockCountSchema.parse({
    count_no: formData.get("count_no"),
    count_date: formData.get("count_date"),
    branch_id: formData.get("branch_id"),
    // Variance remains visible as exact evidence; Stock Count no longer uses
    // an operator-defined acceptance threshold.
    tolerance_percent: 0,
    remarks: formData.get("remarks"),
    lines: itemIds
      .map((itemId, index) => ({
        item_id: itemId,
        theoretical_qty: theoretical[index],
        physical_qty: physical[index],
        uom: uoms[index],
        remarks: remarks[index],
      }))
      .filter((line) => line.item_id),
  });
}

function extractRetirementRequests(formData: FormData) {
  const itemIds = formData.getAll("line_item_id").map(String);
  const enabled = formData.getAll("line_retire_after_count").map(String);
  const reasons = formData.getAll("line_retirement_reason").map(String);
  const notes = formData.getAll("line_retirement_note").map(String);
  const quantities = formData.getAll("line_physical_qty").map(String);
  return itemIds.flatMap((itemId, index) => enabled[index] === "true" ? [{
    item_id: z.string().uuid().parse(itemId),
    reason: z.enum(["used_up", "wrong_or_duplicate_code", "branch_no_longer_uses", "other"]).parse(reasons[index]),
    note: z.string().trim().min(3).max(1_000).parse(notes[index]),
    actual_qty: z.coerce.number().max(0, "An item can retire only after its final physical count is zero.").parse(quantities[index]),
  }] : []);
}

async function syncRetirementRequests(stockCountId: string, formData: FormData, lineIdsByItem?: Map<string, string>) {
  const requests = extractRetirementRequests(formData);
  const supabase = await createClient();
  let resolvedLineIds = lineIdsByItem;
  if (!resolvedLineIds) {
    const { data, error } = await supabase.from("stock_count_lines").select("id,item_id").eq("stock_count_id", stockCountId);
    if (error || !data) throw new Error(error?.message ?? "Stock Count retirement lines are unavailable.");
    resolvedLineIds = new Map(data.map((line) => [line.item_id, line.id]));
  }
  const retirements = requests.map((request) => ({ ...request, line_id: resolvedLineIds?.get(request.item_id) }));
  if (retirements.some((request) => !request.line_id)) throw new Error("A retirement request no longer matches this Stock Count. Refresh and try again.");
  const { error } = await looseSupabase(supabase).rpc("sync_stock_count_item_retirements", { p_stock_count_id: stockCountId, p_retirements: retirements });
  if (error) throw new Error(error.message);
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
  const tracked = await beginTrackedOperation({
    idempotencyKey,
    module: "stock_count",
    action: "create_draft",
    branchId: payload.branch_id,
    request: { count_date: payload.count_date, branch_id: payload.branch_id, remarks: payload.remarks ?? null, lines: payload.lines },
  });
  const priorResult = tracked.existing?.safe_result as { id?: string } | null;
  if (tracked.existing?.status === "succeeded" && priorResult?.id) return priorResult.id;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_stock_count_atomic", {
    p_payload: { ...payload, idempotency_key: idempotencyKey },
  });
  if (error) {
    await completeTrackedOperation(tracked.operationId, { status: "failed", errorCode: classifyActionError(new Error(error.message)) });
    throw new Error(error.message);
  }
  const created = data as { id: string } | null;
  if (!created?.id) throw new Error("Stock count creation did not return an identifier.");
  await syncRetirementRequests(created.id, formData);
  await completeTrackedOperation(tracked.operationId, { status: "succeeded", safeResult: { id: created.id }, businessDataChanged: true });
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
    await syncRetirementRequests(countId, formData, new Map(payload.lines.map((line, index) => [line.item_id, lineIds[index]])));
  }
  if (options.revalidate !== false) revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
  return countId;
}

export async function createStockCount(formData: FormData) {
  await requirePermissionOrRedirect("stock_count.create", "/stock-counts/new");
  try {
    const createdId = await createStockCountRecord(formData);
    const afterCreateAction = z.enum(["add-item", "replace", "remove"]).safeParse(formData.get("after_create_action"));
    const afterCreateItemId = z.string().uuid().safeParse(formData.get("after_create_item_id"));
    if (afterCreateAction.success && afterCreateAction.data === "add-item") redirect(`/stock-counts/${createdId}?open=add-item`);
    if (afterCreateAction.success && afterCreateItemId.success) redirect(`/stock-counts/${createdId}?open=${afterCreateAction.data}&item_id=${afterCreateItemId.data}`);
    redirect(`/stock-counts/${createdId}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-counts/new", "error", formatStockCountDraftError(error, "Could not create this stock count."));
  }
}

export async function updateStockCountDraft(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.update", `/stock-counts/${id}`);
  try {
    const countId = await updateStockCountDraftRecord(id, formData);
    redirect(`/stock-counts/${countId}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatStockCountDraftError(error, "Could not save this stock count draft."));
  }
}

export async function autosaveNewStockCount(formData: FormData): Promise<StockCountAutosaveResult> {
  const operationId = createOperationId();
  try {
    await requirePermission("stock_count.create");
    const id = await createStockCountRecord(formData);
    return { ok: true, id, savedAt: new Date().toISOString(), operationId };
  } catch (error) {
    const kind = classifyActionError(error);
    const userMessage = formatStockCountDraftError(error, "Autosave failed. Your changes remain on this device.");
    await recordSystemIncident({ module: "stock_count", code: kind, message: userMessage, route: "/stock-counts/new", operationId, eventType: "failed", recommendedAction: "Retry after connection recovery; the device snapshot remains available." });
    return {
      ok: false,
      error: userMessage,
      retryable: kind === "database_unavailable" || kind === "operation_failed" || kind === "unknown_error",
      operationId,
    };
  }
}

export async function autosaveStockCountDraft(id: string, formData: FormData): Promise<StockCountAutosaveResult> {
  const operationId = createOperationId();
  try {
    await requirePermission("stock_count.update");
    const countId = await updateStockCountDraftRecord(id, formData, { revalidate: false });
    return { ok: true, id: countId, savedAt: new Date().toISOString(), operationId };
  } catch (error) {
    const kind = classifyActionError(error);
    const userMessage = formatStockCountDraftError(error, "Autosave failed. Your changes remain on this device.");
    await recordSystemIncident({ module: "stock_count", code: kind, message: userMessage, route: `/stock-counts/${id}`, operationId, eventType: "failed", recommendedAction: "Retry after connection recovery; the device snapshot remains available." });
    return {
      ok: false,
      error: userMessage,
      retryable: kind === "database_unavailable" || kind === "operation_failed" || kind === "unknown_error",
      operationId,
    };
  }
}

export async function reviseStockCountLine(id: string, formData: FormData) {
  await requireAnyPermissionOrRedirect(["stock_count.update", "stock_count.post"], `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const payload = z.object({
      lineId: z.string().uuid(), action: z.enum(["update", "replace", "remove"]),
      itemId: z.string().uuid().nullable(), quantity: z.coerce.number().min(0).max(1_000_000).nullable(),
      uom: z.string().trim().max(32).nullable(), reason: z.string().trim().min(3).max(1_000), idempotencyKey: z.string().uuid(),
    }).parse({
      lineId: formData.get("line_id"), action: formData.get("revision_action"),
      itemId: String(formData.get("item_id") ?? "").trim() || null,
      quantity: String(formData.get("quantity") ?? "").trim() || null,
      uom: String(formData.get("uom") ?? "").trim() || null,
      reason: formData.get("reason"), idempotencyKey: formData.get("idempotency_key"),
    });
    if (isMockMode()) return;
    const supabase = await createClient();
    const { error } = await supabase.rpc("revise_stock_count_line", {
      target_stock_count_id: countId, target_line_id: payload.lineId, revision_action: payload.action,
      replacement_item_id: payload.itemId, replacement_physical_qty: payload.quantity,
      replacement_uom: payload.uom, revision_reason: payload.reason, request_idempotency_key: payload.idempotencyKey,
    });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState([`/stock-counts/${countId}`, "/stock-counts"]);
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", "Line change saved. Review readiness was recalculated and the original evidence remains in history.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not save this line change. Keep the count open, correct the highlighted fields, or assign it for review."));
  }
}

export async function addItemToStockCount(id: string, formData: FormData) {
  await requireAnyPermissionOrRedirect(["stock_count.create", "stock_count.update"], `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const payload = z.object({
      itemId: z.string().uuid(),
      reason: z.string().trim().min(3).max(1_000),
      idempotencyKey: z.string().uuid(),
    }).parse({ itemId: formData.get("item_id"), reason: formData.get("reason"), idempotencyKey: formData.get("idempotency_key") });
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await looseSupabase(supabase).rpc("add_item_to_stock_count", {
        p_stock_count_id: countId, p_item_id: payload.itemId, p_reason: payload.reason, p_idempotency_key: payload.idempotencyKey,
      });
      if (error) throw new Error(error.message);
    }
    revalidateWorkspaceState([`/stock-counts/${countId}`, "/stock-counts", "/notifications", "/activity"]);
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", "Item added to this count and future branch Stock Counts. Enter its physical quantity before posting.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not add this item to the Stock Count."));
  }
}

export async function updateBranchStockCountItem(id: string, itemId: string, formData: FormData) {
  await requireAnyPermissionOrRedirect(["stock_count.create", "stock_count.update"], `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const parsedItemId = z.string().uuid().parse(itemId);
    const payload = z.object({ included: z.enum(["true", "false"]), note: z.string().trim().min(3).max(1_000) })
      .parse({ included: formData.get("included"), note: formData.get("note") });
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await looseSupabase(supabase).rpc("update_branch_stock_count_item", {
        p_stock_count_id: countId, p_item_id: parsedItemId, p_included: payload.included === "true", p_note: payload.note,
      });
      if (error) throw new Error(error.message);
    }
    revalidateWorkspaceState([`/stock-counts/${countId}`, "/stock-counts", "/notifications", "/activity"]);
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", payload.included === "true" ? "Item included in future branch Stock Counts." : "Item removed from future branch Stock Counts. It remains in this current count.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not update this branch item setting."));
  }
}

export async function suggestStockCountItemCorrection(id: string, itemId: string, formData: FormData) {
  await requireAnyPermissionOrRedirect(["stock_count.create", "stock_count.update"], `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const parsedItemId = z.string().uuid().parse(itemId);
    const suggestion = z.string().trim().min(3).max(1_000).parse(formData.get("suggestion"));
    if (!isMockMode()) {
      const supabase = await createClient();
      const { error } = await looseSupabase(supabase).rpc("suggest_stock_count_item_correction", { p_stock_count_id: countId, p_item_id: parsedItemId, p_suggestion: suggestion });
      if (error) throw new Error(error.message);
    }
    revalidateWorkspaceState([`/stock-counts/${countId}`, "/notifications", "/activity"]);
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", "Item correction suggestion sent to Owner, Purchasing and Finance. The Item Master was not changed.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not send this item correction suggestion."));
  }
}

export async function resolveStockCountLineRevision(id: string, revisionId: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.post", `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const parsedRevisionId = z.string().uuid().parse(revisionId);
    const action = z.enum(["approve", "reject"]).parse(formData.get("review_action"));
    if (isMockMode()) return;
    const supabase = await createClient();
    const { error } = await supabase.rpc("review_stock_count_line_revision", { target_revision_id: parsedRevisionId, decision: action });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState([`/stock-counts/${countId}`, "/stock-counts"]);
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", action === "approve" ? "Replacement approved and applied." : "Replacement rejected; the original count line remains active.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not review this proposed line change. Retry or leave it pending without losing progress."));
  }
}

export async function saveAndPostStockCount(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.update", `/stock-counts/${id}`);
  const hasUnsavedChanges = formData.get("has_unsaved_changes") === "true";
  if (hasUnsavedChanges) {
    try {
      await updateStockCountDraftRecord(id, formData);
    } catch (error) {
      safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatStockCountDraftError(error, "The latest changes could not be saved, so this Stock Count was not posted.", formData));
    }
  }
  await postStockCount(id);
}

export async function cancelStockCount(id: string) {
  await requirePermission("stock_count.cancel");
  if (isMockMode()) return;
  const countId = stockCountIdSchema.parse(id);
  const supabase = await createClient();
  const { data: updatedCount, error } = await supabase.rpc("cancel_stock_count_atomic", { p_stock_count_id: countId });
  if (error) throw new Error(error.message);
  if (!(updatedCount as { id?: string } | null)?.id) throw new Error("Stock count cancellation did not return an identifier.");
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`, "/dashboard", "/activity"]);
  // Leave the editable detail surface after cancellation. Otherwise the
  // autosave form remains mounted and can make a cancelled draft appear to
  // come back when the user continues typing or refreshes the page.
  safeRedirectWithMessage("/stock-counts", "success", "Draft Stock Count cancelled and removed from active work.");
}

export async function voidStockCount(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.cancel", `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const payload = z.object({
      reason: z.string().trim().min(3).max(1000),
      expected_fingerprint: z.string().min(1),
      idempotency_key: z.uuid(),
    }).parse(Object.fromEntries(formData));
    if (isMockMode()) safeRedirectWithMessage(`/stock-counts/${countId}`, "error", "Mock mode cannot reverse inventory movements.");
    const supabase = await createClient();
    const { data, error } = await looseSupabase(supabase).rpc("void_stock_count_atomic", {
      p_stock_count_id: countId,
      p_reason: payload.reason,
      p_expected_fingerprint: payload.expected_fingerprint,
      p_idempotency_key: payload.idempotency_key,
    });
    if (error) throw new Error(error.message);
    if (!(data as { id?: string } | null)?.id) throw new Error("Stock Count reversal did not return an identifier.");
    revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`, "/dashboard", "/activity"]);
    revalidatePath("/inventory"); revalidatePath("/stock-balance"); revalidatePath("/stock-card"); revalidatePath("/stock-transactions");
    safeRedirectWithMessage(`/stock-counts/${countId}`, "success", "Stock Count voided. Equal reversal movements were posted and the original audit trail was preserved.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "This Stock Count could not be voided and reversed."));
  }
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
    revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`, "/dashboard", "/activity"]);
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
