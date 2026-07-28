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
import { getCurrentProfile } from "@/server/queries/common";
import { getStockCountSeedLines } from "@/server/queries/stock-counts";
import type { StockCountStatus } from "@/types/database";
import { z } from "zod";

const stockCountIdSchema = z.uuid("Invalid stock count identifier.");

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

async function updateStockCountStatus(id: string, status: StockCountStatus, step: string, message: string, expectedStatuses: StockCountStatus[]) {
  const countId = stockCountIdSchema.parse(id);
  const profile = await identity();
  const supabase = await createClient();
  const stamp: Record<string, string> = {
    submitted: "submitted_at",
    reviewed: "reviewed_at",
    approved: "approved_at",
    posted: "posted_at",
    rejected: "rejected_at",
    cancelled: "cancelled_at",
  };
  const { data: count, error: countError } = await supabase.from("stock_counts").select("document_id,count_no").eq("id", countId).single();
  if (countError) throw new Error(countError.message);
  const now = new Date().toISOString();
  const patch = { status, updated_by: profile?.id ?? null, ...(stamp[status] ? { [stamp[status]]: now } : {}) };
  const documentStatus = status === "posted" ? "posted" : status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : "pending_approval";
  const { data: updatedCount, error } = await supabase
    .from("stock_counts")
    .update(patch)
    .eq("id", countId)
    .in("status", expectedStatuses)
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!updatedCount) throw new Error("This stock count changed state. Refresh before trying again.");
  const { error: docError } = count.document_id ? await supabase.from("documents").update({
      status: documentStatus,
      approval_status: status === "approved" || status === "posted" ? "approved" : status === "rejected" ? "rejected" : "pending",
      current_step: step,
      updated_by: profile?.id ?? null,
      ...(status === "posted" ? { posted_at: now } : {}),
    }).eq("id", count.document_id) : { error: null };
  if (docError) throw new Error(docError.message);
  if (count.document_id) await writeActivityLog({ entityType: "document", entityId: count.document_id, activityType: status, message });
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
}

export async function submitStockCount(id: string) {
  await requirePermission("stock_count.submit");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "submitted", "Manager review", "Stock count submitted for review", ["draft"]);
}

export async function reviewStockCount(id: string) {
  await requirePermission("stock_count.review");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "reviewed", "Approval", "Stock count reviewed", ["submitted"]);
}

export async function approveStockCount(id: string) {
  await requirePermission("stock_count.approve");
  if (isMockMode()) return;
  const countId = stockCountIdSchema.parse(id);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("approve_stock_count_atomic", { p_stock_count_id: countId });
  if (error) throw new Error(error.message);
  const result = data as { document_id?: string | null; count_no?: string } | null;
  if (result?.document_id) await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "approved", message: `Stock count ${result.count_no ?? countId} approved` });
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
}

export async function rejectStockCount(id: string) {
  await requirePermission("stock_count.approve");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "rejected", "Rejected", "Stock count rejected", ["submitted", "reviewed"]);
}

export async function cancelStockCount(id: string) {
  await requirePermission("stock_count.cancel");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "cancelled", "Cancelled", "Stock count cancelled", ["draft", "submitted", "reviewed"]);
}

export async function postStockCount(id: string) {
  await requirePermission("stock_count.post");
  if (isMockMode()) return;
  const countId = stockCountIdSchema.parse(id);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("post_stock_count_atomic", { p_stock_count_id: countId });
  if (error) throw new Error(error.message);
  const result = data as { document_id?: string | null; count_no?: string; already_posted?: boolean } | null;
  if (result?.document_id && !result.already_posted) await writeActivityLog({ entityType: "document", entityId: result.document_id, activityType: "posted", message: `Stock count ${result.count_no ?? countId} posted to ledger` });
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${countId}`]);
  revalidatePath("/inventory");
  revalidatePath("/stock-balance");
  revalidatePath("/stock-card");
  revalidatePath("/stock-transactions");
}
