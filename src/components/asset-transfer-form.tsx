"use client";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { assetTransferActions } from "@/lib/asset-transfer";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { requestAssetTransfer, advanceAssetTransfer } from "@/server/actions/assets";
import type { AssetHolding, AssetLocation } from "@/server/queries/assets";

export function AssetTransferForm({ assetId, locations, holdings, requestKey }: { assetId: string; locations: AssetLocation[]; holdings: AssetHolding[]; requestKey: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`transfer-request:${assetId}`, requestAssetTransfer), { ok: false, message: "" });
  const revision = JSON.stringify({ holdings: holdings.map(row => [row.location_id, row.quantity]).sort(), locations: locations.map(row => row.id).sort() });
  const [draft, setDraft, restored] = useAssetDraftFields(`transfer-request:${assetId}`, revision, { from: "", to: "", quantity: "", reason: "" }, state.ok, row => (!row.from || locations.some(item => item.id === row.from)) && (!row.to || locations.some(item => item.id === row.to)));
  const {from, to, quantity, reason} = draft;
  const setFrom=(value:string)=>setDraft("from",value),setTo=(value:string)=>setDraft("to",value),setQuantity=(value:string)=>setDraft("quantity",value),setReason=(value:string)=>setDraft("reason",value);
  useAssetFormGuard(!state.ok && Boolean(from || to || quantity || reason));
  const sources = holdings.filter(h => h.quantity !== null && h.quantity > 0);
  return <form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-3 sm:grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved transfer inputs restored. Review before requesting.</p> : null}<input type="hidden" name="asset_id" value={assetId} /><input type="hidden" name="client_key" value={requestKey}/><label className="grid gap-1 text-xs">From<SelectNative name="from" required value={from} onChange={e=>setFrom(e.target.value)}><option value="" disabled>Choose source</option>{sources.map(h => <option key={h.location_id} value={h.location_id}>{locations.find(l => l.id === h.location_id)?.source_name} · {h.quantity} held</option>)}</SelectNative></label><label className="grid gap-1 text-xs">To<SelectNative name="to" required value={to} onChange={e=>setTo(e.target.value)}><option value="" disabled>Choose destination</option>{locations.filter(l=>l.id!==from).map(l => <option key={l.id} value={l.id}>{l.source_name}</option>)}</SelectNative></label><label className="grid gap-1 text-xs">Quantity<Input name="quantity" type="number" min="1" step="1" required value={quantity} onChange={e=>setQuantity(e.target.value)}/></label><label className="grid gap-1 text-xs">Reason<Input name="reason" required maxLength={2000} value={reason} onChange={e=>setReason(e.target.value)}/></label><div className="sm:col-span-2"><Button type="submit" disabled={pending || !sources.length || state.ok}>{pending ? "Requesting…" : "Request transfer"}</Button>{state.message ? <p role={state.ok ? "status" : "alert"} className={`mt-2 text-sm ${state.ok ? "text-foreground" : "text-warning"}`}>{state.message}</p> : null}</div></form>;
}

export function AssetTransferAction({ transferId, status, canApprove, canTransfer, canAccessSource, canAccessDestination, showNote = false, mobileDock = false }: { transferId: string; status: string; canApprove: boolean; canTransfer: boolean; canAccessSource: boolean; canAccessDestination: boolean; showNote?: boolean; mobileDock?: boolean }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`transfer-update:${transferId}`, advanceAssetTransfer), { ok: false, message: "" });
  const [draft, setDraft, restored] = useAssetDraftFields(`transfer-update:${transferId}`, `${status}:${canApprove}:${canTransfer}:${canAccessSource}:${canAccessDestination}`, { note: "" }, state.ok);
  const note=draft.note,setNote=(value:string)=>setDraft("note",value);
  useAssetFormGuard(!state.ok && Boolean(note));
  const actions = assetTransferActions(status, { canApprove, canTransfer, canAccessSource, canAccessDestination });
  const labels = { approve: "Approve", reject: "Reject", dispatch: "Confirm dispatch", receive: "Confirm receipt" };
  if (!actions.length) return null;
  return <form data-transfer-action-form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_button]:min-h-11 mt-3 flex flex-wrap items-end gap-2">
    {restored ? <p role="status" className="basis-full text-xs">Unsaved update restored. Review before confirming.</p> : null}
    <input type="hidden" name="transfer_id" value={transferId}/>
    {showNote ? <label className="grid min-w-0 flex-1 basis-full gap-1 text-xs">Update note (optional)<Input name="note" maxLength={2000} value={note} disabled={pending || state.ok} onChange={e=>setNote(e.target.value)}/></label> : null}
    <div data-mobile-document-action={mobileDock || undefined} data-action-count={actions.length} className={mobileDock ? "sb-mobile-action-bar fixed inset-x-0 bottom-0 z-[var(--sb-z-sticky)] grid grid-flow-col auto-cols-fr gap-2 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-lg md:static md:w-full md:p-0 md:shadow-none" : "grid w-full grid-flow-col auto-cols-fr gap-2"}>{actions.map(value => <Button key={value} name="action" value={value} variant={value === "reject" ? "destructive" : "default"} className={value === "reject" ? "!bg-rose-50 !text-rose-700 !border-rose-200" : undefined} disabled={pending || state.ok}>{labels[value]}</Button>)}</div>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="basis-full text-xs">{state.message}</p> : null}
  </form>;
}
