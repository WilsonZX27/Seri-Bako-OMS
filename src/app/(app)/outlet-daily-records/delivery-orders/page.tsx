import Link from "next/link";
import { OutletDailyWorkspaceNav } from "@/components/outlet-daily-workspace-nav";
import { WorkspaceGrid } from "@/components/layout/workspace-layout";
import { FilterBar } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { getCurrentProfile } from "@/server/queries/common";
import { loadDeliveryOrders, complete } from "@/server/production-planning/data";
import { todayInKualaLumpur } from "@/lib/business-date";
import { addDays } from "@/lib/production-planning/forecast";
export default async function DeliveryOrdersPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const filters=await searchParams;const date=filters.date??todayInKualaLumpur();addDays(date,0);
 const profile=await getCurrentProfile();if(!profile?.company_id)return null;
 const db=looseSupabase(await createClient());
 const [orders,branches]=await Promise.all([loadDeliveryOrders(db,{companyId:profile.company_id,date}),complete(()=>db.from("branches").select("*", { count: "exact" }).eq("company_id",profile.company_id))]);
 const names=new Map(branches.map((b)=>[b.id,String(b.branch_name)]));
 return <><PageHeader title="Outlet Daily Records" description="Delivery orders confirmed by the kitchen."/><WorkspaceGrid><OutletDailyWorkspaceNav current="deliveries"/><FilterBar resultCount={orders.length} resetHref="/outlet-daily-records/delivery-orders" filtered={!!filters.date}><label className="text-xs">Delivery date<Input name="date" type="date" defaultValue={date}/></label><Button variant="outline" type="submit">View</Button></FilterBar><section className="sb-list-content-card divide-y divide-[var(--sb-border-soft)]">{orders.map((d)=><div className="flex flex-wrap justify-between gap-2 p-3 text-sm" key={d.id}><Link className="break-all font-medium underline" href={`/production/delivery-orders/${d.id}`}>{d.do_no}</Link><span>{names.get(d.branch_id)??"Corporate event"} · v{d.plan_version} · {d.status}</span></div>)}{!orders.length?<p className="p-4 text-sm">No delivery orders for this date.</p>:null}</section></WorkspaceGrid></>;
}
