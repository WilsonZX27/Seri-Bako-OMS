"use client";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { reportAssetMaintenance, updateAssetMaintenance } from "@/server/actions/assets";
import type { AssetHolding, AssetLocation } from "@/server/queries/assets";
export function AssetMaintenanceForm({ assetId, locations, holdings, requestKey }: { assetId: string; locations: AssetLocation[]; holdings: AssetHolding[]; requestKey: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`maintenance-request:${assetId}`, reportAssetMaintenance), { ok: false, message: "" });
  const revision=JSON.stringify({holdings:holdings.map(row=>[row.location_id,row.quantity]).sort(),locations:locations.map(row=>row.id).sort()});
  const [draft,setDraft,restored]=useAssetDraftFields(`maintenance-request:${assetId}`,revision,{location:"",description:"",priority:"Normal"},state.ok,row=>(!row.location||locations.some(item=>item.id===row.location))&&["Low","Normal","High","Urgent"].includes(row.priority));
  const {location,description,priority}=draft;
  const setLocation=(value:string)=>setDraft("location",value),setDescription=(value:string)=>setDraft("description",value),setPriority=(value:string)=>setDraft("priority",value);
  useAssetFormGuard(!state.ok && Boolean(location || description || priority !== "Normal"));
  const held = new Set(holdings.filter(h=>h.quantity===null||h.quantity>0).map(h=>h.location_id));
  return <form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-3 sm:grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved maintenance inputs restored. Review before reporting.</p> : null}<input type="hidden" name="asset_id" value={assetId}/><input type="hidden" name="client_key" value={requestKey}/><label className="grid gap-1 text-xs">Location<SelectNative name="location_id" required value={location} onChange={e=>setLocation(e.target.value)}><option value="" disabled>Choose location</option>{locations.filter(l=>held.has(l.id)).map(l=><option key={l.id} value={l.id}>{l.source_name}</option>)}</SelectNative></label><label className="grid gap-1 text-xs">Priority<SelectNative name="priority" value={priority} onChange={e=>setPriority(e.target.value)}>{["Low","Normal","High","Urgent"].map(p=><option key={p}>{p}</option>)}</SelectNative></label><label className="grid gap-1 text-xs sm:col-span-2">Issue<Input name="description" required maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="sm:col-span-2"><Button type="submit" disabled={pending||state.ok||!held.size}>{pending?"Reporting…":"Report maintenance"}</Button>{state.message?<p className="mt-2 text-sm" role={state.ok?"status":"alert"}>{state.message}</p>:null}</div></form>;
}
export function AssetMaintenanceUpdate({ requestId, status, canManage, requestKey }: { requestId: string; status: string; canManage: boolean; requestKey: string }) {
  const [state,action,pending]=useActionState(useAssetDraftAction(`maintenance-update:${requestId}`, updateAssetMaintenance),{ok:false,message:""});
  const [draft,setDraft,restored]=useAssetDraftFields(`maintenance-update:${requestId}`,`${status}:${canManage}`,{next:status,comment:""},state.ok,row=>["Open","Assigned","Closed","Resolved","Cancelled"].includes(row.next)&&(canManage||row.next===status));
  const {next,comment}=draft;
  const setNext=(value:string)=>setDraft("next",value),setComment=(value:string)=>setDraft("comment",value);
  useAssetFormGuard(!state.ok && Boolean(comment || next !== status));
  return <form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 mt-3 grid gap-4 sm:grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved update restored. Review before saving.</p> : null}<input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="client_key" value={requestKey}/><input type="hidden" name="expected_status" value={status}/><label className="grid gap-2 text-sm sm:col-span-2">Work performed / update note<textarea name="comment" className="min-h-28 rounded-[var(--sb-radius-control)] border bg-white px-3 py-2 text-sm" disabled={pending||state.ok} required maxLength={4000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Describe what was inspected, repaired or arranged."/></label><label className="grid gap-1 text-xs">Status{canManage?<SelectNative name="status" disabled={pending||state.ok} value={next} onChange={e=>setNext(e.target.value)}>{["Open","Assigned","Closed","Resolved","Cancelled"].map(s=><option key={s}>{s}</option>)}</SelectNative>:<><input type="hidden" name="status" value={status}/><span>{status}</span></>}</label><Button className="self-end" type="submit" disabled={pending||state.ok}>{pending?"Saving…":"Save maintenance update"}</Button>{state.message?<p className="text-xs sm:col-span-2" role={state.ok?"status":"alert"}>{state.message}</p>:null}</form>;
}
