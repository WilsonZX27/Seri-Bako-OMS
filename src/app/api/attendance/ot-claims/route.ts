import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("submit"),resultId:z.string().uuid(),requestedMinutes:z.number().int().positive().max(1440).refine(value=>value%30===0),reason:z.string().trim().min(1).max(1000),reviewNote:z.string().trim().max(1000).nullable().optional()}),
 z.object({action:z.literal("decide"),claimId:z.string().uuid(),decision:z.enum(["approve","reject"]),decidedMinutes:z.number().int().min(0).max(1440).refine(value=>value%30===0),comment:z.string().trim().max(1000).nullable().optional()}),
]);

export async function POST(request:Request){const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({ok:false,message:"Use 30-minute units and complete the OT claim fields."},{status:400});await requireActiveTenantActor();const permission=input.data.action==="submit"?"attendance.ot.submit":"attendance.ot.approve";if(!(await hasPermission(permission)))return NextResponse.json({ok:false,message:"OT claim permission required."},{status:403});const db=looseSupabase(await createClient());const result=input.data.action==="submit"?await db.rpc("submit_attendance_ot_claim",{p_result_id:input.data.resultId,p_requested_minutes:input.data.requestedMinutes,p_reason:input.data.reason,p_review_note:input.data.reviewNote??null}):await db.rpc("decide_attendance_ot_claim",{p_claim_id:input.data.claimId,p_decision:input.data.decision,p_decided_minutes:input.data.decidedMinutes,p_comment:input.data.comment??null});if(result.error)throw result.error;return NextResponse.json({ok:true,data:result.data});}catch(error){logServerError(error,{source:"api.attendance.ot-claims"});const message=error instanceof Error?error.message:"OT claim could not be saved.";return NextResponse.json({ok:false,message},{status:message.includes("not authorised")?403:409});}}
