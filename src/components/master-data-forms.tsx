"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { SubmitButton } from "@/components/ui/submit-button";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Card, CardContent } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { normalizeUom, uomOptionsWithCurrent } from "@/lib/uom";
import type { Database } from "@/types/database";

type SupplierItem = Database["public"]["Tables"]["supplier_items"]["Row"];
type UomConversion = Database["public"]["Tables"]["uom_conversions"]["Row"];
type Supplier = Pick<Database["public"]["Tables"]["suppliers"]["Row"], "id" | "name" | "supplier_code">;
type Item = ItemComboboxOption & { brand_name?: string | null };
type Branch = Pick<Database["public"]["Tables"]["branches"]["Row"], "id" | "branch_code" | "branch_name">;

type FormAction = (formData: FormData) => Promise<void | { error: string }>;
function useRetainedMasterAction(action: FormAction, formId?: string) {
  const [result, submit] = useActionState(async (previous: { error: string; values: Array<[string, string]>; attempt: number } | null, data: FormData) => {
    const response = await action(data);
    return response?.error ? { error: response.error, values: Array.from(data.entries()).map(([key, value]) => [key, String(value)] as [string, string]), attempt: (previous?.attempt ?? 0) + 1 } : null;
  }, null);
  useEffect(() => { if (result) document.dispatchEvent(new CustomEvent("sb:form-settled", { detail: { formId } })); }, [result, formId]);
  return { result, submit, saved: new URLSearchParams(result?.values ?? []) };
}

export function SupplierItemForm({
  supplierItem,
  suppliers,
  items,
  branches = [],
  initialSupplierId,
  initialItemId,
  initialBranchId,
  action,
  formId,
  showSubmit = true,
}: {
  supplierItem?: SupplierItem;
  suppliers: Supplier[];
  items: Item[];
  branches?: Branch[];
  initialSupplierId?: string;
  initialItemId?: string;
  initialBranchId?: string;
  action: FormAction;
  formId?: string;
  showSubmit?: boolean;
}) {
  const { result, submit, saved } = useRetainedMasterAction(action, formId);
  const initialItem = items.find((item) => item.id === (supplierItem?.item_id ?? initialItemId)) ?? items[0];
  const [selectedItemId, setSelectedItemId] = useState(initialItem?.id ?? "");
  const [itemSearch, setItemSearch] = useState(initialItem ? `${initialItem.item_code} - ${initialItem.item_name}` : "");
  const selectedItem = useMemo(() => items.find((item) => item.id === selectedItemId) ?? null, [items, selectedItemId]);
  return (
    <Card>
      <CardContent className="p-5">
        <form key={result?.attempt ?? 0} id={formId} action={submit} className="grid gap-4 pb-20 md:grid-cols-3 md:pb-0">
          {result?.error ? <p role="alert" className="col-span-full rounded border border-destructive p-3 text-sm text-destructive">{result.error}</p> : null}
          <input type="hidden" name="status" value={supplierItem?.status ?? "active"} />
          <Field label="Supplier">
            <SelectNative name="supplier_id" defaultValue={saved.get("supplier_id") ?? (supplierItem?.supplier_id ?? initialSupplierId ?? suppliers[0]?.id ?? "")} required>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Item">
            <ItemCombobox
              items={items}
              name="item_id"
              value={itemSearch}
              selectedItemId={selectedItemId}
              ariaLabel="Search Item Master by name, code, or brand"
              placeholder="Search item name, code, or brand"
              emptyMessage="No active Item Master record matches this search."
              onValueChange={(value) => { setItemSearch(value); setSelectedItemId(""); }}
              onSelect={(item) => { setSelectedItemId(item.id); setItemSearch(`${item.item_code} - ${item.item_name}`); }}
            />
          </Field>
          <div className="rounded-[var(--sb-radius-control)] border bg-[var(--sb-surface-muted)] px-3 py-2 text-sm text-muted-foreground md:col-span-1" aria-live="polite">
            <p className="font-medium text-foreground">Base UOM</p>
            <p className="mt-1 text-base font-semibold text-foreground">{selectedItem?.base_unit ?? "Select an item"}</p>
            <p className="mt-1 text-xs">Owned by Item Master. Set Purchase UOM and the conversion below.</p>
            {selectedItem ? <Link href={`/items/${selectedItem.id}`} className="mt-1 inline-flex text-xs font-semibold text-primary underline-offset-4 hover:underline">Open Item Master</Link> : null}
          </div>
          <Field label="Purchase UOM">
            <SelectNative name="purchase_uom" defaultValue={saved.get("purchase_uom") ?? (normalizeUom(supplierItem?.purchase_uom) || "KG")} required>
              {uomOptionsWithCurrent(supplierItem?.purchase_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Conversion to Base UOM">
            <Input name="conversion_to_base_uom" type="number" step="0.000001" min="0.000001" defaultValue={saved.get("conversion_to_base_uom") ?? (supplierItem?.conversion_to_base_uom ?? 1)} required />
          </Field>
          <Field label="Unit Cost">
            <Input name="unit_cost" type="number" step="0.0001" min="0" defaultValue={saved.get("unit_cost") ?? (supplierItem?.unit_cost ?? 0)} required />
          </Field>
          <Field label="MOQ">
            <Input name="moq" type="number" step="0.0001" min="0" defaultValue={saved.get("moq") ?? (supplierItem?.moq ?? 0)} required />
          </Field>
          <Field label="Lead Time Days">
            <Input name="lead_time_days" type="number" min="0" defaultValue={saved.get("lead_time_days") ?? (supplierItem?.lead_time_days ?? 0)} required />
          </Field>
          <Field label="Valid From">
            <Input name="valid_from" type="date" defaultValue={saved.get("valid_from") ?? (supplierItem?.valid_from ?? "")} />
          </Field>
          <Field label="Valid To">
            <Input name="valid_to" type="date" defaultValue={saved.get("valid_to") ?? (supplierItem?.valid_to ?? "")} />
          </Field>
          {!supplierItem && branches.length ? <fieldset className="grid gap-3 rounded-[var(--sb-radius-card)] border bg-card p-4 md:col-span-3">
            <legend className="px-1 text-sm font-semibold">Available at branches</legend>
            <p className="text-xs text-muted-foreground">Choose every branch that may purchase this item from this supplier. This creates the operational branch mapping together with the supplier item.</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {branches.map((branch) => <label key={branch.id} className="flex min-h-11 items-center gap-2 rounded-[var(--sb-radius-control)] border px-3 py-2 text-sm">
                <input type="checkbox" name="branch_ids" value={branch.id} defaultChecked={result ? saved.getAll("branch_ids").includes(branch.id) : branch.id === initialBranchId} className="h-4 w-4 accent-[var(--sb-brand)]" />
                <span className="min-w-0 truncate">{branch.branch_name}</span>
              </label>)}
            </div>
            <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" name="is_preferred" value="true" defaultChecked={saved.has("is_preferred")} className="h-4 w-4 accent-[var(--sb-brand)]" />Use as the preferred supplier for this item at the selected branches</label>
          </fieldset> : null}
          {showSubmit ? <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] p-2 md:static md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none md:col-span-3">
            <SubmitButton type="submit" className="w-full md:w-auto" pendingLabel={supplierItem ? "Saving..." : "Creating..."}>{supplierItem ? "Save supplier item" : "Create supplier item"}</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}

export function UomConversionForm({ conversion, action, formId, showSubmit = true }: { conversion?: UomConversion; action: FormAction; formId?: string; showSubmit?: boolean }) {
  const { result, submit, saved } = useRetainedMasterAction(action, formId);
  return (
    <Card>
      <CardContent className="p-5">
        <form key={result?.attempt ?? 0} id={formId} action={submit} className="grid gap-4 pb-20 md:grid-cols-2 md:pb-0">
          {result?.error ? <p role="alert" className="col-span-full rounded border border-destructive p-3 text-sm text-destructive">{result.error}</p> : null}
          <input type="hidden" name="status" value={conversion?.status ?? "active"} />
          <Field label="From UOM">
            <SelectNative name="from_uom" defaultValue={saved.get("from_uom") ?? (normalizeUom(conversion?.from_uom) || "KG")} required>
              {uomOptionsWithCurrent(conversion?.from_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="To UOM">
            <SelectNative name="to_uom" defaultValue={saved.get("to_uom") ?? (normalizeUom(conversion?.to_uom) || "G")} required>
              {uomOptionsWithCurrent(conversion?.to_uom).map((uom) => (
                <option key={uom} value={uom}>{uom}</option>
              ))}
            </SelectNative>
          </Field>
          <Field label="Factor">
            <Input name="factor" type="number" min="0.00000001" step="0.00000001" defaultValue={saved.get("factor") ?? (conversion?.factor ?? 1)} required />
          </Field>
          <div className="rounded-[var(--sb-radius-control)] border bg-secondary/50 p-3 md:col-span-2">
            <p className="text-sm font-medium">Preview</p>
            <p className="mt-1 text-sm text-muted-foreground">1 {conversion?.from_uom ?? "from UOM"} = {conversion?.factor ?? 1} {conversion?.to_uom ?? "to UOM"}</p>
          </div>
          {showSubmit ? <div className="sb-mobile-action-bar fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] p-2 md:static md:flex md:justify-end md:bg-transparent md:p-0 md:shadow-none md:col-span-2">
            <SubmitButton type="submit" className="w-full md:w-auto" pendingLabel={conversion ? "Saving..." : "Creating..."}>{conversion ? "Save conversion" : "Create conversion"}</SubmitButton>
          </div> : null}
        </form>
      </CardContent>
    </Card>
  );
}
