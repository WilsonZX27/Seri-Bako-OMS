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
import { resolveDocumentNumber } from "@/server/documents/sequences";
import { createInventoryMovement } from "@/server/inventory/engine";
import { resolveDefaultLocation } from "@/server/inventory/locations";
import { getCurrentProfile } from "@/server/queries/common";
import type { StockCountStatus } from "@/types/database";

function cleanText(value: unknown) {
  const text = String(value ?? "").trim();
  return text.length ? text : null;
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
    location_id: formData.get("location_id"),
    status: formData.get("status") ?? "draft",
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

async function createLinkedDocument(countNo: string, countId: string) {
  const profile = await identity();
  const supabase = await createClient();
  const { data, error } = await supabase.from("documents").insert({
    company_id: profile?.company_id ?? null,
    document_no: countNo,
    document_type: "stock_count",
    title: `Stock Count ${countNo}`,
    status: "draft",
    approval_status: "draft",
    current_step: "Kitchen counting",
    related_entity_type: "stock_count",
    related_entity_id: countId,
    created_by: profile?.id ?? null,
    updated_by: profile?.id ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  await supabase.from("document_revisions").insert({ document_id: data.id, revision_no: 1, change_summary: "Initial stock count created.", changed_by: profile?.id ?? null });
  return data.id;
}

export async function createStockCount(formData: FormData) {
  await requirePermissionOrRedirect("stock_count.create", "/stock-counts/new");
  try {
    const payload = extractStockCount(formData);
    if (isMockMode()) redirect("/stock-counts/stock-count-draft");
    const locationId = await resolveDefaultLocation(payload.branch_id, payload.location_id);

    const profile = await identity();
    const countNo = await resolveDocumentNumber({
      companyId: profile?.company_id,
      documentType: "stock_count",
      enteredNumber: payload.count_no,
    });
    const supabase = await createClient();
    const { data, error } = await supabase.from("stock_counts").insert({
      company_id: profile?.company_id ?? null,
      count_no: countNo,
      count_date: payload.count_date,
      branch_id: payload.branch_id,
      location_id: locationId,
      counted_by: profile?.id ?? null,
      status: "draft",
      tolerance_percent: payload.tolerance_percent,
      remarks: payload.remarks,
      created_by: profile?.id ?? null,
      updated_by: profile?.id ?? null,
    }).select("id").single();
    if (error) throw new Error(error.message);
    const documentId = await createLinkedDocument(countNo, data.id);
    const [{ error: updateError }, { error: linesError }] = await Promise.all([
      supabase.from("stock_counts").update({ document_id: documentId }).eq("id", data.id),
      supabase.from("stock_count_lines").insert(payload.lines.map((line) => ({ ...line, stock_count_id: data.id, remarks: cleanText(line.remarks) }))),
    ]);
    if (updateError) throw new Error(updateError.message);
    if (linesError) throw new Error(linesError.message);
    await writeActivityLog({ entityType: "document", entityId: documentId, activityType: "created", message: `Stock count ${countNo} created` });
    revalidateWorkspaceState(["/stock-counts"]);
    redirect(`/stock-counts/${data.id}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage("/stock-counts/new", "error", formatActionError(error, "Could not create this stock count."));
  }
}

async function updateStockCountStatus(id: string, status: StockCountStatus, step: string, message: string) {
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
  const { data: count, error: countError } = await supabase.from("stock_counts").select("document_id,count_no").eq("id", id).single();
  if (countError) throw new Error(countError.message);
  const now = new Date().toISOString();
  const patch = { status, updated_by: profile?.id ?? null, ...(stamp[status] ? { [stamp[status]]: now } : {}) };
  const documentStatus = status === "posted" ? "posted" : status === "approved" ? "approved" : status === "rejected" ? "rejected" : status === "cancelled" ? "cancelled" : "pending_approval";
  const [{ error }, { error: docError }] = await Promise.all([
    supabase.from("stock_counts").update(patch).eq("id", id),
    count.document_id ? supabase.from("documents").update({
      status: documentStatus,
      approval_status: status === "approved" || status === "posted" ? "approved" : status === "rejected" ? "rejected" : "pending",
      current_step: step,
      updated_by: profile?.id ?? null,
      ...(status === "posted" ? { posted_at: now } : {}),
    }).eq("id", count.document_id) : Promise.resolve({ error: null }),
  ]);
  if (error) throw new Error(error.message);
  if (docError) throw new Error(docError.message);
  if (count.document_id) await writeActivityLog({ entityType: "document", entityId: count.document_id, activityType: status, message });
  revalidateWorkspaceState(["/stock-counts", `/stock-counts/${id}`]);
}

export async function submitStockCount(id: string) {
  await requirePermission("stock_count.submit");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "submitted", "Manager review", "Stock count submitted for review");
}

export async function reviewStockCount(id: string) {
  await requirePermission("stock_count.review");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "reviewed", "Approval", "Stock count reviewed");
}

export async function approveStockCount(id: string) {
  await requirePermission("stock_count.approve");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "approved", "Ready to post", "Stock count approved");
}

export async function rejectStockCount(id: string) {
  await requirePermission("stock_count.approve");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "rejected", "Rejected", "Stock count rejected");
}

export async function cancelStockCount(id: string) {
  await requirePermission("stock_count.cancel");
  if (isMockMode()) return;
  await updateStockCountStatus(id, "cancelled", "Cancelled", "Stock count cancelled");
}

export async function postStockCount(id: string) {
  await requirePermission("stock_count.post");
  if (isMockMode()) return;
  const profile = await identity();
  const supabase = await createClient();
  const [{ data: count, error: countError }, { data: lines, error: linesError }] = await Promise.all([
    supabase.from("stock_counts").select("*").eq("id", id).single(),
    supabase.from("stock_count_lines").select("*").eq("stock_count_id", id),
  ]);
  if (countError) throw new Error(countError.message);
  if (linesError) throw new Error(linesError.message);
  if (!["approved", "reviewed"].includes(count.status)) throw new Error("Only approved or reviewed counts can be posted.");

  for (const line of lines ?? []) {
    const variance = Number(line.physical_qty) - Number(line.theoretical_qty);
    if (variance === 0) continue;
    const quantityIn = variance > 0 ? variance : 0;
    const quantityOut = variance < 0 ? Math.abs(variance) : 0;
    const transactionNo = `ST-${count.count_no}-${String(line.id).slice(0, 4)}`;
    await createInventoryMovement({
      movementType: "STOCK_COUNT",
      transactionNo,
      documentId: count.document_id,
      branchId: count.branch_id,
      itemId: line.item_id,
      locationId: count.location_id,
      transactionDate: count.count_date,
      quantity: quantityIn || quantityOut,
      unitCost: 0,
      postedBy: profile?.id ?? null,
      remarks: `Adjusted after stock count ${count.count_no}`,
      referenceType: "stock_count",
      referenceId: count.id,
      allowNegative: true,
      direction: quantityIn > 0 ? "in" : "out",
    });
  }
  await updateStockCountStatus(id, "posted", "Variance posted to ledger", `Stock count ${count.count_no} posted to ledger`);
  revalidatePath("/inventory");
  revalidatePath("/stock-balance");
  revalidatePath("/stock-card");
  revalidatePath("/stock-transactions");
}
