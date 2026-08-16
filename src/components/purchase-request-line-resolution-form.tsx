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
      onValueChange={(value) => { setQuery(value); setSelectedItemId(""); }}
      onSelect={(item) => { setQuery(`${item.item_code} - ${item.item_name}`); setSelectedItemId(item.id); }}
    />
    <SubmitButton type="submit" size="sm" pendingLabel="Matching..." disabled={!selectedItemId} className={compact ? undefined : "w-full"}>{compact ? "Match" : "Match to Item Master"}</SubmitButton>
  </form>;
}
