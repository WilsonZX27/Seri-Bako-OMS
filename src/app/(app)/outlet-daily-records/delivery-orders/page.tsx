import styles from "./filters.module.css";
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
import { isMockMode } from "@/lib/mock-mode";
import { normalizeUom } from "@/lib/uom";
export default async function DeliveryOrdersPage({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}) {
 const filters=await searchParams;const date=filters.date??todayInKualaLumpur();addDays(date,0);
 const profile=await getCurrentProfile();if(!profile?.company_id)return null;
 const [orders,branches,events]=isMockMode() ? [[],[],[]] : await (async()=>{
  const db=looseSupabase(await createClient());
  return Promise.all([loadDeliveryOrders(db,{companyId:profile.company_id,date}),complete(()=>db.from("branches").select("*", { count: "exact" }).eq("company_id",profile.company_id)),complete(()=>db.from("production_planning_events").select("id,name",{count:"exact"}).eq("company_id",profile.company_id).eq("event_date",date))]);
 })();
 const confirmedLines=orders.filter(order=>order.status==="confirmed").flatMap(order=>order.lines);
 const quantityByUnit=new Map<string,number>();
 let quantityUnavailable=false;
 for(const line of confirmedLines){
  const unit=normalizeUom(line.unit),qty=Number(line.qty);
  if(!unit||line.qty===null||line.qty===undefined||!Number.isFinite(qty)){quantityUnavailable=true;continue;}
  quantityByUnit.set(unit,(quantityByUnit.get(unit)??0)+qty);
 }
 const sentQuantity=orders.length===0?"No orders":!orders.some(order=>order.status==="confirmed")?"Not confirmed":quantityUnavailable?"Unavailable units or quantities":confirmedLines.length===0?"No quantity lines":[...quantityByUnit].map(([unit,qty])=>`${formatNumber(qty)} ${unit}`).join(" · ");
 const externalNames=new Map(events.map(e=>[e.id,String(e.name)]));
 const names=new Map(branches.map((b)=>[b.id,String(b.branch_name)]));
 return <><PageHeader title="Outlet Daily Records" description="Delivery orders confirmed by the kitchen."/><WorkspaceGrid mobileConsoleLabel="Delivery summary" rightRail={<ConsoleSection title={`Delivery summary · ${formatDateOnly(date)}`}><dl className="space-y-2 text-xs"><div className="flex justify-between"><dt>Confirmed orders</dt><dd>{orders.filter(d=>d.status==="confirmed").length}</dd></div><div className="flex justify-between"><dt>Voided orders</dt><dd>{orders.filter(d=>d.status==="void").length}</dd></div><div className="flex items-start justify-between gap-3"><dt>Actual quantity sent</dt><dd className="min-w-0 break-words text-right">{sentQuantity}</dd></div></dl><p className="mt-3 text-xs text-muted-foreground">Own-outlet deliveries feed Qty Sent in Daily Records. External orders remain separate.</p></ConsoleSection>}><OutletDailyWorkspaceNav current="deliveries"/><FilterBar className={`sb-delivery-order-filters ${styles.filters}`} phoneMode="inline" tabletMode="inline" resultCount={orders.length} resetHref="/outlet-daily-records/delivery-orders" filtered={!!filters.date}><Input aria-label="Delivery date" title="Delivery date" name="date" type="date" defaultValue={date}/><Button variant="outline" type="submit">View</Button></FilterBar><section className="sb-list-content-card divide-y divide-[var(--sb-border-soft)]">{orders.map((d)=><div className="flex flex-wrap justify-between gap-2 p-3 text-sm" key={d.id}><Link className="break-all font-medium underline" href={`/production/delivery-orders/${d.id}`}>{d.do_no}</Link><span>{names.get(d.branch_id)??externalNames.get(d.event_id)??"External order"} · v{d.plan_version} · {d.status}</span></div>)}{!orders.length?<p className="p-4 text-sm">No delivery orders for this date.</p>:null}</section></WorkspaceGrid></>;
}
