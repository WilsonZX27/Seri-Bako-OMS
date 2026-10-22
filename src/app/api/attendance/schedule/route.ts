import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const uuid = z.string().uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const assignment = z.object({
  staff_id: uuid,
  work_date: date,
  assignment_kind: z.enum([
    "shift",
    "off",
    "ph",
    "al",
    "mc",
    "upl",
    "ro",
    "oil",
  ]),
  shift_template_id: uuid.nullable().optional(),
  custom_start: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  custom_end: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  custom_crosses_midnight: z.boolean().optional(),
  custom_break_seconds: z
    .number()
    .int()
    .min(0)
    .max(86400)
    .nullable()
    .optional(),
  custom_maximum_recognised_seconds: z
    .number()
    .int()
    .positive()
    .max(86400)
    .nullable()
    .optional(),
  custom_reason: z.string().trim().max(500).nullable().optional(),
  work_site_label: z.string().trim().min(1).max(120).nullable().optional(),
  destination_branch_id: uuid.nullable().optional(),
  ro_minutes: z
    .number()
    .int()
    .positive()
    .max(1440)
    .refine((value) => value % 30 === 0)
    .nullable()
    .optional(),
  ro_original_start: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  ro_original_end: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .nullable()
    .optional(),
  ro_direction: z.enum(["late_start", "early_finish"]).nullable().optional(),
});
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("save"),
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
    branchId: uuid,
    weekStart: date,
    assignments: z.array(assignment).max(1000),
    excludedStaffIds: z.array(uuid).max(1000).optional(),
  }),
  z.object({
    action: z.literal("copy"),
    sourceWeekId: uuid,
    targetWeekStart: date,
  }),
  z.object({
    action: z.literal("submit"),
    branchId: uuid,
    weekStart: date,
    assignments: z.array(assignment).max(1000),
    excludedStaffIds: z.array(uuid).max(1000).optional(),
    expectedUpdatedAt: z.string().datetime({ offset: true }).nullable().optional(),
    comment: z.string().max(1000).optional(),
  }),
  z.object({ action: z.literal("validate"), weekId: uuid }),
  z.object({
    action: z.literal("decide"),
    weekId: uuid,
    decision: z.enum(["approve", "return", "reject"]),
    comment: z.string().trim().max(1000).optional(),
  }),
  z.object({
    action: z.literal("edit_and_publish"),
    excludedStaffIds: z.array(uuid).max(1000).optional(),
    weekId: uuid,
    branchId: uuid,
    weekStart: date,
    assignments: z.array(assignment).max(1000),
    expectedUpdatedAt: z.string().datetime({ offset: true }),
    reason: z.string().trim().min(1).max(1000),
  }),
  z.object({
    action: z.literal("import_drafts"),
    weekStart: date,
    fileName: z.string().trim().min(1).max(255),
    fileHash: z.string().regex(/^[0-9a-f]{64}$/),
    outlets: z
      .array(
        z.object({
          branch_id: uuid,
          assignments: z.array(assignment).max(1000),
        }),
      )
      .min(1)
      .max(50),
    unresolvedCount: z.literal(0),
    sourceMetadata: z.record(z.string(), z.unknown()).optional(),
    appendOnly: z.boolean().optional(),
    reconcileDrafts: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("template"),
    id: uuid.nullable().optional(),
    code: z.string().trim().min(1).max(20),
    name: z.string().trim().min(1).max(100),
    checkInStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    start: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    checkOutEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    crossesMidnight: z.boolean(),
    breakSeconds: z.number().int().min(0).max(43200),
    capSeconds: z.number().int().positive().max(86400),
    branchIds: z.array(uuid).max(100),
    colour: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    otEligible: z.boolean(),
    graceSeconds: z.number().int().min(0).max(7200),
    matchBeforeSeconds: z.number().int().min(0).max(43200),
    matchAfterSeconds: z.number().int().min(0).max(43200),
    overtimeRule: z.object({
      mode: z.enum(["disabled", "approved_only"]),
      threshold_seconds: z.number().int().min(0).max(86400),
      maximum_seconds: z.number().int().min(0).max(86400),
      rounding_minutes: z.union([
        z.literal(1),
        z.literal(5),
        z.literal(10),
        z.literal(15),
        z.literal(30),
      ]),
    }),
    reason: z.string().trim().max(500).nullable().optional(),
  }),
  z.object({ action: z.literal("lock"), weekId: uuid }),
  z.object({
    action: z.literal("unlock"),
    weekId: uuid,
    reason: z.string().trim().min(1).max(1000),
  }),
]);
const scheduleBusinessErrors: Array<[string, string]> = [
  ["Removed employees must belong to this company.", "The roster contains an unavailable employee. Reload the schedule."],
  ["A removed employee still has assignments in this outlet week.", "Remove this employee’s assignments or add them back to the roster."],
  [
    "Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.",
    "Add at least one shift, OFF, leave, public holiday, or off-in-lieu day before submitting.",
  ],
  [
    "A roster cannot be submitted without assignments.",
    "Add at least one shift, OFF, leave, public holiday, or emergency leave day before submitting.",
  ],
  [
    "Every scheduled employee requires at least one weekly OFF or leave day.",
    "Every scheduled employee needs at least one OFF, leave, public holiday, or emergency leave day this week.",
  ],
  [
    "Every scheduled employee requires at least one weekly OFF, public holiday, leave, or off-in-lieu day.",
    "This schedule has employees without a weekly rest or leave day. Review the named warnings before publishing.",
  ],
  [
    "Schedule submission is not authorised.",
    "You do not have permission to submit this outlet schedule.",
  ],
  [
    "You do not have permission to submit this outlet schedule.",
    "You do not have permission to submit this outlet schedule.",
  ],
  [
    "Inactive staff cannot be scheduled.",
    "Remove inactive staff assignments before submitting.",
  ],
  [
    " is inactive and must be removed before submission.",
    "One or more employees are inactive. Remove their assignments before submitting.",
  ],
  [
    "Cross-branch schedule collision detected.",
    "Resolve the employee's same-day assignment at another outlet before submitting.",
  ],
  [
    " has another outlet shift on ",
    "An employee already has a shift at another outlet on the same day. Resolve the conflicting assignment before submitting.",
  ],
  [
    "A roster submitter cannot approve their own roster.",
    "A different authorised Manager must publish this roster.",
  ],
  [
    "A roster submitter cannot make this decision.",
    "This roster was submitted by you. A different authorised Manager must publish or return it.",
  ],
  [
    "Schedule decision is not authorised.",
    "You are not authorised to publish or return this outlet roster.",
  ],
  [
    "Only a submitted roster may be decided.",
    "This roster is no longer awaiting approval. Reload the schedule to see its current status.",
  ],
  [
    "A valid decision and comment are required.",
    "Add a decision note and try again.",
  ],
  [
    "Only an editable roster may be submitted.",
    "Only a Draft, Returned, Rejected, or Amendment Pending roster can be submitted.",
  ],
  [
    "Only a Draft, Returned, Rejected, or Amendment Pending schedule can be submitted.",
    "Only a Draft, Returned, Rejected, or Amendment Pending schedule can be submitted.",
  ],
  [
    "This schedule week is not editable.",
    "This roster is no longer editable. Ask an authorised user to return or unlock it.",
  ],
  [
    "Schedule changed since it was opened.",
    "This schedule changed in another session. Reload it before continuing.",
  ],
  [
    "A return reason is required.",
    "Add a reason so the Supervisor knows what to correct.",
  ],
  [
    "Manager correction reason is required.",
    "Add a reason for the audited Manager correction.",
  ],
  [
    "Insufficient RO balance",
    "The employee no longer has enough available RO. Review the amount and try again.",
  ],
];
function scheduleErrorResponse(error: unknown, reference: string) {
  const raw =
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
      ? error.message
      : "";
  const incompleteDayMessage = raw.match(
    /[^.]+ has no schedule for [^.]+\. Add a shift, OFF or leave, or schedule the employee at the destination outlet\./,
  )?.[0];
  if (incompleteDayMessage) {
    return NextResponse.json(
      { ok: false, message: incompleteDayMessage },
      { status: 409 },
    );
  }
  const reconciliationMessage=["The draft changed since preview. Check changes again before importing.","A selected schedule is protected. Preview again.","An existing employee day is protected.","Choose one assignment per employee day."].find(message=>raw.includes(message));
  if(reconciliationMessage)return NextResponse.json({ok:false,message:reconciliationMessage},{status:409});
  const match = scheduleBusinessErrors.find(([source]) => raw.includes(source));
  return match
    ? NextResponse.json({ ok: false, message: match[1] }, { status: 409 })
    : NextResponse.json(
        { ok: false, message: `Schedule action could not be completed. Reload and try again. Support reference: ${reference}.` },
        { status: 500 },
      );
}
export async function POST(request: Request) {
  const rejected = rejectCrossSiteMutation(request);
  if (rejected) return rejected;
  try {
    const input = schema.safeParse(await request.json());
    if (!input.success)
      return NextResponse.json(
        { ok: false, message: "Invalid schedule request." },
        { status: 400 },
      );
    const actor = await requireActiveTenantActor();
    if (["submit", "validate"].includes(input.data.action) && !["outlet_supervisor", "manager", "super_admin"].includes(actor.roleCode))
      return NextResponse.json({ ok: false, message: "Only Supervisors and Managers may submit outlet schedules." }, { status: 403 });
    if (
      input.data.action === "decide" &&
      input.data.decision !== "approve" &&
      !input.data.comment?.trim()
    )
      return NextResponse.json(
        { ok: false, message: "A return reason is required." },
        { status: 400 },
      );
    const required =
      input.data.action === "template"
        ? "shift_template.manage"
        : input.data.action === "save" ||
            input.data.action === "copy" ||
            input.data.action === "import_drafts"
          ? "schedule.draft"
          : input.data.action === "submit" || input.data.action === "validate"
            ? "schedule.submit"
            : input.data.action === "decide" ||
                input.data.action === "edit_and_publish"
              ? "schedule.approve"
              : input.data.action === "lock"
                ? "schedule.lock"
                : "schedule.unlock";
    if (!(await hasPermission(required)))
      return NextResponse.json(
        {
          ok: false,
          message: "You do not have permission for this schedule action.",
        },
        { status: 403 },
      );
    const db = looseSupabase(await createClient());
    let result;
    if (input.data.action === "template")
      result = await db.rpc("upsert_shift_template", {
        p_id: input.data.id ?? null,
        p_code: input.data.code,
        p_name: input.data.name,
        p_check_in_start: input.data.checkInStart,
        p_start: input.data.start,
        p_end: input.data.end,
        p_check_out_end: input.data.checkOutEnd,
        p_crosses_midnight: input.data.crossesMidnight,
        p_break_seconds: input.data.breakSeconds,
        p_cap_seconds: input.data.capSeconds,
        p_branch_ids: input.data.branchIds,
        p_colour: input.data.colour,
        p_ot_eligible: input.data.otEligible,
        p_grace_seconds: input.data.graceSeconds,
        p_match_before_seconds: input.data.matchBeforeSeconds,
        p_match_after_seconds: input.data.matchAfterSeconds,
        p_overtime_rule: input.data.overtimeRule,
        p_reason: input.data.reason ?? null,
      });
    else if (input.data.action === "save")
      result = await db.rpc(input.data.excludedStaffIds ? "save_schedule_week_roster" : "save_schedule_week_with_destinations", {
        p_branch_id: input.data.branchId,
        p_week_start: input.data.weekStart,
        p_assignments: input.data.assignments,
        ...(input.data.excludedStaffIds ? { p_excluded_staff_ids: input.data.excludedStaffIds, p_expected_updated_at: input.data.expectedUpdatedAt ?? null } : {}),
      });
    else if (input.data.action === "copy")
      result = await db.rpc("copy_schedule_week", {
        p_source_week_id: input.data.sourceWeekId,
        p_target_week_start: input.data.targetWeekStart,
      });
    else if (input.data.action === "validate")
      result = await db.rpc("validate_schedule_week", {
        p_week_id: input.data.weekId,
      });
    else if (input.data.action === "submit") {
      result = await db.rpc(input.data.excludedStaffIds ? "submit_schedule_week_roster" : "submit_schedule_week_atomic", {
        p_branch_id: input.data.branchId,
        p_week_start: input.data.weekStart,
        p_assignments: input.data.assignments,
        p_expected_updated_at: input.data.expectedUpdatedAt ?? null,
        p_comment: input.data.comment ?? null,
        ...(input.data.excludedStaffIds ? { p_excluded_staff_ids: input.data.excludedStaffIds } : {}),
      });
    }
    else if (input.data.action === "edit_and_publish")
      result = await db.rpc(input.data.excludedStaffIds ? "edit_and_publish_schedule_week_roster" : "edit_and_publish_schedule_week", {
        p_week_id: input.data.weekId,
        p_assignments: input.data.assignments,
        p_expected_updated_at: input.data.expectedUpdatedAt,
        p_reason: input.data.reason,
        ...(input.data.excludedStaffIds ? { p_excluded_staff_ids: input.data.excludedStaffIds } : {}),
      });
    else if (input.data.action === "import_drafts")
      result = await db.rpc(input.data.reconcileDrafts ? "reconcile_schedule_workbook_drafts" : input.data.appendOnly ? "append_schedule_workbook_drafts" : "import_schedule_workbook_drafts", {
        p_week_start: input.data.weekStart,
        p_file_name: input.data.fileName,
        p_file_hash: input.data.fileHash,
        p_outlets: input.data.outlets,
        p_unresolved_count: input.data.unresolvedCount,
        p_source_metadata: input.data.sourceMetadata ?? {},
        ...((input.data.appendOnly || input.data.reconcileDrafts) ? { p_request_key: createHash("sha256").update(JSON.stringify({week:input.data.weekStart,fileHash:input.data.fileHash,outlets:input.data.outlets,...(input.data.reconcileDrafts?{metadata:input.data.sourceMetadata}:{} )})).digest("hex") } : {}),
      });
    else if (input.data.action === "decide")
      result = await db.rpc("decide_schedule_week", {
        p_week_id: input.data.weekId,
        p_decision: input.data.decision,
        p_comment: input.data.comment ?? null,
      });
    else if (input.data.action === "lock")
      result = await db.rpc("lock_schedule_week", {
        p_week_id: input.data.weekId,
      });
    else
      result = await db.rpc("unlock_schedule_week", {
        p_week_id: input.data.weekId,
        p_reason: input.data.reason,
      });
    if (result.error) throw result.error;
    let attendanceRefresh: unknown = null;
    if (["save","copy","import_drafts","edit_and_publish","decide","submit"].includes(input.data.action)) {
      const changedWeek = "weekStart" in input.data ? input.data.weekStart : (result.data as {week_start?:string}|null)?.week_start;
      if (changedWeek) {
        try {
          const canRefresh = (await hasPermission("attendance.import")) || (await hasPermission("attendance.adjust"));
          if (canRefresh) {
            const refresh = await db.rpc("refresh_schedule_attendance", {p_week_start:changedWeek,p_branch_id:null});
            if (refresh.error) throw refresh.error;
            attendanceRefresh=refresh.data;
          }
        } catch (error) {
          logServerError(error,{source:"api.attendance.schedule.refresh"});
          attendanceRefresh={status:"pending",message:"Schedule saved. Attendance refresh status is unavailable; check Attendance before taking further action."};
        }
      }
    }
    return NextResponse.json({ ok: true, data: result.data, attendanceRefresh });
  } catch (error) {
    const reference = crypto.randomUUID().slice(0, 8).toUpperCase();
    logServerError(error, { source: "api.attendance.schedule", requestId: reference });
    return scheduleErrorResponse(error, reference);
  }
}
