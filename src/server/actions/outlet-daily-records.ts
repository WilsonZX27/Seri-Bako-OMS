"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { requirePermission } from "@/server/auth/permissions";

const values = (formData: FormData, name: string) => formData.getAll(name).map(String);

export async function saveOutletDailyRecord(formData: FormData) {
  const recordId = String(formData.get("record_id") ?? "").trim() || null;
  await requirePermissionOrRedirect(recordId ? "outlet_daily_record.update" : "outlet_daily_record.create", recordId ? `/outlet-daily-records/${recordId}` : "/outlet-daily-records/new");
  const productIds = values(formData, "line_product_id");
  const received = values(formData, "morning_received_qty");
  const leftover = values(formData, "evening_leftover_qty");
  const wastage = values(formData, "wastage_qty");
  const reasons = values(formData, "wastage_reason");
  const notes = values(formData, "line_notes");
  try {
    const db = await createClient();
    const { data, error } = await db.rpc("save_outlet_daily_record", {
      p_record_id: recordId,
      p_branch_id: String(formData.get("branch_id") ?? ""),
      p_record_date: String(formData.get("record_date") ?? ""),
      p_notes: String(formData.get("notes") ?? "").trim() || null,
      p_target_status: String(formData.get("target_status") ?? "draft"),
      p_lines: productIds.map((productId, index) => ({
        product_id: productId,
        morning_received_qty: received[index] ?? "0",
        evening_leftover_qty: leftover[index] ?? "0",
        wastage_qty: wastage[index] ?? "0",
        wastage_reason: reasons[index] || null,
        notes: notes[index] || null,
      })),
    });
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Outlet daily record was not saved.");
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${data}`]);
    redirect(`/outlet-daily-records/${data}?success=${encodeURIComponent("Outlet daily record saved.")}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(recordId ? `/outlet-daily-records/${recordId}` : "/outlet-daily-records/new", "error", formatActionError(error, "Could not save this outlet daily record."));
  }
}

export async function reviewOutletDailyRecord(id: string) {
  await requirePermission("outlet_daily_record.review");
  try {
    const db = await createClient();
    const { error } = await db.rpc("transition_outlet_daily_record", { p_record_id: id, p_action: "review", p_reason: null });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${id}`]);
    safeRedirectWithMessage(`/outlet-daily-records/${id}`, "success", "Outlet daily record reviewed.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/outlet-daily-records/${id}`, "error", formatActionError(error, "Could not review this outlet daily record."));
  }
}

export async function voidOutletDailyRecord(id: string, formData: FormData) {
  await requirePermission("outlet_daily_record.void");
  try {
    const db = await createClient();
    const { error } = await db.rpc("transition_outlet_daily_record", {
      p_record_id: id,
      p_action: "void",
      p_reason: String(formData.get("reason") ?? "").trim() || null,
    });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${id}`]);
    safeRedirectWithMessage(`/outlet-daily-records/${id}`, "success", "Outlet daily record voided.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/outlet-daily-records/${id}`, "error", formatActionError(error, "Could not void this outlet daily record."));
  }
}
