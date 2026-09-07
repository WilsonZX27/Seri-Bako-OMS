import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.object({profile:z.enum(["view_attendance_punch","attendance_report","timecard_report"]),weekStart:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),fileName:z.string().min(1).max(255),fileHash:z.string().regex(/^[a-f0-9]{64}$/),rows:z.array(z.record(z.string().max(100),z.string().max(2000))).min(1).max(10000)});

export async function POST(request:Request){
  const rejected=rejectCrossSiteMutation(request); if(rejected)return rejected;
  try{
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({ok:false,message:"Invalid attendance import request."},{status:400});
    await requireActiveTenantActor();
    if(!(await hasPermission("attendance.import")))return NextResponse.json({ok:false,message:"You do not have permission to import attendance."},{status:403});
    const supabase=await createClient();
    const timecardPunches=parsed.data.profile==="timecard_report"?parsed.data.rows.flatMap(row=>[{time:row["Clock In"],kind:"in"},{time:row["Clock Out"],kind:"out"}].filter(item=>item.time).map(item=>({"Person ID":row["Person ID"],"Person Name":row["Person Name"]??"","Punch Date":row.Date,"Attendance record":item.time,"Verify Type":"Timecard Report","TimeZone":"+08:00","Source":"NGTECO_TIMECARD_REPORT","Punch Type":item.kind}))):parsed.data.rows;
    const {data,error}=await supabase.rpc("finalise_attendance_import" as never,{p_parser_profile:parsed.data.profile==="timecard_report"?"view_attendance_punch":parsed.data.profile,p_week_start:parsed.data.weekStart,p_file_name:parsed.data.fileName,p_file_hash:parsed.data.fileHash,p_rows:timecardPunches} as never);
    if(error)throw error;
    return NextResponse.json({ok:true,message:"Attendance import finalised.",batch:data});
  }catch(error){logServerError(error,{source:"api.attendance.imports.confirm"});return NextResponse.json({ok:false,message:"Attendance import could not be finalised. No partial result was accepted."},{status:500});}
}
