"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { Search } from "lucide-react";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { id: string; product_code: string; product_name: string; category: string; selling_unit: string; display_order?: number };
type Line = { product_id: string; qty_sent: number; morning_received_qty: number; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null };
type DefaultLine = { qty_sent: number; morning_received_qty: number; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null };
const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];
const EMPTY_LINES: Line[] = [];
const EMPTY_DEFAULTS_BY_BRANCH: Record<string, Record<string, DefaultLine>> = {};

export function OutletDailyRecordForm({ formId, action, branches, products, lines = EMPTY_LINES, branchId, recordDate, notes, defaultsByBranch = EMPTY_DEFAULTS_BY_BRANCH, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  notes?: string | null;
  defaultsByBranch?: Record<string, Record<string, DefaultLine>>;
  locked?: boolean;
  canEditHeader?: boolean;
  canEditQtySent?: boolean;
  canEditOutletValues?: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const initialBranchId = branchId ?? (branches.length === 1 ? branches[0].id : "");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [touchedProducts, setTouchedProducts] = useState<Set<string>>(() => new Set());
  const lineByProduct = useMemo(() => new Map(lines.map((line) => [line.product_id, line])), [lines]);
  const selectedDefaults = useMemo(() => defaultsByBranch[selectedBranchId] ?? {}, [defaultsByBranch, selectedBranchId]);
  const defaultCount = useMemo(() => Object.keys(selectedDefaults).length, [selectedDefaults]);
  const completedCount = useMemo(() => new Set([...lineByProduct.keys(), ...Object.keys(selectedDefaults), ...touchedProducts]).size, [lineByProduct, selectedDefaults, touchedProducts]);
  const remainingCount = Math.max(products.length - completedCount, 0);
  useEffect(() => {
    setTouchedProducts(new Set([...lineByProduct.keys(), ...Object.keys(selectedDefaults)]));
  }, [lineByProduct, selectedDefaults]);
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id));

  return <form id={formId} action={action} className="space-y-4">
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0 md:p-4">
      <section data-outlet-daily-setup className="erp-surface grid gap-4 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0 md:grid-cols-2">
      <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" value={selectedBranchId} onChange={(event) => { setSelectedBranchId(event.target.value); setTouchedProducts(new Set()); }} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
      <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" defaultValue={recordDate} required disabled={locked || !canEditHeader} /></Field>
      <div className="md:col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
      </section>
    </CardContent></Card>

    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white"><CardContent className="p-0">
      <section data-outlet-daily-lines className="erp-surface overflow-hidden md:rounded-none md:border-0">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[minmax(0,1fr)_minmax(14rem,22rem)] md:items-center"><div><div className="flex items-baseline justify-between gap-3"><h2 className="text-sm font-semibold">Daily Product Lines</h2><span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{remainingCount === 0 ? "All ready" : `${remainingCount} remaining`}</span></div><p className="text-xs text-muted-foreground">Review the prefilled values, then adjust only what changed today.</p>{defaultCount ? <p className="mt-1 text-[11px] text-[var(--sb-green-800)]">{defaultCount} lines prefilled from the latest matching weekday.</p> : null}</div><label className="relative block"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product by name, code, or category" disabled={locked} /></label></div>
      <div className="hidden border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium text-muted-foreground xl:grid xl:grid-cols-[minmax(12rem,1.4fr)_7rem_7rem_7rem_10rem_minmax(12rem,1fr)] xl:gap-2"><span>Product</span><span>Qty Sent</span><span>Received</span><span>Wastage</span><span>Reason</span><span>Remarks</span></div>
      <div className="divide-y">
        {products.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <DailyProductLine key={product.id} product={product} line={lineByProduct.get(product.id)} defaultLine={selectedDefaults[product.id]} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} onTouched={() => setTouchedProducts((current) => new Set(current).add(product.id))} />;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
      </section>
    </CardContent></Card>
  </form>;
}

function DailyProductLine({ product, line, defaultLine, hiddenClass, locked, canEditQtySent, canEditOutletValues, onTouched }: {
  product: Product;
  line?: Line;
  defaultLine?: DefaultLine;
  hiddenClass: string;
  locked: boolean;
  canEditQtySent: boolean;
  canEditOutletValues: boolean;
  onTouched: () => void;
}) {
  const source = line ?? defaultLine;
  const [qtySent, setQtySent] = useState(source ? String(source.qty_sent) : "");
  const [received, setReceived] = useState(source ? String(source.morning_received_qty) : "");
  const [wastage, setWastage] = useState(source ? String(source.wastage_qty) : "");
  const [reason, setReason] = useState(source?.wastage_reason ?? "");
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(source?.notes);

  return <div className={`${hiddenClass} grid grid-cols-3 gap-2 p-3 [&>div:first-child]:col-span-3 xl:grid-cols-[minmax(12rem,1.4fr)_6rem_6rem_6rem_9rem_minmax(8rem,1fr)] xl:[&>div:first-child]:col-span-1 xl:items-end`}>
    <div className="min-w-0"><input type="hidden" name="line_product_id" value={product.id} /><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Qty Sent</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} qty sent`} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); onTouched(); }} disabled={locked || !canEditQtySent} /></label>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Received</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} onChange={(event) => { setReceived(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    <label className="grid min-w-0 gap-1 text-xs"><span className="truncate md:sr-only">Wastage</span><Input className="h-10 min-w-0 px-2 text-center" aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" value={wastage} onChange={(event) => { setWastage(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    {showWastageDetails ? <>
      <label className="col-span-3 grid gap-1 text-xs xl:col-span-1"><span className="xl:sr-only">Wastage Reason</span><SelectNative aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason} onChange={(event) => { setReason(event.target.value as OutletDailyWastageReason | ""); onTouched(); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}><option value="">Select reason</option>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
      <label className="col-span-3 grid gap-1 text-xs xl:col-span-1"><span className="xl:sr-only">Remarks</span><Input aria-label={`${product.product_name} remarks`} name="line_notes" defaultValue={source?.notes ?? ""} placeholder="Required for quantity exceptions" onChange={onTouched} disabled={locked || !canEditOutletValues} /></label>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
