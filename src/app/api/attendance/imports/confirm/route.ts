import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { hasPermission } from "@/server/auth/permissions";
import { logServerError } from "@/server/observability/logger";

const schema=z.object({profile:z.literal("view_attendance_punch"),fileName:z.string().min(1).max(255),fileHash:z.string().regex(/^[a-f0-9]{64}$/),rows:z.array(z.record(z.string().max(100),z.string().max(2000))).min(1).max(10000)});

export async function POST(request:Request){
  const rejected=rejectCrossSiteMutation(request); if(rejected)return rejected;
  try{
    const parsed=schema.safeParse(await request.json());
    if(!parsed.success)return NextResponse.json({ok:false,message:"Invalid attendance import request."},{status:400});
    await requireActiveTenantActor();
    if(!(await hasPermission("attendance.import")))return NextResponse.json({ok:false,message:"You do not have permission to import attendance."},{status:403});
    const supabase=await createClient();
    const {data,error}=await supabase.rpc("finalise_attendance_punch_file" as never,{p_file_name:parsed.data.fileName,p_file_hash:parsed.data.fileHash,p_rows:parsed.data.rows} as never);
    if(error)throw error;
    const summary=data as {batches?:Array<{id:string;weekStart:string;rowCount:number}>;dateRange?:{from:string;to:string};acceptedRows?:number;duplicateRows?:number}|null;
    // The committed punch import remains successful even if a queued refresh
    // needs a later retry; never report a rolled-back import after it committed.
    for (const week of new Set(summary?.batches?.flatMap(batch=>{const prior=new Date(`${batch.weekStart}T00:00:00Z`);prior.setUTCDate(prior.getUTCDate()-7);return [batch.weekStart,prior.toISOString().slice(0,10)];}) ?? [])) {
      try { const refresh=await supabase.rpc("refresh_schedule_attendance" as never,{p_week_start:week,p_branch_id:null} as never);if(refresh.error)throw refresh.error; }
      catch(error){logServerError(error,{source:"api.attendance.imports.confirm.refresh"});}
    }
    const first=summary?.batches?.[0];
    return NextResponse.json({ok:true,message:"Raw punch import finalised.",file:{name:parsed.data.fileName,hash:parsed.data.fileHash},...summary,reviewUrl:first?`/attendance/review?week=${first.weekStart}&batch=${encodeURIComponent(first.id)}`:"/attendance/review"});
  }catch(error){logServerError(error,{source:"api.attendance.imports.confirm"});return NextResponse.json({ok:false,message:"Attendance import could not be finalised. No partial result was accepted."},{status:500});}
}
