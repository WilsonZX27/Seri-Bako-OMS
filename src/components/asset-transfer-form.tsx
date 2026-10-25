"use client";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { assetTransferActions } from "@/lib/asset-transfer";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { createPortal } from "react-dom";
import { useActionState } from "react";
import { useAssetTransferActionSlots } from "@/components/asset-transfer-action-slots";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { requestAssetTransfer, advanceAssetTransfer } from "@/server/actions/assets";
import type { AssetHolding, AssetLocation } from "@/server/queries/assets";

export function AssetTransferForm({ assetId, locations, holdings, requestKey }: { assetId: string; locations: AssetLocation[]; holdings: AssetHolding[]; requestKey: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`transfer-request:${assetId}`, requestAssetTransfer), { ok: false, message: "" });
  const revision = JSON.stringify({ holdings: holdings.map(row => [row.location_id, row.quantity]).sort(), locations: locations.map(row => row.id).sort() });
  const [draft, setDraft, restored] = useAssetDraftFields(`transfer-request:${assetId}`, revision, { from: "", to: "", quantity: "", reason: "" }, state.ok, row => (!row.from || locations.some(item => item.id === row.from)) && (!row.to || locations.some(item => item.id === row.to)));
  const {from, to, quantity, reason} = draft;
  const setFrom=(value:string)=>setDraft("from",value),setTo=(value:string)=>setDraft("to",value),setQuantity=(value:string)=>setDraft("quantity",value),setReason=(value:string)=>setDraft("reason",value);
  useAssetFormGuard(!state.ok && Boolean(from || to || quantity || reason));
  const actionSlots = useAssetTransferActionSlots();
  const sources = holdings.filter(h => h.quantity !== null && h.quantity > 0);
  const submit = <Button form="asset-transfer-request" type="submit" className="h-12 w-full md:h-11 xl:h-9" disabled={pending || !sources.length || state.ok}>{pending ? "Requesting…" : "Request transfer"}</Button>;
  return <form id="asset-transfer-request" action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-3 sm:grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved transfer inputs restored. Review before requesting.</p> : null}<input type="hidden" name="asset_id" value={assetId} /><input type="hidden" name="client_key" value={requestKey}/><label className="grid gap-1 text-xs">From<SelectControl name="from" required value={from} onValueChange={selectedValue => setFrom(selectedValue)} ariaLabel={"From"} options={[({value: "", label: "Choose source", disabled: true}), ...(sources.map(h => ({value: String((h.location_id) ?? ""), label: [locations.find(l => l.id === h.location_id)?.display_name ?? locations.find(l => l.id === h.location_id)?.source_name, " · ", h.quantity, " held"].join("")})))]}/></label><label className="grid gap-1 text-xs">To<SelectControl name="to" required value={to} onValueChange={selectedValue => setTo(selectedValue)} ariaLabel={"To"} options={[({value: "", label: "Choose destination", disabled: true}), ...(locations.filter(l=>l.id!==from).map(l => ({value: String((l.id) ?? ""), label: String((l.display_name ?? l.source_name) ?? "")})))]}/></label><label className="grid gap-1 text-xs">Quantity<Input name="quantity" type="number" min="1" step="1" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="grid gap-1 text-xs">Reason<Input name="reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="sm:col-span-2">{actionSlots.map((slot, index) => createPortal(submit, slot, String(index)))}{state.message ? <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-foreground" : "text-warning"}`}>{state.message}</p> : null}</div></form>;
}

export function AssetTransferAction({ transferId, status, canApprove, canTransfer, canAccessSource, canAccessDestination, showNote = false, mobileDock = false, batch = false }: { transferId: string; status: string; canApprove: boolean; canTransfer: boolean; canAccessSource: boolean; canAccessDestination: boolean; showNote?: boolean; mobileDock?: boolean; batch?: boolean }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`transfer-update:${transferId}`, advanceAssetTransfer), { ok: false, message: "" });
  const [draft, setDraft, restored] = useAssetDraftFields(`transfer-update:${transferId}`, `${status}:${canApprove}:${canTransfer}:${canAccessSource}:${canAccessDestination}`, { note: "" }, state.ok);
  const note=draft.note,setNote=(value:string)=>setDraft("note",value);
  useAssetFormGuard(!state.ok && Boolean(note));
  const actions = assetTransferActions(status, { canApprove, canTransfer, canAccessSource, canAccessDestination });
  const labels = { approve: "Approve", reject: "Reject", dispatch: "Confirm dispatch", receive: "Confirm receipt" };
  if (!actions.length) return null;
  return <form data-transfer-action-form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_button]:min-h-11 mt-3 flex flex-wrap items-end gap-2">
    {restored ? <p role="status" className="basis-full text-xs">Unsaved update restored. Review before confirming.</p> : null}
    <input type="hidden" name="transfer_kind" value={batch ? "batch" : "single"}/><input type="hidden" name="transfer_id" value={transferId}/>
    {showNote ? <label className="grid min-w-0 flex-1 basis-full gap-1 text-xs">Update note (optional)<Input name="note" maxLength={2000} value={note} disabled={pending || state.ok} onChange={e=>setNote(e.target.value)}/></label> : null}
    <div data-mobile-document-action={mobileDock || undefined} data-action-count={actions.length} className={mobileDock ? "sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid grid-flow-col auto-cols-fr gap-2 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg md:static md:w-full md:grid-flow-row md:auto-cols-auto md:p-0 md:shadow-none" : "grid w-full grid-flow-col auto-cols-fr gap-2"}>{actions.map(value => <Button key={value} name="action" value={value} variant={value === "reject" ? "outline" : "default"} className={value === "reject" ? "border-destructive text-destructive" : undefined} disabled={pending || state.ok}>{labels[value]}</Button>)}</div>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="basis-full text-xs">{state.message}</p> : null}
  </form>;
}
