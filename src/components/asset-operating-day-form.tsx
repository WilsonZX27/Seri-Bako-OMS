"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectControl } from "@/components/ui/select-control";
import { useAssetDraftAction, useAssetDraftFields } from "@/components/asset-draft-state";
import { useAssetFormGuard } from "@/components/asset-unsaved-guard";
import { setAssetOperatingDay } from "@/server/actions/assets";
import type { AssetLocation } from "@/server/queries/assets";

export function AssetOperatingDayForm({ locations, today }: { locations: AssetLocation[]; today: string }) {
  const [state, action, pending] = useActionState(useAssetDraftAction("operating-day", setAssetOperatingDay), { ok: false, message: "" });
  const revision=JSON.stringify([today,locations.map(item=>item.id).sort()]);
  const [draft,setDraft,restored]=useAssetDraftFields("operating-day",revision,{location:"",date:today,open:"false",reason:""},state.ok,row=>(!row.location||locations.some(item=>item.id===row.location))&&["true","false"].includes(row.open));
  const {location,date,open,reason}=draft;
  const setLocation=(value:string)=>setDraft("location",value),setDate=(value:string)=>setDraft("date",value),setOpen=(value:string)=>setDraft("open",value),setReason=(value:string)=>setDraft("reason",value);
  useAssetFormGuard(!state.ok && Boolean(location || reason || date !== today || open !== "false"));
  return <details open={restored || undefined} className="sb-work-surface overflow-hidden"><summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">Operating day exception</summary><div className="border-t p-3"><p className="mb-3 text-xs text-muted-foreground">Outlets and kitchens open daily. Event checks are required only on a registered activity day.</p><form action={action} className="max-lg:[&_input]:min-h-11 max-lg:[&_[data-select-control]]:min-h-11 max-lg:[&_button]:min-h-11 grid gap-3 sm:grid-cols-2">
    {restored ? <p role="status" className="text-xs sm:col-span-2">Unsaved operating-day inputs restored. Review before saving.</p> : null}
    <label className="grid gap-1 text-xs">Location<SelectControl name="location_id" value={location} onValueChange={selectedValue => setLocation(selectedValue)} required ariaLabel={"Location"} options={[({value: "", label: "Choose location", disabled: true}), ...(locations.map(item => ({value: String((item.id) ?? ""), label: String((item.source_name) ?? "")})))]}/></label>
    <label className="grid gap-1 text-xs">Date<Input type="date" name="date" min={today} value={date} onChange={event => setDate(event.target.value)} required/></label>
    <label className="grid gap-1 text-xs">Operating status<SelectControl name="open" value={open} onValueChange={selectedValue => setOpen(selectedValue)} ariaLabel={"Operating status"} options={[({value: "false", label: "Closed / no activity"}), ({value: "true", label: "Open / Event activity"})]}/></label>
    <label className="grid gap-1 text-xs">Reason<Input name="reason" value={reason} onChange={event => setReason(event.target.value)} maxLength={2000} required/></label>
    <Button type="submit" disabled={pending || state.ok}>{pending ? "Saving…" : "Register operating day"}</Button>{state.message ? <p role={state.ok ? "status" : "alert"} className="text-xs">{state.message}</p> : null}
  </form></div></details>;
}
