"use client";

import Link from "next/link";
import { usePurchaseRequestGuidance } from "@/components/purchase-request-guidance";
import { type FormEvent, useActionState, useEffect, useRef, useState } from "react";
import { Building2, CalendarDays, ChevronDown, MapPin, MessageSquare, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { UrgencySelect } from "@/components/urgency-select";
import type { ProcurementPriority } from "@/components/priority-badge";
import { normalizeUom, uomOptionsForValues } from "@/lib/uom";
import { getToday } from "@/lib/utils";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Notice } from "@/components/ui/system-states";

type ItemOption = ItemComboboxOption;
type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type SupplierOption = { id: string; supplier_code: string | null; supplier_group?: string | null; name: string; status: string };
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
  conversion_to_base_uom: number | null;
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
type RequestValidationTarget = { field: "branch" | "supplier" | "item" | "quantity" | "uom"; lineKey?: number } | null;

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
  suppliers,
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
  reserveMobileActionSpace = true,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
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
  reserveMobileActionSpace?: boolean;
  canViewCommercial: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const resolvedInitialBranchId = initialBranchId ?? branches[0]?.id ?? "";
  const initialRows = initialLines?.length
    ? initialLines.map((line, index) => {
        const row = { ...createBlankLine(index), ...line, key: index };
        const supplierStillValid = !row.supplierId || suppliers.some((supplier) => supplier.id === row.supplierId);
        return supplierStillValid ? row : { ...row, supplierId: "" };
      })
    : [];
  const [lines, setLines] = useState<RequestLine[]>(initialRows.length ? initialRows : [{ ...createBlankLine(0) }]);
  const [priority, setPriority] = useState<ProcurementPriority>(initialPriority ?? "normal");
  const [branchId, setBranchId] = useState(resolvedInitialBranchId);
  const [requestSupplierId, setRequestSupplierId] = useState(initialRows.find((line) => line.supplierId)?.supplierId ?? "");
  const [validationError, setValidationError] = useState("");
  const [validationTarget, setValidationTarget] = useState<RequestValidationTarget>(null);
  const [contextResetNotice, setContextResetNotice] = useState("");
  const [commentLineKey, setCommentLineKey] = useState<number | null>(null);
  const [neededByDate, setNeededByDate] = useState(initialNeededByDate ?? "");
  const [detailsOpen, setDetailsOpen] = useState(!(resolvedInitialBranchId && initialNeededByDate));
  const firstItemInputRef = useRef<HTMLInputElement>(null);
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), 0) + 1;

  const hasRequestItem = lines.some((line) => Boolean(line.itemSearch.trim()));
  const selectedBranchName = branches.find((branch) => branch.id === branchId)?.branch_name ?? "Select branch";
  const supplierOptions = [...new Map([
    ...suppliers.map((supplier) => [supplier.id, { supplier_id: supplier.id, supplier_name: supplier.name }] as const),
    ...supplierMappings.filter((mapping) => mapping.branch_id === branchId).map((mapping) => [mapping.supplier_id, { supplier_id: mapping.supplier_id, supplier_name: mapping.supplier_name }] as const),
  ]).values()].sort((a, b) => a.supplier_name.localeCompare(b.supplier_name));
  const selectableItems = requestSupplierId ? items.filter((item) => supplierMappings.some((mapping) => mapping.branch_id === branchId && mapping.supplier_id === requestSupplierId && mapping.item_id === item.id)).map((item) => {
    const selectedSupplierMapping = supplierMappings.find((mapping) => mapping.branch_id === branchId && mapping.supplier_id === requestSupplierId && mapping.item_id === item.id);
    return {
      ...item,
      purchase_unit: selectedSupplierMapping?.purchase_uom || item.purchase_unit,
      supplier_name: selectedSupplierMapping?.supplier_name ?? item.supplier_name,
    };
  }) : [];
  const incompleteEnteredLines = lines.filter((line) => {
    const touched = Boolean(line.itemSearch.trim() || line.qty.trim() || line.uom.trim());
    return touched && (!line.itemSearch.trim() || !line.qty.trim() || !line.uom.trim());
  });
  const invalidQuantityLine = lines.find((line) => line.itemSearch.trim() && line.qty.trim() && (!Number.isFinite(Number(line.qty)) || Number(line.qty) <= 0));

  usePurchaseRequestGuidance(
    !branchId ? "Choose the request branch."
      : !requestSupplierId ? "Choose one supplier for this purchase request."
      : !hasRequestItem ? "Add at least one item before submitting this purchase request."
      : incompleteEnteredLines.length ? "Complete the item, quantity and unit for each entered line."
      : invalidQuantityLine ? "Enter a positive quantity for each request item."
      : "Review the request details, then submit to Manager Review."
  );

  function mappingsForLine(line: RequestLine) {
    return supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId && mapping.supplier_id === requestSupplierId);
  }

  function allowedUomsForLine(line: RequestLine) {
    const item = items.find((candidate) => candidate.id === line.itemId);
    const knownSystemUoms = line.itemId
      ? []
      : items.flatMap((candidate) => [candidate.purchase_unit, candidate.base_unit]);
    return uomOptionsForValues([
      line.uom,
      item?.purchase_unit,
      item?.base_unit,
      ...mappingsForLine(line).map((mapping) => mapping.purchase_uom),
      ...knownSystemUoms,
    ]);
  }

  function showValidationError(message: string, target: Exclude<RequestValidationTarget, null>) {
    setValidationError(message);
    setValidationTarget(target);
  }

  function validateSubmission(event: FormEvent<HTMLFormElement>) {
    if (!branchId) {
      event.preventDefault();
      showValidationError("Choose the request branch.", { field: "branch" });
      return;
    }
    if (!requestSupplierId) {
      event.preventDefault();
      setDetailsOpen(true);
      showValidationError("Choose one supplier for this purchase request.", { field: "supplier" });
      return;
    }
    if (incompleteEnteredLines.length) {
      event.preventDefault();
      const firstIncomplete = incompleteEnteredLines[0];
      const field = !firstIncomplete.itemSearch.trim() ? "item" : !firstIncomplete.qty.trim() ? "quantity" : "uom";
      showValidationError(`Complete line ${lines.findIndex((line) => line.key === firstIncomplete.key) + 1}: enter its ${field === "item" ? "item description" : field}.`, { field, lineKey: firstIncomplete.key });
      return;
    }
    if (invalidQuantityLine) {
      event.preventDefault();
      showValidationError(`Enter a quantity greater than zero for line ${lines.findIndex((line) => line.key === invalidQuantityLine.key) + 1}.`, { field: "quantity", lineKey: invalidQuantityLine.key });
      return;
    }
    if (hasRequestItem) {
      setValidationError("");
      setValidationTarget(null);
      return;
    }
    event.preventDefault();
    showValidationError("Add at least one item before continuing.", { field: "item", lineKey: lines[0]?.key });
  }

  useEffect(() => {
    function guardExternalSubmit(event: MouseEvent) {
      const target = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button[form="purchase-request-form"]') : null;
      if (!target || (branchId && requestSupplierId && hasRequestItem && !incompleteEnteredLines.length && !invalidQuantityLine)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!branchId) {
        setDetailsOpen(true);
        showValidationError("Choose the request branch.", { field: "branch" });
      } else if (!requestSupplierId) {
        setDetailsOpen(true);
        showValidationError("Choose one supplier for this purchase request.", { field: "supplier" });
      } else if (incompleteEnteredLines.length) {
        const firstIncomplete = incompleteEnteredLines[0];
        const field = !firstIncomplete.itemSearch.trim() ? "item" : !firstIncomplete.qty.trim() ? "quantity" : "uom";
        showValidationError(`Complete line ${lines.findIndex((line) => line.key === firstIncomplete.key) + 1}: enter its ${field === "item" ? "item description" : field}.`, { field, lineKey: firstIncomplete.key });
      } else if (invalidQuantityLine) {
        showValidationError(`Enter a quantity greater than zero for line ${lines.findIndex((line) => line.key === invalidQuantityLine.key) + 1}.`, { field: "quantity", lineKey: invalidQuantityLine.key });
      } else {
        showValidationError("Add at least one item before continuing.", { field: "item", lineKey: lines[0]?.key });
      }
    }

    document.addEventListener("click", guardExternalSubmit, true);
    return () => document.removeEventListener("click", guardExternalSubmit, true);
  }, [branchId, requestSupplierId, hasRequestItem, incompleteEnteredLines, invalidQuantityLine, lines]);

  useEffect(() => {
    if (validationError) setDetailsOpen(true);
  }, [validationError]);

  useEffect(() => {
    if (!validationTarget) return;
    const frame = window.requestAnimationFrame(() => {
      const selector = validationTarget.lineKey == null
        ? `[data-pr-field="${validationTarget.field}"]`
        : `[data-purchase-request-line-key="${validationTarget.lineKey}"] [data-pr-field="${validationTarget.field}"]`;
      const anchor = document.querySelector<HTMLElement>(selector);
      const target = anchor?.matches("input, select, textarea, button") ? anchor : anchor?.querySelector<HTMLElement>("input, select, textarea, button");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [validationTarget]);

  function updateLine(key: number, updates: Partial<RequestLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...updates } : line)));
  }

  function selectItem(key: number, value: string) {
    const query = value.trim().toLowerCase();
    // Resolve only against the branch + supplier catalogue presented by the
    // combobox. A typed exact code must never bypass that sourcing boundary.
    const selected =
      selectableItems.find((item) => item.id === value) ??
      selectableItems.find((item) => itemLabel(item).toLowerCase() === query) ??
      selectableItems.find((item) => [item.item_code, item.item_name].filter(Boolean).some((candidate) => String(candidate).toLowerCase() === query));

    if (!selected) {
      updateLine(key, { itemSearch: value, itemId: "", supplierId: "", cost: "0" });
      return;
    }

    setValidationError("");

    const validMappings = supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === selected.id && mapping.supplier_id === requestSupplierId);
    const automaticMapping = validMappings.find((mapping) => mapping.is_preferred) ?? validMappings[0] ?? null;
    updateLine(key, {
      itemId: selected.id,
      itemSearch: itemLabel(selected),
      uom: normalizeUom(automaticMapping?.purchase_uom || selected.purchase_unit || selected.base_unit),
      supplierId: requestSupplierId,
      cost: String(automaticMapping?.unit_cost ?? selected.cost ?? 0),
    });
  }

  function updateItemSearch(key: number, value: string) {
    updateLine(key, { itemSearch: value, itemId: "", supplierId: "", cost: "0", uom: "" });
  }

  function changeBranch(nextBranchId: string) {
    const clearedCount = lines.filter((line) => line.itemId || line.itemSearch.trim()).length;
    setBranchId(nextBranchId);
    setRequestSupplierId("");
    setContextResetNotice(clearedCount ? `${clearedCount} request line${clearedCount === 1 ? " was" : "s were"} cleared because the location changed. Choose a supplier and items mapped to the new location.` : "");
    if (nextBranchId && neededByDate) setDetailsOpen(false);
    setLines((current) => current.map((line) => {
      return {
        ...line,
        itemId: "", itemSearch: "", supplierId: "", cost: "0", uom: "",
      };
    }));
  }

  function changeRequestSupplier(nextSupplierId: string) {
    const nextSupplierName = supplierOptions.find((supplier) => supplier.supplier_id === nextSupplierId)?.supplier_name ?? "the selected supplier";
    const clearedLines = lines.filter((line) => line.itemId && !supplierMappings.some((candidate) => candidate.branch_id === branchId && candidate.supplier_id === nextSupplierId && candidate.item_id === line.itemId));
    setRequestSupplierId(nextSupplierId);
    setContextResetNotice(clearedLines.length
      ? `${clearedLines.length} request line${clearedLines.length === 1 ? " was" : "s were"} cleared because ${nextSupplierName} does not supply ${clearedLines.length === 1 ? "the item" : "those items"} at ${selectedBranchName}. Choose an item from the mapped catalogue; Purchasing can confirm the supplier route during review.`
      : "");
    setLines((current) => current.map((line) => {
      const mapping = supplierMappings.find((candidate) => candidate.branch_id === branchId && candidate.supplier_id === nextSupplierId && candidate.item_id === line.itemId);
      const item = items.find((candidate) => candidate.id === line.itemId);
      if (!mapping && line.itemId) return { ...line, itemId: "", itemSearch: "", qty: "", uom: "", supplierId: "", cost: "0" };
      if (!mapping) return { ...line, supplierId: nextSupplierId, cost: String(item?.cost ?? line.cost), uom: normalizeUom(line.uom || item?.purchase_unit || item?.base_unit || "") };
      return { ...line, supplierId: nextSupplierId, cost: String(mapping.unit_cost), uom: normalizeUom(mapping.purchase_uom || line.uom) };
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

  function selectLineUom(key: number, value: string) {
    const line = lines.find((row) => row.key === key);
    if (!line) return;
    const uom = normalizeUom(value);
    const compatibleMappings = mappingsForLine(line).filter((mapping) => normalizeUom(mapping.purchase_uom) === uom);
    const currentMapping = compatibleMappings.find((mapping) => mapping.supplier_id === line.supplierId);
    const automaticMapping = currentMapping ?? compatibleMappings.find((mapping) => mapping.is_preferred) ?? compatibleMappings[0] ?? null;
    updateLine(key, {
      uom,
      supplierId: requestSupplierId,
      cost: String(automaticMapping?.unit_cost ?? line.cost),
    });
  }

  return (
    <div className="md:-mt-3 xl:mt-0">
        <form id="purchase-request-form" action={action} onSubmit={validateSubmission} noValidate className={`space-y-3 ${reserveMobileActionSpace ? "pb-36" : ""} md:pb-0`}>
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="request_date" value={initialRequestDate ?? getToday()} />
          <input type="hidden" name="required_date" value={initialRequiredDate ?? ""} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="urgency_reason" value={initialUrgencyReason ?? ""} />
          <input type="hidden" name="production_risk" value={initialProductionRisk ? "on" : ""} />
          <input type="hidden" name="expected_updated_at" value={initialUpdatedAt ?? ""} />
          <section data-purchase-request-setup className="sb-work-surface overflow-hidden">
            <div data-document-section-header className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-[var(--sb-text)]">Request Details</h2>
                {!detailsOpen ? (
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex min-w-0 items-center gap-1"><MapPin className="h-3.5 w-3.5 shrink-0" /><span className="break-words">{selectedBranchName}</span></span>
                    <span className="inline-flex min-w-0 items-center gap-1"><Building2 className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{supplierOptions.find((supplier) => supplier.supplier_id === requestSupplierId)?.supplier_name ?? "Supplier not set"}</span></span>
                    <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5 shrink-0" />{neededByDate || "Date not set"}</span>
                    <span className="font-medium capitalize text-[var(--sb-text)]">{priority}</span>
                  </div>
                ) : null}
              </div>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-expanded={detailsOpen} aria-label={detailsOpen ? "Collapse request details" : "Expand request details"} onClick={() => setDetailsOpen((open) => !open)}>
                <ChevronDown className={`h-4 w-4 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
              </Button>
            </div>
            <div className={`${detailsOpen ? "grid" : "hidden"} grid-cols-1 gap-3 p-3 sm:grid-cols-2 lg:grid-cols-4`}>
            <Field label="Request branch" required>
                <SelectNative data-pr-field="branch" name="branch_id" aria-label="Request branch" aria-invalid={validationTarget?.field === "branch" || undefined} className={validationTarget?.field === "branch" ? "border-rose-500 ring-2 ring-rose-200" : ""} value={branchId} onChange={(event) => { setValidationError(""); setValidationTarget(null); changeBranch(event.target.value); }} required disabled={lockBranch}>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
                {lockBranch ? <input type="hidden" name="branch_id" value={branchId} /> : null}
            </Field>
            <Field label="Supplier" required>
              <SelectNative data-pr-field="supplier" name="request_supplier_id" aria-label="Request supplier" aria-invalid={validationTarget?.field === "supplier" || undefined} className={validationTarget?.field === "supplier" ? "border-rose-500 ring-2 ring-rose-200" : ""} value={requestSupplierId} onChange={(event) => { setValidationError(""); setValidationTarget(null); changeRequestSupplier(event.target.value); }} required>
                <option value="">Choose supplier</option>
                {supplierOptions.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</option>)}
              </SelectNative>
              {validationTarget?.field === "supplier" ? <p className="text-[11px] font-medium text-rose-700">Choose the suggested supplier. Purchasing can confirm the final route during review.</p> : null}
            </Field>
            <Field label="Needed By">
              <Input name="needed_by_date" type="date" value={neededByDate} onChange={(event) => changeNeededByDate(event.target.value)} />
            </Field>
            <Field label="Urgency"><UrgencySelect value={priority} onValueChange={setPriority} /></Field>
            <Field label="Remarks" className="sm:col-span-2 lg:col-span-4">
              <Textarea className="min-h-[3.75rem] resize-y" rows={2} name="remarks" defaultValue={initialRemarks ?? ""} placeholder="Reason or instructions for this request" />
            </Field>
            </div>
          </section>

          {validationError ? (
            <div role="alert" className="border border-destructive/35 bg-destructive/5 px-3 py-2 text-sm font-medium text-destructive">
              {validationError}
            </div>
          ) : null}
          {contextResetNotice ? <div role="status" className="flex items-start justify-between gap-3 border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2 text-xs text-[var(--sb-text)]"><p>{contextResetNotice}</p><button type="button" className="shrink-0 font-semibold text-primary hover:underline" onClick={() => setContextResetNotice("")} aria-label="Dismiss catalogue change notice">Dismiss</button></div> : null}

          <section data-purchase-request-workspace className="sb-work-surface overflow-hidden">
            <div data-document-section-header className="flex min-h-14 items-center justify-between border-b bg-white px-3 py-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--sb-text)]">Requested Items</h2>
              </div>
              <span />
            </div>
            <div
              data-purchase-request-line-header
              className="hidden grid-cols-[1.5rem_minmax(10rem,1fr)_10rem_8.5rem_2.75rem_2.75rem] gap-3 border-b border-[var(--sb-border-soft)] bg-[var(--sb-surface-subtle)] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--sb-text-muted)] lg:grid"
            >
              <span>#</span>
              <span>Item</span>
              <span>Quantity</span>
              <span>UOM</span>
              <span className="sr-only">Line actions</span>
            </div>
            <div className="divide-y">
              {/* Legacy contract token: grid-cols-[minmax(0,1fr)_7.5rem_2.25rem]. The current four-column line keeps UOM, quantity, comments, and removal aligned. */}
              {lines.map((line, index) => (
                <div data-purchase-request-line data-purchase-request-line-key={line.key} key={line.key} className="grid grid-cols-[1.25rem_minmax(8.25rem,1fr)_minmax(3.5rem,.65fr)_2.75rem] gap-2 p-3 lg:grid-cols-[1.5rem_minmax(10rem,1fr)_10rem_8.5rem_2.75rem_2.75rem] lg:gap-3">
                  <span data-pr-line-number className="grid h-10 place-items-center self-start"><span className="grid h-6 w-6 place-items-center rounded-[var(--sb-radius-control)] bg-[var(--sb-surface-muted)] text-[11px] font-semibold tabular-nums text-[var(--sb-text-muted)]">{index + 1}</span></span>
                  <div data-pr-line-item className="col-span-2 col-start-2 min-w-0 space-y-2 lg:col-span-1 lg:col-start-2">
                    <Field label="Item" required labelClassName="sr-only">
                      <div data-pr-field="item"><ItemCombobox items={selectableItems} value={line.itemSearch} selectedItemId={line.itemId} ariaLabel={`Item for request line ${index + 1}`} ariaInvalid={validationTarget?.field === "item" && validationTarget.lineKey === line.key} className={validationTarget?.field === "item" && validationTarget.lineKey === line.key ? "border-rose-500 ring-2 ring-rose-200" : ""} inputRef={line.key === lines[0]?.key ? firstItemInputRef : undefined} emptyMessage="No item is mapped to this supplier at this branch." onValueChange={(value) => { setValidationError(""); setValidationTarget(null); updateItemSearch(line.key, value); }} onSelect={(item) => { setValidationError(""); setValidationTarget(null); selectItem(line.key, item.id); }} /></div>
                    </Field>
                    {line.itemId && mappingsForLine(line).some((mapping) => !line.uom || normalizeUom(mapping.purchase_uom) === line.uom) ? (() => {
                      const compatibleMappings = mappingsForLine(line).filter((mapping) => !line.uom || normalizeUom(mapping.purchase_uom) === line.uom);
                      const selectedMapping = compatibleMappings.find((mapping) => mapping.supplier_id === line.supplierId)
                        ?? compatibleMappings.find((mapping) => mapping.is_preferred)
                        ?? compatibleMappings[0];
                      return <p data-pr-line-supplier className="text-[11px] leading-4 text-muted-foreground">{selectedMapping?.supplier_name ?? "Supplier pending"}{selectedMapping?.is_preferred ? " · Preferred" : ""}{selectedMapping?.conversion_to_base_uom && selectedMapping.conversion_to_base_uom !== 1 ? ` · 1 ${selectedMapping.purchase_uom} = ${selectedMapping.conversion_to_base_uom} base` : ""}</p>;
                    })() : null}
                    <input type="hidden" name="line_item_id" value={line.itemId} />
                    <input type="hidden" name="line_description" value={line.itemSearch} />
                    <input type="hidden" name="line_branch_id" value={branchId} />
                  </div>
                    <Field label="Quantity" required labelClassName="sr-only" className="pr-line-quantity row-start-2 lg:col-start-3 lg:row-start-1">
                      <div className="flex h-[var(--sb-control-height)] overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white">
                        <button type="button" className="flex h-full w-10 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] lg:w-10" onClick={() => adjustLineQuantity(line, -1)} aria-label={`Decrease quantity for ${line.itemSearch || "request line"}`}><Minus className="h-3.5 w-3.5" /></button>
                        <Input data-pr-field="quantity" name="line_qty" aria-label={`Quantity for ${line.itemSearch || `request line ${index + 1}`}`} aria-invalid={validationTarget?.field === "quantity" && validationTarget.lineKey === line.key || undefined} type="number" min="0" step={requestQuantityStep(line.uom)} value={line.qty} onChange={(event) => { setValidationError(""); setValidationTarget(null); updateLine(line.key, { qty: event.target.value }); }} placeholder="Qty" className={`h-full min-w-0 rounded-none border-0 px-1 text-center text-xs font-semibold tabular-nums shadow-none focus-visible:ring-inset ${validationTarget?.field === "quantity" && validationTarget.lineKey === line.key ? "ring-2 ring-inset ring-rose-300" : ""}`} />
                        <button type="button" className="flex h-full w-10 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)] lg:w-10" onClick={() => adjustLineQuantity(line, 1)} aria-label={`Increase quantity for ${line.itemSearch || "request line"}`}><Plus className="h-3.5 w-3.5" /></button>
                      </div>
                    </Field>
                    <Field label="UOM" labelClassName="sr-only" className="pr-line-uom row-start-3 lg:col-start-4 lg:row-start-1">
                      <SelectNative data-pr-field="uom" name="line_uom" value={line.uom} aria-invalid={validationTarget?.field === "uom" && validationTarget.lineKey === line.key || undefined} className={validationTarget?.field === "uom" && validationTarget.lineKey === line.key ? "border-rose-500 ring-2 ring-rose-200" : ""} onChange={(event) => { setValidationError(""); setValidationTarget(null); selectLineUom(line.key, event.target.value); }} aria-label={`Unit of measure for ${line.itemSearch || "request line"}`}>
                        <option value="">Choose unit</option>
                        {allowedUomsForLine(line).map((uom) => <option key={uom} value={uom}>{uom.toUpperCase()}</option>)}
                      </SelectNative>
                    </Field>
                  {validationTarget?.lineKey === line.key && ["item", "quantity", "uom"].includes(validationTarget.field) ? <p className="col-span-full text-[11px] font-medium text-rose-700">Complete this line before continuing.</p> : null}
                  <input type="hidden" name="line_suggested_supplier_id" value={line.supplierId} />
                  <input type="hidden" name="line_estimated_unit_cost" value={line.cost} />
                  <details className="hidden" aria-hidden="true"><summary>Sourcing details <span>(automatic)</span></summary><div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(4.75rem,0.7fr)_2.75rem]" /><span>Line note <span className="font-normal">(optional)</span></span></details>
                  <div data-pr-line-actions className="col-start-4 row-span-2 row-start-1 grid content-start gap-1.5 lg:contents">
                    {lines.length > 1 ? <Button type="button" variant="outline" size="icon" className="order-1 h-[var(--sb-control-height)] w-[var(--sb-control-height)] text-muted-foreground lg:col-start-6 lg:row-start-1" aria-label="Remove line" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><X className="h-4 w-4" /></Button> : <span className="h-[var(--sb-control-height)] w-[var(--sb-control-height)] lg:col-start-6 lg:row-start-1" aria-hidden="true" />}
                    <Button type="button" variant="outline" size="icon" className="order-2 h-[var(--sb-control-height)] w-[var(--sb-control-height)] text-muted-foreground lg:col-start-5 lg:row-start-1" aria-label={`Add comment for ${line.itemSearch || "request line"}`} onClick={() => setCommentLineKey((current) => current === line.key ? null : line.key)}><MessageSquare className="h-4 w-4" /></Button>
                  </div>
                  {commentLineKey === line.key ? <Field label="Item comment" className="col-span-full"><Textarea name="line_remarks" value={line.remarks} onChange={(event) => updateLine(line.key, { remarks: event.target.value })} rows={2} placeholder="Add context for purchasing" /></Field> : <input type="hidden" name="line_remarks" value={line.remarks} />}
                  {line.itemId && mappingsForLine(line).length === 0 ? <div className="col-span-full grid min-w-0 gap-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-warning)]/35 bg-[var(--sb-warning-bg)] px-3 py-2.5 text-xs text-[var(--sb-warning)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="min-w-0"><p className="font-semibold">Purchasing to confirm</p><p className="mt-0.5 leading-relaxed">No supplier route is configured for this branch yet. You can submit the request; Purchasing will confirm the supplier term during review.</p></div><Button asChild type="button" variant="outline" size="sm" className="h-[var(--sb-control-height)] w-full border-[var(--sb-warning)]/50 text-xs text-[var(--sb-warning)] sm:w-auto"><Link href={`/supplier-items/new?itemId=${line.itemId}&branchId=${branchId}`}>Open supplier mapping</Link></Button></div> : null}
                  {line.itemId && line.uom && mappingsForLine(line).length > 0 && !mappingsForLine(line).some((mapping) => normalizeUom(mapping.purchase_uom) === line.uom) ? <div className="col-span-full grid min-w-0 gap-2 rounded-[var(--sb-radius-control)] border border-[var(--sb-warning)]/35 bg-[var(--sb-warning-bg)] px-3 py-2 text-xs font-medium text-[var(--sb-warning)] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><p>{line.uom.toUpperCase()} is not mapped for this branch. Purchasing will confirm the purchase UOM.</p><Link href={`/supplier-items/new?itemId=${line.itemId}&branchId=${branchId}`} className="inline-flex min-h-[var(--sb-control-height)] items-center justify-center font-semibold underline underline-offset-2 sm:justify-self-end">Set supplier UOM</Link></div> : null}
                  <input type="hidden" name="line_reason" value={line.reason} />
                </div>
              ))}
            </div>
            <div className="flex justify-end border-t border-[var(--sb-border-soft)] px-3 py-2">
              <Button type="button" variant="outline" size="sm" className="h-9 px-2.5" onClick={addLine} aria-label="Add request line">
                <Plus className="h-4 w-4" />
                Add line
              </Button>
            </div>
          </section>

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
  action: (previousState: { error: string | null; attempt: number }, formData: FormData) => Promise<{ error: string | null; attempt: number }>;
}) {
  const [actionState, formAction] = useActionState(action, { error: null, attempt: 0 });
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [branchId, setBranchId] = useState(branches[0]?.id ?? "");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([""]);
  const [selectedItemUoms, setSelectedItemUoms] = useState<string[]>([""]);
  const [itemQueries, setItemQueries] = useState<string[]>([""]);
  const [lineComments, setLineComments] = useState<string[]>([""]);
  const [supplierId, setSupplierId] = useState("");
  const [catalogueNotice,setCatalogueNotice]=useState("");
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [orderDate, setOrderDate] = useState(getToday());
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [dismissedErrorAttempt, setDismissedErrorAttempt] = useState(0);
  const selectedItemPairs = selectedItemIds.map((itemId, index) => ({ itemId, index })).filter((row) => Boolean(row.itemId));
  const selectedItems = selectedItemPairs.map((row) => row.itemId);
  const eligibleSupplierIds = [...new Set(supplierMappings.filter((mapping) => mapping.branch_id === branchId).map((mapping) => mapping.supplier_id))];
  const currentSupplier = supplierId ? supplierMappings.find((mapping) => mapping.supplier_id === supplierId) : null;
  const eligibleSuppliers = eligibleSupplierIds
    .map((id) => supplierMappings.find((mapping) => mapping.branch_id === branchId && mapping.supplier_id === id))
    .filter((mapping): mapping is BranchSupplierMappingOption => Boolean(mapping))
    .concat(currentSupplier && !eligibleSupplierIds.includes(currentSupplier.supplier_id) ? [currentSupplier] : [])
    .sort((left, right) => left.supplier_name.localeCompare(right.supplier_name, "en", { sensitivity: "base", numeric: true }));
  const supplierItems = supplierId ? items.filter(item=>supplierMappings.some(mapping=>mapping.branch_id===branchId&&mapping.supplier_id===supplierId&&mapping.item_id===item.id)).map(item=>{const mapping=supplierMappings.find(candidate=>candidate.branch_id===branchId&&candidate.supplier_id===supplierId&&candidate.item_id===item.id);return{...item,supplier_name:mapping?.supplier_name??item.supplier_name,purchase_unit:mapping?.purchase_uom??item.purchase_unit};}) : [];
  const uncoveredItems = selectedItemPairs.filter(({ itemId }) => !supplierMappings.some((mapping) => mapping.branch_id === branchId && mapping.supplier_id === supplierId && mapping.item_id === itemId));
  const selectedItemLabels = (rows: typeof uncoveredItems) => rows.map(({ itemId }) => items.find((item) => item.id === itemId)?.item_name ?? "Selected item");
  function uomOptions(itemId: string) {
    return uomOptionsForValues([
      items.find((item) => item.id === itemId)?.purchase_unit,
      items.find((item) => item.id === itemId)?.base_unit,
      ...supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.supplier_id === supplierId && mapping.item_id === itemId).map((mapping) => mapping.purchase_uom),
    ]);
  }

  function preferredUom(itemId: string) {
    const item = items.find((candidate) => candidate.id === itemId);
    const supplierOptions = supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.supplier_id === supplierId && mapping.item_id === itemId);
    const preferredMapping = supplierOptions.find((mapping) => mapping.is_preferred) ?? supplierOptions[0];
    return normalizeUom(preferredMapping?.purchase_uom || item?.purchase_unit || item?.base_unit || "");
  }

  return (
    <div className="min-w-0">
        <form id="purchase-order-form" action={formAction} className="grid gap-3">
          <input hidden type="hidden" name="idempotency_key" value={idempotencyKey} />
          {actionState.error && actionState.attempt !== dismissedErrorAttempt ? <Notice tone="error" title="Purchase order not created"><p>{actionState.error}</p><p className="mt-1 font-medium">Your entries are still here. Review the selected branch, supplier, and items, then try again.</p></Notice> : null}
          <section data-purchase-order-form-surface className="sb-work-surface overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-[var(--sb-border-soft)] bg-white px-3 py-2">
            <div className="min-w-0"><h2 className="text-sm font-semibold text-[var(--sb-text)]">Order details</h2>{!detailsOpen ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{branches.find((branch) => branch.id === branchId)?.branch_name ?? "Branch not set"} · {eligibleSuppliers.find((supplier) => supplier.supplier_id === supplierId)?.supplier_name ?? "Supplier not set"} · {orderDate}{expectedDeliveryDate ? ` → ${expectedDeliveryDate}` : ""}</p> : null}</div>
            <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-expanded={detailsOpen} aria-label={detailsOpen ? "Collapse order details" : "Expand order details"} onClick={() => setDetailsOpen((current) => !current)}><ChevronDown className={`h-4 w-4 transition-transform motion-reduce:transition-none ${detailsOpen ? "rotate-180" : ""}`} aria-hidden="true" /></Button>
          </div>
          <div data-purchase-order-setup className={`grid grid-cols-2 gap-3 p-3 md:grid-cols-3 md:p-4 ${detailsOpen ? "" : "hidden"}`}>
            <Field label="AutoCount PO Number" required className="col-span-2 md:col-span-3">
              <Input name="po_no" required maxLength={64} autoComplete="off" placeholder="e.g. PO - 000207" />
              <p className="mt-1 text-xs text-muted-foreground">Use the exact PO number from AutoCount. OMS will not generate or replace it.</p>
            </Field>
            <Field label="Branch" required>
              <SelectNative name="branch_id" value={branchId} onChange={(event) => { setBranchId(event.target.value); setDismissedErrorAttempt(actionState.attempt); setCatalogueNotice("Branch changed. Your supplier and item lines were kept for review."); }} required>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
              </SelectNative>
            </Field>
            <Field label="Supplier" required className="col-span-1 md:col-span-2">
              <SelectNative name="supplier_id" value={supplierId} onChange={(event) => {setSupplierId(event.target.value);setDismissedErrorAttempt(actionState.attempt);setCatalogueNotice("Supplier changed. Existing item lines were kept so you can review or replace them.");}} required>
                <option value="">Select supplier</option>
                {eligibleSuppliers.map((supplier) => <option key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</option>)}
              </SelectNative>
            </Field>
              <div className="col-span-2 grid grid-cols-2 gap-3 border-t border-[var(--sb-border-soft)] pt-3 md:col-span-3 md:grid-cols-3">
                <Field label="Order Date" required>
                  <Input name="order_date" type="date" value={orderDate} onChange={(event) => setOrderDate(event.target.value)} required />
                </Field>
                <Field label="Expected Delivery">
                  <Input name="expected_delivery_date" type="date" value={expectedDeliveryDate} onChange={(event) => setExpectedDeliveryDate(event.target.value)} />
                </Field>
                <Field label="Remarks" className="col-span-2 md:col-span-3">
                  <Textarea name="remarks" placeholder="Supplier ordering remarks" />
                </Field>
              </div>
          </div>
          </section>

          {catalogueNotice?<div role="status" className="flex items-center justify-between gap-3 border border-[var(--sb-border-soft)] bg-[var(--sb-surface-muted)] px-3 py-2 text-xs"><span>{catalogueNotice}</span><button type="button" className="font-semibold text-[var(--sb-link)]" onClick={()=>setCatalogueNotice("")}>Dismiss</button></div>:null}

          <section data-purchase-order-lines className="sb-work-surface overflow-hidden">
            <div className="border-b bg-white px-3 py-2"><p className="text-xs font-semibold">Ordered Items</p></div>
            <div className="hidden grid-cols-[36px_minmax(10rem,1.25fr)_92px_84px_100px_minmax(10rem,1fr)_40px] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-[11px] font-medium text-muted-foreground md:grid">
              <span>#</span><span>Item</span><span>Ordered Qty</span><span>UOM</span><span>Unit Price</span><span>Comment</span><span aria-hidden="true" />
            </div>
            <div className="divide-y">
              {selectedItemIds.map((itemId, index) => {
                const selectedItem = items.find((item) => item.id === itemId);
                const options = uomOptions(itemId);
                const lineUom = normalizeUom(selectedItemUoms[index] || preferredUom(itemId));
                return (
                  <div key={index} className="grid grid-cols-[2rem_minmax(0,1fr)_2.25rem] gap-2 p-3 md:grid-cols-[36px_minmax(10rem,1.25fr)_92px_84px_100px_minmax(10rem,1fr)_40px]">
                    <span className="col-start-1 row-start-1 flex h-[var(--sb-control-height)] items-center justify-center text-xs font-medium tabular-nums text-muted-foreground">{index + 1}</span>
                    <div className="col-start-2 row-start-1 min-w-0 md:col-start-2">
                      <Field label="Item" required={index === 0} labelClassName="md:sr-only">
                        <ItemCombobox name="line_item_id" items={supplierItems} value={itemQueries[index]??""} selectedItemId={itemId} ariaLabel={`Item for purchase order line ${index+1}`} placeholder={supplierId?"Search supplier item name or code":"Select supplier first"} emptyMessage={supplierId?"No item from this supplier matches your search.":"Select a supplier before adding items."} onValueChange={value=>{const queries=[...itemQueries];queries[index]=value;setItemQueries(queries);const ids=[...selectedItemIds];ids[index]="";setSelectedItemIds(ids);setDismissedErrorAttempt(actionState.attempt)}} onSelect={item=>{const ids=[...selectedItemIds];ids[index]=item.id;setSelectedItemIds(ids);const queries=[...itemQueries];queries[index]=`${item.item_code} - ${item.item_name}`;setItemQueries(queries);const uoms=[...selectedItemUoms];uoms[index]=normalizeUom(item.purchase_unit||item.base_unit);setSelectedItemUoms(uoms);setDismissedErrorAttempt(actionState.attempt)}} />
                      </Field>
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="col-start-3 row-start-1 h-10 w-9 self-end text-muted-foreground md:col-start-7" aria-label="Remove order line" disabled={selectedItemIds.length === 1} onClick={() => { setSelectedItemIds((current) => current.filter((_, rowIndex) => rowIndex !== index)); setSelectedItemUoms((current) => current.filter((_, rowIndex) => rowIndex !== index));setItemQueries(current=>current.filter((_,rowIndex)=>rowIndex!==index));setLineComments(current=>current.filter((_,rowIndex)=>rowIndex!==index)); }}><X className="h-4 w-4" /></Button>
                    <div className="col-span-2 col-start-2 row-start-2 grid grid-cols-[minmax(0,1fr)_minmax(5rem,0.8fr)_minmax(0,1fr)] gap-2 md:contents">
                      <Field label="Ordered Qty" required={index === 0} labelClassName="md:sr-only" className="min-w-0 md:col-start-3 md:row-start-1">
                        <Input name="line_qty_ordered" type="number" inputMode="decimal" min="0.0001" step="0.0001" placeholder="Qty" required={index === 0} />
                      </Field>
                      <Field label="UOM" required={Boolean(itemId)} labelClassName="md:sr-only" className="min-w-0 md:col-start-4 md:row-start-1">
                        {itemId ? <SelectNative name="line_uom" value={lineUom} onChange={(event) => { const next = [...selectedItemUoms]; next[index] = normalizeUom(event.target.value); setSelectedItemUoms(next); setDismissedErrorAttempt(actionState.attempt); }} aria-label={`Unit of measure for ${selectedItem?.item_name ?? "order line"}`} className="w-full text-xs" disabled={!options.length}><option value="">Choose UOM</option>{options.map((uom) => <option key={uom} value={uom}>{uom.toUpperCase()}</option>)}</SelectNative> : <SelectNative aria-label={`Unit of measure for order line ${index + 1}`} disabled><option>UOM</option></SelectNative>}
                      </Field>
                      <Field label="Unit Price" labelClassName="md:sr-only" className="min-w-0 md:col-start-5 md:row-start-1">
                        <Input name="line_unit_price" type="number" inputMode="decimal" min="0" step="0.0001" placeholder="0.00" defaultValue={0} />
                      </Field>
                      <Field label="Comment" labelClassName="md:sr-only" className="col-span-3 min-w-0 md:col-span-1 md:col-start-6 md:row-start-1">
                        <Input name="line_remarks" value={lineComments[index] ?? ""} onChange={(event) => { const next = [...lineComments]; next[index] = event.target.value; setLineComments(next); }} maxLength={2000} placeholder="Optional" />
                      </Field>
                    </div>
                    <input type="hidden" name="line_qty_received" value="0" />
                    <input type="hidden" name="line_qty_cancelled" value="0" />
                    {!itemId ? <input type="hidden" name="line_uom" value="" /> : null}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-end border-t bg-white px-3 py-2">
              <Button type="button" variant="outline" size="sm" disabled={!supplierId} onClick={() => { setSelectedItemIds((current) => [...current, ""]); setSelectedItemUoms((current) => [...current, ""]);setItemQueries(current=>[...current,""]);setLineComments(current=>[...current,""]); }} aria-label="Add order line at end">
                <Plus className="h-4 w-4" /> Add line
              </Button>
            </div>
          </section>

          {selectedItems.length > 0 && supplierId && uncoveredItems.length > 0 ? <div role="alert" className="border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-xs leading-relaxed text-destructive"><p className="font-semibold">Review this supplier selection.</p><p className="mt-1">The selected supplier is not mapped to this branch for: {selectedItemLabels(uncoveredItems).join(", ")}.</p><p className="mt-1">Your lines are kept so you can change the branch, supplier, or item.</p><Link href="/imports/branch-supplier-items" className="mt-1 inline-flex font-semibold underline underline-offset-2">Open supplier mapping import</Link></div> : null}
        </form>
    </div>
  );
}
