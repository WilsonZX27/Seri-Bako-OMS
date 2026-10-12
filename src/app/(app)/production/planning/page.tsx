import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Notice } from "@/components/ui/system-states";
import { PageHeader } from "@/components/ui/page-header";
import { ProductionPlanningWorkspace } from "@/components/production-planning-workspace";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile } from "@/server/queries/common";
import { loadPlanningContext, loadPlans, loadDeliveryOrders, complete } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { todayInKualaLumpur } from "@/lib/business-date";
import type { PlanningBranch, Plan, DeliveryOrder } from "@/lib/production-planning/types";
import { logServerError } from "@/server/observability/logger";
export default async function ProductionPlanningPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const filters=await searchParams;
 try {
  const profile=await getCurrentProfile(); if(!profile?.company_id)throw new Error("Active company access is required.");
  const db=looseSupabase(await createClient());
  const canManage=["super_admin","manager"].includes(profile.role_code??"");
  const view=canManage && filters.view==="settings"?"settings":canManage && filters.view==="events"?"events":"plan";
  const accessible=await complete(()=>db.from("branches").select("id,branch_name,branch_type", { count: "exact" }).eq("company_id",profile.company_id).eq("branch_type","central_kitchen").eq("status","active").is("deleted_at",null));
  const kitchenId=accessible.some((k)=>k.id===filters.kitchen)?String(filters.kitchen):String(accessible[0]?.id??"");
  const date=filters.date??addDays(todayInKualaLumpur(),1); addDays(date,0);
  if(!kitchenId)throw new Error("No accessible central kitchen is configured.");
  const [context,plans,orders]=await Promise.all([loadPlanningContext(db,profile.company_id,kitchenId,date,{view,kitchens:accessible as unknown as PlanningBranch[]}),view==="plan"?loadPlans(db,profile.company_id,kitchenId,date,filters.version):Promise.resolve<Plan[]>([]),view==="plan"?loadDeliveryOrders(db,{companyId:profile.company_id,kitchenId,date}):Promise.resolve<DeliveryOrder[]>([])]);
  const selectedPlanId=plans.find(plan=>plan.id===filters.version)?.id??plans[0]?.id;
  return <><PageHeader title="Production Planning" description="Daily production and outlet allocation."/><ProductionPlanningWorkspace key={`${kitchenId}:${date}:${view}:${selectedPlanId??""}`} selectedPlanId={selectedPlanId} view={view} companyId={profile.company_id} date={date} kitchenId={kitchenId} {...context} plans={plans} orders={orders} canManage={canManage}/></>;
 } catch(error) {
  logServerError(error,{source:"page.productionPlanning"});
  return <><PageHeader title="Production Planning" description="Daily production, allocation and delivery approval."/><WorkspaceGrid><Notice tone="warning" title="Production planning could not load">Reload to retry. If this continues, check the kitchen configuration and system health.</Notice></WorkspaceGrid></>;
 }
}
