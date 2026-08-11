"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { ChevronDown, MessageSquare, Search } from "lucide-react";

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
  const [selectedRecordDate, setSelectedRecordDate] = useState(recordDate);
  const [setupOpen, setSetupOpen] = useState(!(initialBranchId && recordDate));
  const [touchedProducts, setTouchedProducts] = useState<Set<string>>(() => new Set());
  const lineByProduct = useMemo(() => new Map(lines.map((line) => [line.product_id, line])), [lines]);
  const selectedDefaults = useMemo(() => defaultsByBranch[selectedBranchId] ?? {}, [defaultsByBranch, selectedBranchId]);
  const completedCount = useMemo(() => new Set([...lineByProduct.keys(), ...Object.keys(selectedDefaults), ...touchedProducts]).size, [lineByProduct, selectedDefaults, touchedProducts]);
  const remainingCount = Math.max(products.length - completedCount, 0);
  useEffect(() => {
    setTouchedProducts(new Set([...lineByProduct.keys(), ...Object.keys(selectedDefaults)]));
  }, [lineByProduct, selectedDefaults]);
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id));
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sb:document-context", { detail: { branch: selectedBranch?.branch_name ?? null, date: selectedRecordDate } }));
  }, [selectedBranch?.branch_name, selectedRecordDate]);

  return <form id={formId} action={action} className="space-y-4">
      <details data-outlet-daily-setup open={setupOpen} onToggle={(event) => setSetupOpen(event.currentTarget.open)} className="group erp-surface overflow-hidden">
        <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 px-3 text-sm font-semibold [&::-webkit-details-marker]:hidden"><span>Record setup</span><span className="ml-auto hidden min-w-0 truncate text-right text-xs font-normal text-muted-foreground md:block">{selectedBranch?.branch_name ?? "Choose branch"} · {selectedRecordDate}</span><ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" /></summary>
        <div className="grid gap-4 border-t p-3 md:!grid md:grid-cols-2 md:border-0 md:p-4">
          <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" value={selectedBranchId} onChange={(event) => { const nextBranch = event.target.value; setSelectedBranchId(nextBranch); setTouchedProducts(new Set()); if (nextBranch && selectedRecordDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
          <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" value={selectedRecordDate} onChange={(event) => { const nextDate = event.target.value; setSelectedRecordDate(nextDate); if (selectedBranchId && nextDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} /></Field>
          <div className="md:col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
        </div>
      </details>

      <section data-outlet-daily-lines className="erp-surface overflow-hidden">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[minmax(10rem,auto)_minmax(16rem,1fr)] md:items-center"><div className="flex min-w-0 items-baseline gap-2"><h2 className="truncate text-sm font-semibold">Daily Product Lines</h2><span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{remainingCount === 0 ? "All ready" : `${remainingCount} remaining`}</span></div><label className="relative block min-w-0"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product" disabled={locked} /></label></div>
      <div className="grid grid-cols-3 gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium text-muted-foreground md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))]"><span className="hidden md:block">Product</span><span>Qty Sent</span><span>Received</span><span>Wastage</span></div>
      <div className="divide-y">
        {products.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <DailyProductLine key={product.id} product={product} line={lineByProduct.get(product.id)} defaultLine={selectedDefaults[product.id]} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} onTouched={() => setTouchedProducts((current) => new Set(current).add(product.id))} />;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
      </section>
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
  const [remark, setRemark] = useState(source?.notes ?? "");
  const [remarkOpen, setRemarkOpen] = useState(Boolean(source?.notes));
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(source?.notes);

  return <div className={`${hiddenClass} grid grid-cols-3 items-end gap-2 p-3 md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))]`}>
    <div className="col-span-3 min-w-0 md:col-span-1"><input type="hidden" name="line_product_id" value={product.id} /><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
    <label className="min-w-0"><span className="sr-only">Qty Sent</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} qty sent`} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); onTouched(); }} disabled={locked || !canEditQtySent} /></label>
    <label className="min-w-0"><span className="sr-only">Received</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} onChange={(event) => { setReceived(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    <label className="min-w-0"><span className="sr-only">Wastage</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" value={wastage} onChange={(event) => { const next = event.target.value; setWastage(next); if (Number(next || 0) > 0 && !reason) setReason("unsold"); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    {showWastageDetails ? <>
      <div className="col-span-full grid grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2">
        <label className="grid min-w-0 gap-1 text-xs"><span>Wastage Reason</span><SelectNative className="h-10" aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason || "unsold"} onChange={(event) => { setReason(event.target.value as OutletDailyWastageReason); onTouched(); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
        <div className="min-w-0">{remarkOpen ? <Input autoFocus className="h-10" aria-label={`${product.product_name} remarks`} name="line_notes" value={remark} placeholder="Remark" onChange={(event) => { setRemark(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /> : <><input type="hidden" name="line_notes" value={remark} /><button type="button" className="inline-flex h-10 w-11 items-center justify-center rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-white text-muted-foreground hover:text-foreground" onClick={() => setRemarkOpen(true)} aria-label={`Add remarks for ${product.product_name}`} aria-expanded="false" disabled={locked || !canEditOutletValues}><MessageSquare className="h-4 w-4" aria-hidden="true" /></button></>}</div>
      </div>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
