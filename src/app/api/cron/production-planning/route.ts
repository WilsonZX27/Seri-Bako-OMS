import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { looseSupabase } from "@/lib/supabase/loose";
import { buildPlanPayload, complete } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { logServerError } from "@/server/observability/logger";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function GET(request:NextRequest) {
 const secret=process.env.CRON_SECRET?.trim();
 if(!secret||request.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"Unauthorized"},{status:401});
 const db=looseSupabase(createAdminClient());
 const now=new Date();
 const date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kuala_Lumpur",year:"numeric",month:"2-digit",day:"2-digit"}).format(now);
 const time=new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Kuala_Lumpur",hour:"2-digit",minute:"2-digit",hour12:false}).format(now);
 let generated=0,failed=0,sent=0;
 try {
  const configs=await complete(()=>db.from("production_planning_settings").eq("enabled",true),["kitchen_id"]);
  for(const config of configs) {
   if(time<String(config.draft_time).slice(0,5))continue;
   try {
    // All approved/working versions count as already generated; cron never creates revisions.
    const existing=await db.from("production_plans").select("id").eq("company_id",config.company_id).eq("kitchen_id",config.kitchen_id).eq("delivery_date",addDays(date,1)).limit(1);
    if(existing.error)throw new Error(existing.error.message);
    if(existing.data?.length)continue;
    const payload=await buildPlanPayload(db,String(config.company_id),String(config.kitchen_id),addDays(date,1));
    const created=await db.rpc("create_production_plan",{p_payload:payload,p_company_id:config.company_id});
    if(created.error)throw new Error(created.error.message); generated++;
   } catch(error){failed++;logServerError(error,{source:"cron.productionPlanning.generate"});}
  }
  const apiKey=process.env.RESEND_API_KEY?.trim();
  if(!apiKey)return NextResponse.json({generated,failed,sent,email:"Provider not configured; queued messages remain pending"},{status:503});
  const claimed=await db.rpc("claim_production_emails",{p_limit:10});
  if(claimed.error)throw new Error(claimed.error.message);
  const queue=claimed.data as {id:string;recipient:string;dedupe_key:string;subject:string;body:string;attempts:number}[];
  // Bounded parallel sends keep the cron inside its execution budget.
  await Promise.all(queue.map(async(row)=>{
   try {
    const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{authorization:`Bearer ${apiKey}`,"content-type":"application/json","Idempotency-Key":row.dedupe_key},body:JSON.stringify({from:process.env.PRODUCTION_PLANNING_EMAIL_FROM??"Seri Bako Operations <admin@seribako.com.my>",to:[row.recipient],subject:row.subject,text:row.body}),signal:AbortSignal.timeout(12000)});
    const payload=await response.json() as {id?:string;message?:string};
    if(!response.ok||!payload.id)throw new Error(payload.message??`Provider returned ${response.status}`);
    const saved=await db.from("production_planning_email_queue").update({status:"sent",provider_id:payload.id,sent_at:new Date().toISOString(),locked_until:null,last_error:null}).eq("id",row.id).eq("attempts",row.attempts);
    if(saved.error)throw new Error(saved.error.message); sent++;
   } catch(error){
    failed++;
    await db.from("production_planning_email_queue").update({status:"failed",locked_until:null,last_error:error instanceof Error?error.message.slice(0,300):"Delivery failed",next_attempt_at:new Date(Date.now()+Math.min(3600000,60000*2**row.attempts)).toISOString()}).eq("id",row.id).eq("attempts",row.attempts);
   }
  }));
  return NextResponse.json({generated,sent,failed},{status:failed?503:200});
 } catch(error){logServerError(error,{source:"cron.productionPlanning"});return NextResponse.json({error:"Planning scheduler unavailable",generated,sent,failed},{status:503});}
}
