"use client";
import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { updateAssetOtherLocation } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { SelectControl } from "@/components/ui/select-control";
import { Input } from "@/components/ui/input";
export type AssetDestination = { id: string; source_name: string; other_active: boolean; settings_revision: number };
function DestinationEditor({ row, onDone, deactivate = false }: { row: AssetDestination; onDone: () => void; deactivate?: boolean }) {
  const [name, setName] = useState(row.source_name);
  const [active, setActive] = useState(deactivate ? !row.other_active : row.other_active);
  const [state, action, pending] = useActionState(updateAssetOtherLocation, { ok: false, message: "" });
  useEffect(() => { if (state.ok) onDone(); }, [state.ok, onDone]);
  return <form onReset={event=>event.preventDefault()} action={action} className="grid w-full gap-3">
    <input type="hidden" name="location_id" value={row.id}/><input type="hidden" name="revision" value={row.settings_revision}/><input type="hidden" name="active" value={String(active)}/>
    <label className="grid gap-1 text-xs">Location name<Input name="name" value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={120} disabled={pending}/></label>
    <label className="grid gap-1 text-xs">Status<SelectControl ariaLabel="Destination status" value={String(active)} onValueChange={value=>setActive(value === "true")} disabled={pending} options={[{value:"true",label:"Active — available for new transfers"},{value:"false",label:"Inactive — keep history only"}]}/></label>
    {!active ? <p className="text-xs text-muted-foreground">History stays available. Move or confirm remaining assets and complete in-progress transfers before deactivating.</p> : null}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save changes"}</Button><Button type="button" variant="outline" disabled={pending} onClick={onDone}>Cancel</Button></div>
    {state.message ? <p role={state.ok ? "status" : "alert"} className="text-sm">{state.message}</p> : null}
  </form>;
}
export function AssetDestinationRow({ row }: { row: AssetDestination }) {
  const [editing, setEditing] = useState(false);
  const [deactivate, setDeactivate] = useState(false);
  const done = useCallback(() => setEditing(false), []);
  return <li className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4">
    {editing ? <DestinationEditor row={row} onDone={done} deactivate={deactivate}/> : <>
      <div className="min-w-0"><Link href={`/asset-management/locations/${row.id}`} className="break-words text-sm hover:underline [overflow-wrap:anywhere]" title="View assets and history">{row.source_name}</Link>{!row.other_active ? <span className="ml-2 text-xs text-muted-foreground">Inactive</span> : null}</div>
      <div className="ml-auto flex shrink-0 items-center gap-2"><Button type="button" variant="outline" onClick={()=>{setDeactivate(false);setEditing(true);}}>Edit</Button><Button type="button" variant="ghost" className={row.other_active ? "text-[var(--sb-danger)]" : "text-[var(--sb-green-800)]"} onClick={()=>{setDeactivate(true);setEditing(true);}}>{row.other_active ? "Deactivate" : "Reactivate"}</Button></div>
    </>}
  </li>;
}
