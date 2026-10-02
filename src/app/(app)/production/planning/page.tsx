import { PageHeader } from "@/components/ui/page-header";
import { ProductionPlanningWorkspace } from "@/components/production-planning-workspace";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile } from "@/server/queries/common";
import { loadPlanningContext, loadPlans, loadDeliveryOrders, complete } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { todayInKualaLumpur } from "@/lib/business-date";
import { logServerError } from "@/server/observability/logger";
export default async function ProductionPlanningPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const filters=await searchParams;
 try {
  const profile=await getCurrentProfile(); if(!profile?.company_id)throw new Error("Active company access is required.");
  const db=looseSupabase(await createClient());
  const accessible=await complete(()=>db.from("branches").eq("company_id",profile.company_id).eq("branch_type","central_kitchen").eq("status","active").is("deleted_at",null));
  const kitchenId=accessible.some((k)=>k.id===filters.kitchen)?String(filters.kitchen):String(accessible[0]?.id??"");
  const date=filters.date??addDays(todayInKualaLumpur(),1); addDays(date,0);
  if(!kitchenId)throw new Error("No accessible central kitchen is configured.");
  const [context,plans,orders]=await Promise.all([loadPlanningContext(db,profile.company_id,kitchenId,date),loadPlans(db,profile.company_id,kitchenId,date),loadDeliveryOrders(db,{companyId:profile.company_id,kitchenId,date})]);
  const emails=plans.length?await db.from("production_planning_email_queue").select("status,recipient,last_error").eq("plan_id",plans[0].id):{data:[],error:null};
  if(emails.error)throw new Error(emails.error.message);
  return <><PageHeader title="Production Planning" description="Suggest, review, produce and confirm actual deliveries. Outlet receipts and wastage are independently confirmed."/><ProductionPlanningWorkspace key={`${kitchenId}:${date}`} companyId={profile.company_id} date={date} kitchenId={kitchenId} {...context} plans={plans} orders={orders} canManage={["super_admin","manager"].includes(profile.role_code??"")} emailStatus={(emails.data??[]) as {status:string;recipient:string;last_error:string|null}[]}/></>;
 } catch(error) {
  logServerError(error,{source:"page.productionPlanning"});
  return <><PageHeader title="Production Planning" description="Daily production, allocation and delivery approval."/><section className="border bg-card p-5"><h2 className="font-semibold">Production planning is unavailable</h2><p className="mt-2 text-sm">Configuration and planning records could not be verified. No quantities have been generated or dispatched.</p><p className="mt-2 text-xs text-muted-foreground">The Production Planning database migration must be installed in the test environment before using this workflow.</p></section></>;
 }
}
