"use client";

import { useState } from "react";
import { Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type ItemOption = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "purchase_unit" | "supplier_id" | "cost" | "status" | "barcode" | "internal_barcode" | "supplier_barcode">;
type SupplierOption = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "supplier_code" | "name" | "status">;
type BranchOption = { id: string; branch_code: string; branch_name: string; status: string };
type RequestLine = {
  key: number;
  itemId: string;
  itemSearch: string;
  qty: string;
  uom: string;
  supplierId: string;
  cost: string;
  remarks: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createBlankLine(key: number): RequestLine {
  return { key, itemId: "", itemSearch: "", qty: "", uom: "", supplierId: "", cost: "0", remarks: "" };
}

function itemLabel(item: ItemOption) {
  return `${item.item_code} - ${item.item_name}`;
}

function ItemSelect({ items, name = "line_item_id", required = false }: { items: ItemOption[]; name?: string; required?: boolean }) {
  return (
    <SelectNative name={name} required={required}>
      <option value="">Select item</option>
      {items.map((item) => (
        <option key={item.id} value={item.id}>
          {item.item_code} - {item.item_name} - {item.base_unit}
        </option>
      ))}
    </SelectNative>
  );
}

export function PurchaseRequestForm({
  items,
  suppliers,
  branches,
  initialBranchId,
  initialLine,
  initialRemarks,
  canViewCommercial,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
  branches: BranchOption[];
  initialBranchId?: string;
  initialLine?: Partial<RequestLine>;
  initialRemarks?: string;
  canViewCommercial: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [lines, setLines] = useState<RequestLine[]>([{ ...createBlankLine(0), ...initialLine, key: 0 }]);
  const [priority, setPriority] = useState("normal");
  const showUrgencyReason = priority === "urgent" || priority === "critical";
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

    updateLine(key, {
      itemId: selected.id,
      itemSearch: itemLabel(selected),
      uom: normalizeUom(selected.purchase_unit || selected.base_unit),
      supplierId: selected.supplier_id ?? "",
      cost: String(selected.cost ?? 0),
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <form id="purchase-request-form" action={action} className="space-y-3">
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="status" value="draft" />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="request_date" value={today()} />
          <input type="hidden" name="required_date" value="" />
          <div className="border-b pb-3">
            <h2 className="text-sm font-semibold">Request details</h2>
            <p className="mt-1 text-xs text-muted-foreground">The request number and system date are recorded when you save the draft.</p>
          </div>

          <section className="rounded-lg border bg-card p-3">
            <div className="mb-3">
              <p className="text-xs font-semibold">When and where</p>
              <p className="mt-1 text-xs text-muted-foreground">Confirm the receiving branch and when the items are needed.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Needed By">
                <Input name="needed_by_date" type="date" />
              </Field>
              <Field label="Branch" required>
                <SelectNative name="branch_id" defaultValue={initialBranchId ?? branches[0]?.id ?? ""} required>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
              </Field>
              <Field label="Urgency">
                <SelectNative name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="normal">Normal</option>
                  <option value="low">Low</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </SelectNative>
                <p className="text-xs text-muted-foreground">Normal is suitable for routine requests.</p>
              </Field>
              {showUrgencyReason ? (
                <div className="md:col-span-2">
                  <Field label="Urgency Reason">
                    <Input name="urgency_reason" placeholder="Example: outlet is blocked by a missing ingredient" />
                  </Field>
                </div>
              ) : null}
            </div>
          </section>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold">Requested Items</p>
                <p className="text-xs text-muted-foreground">Choose an existing item, then enter the quantity needed.</p>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
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
                        <Field label="Suggested supplier"><SelectNative name="line_suggested_supplier_id" value={line.supplierId} onChange={(event) => updateLine(line.key, { supplierId: event.target.value })}><option value="">No suggestion</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</SelectNative></Field>
                        <Field label="Estimated unit cost"><Input name="line_estimated_unit_cost" type="number" min="0" step="0.0001" value={line.cost} onChange={(event) => updateLine(line.key, { cost: event.target.value })} /></Field>
                        <Field label="Line note"><Input name="line_remarks" value={line.remarks} onChange={(event) => updateLine(line.key, { remarks: event.target.value })} placeholder="Optional" /></Field>
                      </div>
                    </details>
                  ) : (
                    <>
                      <input type="hidden" name="line_suggested_supplier_id" value={line.supplierId} />
                      <input type="hidden" name="line_estimated_unit_cost" value={line.cost} />
                      <input type="hidden" name="line_remarks" value={line.remarks} />
                    </>
                  )}
                  <input type="hidden" name="line_reason" value="" />
                </div>
              ))}
            </div>
          </div>

          <datalist id="purchase-request-items">
            {items.map((item) => (
              <option key={item.id} value={itemLabel(item)} />
            ))}
          </datalist>

          <details className="rounded-lg border bg-card p-3">
            <summary className="cursor-pointer text-xs font-semibold">Additional details</summary>
            <div className="mt-3"><Field label="Remarks"><Textarea name="remarks" defaultValue={initialRemarks ?? ""} placeholder="Reason or instructions for this request" /></Field></div>
          </details>
        </form>
      </CardContent>
    </Card>
  );
}

export function PurchaseOrderForm({
  items,
  suppliers,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
  action: (formData: FormData) => Promise<void>;
}) {
  const poNo = "PO-AUTO";
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
            <Field label="Supplier" required>
              <SelectNative name="supplier_id" defaultValue={suppliers[0]?.id ?? ""} required>
                {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
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

          <div className="rounded-lg border">
            <div className="border-b bg-secondary/40 px-3 py-2">
              <p className="text-xs font-semibold">Ordered Items</p>
              <p className="text-xs text-muted-foreground">Pending quantity is calculated from ordered minus received and cancelled.</p>
            </div>
            <div className="divide-y">
              {[0, 1, 2, 3, 4].map((index) => (
                <div key={index} className="grid gap-2 p-3 lg:grid-cols-[32px_2fr_100px_100px_100px_84px_112px]">
                  <div className="hidden items-center justify-center rounded border bg-secondary/40 text-xs font-semibold text-muted-foreground lg:flex">{index + 1}</div>
                  <ItemSelect items={items} required={index === 0} />
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

        </form>
      </CardContent>
    </Card>
  );
}
