"use client";

import { type Ref, useId, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import type { Database } from "@/types/database";

export type ItemComboboxOption = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "purchase_unit" | "supplier_id" | "cost" | "status">;

function searchTokens(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}

export function itemMatchesSearch(item: ItemComboboxOption, query: string) {
  const tokens = searchTokens(query);
  if (!tokens.length) return false;
  const searchable = searchTokens(`${item.item_code} ${item.item_name}`).join(" ");
  return tokens.every((token) => searchable.includes(token));
}

export function ItemCombobox({ items, value, selectedItemId = "", onValueChange, onSelect, name, inputRef, placeholder = "Search any words in item name or code", ariaLabel, emptyMessage = "No catalog match. Keep the entered description for Purchasing Review." }: {
  items: ItemComboboxOption[];
  value: string;
  selectedItemId?: string;
  onValueChange: (value: string) => void;
  onSelect: (item: ItemComboboxOption) => void;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  ariaLabel?: string;
  emptyMessage?: string;
}) {
  const generatedId = useId();
  const listboxId = `item-combobox-${generatedId.replaceAll(":", "")}`;
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => items.filter((item) => itemMatchesSearch(item, value)).slice(0, 8), [items, value]);
  const showSuggestions = open && !selectedItemId && Boolean(value.trim());

  return <div className="relative">
    {name ? <input type="hidden" name={name} value={selectedItemId} /> : null}
    <Input
      ref={inputRef}
      value={value}
      role="combobox"
      aria-label={ariaLabel}
      aria-autocomplete="list"
      aria-expanded={showSuggestions}
      aria-controls={listboxId}
      autoComplete="off"
      placeholder={placeholder}
      className="overflow-hidden text-ellipsis whitespace-nowrap"
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onChange={(event) => { setOpen(true); onValueChange(event.target.value); }}
    />
    {showSuggestions ? <div id={listboxId} role="listbox" className="absolute inset-x-0 top-[calc(100%+0.25rem)] z-[var(--sb-z-dropdown)] max-h-64 overflow-y-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white p-1 shadow-md">
      {matches.map((item) => <button key={item.id} type="button" role="option" aria-selected="false" className="flex w-full min-w-0 flex-col rounded-[calc(var(--sb-radius-control)-2px)] px-3 py-2 text-left hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)] focus-visible:outline-none" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }}>
        <span className="truncate text-sm font-medium text-[var(--sb-text)]">{item.item_name}</span>
        <span className="truncate text-xs text-[var(--sb-text-muted)]">{item.item_code} · {(item.purchase_unit || item.base_unit).toUpperCase()}</span>
      </button>)}
      {!matches.length ? <p className="px-3 py-2 text-xs text-[var(--sb-text-muted)]">{emptyMessage}</p> : null}
    </div> : null}
  </div>;
}
