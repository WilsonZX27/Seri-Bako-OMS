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
  return <section className="border-b p-4" aria-label="Unallocated production" role="status">
    <h2 className="flex items-center justify-between gap-3 text-sm font-semibold"><span>Adjust unallocated production</span><span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground">{unallocated.length} products</span></h2>
    <p className="mt-1 text-xs text-muted-foreground">Adjust production or outlet quantities to allocate the remaining output.</p>
    <ul className="mt-3 grid max-h-72 gap-x-6 overflow-y-auto text-xs lg:grid-cols-2">{unallocated.map(row=>{const p=products.find(p=>p.id===row.id);return <li key={row.id} className="flex min-w-0 items-start justify-between gap-4 border-b border-[var(--sb-border-soft)] py-2"><span className="min-w-0 break-words">{p?.product_code} · {p?.product_name??"Product"}</span><strong className="whitespace-nowrap tabular-nums">{formatNumber(row.remaining)} unallocated</strong></li>;})}</ul>
  </section>;
}
