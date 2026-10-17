"use client";
import Link from "next/link";
import { AssetFormWorkspace } from "@/components/asset-form-workspace";
import { useActionState } from "react";
import { useAssetDraftAction, useAssetDraftState } from "@/components/asset-draft-state";
import { assetMasterFields } from "@/lib/asset-master";
import { saveAssetMaster } from "@/server/actions/assets";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import type { AssetLocation } from "@/server/queries/assets";

export function AssetMasterForm({ assetId, code = "", name = "", values, locations = [], requestKey, updatedAt = "", embedded = false }: {
  assetId?: string; code?: string; name?: string; values: Record<string, string>; locations?: AssetLocation[]; requestKey: string; updatedAt?: string; embedded?: boolean;
}) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`master:${assetId ?? "new"}`, saveAssetMaster), { ok: false, message: "" });
  const initial = { fields: values, itemName: name, assetCode: code, location: "", quantity: "", reason: "" };
  const [draft, setDraft, restored] = useAssetDraftState(`master:${assetId ?? "new"}`, updatedAt || "registration-v1", initial, (value): value is typeof initial => {
    if (!value || typeof value !== "object") return false;
    const record = value as Record<string, unknown>;
    return ["itemName", "assetCode", "location", "quantity", "reason"].every(key => typeof record[key] === "string") && !!record.fields && typeof record.fields === "object" && Object.values(record.fields).every(field => typeof field === "string") && (!assetId || record.assetCode === code) && (!record.location || locations.some(item => item.id === record.location));
  }, state.ok);
  const { fields, itemName, assetCode, location, quantity, reason } = draft;
  const setFields = (update: (previous: Record<string, string>) => Record<string, string>) => setDraft(previous => ({ ...previous, fields: update(previous.fields) }));
  const setItemName = (value: string) => setDraft(previous => ({ ...previous, itemName: value }));
  const setAssetCode = (value: string) => setDraft(previous => ({ ...previous, assetCode: value }));
  const setLocation = (value: string) => setDraft(previous => ({ ...previous, location: value }));
  const setQuantity = (value: string) => setDraft(previous => ({ ...previous, quantity: value }));
  const setReason = (value: string) => setDraft(previous => ({ ...previous, reason: value }));
  const dirty = itemName !== name || assetCode !== code || Boolean(location || quantity || reason) || assetMasterFields.some(field => fields[field.key] !== values[field.key]);
  useAssetFormGuard(!state.ok && dirty);
  const formId = `asset-master-${assetId ?? "new"}`;
  const hint = !assetCode.trim() ? "Enter the Asset ID." : !itemName.trim() ? "Enter the item name." : !assetId && !location ? "Choose the initial location." : !reason.trim() ? (assetId ? "Add a change reason." : "Add a registration note.") : !dirty ? "Change a field before saving." : "Review the asset details before saving. Blank quantity stays unknown.";
  const registrationAction = <Button form={formId} className="w-full min-h-11" type="submit" disabled={!dirty || pending || state.ok}>{pending ? "Saving…" : "Register asset"}</Button>;
  const content = <form id={formId} action={action} className={`max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 ${embedded ? "pt-3" : "sb-work-surface p-4"}`}>
    {restored ? <p role="status" className="mb-3 text-xs">Unsaved inputs restored from this browser tab. Review before saving.</p> : null}
    <input type="hidden" name="asset_id" value={assetId ?? ""}/><input type="hidden" name="client_key" value={requestKey}/><input type="hidden" name="expected_updated_at" value={updatedAt}/>
    <fieldset disabled={pending || state.ok} className="min-w-0 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs"><span>Asset ID <span className="text-destructive" aria-hidden="true">*</span></span><Input name="asset_code" value={assetCode} readOnly={Boolean(assetId)} required maxLength={80} onChange={event=>setAssetCode(event.target.value)}/></label>
        <label className="grid gap-1 text-xs"><span>Item name <span className="text-destructive" aria-hidden="true">*</span></span><Input name="item_name" value={itemName} required maxLength={200} onChange={event=>setItemName(event.target.value)}/></label>
        {!assetId ? <><label className="grid gap-1 text-xs"><span>Initial location <span className="text-destructive" aria-hidden="true">*</span></span><SelectNative name="location_id" required value={location} onChange={event=>setLocation(event.target.value)}><option value="" disabled>Choose location</option>{locations.map(item=><option key={item.id} value={item.id}>{item.source_name}</option>)}</SelectNative></label><label className="grid gap-1 text-xs">Initial physical quantity<Input name="quantity" type="number" min="0" step="1" placeholder="Not recorded" value={quantity} onChange={event=>setQuantity(event.target.value)}/></label></> : null}
      </div>
      {(["General", "Purchase & warranty"] as const).map(group=><details key={group} open={group === "General"}><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{group}</summary><div className="grid min-w-0 gap-3 sm:grid-cols-2">{assetMasterFields.filter(field=>field.group===group).map(field=><label className="grid min-w-0 gap-1 text-xs" key={field.key}>{field.label}<Input name={`detail_${field.key}`} type={field.type} value={fields[field.key] ?? ""} maxLength={1000} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "0.01" : undefined} onChange={event=>setFields(current=>({...current,[field.key]:event.target.value}))}/></label>)}</div></details>)}
      <label className="grid gap-1 text-xs"><span>{assetId ? "Change reason" : "Registration note"} <span className="text-destructive" aria-hidden="true">*</span></span><Input name="reason" required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
    </fieldset>
    {assetId ? <div className="sticky bottom-0 z-[var(--sb-z-sticky)] mt-4 flex flex-wrap items-center gap-3 border-t border-border bg-background py-3 max-lg:bottom-[calc(var(--sb-mobile-nav-height,0px)+env(safe-area-inset-bottom))]">
      <Button type="submit" disabled={!dirty || pending || state.ok}>{pending ? "Saving…" : assetId ? "Save master" : "Register asset"}</Button>
      <p className="hidden text-xs text-muted-foreground sm:block">{assetId ? "Original ID and source fields stay preserved." : "One ID may represent multiple items. Blank quantity stays unknown."}</p>
    </div> : null}
    {state.message ? <p className="mt-3 text-sm" role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
    {state.ok && state.assetId ? <Link className="block min-h-11 py-3 text-sm underline" href={`/asset-management/assets/${state.assetId}`}>Open asset</Link> : null}
  </form>;
  return assetId ? content : <AssetFormWorkspace actions={registrationAction} hint={hint}>{content}</AssetFormWorkspace>;
}
