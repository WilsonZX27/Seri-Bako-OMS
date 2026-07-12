"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Circle, CircleDot, Plus, Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Textarea } from "@/components/ui/textarea";
import { defaultUoms, normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
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

function stageVariant(index: number) {
  if (index === 0) return "border-primary/40 bg-primary/10 text-primary";
  return "bg-card text-muted-foreground";
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
  canCreateItem,
  canCreateSupplier,
  action,
}: {
  items: ItemOption[];
  suppliers: SupplierOption[];
  branches: BranchOption[];
  canCreateItem: boolean;
  canCreateSupplier: boolean;
  action: (formData: FormData) => Promise<void>;
}) {
  const [availableItems, setAvailableItems] = useState(items);
  const [lines, setLines] = useState<RequestLine[]>([createBlankLine(0)]);
  const [priority, setPriority] = useState("normal");
  const [newItemLineKey, setNewItemLineKey] = useState<number | null>(null);
  const [newItemError, setNewItemError] = useState<string | null>(null);
  const [savingNewItem, setSavingNewItem] = useState(false);
  const showUrgencyReason = priority === "urgent" || priority === "critical";
  const nextKey = lines.reduce((max, line) => Math.max(max, line.key), 0) + 1;

  function updateLine(key: number, updates: Partial<RequestLine>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...updates } : line)));
  }

  function selectItem(key: number, value: string) {
    const query = value.trim().toLowerCase();
    const selected =
      availableItems.find((item) => item.id === value) ??
      availableItems.find((item) => itemLabel(item).toLowerCase() === query) ??
      availableItems.find((item) => [item.item_code, item.item_name].filter(Boolean).some((candidate) => String(candidate).toLowerCase() === query));

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

  async function createInlineItem(formData: FormData) {
    if (newItemLineKey === null) return;
    setSavingNewItem(true);
    setNewItemError(null);

    try {
      const payload = {
        item_name: String(formData.get("item_name") ?? ""),
        item_code: String(formData.get("item_code") ?? ""),
        category: String(formData.get("category") ?? ""),
        base_unit: String(formData.get("base_unit") ?? ""),
        purchase_unit: String(formData.get("purchase_unit") ?? ""),
        supplier_id: String(formData.get("supplier_id") ?? ""),
        cost: String(formData.get("cost") ?? "0"),
        moq: String(formData.get("moq") ?? "0"),
        lead_time_days: String(formData.get("lead_time_days") ?? "0"),
      };
      const response = await fetch("/api/items/quick-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = (await response.json()) as { ok: boolean; message?: string; item?: ItemOption };

      if (!response.ok || !result.ok || !result.item) {
        setNewItemError(result.message ?? "Could not create this item.");
        return;
      }

      setAvailableItems((current) => [...current, result.item as ItemOption].sort((a, b) => a.item_name.localeCompare(b.item_name)));
      updateLine(newItemLineKey, {
        itemId: result.item.id,
        itemSearch: itemLabel(result.item),
        uom: normalizeUom(result.item.purchase_unit || result.item.base_unit),
        supplierId: result.item.supplier_id ?? "",
        cost: String(result.item.cost ?? 0),
      });
      setNewItemLineKey(null);
    } catch {
      setNewItemError("Could not create this item.");
    } finally {
      setSavingNewItem(false);
    }
  }

  return (
    <>
    <Card>
      <CardContent className="space-y-5 p-5">
        <form id="purchase-request-form" action={action} className="space-y-3">
          <input type="hidden" name="request_no" value="" />
          <input type="hidden" name="status" value="draft" />
          <div className="flex flex-col gap-2 border-b pb-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Draft</Badge>
                <h2 className="text-sm font-semibold">Create purchase request</h2>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Request number is auto-generated on submit.</p>
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border bg-white p-2 md:grid-cols-4">
            {[
              ["draft", "Draft"],
              ["manager_review", "Manager Review"],
              ["admin_review", "Admin Review"],
              ["finance_review", "Finance Review"],
              ["ready_to_convert", "Ready to Convert"],
              ["converted_to_po", "Converted to PO"],
            ].map(([key, label], index) => {
              const Icon = index === 0 ? CircleDot : index < 0 ? CheckCircle2 : Circle;
              return (
                <div key={key} className={`rounded-md border px-2 py-1.5 ${stageVariant(index)}`}>
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <p className="text-xs font-medium">{label}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="rounded-lg border bg-card p-3">
            <div className="mb-3">
              <p className="text-xs font-semibold">Main details</p>
              <p className="mt-1 text-xs text-muted-foreground">Branch, dates, urgency, and the main request reason.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Request Date" required>
                <Input name="request_date" type="date" defaultValue={today()} required />
              </Field>
              <Field label="Required Date">
                <Input name="required_date" type="date" />
              </Field>
              <Field label="Needed By">
                <Input name="needed_by_date" type="date" />
              </Field>
              <Field label="Branch" required>
                <SelectNative name="branch_id" defaultValue={branches[0]?.id ?? ""} required>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </SelectNative>
              </Field>
              <Field label="Urgency">
                <SelectNative name="priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="urgent">Urgent</option>
                  <option value="critical">Critical</option>
                </SelectNative>
              </Field>
              {showUrgencyReason ? (
                <div className="md:col-span-2">
                  <Field label="Urgency Reason">
                    <Input name="urgency_reason" placeholder="Example: outlet is blocked by a missing ingredient" />
                  </Field>
                </div>
              ) : null}
              <div className="md:col-span-3">
                <Field label="Remarks">
                  <Textarea name="remarks" placeholder="Main reason for this purchase request" />
                </Field>
              </div>
            </div>
          </section>

          <div className="rounded-lg border">
            <div className="flex items-center justify-between border-b bg-secondary/40 px-3 py-2">
              <div>
                <p className="text-xs font-semibold">Requested Items</p>
                <p className="text-xs text-muted-foreground">Search by item code or item name. UOM, supplier, and cost fill from the item master.</p>
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
                <div key={line.key} className="grid gap-2 p-3 md:grid-cols-2 xl:grid-cols-[36px_repeat(12,minmax(0,1fr))]">
                  <div className="hidden items-center justify-center rounded border bg-secondary/40 text-xs font-semibold text-muted-foreground xl:flex">{line.key + 1}</div>
                  <div className="space-y-2 xl:col-span-4">
                    <Field label="Item" required>
                      <Input
                        list="purchase-request-items"
                        value={line.itemSearch}
                        onChange={(event) => selectItem(line.key, event.target.value)}
                        placeholder="Search by item code or item name"
                      />
                    </Field>
                    {!line.itemId && canCreateItem ? <Button type="button" variant="ghost" size="sm" onClick={() => setNewItemLineKey(line.key)}>Create new item</Button> : null}
                    <input type="hidden" name="line_item_id" value={line.itemId} />
                  </div>
                  <div className="xl:col-span-2">
                  <Field label="Quantity" required>
                    <Input name="line_qty" type="number" min="0.0001" step="0.0001" value={line.qty} onChange={(event) => updateLine(line.key, { qty: event.target.value })} placeholder="Qty" />
                  </Field>
                  </div>
                  <div className="xl:col-span-1">
                  <Field label="UOM" required>
                    <SelectNative name="line_uom" value={line.uom} onChange={(event) => updateLine(line.key, { uom: event.target.value })}>
                      <option value="">Select UOM</option>
                      {uomOptionsWithCurrent(line.uom).map((uom) => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </SelectNative>
                  </Field>
                  </div>
                  <div className="xl:col-span-2">
                  <Field label="Supplier">
                    <SelectNative name="line_suggested_supplier_id" value={line.supplierId} onChange={(event) => updateLine(line.key, { supplierId: event.target.value })}>
                      <option value="">No suggestion</option>
                      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </SelectNative>
                  </Field>
                  </div>
                  <div className="xl:col-span-1">
                  <Field label="Cost">
                    <Input name="line_estimated_unit_cost" type="number" min="0" step="0.0001" value={line.cost} onChange={(event) => updateLine(line.key, { cost: event.target.value })} />
                  </Field>
                  </div>
                  <div className="xl:col-span-2">
                  <Field label="Line remarks">
                    <Input name="line_remarks" value={line.remarks} onChange={(event) => updateLine(line.key, { remarks: event.target.value })} placeholder="Optional" />
                  </Field>
                  </div>
                  <div className="flex items-end md:justify-end xl:col-span-13">
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove line" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((row) => row.key !== line.key))}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <input type="hidden" name="line_reason" value="" />
                </div>
              ))}
            </div>
          </div>

          <datalist id="purchase-request-items">
            {availableItems.map((item) => (
              <option key={item.id} value={itemLabel(item)} />
            ))}
          </datalist>
        </form>
      </CardContent>
    </Card>
    {newItemLineKey !== null && !canCreateItem ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-lg">
          <CardContent className="space-y-4 p-5">
            <p className="text-lg font-semibold">Permission required</p>
            <p className="text-sm text-muted-foreground">You do not have permission to create items. Please contact admin or purchasing.</p>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setNewItemLineKey(null)}>Close</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    ) : null}
    {newItemLineKey !== null && canCreateItem ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/30 p-4 backdrop-blur-sm">
        <Card className="w-full max-w-3xl border-slate-200 bg-white shadow-xl">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">Create new item</p>
                <p className="mt-1 text-sm text-muted-foreground">Create the item, return to this PR line, and fill UOM, supplier, and cost automatically.</p>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setNewItemLineKey(null)} aria-label="Close item dialog">
                <X className="h-4 w-4" />
              </Button>
            </div>
            {newItemError ? <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{newItemError}</p> : null}
            <form action={createInlineItem} className="space-y-4">
              <section className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <p className="text-sm font-semibold">Basic</p>
                  <p className="mt-1 text-xs text-muted-foreground">Name, code, category, and base stock unit.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Item Name" required>
                    <Input name="item_name" required />
                  </Field>
                  <Field label="Item Code">
                    <Input name="item_code" placeholder="Leave blank to auto-generate" />
                    <p className="mt-1 text-xs text-muted-foreground">Blank code will be generated on save.</p>
                  </Field>
                  <Field label="Category" required>
                    <Input name="category" required />
                  </Field>
                  <Field label="Base UOM" required>
                    <SelectNative name="base_unit" defaultValue="KG" required>
                      {defaultUoms.map((uom) => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </SelectNative>
                  </Field>
                </div>
              </section>

              <section className="rounded-lg border bg-white p-4 shadow-sm">
                <div className="mb-3">
                  <p className="text-sm font-semibold">Purchasing</p>
                  <p className="mt-1 text-xs text-muted-foreground">Optional buying defaults for PR and supplier item setup.</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Purchase UOM" required>
                    <SelectNative name="purchase_unit" defaultValue="KG" required>
                      {defaultUoms.map((uom) => (
                        <option key={uom} value={uom}>{uom}</option>
                      ))}
                    </SelectNative>
                  </Field>
                  <Field label="Default Supplier">
                    <SelectNative name="supplier_id" defaultValue="">
                      <option value="">No default supplier</option>
                      {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
                    </SelectNative>
                  </Field>
                  {!suppliers.length && canCreateSupplier ? (
                    <div className="flex flex-col gap-2 rounded-md border bg-slate-50 p-3 text-sm text-muted-foreground md:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                      <span>No supplier is available yet for this item.</span>
                      <Button asChild type="button" variant="outline" size="sm">
                        <Link href="/suppliers/new">Create supplier first</Link>
                      </Button>
                    </div>
                  ) : null}
                  <Field label="Cost">
                    <Input name="cost" type="number" min="0" step="0.0001" defaultValue={0} />
                  </Field>
                  <Field label="MOQ">
                    <Input name="moq" type="number" min="0" step="0.0001" defaultValue={0} />
                  </Field>
                  <Field label="Lead Time Days">
                    <Input name="lead_time_days" type="number" min="0" step="1" defaultValue={0} />
                  </Field>
                </div>
              </section>

              <div className="flex items-end justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setNewItemLineKey(null)}>Cancel</Button>
                <Button type="submit" disabled={savingNewItem}>{savingNewItem ? "Saving..." : "Save item"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    ) : null}
    </>
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
