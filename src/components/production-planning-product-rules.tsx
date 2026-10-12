"use client";

import { isRiceBowl } from "@/lib/production-planning/minimum-estimate";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { formatDateOnly } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { ResponsiveFormFields } from "@/components/ui/responsive-form-fields";
import { SelectControl } from "@/components/ui/select-control";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanningProduct } from "@/lib/production-planning/types";

type Props = {
  products: PlanningProduct[];
  availability: Record<string,{available_from:string|null;available_until:string|null}>;
  onAvailability:(id:string,value:{available_from:string|null;available_until:string|null})=>void;
  outletId: string;
  yields: Record<string, string>;
  basis: Record<string, string>;
  minimums: Record<string, string>;
  onYield: (id: string, value: string) => void;
  onBasis: (id: string, value: string) => void;
  onMinimum: (id: string, value: string) => void;
};

export function PlanningProductRules({ products, availability, onAvailability, outletId, yields, basis, minimums, onYield, onBasis, onMinimum }: Props) {
  const [editing,setEditing]=useState<{id:string;available_from:string;available_until:string}|null>(null);
  const period=(product:PlanningProduct)=>{const value=availability[product.id];return <Button type="button" variant="outline" onClick={()=>setEditing({id:product.id,available_from:value.available_from??"",available_until:value.available_until??""})}>{value.available_until?`Through ${formatDateOnly(value.available_until)}`:value.available_from?`From ${formatDateOnly(value.available_from)}`:"All year"}</Button>;};
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visible = products.filter(product => `${product.product_code} ${product.product_name}`.toLocaleLowerCase().includes(query));
  const demand = (product: PlanningProduct) => <SelectControl ariaLabel={`${product.product_name} demand basis`} value={basis[product.id] ?? "manual"} onValueChange={value => onBasis(product.id, value)} options={[{ value: "on_order", label: "By order only" }, { value: "manual", label: "Manual quantities" }, { value: "same_day", label: "Same-day history" }]} />;
  const tray = (product: PlanningProduct) => (isRiceBowl(product.product_name) || (basis[product.id]==="on_order" && yields[product.id]==="1")) ? <span className="text-xs">{isRiceBowl(product.product_name)?"By bowl":"By piece"} · exact quantity</span> : <Input aria-label={`${product.product_name} batch yield`} type="number" min="0.01" step="0.01" value={yields[product.id] ?? ""} onChange={event => onYield(product.id, event.target.value)} placeholder="Not configured" />;
  const minimum = (product: PlanningProduct) => basis[product.id]==="on_order" ? <span className="text-xs text-muted-foreground">Confirmed orders only</span> : <Input aria-label={`${product.product_name} outlet minimum`} disabled={!outletId} type="number" min="0" step="0.01" value={minimums[`${outletId}:${product.id}`] ?? ""} onChange={event => onMinimum(product.id, event.target.value)} placeholder="Not confirmed" />;

  return <>
    {editing?<ModalShell open titleId="product-supply-title" onClose={()=>setEditing(null)} className="max-w-sm"><h2 id="product-supply-title" className="text-sm font-semibold">Product supply period</h2><p className="my-2 text-xs">{products.find(p=>p.id===editing.id)?.product_name} · applies to all kitchens. Leave dates empty for all year.</p><label className="grid gap-1 text-xs">First day<Input type="date" value={editing.available_from} onChange={e=>setEditing({...editing,available_from:e.target.value})}/></label><label className="mt-3 grid gap-1 text-xs">Last day (inclusive)<Input type="date" min={editing.available_from||undefined} value={editing.available_until} onChange={e=>setEditing({...editing,available_until:e.target.value})}/></label><div className="mt-4 flex gap-2"><Button type="button" disabled={!!editing.available_from&&!!editing.available_until&&editing.available_from>editing.available_until} onClick={()=>{onAvailability(editing.id,{available_from:editing.available_from||null,available_until:editing.available_until||null});setEditing(null);}}>Apply to settings</Button><Button type="button" variant="outline" onClick={()=>setEditing(null)}>Cancel</Button></div></ModalShell>:null}
    <div className="mb-3 flex min-w-0 items-center gap-3">
      <Input type="search" aria-label="Find product rules" placeholder="Find product" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      <span className="shrink-0 text-xs text-muted-foreground" role="status">{visible.length} products</span>
    </div>
    {!visible.length ? <p className="p-3 text-sm text-muted-foreground">No matching products.</p> : <>
      <ResponsiveFormFields mode="desktop" aria-label="Production rules"><Table aria-label="Production yields and outlet minimums">
        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Demand basis</TableHead><TableHead>Yield / tray</TableHead><TableHead>Outlet minimum</TableHead><TableHead>Supply period</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map(product => <TableRow key={product.id}>
          <TableCell>{product.product_code} · {product.product_name}</TableCell><TableCell>{demand(product)}</TableCell><TableCell>{tray(product)}</TableCell><TableCell>{minimum(product)}</TableCell><TableCell>{period(product)}</TableCell>
        </TableRow>)}</TableBody>
      </Table></ResponsiveFormFields>
      <ResponsiveFormFields mode="compact" aria-label="Production rules"><OperationalList ariaLabel="Production yields and outlet minimums">{visible.map(product => <OperationalListRow key={product.id} primary={product.product_name} secondary={product.product_code} detail={<div className="mt-2 grid grid-cols-2 gap-2">
        <label className="col-span-2 grid gap-1 text-xs">Demand basis{demand(product)}</label>
        <label className="grid content-start gap-1 text-xs">Yield / tray{tray(product)}</label>
        <label className="grid content-start gap-1 text-xs">Outlet minimum{minimum(product)}</label><div className="col-span-2 flex flex-wrap items-center gap-2 text-xs">Supply period{period(product)}</div>
      </div>} />)}</OperationalList></ResponsiveFormFields>
    </>}
  </>;
}
