"use server";

import { createClient } from "@/lib/supabase/server";
import { formatActionError, requirePermissionOrRedirect, rethrowRedirect, safeRedirectWithMessage } from "@/server/actions/error-handling";
import { revalidateWorkspaceState } from "@/server/actions/revalidate";
import { hasPermission, requirePermission } from "@/server/auth/permissions";
import { z } from "zod";
import { writeActivityLog } from "@/server/activity/log";

const values = (formData: FormData, name: string) => formData.getAll(name).map(String);
const outletDailyStatusSchema = z.enum(["draft", "morning_recorded", "evening_completed"]);
const quantitySchema = z.coerce.number().finite().min(0).max(1_000_000);
const moneySchema = z.coerce.number().finite().min(0).max(100_000_000);
const optionalMoneySchema = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? null : value,
  moneySchema.nullable(),
);
const salesChannels = ["duitnow", "credit_card", "voucher", "grabfood", "foodpanda"] as const;
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
  pos_total_sales: optionalMoneySchema,
  sales_variance_reason: z.string().trim().max(1000).nullable(),
  sales_breakdown: z.array(z.object({ channel: z.enum(salesChannels), amount: moneySchema })).length(5),
});

function nullableText(value: string | undefined) {
  const text = value?.trim() ?? "";
  return text.length ? text : null;
}

function isSalesReconciliationMigrationPending(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message?.toLowerCase() ?? "";
  return error.code === "PGRST202"
    || error.code === "42883"
    || error.code === "42P01"
    || (message.includes("save_outlet_daily_record_v92") && (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find")))
    || message.includes("outlet_daily_sales_breakdowns");
}

type DailyValueSnapshot = {
  qty_sent: number | null;
  received: number | null;
  leftover: number;
  wastage: number;
  reason: string | null;
  comment: string | null;
};

const sameDailyValue = (left: unknown, right: unknown) => {
  if (left == null || right == null) return left == null && right == null;
  if (typeof left === "number" || typeof right === "number") return Number(left) === Number(right);
  return String(left) === String(right);
};

function changedDailyFields(before: DailyValueSnapshot | null, after: DailyValueSnapshot) {
  if (!before) return ["qty_sent", "received", "leftover", "wastage", "reason", "comment"];
  return (Object.keys(after) as (keyof DailyValueSnapshot)[]).filter((field) => !sameDailyValue(before[field], after[field]));
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
    pos_total_sales: String(formData.get("pos_total_sales") ?? ""),
    sales_variance_reason: nullableText(String(formData.get("sales_variance_reason") ?? "")),
    sales_breakdown: salesChannels.map((channel) => ({ channel, amount: String(formData.get(`sales_${channel}`) ?? "0") })),
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
  let canUpdateOutletValues = false;
  if (recordId) {
    const [canUpdate, canSetSent] = await Promise.all([hasPermission("outlet_daily_record.update"), hasPermission("outlet_daily_record.qty_sent")]);
    canUpdateOutletValues = canUpdate;
    if (!canUpdate && !canSetSent) safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "error", "You do not have permission to perform this action.");
  } else await requirePermissionOrRedirect("outlet_daily_record.create", "/outlet-daily-records/new");
  try {
    const db = await createClient();
    const [beforeLines, beforeRecord] = recordId ? await Promise.all([
      db.from("outlet_daily_record_lines").select("product_id,qty_sent,morning_received_qty,morning_received_provided,evening_leftover_qty,wastage_qty,wastage_reason,notes").eq("record_id", recordId),
      db.from("outlet_daily_records").select("status,notes").eq("id", recordId).maybeSingle(),
    ]) : [{ data: [], error: null }, { data: null, error: null }];
    if (beforeLines.error) throw new Error(beforeLines.error.message);
    if (beforeRecord.error) throw new Error(beforeRecord.error.message);
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
    const baseArgs = {
      p_record_id: recordId,
      p_branch_id: payload.branch_id,
      p_record_date: payload.record_date,
      p_notes: payload.notes,
      p_target_status: payload.target_status,
      p_lines: payload.lines,
    };
    let salesReconciliationUnavailable = false;
    let completionDeferred = false;
    let saveResult = canUpdateOutletValues || !recordId
      ? await db.rpc("save_outlet_daily_record_v92", { ...baseArgs, p_pos_total_sales: payload.pos_total_sales, p_sales_breakdown: payload.sales_breakdown, p_sales_variance_reason: payload.sales_variance_reason })
      : await db.rpc("save_outlet_daily_record", baseArgs);
    if ((canUpdateOutletValues || !recordId) && isSalesReconciliationMigrationPending(saveResult.error)) {
      // Keep the established daily-record workflow usable while a Preview or
      // Production database is waiting for the sales migration. The operator
      // is told that sales was not recorded; no entered sales value is silently
      // represented as saved.
      salesReconciliationUnavailable = true;
      completionDeferred = payload.target_status === "evening_completed";
      const fallbackStatus = completionDeferred
        ? beforeRecord.data?.status === "morning_recorded" ? "morning_recorded" : "draft"
        : payload.target_status;
      saveResult = await db.rpc("save_outlet_daily_record", { ...baseArgs, p_target_status: fallbackStatus });
    }
    const { data, error } = saveResult;
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
    const effectiveTargetStatus = completionDeferred
      ? beforeRecord.data?.status === "morning_recorded" ? "morning_recorded" : "draft"
      : payload.target_status;
    const changedLines = payload.lines.flatMap((line) => {
      const stored = beforeLines.data?.find((candidate) => candidate.product_id === line.product_id);
      const before: DailyValueSnapshot | null = stored ? {
        qty_sent: stored.qty_sent,
        received: stored.morning_received_provided ? stored.morning_received_qty : null,
        leftover: stored.evening_leftover_qty,
        wastage: stored.wastage_qty,
        reason: stored.wastage_reason,
        comment: stored.notes,
      } : null;
      const after: DailyValueSnapshot = {
        qty_sent: line.qty_sent,
        received: line.morning_received_provided ? line.morning_received_qty : null,
        leftover: line.evening_leftover_qty,
        wastage: line.wastage_qty,
        reason: line.wastage_reason,
        comment: line.notes,
      };
      const fields = changedDailyFields(before, after);
      return fields.length ? [{ product_id: line.product_id, fields, before, after }] : [];
    });
    const statusChanged = Boolean(recordId && beforeRecord.data?.status !== effectiveTargetStatus);
    const notesChanged = Boolean(recordId && (beforeRecord.data?.notes ?? null) !== payload.notes);
    if (!recordId || changedLines.length || statusChanged || notesChanged) {
      const fieldNames = new Set(changedLines.flatMap((line) => line.fields));
      const labels = [
        fieldNames.has("qty_sent") ? "Qty Sent" : null,
        fieldNames.has("received") ? "Received" : null,
        fieldNames.has("leftover") ? "Leftover" : null,
        fieldNames.has("wastage") || fieldNames.has("reason") ? "Wastage" : null,
        fieldNames.has("comment") || notesChanged ? "Notes" : null,
        statusChanged ? "Status" : null,
      ].filter((label): label is string => Boolean(label));
      const changeLabel = labels.length ? labels.join(" · ") : "Record";
      await writeActivityLog({
        entityType: "outlet_daily_record",
        entityId: String(data),
        activityType: recordId ? "updated" : "created",
        message: recordId ? `${changeLabel} updated` : "Outlet daily record created",
        metadata: {
          target_status: effectiveTargetStatus,
          previous_status: beforeRecord.data?.status ?? null,
          changed_lines: changedLines,
          notes_changed: notesChanged,
        },
      });
    }
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${data}`]);
    const successMessage = completionDeferred
      ? "Outlet daily record saved as Draft. Sales reconciliation is temporarily unavailable, so completion was deferred."
      : salesReconciliationUnavailable
      ? "Outlet daily record saved. Sales reconciliation is temporarily unavailable and was not recorded."
      : "Outlet daily record saved.";
    safeRedirectWithMessage(`/outlet-daily-records/${data}`, salesReconciliationUnavailable ? "warning" : "success", successMessage);
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(recordId ? `/outlet-daily-records/${recordId}` : "/outlet-daily-records/new", "error", formatActionError(error, "Could not save this outlet daily record."));
  }
}

export async function postOutletDailyRecord(id: string) {
  await requirePermission("outlet_daily_record.post");
  const recordId = z.uuid("Invalid outlet daily record identifier.").parse(id);
  try {
    const db = await createClient();
    const { error } = await db.rpc("transition_outlet_daily_record", {
      p_record_id: recordId,
      p_action: "post",
      p_reason: null,
    });
    if (error) throw new Error(error.message);
    await writeActivityLog({
      entityType: "outlet_daily_record",
      entityId: recordId,
      activityType: "posted",
      message: "Outlet daily record posted",
      metadata: { status: "reviewed" },
    });
    revalidateWorkspaceState(["/outlet-daily-records", `/outlet-daily-records/${recordId}`]);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "success", "Outlet daily record posted. Outlet editing is now locked.");
  } catch (error) {
    rethrowRedirect(error);
    safeRedirectWithMessage(`/outlet-daily-records/${recordId}`, "error", formatActionError(error, "Could not post this outlet daily record."));
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
