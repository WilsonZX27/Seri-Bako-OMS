"use client";
import { FormPendingBridge } from "@/components/ui/submit-button";
import { AssetFormWorkspace } from "@/components/asset-form-workspace";
import { formatRegisteredAssetQuantity } from "@/lib/asset-quantity-display";

import { useAssetDraftAction, useAssetDraftState } from "@/components/asset-draft-state";
import { isAssetChecklistDraft } from "@/lib/asset-draft";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { useActionState, useState, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { CheckCheck, ChevronDown, Check, Wrench, TriangleAlert, CircleHelp, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { submitAssetChecklist } from "@/server/actions/assets";
import type { AssetSummary, AssetHolding } from "@/server/queries/assets";

export function AssetChecklistForm({ intro, locationId, assets, holdings, date, today, submissionId }: { intro?: ReactNode; locationId: string; locationName?: string; assets: AssetSummary[]; holdings: AssetHolding[]; date: string; today: string; submissionId: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`checklist:${locationId}:${date}`, submitAssetChecklist), { ok: false, message: "" });
  const revision=JSON.stringify([today,holdings.map(row=>[row.asset_id,row.quantity]).sort()]);
  const [draft,setDraft,restored]=useAssetDraftState(`checklist:${locationId}:${date}`,revision,{fields:{} as Record<string,string>,checkDate:date,selected:[] as string[],submissionId},(value): value is {fields:Record<string,string>;checkDate:string;selected:string[];submissionId:string}=>isAssetChecklistDraft(value,holdings.map(row=>row.asset_id),today) && "submissionId" in value && typeof value.submissionId === "string" && /^[0-9a-f-]{36}$/i.test(value.submissionId),state.ok);
  const {fields,checkDate,selected}=draft;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [bulkUndo, setBulkUndo] = useState<{ selected: string[]; fields: Record<string,string>; touched: string[] } | null>(null);
  const formId = `asset-checklist-${locationId}`;
  const exceptions = selected.filter(id => (fields[`result_${id}`] ?? "Checked") !== "Checked").length;
  const setFields=(update:(previous:Record<string,string>)=>Record<string,string>)=>setDraft(previous=>({...previous,fields:update(previous.fields)}));
  const setCheckDate=(value:string)=>setDraft(previous=>({...previous,checkDate:value}));
  const setSelected=(update:(previous:string[])=>string[])=>setDraft(previous=>({...previous,selected:update(previous.selected)}));
  useAssetFormGuard(!state.ok && (selected.length > 0 || checkDate !== date || Object.values(fields).some(Boolean)));
  const markEdited=(id:string)=>setBulkUndo(previous=>previous ? {...previous,touched:[...new Set([...previous.touched,id])]} : null);
  const update = (key: string, value: string) => { markEdited(key.slice(key.indexOf("_")+1)); setFields(current => ({ ...current, [key]: value })); };
  const names = new Map(assets.map(asset => [asset.id, asset]));
  const missingNotes = selected.some(id => (fields[`result_${id}`] ?? "Checked") !== "Checked" && !fields[`remark_${id}`]?.trim());
  const hint = !selected.length ? "Select at least one asset and review its condition." : missingNotes ? "Add a note for each exception before submitting." : "Review selected assets. Only one checklist can be submitted per day.";
  const submit = <Button className="w-full min-h-11" form={formId} type="submit" disabled={pending || state.ok || !selected.length}>{pending ? "Saving…" : "Submit checklist"}</Button>;
  return <AssetFormWorkspace actions={submit} hint={hint}>{intro}<form id={formId} action={action} onInvalidCapture={event => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 sb-work-surface p-3">
    {formId ? <FormPendingBridge formId={formId} /> : null}
    <p className="mb-3 text-xs">One checklist per location per day. Review all selected assets before submitting.</p>
    {restored ? <p role="status" className="mb-3 text-xs">Unsaved inspection inputs restored. Review counts and selections before saving.</p> : null}
    <input type="hidden" name="location_id" value={locationId}/><input type="hidden" name="submission_id" value={draft.submissionId}/>
    <div className="flex flex-col items-stretch gap-2 border-b pb-3 sm:flex-row sm:items-end sm:justify-between sm:gap-3"><label className="grid min-w-0 gap-1 text-xs sm:max-w-44">Check date<Input type="date" name="date" value={checkDate} onChange={event => setCheckDate(event.target.value)} max={today} required/></label>
      <Button type="button" variant="default" className="w-full sm:w-auto sm:shrink-0" disabled={pending || state.ok} onClick={() => { setBulkUndo({ selected: [...selected], fields: {...fields}, touched: [] }); setSelected(() => holdings.map(row => row.asset_id)); }}><CheckCheck className="size-4" aria-hidden="true"/>Set all as checked</Button>
    </div>
    <div className="flex min-h-11 items-center justify-between gap-2 text-xs text-muted-foreground"><p role="status">{selected.length}/{holdings.length} checked · {exceptions} exceptions</p>{bulkUndo !== null ? <Button type="button" size="sm" variant="ghost" disabled={pending || state.ok} onClick={() => { setSelected(current => current.filter(id => bulkUndo.selected.includes(id) || bulkUndo.touched.includes(id) || Object.keys(fields).some(key => key.endsWith(id) && fields[key] !== bulkUndo.fields[key]))); setBulkUndo(null); }}>Undo</Button> : null}</div>
    <p className="mb-3 text-xs text-muted-foreground">Inspection counts are saved separately and do not change registered quantities.</p>
    <div className="divide-y">{[...holdings].sort((a,b)=>(names.get(a.asset_id)?.asset_code ?? "").localeCompare(names.get(b.asset_id)?.asset_code ?? "")).map(holding => {
      const id = holding.asset_id, result = fields[`result_${id}`] ?? "Checked", checked = selected.includes(id), open=expanded===id;
      const choose=(value:string)=>{markEdited(id);update(`result_${id}`,value);setSelected(current=>current.includes(id)?current:[...current,id]);};
      return <fieldset key={id} disabled={pending || state.ok} className="sb-asset-check-row min-w-0">
        <div className="flex min-w-0 items-center gap-3">
          <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
            <input type="checkbox" name="asset_id" value={id} checked={checked} onChange={event => { markEdited(id);setSelected(current => event.target.checked ? [...new Set([...current,id])] : current.filter(value => value !== id)); }} className="size-5 shrink-0 accent-[var(--sb-primary)]"/>
            <span className="min-w-0"><small className="text-xs font-semibold text-primary">{names.get(id)?.asset_code}</small><strong className="block break-words text-xs font-medium">{names.get(id)?.item_name}</strong><small className="block text-xs text-muted-foreground">{String(names.get(id)?.current_details?.Category ?? "Asset")} · Registered qty: {formatRegisteredAssetQuantity(holding.quantity)}</small></span>
          </label>
          <button type="button" aria-label={`Result for ${names.get(id)?.asset_code}`} aria-expanded={open} aria-controls={`choices-${id}`} onClick={()=>setExpanded(open?null:id)} className={`inline-flex min-h-11 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium ${checked ? result==="Checked" ? "text-[var(--sb-success)]" : result==="Damaged" || result==="Missing" ? "text-[var(--sb-danger)]" : "text-[var(--sb-warning)]" : "text-muted-foreground"}`}>{checked?result:"Not checked"}<ChevronDown className={`size-3.5 ${open?"rotate-180":""}`} aria-hidden="true"/></button>
        </div>
        <input type="hidden" name={`result_${id}`} value={result}/>
        {open ? <div id={`choices-${id}`} className="grid grid-cols-2 xl:grid-cols-5 gap-2 pt-2" role="group" aria-label={`Inspection result for ${names.get(id)?.asset_code}`}>{["Checked","Needs Maintenance","Damaged","Missing","Other"].map(value=>{const Icon=value==="Checked"?Check:value==="Needs Maintenance"?Wrench:value==="Missing"?SearchX:value==="Damaged"?TriangleAlert:CircleHelp;return <Button key={value} type="button" variant="outline" data-inspection-result={value} className={`sb-inspection-choice ${value === "Other" ? "col-span-2 xl:col-span-1" : ""}`} aria-pressed={checked&&result===value} onClick={()=>choose(value)}><Icon className="size-4 shrink-0" aria-hidden="true"/>{value}</Button>;})}</div>:null}
        {checked&&result!=="Checked" ? <label className="mt-2 grid gap-1 text-xs">Exception note<Input name={`remark_${id}`} required maxLength={4000} value={fields[`remark_${id}`] ?? ""} onChange={event=>update(`remark_${id}`,event.target.value)} placeholder="Describe the issue"/></label> : <input type="hidden" name={`remark_${id}`} value={fields[`remark_${id}`] ?? ""}/>}
        {open ? <label className="mt-2 grid gap-1 text-xs">This inspection’s physical count · optional<Input aria-label={`Physical count for ${names.get(id)?.asset_code}`} type="number" name={`quantity_${id}`} min="0" step="1" value={fields[`quantity_${id}`] ?? ""} onChange={event=>update(`quantity_${id}`,event.target.value)} placeholder="Not counted"/></label> : <input type="hidden" name={`quantity_${id}`} value={fields[`quantity_${id}`]??""}/>}
      </fieldset>;
    })}</div>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="mt-2 text-sm">{state.message}</p> : null}
  </form></AssetFormWorkspace>;
}
