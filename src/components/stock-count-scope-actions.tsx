"use client";

import { useRef, useState } from "react";
import { Lightbulb, ListPlus, SlidersHorizontal } from "lucide-react";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { ModalShell } from "@/components/ui/modal-shell";
import { Textarea } from "@/components/ui/textarea";

export function AddStockCountItemDialog({ items, existingItemIds, action }: {
  items: ItemComboboxOption[];
  existingItemIds: string[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [itemId, setItemId] = useState("");
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const available = items.filter((item) => !existingItemIds.includes(item.id));
  return <>
    <Button ref={triggerRef} type="button" variant="outline" className="w-full justify-center" onClick={() => setOpen(true)}><ListPlus className="h-4 w-4" />Add item</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId="add-stock-count-item-title" triggerRef={triggerRef} className="max-w-lg">
      <h2 id="add-stock-count-item-title" className="text-base font-semibold">Add item to Stock Count</h2>
      <p className="mt-1 text-sm text-muted-foreground">The item is added to this draft and future Stock Counts for this branch. Its current ledger balance becomes the starting balance.</p>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="idempotency_key" value={idempotencyKey} />
        <Field label="Item">
          <ItemCombobox items={available} value={query} selectedItemId={itemId} name="item_id" onValueChange={(value) => { setQuery(value); setItemId(""); }} onSelect={(item) => { setQuery(`${item.item_code} - ${item.item_name}`); setItemId(item.id); }} placeholder="Search item name or code" emptyMessage="No active item matches this search, or it is already in this count." />
        </Field>
        <Field label="Why is this item being added?"><Textarea name="reason" minLength={3} maxLength={1000} required placeholder="New item for this kitchen, missing branch mapping, or another reason." /></Field>
        <div className="rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-muted)] p-3 text-xs text-muted-foreground"><strong className="text-foreground">Current and future counts</strong><br/>Purchasing, Finance and Owner will be notified. The action remains traceable in activity history.</div>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={!itemId}>Add item</Button></div>
      </form>
    </ModalShell>
  </>;
}

export function ItemCorrectionSuggestionDialog({ itemName, itemCode, action }: { itemName: string; itemCode: string; action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={triggerRef} type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-[var(--sb-surface-muted)]" onClick={() => setOpen(true)}><Lightbulb className="h-3.5 w-3.5" />Suggest item correction</button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId="item-correction-suggestion-title" triggerRef={triggerRef} className="max-w-md">
      <h2 id="item-correction-suggestion-title" className="text-base font-semibold">Suggest Item Master correction</h2>
      <p className="mt-1 text-sm text-muted-foreground">{itemCode} · {itemName}</p>
      <form action={action} className="mt-4 space-y-4">
        <Field label="What should be corrected?"><Textarea name="suggestion" minLength={3} maxLength={1000} required placeholder="Describe the correct name, code, UOM, category or note." /></Field>
        <p className="text-xs text-muted-foreground">This sends a traceable suggestion to Owner, Purchasing and Finance. It does not change the global Item Master.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">Send suggestion</Button></div>
      </form>
    </ModalShell>
  </>;
}

export function BranchStockCountSettingDialog({ itemName, included, action }: { itemName: string; included: boolean; action: (formData: FormData) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <>
    <button ref={triggerRef} type="button" role="menuitem" className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-xs font-medium hover:bg-[var(--sb-surface-muted)]" onClick={() => setOpen(true)}><SlidersHorizontal className="h-3.5 w-3.5" />Update branch settings</button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId="branch-stock-count-setting-title" triggerRef={triggerRef} className="max-w-md">
      <h2 id="branch-stock-count-setting-title" className="text-base font-semibold">Branch Stock Count setting</h2>
      <p className="mt-1 text-sm text-muted-foreground">{itemName}</p>
      <form action={action} className="mt-4 space-y-4">
        <input type="hidden" name="included" value={String(!included)} />
        <Field label="Reason"><Textarea name="note" minLength={3} maxLength={1000} required placeholder="Explain what changed at this branch." /></Field>
        <p className="text-xs text-muted-foreground">This changes future branch counts only. The current line and all historical ledger records remain intact.</p>
        <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit">{included ? "Remove from future counts" : "Include in future counts"}</Button></div>
      </form>
    </ModalShell>
  </>;
}
