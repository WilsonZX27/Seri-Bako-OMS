"use client";

import { type Ref, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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

export function ItemCombobox({ items, value, selectedItemId = "", onValueChange, onSelect, name, inputRef, placeholder = "Search any words in item name or code", ariaLabel, ariaInvalid = false, className = "", emptyMessage = "No catalog match. Keep the entered description for Purchasing Review." }: {
  items: ItemComboboxOption[];
  value: string;
  selectedItemId?: string;
  onValueChange: (value: string) => void;
  onSelect: (item: ItemComboboxOption) => void;
  name?: string;
  inputRef?: Ref<HTMLInputElement>;
  placeholder?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  className?: string;
  emptyMessage?: string;
}) {
  const generatedId = useId();
  const listboxId = `item-combobox-${generatedId.replaceAll(":", "")}`;
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [listboxStyle, setListboxStyle] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const matches = useMemo(() => items.filter((item) => itemMatchesSearch(item, value)).slice(0, 8), [items, value]);
  const showSuggestions = open && !selectedItemId && Boolean(value.trim());

  const positionListbox = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const gap = 4;
    const safeMargin = 8;
    const below = viewportBottom - rect.bottom - gap - safeMargin;
    const above = rect.top - viewportTop - gap - safeMargin;
    const openAbove = below < 160 && above > below;
    const maxHeight = Math.max(96, Math.min(256, openAbove ? above : below));
    const top = openAbove ? Math.max(viewportTop + safeMargin, rect.top - maxHeight - gap) : rect.bottom + gap;
    const width = Math.min(rect.width, window.innerWidth - safeMargin * 2);
    const left = Math.min(Math.max(safeMargin, rect.left), window.innerWidth - width - safeMargin);
    setListboxStyle({ left, top, width, maxHeight });
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    positionListbox();
    const viewport = window.visualViewport;
    const update = () => positionListbox();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
    };
  }, [positionListbox, showSuggestions]);

  return <div ref={anchorRef} className="relative">
    {name ? <input type="hidden" name={name} value={selectedItemId} /> : null}
    <Input
      ref={inputRef}
      value={value}
      role="combobox"
      aria-label={ariaLabel}
      aria-autocomplete="list"
      aria-expanded={showSuggestions}
      aria-controls={listboxId}
      aria-invalid={ariaInvalid || undefined}
      autoComplete="off"
      placeholder={placeholder}
      className={`overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onChange={(event) => { setOpen(true); onValueChange(event.target.value); }}
    />
    {showSuggestions && listboxStyle ? createPortal(<div id={listboxId} role="listbox" className="fixed z-[var(--sb-z-dropdown)] overflow-y-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white p-1 shadow-lg" style={{ left: listboxStyle.left, top: listboxStyle.top, width: listboxStyle.width, maxHeight: listboxStyle.maxHeight }}>
      {matches.map((item) => <button key={item.id} type="button" role="option" aria-selected="false" className="flex w-full min-w-0 flex-col rounded-[calc(var(--sb-radius-control)-2px)] px-3 py-2 text-left hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)] focus-visible:outline-none" onMouseDown={(event) => event.preventDefault()} onClick={() => { onSelect(item); setOpen(false); }}>
        <span className="truncate text-sm font-medium text-[var(--sb-text)]">{item.item_name}</span>
        <span className="truncate text-xs text-[var(--sb-text-muted)]">{item.item_code} · {(item.purchase_unit || item.base_unit).toUpperCase()}</span>
      </button>)}
      {!matches.length ? <p className="px-3 py-2 text-xs text-[var(--sb-text-muted)]">{emptyMessage}</p> : null}
    </div>, document.body) : null}
  </div>;
}
