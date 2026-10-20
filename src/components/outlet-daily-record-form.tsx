"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { CalendarDays, ChevronDown, MapPin, MessageSquare, Search, WalletCards } from "lucide-react";

import { salesChannelLabels, cardChannels, otherChannels, type SalesChannel } from "@/lib/outlet-sales-channels";

import { dailyTracking, dailyTrackingLabels, type DailyTracking } from "@/lib/daily-product-tracking";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { id: string; product_code: string; product_name: string; category: string; daily_tracking?: string | null; selling_unit: string; display_order?: number };
type Line = {
  product_id: string;
  qty_sent: number;
  qty_sent_source?: "unavailable" | "legacy_unverified" | "outlet_received_estimate" | "authorized_draft" | "authorized_confirmed";
  morning_received_qty: number | null;
  morning_received_provided?: boolean;
  do_managed?: boolean;
  wastage_provided?: boolean;
  stockout?: boolean;
  stockout_time?: string | null;
  wastage_qty: number;
  wastage_reason: OutletDailyWastageReason | null;
  notes: string | null;
  [key: string]: unknown;
};
type DefaultLine = { morning_received_qty: number | null; wastage_qty: number; wastage_reason: OutletDailyWastageReason | null; notes: string | null; [key: string]: unknown };
const BALANCE_FIELD = "evening_" + "left" + "over_qty";

const reasons: OutletDailyWastageReason[] = ["unsold", "damaged", "expired", "quality_issue", "staff_meal", "other"];
const EMPTY_LINES: Line[] = [];

type SalesValues = { pos_total_sales?: number | null; sales_variance_reason?: string | null; breakdown?: Partial<Record<SalesChannel, number>> };

  export function OutletDailyRecordForm({ formId, action, branches, products, lines = EMPTY_LINES, branchId, recordDate, notes, sales, validationError: serverValidationError, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void | { error: string }>;
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
  const [result, submitRecord] = useActionState(async (_previous: { error: string; values: Array<[string, string]> } | null, data: FormData) => {
    const response = await action(data);
    return response?.error ? { error: response.error, values: Array.from(data.entries()).map(([name, value]) => [name, String(value)] as [string, string]) } : null;
  }, null);
  const validationError = result?.error ?? serverValidationError;
  // React resets uncontrolled inputs when an action resolves, even on a business
  // error. Keep header and sales text controlled, like the product-line fields.
  const [recordNotes, setRecordNotes] = useState(notes ?? "");
  useEffect(() => {
    if (!result) return;
    document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));
    // React resets native selects after an action resolves, including business
    // failures. Restore the submitted selection after that reset has completed.
    const frame = requestAnimationFrame(() => {
      const offsets = new Map<string, number>();
      document.getElementById(formId)?.querySelectorAll<HTMLSelectElement>("select[name]").forEach((select) => {
        const values = result.values.filter(([name]) => name === select.name);
        const offset = offsets.get(select.name) ?? 0;
        offsets.set(select.name, offset + 1);
        if (values[offset]) select.value = values[offset][1];
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [result, formId]);
  const [productSearch, setProductSearch] = useState("");
  const [fieldError, setFieldError] = useState("");
  const initialBranchId = branchId ?? (branches.length === 1 ? branches[0].id : "");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedRecordDate, setSelectedRecordDate] = useState(recordDate);
  const [setupOpen, setSetupOpen] = useState(!(initialBranchId && recordDate));
  const lineByProduct = useMemo(() => new Map(lines.map((line) => [line.product_id, line])), [lines]);
  const normalizedSearch = productSearch.trim().toLowerCase();
  const matchingProductIds = useMemo(() => new Set(products.filter((product) => `${product.product_code} ${product.product_name} ${product.category}`.toLowerCase().includes(normalizedSearch)).map((product) => product.id)), [products, normalizedSearch]);
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId);
  const wastageValidation = validationError?.toLowerCase().includes("wastage") === true && !validationError?.startsWith("Product line ");
  const validationProductCode = validationError?.match(/\(([A-Z0-9_-]+)\)/i)?.[1]?.toLowerCase();
  const validationProductId = wastageValidation
    ? products.find((product) => validationProductCode && product.product_code.toLowerCase() === validationProductCode)?.id
      ?? products[0]?.id
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
    const missingReceipt = validationError.startsWith("Received must be independently confirmed");
    const name = missingReceipt ? "morning_received_qty" : names[label];
    if (!name) return;
    setProductSearch("");
    setSetupOpen(true);
    const frame = requestAnimationFrame(() => {
      const targets = document.getElementById(formId)?.querySelectorAll<HTMLInputElement>(`[name="${name}"]:not([type="hidden"])`);
      const target = missingReceipt ? Array.from(targets ?? []).find((input) => !input.disabled && input.value.trim() === "") : targets?.[line ? Number(line[1]) - 1 : 0];
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

  return <form id={formId} action={submitRecord} className="space-y-4" data-long-mobile-form noValidate onInputCapture={(event) => {
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement || target instanceof HTMLTextAreaElement) target.removeAttribute("aria-invalid");
  }} onSubmit={(event) => {
    // A new attempt supersedes the previous save receipt without remounting inputs.
    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has("success")) {
      currentUrl.searchParams.delete("success");
      window.history.replaceState(null, "", `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`);
    }
    const invalid = Array.from(event.currentTarget.elements).find((element) =>
      (element instanceof HTMLInputElement || element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement)
      && !element.name.startsWith("sales_") && element.name !== "pos_total_sales" && !element.validity.valid,
    ) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | undefined;
    if (!invalid) { setFieldError(""); return; }
    event.preventDefault();
    document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));
    setProductSearch("");
    setSetupOpen(true);
    const label = invalid.getAttribute("aria-label") ?? invalid.closest("label")?.textContent?.trim() ?? invalid.name.replaceAll("_", " ");
    setFieldError(`${label}: ${invalid.validationMessage}`);
    invalid.setAttribute("aria-invalid", "true");
    requestAnimationFrame(() => { invalid.scrollIntoView({ block: "center", behavior: "smooth" }); invalid.focus({ preventScroll: true }); });
  }}>
      {result?.error ? <p role="alert" className="rounded border border-rose-500 p-3 text-sm text-rose-700">{result.error}</p> : null}
      {fieldError ? <p role="alert" className="rounded border border-rose-500 p-3 text-sm text-rose-700">{fieldError}</p> : null}
      <details data-outlet-daily-setup open={setupOpen} onToggle={(event) => setSetupOpen(event.currentTarget.open)} className="group erp-surface overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="min-w-0"><span className="block">Record setup</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-normal text-muted-foreground"><span data-record-setup-location className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{selectedBranch?.branch_name ?? "Select location"}</span></span><span data-record-setup-date className="flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="tabular-nums">{selectedRecordDate || "Select date"}</span></span></span></span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t p-3 md:!grid md:grid-cols-2 md:border-0 md:p-4">
          <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectNative name="branch_id" value={selectedBranchId} onChange={(event) => { const nextBranch = event.target.value; setSelectedBranchId(nextBranch); if (nextBranch && selectedRecordDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader}>{branches.length > 1 && !branchId ? <option value="">Select branch</option> : null}{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name} ({branch.branch_code})</option>)}</SelectNative></Field>
          <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" value={selectedRecordDate} onChange={(event) => { const nextDate = event.target.value; setSelectedRecordDate(nextDate); if (selectedBranchId && nextDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} /></Field>
          <div className="col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} value={recordNotes} onChange={(event) => setRecordNotes(event.target.value)} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
        </div>
      </details>

      <SalesReconciliation sales={sales} disabled={locked || !canEditOutletValues} />

      <section data-outlet-daily-lines className="erp-surface touch-pan-y overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2"><h2 className="text-sm font-semibold">Daily Product Lines</h2><label className="relative block w-full min-w-0 sm:ml-auto sm:w-64"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product" disabled={locked} /></label></div>
      <div className="divide-y">
        {(Object.keys(dailyTrackingLabels) as DailyTracking[]).map((tracking) => {
          const packaging = tracking === "packaging";
          const group = products.filter((product) => dailyTracking(product, lineByProduct.get(product.id)?.daily_tracking) === tracking);
          if (!group.length) return null;
          return <div key={tracking} data-outlet-daily-group={tracking}>
            <div className="flex items-center justify-between gap-3 border-b bg-[var(--sb-surface-muted)] px-3 py-2"><div><h3 className="text-xs font-semibold">{dailyTrackingLabels[tracking]}</h3><p className="text-[11px] text-muted-foreground">{tracking === "food_daily" ? "Qty sent · qty receive · wastage" : tracking === "beverage" ? "Qty sent · qty receive · qty sold · balance" : tracking === "packaging" ? "Qty sent · qty receive · usage · balance" : "Qty sent · qty receive · usage"}</p></div></div>
            <div className="grid grid-cols-3 gap-2 border-b bg-white px-3 py-2 xl:grid text-[11px] font-medium text-muted-foreground xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(3.5rem,4.5rem))_minmax(0,1fr)]"><span className="hidden xl:block">Product</span>{packaging ? <><span>Qty sent</span><span>Qty received</span><span>Today usage</span><span className="hidden xl:block">Balance</span></> : <><span>Qty Sent</span><span>Received</span><span>{tracking === "food_daily" ? "Wastage" : tracking === "beverage" ? "Qty Sold" : "Usage"}</span><span className="hidden xl:block">{tracking === "beverage" ? "Balance" : tracking === "food_daily" ? "Wastage details" : ""}</span></>}</div>
            {group.map((product) => {
          const matches = !normalizedSearch || matchingProductIds.has(product.id);
              return <DailyProductLine key={product.id} product={product} tracking={tracking} line={lineByProduct.get(product.id)} validationHint={validationProductId === product.id ? "Check the wastage quantity and reason." : undefined} hiddenClass={matches ? "" : "hidden"} locked={locked} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />;
            })}
          </div>;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Ask an administrator or an authorised product manager to configure sellable products, then reload this page." /> : null}
      </div>
      </section>
  </form>;
}


function SalesReconciliation({ sales, disabled }: { sales?: SalesValues; disabled: boolean }) {
  const [varianceReason, setVarianceReason] = useState(sales?.sales_variance_reason ?? "");
  const [posTotal, setPosTotal] = useState(String(sales?.pos_total_sales ?? ""));
  const [amounts, setAmounts] = useState(() => Object.fromEntries(Object.keys(salesChannelLabels).map((key) => [key, String(sales?.breakdown?.[key as keyof typeof salesChannelLabels] ?? 0)])) as Record<keyof typeof salesChannelLabels, string>);
  const hasPosTotal = posTotal.trim() !== "";
  const channelTotal = Object.values(amounts).reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0) / 100;
  const difference = hasPosTotal ? (Math.round(Number(posTotal) * 100) - Math.round(channelTotal * 100)) / 100 : 0;
  return <section className="erp-surface overflow-hidden" aria-labelledby="sales-reconciliation-title">
    <div className="flex items-center gap-2 border-b px-3 py-3"><WalletCards className="h-4 w-4 text-[var(--sb-green-700)]" aria-hidden="true" /><h2 id="sales-reconciliation-title" className="text-sm font-semibold">Sales reconciliation</h2></div>
    <div className="p-3 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 rounded-lg bg-[var(--sb-surface-muted)] p-3 text-xs font-semibold"><span>POS Total Sales (RM)</span><Input aria-label="POS Total Sales (RM)" name="pos_total_sales" type="number" inputMode="decimal" min="0" step="0.01" value={posTotal} onChange={(event)=>setPosTotal(event.target.value)} disabled={disabled}/></label><label className="grid gap-1 rounded-lg bg-[var(--sb-surface-muted)] p-3 text-xs font-semibold"><span>Voucher (RM)</span><Input aria-label="Voucher (RM)" name="sales_voucher" type="number" inputMode="decimal" min="0" step="0.01" value={amounts.voucher} onChange={(event)=>setAmounts(current=>({...current,voucher:event.target.value}))} disabled={disabled}/></label></div>
      <div className="grid items-start gap-3 lg:grid-cols-2">{([{title:"Cards Payment",channels:cardChannels},{title:"Other",channels:otherChannels.filter(channel=>channel!=="voucher")}]).map(group=><details key={group.title} open className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-semibold">{group.title}</summary><div className="mt-3 space-y-2">{group.channels.map(channel=><label key={channel} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 text-xs"><span>{salesChannelLabels[channel]}</span><Input aria-label={`${salesChannelLabels[channel]} (RM)`} name={`sales_${channel}`} type="number" inputMode="decimal" min="0" step="0.01" value={amounts[channel]} onChange={(event)=>setAmounts(current=>({...current,[channel]:event.target.value}))} disabled={disabled}/></label>)}</div></details>)}</div>
      {Number(sales?.breakdown?.credit_card ?? 0) > 0 ? <div className="rounded-lg border p-3 text-sm"><label className="grid grid-cols-2 items-center gap-3"><span>Credit Card (legacy)</span><Input aria-label="Credit Card legacy amount" name="sales_credit_card" type="number" min="0" step="0.01" value={amounts.credit_card} onChange={event=>setAmounts(current=>({...current,credit_card:event.target.value}))} disabled={disabled}/></label><p className="mt-2 text-xs text-muted-foreground">Historical aggregate. If you split it into card types, reduce this amount by the same total to avoid counting it twice.</p></div> : <input type="hidden" name="sales_credit_card" value="0"/>}
    </div>
    <div className="border-t p-3">
      <dl className="grid grid-cols-2 gap-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs" aria-live="polite"><div><dt className="text-muted-foreground">Channel total</dt><dd className="font-semibold tabular-nums">RM {channelTotal.toFixed(2)}</dd></div><div><dt className="text-muted-foreground">Difference</dt><dd className={`font-semibold tabular-nums ${!hasPosTotal ? "text-muted-foreground" : difference ? "text-[var(--sb-warning)]" : "text-[var(--sb-success)]"}`}>{hasPosTotal ? `RM ${difference.toFixed(2)}` : "Sales pending"}</dd></div></dl>
      <div hidden={!hasPosTotal || difference === 0} className="mt-3"><Field label="Difference reason (optional)"><Input name="sales_variance_reason" value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} disabled={disabled} placeholder="Explain settlement or entry difference" /></Field></div>
    </div>
  </section>;
}

function DailyProductLine({ product, tracking, line, validationHint, hiddenClass, locked, canEditQtySent, canEditOutletValues }: {
  product: Product;
  tracking: DailyTracking;
  line?: Line;
  validationHint?: string;
  hiddenClass: string;
  locked: boolean;
  canEditQtySent: boolean;
  canEditOutletValues: boolean;
}) {
  // A new outlet-day must start with unconfirmed physical quantities. History
  // can guide planning, but cannot stand in for today's receipt or disposal.
  const packaging = tracking === "packaging";
  const usage = tracking === "food_carryover" || packaging;
  const sold = tracking === "beverage";
  const consumptionLabel = usage ? "Usage" : sold ? "Qty Sold" : "Wastage";
  const source = line;
  const qtySentIsKnown = line && !["unavailable", "outlet_received_estimate"].includes(line.qty_sent_source ?? "legacy_unverified");
  const [qtySent, setQtySent] = useState(qtySentIsKnown ? String(line.qty_sent) : "");
  // A persisted zero is not evidence that the outlet entered zero. The
  // detail query supplies this explicit provenance bit for existing lines;
  // defaults are already normalised to null when their provenance is absent.
  // Keep unverified values blank so the form cannot visually manufacture a
  // receipt while still allowing an authorised user to enter an explicit 0.
  const receivedIsKnown = line?.morning_received_provided === true;
  const [received, setReceived] = useState(receivedIsKnown && source?.morning_received_qty != null ? String(source.morning_received_qty) : "");
  const consumption = usage ? source?.usage_qty ?? (packaging && !source?.daily_tracking && source?.wastage_provided ? source.wastage_qty : null) : sold ? source?.sold_qty : source?.wastage_provided ? source.wastage_qty : null;
  const [wastage, setWastage] = useState(consumption == null ? "" : String(consumption));
  const stockout = line?.stockout === true;
  const stockoutTime = line?.stockout_time ?? "";
  const [detailsOpen, setDetailsOpen] = useState(Boolean(validationHint));
  const [balance, setBalance] = useState(source?.[BALANCE_FIELD] == null ? "" : String(source[BALANCE_FIELD]));
  const [reason, setReason] = useState(source?.wastage_reason ?? "");
  const [remark, setRemark] = useState(source?.notes ?? "");
  const [remarkOpen, setRemarkOpen] = useState(Boolean(source?.notes) || Boolean(validationHint));
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(remark) || Boolean(validationHint);
  const shouldShowWastageDetails = tracking === "food_daily" && showWastageDetails;

  return <div className={`${hiddenClass} grid grid-cols-3 items-end gap-2 p-3 touch-pan-y xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(3.5rem,4.5rem))_minmax(0,1fr)]`}>
    <div className="col-span-full flex min-w-0 items-start justify-between gap-2 xl:col-span-1"><input type="hidden" name="line_product_id" value={product.id} /><div className="min-w-0"><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p></div>{shouldShowWastageDetails ? <button type="button" className="min-h-11 shrink-0 text-xs underline xl:hidden" aria-expanded={detailsOpen} aria-label={`${product.product_name} wastage details`} onClick={()=>setDetailsOpen(!detailsOpen)}>Details</button> : null}</div>
    <label className="min-w-0"><span className="sr-only">Qty Sent</span><Input className="min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} qty sent`} title={!canEditQtySent ? "Only Chef and authorised company-wide staff can enter Qty Sent." : undefined} readOnly={line?.do_managed === true} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); }} disabled={locked || !canEditQtySent} /></label>
    <label className="min-w-0"><span className="sr-only">Qty Receive</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!received && Number(qtySent || 0) > 0 ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!received && Number(qtySent || 0) > 0 ? "true" : undefined} aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} placeholder={receivedIsKnown ? undefined : "Not verified"} title={receivedIsKnown ? undefined : "Received quantity has not been verified"} data-received-unverified={!receivedIsKnown ? "true" : undefined} onChange={(event) => { setReceived(event.target.value); }} disabled={locked || !canEditOutletValues} /></label>
    <label className="min-w-0"><span className="sr-only">{consumptionLabel}</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!wastage && received !== "" ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!wastage && received !== "" ? "true" : undefined} aria-label={`${product.product_name} ${consumptionLabel}`} name={usage ? "usage_qty" : sold ? "sold_qty" : "wastage_qty"} type="number" min="0" step="0.01" value={wastage} onChange={(event) => { const next = event.target.value; setWastage(next); if (tracking === "food_daily" && Number(next || 0) > 0 && !reason) setReason("unsold"); if (Number(next || 0) <= 0) { setReason(""); setRemark(""); setRemarkOpen(false); } }} disabled={locked || !canEditOutletValues} /></label>
    <input type="hidden" name="daily_tracking" value={tracking}/>
    {tracking !== "food_daily" ? <input type="hidden" name="wastage_qty" value="0"/> : null}
    {!usage ? <input type="hidden" name="usage_qty" value=""/> : null}
    {!sold ? <input type="hidden" name="sold_qty" value=""/> : null}
    <input type="hidden" name="stockout" value={String(!packaging && stockout)} /><input type="hidden" name="stockout_time" value={!packaging ? stockoutTime : ""} />
    {packaging || sold ? <label className="col-span-full grid min-w-0 grid-cols-2 items-center gap-3 xl:col-span-1 xl:col-start-5 xl:block"><span className="text-xs xl:sr-only">Balance</span><Input className="min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} closing balance`} title="Enter the actual physical balance, including older stock" name={BALANCE_FIELD} type="number" min="0" step="0.01" value={balance} placeholder="—" required={!locked && canEditOutletValues && (received !== "" || wastage !== "")} onChange={(event) => { setBalance(event.target.value); }} disabled={locked || !canEditOutletValues} /></label> : <input type="hidden" name={BALANCE_FIELD} value="0" />}
    {shouldShowWastageDetails ? <>
      <div className={`col-span-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2 xl:col-start-5 xl:col-span-1 xl:grid ${remarkOpen ? "xl:grid-cols-2" : ""} ${detailsOpen || validationHint ? "grid" : "hidden"}`}>
        <label className="min-w-0"><span className="sr-only">Wastage Reason</span><SelectNative className="w-full text-xs" aria-label={`${product.product_name} wastage reason`} name="wastage_reason" value={reason || "unsold"} onChange={(event) => { setReason(event.target.value as OutletDailyWastageReason); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues}>{reasons.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}</SelectNative></label>
        <div className={remarkOpen ? "col-span-full min-w-0 xl:col-span-1" : "min-w-0"}>{remarkOpen ? <><Input autoFocus={Boolean(validationHint)} data-validation-anchor={validationHint ? product.id : undefined} aria-invalid={validationHint ? "true" : undefined} className={`w-full ${validationHint ? "border-rose-500 ring-2 ring-rose-200" : ""}`} aria-label={`${product.product_name} remarks`} name="line_notes" value={remark} placeholder="Remark" onChange={(event) => { setRemark(event.target.value); }} disabled={locked || !canEditOutletValues} />{validationHint ? <p className="mt-1 text-[11px] font-medium text-rose-700">{validationHint}</p> : null}</> : <><input type="hidden" name="line_notes" value={remark} /><button type="button" className="inline-flex h-[var(--sb-control-height)] w-[var(--sb-control-height)] items-center justify-center rounded-[var(--sb-control-radius)] border border-[var(--sb-border-soft)] bg-white text-muted-foreground hover:text-foreground" onClick={() => setRemarkOpen(true)} aria-label={`Add remarks for ${product.product_name}`} aria-expanded="false" disabled={locked || !canEditOutletValues}><MessageSquare className="h-4 w-4" aria-hidden="true" /></button></>}</div>
      </div>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </div>;
}
