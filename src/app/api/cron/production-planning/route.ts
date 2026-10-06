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
 let generated=0,failed=0;
 const sent=0;
 try {
  const configs=await complete(()=>db.from("production_planning_settings").select("*", { count: "exact" }).eq("enabled",true),["kitchen_id"]);
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
  return NextResponse.json({generated,sent,failed},{status:failed?503:200});
 } catch(error){logServerError(error,{source:"cron.productionPlanning"});return NextResponse.json({error:"Planning scheduler unavailable",generated,sent,failed},{status:503});}
}
