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
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0 md:p-4">
      <section data-outlet-daily-setup className="erp-surface grid gap-4 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:grid-cols-2">
      <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" defaultValue={branchId ?? (branches.length === 1 ? branches[0].id : "")} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
      <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" defaultValue={recordDate} required disabled={locked || !canEditHeader} /></Field>
      <div className="md:col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
      </section>
    </CardContent></Card>

    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0">
      <section data-outlet-daily-lines className="erp-surface overflow-hidden md:rounded-none md:border-0">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[1fr_minmax(14rem,22rem)] md:items-end"><div><h2 className="text-sm font-semibold">Daily Product Lines</h2><p className="text-xs text-muted-foreground">Central Kitchen records Qty Sent. Outlet Staff confirms Received and records Wastage.</p></div><Field label="Find product"><Input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search name, code, or category" disabled={locked} /></Field></div>
      <div className="hidden border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium text-muted-foreground md:grid md:grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_10rem_minmax(12rem,1fr)] md:gap-2"><span>Product</span><span>Qty Sent</span><span>Received</span><span>Wastage</span><span>Reason</span><span>Remarks</span></div>
      <div className="divide-y">
        {products.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <DailyProductLine key={product.id} product={product} line={lineByProduct.get(product.id)} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
      </section>
    </CardContent></Card>
  </form>;
}

function DailyProductLine({ product, line, hiddenClass, locked, canEditQtySent, canEditOutletValues }: {
  product: Product;
  line?: Line;
  hiddenClass: string;
  locked: boolean;
  canEditQtySent: boolean;
  canEditOutletValues: boolean;
}) {
  const [qtySent, setQtySent] = useState(line ? String(line.qty_sent) : "");
  const [received, setReceived] = useState(line ? String(line.morning_received_qty) : "");
  const [wastage, setWastage] = useState(line ? String(line.wastage_qty) : "");
  const [reason, setReason] = useState(line?.wastage_reason ?? "");
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(line?.notes);

  return <div className={`${hiddenClass} grid grid-cols-3 gap-2 p-3 [&>div:first-child]:col-span-3 md:grid-cols-[minmax(11rem,1.4fr)_6rem_6rem_6rem_9rem_minmax(8rem,1fr)] md:[&>div:first-child]:col-span-1 md:items-end`}>
    <div><input type="hidden" name="line_product_id" value={product.id} /><p className="font-medium">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Qty Sent</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} qty sent`} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => setQtySent(event.target.value)} disabled={locked || !canEditQtySent} /></label>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Received</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} onChange={(event) => setReceived(event.target.value)} disabled={locked || !canEditOutletValues} /></label>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Wastage</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" value={wastage} onChange={(event) => setWastage(event.target.value)} disabled={locked || !canEditOutletValues} /></label>
    {showWastageDetails ? <>
      <label className="col-span-3 grid gap-1 text-xs md:col-span-1"><span className="md:sr-only">Wastage Reason</span><SelectNative aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason} onChange={(event) => setReason(event.target.value as OutletDailyWastageReason | "")} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}><option value="">Select reason</option>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
      <label className="col-span-3 grid gap-1 text-xs md:col-span-1"><span className="md:sr-only">Remarks</span><Input aria-label={`${product.product_name} remarks`} name="line_notes" defaultValue={line?.notes ?? ""} placeholder="Required for quantity exceptions" disabled={locked || !canEditOutletValues} /></label>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
