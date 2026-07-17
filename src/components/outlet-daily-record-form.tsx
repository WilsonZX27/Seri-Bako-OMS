"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { id: string; product_code: string; product_name: string; category: string; selling_unit: string };
type Line = {
  product_id: string;
  morning_received_qty: number;
  evening_leftover_qty: number;
  wastage_qty: number;
  wastage_reason: OutletDailyWastageReason | null;
  notes: string | null;
};

const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];

export function OutletDailyRecordForm({
  formId, action, branches, products, lines = [], branchId, recordDate, notes, locked = false,
}: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  notes?: string | null;
  locked?: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const lineByProduct = new Map(lines.map((line) => [line.product_id, line]));
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id));
  return <form id={formId} action={action} className="space-y-4">
    <Card><CardContent className="grid gap-4 p-4 md:grid-cols-2">
      <Field label="Outlet / Branch"><SelectNative name="branch_id" defaultValue={branchId ?? (branches.length === 1 ? branches[0].id : "")} required disabled={locked}>{branches.length > 1 && !branchId ? <option value="">Select outlet / branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
      <Field label="Record Date"><Input name="record_date" type="date" defaultValue={recordDate} required disabled={locked} /></Field>
      <div className="md:col-span-2"><Field label="Record Notes"><Textarea name="notes" defaultValue={notes ?? ""} placeholder="Optional outlet-level note" disabled={locked} /></Field></div>
    </CardContent></Card>

    <Card><CardContent className="p-0">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[1fr_minmax(14rem,22rem)] md:items-end"><div><h2 className="text-sm font-semibold">Daily Product Lines</h2><p className="text-xs text-muted-foreground">Record Received first, then Leftover and Wastage after closing.</p></div><Field label="Find product"><Input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search name, code, or category" disabled={locked} /></Field></div>
      <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Product / Kuih</TableHead><TableHead className="w-32">Received</TableHead><TableHead className="w-32">Leftover</TableHead><TableHead className="w-28">Wastage</TableHead><TableHead className="w-40">Reason</TableHead><TableHead className="min-w-56">Line Note</TableHead></TableRow></TableHeader><TableBody>
        {products.map((product) => {
          const line = lineByProduct.get(product.id);
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <TableRow key={product.id} className={matches ? undefined : "hidden"}>
            <TableCell><input type="hidden" name="line_product_id" value={product.id} /><p className="font-medium">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></TableCell>
            <TableCell><Input aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" defaultValue={line ? line.morning_received_qty : ""} disabled={locked} /></TableCell>
            <TableCell><Input aria-label={`${product.product_name} leftover`} name="evening_leftover_qty" type="number" min="0" step="0.01" defaultValue={line ? line.evening_leftover_qty : ""} disabled={locked} /></TableCell>
            <TableCell><Input aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" defaultValue={line ? line.wastage_qty : ""} disabled={locked} /></TableCell>
            <TableCell><SelectNative aria-label={`${product.product_name} wastage reason`} name="wastage_reason" defaultValue={line?.wastage_reason ?? ""} disabled={locked}><option value="">No wastage</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</SelectNative></TableCell>
            <TableCell><Input aria-label={`${product.product_name} line note`} name="line_notes" defaultValue={line?.notes ?? ""} placeholder="Required for quantity exceptions" disabled={locked} /></TableCell>
          </TableRow>;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <TableRow><TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</TableCell></TableRow> : null}
        {!products.length ? <TableRow><TableCell colSpan={6}><EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /></TableCell></TableRow> : null}
      </TableBody></Table></div>
    </CardContent></Card>
  </form>;
}
