import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const optionalTimestamp=z.string().datetime({offset:true}).nullable().optional();
const schema=z.discriminatedUnion("action",[
  z.object({action:z.literal("submit"),assignmentId:z.string().uuid(),reportType:z.enum(["mc","emergency_leave","punch_correction","other_exception"]),requestedMinutes:z.number().int().positive().max(1440).nullable().optional(),actualFirstIn:optionalTimestamp,actualLastOut:optionalTimestamp,reason:z.string().trim().min(1).max(1000),note:z.string().trim().max(1000).nullable().optional()}),
  z.object({action:z.literal("decide"),reportId:z.string().uuid(),decision:z.enum(["approve","reject"]),comment:z.string().trim().max(1000).nullable().optional(),evidenceWaiverReason:z.string().trim().max(1000).nullable().optional()}),
]);

export async function POST(request:Request){
  const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
  try{
    const input=schema.safeParse(await request.json());
    if(!input.success)return NextResponse.json({ok:false,message:"Check the daily attendance report fields."},{status:400});
    await requireActiveTenantActor();
    const required=input.data.action==="submit"?"attendance.report.submit":"attendance.report.approve";
    if(!(await hasPermission(required)))return NextResponse.json({ok:false,message:"Daily attendance report permission required."},{status:403});
    const db=looseSupabase(await createClient());
    const result=input.data.action==="submit"
      ?await db.rpc("submit_daily_attendance_report",{p_assignment_id:input.data.assignmentId,p_type:input.data.reportType,p_minutes:input.data.requestedMinutes??null,p_actual_first_in:input.data.actualFirstIn??null,p_actual_last_out:input.data.actualLastOut??null,p_reason:input.data.reason,p_note:input.data.note??null,p_evidence_attachment_id:null})
      :await db.rpc("decide_daily_attendance_report",{p_report_id:input.data.reportId,p_decision:input.data.decision,p_comment:input.data.comment??null,p_evidence_waiver_reason:input.data.evidenceWaiverReason??null});
    if(result.error)throw result.error;
    return NextResponse.json({ok:true,data:result.data});
  }catch(error){
    logServerError(error,{source:"api.attendance.reports"});
    const message=error instanceof Error?error.message:"Daily attendance report could not be saved.";
    return NextResponse.json({ok:false,message},{status:message.includes("locked")||message.includes("cannot")||message.includes("required")?409:500});
  }
}
