import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.object({batchId:z.string().uuid()});

export async function POST(request:Request){
  const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
  try{
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({ok:false,message:"Invalid attendance batch."},{status:400});
    await requireActiveTenantActor();
    if(!(await hasPermission("attendance.import"))&&!(await hasPermission("attendance.adjust")))return NextResponse.json({ok:false,message:"You do not have permission to recalculate attendance."},{status:403});
    const supabase=await createClient();
    const {data,error}=await supabase.rpc("recalculate_attendance_week" as never,{p_batch_id:parsed.data.batchId} as never);
    if(error)throw error;
    return NextResponse.json({ok:true,message:"Attendance recalculated.",calculated:Number(data??0)});
  }catch(error){logServerError(error,{source:"api.attendance.recalculate"});return NextResponse.json({ok:false,message:"Attendance could not be recalculated."},{status:500});}
}
