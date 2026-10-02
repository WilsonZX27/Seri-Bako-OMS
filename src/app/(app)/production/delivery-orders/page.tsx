import Link from "next/link";
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
 const [orders,branches]=await Promise.all([loadDeliveryOrders(db,{companyId:profile.company_id,date}),complete(()=>db.from("branches").eq("company_id",profile.company_id))]);
 const names=new Map(branches.map((b)=>[b.id,String(b.branch_name)]));
 return <><PageHeader title="Delivery Orders" description="Confirmed actual deliveries. Only your accessible kitchen or outlet documents are shown."/><form className="mb-3 flex items-end gap-2 border bg-card p-3"><label className="text-xs">Delivery date<Input name="date" type="date" defaultValue={date}/></label><Button variant="outline" type="submit">View</Button></form><section className="divide-y border bg-card">{orders.map((d)=><div className="flex flex-wrap justify-between gap-2 p-3 text-sm" key={d.id}><Link className="break-all font-medium underline" href={`/production/delivery-orders/${d.id}`}>{d.do_no}</Link><span>{names.get(d.branch_id)??"Corporate event"} · v{d.plan_version} · {d.status}</span></div>)}{!orders.length?<p className="p-4 text-sm">No delivery orders for this date.</p>:null}</section></>;
}
