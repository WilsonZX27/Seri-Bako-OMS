import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.object({batchId:z.string().uuid(),repair:z.literal("oms281-20261019-v1/run").optional(),expectedCount:z.literal(281).optional()});

export async function POST(request:Request){
  const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
  let controlledRepair=false;
  try{
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({ok:false,message:"Invalid attendance batch."},{status:400});
    controlledRepair=Boolean(parsed.data.repair);
    if(controlledRepair&&parsed.data.expectedCount!==281)return NextResponse.json({ok:false,message:"Confirm the fixed 281-day scope."},{status:400});
    if(controlledRepair&&process.env.OMS_FIXED_ATTENDANCE_REPAIR_281!=="verified-installed-281-v1")return NextResponse.json({ok:false,message:"Controlled repair is not enabled."},{status:503});
    const actor=await requireActiveTenantActor();
    if(parsed.data.repair&&(!["super_admin","people_operations"].includes(actor.roleCode)||actor.companyId!=="3b104582-f8cb-4a4d-867f-b99e5ffc6486"||parsed.data.batchId!=="34ffbb89-be58-4d74-b6ed-a8ab3a25cda5"))return NextResponse.json({ok:false,message:"Controlled repair scope does not match."},{status:403});
    if(!(await hasPermission("attendance.import"))&&!(await hasPermission("attendance.adjust")))return NextResponse.json({ok:false,message:"You do not have permission to recalculate attendance."},{status:403});
    const supabase=await createClient();
    let operation=supabase.rpc("recalculate_attendance_week" as never,{p_batch_id:parsed.data.repair?null:parsed.data.batchId} as never);
    if(parsed.data.repair)operation=operation.setHeader("x-oms-attendance-repair",parsed.data.repair);
    const {data,error}=await operation;
    if(error)throw error;
    if(controlledRepair&&![0,281].includes(Number(data)))throw new Error("Unexpected controlled repair count; verify oms281_repair receipt and state.");
    return NextResponse.json({ok:true,message:parsed.data.repair?"Controlled attendance operation completed.":"Attendance recalculated.",calculated:Number(data??0)});
  }catch(error){logServerError(error,{source:"api.attendance.recalculate"});return NextResponse.json({ok:false,message:controlledRepair?"Controlled repair result is not confirmed. Check the repair receipt and current state before retrying.":"Attendance could not be recalculated.",...(controlledRepair?{outcome:"unknown"}:{})},{status:500});}
}

// Read-only capability handshake; an older API has no GET handler.
export async function GET(){
  try{
    const actor=await requireActiveTenantActor();
    if(!["super_admin","people_operations"].includes(actor.roleCode)||actor.companyId!=="3b104582-f8cb-4a4d-867f-b99e5ffc6486"||(!(await hasPermission("attendance.import"))&&!(await hasPermission("attendance.adjust"))))return NextResponse.json({ok:false},{status:403});
    if(process.env.OMS_FIXED_ATTENDANCE_REPAIR_281!=="verified-installed-281-v1")return NextResponse.json({ok:true,capability:"oms281-fixed-v1",enabled:false});
    const db=await createClient();
    const {data,error}=await db.rpc("recalculate_attendance_week" as never,{p_batch_id:null} as never).setHeader("x-oms-attendance-repair","oms281-20261019-v1/probe");
    if(error)return NextResponse.json({ok:true,capability:"oms281-fixed-v1",enabled:false});
    return NextResponse.json({ok:true,capability:"oms281-fixed-v1",enabled:Number(data)===-2810319});
  }catch{return NextResponse.json({ok:false,capability:"oms281-fixed-v1",enabled:false},{status:503});}
}
