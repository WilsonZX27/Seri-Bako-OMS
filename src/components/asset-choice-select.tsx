"use client";

import { useId, useRef, useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** New choices are committed to the draft inside the picker, never as a second field. */
export function AssetChoiceSelect({ label, name, value, options, onChange }: {
  label: string; name: string; value: string; options: string[]; onChange: (value: string) => void;
}) {
  const id = useId();
  const disclosure = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const choices = [...new Set([...options, value].filter(Boolean))];
  const trimmed = query.trim();
  const select = (next: string) => {
    onChange(next);
    setQuery("");
    if (disclosure.current) disclosure.current.open = false;
    disclosure.current?.querySelector("summary")?.focus();
  };
  return <>
    <input type="hidden" name={name} value={value}/>
    <details ref={disclosure} className="relative min-w-0" onKeyDown={event => {
      if (event.key === "Escape" && disclosure.current) { event.preventDefault(); disclosure.current.open = false; disclosure.current.querySelector("summary")?.focus(); }
    }} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && disclosure.current) disclosure.current.open = false; }}>
      <summary aria-label={label} className="flex min-h-[var(--sb-control-height)] cursor-pointer list-none items-center justify-between gap-2 rounded-[var(--sb-control-radius)] border border-[var(--sb-border)] bg-white px-3 py-2 text-sm [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate">{value || `Choose ${label.toLowerCase()}`}</span><ChevronDown className="size-4 shrink-0" aria-hidden="true"/>
      </summary>
      <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-0 rounded-lg border bg-white p-2 shadow-lg">
        <Input id={id} aria-label={`Find or add ${label.toLowerCase()}`} placeholder="Find or add new…" value={query} maxLength={1000} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if(event.key === "Enter") { event.preventDefault(); if(trimmed) select(choices.find(option => option.toLowerCase() === trimmed.toLowerCase()) ?? trimmed); } }}/>
        <div className="mt-1 max-h-48 overflow-y-auto">
          {choices.filter(option => option.toLowerCase().includes(trimmed.toLowerCase())).map(option => <button key={option} type="button" className="flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 py-2 text-left text-xs hover:bg-muted" onClick={() => select(option)}><span className="min-w-0 break-words">{option}</span>{option === value ? <Check className="size-4 shrink-0" aria-hidden="true"/> : null}</button>)}
          {trimmed && !choices.some(option => option.toLowerCase() === trimmed.toLowerCase()) ? <Button type="button" variant="ghost" className="mt-1 h-auto min-h-11 w-full justify-start whitespace-normal px-2 text-left text-xs" onClick={() => select(trimmed)}><Plus className="size-4 shrink-0" aria-hidden="true"/><span className="break-words">Add “{trimmed}”</span></Button> : !trimmed ? <p className="px-2 py-2 text-xs text-muted-foreground">Type a name to add a new option.</p> : null}
          {value ? <button type="button" className="min-h-11 px-2 text-xs text-muted-foreground" onClick={() => select("")}>Clear selection</button> : null}
        </div>
      </div>
    </details>
  </>;
}
