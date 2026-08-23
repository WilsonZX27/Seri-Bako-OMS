"use client";

import { useState } from "react";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { SubmitButton } from "@/components/ui/submit-button";

export function PurchaseRequestLineResolutionForm({ action, items, unresolvedLineId, description, compact = false }: {
  action: (formData: FormData) => Promise<void>;
  items: ItemComboboxOption[];
  unresolvedLineId: string;
  description: string;
  compact?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  return <form action={action} className={compact ? "flex min-w-[18rem] items-center gap-2" : "grid gap-2"}>
    <input type="hidden" name="unresolved_line_id" value={unresolvedLineId} />
    <ItemCombobox
      items={items}
      name="item_id"
      value={query}
      selectedItemId={selectedItemId}
      ariaLabel={`Match ${description} to Item Master`}
      placeholder="Search Item Master by any words"
      emptyMessage="No Item Master match. Keep this line unresolved or create the item first."
      onValueChange={(value) => { setQuery(value); setSelectedItemId(""); setConfirmed(false); }}
      onSelect={(item) => { setQuery(`${item.item_code} - ${item.item_name}`); setSelectedItemId(item.id); setConfirmed(false); }}
    />
    {selectedItemId ? <label className="flex items-start gap-2 text-xs text-muted-foreground"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Use this item for this branch. If it has no stock history yet, link it at zero stock without creating an inventory movement.</span></label> : null}
    <SubmitButton type="submit" size="sm" pendingLabel="Matching..." disabled={!selectedItemId || !confirmed} className={compact ? undefined : "w-full"}>{compact ? "Confirm match" : "Confirm item match"}</SubmitButton>
  </form>;
}
