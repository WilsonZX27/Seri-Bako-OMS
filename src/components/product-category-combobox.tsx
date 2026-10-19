"use client";

import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

export function ProductCategoryCombobox({ categories, initialValue }: { categories: string[]; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [open, setOpen] = useState(false);
  const matching = categories.filter(category => category.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
  const existing = categories.some(category => category.toLocaleLowerCase() === value.trim().toLocaleLowerCase());
  return <div className="relative" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <Input name="category" value={value} onChange={event => { setValue(event.target.value); setOpen(true); }} onFocus={() => setOpen(true)} onKeyDown={event => { if (event.key === "Escape") setOpen(false); }} role="combobox" aria-label="Category" aria-autocomplete="list" aria-expanded={open} aria-controls="product-category-list" autoComplete="off" placeholder="Select or type a new category" required />
    {open ? <div id="product-category-list" role="listbox" className="absolute z-[var(--sb-z-dropdown)] mt-1 max-h-48 w-full overflow-y-auto rounded-[var(--sb-radius-control)] border border-[var(--sb-border)] bg-white p-1 shadow-lg">
      {matching.map(category => <button key={category} type="button" role="option" aria-selected={category === value} onClick={() => { setValue(category); setOpen(false); }} className="flex min-h-9 w-full items-center justify-between rounded-md px-2 text-left text-xs hover:bg-[var(--sb-green-100)] focus:bg-[var(--sb-green-100)]">{category}{category === value ? <Check className="size-3.5" aria-hidden="true"/> : null}</button>)}
      {value.trim() && !existing ? <button type="button" role="option" aria-selected="false" onClick={() => { setValue(value.trim()); setOpen(false); }} className="flex min-h-9 w-full items-center gap-2 rounded-md px-2 text-left text-xs font-medium text-[var(--sb-green-800)] hover:bg-[var(--sb-green-100)] focus:bg-[var(--sb-green-100)]"><Plus className="size-3.5" aria-hidden="true"/>Create “{value.trim()}”</button> : null}
    </div> : null}
  </div>;
}
