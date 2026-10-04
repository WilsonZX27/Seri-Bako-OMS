import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { looseSupabase } from "@/lib/supabase/loose";
import { loadDeliveryOrders } from "@/server/production-planning/data";
import { logServerError } from "@/server/observability/logger";
export async function OutletDailyDoSources({recordId,companyId,managed}:{recordId:string;companyId:string;managed:boolean}) {
 if(!managed)return null;
 try {
  const orders=await loadDeliveryOrders(looseSupabase(await createClient()),{companyId,recordId});
  return <section className="sb-work-surface p-3"><h2 className="text-sm font-semibold">Qty Sent · delivery order sources</h2><p className="my-2 text-xs">Qty Sent totals all valid confirmed DOs for this outlet and date. Received and Wastage must be confirmed independently.</p><ul className="space-y-1 text-sm">{orders.map((d)=><li key={d.id}><Link className="underline" href={`/production/delivery-orders/${d.id}`}>{d.do_no}</Link> · {d.status} · plan v{d.plan_version}</li>)}</ul></section>;
 } catch(error){logServerError(error,{source:"outletDaily.doSources"});return <p role="status" className="text-sm">DO sources are temporarily unavailable. Reload before reconciling Qty Sent.</p>;}
}
