"use client";
import { FormPendingBridge } from "@/components/ui/submit-button";
import Link from "next/link";
import { AssetChoiceSelect } from "@/components/asset-choice-select";
import { AssetFormWorkspace } from "@/components/asset-form-workspace";
import { useActionState } from "react";
import { useAssetDraftAction, useAssetDraftState } from "@/components/asset-draft-state";
import { assetMasterFields } from "@/lib/asset-master";
import { saveAssetMaster } from "@/server/actions/assets";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { Button } from "@/components/ui/button";
import type { AssetLocation } from "@/server/queries/assets";

export function AssetMasterForm({ assetId, code = "", name = "", values, locations = [], requestKey, updatedAt = "", embedded = false, automaticId = false, options = { fields: {}, people: [] } }: {
  automaticId?: boolean;
  options?: { fields: Record<string, string[]>; people: {id: string; full_name: string; staff_code: string | null}[] };
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
  const hint = !automaticId && !assetCode.trim() ? "Enter the Asset ID." : !itemName.trim() ? "Enter the item name." : !assetId && !location ? "Choose the initial location." : !reason.trim() ? (assetId ? "Add a change reason." : "Add a registration note.") : !dirty ? "Change a field before saving." : "Review the asset details before saving. Blank quantity stays unknown.";
  const registrationAction = <Button data-asset-registration-action form={formId} className="w-full min-h-11" type="submit" disabled={!dirty || pending || state.ok}>{pending ? "Saving…" : "Register asset"}</Button>;
  const content = <form id={formId} data-asset-entry-form={!assetId || undefined} action={action} className={`max-lg:[&_input]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_button]:min-h-11 ${embedded ? "pt-3" : ""}`}>
      {formId ? <FormPendingBridge formId={formId} /> : null}
    {restored ? <p role="status" className="mb-3 text-xs">Unsaved inputs restored from this browser tab. Review before saving.</p> : null}
    <input type="hidden" name="code_mode" value={!assetId && automaticId ? "sequence" : "manual"}/><input type="hidden" name="asset_id" value={assetId ?? ""}/><input type="hidden" name="client_key" value={requestKey}/><input type="hidden" name="expected_updated_at" value={updatedAt}/>
    <fieldset disabled={pending || state.ok} className="min-w-0 space-y-4">
      <section className="sb-work-surface p-4" data-asset-master-card="identity" aria-labelledby={`${formId}-identity`}><h2 id={`${formId}-identity`} className="mb-3 text-sm font-semibold">{assetId ? "Asset identity" : "Registration details"}</h2>
      <div className="sb-asset-field-grid grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="grid min-w-0 content-start gap-1 text-xs"><span>Asset ID <span className="text-destructive" aria-hidden="true">*</span></span><Input name="asset_code" value={!assetId && automaticId ? "" : assetCode} placeholder={!assetId && automaticId ? "Assigned on registration" : undefined} readOnly={Boolean(assetId) || automaticId} required={!automaticId} maxLength={80} onChange={event=>setAssetCode(event.target.value)}/>{!assetId ? <span className="text-muted-foreground">{automaticId ? "Document Sequences assigns the ID when registration succeeds." : "Automatic numbering awaits a verified starting sequence. Enter a unique Asset ID."}</span> : null}</label>
        <label className="grid min-w-0 content-start gap-1 text-xs"><span>Item name <span className="text-destructive" aria-hidden="true">*</span></span><Input name="item_name" value={itemName} required maxLength={200} onChange={event=>setItemName(event.target.value)}/></label>
        {!assetId ? <><label className="grid min-w-0 content-start gap-1 text-xs"><span>Initial location <span className="text-destructive" aria-hidden="true">*</span></span><SelectControl name="location_id" required value={location} onValueChange={selectedValue => setLocation(selectedValue)} ariaLabel={"Initial location "} options={[({value: "", label: "Choose location", disabled: true}), ...(locations.map(item=>({value: String((item.id) ?? ""), label: String((item.display_name ?? item.source_name) ?? "")})))]}/></label><label className="grid min-w-0 content-start gap-1 text-xs"><span>Initial physical quantity</span><Input name="quantity" type="number" min="0" step="1" placeholder="Not recorded" value={quantity} onChange={event=>setQuantity(event.target.value)}/></label></> : null}
      </div>
      <label className="mt-3 grid min-w-0 content-start gap-1 text-xs"><span>{assetId ? "Change reason" : "Registration note"} <span className="text-destructive" aria-hidden="true">*</span></span><Input name="reason" required maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
      </section>
      {(["General", "Purchase & warranty"] as const).map(group=><details className="sb-work-surface p-4" data-asset-master-card={group === "General" ? "general" : "purchase"} key={group} open={group === "General"}><summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">{group}</summary><div className="sb-asset-field-grid mt-3 grid min-w-0 grid-cols-1 gap-3 lg:grid-cols-2">{assetMasterFields.filter(field=>field.group===group).map(field=><label className="grid min-w-0 content-start gap-1 text-xs" key={field.key}><span>{field.label}</span>{field.key === "Responsible Person" ? <SelectControl name={`detail_${field.key}`} value={fields[field.key] ?? ""} onValueChange={selectedValue => setFields(current=>({...current,[field.key]:selectedValue}))} ariaLabel={String((field.label) ?? "")} options={[({value: "", label: "Choose OMS user"}), ...(fields[field.key] && !options.people.some(person=>person.full_name === fields[field.key]) ? [({value: String((fields[field.key]) ?? ""), label: [fields[field.key], " (recorded)"].join("")})] : []), ...(options.people.map(person=>({value: String((person.full_name) ?? ""), label: [person.full_name, person.staff_code ? ` · ${person.staff_code}` : ""].join("")})))]}/> : field.key === "Department / Area" || field.key === "Category" ? <AssetChoiceSelect label={field.label} name={`detail_${field.key}`} value={fields[field.key] ?? ""} options={options.fields[field.key] ?? []} onChange={value=>setFields(current=>({...current,[field.key]:value}))}/> : <Input name={`detail_${field.key}`} type={field.type} value={fields[field.key] ?? ""} maxLength={1000} min={field.type === "number" ? "0" : undefined} step={field.type === "number" ? "0.01" : undefined} onChange={event=>setFields(current=>({...current,[field.key]:event.target.value}))}/>}</label>)}</div></details>)}

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
