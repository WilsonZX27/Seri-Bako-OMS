import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const uuid=z.string().uuid(); const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const assignment=z.object({staff_id:uuid,work_date:date,assignment_kind:z.enum(["shift","off","ph","al","mc","upl","ro","oil"]),shift_template_id:uuid.nullable().optional(),custom_start:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),custom_end:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(),custom_crosses_midnight:z.boolean().optional(),custom_break_seconds:z.number().int().min(0).max(86400).nullable().optional(),custom_maximum_recognised_seconds:z.number().int().positive().max(86400).nullable().optional(),custom_reason:z.string().trim().max(500).nullable().optional()});
const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("save"),branchId:uuid,weekStart:date,assignments:z.array(assignment).max(1000)}),
 z.object({action:z.literal("copy"),sourceWeekId:uuid,targetWeekStart:date}),
 z.object({action:z.literal("submit"),weekId:uuid,comment:z.string().max(1000).optional()}),
 z.object({action:z.literal("validate"),weekId:uuid}),
 z.object({action:z.literal("decide"),weekId:uuid,decision:z.enum(["approve","return","reject"]),comment:z.string().max(1000).optional()}),
 z.object({action:z.literal("template"),id:uuid.nullable().optional(),code:z.string().trim().min(1).max(20),name:z.string().trim().min(1).max(100),checkInStart:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),start:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),end:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),checkOutEnd:z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),crossesMidnight:z.boolean(),breakSeconds:z.number().int().min(0).max(43200),capSeconds:z.number().int().positive().max(86400),branchIds:z.array(uuid).max(100),colour:z.string().regex(/^#[0-9a-fA-F]{6}$/),otEligible:z.boolean(),graceSeconds:z.number().int().min(0).max(7200),matchBeforeSeconds:z.number().int().min(0).max(43200),matchAfterSeconds:z.number().int().min(0).max(43200),overtimeRule:z.object({mode:z.enum(["disabled","approved_only"]),threshold_seconds:z.number().int().min(0).max(86400),maximum_seconds:z.number().int().min(0).max(86400),rounding_minutes:z.union([z.literal(1),z.literal(5),z.literal(10),z.literal(15),z.literal(30)])}),reason:z.string().trim().max(500).nullable().optional()}),
 z.object({action:z.literal("lock"),weekId:uuid}),z.object({action:z.literal("unlock"),weekId:uuid,reason:z.string().trim().min(1).max(1000)})
]);
const scheduleBusinessErrors: Array<[string,string]> = [
 ["A roster cannot be submitted without assignments.","Add at least one shift, OFF, leave, public holiday, or emergency leave day before submitting."],
 ["Every scheduled employee requires at least one weekly OFF or leave day.","Every scheduled employee needs at least one OFF, leave, public holiday, or emergency leave day this week."],
 ["Every scheduled employee requires at least one weekly OFF, public holiday, leave, or off-in-lieu day.","This schedule has employees without a weekly rest or leave day. Review the named warnings before publishing."],
 ["Schedule submission is not authorised.","You do not have permission to submit this outlet schedule."],
 ["Inactive staff cannot be scheduled.","Remove inactive staff assignments before submitting."],
 ["Cross-branch schedule collision detected.","Resolve the employee's same-day assignment at another outlet before submitting."],
 ["A roster submitter cannot approve their own roster.","A different authorised Manager must publish this roster."],
 ["Only an editable roster may be submitted.","Only a Draft, Returned, Rejected, or Amendment Pending roster can be submitted."],
 ["This schedule week is not editable.","This roster is no longer editable. Ask an authorised user to return or unlock it."],
];
function scheduleErrorResponse(error: unknown) {
 const raw=error && typeof error==="object" && "message" in error && typeof error.message==="string" ? error.message : "";
 const match=scheduleBusinessErrors.find(([source])=>raw.includes(source));
 return match ? NextResponse.json({ok:false,message:match[1]},{status:409}) : NextResponse.json({ok:false,message:"Schedule action could not be completed."},{status:500});
}
export async function POST(request:Request){const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({ok:false,message:"Invalid schedule request."},{status:400});await requireActiveTenantActor();const required=input.data.action==="template"?"shift_template.manage":input.data.action==="save"||input.data.action==="copy"?"schedule.draft":input.data.action==="submit"||input.data.action==="validate"?"schedule.submit":input.data.action==="decide"?"schedule.approve":input.data.action==="lock"?"schedule.lock":"schedule.unlock";if(!(await hasPermission(required)))return NextResponse.json({ok:false,message:"You do not have permission for this schedule action."},{status:403});const db=looseSupabase(await createClient());let result;
if(input.data.action==="template")result=await db.rpc("upsert_shift_template",{p_id:input.data.id??null,p_code:input.data.code,p_name:input.data.name,p_check_in_start:input.data.checkInStart,p_start:input.data.start,p_end:input.data.end,p_check_out_end:input.data.checkOutEnd,p_crosses_midnight:input.data.crossesMidnight,p_break_seconds:input.data.breakSeconds,p_cap_seconds:input.data.capSeconds,p_branch_ids:input.data.branchIds,p_colour:input.data.colour,p_ot_eligible:input.data.otEligible,p_grace_seconds:input.data.graceSeconds,p_match_before_seconds:input.data.matchBeforeSeconds,p_match_after_seconds:input.data.matchAfterSeconds,p_overtime_rule:input.data.overtimeRule,p_reason:input.data.reason??null});
else if(input.data.action==="save")result=await db.rpc("save_schedule_week",{p_branch_id:input.data.branchId,p_week_start:input.data.weekStart,p_assignments:input.data.assignments});
else if(input.data.action==="copy")result=await db.rpc("copy_schedule_week",{p_source_week_id:input.data.sourceWeekId,p_target_week_start:input.data.targetWeekStart});
else if(input.data.action==="validate")result=await db.rpc("validate_schedule_week",{p_week_id:input.data.weekId});
else if(input.data.action==="submit"){const validation=await db.rpc("validate_schedule_week",{p_week_id:input.data.weekId});if(validation.error)throw validation.error;const report=validation.data as {status?:string;blockers?:unknown[];warnings?:unknown[]}|null;if(report?.blockers?.length)return NextResponse.json({ok:false,message:(report.blockers[0] as {message?:string}).message??"Schedule validation failed.",...report},{status:409});result=await db.rpc("submit_schedule_week",{p_week_id:input.data.weekId,p_comment:input.data.comment??null});if(!result.error)return NextResponse.json({ok:true,data:result.data,warnings:report?.warnings??[]});}
else if(input.data.action==="decide")result=await db.rpc("decide_schedule_week",{p_week_id:input.data.weekId,p_decision:input.data.decision,p_comment:input.data.comment??null});
else if(input.data.action==="lock")result=await db.rpc("lock_schedule_week",{p_week_id:input.data.weekId});
else result=await db.rpc("unlock_schedule_week",{p_week_id:input.data.weekId,p_reason:input.data.reason});
if(result.error)throw result.error;return NextResponse.json({ok:true,data:result.data});}catch(error){logServerError(error,{source:"api.attendance.schedule"});return scheduleErrorResponse(error);}}
