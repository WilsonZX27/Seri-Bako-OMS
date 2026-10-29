import { readShellBranding } from "@/lib/shell-branding-read";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { Notice } from "@/components/ui/system-states";
import { PageHeader } from "@/components/ui/page-header";
import { ProductionPlanningWorkspace } from "@/components/production-planning-workspace";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCompanyBranding, getCurrentProfile } from "@/server/queries/common";
import { loadPlanningContext, loadPlans, loadDeliveryOrders, complete } from "@/server/production-planning/data";
import { addDays } from "@/lib/production-planning/forecast";
import { todayInKualaLumpur } from "@/lib/business-date";
import type { PlanningBranch, Plan, DeliveryOrder } from "@/lib/production-planning/types";
import { logServerError } from "@/server/observability/logger";
import { isMockMode, mockProfile } from "@/lib/mock-mode";
import type { PlanningProduct } from "@/lib/production-planning/types";
export default async function ProductionPlanningPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const filters=await searchParams;
 try {
  if (isMockMode()) {
   const date=filters.date??addDays(todayInKualaLumpur(),1);
   const kitchen:PlanningBranch={id:"mock-kitchen",branch_name:"Central Kitchen",branch_type:"central_kitchen"};
   const outlet:PlanningBranch={id:"mock-outlet",branch_name:"Kwan Kee Store @ Sunway Velocity",branch_type:"outlet"};
   const products:PlanningProduct[]=[
    {id:"mock-product-1",product_code:"SC001",product_name:"Hawthorn",category:"Snack",display_order:1,selling_unit:"piece"},
    {id:"mock-product-2",product_code:"RB002",product_name:"Signature Rice Bowl with a Longer Product Name",category:"Rice Bowl",display_order:2,selling_unit:"bowl"},
    {id:"mock-product-hidden",product_code:"SC003",product_name:"Seasonal Chrysanthemum",category:"Snack",display_order:3,selling_unit:"piece",available_from:"2099-01-01"},
   ];
   const view=filters.view==="settings"?"settings":filters.view==="events"?"events":"plan";
   return <><PageHeader title="Production Planning" description="Daily production and outlet allocation."/><ProductionPlanningWorkspace view={view} companyId={mockProfile.company_id} date={date} kitchenId={kitchen.id} kitchens={[kitchen]} outlets={[outlet]} products={products} plans={[]} orders={[]} config={{kitchen_id:kitchen.id,enabled:false,draft_time:"20:00",buffer_percent:0,max_decrease_percent:0,recipients:[]}} batches={[]} minimums={[]} events={[]} canManage/></>;
  }
  const profile=await getCurrentProfile(); if(!profile?.company_id)throw new Error("Active company access is required.");
  const db=looseSupabase(await createClient());
  const canManage=["super_admin","manager"].includes(profile.role_code??"");
  const view=canManage && filters.view==="settings"?"settings":canManage && filters.view==="events"?"events":"plan";
  const accessible=await complete(()=>db.from("branches").select("id,branch_name,branch_type", { count: "exact" }).eq("company_id",profile.company_id).eq("branch_type","central_kitchen").eq("status","active").is("deleted_at",null));
  const kitchenId=accessible.some((k)=>k.id===filters.kitchen)?String(filters.kitchen):String(accessible[0]?.id??"");
  const date=filters.date??addDays(todayInKualaLumpur(),1); addDays(date,0);
  if(!kitchenId)return <><PageHeader title="Production Planning" description="Daily production and outlet allocation."/><WorkspaceGrid hideDesktopConsole hideMobileConsole><Notice tone="warning" title="No kitchen available">Ask your administrator to configure a central kitchen and give you access before planning production.</Notice></WorkspaceGrid></>;
  const [context,plans,orders,branding]=await Promise.all([loadPlanningContext(db,profile.company_id,kitchenId,date,{view,kitchens:accessible as unknown as PlanningBranch[]}),view==="plan"?loadPlans(db,profile.company_id,kitchenId,date,filters.version):Promise.resolve<Plan[]>([]),view==="plan"?loadDeliveryOrders(db,{companyId:profile.company_id,kitchenId,date}):Promise.resolve<DeliveryOrder[]>([]),readShellBranding(getCompanyBranding())]);
  const selectedPlanId=plans.find(plan=>plan.id===filters.version)?.id??plans[0]?.id;
  return <><PageHeader title="Production Planning" description="Daily production and outlet allocation."/><ProductionPlanningWorkspace companyName={branding.company_name} key={`${kitchenId}:${date}:${view}:${selectedPlanId??""}`} selectedPlanId={selectedPlanId} view={view} companyId={profile.company_id} date={date} kitchenId={kitchenId} {...context} plans={plans} orders={orders} canManage={canManage}/></>;
 } catch(error) {
  logServerError(error,{source:"page.productionPlanning"});
  return <><PageHeader title="Production Planning" description="Daily production, allocation and delivery approval."/><WorkspaceGrid><Notice tone="warning" title="Production planning could not load">Reload to retry. If this continues, check the kitchen configuration and system health.</Notice></WorkspaceGrid></>;
 }
}
