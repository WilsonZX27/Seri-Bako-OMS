"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { CalendarDays, ChevronDown, MapPin, MessageSquare, Search, WalletCards } from "lucide-react";

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
  [key: string]: unknown;
};
type DefaultLine = { morning_received_qty: number | null; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null; [key: string]: unknown };
const BALANCE_FIELD = "evening_" + "left" + "over_qty";
const isPackaging = (product: Product) => product.category.trim().toLowerCase() === "packaging";
const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];
const EMPTY_LINES: Line[] = [];
const EMPTY_DEFAULTS_BY_BRANCH: Record<string, Record<string, DefaultLine>> = {};

type SalesValues = { pos_total_sales?: number | null; sales_variance_reason?: string | null; breakdown?: Partial<Record<"duitnow" | "credit_card" | "voucher" | "grabfood" | "foodpanda", number>> };

  export function OutletDailyRecordForm({ formId, action, branches, products, lines = EMPTY_LINES, branchId, recordDate, notes, sales, defaultsByBranch = EMPTY_DEFAULTS_BY_BRANCH, validationError, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  notes?: string | null;
  sales?: SalesValues;
  defaultsByBranch?: Record<string, Record<string, DefaultLine>>;
  validationError?: string;
  locked?: boolean;
  canEditHeader?: boolean;
  canEditQtySent?: boolean;
  canEditOutletValues?: boolean;
}) {
  const [productSearch, setProductSearch] = useState("");
  const [fieldError, setFieldError] = useState("");
  const initialBranchId = branchId ?? (branches.length === 1 ? branches[0].id : "");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedRecordDate, setSelectedRecordDate] = useState(recordDate);
  const [setupOpen, setSetupOpen] = useState(!(initialBranchId && recordDate));
  const [, setTouchedProducts] = useState<Set<string>>(() => new Set());
  const lineByProduct = useMemo(() => new Map(lines.map((line) => [line.product_id, line])), [lines]);
  const selectedDefaults = useMemo(() => defaultsByBranch[selectedBranchId] ?? {}, [defaultsByBranch, selectedBranchId]);
  useEffect(() => {
    setTouchedProducts(new Set([...lineByProduct.keys(), ...Object.keys(selectedDefaults)]));
  }, [lineByProduct, selectedDefaults]);
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id));
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const wastageValidation = validationError?.toLowerCase().includes("wastage") === true && !validationError?.startsWith("Product line ");
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
    if (!validationError) return;
    const line = validationError.match(/^Product line (\d+): /);
    const label = validationError.replace(/^Product line \d+: /, "").split(" — ")[0];
    const names: Record<string, string> = { Branch: "branch_id", "Record Date": "record_date", "Qty Sent": "qty_sent", Received: "morning_received_qty", Wastage: "wastage_qty", "Wastage reason": "wastage_reason", Remarks: line ? "line_notes" : "notes" };
    const name = names[label];
    if (!name) return;
    setProductSearch("");
    setSetupOpen(true);
    const frame = requestAnimationFrame(() => {
      const targets = document.getElementById(formId)?.querySelectorAll<HTMLInputElement>(`[name="${name}"]:not([type="hidden"])`);
      const target = targets?.[line ? Number(line[1]) - 1 : 0];
      if (!target) return;
      target.setAttribute("aria-invalid", "true");
      target.scrollIntoView({ block: "center", behavior: "smooth" });
      target.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [validationError, formId]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sb:document-context", { detail: { branch: selectedBranch?.branch_name ?? null, date: selectedRecordDate } }));
  }, [selectedBranch?.branch_name, selectedRecordDate]);

  return <form id={formId} action={action} className="space-y-4" data-long-mobile-form noValidate onInputCapture={(event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) target.removeAttribute("aria-invalid");
  }} onSubmit={(event) => {
    const invalid = Array.from(event.currentTarget.elements).find((element) =>
      (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
      && !element.name.startsWith("sales_") && element.name !== "pos_total_sales" && !element.validity.valid,
    ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    if (!invalid) { setFieldError(""); return; }
    event.preventDefault();
    setProductSearch("");
    setSetupOpen(true);
    const label = invalid.getAttribute("aria-label") ?? invalid.closest("label")?.textContent?.trim() ?? invalid.name.replaceAll("_", " ");
    setFieldError(`${label}: ${invalid.validationMessage}`);
    invalid.setAttribute("aria-invalid", "true");
    requestAnimationFrame(() => { invalid.scrollIntoView({ block: "center", behavior: "smooth" }); invalid.focus({ preventScroll: true }); });
  }}>
      {fieldError ? <p role="alert" className="rounded border border-rose-500 p-3 text-sm text-rose-700">{fieldError}</p> : null}
      <details data-outlet-daily-setup open={setupOpen} onToggle={(event) => setSetupOpen(event.currentTarget.open)} className="group erp-surface overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="min-w-0"><span className="block">Record setup</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-normal text-muted-foreground"><span data-record-setup-location className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{selectedBranch?.branch_name ?? "Select location"}</span></span><span data-record-setup-date className="flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="tabular-nums">{selectedRecordDate || "Select date"}</span></span></span></span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t p-3 md:!grid md:grid-cols-2 md:border-0 md:p-4">
          <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" value={selectedBranchId} onChange={(event) => { const nextBranch = event.target.value; setSelectedBranchId(nextBranch); setTouchedProducts(new Set()); if (nextBranch && selectedRecordDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
          <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" value={selectedRecordDate} onChange={(event) => { const nextDate = event.target.value; setSelectedRecordDate(nextDate); if (selectedBranchId && nextDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} /></Field>
          <div className="col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} defaultValue={notes ?? ""} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
        </div>
      </details>

      <SalesReconciliation sales={sales} disabled={locked || !canEditOutletValues} />

      <section data-outlet-daily-lines className="erp-surface touch-pan-y overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2"><h2 className="text-sm font-semibold">Daily Product Lines</h2><label className="relative block w-full min-w-0 sm:ml-auto sm:w-64"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product" disabled={locked} /></label></div>
      <div className="divide-y">
        {([false, true] as const).map((packaging) => {
          const group = products.filter((product) => isPackaging(product) === packaging);
          if (!group.length) return null;
          return <div key={packaging ? "packaging" : "food"} data-outlet-daily-group={packaging ? "packaging" : "food"}>
            <div className="flex items-center justify-between gap-3 border-b bg-[var(--sb-surface-muted)] px-3 py-2"><div><h3 className="text-xs font-semibold">{packaging ? "Packaging usage" : "Kueh / food"}</h3><p className="text-[11px] text-muted-foreground">{packaging ? "Qty received · today usage · closing balance (editable)" : "Qty sent · received · wastage"}</p></div></div>
            <div className="grid grid-cols-3 gap-2 border-b bg-white px-3 py-2 text-[11px] font-medium text-muted-foreground md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))] xl:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))_minmax(7rem,9rem)_minmax(12rem,1.5fr)]"><span className="hidden md:block">Product</span>{packaging ? <><span>Qty sent</span><span>Qty received</span><span>Today usage</span><span className="hidden xl:col-span-2 xl:block">Balance</span></> : <><span>Qty Sent</span><span>Received</span><span>Wastage</span><span className="hidden xl:col-span-2 xl:block">Wastage details</span></>}</div>
            {group.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
              return <DailyProductLine key={product.id} product={product} isPackaging={packaging} line={lineByProduct.get(product.id)} defaultLine={selectedDefaults[product.id]} validationHint={validationProductId === product.id ? "Add a line remark or reduce wastage below Received." : undefined} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} onTouched={() => setTouchedProducts((current) => new Set(current).add(product.id))} />;
            })}
          </div>;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Create or activate sellable products before recording outlet quantities." /> : null}
      </div>
      </section>
  </form>;
}

const salesChannelLabels = { duitnow: "DuitNow", credit_card: "Credit Card", voucher: "Voucher", grabfood: "GrabFood", foodpanda: "FoodPanda" } as const;
function SalesReconciliation({ sales, disabled }: { sales?: SalesValues; disabled: boolean }) {
  const [posTotal, setPosTotal] = useState(String(sales?.pos_total_sales ?? ""));
  const [amounts, setAmounts] = useState(() => Object.fromEntries(Object.keys(salesChannelLabels).map((key) => [key, String(sales?.breakdown?.[key as keyof typeof salesChannelLabels] ?? 0)])) as Record<keyof typeof salesChannelLabels, string>);
  const hasPosTotal = posTotal.trim() !== "";
  const channelTotal = Object.values(amounts).reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0) / 100;
  const difference = hasPosTotal ? (Math.round(Number(posTotal) * 100) - Math.round(channelTotal * 100)) / 100 : 0;
  return <section className="erp-surface overflow-hidden" aria-labelledby="sales-reconciliation-title">
    <div className="flex items-center gap-2 border-b px-3 py-3"><WalletCards className="h-4 w-4 text-[var(--sb-green-700)]" aria-hidden="true" /><h2 id="sales-reconciliation-title" className="text-sm font-semibold">Sales reconciliation</h2></div>
    <div className="grid grid-cols-2 gap-2 p-3 sm:gap-3 lg:grid-cols-3"><Field label="POS Total Sales (RM)"><Input name="pos_total_sales" type="number" inputMode="decimal" min="0" step="0.01" value={posTotal} onChange={(event)=>setPosTotal(event.target.value)} disabled={disabled} /></Field>{(Object.keys(salesChannelLabels) as Array<keyof typeof salesChannelLabels>).map((channel)=><Field key={channel} label={`${salesChannelLabels[channel]} (RM)`}><Input name={`sales_${channel}`} type="number" inputMode="decimal" min="0" step="0.01" value={amounts[channel]} onChange={(event)=>setAmounts((current)=>({...current,[channel]:event.target.value}))} disabled={disabled} /></Field>)}</div>
    <div className="border-t p-3">
      <dl className="grid grid-cols-2 gap-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs" aria-live="polite"><div><dt className="text-muted-foreground">Channel total</dt><dd className="font-semibold tabular-nums">RM {channelTotal.toFixed(2)}</dd></div><div><dt className="text-muted-foreground">Difference</dt><dd className={`font-semibold tabular-nums ${difference ? "text-warning" : "text-success"}`}>{hasPosTotal ? `RM ${difference.toFixed(2)}` : "Sales pending"}</dd></div></dl>
      <div hidden={!hasPosTotal || difference === 0} className="mt-3"><Field label="Difference reason (optional)"><Input name="sales_variance_reason" defaultValue={sales?.sales_variance_reason ?? ""} disabled={disabled} placeholder="Explain settlement or entry difference" /></Field></div>
    </div>
  </section>;
}

function DailyProductLine({ product, isPackaging: packaging, line, defaultLine, validationHint, hiddenClass, locked, canEditQtySent, canEditOutletValues, onTouched }: {
  product: Product;
  isPackaging: boolean;
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
  const [balance, setBalance] = useState(source?.[BALANCE_FIELD] == null ? "" : String(source[BALANCE_FIELD]));
  const [balanceManual, setBalanceManual] = useState(source?.[BALANCE_FIELD] != null);
  const [reason, setReason] = useState(source?.wastage_reason ?? "");
  const [remark, setRemark] = useState(source?.notes ?? "");
  const [remarkOpen, setRemarkOpen] = useState(Boolean(source?.notes) || Boolean(validationHint));
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(remark) || Boolean(validationHint);
  const shouldShowWastageDetails = !packaging && showWastageDetails;

  useEffect(() => {
    if (!packaging || balanceManual) return;
    const receivedValue = Number(received || 0);
    const usageValue = Number(wastage || 0);
    setBalance(received || wastage ? String(Math.max(receivedValue - usageValue, 0)) : "");
  }, [balanceManual, packaging, received, wastage]);

  return <div className={`${hiddenClass} grid grid-cols-3 items-end gap-2 p-3 touch-pan-y md:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))] xl:grid-cols-[minmax(12rem,1fr)_repeat(3,minmax(4.5rem,6rem))_minmax(7rem,9rem)_minmax(12rem,1.5fr)]`}>
    <div className="col-span-3 min-w-0 md:col-span-1"><input type="hidden" name="line_product_id" value={product.id} /><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>
    <label className="min-w-0"><span className="sr-only">Qty Sent</span><Input className="min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} qty sent`} title={!canEditQtySent ? "Only Kitchen and authorised company-wide staff can enter Qty Sent." : undefined} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); onTouched(); }} disabled={locked || !canEditQtySent} /></label>
    <label className="min-w-0"><span className="sr-only">Received</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!received && Number(qtySent || 0) > 0 ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!received && Number(qtySent || 0) > 0 ? "true" : undefined} aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} placeholder={receivedIsKnown ? undefined : "Not verified"} title={receivedIsKnown ? undefined : "Received quantity has not been verified"} data-received-unverified={!receivedIsKnown ? "true" : undefined} onChange={(event) => { setReceived(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    <label className="min-w-0"><span className="sr-only">{packaging ? "Today usage" : "Wastage"}</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!wastage && received !== "" ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!wastage && received !== "" ? "true" : undefined} aria-label={`${product.product_name} ${packaging ? "today usage" : "wastage"}`} name="wastage_qty" type="number" min="0" step="0.01" value={wastage} onChange={(event) => { const next = event.target.value; setWastage(next); if (Number(next || 0) > 0 && !reason) setReason("unsold"); if (Number(next || 0) <= 0) { setReason(""); setRemark(""); setRemarkOpen(false); } onTouched(); }} disabled={locked || !canEditOutletValues} /></label>
    {packaging ? <label className="col-span-3 min-w-0 md:col-start-2 md:col-span-3 xl:col-start-5 xl:col-span-2"><span className="sr-only">{product.product_name} closing balance</span><Input className="min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} closing balance`} title="Auto = received minus today usage; edit when the physical balance differs" name={BALANCE_FIELD} type="number" min="0" step="0.01" value={balance} placeholder="Auto" onChange={(event) => { setBalanceManual(true); setBalance(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} /></label> : <input type="hidden" name={BALANCE_FIELD} value="0" />}
    {shouldShowWastageDetails ? <>
      <div className="col-span-full grid min-w-0 grid-cols-[7.5rem_minmax(0,1fr)] items-end gap-2 md:col-start-2 md:col-end-5 xl:contents">
        <label className="min-w-0"><span className="sr-only">Wastage Reason</span><SelectNative className="w-full text-xs" aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason || "unsold"} onChange={(event) => { setReason(event.target.value as OutletDailyWastageReason); onTouched(); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
        <div className="min-w-0">{remarkOpen ? <><Input autoFocus={Boolean(validationHint)} data-validation-anchor={validationHint ? product.id : undefined} aria-invalid={validationHint ? "true" : undefined} className={`w-full ${validationHint ? "border-rose-500 ring-2 ring-rose-200" : ""}`} aria-label={`${product.product_name} remarks`} name="line_notes" value={remark} placeholder="Remark" onChange={(event) => { setRemark(event.target.value); onTouched(); }} disabled={locked || !canEditOutletValues} />{validationHint ? <p className="mt-1 text-[11px] font-medium text-rose-700">{validationHint}</p> : null}</> : <><input type="hidden" name="line_notes" value={remark} /><button type="button" className="inline-flex h-[var(--sb-control-height)] w-[var(--sb-control-height)] items-center justify-center rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-white text-muted-foreground hover:text-foreground" onClick={() => setRemarkOpen(true)} aria-label={`Add remarks for ${product.product_name}`} aria-expanded="false" disabled={locked || !canEditOutletValues}><MessageSquare className="h-4 w-4" aria-hidden="true" /></button></>}</div>
      </div>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
