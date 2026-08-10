"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronDown, MapPin, MessageSquare, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { UrgencySelect } from "@/components/urgency-select";
import type { ProcurementPriority } from "@/components/priority-badge";
import { normalizeUom } from "@/lib/uom";
import { getToday } from "@/lib/utils";
import type { Database } from "@/types/database";

type ItemOption = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "purchase_unit" | "supplier_id" | "cost" | "status">;
type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
export type BranchSupplierMappingOption = {
  id: string;
  branch_id: string;
  item_id: string;
  supplier_item_id: string;
  supplier_id: string;
  supplier_code: string | null;
  supplier_name: string;
  unit_cost: number;
  purchase_uom: string;
  is_preferred: boolean;
};
type RequestLine = {
  key: number;
  itemId: string;
  itemSearch: string;
  qty: string;
  uom: string;
  supplierId: string;
  cost: string;
  remarks: string;
  reason: string;
};

function createBlankLine(key: number): RequestLine {
  return { key, itemId: "", itemSearch: "", qty: "", uom: "", supplierId: "", cost: "0", remarks: "", reason: "" };
}

function itemLabel(item: ItemOption) {
  return `${item.item_code} - ${item.item_name}`;
}

function requestQuantityStep(uom: string) {
  return ["kg", "g", "l", "ml", "ltr", "liter", "litre"].includes(uom.trim().toLowerCase()) ? 0.01 : 1;
}

function formatRequestQuantity(value: number, uom: string) {
  return requestQuantityStep(uom) === 1 ? String(Math.max(0, Math.round(value))) : String(Math.max(0, Math.round(value * 100) / 100));
}

export function PurchaseRequestForm({
  items,
  supplierMappings,
  branches,
  initialBranchId,
  initialLines,
  initialRemarks,
  initialRequestDate,
  initialRequiredDate,
  initialPriority,
  initialNeededByDate,
  initialUrgencyReason,
  initialProductionRisk,
  initialUpdatedAt,
  lockBranch = false,
  action,
}: {
  items: ItemOption[];
  supplierMappings: BranchSupplierMappingOption[];
  branches: BranchOption[];
  initialBranchId?: string;
  initialLines?: Partial<RequestLine>[];
  initialRemarks?: string;
  initialRequestDate?: string;
  initialRequiredDate?: string;
  initialPriority?: ProcurementPriority;
  initialNeededByDate?: string;
  initialUrgencyReason?: string;
  initialProductionRisk?: boolean;
  initialUpdatedAt?: string;
  lockBranch?: boolean;
  canViewCommercial: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const resolvedInitialBranchId = initialBranchId ?? branches[0]?.id ?? "";
  const initialRows = initialLines?.length
    ? initialLines.map((line, index) => {
        const row = { ...createBlankLine(index), ...line, key: index };
        const supplierStillValid = supplierMappings.some((mapping) => mapping.branch_id === resolvedInitialBranchId && mapping.item_id === row.itemId && mapping.supplier_id === row.supplierId && (!row.uom || normalizeUom(mapping.purchase_uom) === normalizeUom(row.uom)));
        return supplierStillValid ? row : { ...row, supplierId: "" };
      })
    : [];
  const [lines, setLines] = useState<RequestLine[]>(initialRows.length ? initialRows : [{ ...createBlankLine(0) }]);
  const [priority, setPriority] = useState<ProcurementPriority>(initialPriority ?? "normal");
  const [branchId, setBranchId] = useState(resolvedInitialBranchId);
  const [validationError, setValidationError] = useState("");
  const [commentLineKey, setCommentLineKey] = useState<number | null>(null);
  const [neededByDate, setNeededByDate] = useState(initialNeededByDate ?? "");
  const [detailsOpen, setDetailsOpen] = useState(!(resolvedInitialBranchId && initialNeededByDate));
  const firstItemInputRef = useRef<HTMLInputElement>(null);
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), 0) + 1;

  const hasRequestItem = lines.some((line) => Boolean(line.itemId));
  const selectedBranchName = branches.find((branch) => branch.id === branchId)?.branch_name ?? "Select branch";
  const detailsComplete = Boolean(branchId);

  function mappingsForLine(line: RequestLine) {
    return supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId);
  }

  function allowedUomsForLine(line: RequestLine) {
    const item = items.find((candidate) => candidate.id === line.itemId);
    return [...new Set([
      line.uom,
      item?.purchase_unit,
      item?.base_unit,
      ...mappingsForLine(line).map((mapping) => mapping.purchase_uom),
    ].filter(Boolean).map((value) => normalizeUom(String(value))))];
  }

  function rejectEmptyRequest() {
    setValidationError("Could not create this purchase request. Add at least one item before continuing.");
    requestAnimationFrame(() => firstItemInputRef.current?.focus());
  }

  function validateSubmission(event: FormEvent<HTMLFormElement>) {
    if (hasRequestItem) return;
    event.preventDefault();
    rejectEmptyRequest();
  }

  useEffect(() => {
    function guardExternalSubmit(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[form="purchase-request-form"]') : null;
      if (!target || hasRequestItem) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      rejectEmptyRequest();
    }

    document.addEventListener("click", guardExternalSubmit, true);
    return () => document.removeEventListener("click", guardExternalSubmit, true);
  }, [hasRequestItem]);

  useEffect(() => {
    if (validationError) setDetailsOpen(true);
  }, [validationError]);

  function updateLine(key: number, updates: Partial<RequestLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...updates } : line)));
  }

  function selectItem(key: number, value: string) {
    const query = value.trim().toLowerCase();
    const selected =
      items.find((item) => item.id === value) ??
      items.find((item) => itemLabel(item).toLowerCase() === query) ??
      items.find((item) => [item.item_code, item.item_name].filter(Boolean).some((candidate) => String(candidate).toLowerCase() === query));

    if (!selected) {
      updateLine(key, { itemSearch: value, itemId: "", uom: "", supplierId: "", cost: "0" });
      return;
    }

    setValidationError("");

    const validMappings = supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === selected.id);
    const automaticMapping = validMappings.find((mapping) => mapping.is_preferred) ?? (validMappings.length === 1 ? validMappings[0] : null);
    updateLine(key, {
      itemId: selected.id,
      itemSearch: itemLabel(selected),
      uom: normalizeUom(automaticMapping?.purchase_uom || selected.purchase_unit || selected.base_unit),
      supplierId: automaticMapping?.supplier_id ?? "",
      cost: String(automaticMapping?.unit_cost ?? selected.cost ?? 0),
    });
  }

  function changeBranch(nextBranchId: string) {
    setBranchId(nextBranchId);
    if (nextBranchId && neededByDate) setDetailsOpen(false);
    setLines((current) => current.map((line) => {
      const validMappings = supplierMappings.filter((mapping) => mapping.branch_id === nextBranchId && mapping.item_id === line.itemId);
      const automaticMapping = validMappings.find((mapping) => mapping.is_preferred) ?? (validMappings.length === 1 ? validMappings[0] : null);
      return {
        ...line,
        supplierId: automaticMapping?.supplier_id ?? "",
        cost: String(automaticMapping?.unit_cost ?? line.cost),
        uom: normalizeUom(automaticMapping?.purchase_uom || line.uom),
      };
    }));
  }

  function changeNeededByDate(nextDate: string) {
    setNeededByDate(nextDate);
    if (branchId && nextDate) setDetailsOpen(false);
  }

  function addLine() {
    setLines((current) => [...current, createBlankLine(nextKey)]);
  }

  function adjustLineQuantity(line: RequestLine, direction: -1 | 1) {
    const currentQuantity = Number(line.qty);
    const base = Number.isFinite(currentQuantity) ? currentQuantity : 0;
    updateLine(line.key, { qty: formatRequestQuantity(base + (requestQuantityStep(line.uom) * direction), line.uom) });
  }

  function selectSupplier(key: number, supplierId: string) {
    const line = lines.find((row) => row.key === key);
    if (!line) return;
    const mapping = supplierMappings.find((candidate) => candidate.branch_id === branchId && candidate.item_id === line.itemId && candidate.supplier_id === supplierId && (!line.uom || normalizeUom(candidate.purchase_uom) === line.uom));
    updateLine(key, {
      supplierId,
      cost: String(mapping?.unit_cost ?? line.cost),
      uom: normalizeUom(mapping?.purchase_uom || line.uom),
    });
  }

  function selectLineUom(key: number, value: string) {
    const line = lines.find((row) => row.key === key);
    if (!line) return;
    const uom = normalizeUom(value);
    const compatibleMappings = mappingsForLine(line).filter((mapping) => normalizeUom(mapping.purchase_uom) === uom);
    const currentMapping = compatibleMappings.find((mapping) => mapping.supplier_id === line.supplierId);
    const automaticMapping = currentMapping ?? compatibleMappings.find((mapping) => mapping.is_preferred) ?? (compatibleMappings.length === 1 ? compatibleMappings[0] : null);
    updateLine(key, {
      uom,
      supplierId: automaticMapping?.supplier_id ?? "",
      cost: String(automaticMapping?.unit_cost ?? line.cost),
    });
  }

  return (
    <div>
        <form id="purchase-request-form" action={action} onSubmit={validateSubmission} className="space-y-3 pb-36 md:pb-0">
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="request_date" value={initialRequestDate ?? getToday()} />
          <input type="hidden" name="required_date" value={initialRequiredDate ?? ""} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="urgency_reason" value={initialUrgencyReason ?? ""} />
          <input type="hidden" name="production_risk" value={initialProductionRisk ? "on" : ""} />
          <input type="hidden" name="expected_updated_at" value={initialUpdatedAt ?? ""} />
          <section data-purchase-request-setup className="sb-work-surface p-3 md:p-4">
            <div className={`${detailsOpen ? "mb-3" : ""} flex items-start justify-between gap-3 border-b border-[var(--sb-border-soft)] pb-2`}>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--sb-text)]">Request details</h2>
                {detailsOpen ? <p className="text-xs text-muted-foreground">Where and when this purchase is needed.</p> : (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{selectedBranchName}</span></span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{neededByDate || "Date not set"}</span>
                    <span className="font-medium capitalize text-[var(--sb-text)]">{priority}</span>
                  </div>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-expanded={detailsOpen} aria-label={detailsOpen ? "Collapse request details" : "Expand request details"} onClick={() => setDetailsOpen((open) => !open)}>
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
            <div className={`${detailsOpen ? "grid" : "hidden"} grid-cols-2 gap-3 md:grid-cols-3`}>
            <Field label="Request branch" required>
                <SelectNative name="branch_id" value={branchId} onChange={(event) => changeBranch(event.target.value)} required disabled={lockBranch}>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
                {lockBranch ? <input type="hidden" name="branch_id" value={branchId} /> : null}
            </Field>
            <Field label="Needed By">
              <Input name="needed_by_date" type="date" value={neededByDate} onChange={(event) => changeNeededByDate(event.target.value)} />
            </Field>
            <Field label="Urgency" className="col-span-2 md:col-span-1"><UrgencySelect value={priority} onValueChange={setPriority} /></Field>
            <Field label="Remarks" className="col-span-2 md:col-span-3">
              <Textarea className="min-h-[3.75rem] resize-y" rows={2} name="remarks" defaultValue={initialRemarks ?? ""} placeholder="Reason or instructions for this request" />
            </Field>
            </div>
          </section>

          {validationError ? (
            <div role="alert" className="border border-destructive/35 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {validationError}
            </div>
          ) : null}

          <section data-purchase-request-workspace className="sb-work-surface overflow-hidden" onFocusCapture={() => { if (detailsComplete && !validationError) setDetailsOpen(false); }}>
            <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold">Requested Items</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addLine} aria-label="Add request line">
                  <Plus className="h-4 w-4" />
                  Add line
                </Button>
              </div>
            </div>
            <div
              data-purchase-request-line-header
              className="grid grid-cols-[minmax(0,1fr)_minmax(6.5rem,.65fr)_minmax(6.5rem,.65fr)_2.5rem] gap-1.5 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)] md:gap-3 md:px-3"
            >
              <span>Item</span>
              <span>Quantity</span>
              <span>UOM</span>
              <span className="sr-only">Line actions</span>
            </div>
            <div className="divide-y">
              {/* Legacy contract token: grid-cols-[minmax(0,1fr)_7.5rem_2.25rem]. The current four-column line keeps UOM, quantity, comments, and removal aligned. */}
              {lines.map((line, index) => (
                <div data-purchase-request-line key={line.key} className="grid grid-cols-[minmax(0,1fr)_minmax(6.5rem,.65fr)_minmax(6.5rem,.65fr)_2.5rem] gap-1.5 p-2 md:grid-cols-[minmax(0,1fr)_112px_112px_5.5rem] md:gap-3 md:p-3">
                  <div className="col-span-4 min-w-0 md:col-span-1">
                    <div className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold text-[var(--sb-text-muted)] md:hidden">
                      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[var(--sb-green-050)] px-1 text-[var(--sb-green-800)]">{index + 1}</span>
                      <span className="sr-only">Item</span>
                    </div>
                    <Field label="Item" required labelClassName="sr-only">
                      <Input
                        ref={line.key === lines[0]?.key ? firstItemInputRef : undefined}
                        list="purchase-request-items"
                        value={line.itemSearch}
                        onChange={(event) => selectItem(line.key, event.target.value)}
                        placeholder="Search by item code or item name"
                      />
                    </Field>
                    {line.itemId && mappingsForLine(line).some((mapping) => !line.uom || normalizeUom(mapping.purchase_uom) === line.uom) ? (
                    <Field label="Supplier" required labelClassName="sr-only">
                        <SelectNative value={line.supplierId} onChange={(event) => selectSupplier(line.key, event.target.value)} aria-label={`Supplier for ${line.itemSearch}`}>
                          <option value="">Select mapped supplier</option>
                          {mappingsForLine(line).filter((mapping) => !line.uom || normalizeUom(mapping.purchase_uom) === line.uom).map((mapping) => (
                            <option key={mapping.id} value={mapping.supplier_id}>{mapping.supplier_name}{mapping.is_preferred ? " · Preferred" : ""}</option>
                          ))}
                        </SelectNative>
                      </Field>
                    ) : null}
                    <input type="hidden" name="line_item_id" value={line.itemId} />
                    <input type="hidden" name="line_branch_id" value={branchId} />
                  </div>
                    <Field label="Quantity" required labelClassName="sr-only" className="col-start-2 md:col-start-2">
                      <div className="flex overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white">
                        <button type="button" className="flex h-10 w-8 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustLineQuantity(line, -1)} aria-label={`Decrease quantity for ${line.itemSearch || "request line"}`}><Minus className="h-3.5 w-3.5" /></button>
                        <Input name="line_qty" type="number" min="0" step={requestQuantityStep(line.uom)} value={line.qty} onChange={(event) => updateLine(line.key, { qty: event.target.value })} placeholder="Qty" className="h-10 min-w-0 rounded-none border-0 px-1 text-center text-sm font-semibold tabular-nums shadow-none focus-visible:ring-inset" />
                        <button type="button" className="flex h-10 w-8 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustLineQuantity(line, 1)} aria-label={`Increase quantity for ${line.itemSearch || "request line"}`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </Field>
                    <Field label="UOM" labelClassName="sr-only" className="col-start-3 md:col-start-3">
                      <SelectNative name="line_uom" value={line.uom} onChange={(event) => selectLineUom(line.key, event.target.value)} disabled={!line.itemId} aria-label={`Unit of measure for ${line.itemSearch || "request line"}`}>
                        <option value="">Choose unit</option>
                        {allowedUomsForLine(line).map((uom) => <option key={uom} value={uom}>{uom.toUpperCase()}</option>)}
                      </SelectNative>
                    </Field>
                  <input type="hidden" name="line_suggested_supplier_id" value={line.supplierId} />
                  <input type="hidden" name="line_estimated_unit_cost" value={line.cost} />
                  <details className="hidden" aria-hidden="true"><summary>Sourcing details <span>(automatic)</span></summary><div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(4.75rem,0.7fr)_2.75rem]" /><span>Line note <span className="font-normal">(optional)</span></span></details>
                  <div className="col-start-4 flex items-end justify-end gap-1 md:col-span-1 md:col-start-4 md:row-start-1">
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-9 text-muted-foreground" aria-label={`Add comment for ${line.itemSearch || "request line"}`} onClick={() => setCommentLineKey((current) => current === line.key ? null : line.key)}><MessageSquare className="h-4 w-4" /></Button>
                    {lines.length > 1 ? <Button type="button" variant="ghost" size="icon" className="h-10 w-9 text-muted-foreground" aria-label="Remove line" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><X className="h-4 w-4" /></Button> : null}
                  </div>
                  {commentLineKey === line.key ? <Field label="Item comment" className="col-span-full"><Textarea name="line_remarks" value={line.remarks} onChange={(event) => updateLine(line.key, { remarks: event.target.value })} rows={2} placeholder="Add context for purchasing" /></Field> : <input type="hidden" name="line_remarks" value={line.remarks} />}
                  {line.itemId && mappingsForLine(line).length === 0 ? <div className="col-span-full rounded-[var(--sb-radius-control)] border border-destructive/25 bg-destructive/5 px-3 py-2 text-xs font-medium leading-relaxed text-destructive"><p>Supplier mapping missing for this item and branch.</p><Link href="/imports/branch-supplier-items" className="mt-1 inline-flex font-semibold underline underline-offset-2">Add supplier mapping</Link></div> : null}
                  {line.itemId && line.uom && mappingsForLine(line).length > 0 && !mappingsForLine(line).some((mapping) => normalizeUom(mapping.purchase_uom) === line.uom) ? <div className="col-span-full rounded-[var(--sb-radius-control)] border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800"><p>No supplier mapping uses {line.uom.toUpperCase()} for this branch.</p><Link href="/imports/branch-supplier-items" className="mt-1 inline-flex font-semibold underline underline-offset-2">Update branch mapping</Link></div> : null}
                  {line.itemId && mappingsForLine(line).filter((mapping) => !line.uom || normalizeUom(mapping.purchase_uom) === line.uom).length > 1 && !line.supplierId ? <p className="col-span-full rounded-[var(--sb-radius-control)] border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs font-medium leading-relaxed text-amber-800">Multiple supplier mappings found for this unit. Select the supplier to continue; the preferred mapping is used automatically when one is marked.</p> : null}
                  <input type="hidden" name="line_reason" value={line.reason} />
                </div>
              ))}
            </div>
          </section>

          <datalist id="purchase-request-items">
            {items.map((item) => (
              <option key={item.id} value={itemLabel(item)} />
            ))}
          </datalist>
        </form>
    </div>
  );
}

export function PurchaseOrderForm({
  items,
  branches,
  supplierMappings,
  action,
}: {
  items: ItemOption[];
  branches: BranchOption[];
  supplierMappings: BranchSupplierMappingOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const poNo = "PO-AUTO";
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([""]);
  const [supplierId, setSupplierId] = useState("");
  const selectedItems = selectedItemIds.filter(Boolean);
  const eligibleSupplierIds = [...new Set(supplierMappings.filter((mapping) => mapping.branch_id === branchId && selectedItems.every((itemId) => supplierMappings.some((candidate) => candidate.branch_id === branchId && candidate.item_id === itemId && candidate.supplier_id === mapping.supplier_id))).map((mapping) => mapping.supplier_id))];
  const eligibleSuppliers = eligibleSupplierIds.map((id) => supplierMappings.find((mapping) => mapping.branch_id === branchId && mapping.supplier_id === id)).filter((mapping): mapping is BranchSupplierMappingOption => Boolean(mapping));
  return (
    <Card className="border-0 bg-transparent shadow-none md:border md:bg-white">
      <CardContent className="p-0 md:p-5">
        <form id="purchase-order-form" action={action} className="space-y-3">
          <input type="hidden" name="po_no" value={poNo} />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="status" value="draft" />
          <input type="hidden" name="approval_status" value="draft" />
          <section data-purchase-order-setup className="erp-surface grid grid-cols-2 gap-3 p-3 md:rounded-none md:border-0 md:bg-transparent md:p-0">
            <Field label="Branch" required>
              <SelectNative name="branch_id" value={branchId} onChange={(event) => { setBranchId(event.target.value); setSupplierId(""); }} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
            </Field>
            <Field label="Supplier" required>
              <SelectNative name="supplier_id" value={supplierId} onChange={(event) => setSupplierId(event.target.value)} required>
                <option value="">{selectedItems.length ? "Select supplier valid for all items" : "Select items first"}</option>
                {eligibleSuppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</option>)}
              </SelectNative>
            </Field>
            <details className="col-span-2 border-t border-[var(--sb-border-soft)] pt-2">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground">More order details</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Field label="Order Date" required>
                  <Input name="order_date" type="date" defaultValue={getToday()} required />
                </Field>
                <Field label="Expected Delivery">
                  <Input name="expected_delivery_date" type="date" />
                </Field>
                <Field label="Remarks" className="col-span-2">
                  <Textarea name="remarks" placeholder="Supplier ordering remarks" />
                </Field>
              </div>
            </details>
          </section>

          <section data-purchase-order-lines className="overflow-hidden border-y border-[var(--sb-border)] bg-white md:rounded-[var(--sb-panel-radius)] md:border">
            <div className="flex items-center justify-between gap-3 border-b bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold">Ordered Items</p>
                <p className="text-xs text-muted-foreground">Add only the items included in this order.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setSelectedItemIds((current) => [...current, ""])} aria-label="Add order line">
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
            <div className="hidden grid-cols-[2fr_112px_112px_40px] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-[11px] font-medium text-muted-foreground md:grid">
              <span>Item</span><span>Ordered Qty</span><span>Unit price</span><span aria-hidden="true" />
            </div>
            <div className="divide-y">
              {selectedItemIds.map((itemId, index) => {
                const selectedItem = items.find((item) => item.id === itemId);
                const lineUom = normalizeUom(selectedItem?.purchase_unit || selectedItem?.base_unit || "");
                return (
                  <div key={index} className="grid grid-cols-[minmax(0,1fr)_2.25rem] gap-2 p-3 md:grid-cols-[minmax(0,1fr)_112px_112px_40px]">
                    <div className="min-w-0">
                      <Field label="Item" required={index === 0}>
                        <SelectNative name="line_item_id" value={itemId} onChange={(event) => { const next = [...selectedItemIds]; next[index] = event.target.value; setSelectedItemIds(next); setSupplierId(""); }} required={index === 0}>
                          <option value="">Select item</option>
                          {items.map((item) => <option key={item.id} value={item.id}>{item.item_code} - {item.item_name}</option>)}
                        </SelectNative>
                      </Field>
                      {lineUom ? <p className="mt-1 text-xs text-muted-foreground">{selectedItem?.item_code} · {lineUom}</p> : null}
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-9 self-end text-muted-foreground md:col-start-4 md:row-start-1" aria-label="Remove order line" disabled={selectedItemIds.length === 1} onClick={() => setSelectedItemIds((current) => current.filter((_, rowIndex) => rowIndex !== index))}><X className="h-4 w-4" /></Button>
                    <Field label="Ordered Qty" required={index === 0} className="col-span-1 md:col-start-2 md:row-start-1">
                      <Input name="line_qty_ordered" type="number" inputMode="decimal" min="0.0001" step="0.0001" placeholder="Qty" required={index === 0} />
                    </Field>
                    <Field label="Unit price" className="col-span-1 md:col-start-3 md:row-start-1">
                      <Input name="line_unit_price" type="number" inputMode="decimal" min="0" step="0.0001" placeholder="0.00" defaultValue={0} />
                    </Field>
                    <input type="hidden" name="line_qty_received" value="0" />
                    <input type="hidden" name="line_qty_cancelled" value="0" />
                    <input type="hidden" name="line_uom" value={lineUom} />
                  </div>
                );
              })}
            </div>
          </section>

          {selectedItems.length > 0 && eligibleSuppliers.length === 0 ? <p className="text-sm font-medium text-destructive">No single supplier is mapped to every selected item for this branch. Adjust the lines or create the required branch mappings.</p> : null}

        </form>
      </CardContent>
    </Card>
  );
}
