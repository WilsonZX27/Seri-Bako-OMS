"use client";
import { useAssetDraftAction, useAssetDraftState } from "@/components/asset-draft-state";
import { isAssetChecklistDraft } from "@/lib/asset-draft";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { ConsoleSection, RightConsoleMount } from "@/components/layout/right-console";
import { useActionState, useState } from "react";
import { Input } from "@/components/ui/input";
import { SelectNative } from "@/components/ui/select-native";
import { Button } from "@/components/ui/button";
import { submitAssetChecklist } from "@/server/actions/assets";
import type { AssetSummary, AssetHolding } from "@/server/queries/assets";

export function AssetChecklistForm({ locationId, locationName, assets, holdings, date, today, submissionId }: { locationId: string; locationName?: string; assets: AssetSummary[]; holdings: AssetHolding[]; date: string; today: string; submissionId: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction(`checklist:${locationId}:${date}`, submitAssetChecklist), { ok: false, message: "" });
  const revision=JSON.stringify([today,holdings.map(row=>[row.asset_id,row.quantity]).sort()]);
  const [draft,setDraft,restored]=useAssetDraftState(`checklist:${locationId}:${date}`,revision,{fields:{} as Record<string,string>,checkDate:date,selected:[] as string[]},(value): value is {fields:Record<string,string>;checkDate:string;selected:string[]}=>isAssetChecklistDraft(value,holdings.map(row=>row.asset_id),today),state.ok);
  const {fields,checkDate,selected}=draft;
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
  return <form id={formId} action={action} onInvalidCapture={event => { const details = (event.target as HTMLElement).closest("details"); if (details) details.open = true; }} className="max-lg:[&_input]:min-h-11 max-lg:[&_select]:min-h-11 max-lg:[&_button]:min-h-11 sb-work-surface p-3 md:pb-24 xl:pb-3">
    {locationName ? <h2 className="mb-3 text-base font-semibold lg:hidden">{locationName}</h2> : null}
    {restored ? <p role="status" className="mb-3 text-xs">Unsaved inspection inputs restored. Review counts and selections before saving.</p> : null}
    <input type="hidden" name="location_id" value={locationId}/><input type="hidden" name="submission_id" value={submissionId}/>
    <label className="mb-3 grid max-w-48 gap-1 text-xs">Check date<Input type="date" name="date" value={checkDate} onChange={event => setCheckDate(event.target.value)} max={today} required/></label>
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <Button type="button" disabled={pending || state.ok} onClick={() => { setBulkUndo({ selected: [...selected], fields: {...fields}, touched: [] }); setSelected(() => holdings.map(row => row.asset_id)); }}>Set all assets as checked</Button>
      {bulkUndo !== null ? <Button type="button" variant="ghost" disabled={pending || state.ok} onClick={() => { setSelected(current => current.filter(id => bulkUndo.selected.includes(id) || bulkUndo.touched.includes(id) || Object.keys(fields).some(key => key.endsWith(id) && fields[key] !== bulkUndo.fields[key]))); setBulkUndo(null); }}>Undo</Button> : null}
      <p role="status" className="text-xs text-muted-foreground">{selected.length}/{holdings.length} checked · {exceptions} exceptions</p>
    </div>
    <p className="mb-3 text-xs text-muted-foreground">Mark the assets you inspected. Existing exceptions are kept when selecting all. Physical counts are optional.</p>
    <div className="fixed inset-x-4 bottom-[calc(var(--sb-mobile-nav-height)+env(safe-area-inset-bottom)+0.5rem)] z-[var(--sb-z-sticky)] hidden items-center justify-between gap-3 rounded-lg border bg-white p-3 shadow-sm md:flex xl:hidden" data-asset-tablet-submit>
      <p className="text-xs text-muted-foreground">{selected.length}/{holdings.length} checked · {exceptions} exceptions</p>
      <Button className="min-h-11" type="submit" disabled={pending || state.ok || !selected.length}>{pending ? "Saving…" : "Submit checklist"}</Button>
    </div>
    <div className="hidden grid-cols-[minmax(12rem,2fr)_5rem_minmax(10rem,1fr)_minmax(12rem,1.5fr)] gap-3 border-y bg-muted px-4 py-3 text-xs font-semibold lg:grid"><span>Asset / item</span><span>Quantity</span><span>Result</span><span>Remark / physical count</span></div>
    <div className="divide-y">{[...holdings].sort((a,b)=>(names.get(a.asset_id)?.asset_code ?? "").localeCompare(names.get(b.asset_id)?.asset_code ?? "")).map(holding => {
      const id = holding.asset_id, result = fields[`result_${id}`] ?? "Checked", checked = selected.includes(id);
      return <fieldset key={id} disabled={pending || state.ok} className="sb-asset-check-row min-w-0">
        <label className="flex min-h-11 min-w-0 items-center gap-3 text-sm">
          <input type="checkbox" name="asset_id" value={id} checked={checked} onChange={event => { markEdited(id);setSelected(current => event.target.checked ? [...new Set([...current,id])] : current.filter(value => value !== id)); }} className="size-5 shrink-0 accent-[var(--sb-primary)]"/>
          <span className="min-w-0"><small className="block text-xs font-semibold text-primary">{names.get(id)?.asset_code}</small><strong className="block break-words">{names.get(id)?.item_name}</strong><small className="block text-xs text-muted-foreground">{String(names.get(id)?.current_details?.Category ?? "Category unknown")}</small><small className="block text-xs text-muted-foreground lg:hidden">Quantity: {holding.quantity ?? "Unknown"}</small></span>
        </label>
        <span className={`hidden py-3 text-sm tabular-nums lg:block ${holding.quantity === null ? "text-warning" : ""}`}>{holding.quantity ?? "Unknown"}</span>
        <label className="grid min-w-0 gap-1 text-xs"><span className="sr-only">Result</span>
          <SelectNative className={checked ? "font-semibold text-primary bg-[var(--sb-success-bg)]" : "bg-muted"} aria-label={`Result for ${names.get(id)?.asset_code}`} value={checked ? result : "not_checked"} onChange={event => {
            markEdited(id);
            if(event.target.value === "not_checked") setSelected(current => current.filter(value => value !== id));
            else { update(`result_${id}`, event.target.value); setSelected(current => current.includes(id) ? current : [...current,id]); }
          }}><option value="not_checked">Not checked</option>{["Checked","Damaged","Missing","Needs Maintenance","Other"].map(value=><option key={value}>{value}</option>)}</SelectNative>
          <input type="hidden" name={`result_${id}`} value={result}/>
        </label>
        <div className="grid min-w-0 gap-2">
          {result !== "Checked" ? <label className="grid gap-1 text-xs">Exception note<Input name={`remark_${id}`} required={checked} maxLength={4000} value={fields[`remark_${id}`] ?? ""} onChange={event=>update(`remark_${id}`,event.target.value)} placeholder="Describe the issue"/></label> : <input type="hidden" name={`remark_${id}`} value={fields[`remark_${id}`] ?? ""}/>}
          <details><summary className="min-h-11 cursor-pointer text-xs text-muted-foreground">Physical count{fields[`quantity_${id}`] ? ` · ${fields[`quantity_${id}`]}` : " · optional"}</summary><Input aria-label={`Physical count for ${names.get(id)?.asset_code}`} type="number" name={`quantity_${id}`} min="0" step="1" value={fields[`quantity_${id}`] ?? ""} onChange={event=>update(`quantity_${id}`,event.target.value)} placeholder="Not counted"/></details>
        </div>
      </fieldset>;
    })}</div>
    <RightConsoleMount><ConsoleSection title="Submit checklist" kind="action">
      <p>{selected.length}/{holdings.length} checked · {exceptions} exceptions</p>
      <Button data-mobile-primary-action form={formId} type="submit" disabled={pending || state.ok || !selected.length}>{pending ? "Saving…" : "Submit checklist"}</Button>
      <p>Submitting records the selected inspections. Registered quantities stay unchanged.</p>
      {state.message ? <p role={state.ok ? "status" : "alert"}>{state.message}</p> : null}
    </ConsoleSection></RightConsoleMount>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="mt-2 text-sm">{state.message}</p> : null}
  </form>;
}
