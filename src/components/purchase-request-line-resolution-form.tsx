"use client";

import Link from "next/link";
import { Link2 } from "lucide-react";
import { useId, useRef, useState } from "react";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Button } from "@/components/ui/button";
import { ModalShell } from "@/components/ui/modal-shell";
import { SubmitButton } from "@/components/ui/submit-button";

export function PurchaseRequestLineResolutionForm({ action, items, unresolvedLineId, description, quantity, uom, supplierName, supplierSetupHref, needsSupplier = false, awaitingPurchasingReview = false }: {
  action: (formData: FormData) => Promise<void>;
  items: ItemComboboxOption[];
  unresolvedLineId: string;
  description: string;
  quantity: string;
  uom: string;
  supplierName: string;
  supplierSetupHref: string;
  needsSupplier?: boolean;
  awaitingPurchasingReview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return <>
    <Button ref={triggerRef} type="button" variant="outline" size="sm" className="whitespace-nowrap" onClick={() => setOpen(true)}><Link2 className="h-4 w-4" aria-hidden="true" />Match item</Button>
    <ModalShell open={open} onClose={() => setOpen(false)} titleId={titleId} triggerRef={triggerRef} initialFocusRef={cancelRef} className="max-w-lg">
      <h2 id={titleId} className="flex items-center gap-2 text-base font-semibold"><Link2 className="h-4 w-4" aria-hidden="true" />Match purchase request item</h2>
      <dl className="mt-3 grid gap-2 rounded-[var(--sb-control-radius)] bg-[var(--sb-surface-muted)] p-3 text-xs sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-muted-foreground">Requested description</dt><dd className="mt-0.5 font-semibold">{description}</dd></div>
        <div><dt className="text-muted-foreground">Quantity</dt><dd className="mt-0.5 font-medium">{quantity} {uom}</dd></div>
        <div><dt className="text-muted-foreground">PR supplier</dt><dd className="mt-0.5 font-medium">{supplierName}</dd></div>
      </dl>
      {items.length ? <form action={action} className="mt-4 grid gap-3">
        <input type="hidden" name="unresolved_line_id" value={unresolvedLineId} />
        <ItemCombobox items={items} name="item_id" value={query} selectedItemId={selectedItemId} ariaLabel={`Match ${description} to Item Master`} placeholder={`Search items mapped to ${supplierName}`} emptyMessage={`No ${supplierName} item matches this search.`} onValueChange={(value) => { setQuery(value); setSelectedItemId(""); setConfirmed(false); }} onSelect={(item) => { setQuery(`${item.item_code} - ${item.item_name}`); setSelectedItemId(item.id); setConfirmed(false); }} />
        {selectedItemId ? <label className="flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Confirm this Item Master record belongs to {supplierName} for the requested {uom}.</span></label> : null}
        <div className="flex justify-end gap-2"><Button ref={cancelRef} type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><SubmitButton type="submit" pendingLabel="Matching..." showOverlay overlayLabel="Matching item..." disabled={!selectedItemId || !confirmed}>Confirm match</SubmitButton></div>
      </form> : <div className="mt-4 rounded-[var(--sb-control-radius)] border border-[var(--sb-warning)] bg-[var(--sb-warning-bg)] p-3 text-sm"><p className="font-semibold">{needsSupplier ? awaitingPurchasingReview ? "Supplier selection follows Manager approval" : "Select the PR supplier first" : "No eligible items for this supplier and UOM"}</p><p className="mt-1 text-xs text-muted-foreground">{needsSupplier ? awaitingPurchasingReview ? "Complete Manager Review first. Purchasing can select the supplier during Purchasing Review before matching this item." : "Close this dialog and use Select PR supplier to choose the supplier before matching this item." : "Create or correct the branch supplier mapping before matching this line."}</p>{!needsSupplier ? <Button asChild variant="outline" size="sm" className="mt-3"><Link href={supplierSetupHref}>Open supplier item setup</Link></Button> : null}<div className="mt-3 flex justify-end"><Button ref={cancelRef} type="button" variant="ghost" onClick={() => setOpen(false)}>Close</Button></div></div>}
    </ModalShell>
  </>;
}
