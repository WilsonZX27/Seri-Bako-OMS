"use client";

import { useState } from "react";
import { Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { UrgencySelect } from "@/components/urgency-select";
import type { ProcurementPriority } from "@/components/priority-badge";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
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

function today() {
  return new Date().toISOString().slice(0, 10);
}

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
        const supplierStillValid = supplierMappings.some((mapping) => mapping.branch_id === resolvedInitialBranchId && mapping.item_id === row.itemId && mapping.supplier_id === row.supplierId);
        return supplierStillValid ? row : { ...row, supplierId: "" };
      })
    : [];
  const [lines, setLines] = useState<RequestLine[]>(initialRows.length ? initialRows : [{ ...createBlankLine(0) }]);
  const [priority, setPriority] = useState<ProcurementPriority>(initialPriority ?? "normal");
  const [branchId, setBranchId] = useState(resolvedInitialBranchId);
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), 0) + 1;

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

    const validMappings = supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === selected.id);
    const automaticMapping = validMappings.find((mapping) => mapping.is_preferred) ?? validMappings[0] ?? null;
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
    setLines((current) => current.map((line) => {
      const validMappings = supplierMappings.filter((mapping) => mapping.branch_id === nextBranchId && mapping.item_id === line.itemId);
      const automaticMapping = validMappings.find((mapping) => mapping.is_preferred) ?? validMappings[0] ?? null;
      return {
        ...line,
        supplierId: automaticMapping?.supplier_id ?? "",
        cost: String(automaticMapping?.unit_cost ?? line.cost),
        uom: normalizeUom(automaticMapping?.purchase_uom || line.uom),
      };
    }));
  }

  function addLine() {
    setLines((current) => [...current, createBlankLine(nextKey)]);
  }

  function adjustLineQuantity(line: RequestLine, direction: -1 | 1) {
    const currentQuantity = Number(line.qty);
    const base = Number.isFinite(currentQuantity) ? currentQuantity : 0;
    updateLine(line.key, { qty: formatRequestQuantity(base + (requestQuantityStep(line.uom) * direction), line.uom) });
  }

  return (
    <div className="md:rounded-[2px] md:border md:bg-white md:p-5">
        <form id="purchase-request-form" action={action} className="space-y-3 pb-36 md:pb-0">
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="request_date" value={initialRequestDate ?? today()} />
          <input type="hidden" name="required_date" value={initialRequiredDate ?? ""} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="urgency_reason" value={initialUrgencyReason ?? ""} />
          <input type="hidden" name="production_risk" value={initialProductionRisk ? "on" : ""} />
          <input type="hidden" name="expected_updated_at" value={initialUpdatedAt ?? ""} />
          <section data-purchase-request-setup className="space-y-3 border-y border-[var(--sb-border)] bg-white p-3 md:border-0 md:bg-transparent md:p-0">
            <div className="border-b border-[var(--sb-border-soft)] pb-2">
              <h2 className="text-sm font-semibold">Request details</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]">
              <div className="order-1"><Field label="Needed By">
                <Input name="needed_by_date" type="date" defaultValue={initialNeededByDate ?? ""} />
              </Field></div>
              <div className="order-3 col-span-2 sm:order-2 sm:col-span-1"><Field label="Branch" required>
                <SelectNative name="branch_id" value={branchId} onChange={(event) => changeBranch(event.target.value)} required disabled={lockBranch}>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
                {lockBranch ? <input type="hidden" name="branch_id" value={branchId} /> : null}
              </Field></div>
              <div className="order-2 sm:order-3"><Field label="Urgency"><UrgencySelect value={priority} onValueChange={setPriority} /></Field></div>
            </div>
            <Field label="Remarks">
              <Textarea className="min-h-[3.75rem] resize-y" rows={2} name="remarks" defaultValue={initialRemarks ?? ""} placeholder="Reason or instructions for this request" />
            </Field>
          </section>

          <section data-purchase-request-workspace className="overflow-hidden border-y border-[var(--sb-border)] bg-white md:rounded-[2px] md:border">
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
            <div className="divide-y">
              {lines.map((line) => (
                <div key={line.key} className="relative grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2 p-3 md:grid-cols-[minmax(0,1fr)_112px_40px] md:gap-3">
                  <div className="min-w-0 pr-9 md:pr-0">
                    <Field label="Item" required>
                      <Input
                        list="purchase-request-items"
                        value={line.itemSearch}
                        onChange={(event) => selectItem(line.key, event.target.value)}
                        placeholder="Search by item code or item name"
                      />
                    </Field>
                    <input type="hidden" name="line_item_id" value={line.itemId} />
                    <input type="hidden" name="line_branch_id" value={branchId} />
                  </div>
                    <Field label="Quantity" required className="md:col-start-2">
                      <div className="flex overflow-hidden rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white md:rounded-[2px]">
                        <button type="button" className="flex h-[var(--sb-control-height)] w-10 shrink-0 items-center justify-center border-r border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustLineQuantity(line, -1)} aria-label={`Decrease quantity for ${line.itemSearch || "request line"}`}><Minus className="h-4 w-4" /></button>
                        <Input name="line_qty" type="number" min="0" step={requestQuantityStep(line.uom)} value={line.qty} onChange={(event) => updateLine(line.key, { qty: event.target.value })} placeholder="Qty" className="min-w-0 rounded-none border-0 px-2 text-center font-semibold tabular-nums shadow-none focus-visible:ring-inset" />
                        <button type="button" className="flex h-[var(--sb-control-height)] w-10 shrink-0 items-center justify-center border-l border-[var(--sb-border)] text-[var(--sb-green-900)] hover:bg-[var(--sb-surface-muted)] active:bg-[var(--sb-green-100)]" onClick={() => adjustLineQuantity(line, 1)} aria-label={`Increase quantity for ${line.itemSearch || "request line"}`}><Plus className="h-4 w-4" /></button>
                      </div>
                    </Field>
                  <input type="hidden" name="line_suggested_supplier_id" value={line.supplierId} />
                  <input type="hidden" name="line_estimated_unit_cost" value={line.cost} />
                  <input type="hidden" name="line_uom" value={line.uom} />
                  <input type="hidden" name="line_remarks" value={line.remarks} />
                  <details className="hidden" aria-hidden="true"><summary>Sourcing details <span>(automatic)</span></summary><div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.8fr)_minmax(4.75rem,0.7fr)_2.75rem]" /><span>Line note <span className="font-normal">(optional)</span></span></details>
                  {lines.length > 1 ? <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-[var(--sb-control-height)] w-[var(--sb-control-height)] text-muted-foreground md:static md:col-start-3 md:row-start-1 md:self-end" aria-label="Remove line" onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}><X className="h-4 w-4" /></Button> : null}
                  {line.itemId && !supplierMappings.some((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId) ? <p className="col-span-2 md:col-span-3 text-xs font-medium text-destructive">No supplier is mapped to this item for the selected branch. Add a Branch Supplier Mapping before submitting.</p> : null}
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
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(["", "", "", "", ""]);
  const [supplierId, setSupplierId] = useState("");
  const selectedItems = selectedItemIds.filter(Boolean);
  const eligibleSupplierIds = [...new Set(supplierMappings.filter((mapping) => mapping.branch_id === branchId && selectedItems.every((itemId) => supplierMappings.some((candidate) => candidate.branch_id === branchId && candidate.item_id === itemId && candidate.supplier_id === mapping.supplier_id))).map((mapping) => mapping.supplier_id))];
  const eligibleSuppliers = eligibleSupplierIds.map((id) => supplierMappings.find((mapping) => mapping.branch_id === branchId && mapping.supplier_id === id)).filter((mapping): mapping is BranchSupplierMappingOption => Boolean(mapping));
  return (
    <Card>
      <CardContent className="p-5">
        <form id="purchase-order-form" action={action} className="space-y-3">
          <input type="hidden" name="po_no" value={poNo} />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="status" value="draft" />
          <input type="hidden" name="approval_status" value="draft" />
          <div className="grid gap-3 md:grid-cols-2">
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
            <Field label="Order Date" required>
              <Input name="order_date" type="date" defaultValue={today()} required />
            </Field>
            <Field label="Expected Delivery">
              <Input name="expected_delivery_date" type="date" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Remarks">
                <Textarea name="remarks" placeholder="Supplier ordering remarks" />
              </Field>
            </div>
          </div>

          <div className="rounded-[2px] border">
            <div className="border-b bg-secondary/40 px-3 py-2">
              <p className="text-xs font-semibold">Ordered Items</p>
              <p className="text-xs text-muted-foreground">Pending quantity is calculated from ordered minus received and cancelled.</p>
            </div>
            <div className="hidden grid-cols-[32px_2fr_100px_100px_100px_84px_112px] gap-2 border-b bg-[var(--sb-surface-muted)] px-3 py-2 text-[11px] font-medium text-muted-foreground lg:grid">
              <span className="text-center">#</span><span>Item</span><span>Ordered</span><span>Received</span><span>Cancelled</span><span>UOM</span><span>Unit price</span>
            </div>
            <div className="divide-y">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid gap-2 p-3 lg:grid-cols-[32px_2fr_100px_100px_100px_84px_112px]">
                  <div className="hidden items-center justify-center rounded border bg-secondary/40 text-xs font-semibold text-muted-foreground lg:flex">{index + 1}</div>
                  <SelectNative name="line_item_id" value={selectedItemIds[index]} onChange={(event) => { const next = [...selectedItemIds]; next[index] = event.target.value; setSelectedItemIds(next); setSupplierId(""); }} required={index === 0}>
                    <option value="">Select item</option>
                    {items.map((item) => <option key={item.id} value={item.id}>{item.item_code} - {item.item_name} - {item.base_unit}</option>)}
                  </SelectNative>
                  <Input name="line_qty_ordered" type="number" min="0.0001" step="0.0001" placeholder="Ordered" required={index === 0} />
                  <Input name="line_qty_received" type="number" min="0" step="0.0001" placeholder="Received" defaultValue={0} />
                  <Input name="line_qty_cancelled" type="number" min="0" step="0.0001" placeholder="Cancelled" defaultValue={0} />
                  <SelectNative name="line_uom" defaultValue={normalizeUom(items[index]?.base_unit)} required={index === 0}>
                    <option value="">Select UOM</option>
                    {uomOptionsWithCurrent(items[index]?.base_unit).map((uom) => (
                      <option key={uom} value={uom}>{uom}</option>
                    ))}
                  </SelectNative>
                  <Input name="line_unit_price" type="number" min="0" step="0.0001" placeholder="Unit price" defaultValue={0} />
                </div>
              ))}
            </div>
          </div>

          {selectedItems.length > 0 && eligibleSuppliers.length === 0 ? <p className="text-sm font-medium text-destructive">No single supplier is mapped to every selected item for this branch. Adjust the lines or create the required branch mappings.</p> : null}

        </form>
      </CardContent>
    </Card>
  );
}
