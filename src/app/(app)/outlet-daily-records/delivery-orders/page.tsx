import { ConsoleSection } from "@/components/layout/right-console";
import { formatDateOnly, formatNumber } from "@/lib/utils";
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
 const [orders,branches,events]=await Promise.all([loadDeliveryOrders(db,{companyId:profile.company_id,date}),complete(()=>db.from("branches").select("*", { count: "exact" }).eq("company_id",profile.company_id)),complete(()=>db.from("production_planning_events").select("id,name",{count:"exact"}).eq("company_id",profile.company_id).eq("event_date",date))]);
 const externalNames=new Map(events.map(e=>[e.id,String(e.name)]));
 const names=new Map(branches.map((b)=>[b.id,String(b.branch_name)]));
 return <><PageHeader title="Outlet Daily Records" description="Delivery orders confirmed by the kitchen."/><WorkspaceGrid rightRail={<ConsoleSection title={`Delivery summary · ${formatDateOnly(date)}`}><dl className="space-y-2 text-xs"><div className="flex justify-between"><dt>Confirmed orders</dt><dd>{orders.filter(d=>d.status==="confirmed").length}</dd></div><div className="flex justify-between"><dt>Voided orders</dt><dd>{orders.filter(d=>d.status==="void").length}</dd></div><div className="flex justify-between"><dt>Actual quantity sent</dt><dd>{orders.some(d=>d.status==="confirmed")?formatNumber(orders.filter(d=>d.status==="confirmed").reduce((sum,d)=>sum+d.lines.reduce((qty,line)=>qty+line.qty,0),0)):"Not confirmed"}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Own-outlet deliveries feed Qty Sent in Daily Records. External orders remain separate.</p></ConsoleSection>}><OutletDailyWorkspaceNav current="deliveries"/><FilterBar resultCount={orders.length} resetHref="/outlet-daily-records/delivery-orders" filtered={!!filters.date}><label className="text-xs">Delivery date<Input name="date" type="date" defaultValue={date}/></label><Button variant="outline" type="submit">View</Button></FilterBar><section className="sb-list-content-card divide-y divide-[var(--sb-border-soft)]">{orders.map((d)=><div className="flex flex-wrap justify-between gap-2 p-3 text-sm" key={d.id}><Link className="break-all font-medium underline" href={`/production/delivery-orders/${d.id}`}>{d.do_no}</Link><span>{names.get(d.branch_id)??externalNames.get(d.event_id)??"External order"} · v{d.plan_version} · {d.status}</span></div>)}{!orders.length?<p className="p-4 text-sm">No delivery orders for this date.</p>:null}</section></WorkspaceGrid></>;
}
