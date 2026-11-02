"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import type { PlanningProduct } from "@/lib/production-planning/types";

export function PlanningMenuSelection({ products, included, onChange, disabled }: {
  products: PlanningProduct[]; included: string[]; onChange: (ids: string[]) => void; disabled: boolean;
}) {
  const [search,setSearch]=useState("");
  const visible=products.filter(p=>`${p.product_code} ${p.product_name} ${p.category}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const categories=[...new Set(visible.map(p=>p.category))];
  const select=(ids:string[],checked:boolean)=>onChange(products.filter(p=>ids.includes(p.id)?checked:included.includes(p.id)).map(p=>p.id));
  return <section className="sb-work-surface p-4" aria-labelledby="planning-menu-title">
    <h2 id="planning-menu-title" className="text-sm font-semibold">Products in this kitchen’s plans</h2>
    <p className="mt-1 text-xs text-muted-foreground">Save settings, then recalculate a draft to apply. Existing plans stay unchanged. Supply periods still apply; products set to “By order only” appear for confirmed orders. Excluding an event product requires reviewing that event.</p>
    <div className="my-3 flex flex-wrap items-center gap-2"><Input type="search" value={search} disabled={disabled} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")e.preventDefault();}} aria-label="Find planning menu product" placeholder="Find category or product" className="min-w-0 flex-1"/><span className="text-xs text-muted-foreground" role="status">{included.filter(id=>products.some(p=>p.id===id)).length} of {products.length} selected</span></div>
    {!visible.length?<p className="text-sm">No matching products.</p>:<div className="max-h-80 overflow-auto divide-y">{categories.map(category=>{
      const items=visible.filter(p=>p.category===category),count=items.filter(p=>included.includes(p.id)).length;
      return <fieldset key={category} disabled={disabled} className="py-2"><legend className="sr-only">{category||"Uncategorised"}</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={count===items.length} ref={node=>{if(node)node.indeterminate=count>0&&count<items.length;}} onChange={e=>select(items.map(p=>p.id),e.target.checked)}/>{category||"Uncategorised"}<span className="text-xs font-normal text-muted-foreground">{count}/{items.length}{search.trim()?" matching":""}</span></label>
        <div className="grid gap-x-4 sm:grid-cols-2">{items.map(p=><label key={p.id} className="flex min-h-11 min-w-0 items-center gap-2 text-xs"><input type="checkbox" checked={included.includes(p.id)} onChange={e=>select([p.id],e.target.checked)}/><span className="break-words">{p.product_code} · {p.product_name}</span></label>)}</div>
      </fieldset>;
    })}</div>}
  </section>;
}
