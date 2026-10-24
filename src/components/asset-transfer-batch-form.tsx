"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { requestAssetTransferBatch } from "@/server/actions/assets";
import { useAssetDraftAction } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import type { AssetLocation } from "@/server/queries/assets";

type Choice = { id: string; asset_code: string; item_name: string; quantity: number };
export function AssetTransferBatchForm({ source, locations, choices, requestKey, today }: { source: string; locations: AssetLocation[]; choices: Choice[]; requestKey: string; today: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`transfer-batch:${source}`, requestAssetTransferBatch), { ok: false, message: "", requestId: undefined as string | undefined });
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [destination, setDestination] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(today);
  const lines = choices.filter(choice => Object.hasOwn(selected, choice.id));
  const results = choices.filter(choice => `${choice.asset_code} ${choice.item_name}`.toLowerCase().includes(query.toLowerCase()));
  useAssetFormGuard(!state.ok && (lines.length > 0 || Boolean(destination || reason) || date !== today));
  return <form data-asset-entry-form action={action} className="grid min-w-0 gap-4">
    <input type="hidden" name="from" value={source}/><input type="hidden" name="client_key" value={requestKey}/>
    <fieldset disabled={pending || state.ok} className="min-w-0 space-y-4">
      <section className="sb-work-surface p-4" aria-labelledby="transfer-details"><h2 id="transfer-details" className="mb-3 text-sm font-semibold">Request details</h2>
        <dl className="mb-3 text-xs"><dt className="text-muted-foreground">From</dt><dd className="break-words">{locations.find(location => location.id === source)?.display_name ?? locations.find(location => location.id === source)?.source_name}</dd></dl>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs">To<SelectControl name="to" required value={destination} onValueChange={selectedValue => setDestination(selectedValue)} ariaLabel={"To"} options={[({value: "", label: "Choose destination", disabled: true}), ...(locations.filter(location => location.id !== source).map(location => ({value: String((location.id) ?? ""), label: String((location.display_name ?? location.source_name) ?? "")})))]}/></label>
          <label className="grid gap-1 text-xs">Request date<Input name="date" type="date" required value={date} onChange={event => setDate(event.target.value)}/></label>
          <label className="grid gap-1 text-xs sm:col-span-2">Reason<Input name="reason" required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)}/></label></div>
      </section>
      <section className="sb-work-surface overflow-hidden" aria-labelledby="transfer-items"><h2 id="transfer-items" className="border-b px-4 py-3 text-sm font-semibold">Assets list · {lines.length} selected</h2>
        <div className="p-4"><Input type="search" aria-label="Find assets to add" placeholder="Find asset by name or ID" value={query} onChange={event => setQuery(event.target.value)}/></div>
        <div className="max-h-72 overflow-y-auto divide-y" aria-label="Available assets">{results.map(choice => <label key={choice.id} className="flex min-h-11 items-center gap-3 px-4 py-2 text-xs"><input type="checkbox" data-asset-choice={choice.id} className="size-5 shrink-0" checked={Object.hasOwn(selected, choice.id)} disabled={!Object.hasOwn(selected, choice.id) && lines.length >= 100} onChange={event => setSelected(current => { const next = { ...current }; if (event.target.checked) next[choice.id] = "1"; else delete next[choice.id]; return next; })}/><span className="min-w-0 flex-1 break-words">{choice.item_name}<span className="block text-muted-foreground">{choice.asset_code} · {choice.quantity} held</span></span></label>)}{!results.length ? <p className="p-4 text-sm text-muted-foreground">No matching assets with a known positive holding.</p> : null}</div>
        <div className="divide-y border-t">{lines.map(choice => <div key={choice.id} className="flex flex-wrap items-center gap-3 px-4 py-3"><input type="hidden" name="asset_id" value={choice.id}/><span className="min-w-0 flex-1 break-words text-xs">{choice.item_name}<span className="block text-muted-foreground">{choice.asset_code}</span></span><label className="grid gap-1 text-xs">Quantity<Input className="w-24" name={`quantity_${choice.id}`} aria-label={`Quantity for ${choice.item_name}`} type="number" min="1" max={choice.quantity} step="1" required value={selected[choice.id]} onChange={event => setSelected(current => ({ ...current, [choice.id]: event.target.value }))}/></label><Button type="button" variant="outline" aria-label={`Remove ${choice.item_name}`} onClick={event => {
          const form = event.currentTarget.form;
          const index = lines.findIndex(line => line.id === choice.id);
          const neighbour = lines[index + 1] ?? lines[index - 1];
          setSelected(current => { const next = { ...current }; delete next[choice.id]; return next; });
          form?.ownerDocument.defaultView?.requestAnimationFrame(() => {
            const selector = neighbour ? `input[name="quantity_${neighbour.id}"]` : `input[data-asset-choice="${choice.id}"]`;
            const target = form.querySelector<HTMLInputElement>(selector) ?? form.querySelector<HTMLInputElement>('input[type="search"]');
            target?.focus();
          });
        }}>Remove</Button></div>)}</div>
      </section>
    </fieldset>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
    {state.ok && state.requestId ? <Link className="min-h-11 py-3 underline" href={`/asset-management/transfers/${state.requestId}`}>Open transfer</Link> : null}
    <Button type="submit" disabled={pending || state.ok || !lines.length}>{pending ? "Requesting…" : "Request transfer"}</Button>
  </form>;
}
