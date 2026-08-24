"use client";

import { useMemo, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function AddPurchaseRequestLineDialog({ action, items, suppliers, canViewCommercial }: {
  action: (formData: FormData) => Promise<void>;
  items: Array<{ id: string; item_code: string; item_name: string }>;
  suppliers: Array<{ id: string; name: string }>;
  canViewCommercial: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [itemQuery, setItemQuery] = useState("");
  const selectedItem = useMemo(() => items.find((item) => `${item.item_code} — ${item.item_name}` === itemQuery) ?? null, [itemQuery, items]);
  return <>
    <Button type="button" variant="outline" className="w-full justify-center" onClick={() => dialogRef.current?.showModal()}><Plus className="h-4 w-4" />Add line</Button>
    <dialog ref={dialogRef} className="m-auto w-[min(42rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[var(--sb-panel-radius)] border-0 bg-transparent p-0 shadow-2xl backdrop:bg-black/60">
      <div className="bg-[var(--sb-surface)]">
        <header className="flex items-center justify-between border-b border-[var(--sb-border-soft)] px-4 py-3"><div><h3 className="font-semibold">Add request line</h3><p className="text-xs text-muted-foreground">Add one item and keep the reason in revision history.</p></div><Button type="button" variant="ghost" size="icon" onClick={() => dialogRef.current?.close()} aria-label="Close add line dialog"><X className="h-4 w-4" /></Button></header>
        <form action={action} className="grid gap-3 p-4 sm:grid-cols-2">
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <label className="space-y-1 text-xs font-medium">Item<input name="item_search" list="purchase-request-supplier-items" value={itemQuery} onChange={(event) => setItemQuery(event.target.value)} placeholder="Search item code or name" autoComplete="off" required className="h-10 w-full rounded-[var(--sb-radius-control)] border bg-background px-3 text-sm" /><datalist id="purchase-request-supplier-items">{items.map((item) => <option key={item.id} value={`${item.item_code} — ${item.item_name}`} />)}</datalist><input type="hidden" name="item_id" value={selectedItem?.id ?? ""} /><span className="block text-[11px] font-normal text-muted-foreground">{items.length} item{items.length === 1 ? "" : "s"} supplied by the selected supplier, ordered by item code.</span></label>
          <label className="space-y-1 text-xs font-medium">Supplier<select name="supplier_id" className="h-10 w-full rounded-[var(--sb-radius-control)] border bg-background px-3 text-sm"><option value="">Use mapped supplier</option>{suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="space-y-1 text-xs font-medium">Quantity<Input name="qty" type="number" min="0.0001" step="any" required /></label>
          <label className="space-y-1 text-xs font-medium">UOM<Input name="uom" required maxLength={32} /></label>
          {canViewCommercial ? <label className="space-y-1 text-xs font-medium">Est. unit cost<Input name="unit_cost" type="number" min="0" step="0.01" defaultValue="0" required /></label> : <input type="hidden" name="unit_cost" value="0" />}
          <label className="space-y-1 text-xs font-medium sm:col-span-2">Reason<Input name="reason" required minLength={3} maxLength={1000} placeholder="Why is this line being added?" /></label>
          <div className="grid grid-cols-2 gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Cancel</Button><SubmitButton pendingLabel="Adding…" disabled={!selectedItem}>Add line</SubmitButton></div>
        </form>
      </div>
    </dialog>
  </>;
}
