import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.object({weekStart:z.string().date(),branchId:z.string().uuid().nullable(),roDecisions:z.array(z.object({reservationId:z.string().uuid(),finalUsedMinutes:z.number().int().min(0).max(1440).refine(value=>value%30===0),note:z.string().trim().max(1000).nullable().optional()})).max(1000)});
export async function POST(request:Request){const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;try{const input=schema.safeParse(await request.json());if(!input.success)return NextResponse.json({ok:false,message:"Check every RO decision and use 30-minute units."},{status:400});await requireActiveTenantActor();if(!(await hasPermission("attendance.week.close")))return NextResponse.json({ok:false,message:"People or Owner permission is required to close the week."},{status:403});const db=looseSupabase(await createClient());const result=await db.rpc("close_attendance_week_v2",{p_week_start:input.data.weekStart,p_branch_id:input.data.branchId,p_ro_decisions:input.data.roDecisions});if(result.error)throw result.error;return NextResponse.json({ok:true,data:result.data});}catch(error){logServerError(error,{source:"api.attendance.weekly-close"});const message=error instanceof Error?error.message:"Attendance week could not be closed.";return NextResponse.json({ok:false,message},{status:message.includes("not authorised")?403:409});}}
