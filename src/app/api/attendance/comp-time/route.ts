import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("reconcileOt"),claimId:z.string().uuid(),reason:z.string().trim().min(1).max(1000),note:z.string().trim().max(1000).nullable().optional()}),
 z.object({action:z.literal("submit"),staffId:z.string().uuid(),branchId:z.string().uuid().nullable(),workDate:z.string().date(),kind:z.literal("correction"),minutes:z.number().int().min(-1440).max(1440).refine(value=>value!==0&&value%30===0),reason:z.string().trim().min(1).max(1000),note:z.string().trim().max(1000).nullable().optional()}),
 z.object({action:z.literal("decide"),transactionId:z.string().uuid(),decision:z.enum(["approve","reject"]),comment:z.string().trim().max(1000).nullable().optional()}),
]);
export async function POST(request:Request){const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({ok:false,message:"Check the comp time entry fields."},{status:400});await requireActiveTenantActor();const required=input.data.action!=="decide"?"comp_time.submit":"comp_time.approve";if(!(await hasPermission(required)))return NextResponse.json({ok:false,message:"Comp time permission required."},{status:403});const db=looseSupabase(await createClient());const result=input.data.action==="reconcileOt"?await db.rpc("submit_attendance_ot_reconciliation",{p_claim_id:input.data.claimId,p_reason:input.data.reason,p_note:input.data.note??null}):input.data.action==="submit"?await db.rpc("submit_comp_time_transaction",{p_staff_id:input.data.staffId,p_branch_id:input.data.branchId,p_work_date:input.data.workDate,p_kind:input.data.kind,p_minutes:input.data.minutes,p_reason:input.data.reason,p_note:input.data.note??null}):await db.rpc("decide_comp_time_transaction",{p_transaction_id:input.data.transactionId,p_decision:input.data.decision,p_comment:input.data.comment??null});if(result.error)throw result.error;return NextResponse.json({ok:true,data:result.data});}catch(error){logServerError(error,{source:"api.attendance.comp-time"});const message=error instanceof Error?error.message:"Comp time entry could not be saved.";return NextResponse.json({ok:false,message},{status:message.includes("locked")||message.includes("cannot")?409:500})}}
