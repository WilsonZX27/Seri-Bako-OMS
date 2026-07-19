"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { id: string; product_code: string; product_name: string; category: string; selling_unit: string; display_order?: number };
type Line = { product_id: string; qty_sent: number; morning_received_qty: number; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null };
const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];

export function OutletDailyRecordForm({ formId, action, branches, products, lines = [], branchId, recordDate, notes, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  notes?: string | null;
  locked?: boolean;
  canEditHeader?: boolean;
  canEditQtySent?: boolean;
  canEditOutletValues?: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const lineByProduct = new Map(lines.map((line) => [line.product_id, line]));
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id));

  return <form id={formId} action={action} className="space-y-4">
    <Card><CardContent className="grid gap-4 p-4 md:grid-cols-2">
      <Field label="Outlet / Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" defaultValue={branchId ?? (branches.length === 1 ? branches[0].id : "")} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select outlet / branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
      <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" defaultValue={recordDate} required disabled={locked || !canEditHeader} /></Field>
      <div className="md:col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
    </CardContent></Card>

    <Card><CardContent className="p-0">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[1fr_minmax(14rem,22rem)] md:items-end"><div><h2 className="text-sm font-semibold">Daily Product Lines</h2><p className="text-xs text-muted-foreground">Central Kitchen records Qty Sent. Outlet Staff confirms Received and records Wastage.</p></div><Field label="Find product"><Input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search name, code, or category" disabled={locked} /></Field></div>
      <div className="hidden border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_10rem_minmax(12rem,1fr)] md:gap-2"><span>Product</span><span>Qty Sent</span><span>Received</span><span>Wastage</span><span>Reason</span><span>Remarks</span></div>
      <div className="divide-y">
        {products.map((product) => {
          const line = lineByProduct.get(product.id);
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <div key={product.id} className={`${matches ? "" : "hidden"} grid gap-3 p-3 md:grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_10rem_minmax(12rem,1fr)] md:items-end md:gap-2`}>
            <div><input type="hidden" name="line_product_id" value={product.id} /><p className="font-medium">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
            <label className="grid gap-1 text-xs"><span className="md:sr-only">Qty Sent</span><Input aria-label={`${product.product_name} qty sent`} name="qty_sent" type="number" min="0" step="0.01" defaultValue={line ? line.qty_sent : ""} disabled={locked || !canEditQtySent} /></label>
            <label className="grid gap-1 text-xs"><span className="md:sr-only">Received</span><Input aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" defaultValue={line ? line.morning_received_qty : ""} disabled={locked || !canEditOutletValues} /></label>
            <label className="grid gap-1 text-xs"><span className="md:sr-only">Wastage</span><Input aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" defaultValue={line ? line.wastage_qty : ""} disabled={locked || !canEditOutletValues} /></label>
            <label className="grid gap-1 text-xs"><span className="md:sr-only">Wastage Reason</span><SelectNative aria-label={`${product.product_name} wastage reason`} name="wastage_reason" defaultValue={line?.wastage_reason ?? ""} disabled={locked || !canEditOutletValues}><option value="">No wastage</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason.replaceAll("_", " ")}</option>)}</SelectNative></label>
            <label className="grid gap-1 text-xs"><span className="md:sr-only">Remarks</span><Input aria-label={`${product.product_name} remarks`} name="line_notes" defaultValue={line?.notes ?? ""} placeholder="Required for quantity exceptions" disabled={locked || !canEditOutletValues} /></label>
          </div>;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
    </CardContent></Card>
  </form>;
}
