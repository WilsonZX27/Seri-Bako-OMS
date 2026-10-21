import type { Allocation, ProductionLine, PlanningProduct } from "@/lib/production-planning/types";
import { formatNumber } from "@/lib/utils";

export function PlanningSurplus({allocations,production,products}:{allocations:Allocation[];production:ProductionLine[];products:PlanningProduct[]}) {
  const unallocated=production.flatMap(p=>{
    const destinations=allocations.filter(a=>a.product_id===p.product_id);
    if(p.trays===null||p.yield_per_tray===null||destinations.some(a=>a.approved_qty===null))return [];
    const remaining=p.trays*p.yield_per_tray-p.event_qty-p.retained_qty-destinations.reduce((s,a)=>s+a.approved_qty!,0);
    return remaining>1e-8?[{id:p.product_id,remaining}]:[];
  });
  if(!unallocated.length)return null;
  return <section className="sb-work-surface p-4" aria-label="Unallocated production" role="status">
    <h2 className="text-sm font-semibold">Adjust unallocated production · {unallocated.length} products</h2>
    <p className="mt-1 max-w-prose text-xs">Output remains after bounded allocation. Adjust trays, outlet quantities or the production schedule. High-wastage outlets are not given extra stock to clear the kitchen.</p>
    <ul className="mt-3 divide-y text-xs">{unallocated.map(row=>{const p=products.find(p=>p.id===row.id);return <li key={row.id} className="flex justify-between gap-4 py-2"><span>{p?.product_code} · {p?.product_name??"Product"}</span><strong className="whitespace-nowrap tabular-nums">{formatNumber(row.remaining)} unallocated</strong></li>;})}</ul>
  </section>;
}
