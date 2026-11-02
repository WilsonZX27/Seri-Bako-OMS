"use client";

import { FormPendingBridge } from "@/components/ui/submit-button";
import { useActionState, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { visibleFieldControl } from "@/lib/field-recovery";
import { SelectControl } from "@/components/ui/select-control";
import { Textarea } from "@/components/ui/textarea";
import type { OutletDailyWastageReason } from "@/types/database";
import { CalendarDays, ChevronDown, MapPin, Search, WalletCards } from "lucide-react";

import { salesChannelLabels, cardChannels, otherChannels, type SalesChannel } from "@/lib/outlet-sales-channels";

import { defaultSalesChannelSettings, visibleSalesChannels, type SalesChannelSettings } from "@/lib/outlet-sales-channel-settings";

import { omitEmptyDailyHistory } from "@/lib/outlet-daily-history";
import { productAvailableOn } from "@/lib/production-planning/availability";
import { dailyTracking, groupDailyProducts, type DailyTracking } from "@/lib/daily-product-tracking";

type Branch = { id: string; branch_code: string; branch_name: string };
type Product = { status?: string; id: string; product_code: string; product_name: string; category: string; daily_tracking?: string | null; selling_unit: string; display_order?: number; is_seasonal?: boolean; available_from?: string | null; available_until?: string | null };
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

  export function OutletDailyRecordForm({ formId, action, branches, products, lines = EMPTY_LINES, branchId, recordDate, recordStatus, notes, sales, salesSettings, validationError: serverValidationError, locked = false, canEditHeader = true, canEditQtySent = false, canEditOutletValues = true }: {
  formId: string;
  action: (formData: FormData) => Promise<void | { error: string }>;
  branches: Branch[];
  products: Product[];
  lines?: Line[];
  branchId?: string;
  recordDate: string;
  recordStatus?: string;
  notes?: string | null;
  sales?: SalesValues;
  salesSettings?: SalesChannelSettings;
  defaultsByBranch?: Record<string, Record<string, DefaultLine>>;
  validationError?: string;
  locked?: boolean;
  canEditHeader?: boolean;
  canEditQtySent?: boolean;
  canEditOutletValues?: boolean;
}) {
  const [result, submitRecord] = useActionState(async (_previous: { error: string; values: Array<[string, string]>; attempt: number } | null, data: FormData) => {
    const response = await action(data);
    return response?.error ? { attempt: (_previous?.attempt ?? 0) + 1, error: response.error, values: Array.from(data.entries()).map(([name, value]) => [name, String(value)] as [string, string]) } : null;
  }, null);
  const validationError = result?.error ?? serverValidationError;
  // React resets uncontrolled inputs when an action resolves, even on a business
  // error. Keep header and sales text controlled, like the product-line fields.
  const [recordNotes, setRecordNotes] = useState(notes ?? "");
  useEffect(() => {
    if (!result) return;
    document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));

  }, [result, formId]);
  const [productSearch, setProductSearch] = useState("");
  const [fieldError, setFieldError] = useState("");
  const initialBranchId = branchId ?? (branches.length === 1 ? branches[0].id : "");
  const [selectedBranchId, setSelectedBranchId] = useState(initialBranchId);
  const [selectedRecordDate, setSelectedRecordDate] = useState(recordDate);
  const [setupOpen, setSetupOpen] = useState(!(initialBranchId && recordDate));
  const lineByProduct = useMemo(() => new Map(lines.map((line) => [line.product_id, line])), [lines]);
  // Keep the initial omission set stable so changing dates cannot unmount edited rows.
  const [omittedHistoryIds] = useState(() => {
    const omitted = new Set(products.filter(product =>
      omitEmptyDailyHistory(lines.find(line => line.product_id === product.id), recordStatus,
        product.status === "active" && productAvailableOn(product, recordDate), locked)
    ).map(product => product.id));
    // The existing RPC needs at least one line, including for remarks-only saves.
    const hasRetainedLine = products.some(product => !omitted.has(product.id) &&
      (lines.some(line => line.product_id === product.id) || product.status === "active" && productAvailableOn(product, recordDate)));
    return hasRetainedLine ? omitted : new Set<string>();
  });
  const productGroups = useMemo(() => groupDailyProducts(products.filter(product => !omittedHistoryIds.has(product.id)), (product) => dailyTracking(product, lineByProduct.get(product.id)?.daily_tracking)), [products, lineByProduct, omittedHistoryIds]);
  const availableProductIds = useMemo(() => new Set(products.filter(product => product.status === "active" && productAvailableOn(product, selectedRecordDate)).map(product => product.id)), [products, selectedRecordDate]);
  // Existing lines remain part of the record even after a season ends.
  const includedProductIds = new Set([...availableProductIds, ...lines.map(line => line.product_id)]);
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
    if (!invalid) {
      const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
      const drafts = Array.from(event.currentTarget.querySelectorAll<HTMLInputElement>('input[data-qty-sent-prefilled="true"]:not(:disabled)'));
      const reviewed = event.currentTarget.querySelector('input[data-qty-sent-edited="true"]') !== null;
      if (submitter?.value !== "draft" && drafts.length > 0 && !reviewed && !window.confirm("Qty Sent was filled from Received. Have you reviewed the quantities and confirmed they match what was sent?")) {
        event.preventDefault();
        document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));
        return;
      }
      setFieldError(""); return;
    }
    event.preventDefault();
    document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } }));
    setProductSearch("");
    setSetupOpen(true);
    const visible = visibleFieldControl(invalid);
    const label = visible.getAttribute("aria-label") ?? invalid.closest("label")?.textContent?.trim() ?? invalid.name.replaceAll("_", " ");
    setFieldError(`${label}: ${invalid.validationMessage}`);
    visible.setAttribute("aria-invalid", "true");
    requestAnimationFrame(() => { visible.scrollIntoView({ block: "center", behavior: "smooth" }); visible.focus({ preventScroll: true }); });
  }}>
      {formId ? <FormPendingBridge formId={formId} /> : null}
      {result?.error ? <p role="alert" className="rounded border border-rose-500 p-3 text-sm text-rose-700">{result.error}</p> : null}
      {fieldError ? <p role="alert" className="rounded border border-rose-500 p-3 text-sm text-rose-700">{fieldError}</p> : null}
      <details data-outlet-daily-setup open={setupOpen} onToggle={(event) => setSetupOpen(event.currentTarget.open)} className="group erp-surface overflow-hidden">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="min-w-0"><span className="block">Record setup</span><span className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-normal text-muted-foreground"><span data-record-setup-location className="flex min-w-0 items-center gap-1"><MapPin className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="truncate">{selectedBranch?.branch_name ?? "Select location"}</span></span><span data-record-setup-date className="flex items-center gap-1"><CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" /><span className="tabular-nums">{selectedRecordDate || "Select date"}</span></span></span></span>
          <ChevronDown className="ml-auto h-4 w-4 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="grid grid-cols-2 gap-3 border-t p-3 md:!grid md:grid-cols-2 md:border-0 md:p-4">
          <Field label="Branch">{!canEditHeader && branchId ? <input type="hidden" name="branch_id" value={branchId} /> : null}<SelectControl name="branch_id" value={selectedBranchId} onValueChange={selectedValue => { const nextBranch = selectedValue; setSelectedBranchId(nextBranch); if (nextBranch && selectedRecordDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} ariaLabel={"Branch"} options={[...(branches.length > 1 && !branchId ? [({value: "", label: "Select branch"})] : []), ...(branches.map((branch) => ({value: String((branch.id) ?? ""), label: [branch.branch_name, " (", branch.branch_code, ")"].join("")})))]}/></Field>
          <Field label="Record Date">{!canEditHeader ? <input type="hidden" name="record_date" value={recordDate} /> : null}<Input name="record_date" type="date" value={selectedRecordDate} onChange={(event) => { const nextDate = event.target.value; setSelectedRecordDate(nextDate); if (selectedBranchId && nextDate) setSetupOpen(false); }} required disabled={locked || !canEditHeader} /></Field>
          <div className="col-span-2"><Field label="Record Remarks"><Textarea name="notes" rows={2} value={recordNotes} onChange={(event) => setRecordNotes(event.target.value)} placeholder="Optional outlet-level remarks" disabled={locked || !canEditOutletValues} /></Field></div>
        </div>
      </details>

      <input type="hidden" name="sales_channel_settings_revision" value={salesSettings?.revision ?? 0} />
      <SalesReconciliation settings={salesSettings} sales={sales} disabled={locked || !canEditOutletValues} />

      <section data-outlet-daily-lines className="erp-surface touch-pan-y overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-3 py-2"><h2 className="text-sm font-semibold">Daily Product Lines</h2><label className="relative block w-full min-w-0 sm:ml-auto sm:w-64"><span className="sr-only">Find product</span><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input className="pl-9" type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Find product" disabled={locked} /></label></div>
      <div className="divide-y">
        {productGroups.map(({ tracking, label, products: group }) => {
          const packaging = tracking === "packaging";
          return <div key={tracking} hidden={!group.some(product => includedProductIds.has(product.id))} data-outlet-daily-group={tracking}>
            <div className="flex items-center justify-between gap-3 border-b bg-[var(--sb-surface-muted)] px-3 py-2"><h3 className="text-xs font-semibold">{label}</h3></div>
            {group.some(product => product.daily_tracking === "food_carryover") ? <p id={`saleable-help-${tracking}`} className="border-b px-3 py-2 text-xs text-muted-foreground">Saleable tomorrow: count only stock fit to sell; exclude expired or damaged stock. This reduces tomorrow’s delivery.</p> : null}
            <div className={`sb-daily-line-head grid grid-cols-3 gap-2 border-b bg-white px-3 py-2 text-[11px] font-medium text-muted-foreground ${packaging || tracking === "beverage" || tracking === "food_carryover" ? "sb-daily-line-four" : "sb-daily-line-three"}`}><span className="hidden xl:block">Product</span>{packaging ? <><span>Qty sent</span><span>Qty received</span><span>Today usage</span><span>Balance</span></> : <><span>Qty Sent</span><span>Received</span><span>{tracking === "food_daily" ? "Wastage" : tracking === "beverage" ? "Qty Sold" : "Usage"}</span>{tracking !== "food_daily" ? <span className="whitespace-nowrap" title={tracking === "food_carryover" ? "Saleable tomorrow" : undefined}>{tracking === "beverage" ? "Balance" : "Tomorrow"}</span> : null}</>}</div>
            {group.map((product) => {
          const matches = includedProductIds.has(product.id) && (!normalizedSearch || matchingProductIds.has(product.id));
              return <DailyProductLine key={product.id} product={product} tracking={tracking} line={lineByProduct.get(product.id)} validationHint={validationProductId === product.id ? "Check the wastage quantity and reason." : undefined} hiddenClass={matches ? "" : "hidden"} locked={locked || !includedProductIds.has(product.id)} excluded={!includedProductIds.has(product.id)} seasonalHistory={!availableProductIds.has(product.id)} canEditQtySent={canEditQtySent} canEditOutletValues={canEditOutletValues} />;
            })}
          </div>;
        })}
        {products.length > 0 && matchingProductIds.size === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No products match “{productSearch}”.</p> : null}
        {!products.length ? <EmptyState title="No active products available" description="Ask an administrator or an authorised product manager to configure sellable products, then reload this page." /> : null}
      </div>
      </section>
  </form>;
}


function SalesReconciliation({ sales, disabled, settings = defaultSalesChannelSettings() }: { sales?: SalesValues; disabled: boolean; settings?: SalesChannelSettings }) {
  const [varianceReason, setVarianceReason] = useState(sales?.sales_variance_reason ?? "");
  const [posTotal, setPosTotal] = useState(String(sales?.pos_total_sales ?? ""));
  const [amounts, setAmounts] = useState(() => Object.fromEntries(Object.keys(salesChannelLabels).map((key) => [key, String(sales?.breakdown?.[key as keyof typeof salesChannelLabels] ?? 0)])) as Record<keyof typeof salesChannelLabels, string>);
  const presented = visibleSalesChannels(settings, amounts);
  const shown = new Set(presented.map(channel => channel.key));
  const labels = Object.fromEntries(settings.channels.map(channel => [channel.key, channel.label]));
  const ordered = (keys: SalesChannel[]) => presented.filter(channel => keys.includes(channel.key)).map(channel => channel.key);
  const hasPosTotal = posTotal.trim() !== "";
  const channelTotal = Object.values(amounts).reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0) / 100;
  const difference = hasPosTotal ? (Math.round(Number(posTotal) * 100) - Math.round(channelTotal * 100)) / 100 : 0;
  return <section className="erp-surface overflow-hidden" aria-labelledby="sales-reconciliation-title">
    <div className="flex items-center gap-2 border-b px-3 py-3"><WalletCards className="h-4 w-4 text-[var(--sb-green-700)]" aria-hidden="true" /><h2 id="sales-reconciliation-title" className="text-sm font-semibold">Sales reconciliation</h2></div>
    <div className="p-3 space-y-3">
      <div className="grid grid-cols-2 gap-2"><label className="grid min-w-0 gap-1 rounded-lg bg-[var(--sb-surface-muted)] p-2 text-xs font-semibold"><span>POS Total Sales (RM)</span><Input className="min-w-0 px-2 tabular-nums" aria-label="POS Total Sales (RM)" name="pos_total_sales" type="number" inputMode="decimal" min="0" step="0.01" value={posTotal} onChange={(event)=>setPosTotal(event.target.value)} disabled={disabled}/></label><label style={!shown.has("voucher") ? { display: "none" } : undefined} className="grid min-w-0 gap-1 rounded-lg bg-[var(--sb-surface-muted)] p-2 text-xs font-semibold"><span className="break-words">{labels.voucher} (RM)</span><Input className="min-w-0 px-2 tabular-nums" aria-label={`${labels.voucher} (RM)`} name="sales_voucher" type="number" inputMode="decimal" min="0" step="0.01" value={amounts.voucher} onChange={(event)=>setAmounts(current=>({...current,voucher:event.target.value}))} disabled={disabled}/></label></div>
      <div className="grid items-start gap-3 lg:grid-cols-2">{([{title:"Cards Payment",channels:ordered(cardChannels)},{title:"Other",channels:ordered(otherChannels.filter(channel=>channel!=="voucher"))}]).map(group=><details key={group.title} open className="rounded-lg border p-3"><summary className="cursor-pointer text-xs font-semibold">{group.title}</summary><div className="mt-3 space-y-2">{group.channels.map(channel=><label key={channel} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 text-xs"><span className="break-words">{labels[channel]}</span><Input aria-label={`${labels[channel]} (RM)`} name={`sales_${channel}`} type="number" inputMode="decimal" min="0" step="0.01" value={amounts[channel]} onChange={(event)=>setAmounts(current=>({...current,[channel]:event.target.value}))} disabled={disabled}/></label>)}</div></details>)}</div>
      {shown.has("credit_card") ? <div className="rounded-lg border p-3 text-sm"><label className="grid grid-cols-2 items-center gap-3"><span className="break-words">{labels.credit_card}</span><Input aria-label={`${labels.credit_card} (RM)`} name="sales_credit_card" type="number" min="0" step="0.01" value={amounts.credit_card} onChange={event=>setAmounts(current=>({...current,credit_card:event.target.value}))} disabled={disabled}/></label><p className="mt-2 text-xs text-muted-foreground">Historical aggregate. If you split it into card types, reduce this amount by the same total to avoid counting it twice.</p></div> : <input type="hidden" name="sales_credit_card" value="0"/>}
      {settings.channels.filter(channel => !shown.has(channel.key) && channel.key !== "voucher" && channel.key !== "credit_card").map(channel => <input key={channel.key} type="hidden" name={`sales_${channel.key}`} value={amounts[channel.key]} />)}
    </div>
    <div className="border-t p-3">
      <dl className="grid grid-cols-2 gap-3 rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] p-3 text-xs" aria-live="polite"><div><dt className="text-muted-foreground">Channel total</dt><dd className="font-semibold tabular-nums">RM {channelTotal.toFixed(2)}</dd></div><div><dt className="text-muted-foreground">Difference</dt><dd className={`font-semibold tabular-nums ${!hasPosTotal ? "text-muted-foreground" : difference ? "text-[var(--sb-warning)]" : "text-[var(--sb-success)]"}`}>{hasPosTotal ? `RM ${difference.toFixed(2)}` : "Sales pending"}</dd></div></dl>
      <div hidden={!hasPosTotal || difference === 0} className="mt-3"><Field label="Difference reason (optional)"><Input name="sales_variance_reason" value={varianceReason} onChange={(event) => setVarianceReason(event.target.value)} disabled={disabled} placeholder="Explain settlement or entry difference" /></Field></div>
    </div>
  </section>;
}

function DailyProductLine({ product, tracking, line, validationHint, hiddenClass, locked, excluded = false, seasonalHistory = false, canEditQtySent, canEditOutletValues }: {
  product: Product;
  tracking: DailyTracking;
  line?: Line;
  validationHint?: string;
  hiddenClass: string;
  excluded?: boolean;
  seasonalHistory?: boolean;
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
  const initiallyPrefilled = canEditQtySent && !qtySentIsKnown && !line?.do_managed && line?.morning_received_provided === true && line.morning_received_qty != null && Number.isFinite(line.morning_received_qty) && line.morning_received_qty >= 0;
  const [prefilled, setPrefilled] = useState(initiallyPrefilled);
  const [qtySent, setQtySent] = useState(qtySentIsKnown ? String(line.qty_sent) : initiallyPrefilled ? String(line!.morning_received_qty) : "");
  const [sentReviewed, setSentReviewed] = useState(false);
  // A persisted zero is not evidence that the outlet entered zero. The
  // detail query supplies this explicit provenance bit for existing lines;
  // defaults are already normalised to null when their provenance is absent.
  // Keep unverified values blank so the form cannot visually manufacture a
  // receipt while still allowing an authorised user to enter an explicit 0.
  const receivedIsKnown = line?.morning_received_provided === true;
  const [received, setReceived] = useState(receivedIsKnown && source?.morning_received_qty != null ? String(source.morning_received_qty) : "");
  const consumption = usage ? source?.usage_qty ?? (packaging && !source?.daily_tracking && source?.wastage_provided ? source.wastage_qty : null) : sold ? source?.sold_qty : source?.wastage_provided ? source.wastage_qty : null;
  const [wastage, setWastage] = useState(consumption == null ? "" : String(consumption));
  const [saleable, setSaleable] = useState(line?.saleable_next_day_qty == null ? "" : String(line.saleable_next_day_qty));
  const stockout = line?.stockout === true;
  const stockoutTime = line?.stockout_time ?? "";
  const [balance, setBalance] = useState(source?.[BALANCE_FIELD] == null ? "" : String(source[BALANCE_FIELD]));
  const [reason, setReason] = useState(source?.wastage_reason ?? "");
  const [remark, setRemark] = useState(source?.notes ?? "");
  const showWastageDetails = Number(wastage || 0) > 0 || Boolean(reason) || Boolean(remark) || Boolean(validationHint);
  const shouldShowWastageDetails = tracking === "food_daily" && showWastageDetails;

  return <fieldset disabled={excluded} style={hiddenClass === "hidden" ? { display: "none" } : undefined} data-daily-product={product.id} className={`min-w-0 ${hiddenClass} sb-daily-product-line grid grid-cols-3 items-start gap-2 px-3 py-2 touch-pan-y ${packaging || sold || usage ? "sb-daily-line-four" : "sb-daily-line-three"}`}>
    <div className="col-span-full flex min-w-0 items-start justify-between gap-2 xl:col-span-1"><input type="hidden" name="line_product_id" value={product.id} /><div className="min-w-0"><p className="break-words font-medium leading-5">{product.product_name}</p><p className="text-xs text-muted-foreground">{product.product_code} · {product.selling_unit}</p>{seasonalHistory ? <p className="text-xs text-muted-foreground">Historical line · outside current availability</p> : null}</div></div>
    <div className="min-w-0"><span className="sr-only">Qty Sent</span><Input className={`min-w-0 px-2 text-center tabular-nums ${prefilled && !sentReviewed ? "italic text-muted-foreground" : ""}`} data-qty-sent-edited={sentReviewed ? "true" : undefined} aria-label={`${product.product_name} qty sent`} data-qty-sent-prefilled={prefilled ? "true" : undefined} title={!canEditQtySent ? "Qty Sent requires dispatch entry permission." : undefined} readOnly={line?.do_managed === true} name="qty_sent" type="number" min="0" step="0.01" value={qtySent} onChange={(event) => { setQtySent(event.target.value); setSentReviewed(true); }} disabled={locked || !canEditQtySent} /></div>
    <label className="min-w-0"><span className="sr-only">Qty Receive</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!received && Number(qtySent || 0) > 0 ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!received && Number(qtySent || 0) > 0 ? "true" : undefined} aria-label={`${product.product_name} received`} name="morning_received_qty" type="number" min="0" step="0.01" value={received} placeholder={receivedIsKnown ? undefined : "—"} title={receivedIsKnown ? undefined : "Received quantity has not been verified"} data-received-unverified={!receivedIsKnown ? "true" : undefined} onChange={(event) => { const value = event.target.value; setReceived(value);
      if (canEditQtySent && !qtySentIsKnown && !line?.do_managed && !sentReviewed) { setQtySent(value); setPrefilled(value !== ""); } }} disabled={locked || !canEditOutletValues} /></label>
    <label className="min-w-0"><span className="sr-only">{consumptionLabel}</span><Input className={`min-w-0 px-2 text-center tabular-nums ${!wastage && received !== "" ? "border-rose-500 bg-rose-50" : ""}`} aria-invalid={!wastage && received !== "" ? "true" : undefined} aria-label={`${product.product_name} ${consumptionLabel}`} name={usage ? "usage_qty" : sold ? "sold_qty" : "wastage_qty"} type="number" min="0" step="0.01" value={wastage} onChange={(event) => { const next = event.target.value; setWastage(next); if (tracking === "food_daily" && Number(next || 0) > 0 && !reason) setReason("unsold"); if (Number(next || 0) <= 0) { setReason(""); setRemark(""); } }} disabled={locked || !canEditOutletValues} /></label>
    {tracking === "food_carryover" ? <label className="min-w-0"><span className="sr-only">Saleable tomorrow</span><Input className="min-w-0 px-2 text-center tabular-nums" title={saleable === "" ? "Saleable tomorrow has not been counted" : undefined} aria-label={`${product.product_name} saleable tomorrow`} aria-describedby={`saleable-help-${tracking}`} name="saleable_next_day_qty" type="number" min="0" max="1000000" step="0.01" value={saleable} placeholder="—" onChange={event=>setSaleable(event.target.value)} disabled={locked || !canEditOutletValues}/></label> : <input type="hidden" name="saleable_next_day_qty" value=""/>}
    <input type="hidden" name="daily_tracking" value={tracking}/>
    {tracking !== "food_daily" ? <input type="hidden" name="wastage_qty" value="0"/> : null}
    {!usage ? <input type="hidden" name="usage_qty" value=""/> : null}
    {!sold ? <input type="hidden" name="sold_qty" value=""/> : null}
    <input type="hidden" name="stockout" value={String(!packaging && stockout)} /><input type="hidden" name="stockout_time" value={!packaging ? stockoutTime : ""} />
    {packaging || sold ? <label className="sb-daily-balance min-w-0"><span className="sr-only">Balance</span><Input className="min-w-0 px-2 text-center tabular-nums" aria-label={`${product.product_name} closing balance`} title="Enter the actual physical balance, including older stock" name={BALANCE_FIELD} type="number" min="0" step="0.01" value={balance} placeholder="—" required={!locked && canEditOutletValues && (received !== "" || wastage !== "")} onChange={(event) => { setBalance(event.target.value); }} disabled={locked || !canEditOutletValues} /></label> : <input type="hidden" name={BALANCE_FIELD} value="0" />}
    {shouldShowWastageDetails ? <>
      <div className={`col-span-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem] items-end gap-2 xl:col-start-5 xl:col-span-1 xl:grid-cols-1 grid`}>
        <label className="min-w-0"><span className="sr-only">Wastage Reason</span><SelectControl className="w-full text-xs" ariaLabel={`${product.product_name} wastage reason`} name="wastage_reason" value={reason || "unsold"} onValueChange={selectedValue => { setReason(selectedValue as OutletDailyWastageReason); }} required={Number(wastage || 0) > 0} disabled={locked || !canEditOutletValues} options={[...(reasons.map((option) => ({value: String((option) ?? ""), label: String((option.replaceAll("_", " ")) ?? "")})))]}/></label>
        <div className="min-w-0"><Input data-validation-anchor={validationHint ? product.id : undefined} aria-invalid={validationHint ? "true" : undefined} className={`w-full ${validationHint ? "border-rose-500 ring-2 ring-rose-200" : ""}`} aria-label={`${product.product_name} remarks`} name="line_notes" value={remark} placeholder="Comment" onChange={event=>setRemark(event.target.value)} disabled={locked || !canEditOutletValues}/>{validationHint ? <p className="mt-1 text-[11px] font-medium text-rose-700">{validationHint}</p> : null}</div>
      </div>
    </> : <><input type="hidden" name="wastage_reason" value="" /><input type="hidden" name="line_notes" value="" /></>}
  </fieldset>;
}
