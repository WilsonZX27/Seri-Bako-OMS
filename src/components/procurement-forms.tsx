"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
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
  canViewCommercial,
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
    setLines((current) => current.map((line) => ({ ...line, supplierId: "" })));
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <form id="purchase-request-form" action={action} className="space-y-3">
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="request_date" value={initialRequestDate ?? today()} />
          <input type="hidden" name="required_date" value={initialRequiredDate ?? ""} />
          <input type="hidden" name="priority" value={priority} />
          <input type="hidden" name="urgency_reason" value={initialUrgencyReason ?? ""} />
          <input type="hidden" name="production_risk" value={initialProductionRisk ? "on" : ""} />
          <input type="hidden" name="expected_updated_at" value={initialUpdatedAt ?? ""} />
          <div className="border-b pb-2">
            <h2 className="text-sm font-semibold">Request details</h2>
          </div>

          <section className="space-y-3">
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

          <div className="rounded-[2px] border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold">Requested Items</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setLines((current) => [...current, createBlankLine(nextKey)])}>
                  <Plus className="h-4 w-4" />
                  Add line
                </Button>
              </div>
            </div>
            <div className="divide-y">
              {lines.map((line) => (
                <div key={line.key} className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_120px_120px_40px]">
                  <div className="space-y-2">
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
                  <Field label="Quantity" required>
                    <Input name="line_qty" type="number" min="0.0001" step="0.0001" value={line.qty} onChange={(event) => updateLine(line.key, { qty: event.target.value })} placeholder="Qty" />
                  </Field>
                  <Field label="UOM" required>
                    <SelectNative name="line_uom" value={line.uom} onChange={(event) => updateLine(line.key, { uom: event.target.value })}>
                      <option value="">Select UOM</option>
                      {uomOptionsWithCurrent(line.uom).map((uom) => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </SelectNative>
                  </Field>
                  <div className="flex items-end justify-end">
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {canViewCommercial ? (
                    <details className="md:col-span-4 rounded-md border bg-secondary/20 p-2">
                      <summary className="cursor-pointer text-xs font-medium">Purchasing details</summary>
                      <div className="mt-3 grid gap-3 md:grid-cols-3">
                        <Field label="Suggested supplier"><SelectNative name="line_suggested_supplier_id" value={line.supplierId} onChange={(event) => {
                          const mapping = supplierMappings.find((candidate) => candidate.branch_id === branchId && candidate.item_id === line.itemId && candidate.supplier_id === event.target.value);
                          updateLine(line.key, { supplierId: event.target.value, ...(mapping ? { cost: String(mapping.unit_cost), uom: normalizeUom(mapping.purchase_uom) } : {}) });
                        }}><option value="">{line.itemId ? "Select mapped supplier" : "Select an item first"}</option>{supplierMappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId).map((mapping) => <option key={mapping.id} value={mapping.supplier_id}>{mapping.supplier_name}{mapping.is_preferred ? " (Preferred)" : ""}</option>)}</SelectNative></Field>
                        <Field label="Estimated unit cost"><Input name="line_estimated_unit_cost" type="number" min="0" step="0.0001" value={line.cost} onChange={(event) => updateLine(line.key, { cost: event.target.value })} /></Field>
                        <Field label="Remarks"><Input name="line_remarks" value={line.remarks} onChange={(event) => updateLine(line.key, { remarks: event.target.value })} placeholder="Optional" /></Field>
                      </div>
                    </details>
                  ) : (
                    <>
                      <input type="hidden" name="line_suggested_supplier_id" value={line.supplierId} />
                      <input type="hidden" name="line_estimated_unit_cost" value={line.cost} />
                      <input type="hidden" name="line_remarks" value={line.remarks} />
                    </>
                  )}
                  {line.itemId && !supplierMappings.some((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId) ? <p className="md:col-span-4 text-xs font-medium text-destructive">No supplier is mapped to this item for the selected branch. Add a Branch Supplier Mapping before submitting.</p> : null}
                  {line.itemId && supplierMappings.some((mapping) => mapping.branch_id === branchId && mapping.item_id === line.itemId) && !line.supplierId ? <p className="md:col-span-4 text-xs text-muted-foreground">Choose one of the suppliers authorized for this branch and item before submitting.</p> : null}
                  <input type="hidden" name="line_reason" value={line.reason} />
                </div>
              ))}
            </div>
          </div>

          <datalist id="purchase-request-items">
            {items.map((item) => (
              <option key={item.id} value={itemLabel(item)} />
            ))}
          </datalist>
        </form>
      </CardContent>
    </Card>
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
          <input type="hidden" name="status" value="draft" />
          <input type="hidden" name="approval_status" value="draft" />
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="PO No">
              <div className="rounded-md border bg-secondary/30 px-3 py-2 text-sm text-muted-foreground">Auto-generated on submit</div>
            </Field>
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
            <div className="md:col-span-3">
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
