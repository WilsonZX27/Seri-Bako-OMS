"use client";
import Link from "next/link";
import { useActionState, useRef } from "react";
import { createPortal } from "react-dom";
import { Plus, X } from "lucide-react";
import { requestAssetTransferBatch } from "@/server/actions/assets";
import { useAssetDraftAction, useAssetDraftState } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { useAssetTransferActionSlots } from "@/components/asset-transfer-action-slots";
import { ItemCombobox, type ItemComboboxOption } from "@/components/item-combobox";
import { RequestLineRow } from "@/components/request-line-row";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { Notice } from "@/components/ui/system-states";
import { toggleTransferAsset, transferDraftError, validTransferDraft, type AssetTransferDraft, type TransferAssetChoice } from "@/lib/asset-transfer-draft";
import type { AssetLocation } from "@/server/queries/assets";

export function AssetTransferBatchForm({ locations, choices, requestKey, today, canSubmit = false, sourceIds = locations.map(location => location.id), initialAsset = "", initialSource = "", initialQuery = "" }: { locations: AssetLocation[]; choices: TransferAssetChoice[]; requestKey: string; today: string; canSubmit?: boolean; sourceIds?: string[]; initialAsset?: string; initialSource?: string; initialQuery?: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction("transfer-batch", requestAssetTransferBatch), { ok: false, message: "", requestId: undefined as string | undefined });
  const initial: AssetTransferDraft = { from: initialSource, to: "", date: today, reason: "", query: initialQuery, selected: choices.some(choice => choice.id === initialAsset) ? { [initialAsset]: "1" } : {} };
  const [draft, setDraft, restored] = useAssetDraftState("transfer-batch", "single-page-v1", initial, validTransferDraft, state.ok);
  const picker = useRef<HTMLInputElement>(null), actionSlots = useAssetTransferActionSlots();
  const change = <K extends keyof AssetTransferDraft>(key: K, value: AssetTransferDraft[K]) => setDraft(current => ({ ...current, [key]: value }));
  const ids = Object.keys(draft.selected), error = transferDraftError(draft, choices, locations);
  const catalogue: ItemComboboxOption[] = choices.filter(choice => !draft.from || choice.holdings[draft.from] !== undefined || ids.includes(choice.id)).map(choice => ({ id: choice.id, item_code: choice.asset_code, item_name: choice.item_name, base_unit: "PCS", purchase_unit: "PCS", supplier_id: null, cost: 0, status: "active" }));
  useAssetFormGuard(!state.ok && Boolean(ids.length || draft.from || draft.to || draft.reason || draft.query || draft.date !== today));
  const submit = <Button form="asset-transfer-request" type="submit" className="h-12 w-full md:h-11 xl:h-9" disabled={pending || state.ok || !canSubmit || Boolean(error)}>{pending ? "Requesting…" : "Request transfer"}</Button>;
  return <form id="asset-transfer-request" data-asset-entry-form action={action} className="min-w-0 space-y-3">
    <input type="hidden" name="client_key" value={requestKey}/>
    {restored ? <p role="status" className="text-xs">Unsaved transfer inputs restored. Review before requesting.</p> : null}
    <fieldset disabled={pending || state.ok} className="min-w-0 space-y-3">
      <section className="sb-work-surface overflow-hidden" aria-labelledby="transfer-details">
        <h2 id="transfer-details" data-document-section-header className="border-b bg-white px-3 py-2 text-sm font-semibold">Request details</h2>
        <div className="grid gap-3 p-3 sm:grid-cols-2">
          <Field label="From" required><SelectControl name="from" required value={draft.from} onValueChange={value => change("from", value)} ariaLabel="From" options={[{ value: "", label: "Choose source", disabled: true }, ...locations.filter(location => sourceIds.includes(location.id)).map(location => ({ value: location.id, label: location.display_name ?? location.source_name }))]}/></Field>
          <Field label="To" required><SelectControl name="to" required value={draft.to} onValueChange={value => change("to", value)} ariaLabel="To" options={[{ value: "", label: "Choose destination", disabled: true }, ...locations.filter(location => location.id !== draft.from).map(location => ({ value: location.id, label: location.display_name ?? location.source_name }))]}/></Field>
          <Field label="Request date" required><Input name="date" type="date" required value={draft.date} onChange={event => change("date", event.target.value)}/></Field>
          <Field label="Reason" required><Input name="reason" required maxLength={2000} value={draft.reason} onChange={event => change("reason", event.target.value)}/></Field>
        </div>
      </section>
      <section className="sb-work-surface overflow-hidden" aria-labelledby="transfer-items">
        <header data-document-section-header className="flex items-center justify-between gap-3 border-b bg-white px-3 py-2"><h2 id="transfer-items" className="text-sm font-semibold">Requested assets</h2><span className="text-xs tabular-nums text-muted-foreground">{ids.length} selected</span></header>
        <div className="border-b p-3"><Field label="Add assets"><ItemCombobox items={catalogue} value={draft.query} selectedItemIds={ids} selectionLimit={100} inputRef={picker} ariaLabel="Find assets to add" placeholder="Search asset name or ID" emptyMessage="No accessible assets with a known positive holding match." onValueChange={value => change("query", value)} onSelect={item => setDraft(current => ({ ...current, selected: toggleTransferAsset(current.selected, item.id) }))} optionDetail={item => { const available = choices.find(choice => choice.id === item.id)?.holdings[draft.from]; return `${item.item_code}${draft.from ? available === undefined ? " · Not held at source" : ` · ${available} available` : ""}`; }}/></Field></div>
        <div className="divide-y">{ids.map((id, index) => {
          const choice = choices.find(item => item.id === id), available = choice?.holdings[draft.from];
          return <RequestLineRow key={id} data-transfer-line={id} className="grid-cols-[1.5rem_minmax(0,1fr)_5rem_2.75rem] lg:grid-cols-[1.5rem_minmax(0,1fr)_8rem_2.75rem]">
            <span className="pt-2 text-xs tabular-nums text-muted-foreground">{index + 1}</span>
            <div className="min-w-0 self-center text-xs"><span className="block break-words font-medium">{choice?.item_name ?? "Asset unavailable"}</span><span className="block break-words text-muted-foreground">{choice?.asset_code ?? "Remove this unavailable asset"}</span>{draft.from ? <span className={available === undefined ? "block text-warning" : "block text-muted-foreground"}>{available === undefined ? "Not held at this source" : `${available} available`}</span> : null}</div>
            <input type="hidden" name="asset_id" value={id}/>
            <Field label="Quantity" required><Input name={`quantity_${id}`} aria-label={`Quantity for ${choice?.item_name ?? `line ${index + 1}`}`} type="number" min="1" max={available} step="1" required value={draft.selected[id]} onChange={event => change("selected", { ...draft.selected, [id]: event.target.value })}/></Field>
            <Button type="button" variant="ghost" size="icon" className="self-end" aria-label={`Remove ${choice?.item_name ?? `line ${index + 1}`}`} onClick={event => {
              const form = event.currentTarget.form, neighbour = ids[index + 1] ?? ids[index - 1];
              change("selected", toggleTransferAsset(draft.selected, id));
              const ownerWindow = form?.ownerDocument.defaultView;
              if (ownerWindow) ownerWindow.requestAnimationFrame(() => (neighbour ? form?.querySelector<HTMLInputElement>(`input[name="quantity_${neighbour}"]`) ?? picker.current : picker.current)?.focus());
              else picker.current?.focus();
            }}><X className="size-4"/></Button>
          </RequestLineRow>;
        })}{!ids.length ? <p className="px-3 py-4 text-xs text-muted-foreground">Search and select assets to add them to this request.</p> : null}</div>
        <footer className="flex justify-end border-t px-3 py-2"><Button type="button" variant="outline" onClick={() => picker.current?.focus()}><Plus className="size-4"/>Add assets</Button></footer>
      </section>
    </fieldset>
    {!canSubmit ? <Notice>Multi-asset submission is not enabled yet. You can prepare this request; your inputs are kept.</Notice> : error && ids.length ? <p role="status" className="text-xs text-warning">{error}</p> : null}
    {state.message ? <p role={state.ok ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
    {state.ok && state.requestId ? <Link className="min-h-11 py-3 underline" href={`/asset-management/transfers/${state.requestId}`}>Open transfer</Link> : null}
    {actionSlots.length ? actionSlots.map((slot, index) => createPortal(submit, slot, String(index))) : <div className="pt-2">{submit}</div>}
  </form>;
}
