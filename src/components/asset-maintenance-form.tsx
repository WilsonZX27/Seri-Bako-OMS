"use client";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
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
  return <form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-3 sm:grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved maintenance inputs restored. Review before reporting.</p> : null}<input type="hidden" name="asset_id" value={assetId}/><input type="hidden" name="client_key" value={requestKey}/><label className="grid gap-1 text-xs">Location<SelectControl name="location_id" required value={location} onValueChange={selectedValue => setLocation(selectedValue)} ariaLabel={"Location"} options={[({value: "", label: "Choose location", disabled: true}), ...(locations.filter(l=>held.has(l.id)).map(l=>({value: String((l.id) ?? ""), label: String((l.display_name ?? l.source_name) ?? "")})))]}/></label><label className="grid gap-1 text-xs">Priority<SelectControl name="priority" value={priority} onValueChange={selectedValue => setPriority(selectedValue)} ariaLabel={"Priority"} options={[...(["Low","Normal","High","Urgent"].map(p=>({value: String((p) ?? ""), label: String((p) ?? "")})))]}/></label><label className="grid gap-1 text-xs sm:col-span-2">Issue<Input name="description" required maxLength={4000} value={description} onChange={e=>setDescription(e.target.value)}/></label><div className="sm:col-span-2"><Button type="submit" disabled={pending||state.ok||!held.size}>{pending?"Reporting…":"Report maintenance"}</Button>{state.message?<p className="mt-2 text-sm" role={state.ok?"status":"alert"}>{state.message}</p>:null}</div></form>;
}
export function AssetMaintenanceUpdate({ requestId, status, canManage, requestKey }: { requestId: string; status: string; canManage: boolean; requestKey: string }) {
  const [state,action,pending]=useActionState(useAssetDraftAction(`maintenance-update:${requestId}`, updateAssetMaintenance),{ok:false,message:""});
  const [draft,setDraft,restored]=useAssetDraftFields(`maintenance-update:${requestId}`,`${status}:${canManage}`,{next:status,comment:""},state.ok,row=>["Open","Assigned","Closed","Resolved","Cancelled"].includes(row.next)&&(canManage||row.next===status));
  const {next,comment}=draft;
  const setNext=(value:string)=>setDraft("next",value),setComment=(value:string)=>setDraft("comment",value);
  useAssetFormGuard(!state.ok && Boolean(comment || next !== status));
  return <form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_button]:min-h-11 mt-3 grid gap-3 grid-cols-2">{restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved update restored. Review before saving.</p> : null}<input type="hidden" name="request_id" value={requestId}/><input type="hidden" name="client_key" value={requestKey}/><input type="hidden" name="expected_status" value={status}/><label className="grid gap-1 text-sm col-span-2">Update note<Textarea name="comment" className="min-h-16 resize-y" rows={2} disabled={pending||state.ok} required maxLength={4000} value={comment} onChange={e=>setComment(e.target.value)} placeholder="Work done or next step…"/></label><label className="grid gap-1 text-sm">Status{canManage?<SelectControl name="status" disabled={pending||state.ok} value={next} onValueChange={selectedValue => setNext(selectedValue)} ariaLabel={"Status"} options={[...(["Open","Assigned","Closed","Resolved","Cancelled"].map(s=>({value: String((s) ?? ""), label: String((s) ?? "")})))]}/>:<><input type="hidden" name="status" value={status}/><span>{status}</span></>}</label><Button variant="default" className="self-end" type="submit" disabled={pending||state.ok}>{state.ok?<Check className="size-4" aria-hidden="true"/>:<Save className="size-4" aria-hidden="true"/>}{pending?"Saving…":state.ok?"Saved":"Save update"}</Button>{state.message?<p className="text-xs sm:col-span-2" role={state.ok?"status":"alert"}>{state.message}</p>:null}</form>;
}
