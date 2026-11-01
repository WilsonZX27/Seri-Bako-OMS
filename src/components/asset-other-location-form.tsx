"use client";
import { useActionState, useEffect, useState } from "react";
import { registerAssetOtherLocation } from "@/server/actions/assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function AssetOtherLocationForm({ horizontal = false }: { horizontal?: boolean }) {
  const [name, setName] = useState("");
  const [state,action,pending]=useActionState(registerAssetOtherLocation,{ok:false,message:""});
  useEffect(() => { if (state.ok) setName(""); }, [state]);
  return <form onReset={event=>event.preventDefault()} action={action} className={horizontal ? "grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" : "grid gap-2"}><label className="grid gap-1 text-xs">Location name<Input name="name" value={name} onChange={event=>setName(event.target.value)} disabled={pending} placeholder="e.g. Hostel" required minLength={2} maxLength={120}/></label>{!horizontal ? <p className="text-xs text-muted-foreground">Owner manages dispatch and receipt for this location.</p> : null}<Button disabled={pending}>{pending?"Adding…":"Add location"}</Button>{state.message?<p role={state.ok?"status":"alert"} className="text-xs sm:col-span-full">{state.message}</p>:null}</form>;
}
