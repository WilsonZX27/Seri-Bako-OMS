import { notFound } from "next/navigation";
import { z } from "zod";
import { PageHeader } from "@/components/ui/page-header";
import { ProductionDeliveryOrder } from "@/components/production-delivery-order";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile, getCompanyBranding } from "@/server/queries/common";
import { loadDeliveryOrders, complete } from "@/server/production-planning/data";
export default async function DeliveryOrderPage({params}:{params:Promise<{id:string}>}) {
 const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();
 const profile=await getCurrentProfile();if(!profile?.company_id)notFound();
 const db=looseSupabase(await createClient());
 const [orders,branches,branding]=await Promise.all([loadDeliveryOrders(db,{companyId:profile.company_id,id}),complete(()=>db.from("branches").eq("company_id",profile.company_id)),getCompanyBranding()]);
 const order=orders[0];if(!order)notFound();
 const event=order.event_id?await db.from("production_planning_events").select("name").eq("id",order.event_id).maybeSingle():null;
 return <><PageHeader title="Delivery Order" description={`${order.delivery_date} · approved plan version ${order.plan_version}`}/><ProductionDeliveryOrder order={order} kitchen={String(branches.find((b)=>b.id===order.kitchen_id)?.branch_name??"Central kitchen")} destination={String(branches.find((b)=>b.id===order.branch_id)?.branch_name??event?.data?.name??"Corporate event")} company={branding.company_name} canManage={["super_admin","manager"].includes(profile.role_code??"")}/></>;
}
