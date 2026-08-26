"use client";

import { useRef, useState } from "react";
import { AlertTriangle, PencilLine, X } from "lucide-react";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { SubmitButton } from "@/components/ui/submit-button";
import { Textarea } from "@/components/ui/textarea";
import { normalizeUom, uomOptionsForValues } from "@/lib/uom";
import type { PurchaseRequestGuidedIssue } from "@/lib/purchase-request-readiness";

type Mapping = {
  branch_id: string;
  item_id: string;
  supplier_id: string;
  supplier_name: string;
  purchase_uom: string;
  conversion_to_base_uom?: number | null;
};
type SupplierOption = { id: string; name: string };

export function PurchaseRequestLineRecovery({
  action, line, itemLabel, items, mappings, suppliers, branchId, issue, suggestedSupplierId,
}: {
  action: (formData: FormData) => Promise<void>;
  line: { id: string; item_id: string; qty: number; uom: string; suggested_supplier_id: string | null; estimated_unit_cost: number; updated_at: string };
  itemLabel: string;
  items: ItemComboboxOption[];
  mappings: Mapping[];
  suppliers: SupplierOption[];
  branchId: string;
  issue: PurchaseRequestGuidedIssue | null;
  suggestedSupplierId: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [itemId, setItemId] = useState(line.item_id);
  const selectedItem = items.find((item) => item.id === itemId);
  const [query, setQuery] = useState(itemLabel);
  const [uom, setUom] = useState(normalizeUom(line.uom));
  const supplierId = line.suggested_supplier_id ?? suggestedSupplierId ?? "";
  const [mode, setMode] = useState<"update" | "replace" | "remove">("update");
  const itemMappings = mappings.filter((mapping) => mapping.branch_id === branchId && mapping.item_id === itemId);
  const uomOptions = uomOptionsForValues([uom, selectedItem?.purchase_unit, selectedItem?.base_unit, ...itemMappings.map((mapping) => mapping.purchase_uom)]);
  void suppliers;

  const chooseMode = (nextMode: "update" | "replace" | "remove") => {
    setMode(nextMode);
    if (nextMode === "replace") {
      setItemId("");
      setQuery("");
      return;
    }
    // Returning from Replace must restore the existing line identity. Without
    // this, Quantity / UOM disappeared and Update looked price-only.
    setItemId(line.item_id);
    setQuery(itemLabel);
    setUom(normalizeUom(line.uom));
  };

  return <>
    <Button type="button" variant={issue ? "outline" : "ghost"} size="icon" className="h-8 w-8 shrink-0" onClick={() => dialogRef.current?.showModal()} aria-label={`Edit ${itemLabel}`} title={`Edit ${itemLabel}`}>
      {issue ? <AlertTriangle className="h-4 w-4 text-[var(--sb-danger)]" /> : <PencilLine className="h-4 w-4" />}
    </Button>
    <dialog ref={dialogRef} data-supplier-catalogue-count={suppliers.length} data-supplier-option-count={items.length} className="m-auto h-[min(88dvh,46rem)] w-[min(42rem,calc(100vw-2rem))] max-w-none overflow-hidden rounded-[var(--sb-panel-radius)] border-0 bg-transparent p-0 shadow-2xl backdrop:bg-black/60 open:flex" onClose={() => chooseMode("update")}>
      <div className="flex h-full w-full flex-col bg-[var(--sb-surface)]">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--sb-border-soft)] px-4 py-3">
          <div className="min-w-0"><h3 className="text-base font-semibold">Review request line</h3><p className="truncate text-xs text-muted-foreground">{itemLabel}</p></div>
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" onClick={() => dialogRef.current?.close()} aria-label="Close line editor"><X className="h-4 w-4" /></Button>
        </header>
        <form action={action} className="flex min-h-0 flex-1 flex-col">
          <input type="hidden" name="line_id" value={line.id} />
          <input type="hidden" name="expected_updated_at" value={line.updated_at} />
          <input type="hidden" name="idempotency_key" value={idempotencyKey} />
          <input type="hidden" name="revision_action" value={mode} />
          <input type="hidden" name="item_id" value={itemId} />
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {issue ? <section className="rounded-[var(--sb-control-radius)] border border-[var(--sb-danger)]/25 bg-[var(--sb-danger-bg)] p-3" role="status">
              <p className="text-sm font-semibold">{issue.message}</p><p className="mt-1 text-xs text-muted-foreground">{issue.cause}</p><p className="mt-2 text-xs font-medium">Next: {issue.recommendedAction}</p><p className="mt-1 text-[11px] text-muted-foreground">Owner: {issue.ownerRole}</p>
            </section> : null}
            <div className="grid grid-cols-3 gap-2" role="group" aria-label="Change type">{(["update", "replace", "remove"] as const).map((value) => <Button key={value} type="button" variant={mode === value ? "default" : "outline"} onClick={() => chooseMode(value)}>{value === "update" ? "Update" : value === "replace" ? "Replace" : "Remove"}</Button>)}</div>
            {mode !== "remove" ? <>
              {mode === "replace" ? <Field label="Item"><ItemCombobox items={items} value={query} selectedItemId={itemId} ariaLabel="Replacement Item" placeholder="Search supplier items" emptyMessage="No item from this supplier matches." onValueChange={(value) => { setQuery(value); setItemId(""); }} onSelect={(item) => { setQuery(`${item.item_code} - ${item.item_name}`); setItemId(item.id); setUom(normalizeUom(item.purchase_unit || item.base_unit)); }} /></Field> : null}
              {itemId ? <Field label="Quantity / UOM"><div className="grid grid-cols-[minmax(0,1fr)_minmax(7rem,.55fr)] gap-2"><Input name="qty" type="number" min="0.0001" step="0.0001" defaultValue={line.qty} aria-label="Quantity" required /><SelectNative name="uom" value={uom} aria-label="Unit of measure" onChange={(event) => setUom(normalizeUom(event.target.value))} required><option value="">Choose UOM</option>{uomOptions.map((option) => <option key={option} value={option}>{option}</option>)}</SelectNative></div></Field> : null}
              <input type="hidden" name="supplier_id" value={supplierId} />
              <Field label="Estimated unit cost"><Input name="unit_cost" type="number" min="0" step="0.0001" defaultValue={line.estimated_unit_cost} /></Field>
              {selectedItem ? <p className="text-xs text-muted-foreground">Selected: {selectedItem.item_code} · {selectedItem.item_name}</p> : null}
            </> : <p className="text-sm text-muted-foreground">This removes the line from this PR only. It does not delete the Item Master or inventory history.</p>}
            <Field label="Reason for change" required><Textarea name="reason" minLength={3} maxLength={1000} placeholder="Explain what changed so Kitchen, Purchasing, and Finance can acknowledge it." required /></Field>
          </div>
          <footer className="grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-[var(--sb-border-soft)] p-3"><Button type="button" variant="outline" onClick={() => dialogRef.current?.close()}>Cancel</Button><SubmitButton type="submit" pendingLabel="Applying change..." disabled={mode !== "remove" && !itemId}>{mode === "remove" ? "Remove line" : "Apply and revalidate"}</SubmitButton></footer>
        </form>
      </div>
    </dialog>
  </>;
}
