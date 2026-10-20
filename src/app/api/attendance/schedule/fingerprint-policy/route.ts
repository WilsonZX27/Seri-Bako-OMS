import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { requireActiveTenantActor } from "@/server/auth/tenant-actor";
import { rejectCrossSiteMutation } from "@/server/http/request-security";
import { logServerError } from "@/server/observability/logger";
const schema=z.object({staffId:z.string().uuid(),effectiveFrom:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),requiresFingerprint:z.boolean(),reason:z.string().trim().min(1).max(1000)});
export async function POST(request:Request){
 const rejected=rejectCrossSiteMutation(request);if(rejected)return rejected;
 try{
  await requireActiveTenantActor();
  const input=schema.safeParse(await request.json());
  if(!input.success)return NextResponse.json({ok:false,message:"Employee, effective date and reason are required."},{status:400});
  const db=looseSupabase(await createClient());
  const result=await db.rpc("set_staff_fingerprint_policy",{p_staff_id:input.data.staffId,p_effective_from:input.data.effectiveFrom,p_requires_fingerprint:input.data.requiresFingerprint,p_reason:input.data.reason});
  if(result.error)throw result.error;
  return NextResponse.json({ok:true});
 }catch(error){logServerError(error,{source:"api.attendance.schedule.fingerprint-policy"});return NextResponse.json({ok:false,message:"Fingerprint policy could not be saved. Only Owner can confirm staff exceptions; each effective date can be recorded once."},{status:400});}
}
