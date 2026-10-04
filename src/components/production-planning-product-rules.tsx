"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ResponsiveFormFields } from "@/components/ui/responsive-form-fields";
import { SelectControl } from "@/components/ui/select-control";
import { OperationalList, OperationalListRow, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { PlanningProduct } from "@/lib/production-planning/types";

type Props = {
  products: PlanningProduct[];
  outletId: string;
  yields: Record<string, string>;
  basis: Record<string, string>;
  minimums: Record<string, string>;
  onYield: (id: string, value: string) => void;
  onBasis: (id: string, value: string) => void;
  onMinimum: (id: string, value: string) => void;
};

export function PlanningProductRules({ products, outletId, yields, basis, minimums, onYield, onBasis, onMinimum }: Props) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLocaleLowerCase();
  const visible = products.filter(product => `${product.product_code} ${product.product_name}`.toLocaleLowerCase().includes(query));
  const demand = (product: PlanningProduct) => <SelectControl ariaLabel={`${product.product_name} demand basis`} value={basis[product.id] ?? "manual"} onValueChange={value => onBasis(product.id, value)} options={[{ value: "manual", label: "Manual quantities" }, { value: "same_day", label: "Same-day history" }]} />;
  const tray = (product: PlanningProduct) => <Input aria-label={`${product.product_name} batch yield`} type="number" min="0.01" step="0.01" value={yields[product.id] ?? ""} onChange={event => onYield(product.id, event.target.value)} placeholder="Not configured" />;
  const minimum = (product: PlanningProduct) => <Input aria-label={`${product.product_name} outlet minimum`} disabled={!outletId} type="number" min="0" step="0.01" value={minimums[`${outletId}:${product.id}`] ?? ""} onChange={event => onMinimum(product.id, event.target.value)} placeholder="Not confirmed" />;

  return <>
    <div className="sb-list-query-card mb-3 flex items-center gap-3 p-3">
      <Input type="search" aria-label="Find product rules" placeholder="Find product" value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => { if (event.key === "Enter") event.preventDefault(); }} />
      <span className="shrink-0 text-xs text-muted-foreground" role="status">{visible.length} products</span>
    </div>
    {!visible.length ? <p className="p-3 text-sm text-muted-foreground">No matching products.</p> : <>
      <ResponsiveFormFields mode="desktop" aria-label="Production rules"><Table aria-label="Production yields and outlet minimums">
        <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Demand basis</TableHead><TableHead>Yield / tray</TableHead><TableHead>Outlet minimum</TableHead></TableRow></TableHeader>
        <TableBody>{visible.map(product => <TableRow key={product.id}>
          <TableCell>{product.product_code} · {product.product_name}</TableCell><TableCell>{demand(product)}</TableCell><TableCell>{tray(product)}</TableCell><TableCell>{minimum(product)}</TableCell>
        </TableRow>)}</TableBody>
      </Table></ResponsiveFormFields>
      <ResponsiveFormFields mode="compact" aria-label="Production rules"><OperationalList ariaLabel="Production yields and outlet minimums">{visible.map(product => <OperationalListRow key={product.id} primary={product.product_name} secondary={product.product_code} detail={<div className="mt-2 grid grid-cols-2 gap-2">
        <label className="col-span-2 text-xs">Demand basis{demand(product)}</label>
        <label className="text-xs">Yield / tray{tray(product)}</label>
        <label className="text-xs">Outlet minimum{minimum(product)}</label>
      </div>} />)}</OperationalList></ResponsiveFormFields>
    </>}
  </>;
}
