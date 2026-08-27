"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { CalendarDays, ChevronDown, Info, MapPin, MessageSquare, Search } from "lucide-react";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { id: string; product_code: string; product_name: string; category: string; selling_unit: string; display_order?: number };
type Line = {
  product_id: string;
  qty_sent: number;
  qty_sent_source?: "unavailable" | "legacy_unverified" | "outlet_received_estimate" | "authorized_draft" | "authorized_confirmed";
  morning_received_qty: number | null;
  morning_received_provided?: boolean;
  wastage_qty: number;
  wastage_reason: OutletDailyWastageReason | null;
  notes: string | null;
};
type DefaultLine = { morning_received_qty: number | null; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null };
const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];
const EMPTY_LINES: Line[] = [];
const EMPTY_DEFAULTS_BY_BRANCH: Record<string, Record<string, DefaultLine>> = {};

  export function OutletDailyRecordForm({ formId, action, branches, products, lines = EMPTY_LINES, branchId, recordDate, notes, defaultsByBranch = EMPTY_DEFAULTS_BY_BRANCH, validationError, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  notes?: string | null;
  defaultsByBranch?: Record<string, Record<string, DefaultLine>>;
  validationError?: string;
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
  const wastageValidation = validationError?.toLowerCase().includes("wastage") === true;
  const validationProductCode = validationError?.match(/\(([A-Z0-9_-]+)\)/i)?.[1]?.toLowerCase();
  const validationProductId = wastageValidation
    ? products.find((product) => validationProductCode && product.product_code.toLowerCase() === validationProductCode)?.id
      ?? products.find((product) => {
        const source = lineByProduct.get(product.id) ?? selectedDefaults[product.id];
        return Number(source?.wastage_qty ?? 0) > Number(source?.morning_received_qty ?? 0);
      })?.id ?? products[0]?.id
    : null;

  useEffect(() => {
    if (!validationProductId) return;
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(`[data-validation-anchor="${validationProductId}"]`) ?? document.querySelector<HTMLElement>('input[name="wastage_qty"]');
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [validationProductId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sb:document-context", { detail: { branch: selectedBranch?.branch_name ?? null, date: selectedRecordDate } }));
  }, [selectedBranch?.branch_name, selectedRecordDate]);

  return <form id={formId} action={action} className="space-y-4" data-long-mobile-form>
      <details data-outlet-daily-setup open={setupOpen} onToggle={(event) => setSetupOpen(event.currentTarget.open)} className="group erp-surface overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="min-w-0"><span className="block">Record setup</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-normal text-muted-foreground"><span data-record-setup-location className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{selectedBranch?.branch_name ?? "Select location"}</span></span><span data-record-setup-date className="flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="tabular-nums">{selectedRecordDate || "Select date"}</span></span></span></span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid gap-4 border-t p-3 md:!grid md:grid-cols-2 md:border-0 md:p-4">
          <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" value={selectedBranchId} onChange={(event) => { const nextBranch = event.target.value; setSelectedBranchId(nextBranch); setTouchedProducts(new Set()); if (nextBranch && selectedRecordDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
          <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" value={selectedRecordDate} onChange={(event) => { const nextDate = event.target.value; setSelectedRecordDate(nextDate); if (selectedBranchId && nextDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} /></Field>
          <div className="md:col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
        </div>
      </details>

      <section data-outlet-daily-lines className="erp-surface touch-pan-y overflow-hidden">
      <div className="grid gap-2 border-b px-3 py-2 md:grid-cols-[minmax(10rem,auto)_minmax(16rem,1fr)] md:items-center"><div className="flex min-w-0 items-baseline gap-2"><h2 className="truncate text-sm font-semibold">Daily Product Lines</h2><span className="ml-auto shrink-0 text-[11px] tabular-nums text-muted-foreground">{remainingCount === 0 ? "All ready" : `${remainingCount} remaining`}</span></div><label className="relative block min-w-0"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product" disabled={locked} /></label></div>
      <div className="grid grid-cols-3 gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-xs font-medium text-muted-foreground md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))] xl:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))_minmax(7rem,9rem)_minmax(12rem,1.5fr)]"><span className="hidden md:block">Product</span><span>Qty Sent</span><span>Received</span><span>Wastage</span><span className="hidden xl:col-span-2 xl:block">Wastage details</span>{!canEditQtySent && !locked ? <p id="qty-sent-ownership-note" data-qty-sent-ownership className="col-span-3 flex items-start gap-1.5 pt-1 text-[11px] font-normal leading-4 text-muted-foreground md:col-span-full"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span><span className="font-medium text-foreground">Qty Sent is Kitchen-owned.</span> Only Kitchen and authorised company-wide staff can enter it. Outlet staff record Received and Wastage.</span></p> : null}</div>
      <div className="divide-y">
        {products.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
          return <DailyProductLine key={product.id} product={product} line={lineByProduct.get(product.id)} defaultLine={selectedDefaults[product.id]} validationHint={validationProductId === product.id ? "Add a line remark or reduce wastage below Received." : undefined} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} onTouched={() => setTouchedProducts((current) => new Set(current).add(product.id))} />;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
      </section>
  </form>;
}

function DailyProductLine({ product, line, defaultLine, validationHint, hiddenClass, locked, canEditQtySent, canEditOutletValues, onTouched }: {
  product: Product;
  line?: Line;
  defaultLine?: DefaultLine;
  validationHint?: string;
  hiddenClass: string;
  locked: boolean;
  canEditQtySent: boolean;
  canEditOutletValues: boolean;
  onTouched: () => void;
}) {
  const source = line ?? defaultLine;
  const qtySentIsKnown = line && !["unavailable", "outlet_received_estimate"].includes(line.qty_sent_source ?? "legacy_unverified");
  const [qtySent, setQtySent] = useState(qtySentIsKnown ? String(line.qty_sent) : "");
  // A persisted zero is not evidence that the outlet entered zero. The
  // detail query supplies this explicit provenance bit for existing lines;
  // defaults are already normalised to null when their provenance is absent.
  // Keep unverified values blank so the form cannot visually manufacture a
  // receipt while still allowing an authorised user to enter an explicit 0.
  const receivedIsKnown = line ? line.morning_received_provided === true : source?.morning_received_qty != null;
  const [received, setReceived] = useState(receivedIsKnown && source?.morning_received_qty != null ? String(source.morning_received_qty) : "");
  const [wastage, setWastage] = useState(source ? String(source.wastage_qty) : "");
  const [reason, setReason] = useState(source?.wastage_reason ?? "");
  const [remark, setRemark] = useState(source?.notes ?? "");
  const [remarkOpen, setRemarkOpen] = useState(Boolean(source?.notes) || Boolean(validationHint));
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(remark) || Boolean(validationHint);

  return <div className={`${hiddenClass} grid grid-cols-3 items-end gap-2 p-3 touch-pan-y md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))] xl:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))_minmax(7rem,9rem)_minmax(12rem,1.5fr)]`}>
    <div className="col-span-3 min-w-0 md:col-span-1"><input type="hidden" name="line_product_id" value={product.id} /><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
    <label className="min-w-0"><span className="sr-only">Qty Sent</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} qty sent`} aria-describedby={!canEditQtySent ? "qty-sent-ownership-note" : undefined} title={!canEditQtySent ? "Only Kitchen and authorised company-wide staff can enter Qty Sent." : undefined} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); onTouched(); }} disabled={locked || !canEditQtySent} /></label>
    <label className="min-w-0"><span className="sr-only">Received</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} placeholder={receivedIsKnown ? undefined : "Not verified"} title={receivedIsKnown ? undefined : "Received quantity has not been verified"} data-received-unverified={!receivedIsKnown ? "true" : undefined} onChange={(event) => { setReceived(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    <label className="min-w-0"><span className="sr-only">Wastage</span><Input className="h-10 min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} wastage`} name="wastage_qty" type="number" min="0" step="0.01" value={wastage} onChange={(event) => { const next = event.target.value; setWastage(next); if (Number(next || 0) > 0 && !reason) setReason("unsold"); if (Number(next || 0) <= 0) { setReason(""); setRemark(""); setRemarkOpen(false); } onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    {showWastageDetails ? <>
      <div className="col-span-full grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-2 xl:contents">
        <label className="min-w-0"><span className="sr-only">Wastage Reason</span><SelectNative className="h-10 w-full text-xs" aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason || "unsold"} onChange={(event) => { setReason(event.target.value as OutletDailyWastageReason); onTouched(); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
        <div className="min-w-0">{remarkOpen ? <><Input autoFocus={Boolean(validationHint)} data-validation-anchor={validationHint ? product.id : undefined} aria-invalid={validationHint ? "true" : undefined} className={`h-10 w-full ${validationHint ? "border-rose-500 ring-2 ring-rose-200" : ""}`} aria-label={`${product.product_name} remarks`} name="line_notes" value={remark} placeholder="Remark" onChange={(event) => { setRemark(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} />{validationHint ? <p className="mt-1 text-[11px] font-medium text-rose-700">{validationHint}</p> : null}</> : <><input type="hidden" name="line_notes" value={remark} /><button type="button" className="inline-flex h-10 w-11 items-center justify-center rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-white text-muted-foreground hover:text-foreground" onClick={() => setRemarkOpen(true)} aria-label={`Add remarks for ${product.product_name}`} aria-expanded="false" disabled={locked || !canEditOutletValues}><MessageSquare className="h-4 w-4" aria-hidden="true" /></button></>}</div>
      </div>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
