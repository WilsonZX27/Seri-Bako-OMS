"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isMockMode, mockCompany, mockProfile } from "@/lib/mock-mode";
import { createClient } from "@/lib/supabase/server";
import { stockCountSchema } from "@/lib/validations/stock-count";
import { writeActivityLog } from "@/server/activity/log";
import { requirePermission } from "@/server/auth/permissions";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { logServerWarning } from "@/server/observability/logger";
import { getCurrentProfile } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";
import { z } from "zod";

const stockCountIdSchema = z.uuid("Invalid stock count identifier.");

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

async function identity() {
  if (isMockMode()) return { company_id: mockCompany.id, id: mockProfile.id };
  return getCurrentProfile();
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

export async function createStockCount(formData: FormData) {
  await requirePermissionOrRedirect("stock_count.create", "/stock-counts/new");
  try {
    const payload = extractStockCount(formData);
    if (isMockMode()) redirect("/stock-counts/stock-count-draft");
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
    redirect(`/stock-counts/${created.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-counts/new", "error", formatActionError(error, "Could not create this stock count."));
  }
}

export async function updateStockCountDraft(id: string, formData: FormData) {
  await requirePermissionOrRedirect("stock_count.update", `/stock-counts/${id}`);
  try {
    const countId = stockCountIdSchema.parse(id);
    const payload = extractStockCount(formData);
    const lineIds = formData.getAll("line_id").map(String);
    if (lineIds.length !== payload.lines.length || lineIds.some((lineId) => !z.uuid().safeParse(lineId).success)) {
      throw new Error("Draft line identifiers are missing. Refresh the count before saving.");
    }
    if (isMockMode()) {
      revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
      redirect(`/stock-counts/${countId}`);
    }
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
    revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
    redirect(`/stock-counts/${countId}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/stock-counts/${id}`, "error", formatActionError(error, "Could not save this stock count draft."));
  }
}

export async function cancelStockCount(id: string) {
  await requirePermission("stock_count.cancel");
  if (isMockMode()) return;
  const countId = stockCountIdSchema.parse(id);
  const profile = await identity();
  const supabase = await createClient();
  const { data: updatedCount, error } = await supabase
    .from("stock_counts")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString(), updated_by: profile?.id ?? null })
    .eq("id", countId)
    .eq("status", "draft")
    .select("id,document_id,count_no")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updatedCount) throw new Error("Only a draft stock count can be cancelled.");
  if (updatedCount.document_id) {
    const { error: documentError } = await supabase.from("documents").update({ status: "cancelled", approval_status: "not_required", current_step: "Cancelled", updated_by: profile?.id ?? null }).eq("id", updatedCount.document_id);
    if (documentError) throw new Error(documentError.message);
    await writeActivityLog({ entityType: "document", entityId: updatedCount.document_id, activityType: "cancelled", message: `Stock count ${updatedCount.count_no ?? countId} cancelled` });
  }
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
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
