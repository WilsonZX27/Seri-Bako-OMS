"use client";
import { useActionState, useState } from "react";
import { uploadAssetAttachment } from "@/server/actions/assets";
import { assetAttachmentKinds } from "@/lib/asset-attachments";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AssetAttachmentForm({ assetId, requestKey, maintenanceId, canManage = true, retryExisting = false }: { assetId: string | null; requestKey: string; maintenanceId?: string; canManage?: boolean; retryExisting?: boolean }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`attachment:${assetId}:${maintenanceId ?? "master"}`, uploadAssetAttachment), { ok: false, message: "" });
  const [draft,setDraft,restored]=useAssetDraftFields(`attachment:${assetId}:${maintenanceId ?? "master"}`,`v1:${canManage}`,{label:"",kind:"Photo",hadFile:"false"},state.ok,row=>row.label.length<=180&&(canManage?assetAttachmentKinds:["Photo"]).some(kind=>kind===row.kind)&&["true","false"].includes(row.hadFile));
  const {label,kind}=draft,setLabel=(value:string)=>setDraft("label",value),setKind=(value:string)=>setDraft("kind",value);
  const [selected, setSelected] = useState(false), [key, setKey] = useState(requestKey);
  useAssetFormGuard(!state.ok && Boolean(selected || label || kind !== "Photo" || draft.hadFile === "true"));
  return <section className="mt-3 rounded-lg border bg-[var(--sb-surface-muted)] p-3"><h3 className="mb-3 text-sm font-semibold">Add attachment</h3><form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 space-y-3">
    {retryExisting ? <p className="text-xs text-muted-foreground">Select the original photo again to finish the same upload.</p> : null}
    {restored ? <p role="status" className="text-xs">Attachment details restored. Select the file again before uploading.</p> : null}
    <input type="hidden" name="asset_id" value={assetId ?? ""}/><input type="hidden" name="client_key" value={key}/><input type="hidden" name="maintenance_id" value={maintenanceId ?? ""}/>
    <fieldset disabled={pending || state.ok} className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="grid min-w-0 gap-1 text-xs sm:col-span-2">Attachment file<Input name="file" type="file" className="file:mr-3 file:rounded file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm" required accept={canManage ? "image/jpeg,image/png,image/webp,application/pdf" : "image/jpeg,image/png,image/webp"} onChange={event => { const file = event.target.files?.[0]; setSelected(Boolean(file)); setDraft("hadFile",file ? "true" : "false"); if (!label && file) setLabel(file.name.slice(0,180)); if (file && !retryExisting) setKind(file.type.startsWith("image/") ? "Photo" : "Other"); if (!retryExisting) setKey(crypto.randomUUID()); }}/><span className="text-muted-foreground">JPG, PNG, WebP or PDF · up to 10 MB</span></label>
      <label className="grid min-w-0 gap-1 text-xs sm:col-span-2">Attachment label<Input name="label" value={label} required maxLength={180} onChange={event => { setLabel(event.target.value); if (!retryExisting) setKey(crypto.randomUUID()); }}/></label>
      <input type="hidden" name="kind" value={kind}/>
      <Button className="sm:justify-self-start" type="submit" disabled={!selected}>{pending ? "Uploading…" : "Upload attachment"}</Button>
    </fieldset>
    {state.message ? <p className="break-words text-sm" role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
  </form></section>;
}
