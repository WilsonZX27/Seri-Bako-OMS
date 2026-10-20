import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { logServerError } from "@/server/observability/logger";
const schema=z.object({week:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>new Date(`${value}T00:00:00Z`).getUTCDay()===1),branch:z.string().uuid().nullable().optional()});
export async function GET(request:Request){
 try{
  await requireActiveTenantActor();
  const url=new URL(request.url),parsed=schema.safeParse({week:url.searchParams.get("week"),branch:url.searchParams.get("branch")});
  if(!parsed.success)return NextResponse.json({ok:false,message:"Choose a Monday week."},{status:400});
  if(!(await hasPermission("schedule.read"))&&!(await hasPermission("attendance.read")))return NextResponse.json({ok:false},{status:403});
  const end=new Date(`${parsed.data.week}T00:00:00Z`);end.setUTCDate(end.getUTCDate()+6);
  const db=looseSupabase(await createClient());
  let query=db.from("attendance_schedule_refresh").select("staff_id,work_date,status,source_revision,source_hash,calculated_revision,updated_at").gte("work_date",parsed.data.week).lte("work_date",end.toISOString().slice(0,10)).order("work_date").limit(1000);
  if(parsed.data.branch)query=query.eq("branch_id",parsed.data.branch);
  const result=await query;if(result.error)throw result.error;
  return NextResponse.json({ok:true,days:result.data??[]});
 }catch(error){logServerError(error,{source:"api.attendance.schedule-refresh"});return NextResponse.json({ok:false,message:"Calculation status is unavailable."},{status:500});}
}
export async function POST(request:Request){
 const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
 try{
  await requireActiveTenantActor();const parsed=schema.safeParse(await request.json());
  if(!parsed.success)return NextResponse.json({ok:false,message:"Choose a Monday week."},{status:400});
  if(!(await hasPermission("attendance.import"))&&!(await hasPermission("attendance.adjust")))return NextResponse.json({ok:false,message:"Attendance calculation permission is required."},{status:403});
  const db=looseSupabase(await createClient());const result=await db.rpc("refresh_schedule_attendance",{p_week_start:parsed.data.week,p_branch_id:parsed.data.branch??null});
  if(result.error)throw result.error;return NextResponse.json({ok:true,...(result.data as Record<string,unknown>)});
 }catch(error){logServerError(error,{source:"api.attendance.schedule-refresh"});return NextResponse.json({ok:false,message:"Calculation could not finish. Saved schedules are unchanged; retry the calculation."},{status:500});}
}
