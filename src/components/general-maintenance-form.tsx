"use client";
import {useActionState, useState} from "react";
import {reportAssetMaintenance, type AssetActionState} from "@/server/actions/assets";
import {useAssetDraftAction,useAssetDraftFields} from "@/components/asset-draft-state";
import {useAssetFormGuard} from "@/components/asset-unsaved-guard";
import {AssetAttachmentForm} from "@/components/asset-attachment-form";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import { SelectControl } from "@/components/ui/select-control";
import type {AssetLocation} from "@/server/queries/assets";

async function reportWithRecovery(previous: AssetActionState, data: FormData): Promise<AssetActionState> {
  try { return await reportAssetMaintenance(previous, data); }
  catch { return {ok:false,message:"Could not confirm your request. Your inputs are kept. Retry to check or finish the same request."}; }
}

export function GeneralMaintenanceForm({locations,choices,initialLocation="",initialAsset="",requestKey,photoKey,hideLocation=false,dialogMode=false,onClose}:{dialogMode?:boolean;onClose?:()=>void;hideLocation?:boolean;locations:AssetLocation[];choices:{id:string;locationId:string;label:string}[];initialLocation?:string;initialAsset?:string;requestKey:string;photoKey:string}) {
  const [state,action,pending]=useActionState<AssetActionState,FormData>(useAssetDraftAction("general-maintenance",reportWithRecovery),{ok:false,message:""});
  // Idempotency keys survive reload with the scoped draft. They grant no authority;
  // the RPC binds replay to the authenticated actor and exact payload.
  const [draft,setDraft,restored]=useAssetDraftFields("general-maintenance",JSON.stringify(locations.map(row=>row.id)),{location:initialLocation,asset:initialAsset,description:"",requestKey,photoKey},state.ok,row=>/^[0-9a-f-]{36}$/i.test(row.requestKey)&&/^[0-9a-f-]{36}$/i.test(row.photoKey)&&(!row.location||locations.some(item=>item.id===row.location))&&(!row.asset||choices.some(item=>item.id===row.asset&&item.locationId===row.location)));
  const [photo,setPhoto]=useState<File|null>(null);
  const [photoError,setPhotoError]=useState("");
  useAssetFormGuard(!state.ok && Boolean(draft.description||photo||draft.asset!==initialAsset||draft.location!==initialLocation));
  if(state.ok && state.requestId) return <div className="space-y-3"><p role="status" className="font-medium">{state.message}</p><p className="text-sm text-muted-foreground">Track progress and updates in this request.</p>{state.photoError ? <><p role="alert" className="text-sm">Your request is saved, but the photo was not uploaded. {state.photoError}</p><AssetAttachmentForm assetId={draft.asset||null} maintenanceId={state.requestId} requestKey={draft.photoKey} canManage={false} retryExisting/></> : null}<Button asChild><a href={`/asset-management/maintenance/${state.requestId}`}>View request</a></Button></div>;
  return <form action={async data=>{if(photo)data.set("photo",photo); await action(data);}} className={dialogMode ? "flex min-h-0 flex-col overflow-hidden [&_button]:min-h-11 [&_[data-select-control]]:min-h-11 [&_input]:min-h-11" : "space-y-4 max-lg:[&_button]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_input]:min-h-11"}>
    <input type="hidden" name="client_key" value={draft.requestKey}/><input type="hidden" name="photo_key" value={draft.photoKey}/><input type="hidden" name="priority" value="Normal"/>
    {restored ? <p role="status" className="text-sm text-muted-foreground">Unsaved report restored. Add your photo again if needed.</p> : null}
    <fieldset disabled={pending} className={dialogMode ? "min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto p-4" : "min-w-0 space-y-4"}>
      {hideLocation && locations.length===1 ? <input type="hidden" name="location_id" value={locations[0].id}/> : <><label className="grid min-w-0 gap-2 text-sm">Location{locations.length === 1 ? <><input type="hidden" name="location_id" value={locations[0].id}/><span className="break-words font-medium">{locations[0].source_name}</span></> : <SelectControl name="location_id" required value={draft.location} onValueChange={selectedValue => {setDraft("location",selectedValue);setDraft("asset","");}} ariaLabel={"Location"} options={[({value: "", label: "Choose location", disabled: true}), ...(locations.map(row=>({value: String((row.id) ?? ""), label: String((row.source_name) ?? "")})))]}/>}</label></>}
      <label className="grid min-w-0 gap-2 text-sm">What needs fixing?<Textarea name="description" required maxLength={4000} className="min-h-20" placeholder="e.g. The light above the kitchen sink is not working." value={draft.description} onChange={e=>setDraft("description",e.target.value)}/></label>
      <label className="grid min-w-0 gap-2 text-sm">Photo <span className="sr-only">optional</span><Input type="file" accept="image/jpeg,image/png,image/webp" aria-describedby="problem-photo-help" onChange={e=>{const file=e.target.files?.[0]??null;const invalid=file&&(file.size>10485760||!["image/jpeg","image/png","image/webp"].includes(file.type));setPhotoError(invalid?"Choose a JPG, PNG or WebP photo up to 10 MB.":"");setPhoto(invalid?null:file);}}/><span id="problem-photo-help" className="text-xs text-muted-foreground">Optional · JPG, PNG or WebP, up to 10 MB</span></label>
      {photo ? <p className="break-words text-xs text-muted-foreground">Selected: {photo.name}</p> : null}
      {photoError ? <p role="alert" className="text-sm">{photoError}</p> : null}
      {choices.length ? <details open={draft.asset ? true : undefined}><summary className="flex min-h-11 cursor-pointer items-center text-sm">Link an asset (optional)</summary><label className="grid gap-2 text-sm"><span className="sr-only">Asset</span><SelectControl name="asset_id" value={draft.asset} onValueChange={selectedValue => setDraft("asset",selectedValue)} ariaLabel={"Asset"} options={[({value: "", label: "No asset linked"}), ...(choices.filter(row=>row.locationId===draft.location).map(row=>({value: String((row.id) ?? ""), label: String((row.label) ?? "")})))]}/></label></details> : null}

    </fieldset>
      <div className={dialogMode ? "sb-dialog-actions !mt-0 shrink-0 border-t bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" : "sb-dialog-actions"}><Button type="submit" disabled={pending||!locations.length||Boolean(photoError)}>{pending?"Sending…":"Send request"}</Button><Button type="button" variant="outline" onClick={event=>{if(onClose){onClose();return;}const details=event.currentTarget.closest("details");if(details)details.open=false;}}>Close</Button></div>
    {!locations.length ? <p role="alert" className="text-sm">No reporting location assigned. Contact your manager.</p> : null}
    {state.message ? <p role="alert" className="text-sm">{state.message}</p> : null}
  </form>;
}
