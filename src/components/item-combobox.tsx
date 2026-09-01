"use client";

import { type Ref, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Input } from "@/components/ui/input";
import type { Database } from "@/types/database";

export type ItemComboboxOption = Pick<Database["public"]["Tables"]["items"]["Row"], "id" | "item_code" | "item_name" | "base_unit" | "purchase_unit" | "supplier_id" | "cost" | "status"> & {
  brand_name?: string | null;
  supplier_name?: string | null;
};

function searchTokens(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim().split(/\s+/).filter(Boolean);
}

export function itemMatchesSearch(item: ItemComboboxOption, query: string) {
  const tokens = searchTokens(query);
  // Opening a catalogue combobox should reveal useful choices immediately.
  // Requiring a character first made the field look like a plain text input
  // and hid valid supplier-scoped replacements from keyboard and touch users.
  if (!tokens.length) return true;
  const brandName = item.brand_name ?? "";
  const searchable = searchTokens(`${item.item_code} ${item.item_name} ${brandName}`).join(" ");
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const anchorRef = useRef<HTMLDivElement>(null);
  const [listboxStyle, setListboxStyle] = useState<{ left: number; top: number; width: number; maxHeight: number } | null>(null);
  const matches = useMemo(() => items.filter((item) => itemMatchesSearch(item, value)).slice(0, 8), [items, value]);
  const showSuggestions = open && !selectedItemId;

  useEffect(() => {
    setActiveIndex((current) => matches.length ? Math.min(Math.max(current, 0), matches.length - 1) : -1);
  }, [matches]);

  const choose = (item: ItemComboboxOption) => {
    onSelect(item);
    setOpen(false);
    setActiveIndex(-1);
  };

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
      aria-activedescendant={showSuggestions && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
      aria-invalid={ariaInvalid || undefined}
      autoComplete="off"
      placeholder={placeholder}
      className={`overflow-hidden text-ellipsis whitespace-nowrap ${className}`}
      onFocus={() => { setOpen(true); setActiveIndex(matches.length ? 0 : -1); }}
      onBlur={() => setOpen(false)}
      onChange={(event) => { setOpen(true); setActiveIndex(0); onValueChange(event.target.value); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex((current) => matches.length ? (current + 1 + matches.length) % matches.length : -1);
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActiveIndex((current) => matches.length ? (current - 1 + matches.length) % matches.length : -1);
        } else if (event.key === "Enter" && showSuggestions && activeIndex >= 0 && matches[activeIndex]) {
          event.preventDefault();
          choose(matches[activeIndex]);
        } else if (event.key === "Escape" && showSuggestions) {
          event.preventDefault();
          setOpen(false);
          setActiveIndex(-1);
        }
      }}
    />
    {showSuggestions && listboxStyle ? createPortal(<div id={listboxId} role="listbox" data-item-combobox-listbox className="fixed z-[var(--sb-z-dropdown)] overflow-y-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white p-1 shadow-lg" style={{ left: listboxStyle.left, top: listboxStyle.top, width: listboxStyle.width, maxHeight: listboxStyle.maxHeight }}>
      {matches.map((item, index) => <button id={`${listboxId}-option-${index}`} key={item.id} type="button" role="option" aria-selected={activeIndex === index} className="flex w-full min-w-0 flex-col rounded-[calc(var(--sb-radius-control)-2px)] px-3 py-2 text-left hover:bg-[var(--sb-surface-muted)] focus-visible:bg-[var(--sb-surface-muted)] focus-visible:outline-none aria-selected:bg-[var(--sb-surface-muted)]" onMouseEnter={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(item)}>
         <span className="truncate text-sm font-medium text-[var(--sb-text)]">{item.item_name}</span>
         {item.brand_name ? <span className="truncate text-xs text-[var(--sb-text-muted)]">{item.brand_name}</span> : null}
         {item.supplier_name ? <span className="truncate text-xs font-medium text-[var(--sb-text-muted)]">Supplier · {item.supplier_name}</span> : null}
        <span className="truncate text-xs text-[var(--sb-text-muted)]">{item.item_code} · Purchase {(item.purchase_unit || item.base_unit).toUpperCase()} · Base {item.base_unit.toUpperCase()}</span>
      </button>)}
      {!matches.length ? <p className="px-3 py-2 text-xs text-[var(--sb-text-muted)]">{emptyMessage}</p> : null}
    </div>, anchorRef.current?.closest("[data-modal-shell]") ?? document.body) : null}
  </div>;
}
