"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { confirmUnknownAssetQuantity } from "@/server/actions/assets";

export function AssetQuantityConfirmation({ assetId, locationId, requestKey }: { assetId: string; locationId: string; requestKey: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`quantity:${assetId}:${locationId}`, confirmUnknownAssetQuantity), { ok: false, message: "" });
  const [draft,setDraft,restored]=useAssetDraftFields(`quantity:${assetId}:${locationId}`,"unknown-v1",{quantity:"",reason:""},state.ok);
  const {quantity,reason}=draft,setQuantity=(value:string)=>setDraft("quantity",value),setReason=(value:string)=>setDraft("reason",value);
  useAssetFormGuard(!state.ok && Boolean(quantity || reason));
  return <details open={restored || undefined} className="py-2"><summary className="min-h-11 cursor-pointer py-3 text-xs underline">Record verified registered quantity</summary><form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-2 sm:grid-cols-[6rem_minmax(0,1fr)_auto]">{restored ? <p role="status" className="text-xs sm:col-span-3">Unsaved count inputs restored. Review before confirming.</p> : null}<p className="text-xs text-muted-foreground sm:col-span-3">Physically verify the quantity before recording it. Historical inspection counts are not current registered quantities.</p><input type="hidden" name="asset_id" value={assetId}/><input type="hidden" name="location_id" value={locationId}/><input type="hidden" name="client_key" value={requestKey}/><label className="grid gap-1 text-xs">Physical count<Input type="number" name="quantity" disabled={pending||state.ok} min="0" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)}/></label><label className="grid gap-1 text-xs">Count confirmation note<Input name="reason" disabled={pending||state.ok} required maxLength={2000} value={reason} onChange={event => setReason(event.target.value)}/></label><Button className="self-end" type="submit" disabled={pending || state.ok}>{pending ? "Confirming…" : "Confirm count"}</Button>{state.message ? <p className="text-xs sm:col-span-3" role={state.ok ? "status" : "alert"}>{state.message}</p> : null}</form></details>;
}
