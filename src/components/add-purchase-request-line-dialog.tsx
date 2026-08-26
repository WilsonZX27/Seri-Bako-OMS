"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { SelectNative } from "@/components/ui/select-native";
import { uomOptionsForValues } from "@/lib/uom";

export function AddPurchaseRequestLineDialog({ action, items, suppliers, canViewCommercial }: {
  action: (formData: FormData) => Promise<void>;
  items: ItemComboboxOption[];
  suppliers: Array<{ id: string; name: string }>;
  canViewCommercial: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [itemQuery, setItemQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const selectedItem = useMemo(() => items.find((item) => item.id === itemId) ?? null, [itemId, items]);
  const uomOptions = useMemo(() => uomOptionsForValues([selectedItem?.purchase_unit, selectedItem?.base_unit]), [selectedItem]);
  return <>
    <Button type="button" variant="outline" className="w-full justify-center" onClick={() => dialogRef.current?.showModal()}><Plus className="h-4 w-4" />Add line</Button>
    <dialog ref={dialogRef} className="m-auto w-[min(42rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[var(--sb-panel-radius)] border-0 bg-transparent p-0 shadow-2xl backdrop:bg-black/60">
      <div className="bg-[var(--sb-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--sb-border-soft)] px-4 py-3"><div><h3 className="font-semibold">Add request line</h3><p className="text-xs text-muted-foreground">Add one item and keep the reason in revision history.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Close add line dialog"><X className="h-4 w-4" /></Button></header>
        <form action={action} className="grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="supplier_id" value={suppliers[0]?.id ?? ""} />
          <Field label="Item" className="sm:col-span-2">
            <ItemCombobox items={items} value={itemQuery} selectedItemId={itemId} name="item_id" ariaLabel="Request item" placeholder="Search item code or name" emptyMessage="No item from this PR supplier matches." onValueChange={(value) => { setItemQuery(value); setItemId(""); }} onSelect={(item) => { setItemQuery(`${item.item_code} - ${item.item_name}`); setItemId(item.id); }} />
          </Field>
          {selectedItem ? <>
            <label className="space-y-1 text-xs font-medium">Quantity<Input name="qty" type="number" min="0.0001" step="any" required /></label>
            <label className="space-y-1 text-xs font-medium">UOM<SelectNative name="uom" required defaultValue="" key={selectedItem.id}><option value="" disabled>Choose UOM</option>{uomOptions.map((uom) => <option key={uom} value={uom}>{uom}</option>)}</SelectNative></label>
            {canViewCommercial ? <label className="space-y-1 text-xs font-medium">Est. unit cost<Input name="unit_cost" type="number" min="0" step="0.01" defaultValue="0" required /></label> : <input type="hidden" name="unit_cost" value="0" />}
            <label className="space-y-1 text-xs font-medium sm:col-span-2">Reason<Input name="reason" required minLength={3} maxLength={1000} placeholder="Why is this line being added?" /></label>
          </> : null}
          <div className="grid grid-cols-2 gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Cancel</Button><SubmitButton pendingLabel="Adding…" disabled={!selectedItem}>Add line</SubmitButton></div>
        </form>
      </div>
    </dialog>
  </>;
}
