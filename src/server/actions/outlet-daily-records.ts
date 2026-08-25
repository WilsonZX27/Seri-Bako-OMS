"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { hasPermission, requirePermission } from "@/server/auth/permissions";
import { z } from "zod";
import { writeActivityLog } from "@/server/activity/log";

const values = (formData: FormData, name: string) => formData.getAll(name).map(String);
const outletDailyStatusSchema = z.enum(["draft", "morning_recorded", "evening_completed"]);
const quantitySchema = z.coerce.number().finite().min(0).max(1_000_000);
const outletDailyLineSchema = z.object({
  product_id: z.uuid(),
  qty_sent: quantitySchema.nullable(),
  morning_received_qty: quantitySchema,
  morning_received_provided: z.boolean(),
  evening_leftover_qty: quantitySchema,
  wastage_qty: quantitySchema,
  wastage_reason: z.enum(["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"]).nullable(),
  notes: z.string().trim().max(1_000).nullable(),
});
const outletDailyPayloadSchema = z.object({
  record_id: z.uuid().nullable(),
  branch_id: z.uuid(),
  record_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a YYYY-MM-DD record date."),
  notes: z.string().trim().max(2_000).nullable(),
  target_status: outletDailyStatusSchema,
  lines: z.array(outletDailyLineSchema).min(1).max(500),
});

function nullableText(value: string | undefined) {
  const text = value?.trim() ?? "";
  return text.length ? text : null;
}

function extractOutletDailyPayload(formData: FormData) {
  const productIds = values(formData, "line_product_id");
  if (productIds.length > 500) throw new Error("A daily record is limited to 500 product lines.");
  const sent = values(formData, "qty_sent");
  const received = values(formData, "morning_received_qty");
  const leftover = values(formData, "evening_leftover_qty");
  const wastage = values(formData, "wastage_qty");
  const reasons = values(formData, "wastage_reason");
  const notes = values(formData, "line_notes");
  return outletDailyPayloadSchema.parse({
    record_id: String(formData.get("record_id") ?? "").trim() || null,
    branch_id: String(formData.get("branch_id") ?? "").trim(),
    record_date: String(formData.get("record_date") ?? "").trim(),
    notes: nullableText(String(formData.get("notes") ?? "")),
    target_status: String(formData.get("target_status") ?? "draft"),
    lines: productIds.map((productId, index) => ({
      product_id: productId,
      qty_sent: nullableText(sent[index]),
      // Roles without outlet-value permission submit no received field because
      // that input is disabled. Keep the RPC payload numeric, but leave
      // provenance false so the database preserves an existing value (or
      // exposes the new value as unavailable) instead of treating this
      // transport default as a receipt. Outlet Staff do submit these fields.
      morning_received_qty: received[index] ?? "0",
      morning_received_provided: received[index] != null && received[index].trim() !== "",
      evening_leftover_qty: leftover[index] ?? "0",
      wastage_qty: wastage[index] ?? "0",
      wastage_reason: nullableText(reasons[index]),
      notes: nullableText(notes[index]),
    })),
  });
}

export async function saveOutletDailyRecord(formData: FormData) {
  let payload: z.infer<typeof outletDailyPayloadSchema>;
  try {
    payload = extractOutletDailyPayload(formData);
  } catch (error) {
    const rawRecordId = String(formData.get("record_id") ?? "").trim();
    const recordId = z.uuid().safeParse(rawRecordId).success ? rawRecordId : null;
    safeRedirectWithMessage(recordId ? `/outlet-daily-records/${recordId}` : "/outlet-daily-records/new", "error", formatActionError(error, "Could not validate this outlet daily record."));
  }
  const recordId = payload.record_id;
  if (recordId) {
    const [canUpdate, canSetSent] = await Promise.all([hasPermission("outlet_daily_record.update"), hasPermission("outlet_daily_record.qty_sent")]);
    if (!canUpdate && !canSetSent) safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "error", "You do not have permission to perform this action.");
  } else await requirePermissionOrRedirect("outlet_daily_record.create", "/outlet-daily-records/new");
  try {
    const db = await createClient();
    const beforeLines = recordId ? await db.from("outlet_daily_record_lines").select("product_id,qty_sent,morning_received_qty,morning_received_provided,wastage_qty,wastage_reason,notes").eq("record_id", recordId) : { data: [], error: null };
    if (beforeLines.error) throw new Error(beforeLines.error.message);
    if (!recordId) {
      const { data: existing, error: existingError } = await db
        .from("outlet_daily_records")
        .select("id")
        .eq("branch_id", payload.branch_id)
        .eq("record_date", payload.record_date)
        .neq("status", "void")
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.id) safeRedirectWithMessage(`/outlet-daily-records/${existing.id}`, "error", "A record already exists for this outlet and date. Continue from the existing record.");
    }
    const { data, error } = await db.rpc("save_outlet_daily_record", {
      p_record_id: recordId,
      p_branch_id: payload.branch_id,
      p_record_date: payload.record_date,
      p_notes: payload.notes,
      p_target_status: payload.target_status,
      p_lines: payload.lines,
    });
    if (error?.code === "23505" && !recordId) {
      // The unique active outlet-day index is the final authority. Two taps or
      // concurrent sessions can both pass the friendly preflight check; when
      // that happens, continue from the winner instead of exposing a database
      // constraint error to the operator.
      const { data: existing, error: existingError } = await db
        .from("outlet_daily_records")
        .select("id")
        .eq("branch_id", payload.branch_id)
        .eq("record_date", payload.record_date)
        .neq("status", "void")
        .maybeSingle();
      if (existingError) throw new Error(existingError.message);
      if (existing?.id) safeRedirectWithMessage(`/outlet-daily-records/${existing.id}`, "error", "This outlet-day already exists. Continue from the existing record.");
    }
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Outlet daily record was not saved.");
    await writeActivityLog({
      entityType: "outlet_daily_record",
      entityId: String(data),
      activityType: recordId ? "updated" : "created",
      message: recordId ? "Outlet daily values updated" : "Outlet daily record created",
      metadata: {
        target_status: payload.target_status,
        changed_lines: payload.lines.map((line) => {
          const before = beforeLines.data?.find((candidate) => candidate.product_id === line.product_id);
          return { product_id: line.product_id, before: before ? { qty_sent: before.qty_sent, received: before.morning_received_provided ? before.morning_received_qty : null, wastage: before.wastage_qty, reason: before.wastage_reason, comment: before.notes } : null, after: { qty_sent: line.qty_sent, received: line.morning_received_provided ? line.morning_received_qty : null, wastage: line.wastage_qty, reason: line.wastage_reason, comment: line.notes } };
        }),
      },
    });
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${data}`]);
    redirect(`/outlet-daily-records/${data}?success=${encodeURIComponent("Outlet daily record saved.")}`);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(recordId ? `/outlet-daily-records/${recordId}` : "/outlet-daily-records/new", "error", formatActionError(error, "Could not save this outlet daily record."));
  }
}

export async function reviewOutletDailyRecord(id: string) {
  await requirePermission("outlet_daily_record.review");
  const recordId = z.uuid("Invalid outlet daily record identifier.").parse(id);
  try {
    const db = await createClient();
    const { error } = await db.rpc("transition_outlet_daily_record", { p_record_id: recordId, p_action: "review", p_reason: null });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${recordId}`]);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "success", "Outlet daily record reviewed.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "error", formatActionError(error, "Could not review this outlet daily record."));
  }
}

export async function voidOutletDailyRecord(id: string, formData: FormData) {
  await requirePermission("outlet_daily_record.void");
  const recordId = z.uuid("Invalid outlet daily record identifier.").parse(id);
  const reason = z.string().trim().min(1, "A void reason is required.").max(1_000).parse(String(formData.get("reason") ?? ""));
  try {
    const db = await createClient();
    const { error } = await db.rpc("transition_outlet_daily_record", {
      p_record_id: recordId,
      p_action: "void",
      p_reason: reason,
    });
    if (error) throw new Error(error.message);
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${recordId}`]);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "success", "Outlet daily record voided.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "error", formatActionError(error, "Could not void this outlet daily record."));
  }
}
